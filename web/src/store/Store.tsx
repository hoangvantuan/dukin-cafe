import { useEffect, useMemo, useState } from 'react'
import { api, fmtVnd, type PlaceOrderBody } from '../api'
import type { MenuItem, SlotOffer } from '../types'
import './store.css'

interface CartLine {
  key: string
  itemId: number
  qty: number
  optionIds: number[]
}

interface Selection {
  optionIds: number[]
  qty: number
}

function linePrice(item: MenuItem, optionIds: number[]): number {
  let add = 0
  for (const g of item.groups) {
    for (const o of g.options) {
      if (optionIds.includes(o.id)) add += o.priceAdd
    }
  }
  return item.price + add
}

function optionNames(item: MenuItem, optionIds: number[]): string {
  const names: string[] = []
  for (const g of item.groups) {
    for (const o of g.options) {
      if (optionIds.includes(o.id)) names.push(o.name)
    }
  }
  return names.join(', ')
}

export default function Store() {
  const [items, setItems] = useState<MenuItem[]>([])
  const [slots, setSlots] = useState<SlotOffer[]>([])
  const [zaloLink, setZaloLink] = useState('')
  const [loadError, setLoadError] = useState('')
  const [sel, setSel] = useState<Record<number, Selection>>({})
  const [cart, setCart] = useState<CartLine[]>([])
  const [step, setStep] = useState<'menu' | 'form' | 'done'>('menu')
  const [name, setName] = useState(() => localStorage.getItem('dukin_name') ?? '')
  const [mode, setMode] = useState<'pickup' | 'delivery'>('pickup')
  const [location, setLocation] = useState(() => localStorage.getItem('dukin_location') ?? '')
  const [slotKey, setSlotKey] = useState('')
  const [payment, setPayment] = useState<'transfer' | 'cash'>('transfer')
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [result, setResult] = useState<{ id: number; total: number; qrUrl: string | null } | null>(null)

  useEffect(() => {
    Promise.all([api.menu(), api.slots(), api.publicConfig()])
      .then(([m, s, c]) => {
        setItems(m.items)
        setSlots(s.slots)
        setZaloLink(c.zaloLink)
        const init: Record<number, Selection> = {}
        for (const it of m.items) {
          const defaults = it.groups
            .filter((g) => g.required && !g.multiple)
            .map((g) => g.options[0]?.id)
            .filter((x): x is number => x != null)
          init[it.id] = { optionIds: defaults, qty: 1 }
        }
        setSel(init)
        if (s.slots.length > 0 && !slotKey) {
          setSlotKey(`${s.slots[0].date}|${s.slots[0].part}`)
        }
      })
      .catch((e: Error) => setLoadError(e.message))
  }, [])

  const itemsById = useMemo(() => new Map(items.map((i) => [i.id, i])), [items])
  const cartCount = cart.reduce((n, l) => n + l.qty, 0)
  const cartTotal = cart.reduce((sum, l) => sum + linePrice(itemsById.get(l.itemId)!, l.optionIds) * l.qty, 0)

  function showToast(msg: string) {
    setToastMessage(msg)
    window.setTimeout(() => setToastMessage(null), 2200)
  }

  function toggleOption(item: MenuItem, groupId: number, optionId: number, multiple: boolean): void {
    setSel((prev) => {
      const cur = prev[item.id] ?? { optionIds: [], qty: 1 }
      const group = item.groups.find((g) => g.id === groupId)!
      const groupOptionIds = group.options.map((o) => o.id)
      const next = multiple
        ? cur.optionIds.includes(optionId)
          ? cur.optionIds.filter((id) => id !== optionId)
          : [...cur.optionIds, optionId]
        : [...cur.optionIds.filter((id) => !groupOptionIds.includes(id)), optionId]
      return { ...prev, [item.id]: { ...cur, optionIds: next } }
    })
  }

  function setItemQty(itemId: number, delta: number): void {
    setSel((prev) => {
      const cur = prev[itemId] ?? { optionIds: [], qty: 1 }
      return { ...prev, [itemId]: { ...cur, qty: Math.max(1, Math.min(20, cur.qty + delta)) } }
    })
  }

  function addToCart(itemId: number): void {
    const s = sel[itemId]
    if (!s) return
    const item = itemsById.get(itemId)
    const key = `${itemId}:${[...s.optionIds].sort((a, b) => a - b).join('-')}`
    setCart((prev) => {
      const found = prev.find((l) => l.key === key)
      if (found) return prev.map((l) => (l.key === key ? { ...l, qty: l.qty + s.qty } : l))
      return [...prev, { key, itemId, qty: s.qty, optionIds: s.optionIds }]
    })
    if (item) {
      showToast(`Đã thêm ${s.qty} × ${item.name} vào khay!`)
    }
  }

  function changeCartQty(key: string, delta: number): void {
    setCart((prev) =>
      prev
        .map((l) => (l.key === key ? { ...l, qty: l.qty + delta } : l))
        .filter((l) => l.qty > 0),
    )
  }

  async function submit(): Promise<void> {
    setFormError('')
    if (!name.trim()) {
      setFormError('Vui lòng nhập tên của bạn để quán tiện xưng hô.')
      return
    }
    if (mode === 'delivery' && !location.trim()) {
      setFormError('Vui lòng nhập vị trí giao hàng (Tầng, Phòng làm việc).')
      return
    }
    if (!slotKey) {
      setFormError('Vui lòng chọn một khung nhận hàng phù hợp.')
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
      items: cart.map((l) => ({ itemId: l.itemId, qty: l.qty, optionIds: l.optionIds })),
    }
    setSubmitting(true)
    try {
      const r = await api.placeOrder(body)
      localStorage.setItem('dukin_name', name.trim())
      if (mode === 'delivery') localStorage.setItem('dukin_location', location.trim())
      setResult(r)
      setStep('done')
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Đặt hàng chưa thành công, vui lòng thử lại.')
    } finally {
      setSubmitting(false)
    }
  }

  function resetAll(): void {
    setCart([])
    setNote('')
    setResult(null)
    setStep('menu')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (loadError) {
    return (
      <div className="dukin-viewport">
        <div className="bistro-board error-board">
          <div className="error-icon">☕</div>
          <h2>Không thể tải thực đơn</h2>
          <p className="error-desc">{loadError}</p>
          <button className="bistro-btn btn-gold" onClick={() => window.location.reload()}>
            Tải lại trang
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="dukin-viewport">
      {/* Thông báo nổi (Toast) */}
      {toastMessage && (
        <div className="dukin-toast">
          <span className="toast-icon">✨</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* BƯỚC 3: HOÀN TẤT ĐƠN HÀNG (DONE) */}
      {step === 'done' && result && (
        <div className="bistro-board receipt-view">
          <div className="gold-ornament top-ornament">✦ ❦ ✦</div>

          <header className="brand-header">
            <span className="brand-sub">DUKIN CAFE &amp; BISTRO</span>
            <h1 className="brand-title">L'Art du Café</h1>
            <p className="brand-quote">« Cà phê là nghệ thuật, DUKIN là chữ ký. »</p>
          </header>

          <div className="receipt-badge">
            <span className="badge-ring">✓</span>
            <h2>ĐÃ GHI NHẬN ĐƠN HÀNG</h2>
            <div className="order-number">#{String(result.id).padStart(3, '0')}</div>
          </div>

          <div className="receipt-details">
            <div className="receipt-row">
              <span>Khách đặt:</span>
              <b>{name}</b>
            </div>
            <div className="receipt-row">
              <span>Hình thức:</span>
              <b>{mode === 'delivery' ? `Giao tận nơi (${location})` : 'Nhận tại quán'}</b>
            </div>
            <div className="receipt-row">
              <span>Thanh toán:</span>
              <b>{payment === 'transfer' ? 'Chuyển khoản VietQR' : 'Tiền mặt khi nhận'}</b>
            </div>
            <div className="receipt-row highlight">
              <span>Tổng thanh toán:</span>
              <span className="price-big">{fmtVnd(result.total)}</span>
            </div>
          </div>

          {result.qrUrl && (
            <div className="vietqr-section">
              <div className="qr-frame">
                <img src={result.qrUrl} alt="Mã thanh toán VietQR" width={240} height={240} />
              </div>
              <p className="qr-tip">
                Quét mã VietQR bằng ứng dụng ngân hàng để thanh toán. Nội dung chuyển khoản đã được tạo sẵn tự động.
              </p>
            </div>
          )}

          {payment === 'cash' && (
            <div className="cash-tip-box">
              <span className="tip-icon">💵</span>
              <p>Bạn có thể chuẩn bị tiền mặt và thanh toán trực tiếp khi nhận cà phê từ quán.</p>
            </div>
          )}

          <div className="receipt-notice">
            <p>
              Chủ quán sẽ cập nhật tiến độ đơn qua luồng thông báo trên Microsoft Teams của công ty.
            </p>
            {zaloLink && (
              <p className="zalo-link-row">
                Cần điều chỉnh đơn gấp? Nhắn Zalo:{' '}
                <a href={zaloLink} target="_blank" rel="noreferrer">
                  {zaloLink}
                </a>
              </p>
            )}
          </div>

          <div className="receipt-actions">
            <button className="bistro-btn btn-gold" onClick={resetAll}>
              + Đặt thêm món khác
            </button>
          </div>

          <div className="gold-ornament bottom-ornament">✦ ❦ ✦</div>
        </div>
      )}

      {/* BƯỚC 2: ĐIỀN THÔNG TIN ĐẶT HÀNG (FORM) */}
      {step === 'form' && (
        <div className="bistro-board form-view">
          <div className="gold-ornament top-ornament">✦ ❦ ✦</div>

          <header className="brand-header compact">
            <button className="btn-back-link" onClick={() => setStep('menu')}>
              ← Quay lại thực đơn
            </button>
            <h1 className="brand-title-small">Xác nhận Đơn hàng</h1>
            <p className="brand-quote">« Chậm một nhịp, đậm một đời. »</p>
          </header>

          {/* Danh sách món trong khay */}
          <section className="cart-summary-card">
            <div className="card-header">
              <span className="card-title">Khay cà phê của bạn</span>
              <span className="card-count">{cartCount} món</span>
            </div>
            <div className="cart-item-list">
              {cart.map((l) => {
                const item = itemsById.get(l.itemId)!
                const opts = optionNames(item, l.optionIds)
                return (
                  <div key={l.key} className="cart-item-row">
                    <div className="cart-item-info">
                      <div className="cart-item-name">{item.name}</div>
                      {opts && <div className="cart-item-opts">{opts}</div>}
                    </div>
                    <div className="cart-item-ctrl">
                      <span className="cart-item-price">
                        {fmtVnd(linePrice(item, l.optionIds) * l.qty)}
                      </span>
                      <div className="bistro-stepper mini">
                        <button onClick={() => changeCartQty(l.key, -1)} aria-label="Giảm">
                          −
                        </button>
                        <span className="step-val">{l.qty}</span>
                        <button onClick={() => changeCartQty(l.key, 1)} aria-label="Tăng">
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="cart-summary-total">
              <span>Tổng cộng</span>
              <span className="total-gold">{fmtVnd(cartTotal)}</span>
            </div>
          </section>

          {/* Thông tin đặt hàng */}
          <section className="bistro-form-fields">
            {/* Tên khách */}
            <div className="form-group">
              <label className="form-label">
                Tên của bạn <span className="req">*</span>
              </label>
              <input
                type="text"
                className="bistro-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ví dụ: Hoàng Tuấn, Thu Hà..."
              />
            </div>

            {/* Cách nhận hàng */}
            <div className="form-group">
              <label className="form-label">Cách nhận hàng</label>
              <div className="mode-toggle-grid">
                <button
                  type="button"
                  className={`mode-btn ${mode === 'pickup' ? 'active' : ''}`}
                  onClick={() => setMode('pickup')}
                >
                  <span className="mode-icon">☕</span>
                  <span className="mode-text">
                    <b>Nhận tại quán</b>
                    <small>Tự ghé lấy tại quầy</small>
                  </span>
                </button>
                <button
                  type="button"
                  className={`mode-btn ${mode === 'delivery' ? 'active' : ''}`}
                  onClick={() => setMode('delivery')}
                >
                  <span className="mode-icon">🚀</span>
                  <span className="mode-text">
                    <b>Giao tận nơi</b>
                    <small>Miễn phí trong công ty</small>
                  </span>
                </button>
              </div>
            </div>

            {/* Vị trí giao nếu chọn delivery */}
            {mode === 'delivery' && (
              <div className="form-group">
                <label className="form-label">
                  Vị trí bàn làm việc <span className="req">*</span>
                </label>
                <input
                  type="text"
                  className="bistro-input"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Ví dụ: Tầng 4, Phòng Thiết kế, Bàn 12..."
                />
              </div>
            )}

            {/* Khung nhận hàng */}
            <div className="form-group">
              <label className="form-label">
                Khung nhận hàng <span className="req">*</span>
              </label>
              <div className="slot-grid">
                {slots.map((s) => {
                  const key = `${s.date}|${s.part}`
                  const isSelected = slotKey === key
                  return (
                    <button
                      key={key}
                      type="button"
                      className={`slot-card ${isSelected ? 'selected' : ''}`}
                      onClick={() => setSlotKey(key)}
                    >
                      <div className="slot-card-left">
                        <span className="slot-icon">{s.part === 'morning' ? '🌅' : '☕'}</span>
                        <div>
                          <div className="slot-label">{s.label}</div>
                          {s.remaining != null && (
                            <div className="slot-rem">Còn {s.remaining} chỗ trống</div>
                          )}
                        </div>
                      </div>
                      <div className="slot-radio">{isSelected ? '✓' : ''}</div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Phương thức thanh toán */}
            <div className="form-group">
              <label className="form-label">Cách thanh toán</label>
              <div className="mode-toggle-grid">
                <button
                  type="button"
                  className={`mode-btn ${payment === 'transfer' ? 'active' : ''}`}
                  onClick={() => setPayment('transfer')}
                >
                  <span className="mode-icon">📱</span>
                  <span className="mode-text">
                    <b>Chuyển khoản VietQR</b>
                    <small>Quét mã sau khi đặt</small>
                  </span>
                </button>
                <button
                  type="button"
                  className={`mode-btn ${payment === 'cash' ? 'active' : ''}`}
                  onClick={() => setPayment('cash')}
                >
                  <span className="mode-icon">💵</span>
                  <span className="mode-text">
                    <b>Tiền mặt</b>
                    <small>Thanh toán khi nhận</small>
                  </span>
                </button>
              </div>
            </div>

            {/* Ghi chú */}
            <div className="form-group">
              <label className="form-label">Ghi chú cho Barista</label>
              <textarea
                className="bistro-textarea"
                rows={2}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Ít ngọt, nhiều đá, dùng ly cá nhân, đem ống hút giấy..."
              />
            </div>

            {formError && <div className="bistro-form-error">{formError}</div>}

            <div className="form-submit-row">
              <button
                type="button"
                className="bistro-btn btn-ghost"
                onClick={() => setStep('menu')}
              >
                ← Chọn thêm món
              </button>
              <button
                type="button"
                className="bistro-btn btn-gold"
                disabled={submitting || cart.length === 0}
                onClick={() => void submit()}
              >
                {submitting ? 'Đang xử lý...' : `Xác nhận đặt (${fmtVnd(cartTotal)})`}
              </button>
            </div>
          </section>

          <div className="gold-ornament bottom-ornament">✦ ❦ ✦</div>
        </div>
      )}

      {/* BƯỚC 1: THỰC ĐƠN QUÁN (MENU) */}
      {step === 'menu' && (
        <div className="bistro-board">
          {/* Họa tiết trang trí góc cổ điển */}
          <div className="gold-ornament top-ornament">✦ ❦ ✦</div>

          <header className="brand-header">
            <div className="brand-insignia">DUKIN CAFE &amp; BISTRO</div>
            <h1 className="brand-title">L'Art du Café</h1>
            <div className="brand-divider">
              <span className="divider-line"></span>
              <span className="divider-icon">☕</span>
              <span className="divider-line"></span>
            </div>
            <p className="brand-quote">« Cà phê là nghệ thuật, DUKIN là chữ ký. »</p>
          </header>

          {/* Thông báo giờ chốt đơn */}
          <div className="schedule-banner">
            <div className="schedule-badge">LỊCH ĐẶT TRƯỚC</div>
            <div className="schedule-text">
              ✦ Đặt hôm trước có ngay sáng hôm sau • Sáng đặt chiều có hàng (chốt 10:00) ✦
            </div>
          </div>

          {/* Danh sách món */}
          <main className="menu-items-flow">
            {items.map((item, index) => {
              const s = sel[item.id] ?? { optionIds: [], qty: 1 }
              const price = linePrice(item, s.optionIds)
              const itemNum = String(index + 1).padStart(2, '0')

              return (
                <article className="menu-card" key={item.id}>
                  <div className="menu-card-top">
                    <span className="item-num">{itemNum}</span>
                    <div className="item-headings">
                      <h2 className="item-name-vi">
                        {item.name}
                        {item.nameFr && <span className="item-name-fr">~ {item.nameFr} ~</span>}
                      </h2>
                      {item.description && <p className="item-description">{item.description}</p>}
                    </div>
                    <div className="item-price-tag">{fmtVnd(price)}</div>
                  </div>

                  {/* Nhóm tùy chọn */}
                  {item.groups.length > 0 && (
                    <div className="item-options-section">
                      {item.groups.map((g) => (
                        <div className="option-group" key={g.id}>
                          <div className="option-group-title">
                            {g.name}
                            <span className="group-hint">
                              {g.required && !g.multiple ? '(bắt buộc)' : '(tùy chọn)'}
                            </span>
                          </div>
                          <div className="option-chip-wrap">
                            {g.options.map((o) => {
                              const isChecked = s.optionIds.includes(o.id)
                              return (
                                <button
                                  key={o.id}
                                  type="button"
                                  className={`option-chip ${isChecked ? 'active' : ''}`}
                                  onClick={() => toggleOption(item, g.id, o.id, g.multiple)}
                                >
                                  <span className="chip-name">{o.name}</span>
                                  {o.priceAdd > 0 && (
                                    <span className="chip-addon">+{o.priceAdd / 1000}k</span>
                                  )}
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Thanh điều khiển số lượng và nút Thêm */}
                  <div className="item-card-footer">
                    <div className="bistro-stepper">
                      <button
                        type="button"
                        onClick={() => setItemQty(item.id, -1)}
                        aria-label="Giảm số lượng"
                      >
                        −
                      </button>
                      <span className="step-val">{s.qty}</span>
                      <button
                        type="button"
                        onClick={() => setItemQty(item.id, 1)}
                        aria-label="Tăng số lượng"
                      >
                        +
                      </button>
                    </div>

                    <button
                      type="button"
                      className="bistro-btn btn-gold btn-add-item"
                      onClick={() => addToCart(item.id)}
                    >
                      <span className="btn-icon">☕</span>
                      <span>Thêm vào đơn • {fmtVnd(price * s.qty)}</span>
                    </button>
                  </div>
                </article>
              )
            })}
          </main>

          <div className="menu-closing-quote">« Chậm một nhịp, đậm một đời. »</div>

          <footer className="bistro-footer">
            <div className="footer-tagline">DUKIN CAFE &amp; BISTRO · L'ART DU CAFÉ</div>
            <div className="footer-sub">
              Phục vụ nội bộ đồng nghiệp · Chăm chút từng giọt cà phê phin thủ công
            </div>
          </footer>

          <div className="gold-ornament bottom-ornament">✦ ❦ ✦</div>
        </div>
      )}

      {/* KHAY ĐƠN HÀNG NỔI (FLOATING CART BAR) */}
      {step === 'menu' && cart.length > 0 && (
        <aside className="floating-cart-tray">
          <div className="cart-tray-content">
            <div className="cart-tray-left">
              <div className="tray-badge">
                <span className="tray-icon">🛍️</span>
                <span className="tray-count">{cartCount}</span>
              </div>
              <div className="tray-info">
                <div className="tray-label">Khay cà phê của bạn</div>
                <div className="tray-price">{fmtVnd(cartTotal)}</div>
              </div>
            </div>
            <button
              type="button"
              className="bistro-btn btn-gold tray-action-btn"
              onClick={() => {
                setStep('form')
                window.scrollTo({ top: 0, behavior: 'smooth' })
              }}
            >
              <span>Xem đơn &amp; Đặt hàng</span>
              <span className="tray-arrow">→</span>
            </button>
          </div>
        </aside>
      )}
    </div>
  )
}

