import { DatabaseSync, type SQLInputValue, type StatementSync } from 'node:sqlite'
import fs from 'node:fs'
import path from 'node:path'
import { config } from './config.js'
export const DEFAULT_SETTINGS: Record<string, string> = {
  bankCode: '',
  accountNo: '',
  accountName: '',
  zaloLink: '',
  /** Giới hạn số đơn mỗi khung; 0 là không giới hạn. */
  slotCapacity: '30',
  teamsTenantId: '',
  teamsAppId: '',
  teamsAppSecret: '',
  teamsServiceUrl: 'https://smba.trafficmanager.net/teams/',
  /** Mã hội thoại kênh General, bot tự điền khi được cài vào nhóm. */
  teamsConvId: '',
}

fs.mkdirSync(config.dataDir, { recursive: true })

export const db = new DatabaseSync(path.join(config.dataDir, 'dukin.sqlite'))
db.exec('PRAGMA journal_mode = WAL')
db.exec('PRAGMA foreign_keys = ON')

/** Giao dịch thủ công: node:sqlite chưa có helper transaction. */
export function tx<T>(fn: () => T): T {
  db.exec('BEGIN')
  try {
    const out = fn()
    db.exec('COMMIT')
    return out
  } catch (e) {
    db.exec('ROLLBACK')
    throw e
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

CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_name TEXT NOT NULL,
  channel TEXT NOT NULL DEFAULT 'web' CHECK(channel IN ('web','zalo')),
  receive_mode TEXT NOT NULL CHECK(receive_mode IN ('pickup','delivery')),
  location TEXT NOT NULL DEFAULT '',
  note TEXT NOT NULL DEFAULT '',
  slot_date TEXT NOT NULL,
  slot_part TEXT NOT NULL CHECK(slot_part IN ('morning','afternoon')),
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

CREATE INDEX IF NOT EXISTS idx_orders_slot ON orders(slot_date, slot_part);
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
