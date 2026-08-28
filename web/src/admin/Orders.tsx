import { useCallback, useEffect, useState } from 'react'
import { api, fmtVnd, vnToday, type PlaceOrderBody } from '../api'
import type { AdminOrder, MenuItem, OrderStatus, SlotOffer } from '../types'

/** Bước chuyển tiếp chủ quán bấm được, khớp ALLOWED_TRANSITIONS phía máy chủ. */
const NEXT_ACTIONS: Record<OrderStatus, Array<{ target: OrderStatus; label: string; btnClass: string }>> = {
  new: [
    { target: 'confirmed', label: '✓ Xác nhận', btnClass: 'btn-st-confirm' },
    { target: 'paid', label: '💵 Thu tiền', btnClass: 'btn-st-paid' },
    { target: 'done', label: '☕ Hoàn tất', btnClass: 'btn-st-done' },
    { target: 'cancelled', label: '✕ Hủy', btnClass: 'btn-st-cancel' },
  ],
  confirmed: [
    { target: 'paid', label: '💵 Đã thu tiền', btnClass: 'btn-st-paid' },
    { target: 'done', label: '☕ Hoàn tất', btnClass: 'btn-st-done' },
    { target: 'cancelled', label: '✕ Hủy đơn', btnClass: 'btn-st-cancel' },
  ],
  paid: [
    { target: 'done', label: '☕ Hoàn tất giao', btnClass: 'btn-st-done' },
    { target: 'cancelled', label: '✕ Hủy đơn', btnClass: 'btn-st-cancel' },
  ],
  done: [{ target: 'cancelled', label: '✕ Hủy đơn', btnClass: 'btn-st-cancel' }],
  cancelled: [],
}

const STATUS_CONFIG: Record<OrderStatus, { label: string; class: string }> = {
  new: { label: 'Đơn mới', class: 'st-new' },
  confirmed: { label: 'Đã xác nhận', class: 'st-confirmed' },
  paid: { label: 'Đã thu tiền', class: 'st-paid' },
  done: { label: 'Hoàn tất', class: 'st-done' },
  cancelled: { label: 'Đã hủy', class: 'st-cancelled' },
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
      setError(e instanceof Error ? e.message : 'Không tải được danh sách đơn hàng')
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
      setError(e instanceof Error ? e.message : 'Chuyển trạng thái đơn thất bại')
    }
  }

  const activeOrders = orders.filter((o) => o.status !== 'cancelled')
  const totalRevenue = activeOrders.reduce((s, o) => s + o.total, 0)
  const morning = orders.filter((o) => o.slotPart === 'morning')
  const afternoon = orders.filter((o) => o.slotPart === 'afternoon')

  return (
    <div className="orders-container">
      {/* THANH CÔNG CỤ & KPI SUMMARY */}
      <div className="orders-top-control">
        <div className="date-picker-wrap">
          <label className="date-label">Ngày nhận:</label>
          <input
            type="date"
            className="admin-input date-input"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
          <button
            className="btn-admin-light btn-today"
            onClick={() => setDate(vnToday())}
          >
            Hôm nay
          </button>
        </div>

        <button
          className={`btn-admin-primary ${showManual ? 'active-toggle' : ''}`}
          onClick={() => setShowManual((v) => !v)}
        >
          {showManual ? '✕ Đóng form nhập' : '+ Nhập hộ đơn (Zalo)'}
        </button>
      </div>

      {/* KPI METRIC CARDS */}
      <div className="kpi-metrics-grid">
        <div className="kpi-card">
          <span className="kpi-title">Tổng đơn hàng</span>
          <span className="kpi-value">{orders.length}</span>
          <span className="kpi-hint">{activeOrders.length} đơn hợp lệ</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-title">Tổng doanh thu</span>
          <span className="kpi-value gold">{fmtVnd(totalRevenue)}</span>
          <span className="kpi-hint">Đã trừ đơn hủy</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-title">Khung Sáng</span>
          <span className="kpi-value">{morning.length} đơn</span>
          <span className="kpi-hint">
            {fmtVnd(morning.filter((o) => o.status !== 'cancelled').reduce((s, o) => s + o.total, 0))}
          </span>
        </div>
        <div className="kpi-card">
          <span className="kpi-title">Khung Chiều</span>
          <span className="kpi-value">{afternoon.length} đơn</span>
          <span className="kpi-hint">
            {fmtVnd(afternoon.filter((o) => o.status !== 'cancelled').reduce((s, o) => s + o.total, 0))}
          </span>
        </div>
      </div>

      {/* FORM NHẬP HỘ ĐƠN TỪ ZALO */}
      {showManual && (
        <ManualOrder
          onDone={() => {
            setShowManual(false)
            void load()
          }}
        />
      )}

      {error && <div className="admin-error-alert">{error}</div>}

      {/* DANH SÁCH ĐƠN HÀNG THEO KHUNG */}
      {morning.length > 0 && <OrderSection title="Khung Sáng" icon="🌅" orders={morning} onMove={move} />}
      {afternoon.length > 0 && <OrderSection title="Khung Chiều" icon="☕" orders={afternoon} onMove={move} />}

      {orders.length === 0 && (
        <div className="empty-orders-view">
          <span className="empty-icon">☕</span>
          <h3>Chưa có đơn hàng nào trong ngày {date}</h3>
          <p>Khách có thể đặt qua trang bán hoặc bạn có thể bấm "Nhập hộ đơn (Zalo)".</p>
        </div>
      )}
    </div>
  )
}

function OrderSection({
  title,
  icon,
  orders,
  onMove,
}: {
  title: string
  icon: string
  orders: AdminOrder[]
  onMove: (id: number, target: OrderStatus) => void
}) {
  const activeCount = orders.filter((o) => o.status !== 'cancelled').length
  const revenue = orders.filter((o) => o.status !== 'cancelled').reduce((s, o) => s + o.total, 0)

  return (
    <section className="admin-order-section">
      <div className="section-header">
        <h2>
          <span className="sec-icon">{icon}</span> {title}
        </h2>
        <span className="section-meta">
          {activeCount} đơn hợp lệ • <b>{fmtVnd(revenue)}</b>
        </span>
      </div>

      <div className="orders-grid">
        {orders.map((o) => (
          <article
            key={o.id}
            className={`admin-order-card ${o.status === 'cancelled' ? 'is-cancelled' : ''}`}
          >
            <div className="card-top">
              <div className="order-code-block">
                <span className="order-code">{o.code}</span>
                {o.channel === 'zalo' ? (
                  <span className="channel-badge zalo">Zalo</span>
                ) : (
                  <span className="channel-badge web">Web</span>
                )}
                {!o.teamsThread && o.channel === 'web' && (
                  <span className="teams-badge warn" title="Chưa liên kết Luồng Teams">
                    Chưa lên Teams
                  </span>
                )}
              </div>

              <span className={`status-pill ${STATUS_CONFIG[o.status].class}`}>
                {o.statusLabel}
              </span>
            </div>

            <div className="card-customer-info">
              <div className="customer-name">{o.customerName}</div>
              <div className="delivery-mode">
                {o.receiveMode === 'delivery' ? (
                  <span className="mode-delivery">🚀 Giao: {o.location}</span>
                ) : (
                  <span className="mode-pickup">☕ Nhận tại quán</span>
                )}
              </div>
            </div>

            <div className="card-items-block">
              <ul className="items-list">
                {o.items.map((it, i) => (
                  <li key={i} className="item-row">
                    <span className="it-name">{it.name}</span>
                    {it.optionSummary && <span className="it-opt">({it.optionSummary})</span>}
                    <span className="it-qty">× {it.qty}</span>
                  </li>
                ))}
              </ul>
            </div>

            {o.note && (
              <div className="card-note-box">
                <span className="note-icon">📝</span>
                <span className="note-text">{o.note}</span>
              </div>
            )}

            <div className="card-financial-row">
              <span className="pay-method">
                {o.paymentMethod === 'transfer' ? '📱 Chuyển khoản VietQR' : '💵 Tiền mặt'}
              </span>
              <span className="order-total-price">{fmtVnd(o.total)}</span>
            </div>

            <div className="card-time-meta">Đặt lúc {vnTime(o.createdAt)}</div>

            {NEXT_ACTIONS[o.status].length > 0 && (
              <div className="card-actions-row">
                {NEXT_ACTIONS[o.status].map((a) => (
                  <button
                    key={a.target}
                    className={`btn-action ${a.btnClass}`}
                    onClick={() => onMove(o.id, a.target)}
                  >
                    {a.label}
                  </button>
                ))}
              </div>
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
      setError('Vui lòng nhập tên khách')
      return
    }
    if (mode === 'delivery' && !location.trim()) {
      setError('Vui lòng nhập vị trí bàn giao hàng')
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
      setError('Chọn ít nhất một món cho khách')
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
    <div className="manual-order-panel">
      <div className="panel-head">
        <h3>+ Nhập hộ đơn từ Zalo</h3>
        <span className="panel-sub">Tạo đơn nhanh cho khách nhắn tin qua Zalo</span>
      </div>

      <div className="manual-form-grid">
        <div className="field-block">
          <label>Tên khách *</label>
          <input
            className="admin-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ví dụ: Hoàng Tuấn"
          />
        </div>

        <div className="field-block">
          <label>Cách nhận</label>
          <select
            className="admin-select"
            value={mode}
            onChange={(e) => setMode(e.target.value as 'pickup' | 'delivery')}
          >
            <option value="pickup">Nhận tại quán</option>
            <option value="delivery">Giao tận nơi</option>
          </select>
        </div>

        {mode === 'delivery' && (
          <div className="field-block">
            <label>Vị trí giao *</label>
            <input
              className="admin-input"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Tầng 4, Phòng Dev..."
            />
          </div>
        )}

        <div className="field-block">
          <label>Khung nhận</label>
          <select
            className="admin-select"
            value={slotKey}
            onChange={(e) => setSlotKey(e.target.value)}
          >
            {slots.map((s) => (
              <option key={`${s.date}|${s.part}`} value={`${s.date}|${s.part}`}>
                {s.label}
                {s.remaining != null ? ` (còn ${s.remaining})` : ''}
              </option>
            ))}
          </select>
        </div>

        <div className="field-block">
          <label>Thanh toán</label>
          <select
            className="admin-select"
            value={payment}
            onChange={(e) => setPayment(e.target.value as 'transfer' | 'cash')}
          >
            <option value="cash">Tiền mặt khi nhận</option>
            <option value="transfer">Chuyển khoản QR</option>
          </select>
        </div>

        <div className="field-block span-full">
          <label>Ghi chú</label>
          <input
            className="admin-input"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Ít ngọt, nhiều đá..."
          />
        </div>
      </div>

      <div className="manual-items-selector">
        <label className="section-label">Chọn món và số lượng:</label>
        <div className="item-selector-grid">
          {menu.map((m) => (
            <div key={m.id} className="selector-row">
              <div className="sel-item-name">
                <b>{m.name}</b>
                <span className="sel-price">{fmtVnd(m.price)}</span>
              </div>
              <div className="admin-stepper">
                <button type="button" onClick={() => bump(m.id, -1)}>
                  −
                </button>
                <span className="val">{qtys[m.id] ?? 0}</span>
                <button type="button" onClick={() => bump(m.id, 1)}>
                  +
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {error && <div className="admin-error-alert">{error}</div>}

      <div className="panel-actions">
        <button className="btn-admin-primary" disabled={busy} onClick={() => void submit()}>
          {busy ? 'Đang tạo đơn...' : '✓ Xác nhận tạo đơn'}
        </button>
      </div>
    </div>
  )
}

