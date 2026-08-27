import { allRows, db, tx } from './db.js'

export interface MenuOption {
  id: number
  name: string
  priceAdd: number
  sort: number
}

export interface MenuGroup {
  id: number
  name: string
  required: boolean
  multiple: boolean
  sort: number
  options: MenuOption[]
}

export interface MenuItem {
  id: number
  name: string
  nameFr: string
  description: string
  price: number
  active: boolean
  sort: number
  groups: MenuGroup[]
}

// Dòng khớp tên cột trong schema.
interface ItemRow { id: number; name: string; name_fr: string; description: string; price: number; active: number; sort: number }
interface GroupRow { id: number; item_id: number; name: string; required: number; multiple: number; sort: number }
interface OptionRow { id: number; group_id: number; name: string; price_add: number; sort: number }

/** Cây thực đơn: món, nhóm tùy chọn, lựa chọn; gộp từ ba bảng. */
export function menuTree(includeInactive: boolean): MenuItem[] {
  const itemRows = allRows<ItemRow>(
    db.prepare(
      includeInactive
        ? 'SELECT * FROM menu_items ORDER BY sort, id'
        : 'SELECT * FROM menu_items WHERE active = 1 ORDER BY sort, id',
    ),
  )
  if (itemRows.length === 0) return []
  const groupRows = allRows<GroupRow>(db.prepare('SELECT * FROM option_groups ORDER BY sort, id'))
  const optionRows = allRows<OptionRow>(db.prepare('SELECT * FROM options ORDER BY sort, id'))

  const optionsByGroup = new Map<number, MenuOption[]>()
  for (const o of optionRows) {
    const list = optionsByGroup.get(o.group_id) ?? []
    list.push({ id: o.id, name: o.name, priceAdd: o.price_add, sort: o.sort })
    optionsByGroup.set(o.group_id, list)
  }
  const groupsByItem = new Map<number, MenuGroup[]>()
  for (const g of groupRows) {
    const list = groupsByItem.get(g.item_id) ?? []
    list.push({
      id: g.id,
      name: g.name,
      required: g.required === 1,
      multiple: g.multiple === 1,
      sort: g.sort,
      options: optionsByGroup.get(g.id) ?? [],
    })
    groupsByItem.set(g.item_id, list)
  }
  return itemRows.map((r) => ({
    id: r.id,
    name: r.name,
    nameFr: r.name_fr,
    description: r.description,
    price: r.price,
    active: r.active === 1,
    sort: r.sort,
    groups: groupsByItem.get(r.id) ?? [],
  }))
}

export interface OptionPayload { name: string; priceAdd: number; sort: number }
export interface GroupPayload { name: string; required: boolean; multiple: boolean; sort: number; options: OptionPayload[] }
export interface ItemPayload {
  name: string
  nameFr: string
  description: string
  price: number
  active: boolean
  sort: number
  groups: GroupPayload[]
}

function asRecord(v: unknown): Record<string, unknown> | null {
  return typeof v === 'object' && v !== null ? (v as Record<string, unknown>) : null
}

function strField(v: unknown, max: number): string | null {
  if (typeof v !== 'string') return null
  const s = v.trim()
  return s.length >= 1 && s.length <= max ? s : null
}

function intField(v: unknown, min: number, max: number): number | null {
  if (typeof v !== 'number' || !Number.isInteger(v)) return null
  return v >= min && v <= max ? v : null
}

/** Kiểm tra payload món từ Trang quản lý; chặt để tránh dữ liệu rác. */
export function validateItemPayload(body: unknown): { ok: true; payload: ItemPayload } | { ok: false; error: string } {
  const rec = asRecord(body)
  if (!rec) return { ok: false, error: 'Dữ liệu món không hợp lệ' }
  const name = strField(rec.name, 100)
  if (!name) return { ok: false, error: 'Tên món từ 1 tới 100 ký tự' }
  const nameFr = typeof rec.nameFr === 'string' ? rec.nameFr.trim().slice(0, 100) : ''
  const description = typeof rec.description === 'string' ? rec.description.trim().slice(0, 500) : ''
  const price = intField(rec.price, 0, 100_000_000)
  if (price == null) return { ok: false, error: 'Giá món là số nguyên từ 0 tới 100 triệu' }
  const sort = intField(rec.sort, 0, 9999) ?? 0
  if (!Array.isArray(rec.groups) || rec.groups.length > 10) return { ok: false, error: 'Tối đa 10 nhóm tùy chọn' }

  const groups: GroupPayload[] = []
  for (const rawG of rec.groups) {
    const g = asRecord(rawG)
    if (!g) return { ok: false, error: 'Nhóm tùy chọn không hợp lệ' }
    const gName = strField(g.name, 50)
    if (!gName) return { ok: false, error: 'Tên nhóm tùy chọn từ 1 tới 50 ký tự' }
    if (!Array.isArray(g.options) || g.options.length === 0 || g.options.length > 20) {
      return { ok: false, error: `Nhóm "${gName}" cần 1 tới 20 lựa chọn` }
    }
    const options: OptionPayload[] = []
    for (const rawO of g.options) {
      const o = asRecord(rawO)
      if (!o) return { ok: false, error: 'Lựa chọn không hợp lệ' }
      const oName = strField(o.name, 50)
      if (!oName) return { ok: false, error: 'Tên lựa chọn từ 1 tới 50 ký tự' }
      const priceAdd = intField(o.priceAdd, 0, 100_000_000)
      if (priceAdd == null) return { ok: false, error: 'Giá cộng thêm là số nguyên không âm' }
      options.push({ name: oName, priceAdd, sort: intField(o.sort, 0, 9999) ?? 0 })
    }
    groups.push({
      name: gName,
      required: g.required === true,
      multiple: g.multiple === true,
      sort: intField(g.sort, 0, 9999) ?? 0,
      options,
    })
  }
  return {
    ok: true,
    payload: { name, nameFr, description, price, active: rec.active !== false, sort, groups },
  }
}

function writeTree(itemId: number, p: ItemPayload): void {
  const insertGroup = db.prepare(
    'INSERT INTO option_groups(item_id, name, required, multiple, sort) VALUES(?, ?, ?, ?, ?)',
  )
  const insertOption = db.prepare('INSERT INTO options(group_id, name, price_add, sort) VALUES(?, ?, ?, ?)')
  for (const [gi, g] of p.groups.entries()) {
    const { lastInsertRowid: groupId } = insertGroup.run(
      itemId, g.name, g.required ? 1 : 0, g.multiple ? 1 : 0, g.sort || gi + 1,
    )
    for (const [oi, o] of g.options.entries()) {
      insertOption.run(groupId, o.name, o.priceAdd, o.sort || oi + 1)
    }
  }
}

export function insertItemFull(p: ItemPayload): number {
  const res = db
    .prepare('INSERT INTO menu_items(name, name_fr, description, price, active, sort) VALUES(?, ?, ?, ?, ?, ?)')
    .run(p.name, p.nameFr, p.description, p.price, p.active ? 1 : 0, p.sort)
  const itemId = Number(res.lastInsertRowid)
  writeTree(itemId, p)
  return itemId
}

/** Thay toàn bộ nhóm tùy chọn của món: xóa rồi ghi lại trong một giao dịch. */
export function replaceItemFull(id: number, p: ItemPayload): boolean {
  try {
    tx(() => {
      const res = db
        .prepare('UPDATE menu_items SET name=?, name_fr=?, description=?, price=?, active=?, sort=? WHERE id=?')
        .run(p.name, p.nameFr, p.description, p.price, p.active ? 1 : 0, p.sort, id)
      if (Number(res.changes) === 0) throw new Error('not-found')
      db.prepare('DELETE FROM option_groups WHERE item_id = ?').run(id)
      writeTree(id, p)
    })
    return true
  } catch (e) {
    if (e instanceof Error && e.message === 'not-found') return false
    throw e
  }
}

export function deleteItem(id: number): boolean {
  return Number(db.prepare('DELETE FROM menu_items WHERE id = ?').run(id).changes) > 0
}
