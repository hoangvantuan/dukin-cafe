export type SlotPart = 'morning' | 'afternoon'

export interface SlotWindow {
  part: SlotPart
  label: string
  start: string
  end: string
}

/** Hai Khung nhận hàng mỗi ngày, theo CONTEXT.md. */
export const SLOT_WINDOWS: SlotWindow[] = [
  { part: 'morning', label: 'Sáng', start: '07:00', end: '10:30' },
  { part: 'afternoon', label: 'Chiều', start: '13:30', end: '17:00' },
]

/** Giờ chốt đơn: 10:00, sau đó đơn mới chỉ hẹn khung của hôm sau. */
export const CUTOFF_MINUTES = 10 * 60
export const DAYS_AHEAD = 7
export const VN_OFFSET_MINUTES = 7 * 60

/** Thời điểm hiện tại theo giờ Việt Nam (UTC+7, không có giờ mùa hè). */
export function vnNow(now: Date = new Date()): { date: string; minutes: number } {
  const shifted = new Date(now.getTime() + VN_OFFSET_MINUTES * 60_000)
  return {
    date: shifted.toISOString().slice(0, 10),
    minutes: shifted.getUTCHours() * 60 + shifted.getUTCMinutes(),
  }
}

export function addDays(date: string, n: number): string {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10)
}

export function fmtDateShort(date: string): string {
  const [, m, d] = date.split('-').map(Number)
  return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}`
}

export function slotLabel(date: string, part: SlotPart): string {
  const w = SLOT_WINDOWS.find((s) => s.part === part)!
  return `${w.label} ${fmtDateShort(date)}, ${w.start} tới ${w.end}`
}

export interface SlotOffer {
  date: string
  part: SlotPart
  label: string
  /** Số chỗ còn lại của khung; null là không giới hạn. */
  remaining: number | null
}

export function slotKey(date: string, part: SlotPart): string {
  return `${date}|${part}`
}

/**
 * Tính các Khung nhận hàng khách đặt được:
 * - Trước Giờ chột đơn: được khung chiều hôm nay.
 * - Từ Giờ chốt đơn trở đi: sớm nhất là khung sáng hôm sau (khung sáng hôm nay
 *   chỉ dành cho đơn đã đặt từ hôm trước).
 * - Khung đầy (theo giới hạn mỗi khung) bị loại khỏi danh sách.
 */
export function computeSlots(input: {
  todayDate: string
  nowMinutes: number
  cutoffMinutes?: number
  daysAhead?: number
  capacity: number | null
  counts: Record<string, number>
}): SlotOffer[] {
  const cutoff = input.cutoffMinutes ?? CUTOFF_MINUTES
  const daysAhead = input.daysAhead ?? DAYS_AHEAD

  const pairs: Array<[string, SlotPart]> = []
  if (input.nowMinutes < cutoff) {
    pairs.push([input.todayDate, 'afternoon'])
  }
  let d = addDays(input.todayDate, 1)
  for (let i = 0; i < daysAhead; i++, d = addDays(d, 1)) {
    pairs.push([d, 'morning'], [d, 'afternoon'])
  }

  const offers: SlotOffer[] = []
  for (const [date, part] of pairs) {
    const used = input.counts[slotKey(date, part)] ?? 0
    if (input.capacity != null) {
      const remaining = input.capacity - used
      if (remaining <= 0) continue
      offers.push({ date, part, label: slotLabel(date, part), remaining })
    } else {
      offers.push({ date, part, label: slotLabel(date, part), remaining: null })
    }
  }
  return offers
}
