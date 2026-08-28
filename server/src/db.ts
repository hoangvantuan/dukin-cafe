import { DatabaseSync, type SQLInputValue, type StatementSync } from 'node:sqlite'
import fs from 'node:fs'
import path from 'node:path'
import { config } from './config.js'
import { nameKey } from './util.js'
export const DEFAULT_SETTINGS: Record<string, string> = {
  bankCode: '',
  accountNo: '',
  accountName: '',
  zaloLink: '',
  /** Giới hạn số đơn nhận trong một ngày; 0 là không giới hạn. */
  dailyCapacity: '0',
  teamsTenantId: '',
  teamsAppId: '',
  teamsAppSecret: '',
  teamsServiceUrl: 'https://smba.trafficmanager.net/teams/',
  /** Mã hội thoại kênh General, bot tự điền khi được cài vào nhóm. */
  teamsConvId: '',
  /**
   * Người phụ trách được Bot DUKIN nhắc khi có đơn mới.
   * Chuỗi JSON dạng [{ "name": "Hoàng Tuấn", "teamsId": "29:..." }].
   */
  notifyRecipients: '[]',
  /** '1' thì nhắc luôn Khách trong tin đơn mới, nếu Khách có trong Danh bạ. */
  notifyCustomerOnNew: '1',
}

fs.mkdirSync(config.dataDir, { recursive: true })

export const db = new DatabaseSync(path.join(config.dataDir, 'dukin.sqlite'))
db.exec('PRAGMA journal_mode = WAL')
db.exec('PRAGMA foreign_keys = ON')

/**
 * Giao dịch thủ công: node:sqlite chưa có helper transaction.
 * Cho phép lồng: lớp trong chạy thẳng trong giao dịch của lớp ngoài, vì SQLite
 * không nhận BEGIN lồng nhau. Chỉ lớp ngoài cùng mới COMMIT hoặc ROLLBACK.
 */
let txDepth = 0
export function tx<T>(fn: () => T): T {
  if (txDepth > 0) {
    txDepth++
    try {
      return fn()
    } finally {
      txDepth--
    }
  }
  db.exec('BEGIN')
  txDepth = 1
  try {
    const out = fn()
    db.exec('COMMIT')
    return out
  } catch (e) {
    db.exec('ROLLBACK')
    throw e
  } finally {
    txDepth = 0
  }
}

/**
 * node:sqlite trả dòng chung Record<string, SQLOutputValue>; ép kiểu tập trung
 * một chỗ này cho toàn ứng dụng, thay vì rải cast ở từng truy vấn.
 */
export function allRows<T>(stmt: StatementSync, ...params: SQLInputValue[]): T[] {
  return stmt.all(...params) as unknown as T[]
}

export function getRow<T>(stmt: StatementSync, ...params: SQLInputValue[]): T | undefined {
  return stmt.get(...params) as unknown as T | undefined
}

// Chạy trước khi dựng lược đồ: bảng orders cũ chưa có order_date nên chỉ mục
// theo cột đó sẽ hỏng nếu dựng lược đồ trước.
migrateDropSlots()

db.exec(`
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS menu_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  name_fr TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  price INTEGER NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  sort INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS option_groups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  item_id INTEGER NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  required INTEGER NOT NULL DEFAULT 1,
  multiple INTEGER NOT NULL DEFAULT 0,
  sort INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS options (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  group_id INTEGER NOT NULL REFERENCES option_groups(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price_add INTEGER NOT NULL DEFAULT 0,
  sort INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS customers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  teams_id TEXT NOT NULL DEFAULT ''
);
-- name_key và chỉ mục duy nhất của nó do migrateCustomerNameKey() dựng.

CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_name TEXT NOT NULL,
  channel TEXT NOT NULL DEFAULT 'web' CHECK(channel IN ('web','zalo')),
  receive_mode TEXT NOT NULL CHECK(receive_mode IN ('pickup','delivery')),
  location TEXT NOT NULL DEFAULT '',
  note TEXT NOT NULL DEFAULT '',
  /** Khóa tên Khách, để đơn của một người luôn quy về một danh tính. */
  customer_key TEXT NOT NULL DEFAULT '',
  /** Ngày Khách đặt, theo giờ Việt Nam. Quán tự liệu lúc nào pha và lúc nào giao. */
  order_date TEXT NOT NULL,
  payment_method TEXT NOT NULL CHECK(payment_method IN ('transfer','cash')),
  status TEXT NOT NULL DEFAULT 'new'
    CHECK(status IN ('new','confirmed','paid','done','cancelled')),
  total INTEGER NOT NULL,
  teams_thread TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  item_id INTEGER,
  name TEXT NOT NULL,
  option_summary TEXT NOT NULL DEFAULT '',
  unit_price INTEGER NOT NULL,
  qty INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_orders_date ON orders(order_date);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_key);
CREATE INDEX IF NOT EXISTS idx_groups_item ON option_groups(item_id);
CREATE INDEX IF NOT EXISTS idx_options_group ON options(group_id);
`)

const SETTINGS_ROW = db.prepare('SELECT key, value FROM settings')

export function getSettings(): Record<string, string> {
  const rows = allRows<{ key: string; value: string }>(SETTINGS_ROW)
  return { ...DEFAULT_SETTINGS, ...Object.fromEntries(rows.map((r) => [r.key, r.value])) }
}

const SETTING_ALLOWED: Record<string, true> = Object.fromEntries(
  Object.keys(DEFAULT_SETTINGS).map((k) => [k, true as const]),
)
export function setSettings(patch: Record<string, string>): void {
  const stmt = db.prepare(
    'INSERT INTO settings(key, value) VALUES(?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
  )
  tx(() => {
    for (const [k, v] of Object.entries(patch)) {
      if (SETTING_ALLOWED[k]) stmt.run(k, v)
    }
  })
}


/**
 * Bỏ Khung nhận hàng: đơn không còn hẹn buổi sáng hay chiều nữa, người vận hành
 * tự quyết lúc nào pha và lúc nào giao. Dựng lại bảng vì slot_part mang ràng
 * buộc CHECK, không bỏ cột trực tiếp được.
 * Đơn cũ lấy ngày đặt từ created_at đổi sang giờ Việt Nam.
 */
function migrateDropSlots(): void {
  const cols = allRows<{ name: string }>(db.prepare('PRAGMA table_info(orders)'))
  if (!cols.some((c) => c.name === 'slot_date')) return

  db.exec('PRAGMA foreign_keys = OFF')
  try {
    db.exec(`
      BEGIN;
      CREATE TABLE orders_moi (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customer_name TEXT NOT NULL,
        channel TEXT NOT NULL DEFAULT 'web' CHECK(channel IN ('web','zalo')),
        receive_mode TEXT NOT NULL CHECK(receive_mode IN ('pickup','delivery')),
        location TEXT NOT NULL DEFAULT '',
        note TEXT NOT NULL DEFAULT '',
        customer_key TEXT NOT NULL DEFAULT '',
        order_date TEXT NOT NULL,
        payment_method TEXT NOT NULL CHECK(payment_method IN ('transfer','cash')),
        status TEXT NOT NULL DEFAULT 'new'
          CHECK(status IN ('new','confirmed','paid','done','cancelled')),
        total INTEGER NOT NULL,
        teams_thread TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      INSERT INTO orders_moi
        SELECT id, customer_name, channel, receive_mode, location, note, '',
               date(created_at, '+7 hours'), payment_method, status, total,
               teams_thread, created_at, updated_at
        FROM orders;
      DROP TABLE orders;
      ALTER TABLE orders_moi RENAME TO orders;
      CREATE INDEX IF NOT EXISTS idx_orders_date ON orders(order_date);
      CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
      COMMIT;
    `)
  } catch (e) {
    db.exec('ROLLBACK')
    throw e
  } finally {
    db.exec('PRAGMA foreign_keys = ON')
  }

  // Giới hạn cũ tính theo khung, mỗi ngày có hai khung.
  const old = getRow<{ value: string }>(
    db.prepare("SELECT value FROM settings WHERE key = 'slotCapacity'"),
  )
  const perSlot = Number(old?.value ?? '')
  if (Number.isInteger(perSlot) && perSlot > 0) {
    // Ghi thẳng bảng settings: migration chạy trước khi setSettings sẵn sàng.
    db.prepare(
      'INSERT INTO settings(key, value) VALUES(?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    ).run('dailyCapacity', String(perSlot * 2))
  }
  db.prepare("DELETE FROM settings WHERE key = 'slotCapacity'").run()
}

/**
 * Danh bạ Khách định danh theo tên không phân biệt hoa thường.
 * Chạy một lần: thêm cột name_key, gộp các dòng cùng khóa (giữ dòng đã có mã
 * Teams, tên hiển thị lấy theo dòng được giữ), rồi khóa bằng chỉ mục duy nhất.
 */
function migrateCustomerNameKey(): void {
  const cols = allRows<{ name: string }>(db.prepare('PRAGMA table_info(customers)'))
  if (!cols.some((c) => c.name === 'name_key')) {
    db.exec("ALTER TABLE customers ADD COLUMN name_key TEXT NOT NULL DEFAULT ''")
  }

  interface Row { id: number; name: string; teams_id: string }
  const rows = allRows<Row>(db.prepare('SELECT id, name, teams_id FROM customers ORDER BY id'))
  const keep = new Map<string, Row>()
  const drop: number[] = []
  for (const r of rows) {
    const key = nameKey(r.name)
    if (!key) { drop.push(r.id); continue }
    const prev = keep.get(key)
    if (!prev) { keep.set(key, r); continue }
    // Trùng khóa: dòng nào có mã Teams thì thắng, không thì giữ dòng vào trước.
    if (!prev.teams_id && r.teams_id) {
      drop.push(prev.id)
      keep.set(key, r)
    } else {
      drop.push(r.id)
    }
  }

  const setKey = db.prepare('UPDATE customers SET name = ?, name_key = ? WHERE id = ?')
  const del = db.prepare('DELETE FROM customers WHERE id = ?')
  tx(() => {
    for (const id of drop) del.run(id)
    for (const [key, r] of keep) {
      setKey.run(r.name.trim().replace(/\s+/g, ' '), key, r.id)
    }
  })
  db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_name_key ON customers(name_key)')
}

migrateCustomerNameKey()

/** Điền khóa tên cho đơn cũ, một lần, để tra đơn theo Khách không lệ thuộc hoa thường. */
function migrateOrderCustomerKey(): void {
  const cols = allRows<{ name: string }>(db.prepare('PRAGMA table_info(orders)'))
  if (!cols.some((c) => c.name === 'customer_key')) {
    db.exec("ALTER TABLE orders ADD COLUMN customer_key TEXT NOT NULL DEFAULT ''")
    db.exec('CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_key)')
  }
  const rows = allRows<{ id: number; customer_name: string }>(
    db.prepare("SELECT id, customer_name FROM orders WHERE customer_key = ''"),
  )
  if (rows.length === 0) return
  const stmt = db.prepare('UPDATE orders SET customer_key = ? WHERE id = ?')
  tx(() => {
    for (const r of rows) stmt.run(nameKey(r.customer_name), r.id)
  })
}

migrateOrderCustomerKey()

export interface CustomerRow {
  id: number
  name: string
  teams_id: string
  name_key: string
}

/** Tra Khách theo tên bất kể hoa thường, để Bot DUKIN nhắc đúng người. */
export function findCustomer(name: string): CustomerRow | null {
  return (
    getRow<CustomerRow>(
      db.prepare('SELECT id, name, teams_id, name_key FROM customers WHERE name_key = ?'),
      nameKey(name),
    ) ?? null
  )
}

/**
 * Ghi Khách vào Danh bạ. Cùng khóa thì cập nhật dòng cũ, không đẻ dòng mới.
 * keepTeamsId dành cho lúc đặt đơn: chỉ ghi nhận tên, không xóa mã Teams đã có.
 */
export function upsertCustomer(name: string, teamsId: string, keepTeamsId = false): void {
  const display = name.trim().replace(/\s+/g, ' ')
  const key = nameKey(display)
  if (!key) return
  tx(() => {
    db.prepare(`
      INSERT INTO customers(name, name_key, teams_id) VALUES(?, ?, ?)
      ON CONFLICT(name_key) DO UPDATE SET
        name = excluded.name,
        teams_id = CASE WHEN ? = 1 THEN customers.teams_id ELSE excluded.teams_id END
    `).run(display, key, teamsId, keepTeamsId ? 1 : 0)
    // Tên hiển thị đổi thì đơn cũ của cùng người đổi theo, để màn quản trị không
    // bày ra hai kiểu viết của một Khách.
    db.prepare('UPDATE orders SET customer_name = ? WHERE customer_key = ? AND customer_name != ?').run(
      display, key, display,
    )
  })
}

/** Gieo dữ liệu ban đầu: 4 món theo thực đơn in, mỗi món một nhóm Kích cỡ. */
function seed(): void {
  // Đếm số dòng để biết đã gieo dữ liệu chưa.
  const countRow = getRow<{ c: number }>(db.prepare('SELECT COUNT(*) AS c FROM menu_items'))
  const count = countRow?.c ?? 0
  if (count > 0) return

  const items = [
    ['D. Đen Huyền Bí', 'Le Noir', 'Phin nhỏ giọt, đắng thanh hậu ngọt. Uống đen cho rõ bụng dạ.', 20000],
    ['D. Sữa Đậm Chất', 'Le Lait', 'Đắng đậm hòa quyện sữa đặc, cân bằng chuẩn gu Sài Gòn xưa.', 20000],
    ['D. Bạc Xỉu Mây', 'Le Nuase', 'Mây sữa tươi ôm lấy chút cà phê phin, nhẹ như tằm thường mà nhớ mãi.', 25000],
    ['D. Muối Kem Béo', 'La Crème Salé', 'Lớp kem muối đánh bông mịn phủ lên cà phê đậm, mặn mà đúng nghĩa chữ đen.', 30000],
  ] as const

  const insertItem = db.prepare(
    'INSERT INTO menu_items(name, name_fr, description, price, sort) VALUES(?, ?, ?, ?, ?)',
  )
  const insertGroup = db.prepare(
    'INSERT INTO option_groups(item_id, name, required, multiple, sort) VALUES(?, ?, 1, 0, 0)',
  )
  const insertOption = db.prepare(
    'INSERT INTO options(group_id, name, price_add, sort) VALUES(?, ?, ?, ?)',
  )
  tx(() => {
    items.forEach(([name, nameFr, description, price], i) => {
      const itemId = Number(insertItem.run(name, nameFr, description, price, i + 1).lastInsertRowid)
      const groupId = Number(insertGroup.run(itemId, 'Kích cỡ').lastInsertRowid)
      insertOption.run(groupId, 'Vừa', 0, 1)
      insertOption.run(groupId, 'Lớn', 5000, 2)
    })
  })
}

seed()
