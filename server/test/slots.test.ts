import test from 'node:test'
import assert from 'node:assert/strict'
import { addDays, computeSlots, vnNow, slotLabel, SLOT_WINDOWS } from '../src/domain/slots.js'

const TODAY = '2026-08-27'

test('vnNow đổi giờ UTC sang giờ Việt Nam (+7)', () => {
  const t = vnNow(new Date('2026-08-27T02:30:00Z'))
  assert.equal(t.date, '2026-08-27')
  assert.equal(t.minutes, 9 * 60 + 30)
})

test('addDays qua tháng', () => {
  assert.equal(addDays('2026-08-31', 1), '2026-09-01')
  assert.equal(addDays('2026-12-31', 1), '2027-01-01')
})

test('trước giờ chốt: được khung chiều hôm nay, không có sáng hôm nay', () => {
  const slots = computeSlots({ todayDate: TODAY, nowMinutes: 9 * 60, capacity: null, counts: {} })
  assert.equal(slots[0].date, TODAY)
  assert.equal(slots[0].part, 'afternoon')
  assert.ok(!slots.some((s) => s.date === TODAY && s.part === 'morning'))
})

test('từ giờ chốt trở đi: sớm nhất là khung sáng hôm sau', () => {
  const slots = computeSlots({ todayDate: TODAY, nowMinutes: 10 * 60, capacity: null, counts: {} })
  assert.equal(slots[0].date, addDays(TODAY, 1))
  assert.equal(slots[0].part, 'morning')
  assert.ok(!slots.some((s) => s.date === TODAY))
})

test('khung đầy theo giới hạn bị loại, khung còn chỗ hiện số chỗ', () => {
  const slots = computeSlots({
    todayDate: TODAY,
    nowMinutes: 9 * 60,
    capacity: 2,
    counts: { [`${TODAY}|afternoon`]: 2, [`${addDays(TODAY, 1)}|morning`]: 1 },
  })
  assert.ok(!slots.some((s) => s.date === TODAY && s.part === 'afternoon'))
  const tomorrowMorning = slots.find((s) => s.date === addDays(TODAY, 1) && s.part === 'morning')
  assert.equal(tomorrowMorning?.remaining, 1)
})

test('không giới hạn thì remaining là null và đủ 7 ngày phía trước', () => {
  const slots = computeSlots({ todayDate: TODAY, nowMinutes: 10 * 60, capacity: null, counts: {} })
  assert.equal(slots.length, 14)
  assert.ok(slots.every((s) => s.remaining === null))
})

test('nhãn khung ghi rõ buổi, ngày, giờ', () => {
  const label = slotLabel(TODAY, 'morning')
  const w = SLOT_WINDOWS.find((s) => s.part === 'morning')!
  assert.ok(label.startsWith('Sáng 27/08'))
  assert.ok(label.includes(w.start))
})
