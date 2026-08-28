import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { DatabaseSync } from 'node:sqlite'

// Dựng sẵn một cơ sở dữ liệu theo lược đồ cũ (còn Khung nhận hàng và tên Khách
// trùng hoa thường), rồi nạp db.ts để migration chạy trên đó.
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dukin-mig-'))
const file = path.join(dataDir, 'dukin.sqlite')
{
  const old = new DatabaseSync(file)
  old.exec(`
    CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
    CREATE TABLE customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      teams_id TEXT NOT NULL DEFAULT ''
    );
    CREATE TABLE orders (
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
    CREATE TABLE order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      item_id INTEGER,
      name TEXT NOT NULL,
      option_summary TEXT NOT NULL DEFAULT '',
      unit_price INTEGER NOT NULL,
      qty INTEGER NOT NULL DEFAULT 1
    );
    CREATE INDEX idx_orders_slot ON orders(slot_date, slot_part);
  `)
  old.prepare("INSERT INTO settings(key, value) VALUES('slotCapacity', '30')").run()
  // Ba biến thể hoa thường của cùng một người, chỉ một dòng mang mã Teams.
  old.prepare("INSERT INTO customers(name, teams_id) VALUES('hoàng tuấn', '')").run()
  old.prepare("INSERT INTO customers(name, teams_id) VALUES('Hoàng Tuấn', '29:tuan')").run()
  old.prepare("INSERT INTO customers(name, teams_id) VALUES('HOÀNG  TUẤN', '')").run()
  old.prepare("INSERT INTO customers(name, teams_id) VALUES('Lan Anh', '29:lan')").run()
  // Đơn đặt lúc 23:30 giờ Việt Nam ngày 27/08 (16:30 UTC cùng ngày).
  old
    .prepare(`
      INSERT INTO orders(customer_name, channel, receive_mode, location, note, slot_date, slot_part,
        payment_method, status, total, teams_thread, created_at, updated_at)
      VALUES('Hoàng Tuấn', 'web', 'delivery', 'Tầng 4', 'Ít đá', '2026-08-28', 'morning',
        'cash', 'confirmed', 45000, 'msg-1', '2026-08-27T16:30:00.000Z', '2026-08-27T16:30:00.000Z')
    `)
    .run()
  old.prepare("INSERT INTO order_items(order_id, item_id, name, unit_price, qty) VALUES(1, 1, 'D. Đen Huyền Bí', 45000, 1)").run()
  old.close()
}

process.env.DATA_DIR = dataDir
const { db, allRows, getSettings, findCustomer } = await import('../src/db.js')

test.after(() => fs.rmSync(dataDir, { recursive: true, force: true }))

test('đơn cũ giữ nguyên dữ liệu, ngày đặt suy từ giờ Việt Nam', () => {
  const rows = allRows<{
    id: number
    customer_name: string
    order_date: string
    status: string
    total: number
    teams_thread: string
    location: string
  }>(db.prepare('SELECT * FROM orders'))
  assert.equal(rows.length, 1)
  const o = rows[0]
  assert.equal(o.order_date, '2026-08-27', '23:30 giờ Việt Nam vẫn là ngày 27')
  assert.equal(o.customer_name, 'Hoàng Tuấn')
  assert.equal(o.status, 'confirmed')
  assert.equal(o.total, 45000)
  assert.equal(o.teams_thread, 'msg-1', 'Luồng Đơn hàng trên Teams không được mất')
  assert.equal(o.location, 'Tầng 4')

  const cols = allRows<{ name: string }>(db.prepare('PRAGMA table_info(orders)')).map((c) => c.name)
  assert.ok(!cols.includes('slot_date') && !cols.includes('slot_part'))
})

test('dòng món của đơn cũ không bị xóa theo khi dựng lại bảng', () => {
  const items = allRows<{ order_id: number; name: string }>(db.prepare('SELECT * FROM order_items'))
  assert.equal(items.length, 1)
  assert.equal(items[0].order_id, 1)
})

test('giới hạn theo khung đổi thành giới hạn theo ngày, gấp đôi vì mỗi ngày có hai khung', () => {
  assert.equal(getSettings().dailyCapacity, '60')
  assert.equal(
    allRows<{ key: string }>(db.prepare("SELECT key FROM settings WHERE key = 'slotCapacity'")).length,
    0,
  )
})

test('Danh bạ gộp các biến thể hoa thường, giữ dòng có mã Teams', () => {
  const rows = allRows<{ name: string; teams_id: string }>(db.prepare('SELECT * FROM customers'))
  assert.equal(rows.length, 2, 'ba biến thể của Hoàng Tuấn gộp còn một, cộng Lan Anh')
  assert.equal(findCustomer('HOÀNG TUẤN')?.teams_id, '29:tuan')
  assert.equal(findCustomer('  lan   anh  ')?.teams_id, '29:lan')
})
