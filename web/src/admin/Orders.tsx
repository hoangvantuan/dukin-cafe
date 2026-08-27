import { useCallback, useEffect, useState } from 'react'
import { api, fmtVnd, vnToday, type PlaceOrderBody } from '../api'
import type { AdminOrder, MenuItem, OrderStatus, SlotOffer } from '../types'

/** Bước chuyển tiếp chủ quán bấm được, khớp ALLOWED_TRANSITIONS phía máy chủ. */
const NEXT_ACTIONS: Record<OrderStatus, Array<{ target: OrderStatus; label: string }>> = {
  new: [
    { target: 'confirmed', label: 'Xác nhận' },
    { target: 'paid', label: 'Đã thu tiền' },
    { target: 'done', label: 'Hoàn tất' },
    { target: 'cancelled', label: 'Hủy' },
  ],
  confirmed: [
    { target: 'paid', label: 'Đã thu tiền' },
    { target: 'done', label: 'Hoàn tất' },
    { target: 'cancelled', label: 'Hủy' },
  ],
  paid: [
    { target: 'done', label: 'Hoàn tất' },
    { target: 'cancelled', label: 'Hủy' },
  ],
  done: [{ target: 'cancelled', label: 'Hủy' }],
  cancelled: [],
}

const STATUS_CLASS: Record<OrderStatus, string> = {
  new: 'st-new',
  confirmed: 'st-confirmed',
  paid: 'st-paid',
  done: 'st-done',
  cancelled: 'st-cancelled',
}

function vnTime(iso: string): string {
  const t = new Date(new Date(iso).getTime() + 7 * 3600_000)
  return `${String(t.getUTCHours()).padStart(2, '0')}:${String(t.getUTCMinutes()).padStart(2, '0')}`
}

export default function Orders() {
  const [date, setDate] = useState(() => vnToday())
  const [orders, setOrders] = useState<AdminOrder[]>([])
  const [error, setError] = useState('')
  const [showManual, setShowManual] = useState(false)

  const load = useCallback(async () => {
    setError('')
    try {
      const r = await api.orders(date)
      setOrders(r.orders)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không tải được đơn')
    }
  }, [date])

  useEffect(() => {
    void load()
  }, [load])

  async function move(id: number, target: OrderStatus): Promise<void> {
    try {
      await api.patchOrder(id, target)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Chuyển trạng thái thất bại')
    }
  }

  const morning = orders.filter((o) => o.slotPart === 'morning')
  const afternoon = orders.filter((o) => o.slotPart === 'afternoon')

  return (
    <div>
      <div className="toolbar">
        <label>
          Ngày nhận:{' '}
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
        <button className="btn-light" onClick={() => setShowManual((v) => !v)}>
          {showManual ? 'Đóng nhập hộ' : '+ Nhập hộ (Zalo)'}
        </button>
      </div>

      {showManual && <ManualOrder onDone={() => { setShowManual(false); void load() }} />}

      {error && <p className="form-error">{error}</p>}

      {morning.length > 0 && <Section title="Khung sáng" orders={morning} onMove={move} />}
      {afternoon.length > 0 && <Section title="Khung chiều" orders={afternoon} onMove={move} />}
      {orders.length === 0 && <p className="muted">Chưa có đơn nào trong ngày này.</p>}
    </div>
  )
}

function Section({
  title,
  orders,
  onMove,
}: {
  title: string
  orders: AdminOrder[]
  onMove: (id: number, target: OrderStatus) => void
}) {
  const revenue = orders.filter((o) => o.status !== 'cancelled').reduce((s, o) => s + o.total, 0)
  return (
    <section className="slot-section">
      <h2>
        {title} <span className="muted">({orders.length} đơn • {fmtVnd(revenue)})</span>
      </h2>
      <div className="order-grid">
        {orders.map((o) => (
          <article key={o.id} className={`order-card ${o.status === 'cancelled' ? 'is-cancelled' : ''}`}>
            <header>
              <b>{o.code}</b>
              <span className={`status ${STATUS_CLASS[o.status]}`}>{o.statusLabel}</span>
              {o.channel === 'zalo' && <span className="badge">Zalo</span>}
              {!o.teamsThread && o.channel === 'web' && <span className="badge warn">chưa lên Teams</span>}
            </header>
            <div className="order-body">
              <p>
                <b>{o.customerName}</b> • {o.receiveMode === 'delivery' ? `giao: ${o.location}` : 'nhận tại quán'}
              </p>
              <ul>
                {o.items.map((it, i) => (
                  <li key={i}>
                    {it.name}
                    {it.optionSummary ? ` (${it.optionSummary})` : ''} × {it.qty}
                  </li>
                ))}
              </ul>
              {o.note && <p className="note">📝 {o.note}</p>}
              <p className="meta">
                {o.paymentMethod === 'transfer' ? 'Chuyển khoản' : 'Tiền mặt'} • {fmtVnd(o.total)} • đặt lúc {vnTime(o.createdAt)}
              </p>
            </div>
            {NEXT_ACTIONS[o.status].length > 0 && (
              <footer>
                {NEXT_ACTIONS[o.status].map((a) => (
                  <button
                    key={a.target}
                    className={a.target === 'cancelled' ? 'btn-danger' : 'btn-dark'}
                    onClick={() => onMove(o.id, a.target)}
                  >
                    {a.label}
                  </button>
                ))}
              </footer>
            )}
          </article>
        ))}
      </div>
    </section>
  )
}

function ManualOrder({ onDone }: { onDone: () => void }) {
  const [menu, setMenu] = useState<MenuItem[]>([])
  const [slots, setSlots] = useState<SlotOffer[]>([])
  const [name, setName] = useState('')
  const [mode, setMode] = useState<'pickup' | 'delivery'>('pickup')
  const [location, setLocation] = useState('')
  const [slotKey, setSlotKey] = useState('')
  const [payment, setPayment] = useState<'transfer' | 'cash'>('cash')
  const [note, setNote] = useState('')
  const [qtys, setQtys] = useState<Record<number, number>>({})
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    Promise.all([api.adminMenu(), api.adminSlots()])
      .then(([m, s]) => {
        setMenu(m.items.filter((i) => i.active))
        setSlots(s.slots)
        if (s.slots[0]) setSlotKey(`${s.slots[0].date}|${s.slots[0].part}`)
      })
      .catch((e: Error) => setError(e.message))
  }, [])

  function bump(itemId: number, delta: number): void {
    setQtys((prev) => ({ ...prev, [itemId]: Math.max(0, (prev[itemId] ?? 0) + delta) }))
  }

  async function submit(): Promise<void> {
    setError('')
    if (!name.trim()) {
      setError('Cần tên khách')
      return
    }
    if (mode === 'delivery' && !location.trim()) {
      setError('Cần vị trí giao')
      return
    }
    const lines = Object.entries(qtys)
      .filter(([, qty]) => qty > 0)
      .map(([id, qty]) => {
        const item = menu.find((m) => m.id === Number(id))!
        const defaults = item.groups
          .filter((g) => g.required && !g.multiple)
          .map((g) => g.options[0]?.id)
          .filter((x): x is number => x != null)
        return { itemId: item.id, qty, optionIds: defaults }
      })
    if (lines.length === 0) {
      setError('Chọn ít nhất một món')
      return
    }
    const [slotDate, slotPart] = slotKey.split('|')
    const body: PlaceOrderBody = {
      customerName: name.trim(),
      receiveMode: mode,
      location: mode === 'delivery' ? location.trim() : '',
      note: note.trim(),
      slotDate,
      slotPart,
      paymentMethod: payment,
      items: lines,
    }
    setBusy(true)
    try {
      await api.createManualOrder(body)
      onDone()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Tạo đơn thất bại')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="manual-card">
      <h3>Nhập hộ đơn từ Zalo</h3>
      <div className="manual-grid">
        <label>
          Tên khách <input value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label>
          Cách nhận{' '}
          <select value={mode} onChange={(e) => setMode(e.target.value as 'pickup' | 'delivery')}>
            <option value="pickup">Nhận tại quán</option>
            <option value="delivery">Giao tận nơi</option>
          </select>
        </label>
        {mode === 'delivery' && (
          <label>
            Vị trí giao <input value={location} onChange={(e) => setLocation(e.target.value)} />
          </label>
        )}
        <label>
          Khung nhận{' '}
          <select value={slotKey} onChange={(e) => setSlotKey(e.target.value)}>
            {slots.map((s) => (
              <option key={`${s.date}|${s.part}`} value={`${s.date}|${s.part}`}>
                {s.label}
                {s.remaining != null ? ` (còn ${s.remaining})` : ''}
              </option>
            ))}
          </select>
        </label>
        <label>
          Thanh toán{' '}
          <select value={payment} onChange={(e) => setPayment(e.target.value as 'transfer' | 'cash')}>
            <option value="cash">Tiền mặt</option>
            <option value="transfer">Chuyển khoản</option>
          </select>
        </label>
        <label className="span2">
          Ghi chú <input value={note} onChange={(e) => setNote(e.target.value)} />
        </label>
      </div>
      <div className="manual-items">
        {menu.map((m) => (
          <div key={m.id} className="manual-item">
            <span>{m.name}</span>
            <span className="qty-ctrl">
              <button onClick={() => bump(m.id, -1)}>−</button>
              <b>{qtys[m.id] ?? 0}</b>
              <button onClick={() => bump(m.id, 1)}>+</button>
            </span>
          </div>
        ))}
      </div>
      {error && <p className="form-error">{error}</p>}
      <button className="btn-dark" disabled={busy} onClick={() => void submit()}>
        {busy ? 'Đang tạo...' : 'Tạo đơn'}
      </button>
    </div>
  )
}
