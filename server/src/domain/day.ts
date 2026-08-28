/** Múi giờ Việt Nam cố định, không có giờ mùa hè. */
export const VN_OFFSET_MINUTES = 7 * 60

/** Thời điểm hiện tại theo giờ Việt Nam. */
export function vnNow(now: Date = new Date()): { date: string; minutes: number } {
  const shifted = new Date(now.getTime() + VN_OFFSET_MINUTES * 60_000)
  return {
    date: shifted.toISOString().slice(0, 10),
    minutes: shifted.getUTCHours() * 60 + shifted.getUTCMinutes(),
  }
}

/** Ngày theo giờ Việt Nam của một mốc ISO, dạng YYYY-MM-DD. */
export function vnDate(iso: string): string {
  return vnNow(new Date(iso)).date
}

/** Giờ phút theo giờ Việt Nam của một mốc ISO, dạng HH:MM. */
export function vnClock(iso: string): string {
  const { minutes } = vnNow(new Date(iso))
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
}

export function addDays(date: string, n: number): string {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10)
}

export function fmtDateShort(date: string): string {
  const [, m, d] = date.split('-').map(Number)
  return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}`
}
