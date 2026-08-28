import { useCallback, useEffect, useState } from 'react'
import { api, fmtVnd, vnToday, type PlaceOrderBody } from '../api'
import type { AdminOrder, BrewSheet, Intake, MenuItem, OrderStatus } from '../types'
import OrderEditor from './OrderEditor'

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

/** Nhịp tự làm mới danh sách, để đơn mới về là thấy mà không cần tải lại trang. */
const REFRESH_MS = 20_000

function vnTime(iso: string): string {
  const t = new Date(new Date(iso).getTime() + 7 * 3600_000)
  return `${String(t.getUTCHours()).padStart(2, '0')}:${String(t.getUTCMinutes()).padStart(2, '0')}`
}

function fmtDay(date: string): string {
  const [y, m, d] = date.split('-')
  return `${d}/${m}/${y}`
}

export default function Orders() {
  // Hai chế độ xem trong cùng tab: danh sách từng Đơn hàng, hoặc Bảng pha chế
  // đã gộp sẵn để biết phải pha bao nhiêu ly mỗi loại.
  const [view, setView] = useState<'list' | 'brew'>('list')
  const [scope, setScope] = useState<'pending' | 'date'>('pending')
  const [date, setDate] = useState(() => vnToday())
  const [orders, setOrders] = useState<AdminOrder[]>([])
  const [brew, setBrew] = useState<BrewSheet | null>(null)
  const [error, setError] = useState('')
  const [showManual, setShowManual] = useState(false)
  const [editing, setEditing] = useState<AdminOrder | null>(null)
  const [okMsg, setOkMsg] = useState('')
  const [lastSync, setLastSync] = useState('')

  const load = useCallback(async () => {
    try {
      if (view === 'brew') {
        // Máy chủ gộp sẵn ở tầng miền, giao diện không tự cộng lại.
        setBrew(await api.brewSheet())
      } else {
        const r = await api.orders(scope, date)
        setOrders(r.orders)
      }
      setLastSync(vnTime(new Date().toISOString()))
      setError('')
    } catch (e) {
      const fallback = view === 'brew' ? 'Không tải được Bảng pha chế' : 'Không tải được danh sách đơn hàng'
      setError(e instanceof Error ? e.message : fallback)
    }
  }, [view, scope, date])

  useEffect(() => {
    void load()
  }, [load])

  // Tự làm mới: đơn từ Trang bán về lúc nào chủ quán cũng thấy ngay.
  // Dừng khi đang sửa đơn, để danh sách nạp lại không cuốn mất form đang gõ dở.
  useEffect(() => {
    if (editing) return
    const timer = window.setInterval(() => void load(), REFRESH_MS)
    return () => window.clearInterval(timer)
  }, [load, editing])

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
  const freshCount = orders.filter((o) => o.status === 'new').length

  // Chế độ cần xử lý gom theo ngày Khách đặt, để việc cũ nhất nằm trên cùng.
  const byDay = new Map<string, AdminOrder[]>()
  for (const o of orders) {
    byDay.set(o.orderDate, [...(byDay.get(o.orderDate) ?? []), o])
  }

  return (
    <div className="orders-container">
      {/* HAI CHẾ ĐỘ XEM TRONG CÙNG TAB ĐƠN HÀNG, đứng chung hàng với nút nhập
          hộ để trên điện thoại bớt một dòng trước khi tới Đơn hàng đầu tiên. */}
      <div className="orders-view-row">
        <div className="scope-tabs view-switch">
          <button
            className={`scope-tab ${view === 'list' ? 'active' : ''}`}
            onClick={() => setView('list')}
          >
            Danh sách đơn
          </button>
          <button
            className={`scope-tab ${view === 'brew' ? 'active' : ''}`}
            onClick={() => setView('brew')}
          >
            Bảng pha chế
          </button>
        </div>

        {view === 'list' && (
          <button
            className={`btn-admin-primary ${showManual ? 'active-toggle' : ''}`}
            onClick={() => setShowManual((v) => !v)}
          >
            {showManual ? '✕ Đóng form nhập' : '+ Nhập hộ đơn (Zalo)'}
          </button>
        )}
      </div>

      {error && <div className="admin-error-alert">{error}</div>}
      {okMsg && <div className="admin-success-alert">{okMsg}</div>}

      {view === 'brew' ? (
        <BrewSheetView sheet={brew} lastSync={lastSync} />
      ) : (
        <>
          {/* THANH CÔNG CỤ & KPI SUMMARY */}
          <div className="orders-top-control">
            <div className="scope-tabs">
              <button
                className={`scope-tab ${scope === 'pending' ? 'active' : ''}`}
                onClick={() => setScope('pending')}
              >
                Cần xử lý
                {freshCount > 0 && scope === 'pending' && <span className="tab-badge">{freshCount}</span>}
              </button>
              <button
                className={`scope-tab ${scope === 'date' ? 'active' : ''}`}
                onClick={() => setScope('date')}
              >
                Theo ngày đặt
              </button>
            </div>

            {scope === 'date' && (
              <div className="date-picker-wrap">
                <input
                  type="date"
                  className="admin-input date-input"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
                <button className="btn-admin-light btn-today" onClick={() => setDate(vnToday())}>
                  Hôm nay
                </button>
              </div>
            )}
          </div>

          {/* KPI METRIC CARDS */}
          <div className="kpi-metrics-grid">
            <div className="kpi-card">
              <span className="kpi-title">{scope === 'pending' ? 'Đơn cần xử lý' : 'Đơn trong ngày'}</span>
              <span className="kpi-value">{orders.length}</span>
              <span className="kpi-hint">{freshCount} đơn mới chưa xác nhận</span>
            </div>
            <div className="kpi-card">
              <span className="kpi-title">Tổng tiền</span>
              <span className="kpi-value gold">{fmtVnd(totalRevenue)}</span>
              <span className="kpi-hint">Đã trừ đơn hủy</span>
            </div>
            <div className="kpi-card">
              <span className="kpi-title">Giao tận nơi</span>
              <span className="kpi-value">{activeOrders.filter((o) => o.receiveMode === 'delivery').length} đơn</span>
              <span className="kpi-hint">
                {activeOrders.filter((o) => o.receiveMode === 'pickup').length} đơn nhận tại quán
              </span>
            </div>
            <div className="kpi-card">
              <span className="kpi-title">Chờ thu tiền</span>
              <span className="kpi-value">
                {fmtVnd(activeOrders.filter((o) => o.status === 'new' || o.status === 'confirmed').reduce((s, o) => s + o.total, 0))}
              </span>
              <span className="kpi-hint">Tự làm mới lúc {lastSync}</span>
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

          {/* SỬA MỘT ĐƠN */}
          {editing && (
            <OrderEditor
              order={editing}
              onCancel={() => setEditing(null)}
              onDone={(changes) => {
                setEditing(null)
                setOkMsg(
                  changes.length === 0
                    ? 'Đã lưu, không có gì thay đổi nên không báo lên Teams.'
                    : `Đã sửa ${changes.map((c) => c.label.toLowerCase()).join(', ')} và báo vào luồng Teams của đơn.`,
                )
                window.setTimeout(() => setOkMsg(''), 5000)
                void load()
              }}
            />
          )}

          {/* DANH SÁCH ĐƠN HÀNG */}
          {scope === 'pending'
            ? [...byDay.entries()].map(([day, list]) => (
                <OrderSection
                  key={day}
                  title={`Đặt ngày ${fmtDay(day)}`}
                  icon="📅"
                  orders={list}
                  onMove={move}
                  onEdit={setEditing}
                />
              ))
            : orders.length > 0 && (
                <OrderSection
                  title={`Đơn đặt ngày ${fmtDay(date)}`}
                  icon="📅"
                  orders={orders}
                  onMove={move}
                  onEdit={setEditing}
                />
              )}

          {orders.length === 0 && (
            <div className="empty-orders-view">
              <span className="empty-icon">☕</span>
              <h3>
                {scope === 'pending'
                  ? 'Không còn đơn nào chờ xử lý'
                  : `Chưa có đơn nào đặt ngày ${fmtDay(date)}`}
              </h3>
              <p>Khách có thể đặt qua trang bán hoặc bạn có thể bấm "Nhập hộ đơn (Zalo)".</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}

/**
 * Bảng pha chế: máy chủ gộp Hàng đợi xử lý theo cặp Món và Tùy chọn, đây chỉ
 * hiển thị lại. Bảng để xem, không có ô tích đánh dấu đã pha.
 */
function BrewSheetView({ sheet, lastSync }: { sheet: BrewSheet | null; lastSync: string }) {
  if (!sheet) return <div className="brew-loading">Đang gộp Bảng pha chế...</div>

  if (sheet.rows.length === 0) {
    return (
      <div className="empty-orders-view">
        <span className="empty-icon">☕</span>
        <h3>Không còn ly nào phải pha</h3>
        <p>Hàng đợi xử lý đang trống. Có đơn mới là bảng hiện ngay.</p>
      </div>
    )
  }

  return (
    <section className="admin-order-section">
      <div className="section-header">
        <h2>
          <span className="sec-icon">☕</span> Bảng pha chế
        </h2>
        <span className="section-meta">
          Gộp toàn bộ hàng đợi xử lý • <b>{sheet.totalCups} ly</b>
          {lastSync && ` • tự làm mới lúc ${lastSync}`}
        </span>
      </div>

      <div className="admin-table-wrapper">
        <table className="admin-table brew-table">
          <thead>
            <tr>
              <th>Món</th>
              <th>Tùy chọn</th>
              <th className="num">Số ly</th>
            </tr>
          </thead>
          <tbody>
            {sheet.rows.map((r) => (
              <tr key={`${r.name}||${r.optionSummary}`}>
                <td className="td-name">
                  <b>{r.name}</b>
                </td>
                <td className="brew-option">{r.optionSummary || 'Không có'}</td>
                <td className="num brew-qty">{r.qty}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="brew-total-row">
              <td colSpan={2}>Tổng số ly phải pha</td>
              <td className="num">{sheet.totalCups}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  )
}

function OrderSection({
  title,
  icon,
  orders,
  onMove,
  onEdit,
}: {
  title: string
  icon: string
  orders: AdminOrder[]
  onMove: (id: number, target: OrderStatus) => void
  onEdit: (order: AdminOrder) => void
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
            className={`admin-order-card ${o.status === 'cancelled' ? 'is-cancelled' : ''} ${
              o.status === 'new' ? 'is-fresh' : ''
            }`}
          >
            <div className="card-top">
              <div className="order-code-block">
                <span className="order-code">{o.code}</span>
                {o.channel === 'zalo' ? (
                  <span className="channel-badge zalo">Zalo</span>
                ) : (
                  <span className="channel-badge web">Web</span>
                )}
                {!o.teamsThread && (
                  <span className="teams-badge warn" title="Bot DUKIN chưa mở được Luồng Đơn hàng">
                    Chưa lên Teams
                  </span>
                )}
              </div>

              <span className={`status-pill ${STATUS_CONFIG[o.status].class}`}>{o.statusLabel}</span>
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

            <div className="card-actions-row">
              {/* Đơn đã hủy thì khóa hẳn, không sửa được nữa. */}
              {o.status !== 'cancelled' && (
                <button className="btn-action btn-st-edit" onClick={() => onEdit(o)}>
                  ✏️ Sửa đơn
                </button>
              )}
              {NEXT_ACTIONS[o.status].map((a) => (
                <button key={a.target} className={`btn-action ${a.btnClass}`} onClick={() => onMove(o.id, a.target)}>
                  {a.label}
                </button>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

function ManualOrder({ onDone }: { onDone: () => void }) {
  const [menu, setMenu] = useState<MenuItem[]>([])
  const [intake, setIntake] = useState<Intake>({ open: true, remaining: null })
  const [name, setName] = useState('')
  const [mode, setMode] = useState<'pickup' | 'delivery'>('pickup')
  const [location, setLocation] = useState('')
  const [payment, setPayment] = useState<'transfer' | 'cash'>('cash')
  const [note, setNote] = useState('')
  const [qtys, setQtys] = useState<Record<number, number>>({})
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    Promise.all([api.adminMenu(), api.adminIntake()])
      .then(([m, i]) => {
        setMenu(m.items.filter((it) => it.active))
        setIntake(i)
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
    const body: PlaceOrderBody = {
      customerName: name.trim(),
      receiveMode: mode,
      location: mode === 'delivery' ? location.trim() : '',
      note: note.trim(),
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
        <span className="panel-sub">
          Tạo đơn nhanh cho khách nhắn tin qua Zalo
          {intake.remaining != null ? ` · hôm nay còn nhận ${intake.remaining} đơn` : ''}
        </span>
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
            placeholder="Ít ngọt, nhiều đá, khách hẹn lấy đầu giờ chiều..."
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
