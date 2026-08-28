/**
 * Gộp Đơn hàng thành số liệu theo kỳ. Hàm thuần, không chạm cơ sở dữ liệu,
 * để kiểm thử được ở tầng miền mà không cần dựng máy chủ.
 */
import { addDays, fmtDateShort } from './day.js'

export type Period = 'day' | 'week' | 'month' | 'year'

export const PERIODS: Period[] = ['day', 'week', 'month', 'year']

export function isPeriod(v: unknown): v is Period {
  return typeof v === 'string' && (PERIODS as string[]).includes(v)
}

/** Số kỳ hiển thị mặc định cho mỗi cách gộp. */
export const DEFAULT_SPAN: Record<Period, number> = {
  day: 14,
  week: 12,
  month: 12,
  year: 5,
}

/** Thứ Hai của tuần chứa ngày này, theo chuẩn tuần bắt đầu từ thứ Hai. */
export function weekStart(date: string): string {
  const [y, m, d] = date.split('-').map(Number)
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay()
  // getUTCDay trả 0 cho Chủ nhật; quy về thứ Hai là đầu tuần.
  return addDays(date, -((dow + 6) % 7))
}

/** Khóa gộp của một ngày theo kỳ đã chọn. */
export function periodKey(date: string, period: Period): string {
  switch (period) {
    case 'day':
      return date
    case 'week':
      return weekStart(date)
    case 'month':
      return date.slice(0, 7)
    case 'year':
      return date.slice(0, 4)
  }
}

/** Nhãn tiếng Việt của một khóa kỳ, để hiện trên trục biểu đồ. */
export function periodLabel(key: string, period: Period): string {
  switch (period) {
    case 'day':
      return fmtDateShort(key)
    case 'week':
      return `${fmtDateShort(key)} tới ${fmtDateShort(addDays(key, 6))}`
    case 'month': {
      const [y, m] = key.split('-')
      return `Tháng ${Number(m)}/${y}`
    }
    case 'year':
      return `Năm ${key}`
  }
}

/** Lùi một kỳ từ khóa hiện tại, dùng để dựng dải mốc liên tục kể cả kỳ không có đơn. */
export function prevKey(key: string, period: Period): string {
  switch (period) {
    case 'day':
      return addDays(key, -1)
    case 'week':
      return addDays(key, -7)
    case 'month': {
      const [y, m] = key.split('-').map(Number)
      return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`
    }
    case 'year':
      return String(Number(key) - 1)
  }
}

export interface StatOrder {
  orderDate: string
  status: string
  total: number
  channel: string
  receiveMode: string
  paymentMethod: string
  customerKey: string
  customerName: string
}

export interface StatLine {
  orderDate: string
  status: string
  name: string
  optionSummary: string
  qty: number
  unitPrice: number
}

export interface Bucket {
  key: string
  label: string
  /** Đơn đã nhận, không kể đơn hủy. */
  orders: number
  cancelled: number
  revenue: number
  cups: number
  customers: number
}

export interface StatsResult {
  period: Period
  buckets: Bucket[]
  total: {
    orders: number
    cancelled: number
    revenue: number
    cups: number
    customers: number
    /** Doanh thu trung bình mỗi đơn, làm tròn xuống. */
    avgOrder: number
  }
  /** Đơn theo Trạng thái Đơn hàng, cho biết còn bao nhiêu việc đang dở. */
  byStatus: Array<{ status: string; count: number }>
  byChannel: Array<{ channel: string; count: number }>
  byReceiveMode: Array<{ mode: string; count: number }>
  byPayment: Array<{ method: string; count: number }>
  topItems: Array<{ name: string; optionSummary: string; qty: number; revenue: number }>
  topCustomers: Array<{ name: string; orders: number; revenue: number }>
}

function tally<T>(rows: T[], pick: (r: T) => string): Map<string, number> {
  const m = new Map<string, number>()
  for (const r of rows) m.set(pick(r), (m.get(pick(r)) ?? 0) + 1)
  return m
}

/**
 * Dải mốc liên tục lùi từ mốc mới nhất, kể cả kỳ không có đơn nào, để biểu đồ
 * không bỏ trống khoảng nghỉ và người đọc thấy đúng nhịp bán hàng.
 */
export function buildKeys(latest: string, period: Period, span: number): string[] {
  const keys: string[] = []
  let k = periodKey(latest, period)
  for (let i = 0; i < span; i++) {
    keys.unshift(k)
    k = prevKey(k, period)
  }
  return keys
}

export function summarize(input: {
  orders: StatOrder[]
  lines: StatLine[]
  period: Period
  today: string
  span?: number
  topLimit?: number
}): StatsResult {
  const { orders, lines, period, today } = input
  const span = input.span ?? DEFAULT_SPAN[period]
  const topLimit = input.topLimit ?? 5
  const keys = buildKeys(today, period, span)
  const inRange = new Set(keys)

  const scoped = orders.filter((o) => inRange.has(periodKey(o.orderDate, period)))
  const scopedLive = scoped.filter((o) => o.status !== 'cancelled')

  // Ly đếm theo dòng món, chỉ tính đơn còn hiệu lực.
  const cupsByKey = new Map<string, number>()
  for (const l of lines) {
    if (l.status === 'cancelled') continue
    const k = periodKey(l.orderDate, period)
    cupsByKey.set(k, (cupsByKey.get(k) ?? 0) + l.qty)
  }

  const buckets: Bucket[] = keys.map((key) => {
    const mine = scopedLive.filter((o) => periodKey(o.orderDate, period) === key)
    return {
      key,
      label: periodLabel(key, period),
      orders: mine.length,
      cancelled: scoped.filter((o) => periodKey(o.orderDate, period) === key && o.status === 'cancelled').length,
      revenue: mine.reduce((s, o) => s + o.total, 0),
      cups: cupsByKey.get(key) ?? 0,
      customers: new Set(mine.map((o) => o.customerKey)).size,
    }
  })

  const revenue = scopedLive.reduce((s, o) => s + o.total, 0)
  const itemAgg = new Map<string, { name: string; optionSummary: string; qty: number; revenue: number }>()
  for (const l of lines) {
    if (l.status === 'cancelled') continue
    if (!inRange.has(periodKey(l.orderDate, period))) continue
    const k = `${l.name}||${l.optionSummary}`
    const cur = itemAgg.get(k) ?? { name: l.name, optionSummary: l.optionSummary, qty: 0, revenue: 0 }
    cur.qty += l.qty
    cur.revenue += l.qty * l.unitPrice
    itemAgg.set(k, cur)
  }

  const custAgg = new Map<string, { name: string; orders: number; revenue: number }>()
  for (const o of scopedLive) {
    const cur = custAgg.get(o.customerKey) ?? { name: o.customerName, orders: 0, revenue: 0 }
    cur.orders += 1
    cur.revenue += o.total
    custAgg.set(o.customerKey, cur)
  }

  return {
    period,
    buckets,
    total: {
      orders: scopedLive.length,
      cancelled: scoped.length - scopedLive.length,
      revenue,
      cups: buckets.reduce((s, b) => s + b.cups, 0),
      customers: new Set(scopedLive.map((o) => o.customerKey)).size,
      avgOrder: scopedLive.length > 0 ? Math.floor(revenue / scopedLive.length) : 0,
    },
    // Tình trạng đặt đơn tính trên toàn bộ đơn, không giới hạn dải, vì đơn cũ
    // chưa xử lý vẫn là việc đang treo.
    byStatus: [...tally(orders, (o) => o.status)].map(([status, count]) => ({ status, count })),
    byChannel: [...tally(scopedLive, (o) => o.channel)].map(([channel, count]) => ({ channel, count })),
    byReceiveMode: [...tally(scopedLive, (o) => o.receiveMode)].map(([mode, count]) => ({ mode, count })),
    byPayment: [...tally(scopedLive, (o) => o.paymentMethod)].map(([method, count]) => ({ method, count })),
    topItems: [...itemAgg.values()].sort((a, b) => b.qty - a.qty).slice(0, topLimit),
    topCustomers: [...custAgg.values()].sort((a, b) => b.revenue - a.revenue).slice(0, topLimit),
  }
}
