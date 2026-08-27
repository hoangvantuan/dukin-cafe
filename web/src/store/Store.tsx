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
      })
      .catch((e: Error) => setLoadError(e.message))
  }, [])

  const itemsById = useMemo(() => new Map(items.map((i) => [i.id, i])), [items])
  const cartCount = cart.reduce((n, l) => n + l.qty, 0)
  const cartTotal = cart.reduce((sum, l) => sum + linePrice(itemsById.get(l.itemId)!, l.optionIds) * l.qty, 0)

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
    const key = `${itemId}:${[...s.optionIds].sort((a, b) => a - b).join('-')}`
    setCart((prev) => {
      const found = prev.find((l) => l.key === key)
      if (found) return prev.map((l) => (l.key === key ? { ...l, qty: l.qty + s.qty } : l))
      return [...prev, { key, itemId, qty: s.qty, optionIds: s.optionIds }]
    })
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
      setFormError('Cho mình xin tên bạn')
      return
    }
    if (mode === 'delivery' && !location.trim()) {
      setFormError('Cần vị trí giao (tầng, phòng)')
      return
    }
    if (!slotKey) {
      setFormError('Chọn khung nhận hàng')
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
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Đặt hàng thất bại')
    } finally {
      setSubmitting(false)
    }
  }

  function resetAll(): void {
    setCart([])
    setNote('')
    setResult(null)
    setStep('menu')
  }

  if (loadError) {
    return (
      <div className="page">
        <div className="menu-panel error-box">Không tải được thực đơn: {loadError}</div>
      </div>
    )
  }

  if (step === 'done' && result) {
    return (
      <div className="page">
        <div className="menu-panel done-panel">
          <div className="corner tl">❦</div><div className="corner tr">❦</div>
          <div className="corner bl">❦</div><div className="corner br">❦</div>
          <header className="done-head">
            <div className="brand">DUKIN <span>Cafe &amp; Bistro</span></div>
            <p className="quote">« Cà phê là nghệ thuật, DUKIN là chữ ký. »</p>
          </header>
          <h2 className="done-title">Đã ghi nhận đơn #{String(result.id).padStart(3, '0')}</h2>
          <p className="done-sub">Tổng {fmtVnd(result.total)}. Chủ quán sẽ xác nhận trên Teams của nhóm.</p>
          {result.qrUrl && (
            <div className="qr-box">
              <img src={result.qrUrl} alt="Mã chuyển khoản" width={260} height={260} />
              <p>Quét mã để chuyển khoản, nội dung chuyển khoản đã ghi sẵn trong mã.</p>
            </div>
          )}
          {payment === 'cash' && <p className="done-sub">Bạn trả tiền mặt khi nhận hàng.</p>}
          {zaloLink && (
            <p className="done-sub">
              Cần đổi đơn? Nhắn Zalo:{' '}
              <a href={zaloLink} target="_blank" rel="noreferrer">{zaloLink}</a>
            </p>
          )}
          <button className="btn-primary" onClick={resetAll}>Đặt thêm</button>
        </div>
      </div>
    )
  }

  if (step === 'form') {
    return (
      <div className="page">
        <div className="menu-panel">
          <div className="corner tl">❦</div><div className="corner tr">❦</div>
          <div className="corner bl">❦</div><div className="corner br">❦</div>
          <header className="form-head">
            <div className="brand">DUKIN <span>Cafe &amp; Bistro</span></div>
            <p className="quote">« Chậm một nhịp, đậm một đời. »</p>
          </header>

          <section className="cart-review">
            {cart.map((l) => {
              const item = itemsById.get(l.itemId)!
              return (
                <div key={l.key} className="cart-line">
                  <div>
                    <b>{item.name}</b>
                    {optionNames(item, l.optionIds) && <span className="opt"> ({optionNames(item, l.optionIds)})</span>}
                  </div>
                  <div className="cart-line-right">
                    <span>{fmtVnd(linePrice(item, l.optionIds) * l.qty)}</span>
                    <span className="qty-ctrl">
                      <button onClick={() => changeCartQty(l.key, -1)}>−</button>
                      <b>{l.qty}</b>
                      <button onClick={() => changeCartQty(l.key, 1)}>+</button>
                    </span>
                  </div>
                </div>
              )
            })}
            <div className="cart-total-row">Tổng: <b>{fmtVnd(cartTotal)}</b></div>
          </section>

          <section className="form-body">
            <label className="field">
              Tên bạn
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ví dụ: Tuấn" />
            </label>

            <div className="field">Cách nhận hàng
              <div className="chip-row">
                <button className={mode === 'pickup' ? 'chip active' : 'chip'} onClick={() => setMode('pickup')}>Nhận tại quán</button>
                <button className={mode === 'delivery' ? 'chip active' : 'chip'} onClick={() => setMode('delivery')}>Giao tận nơi (miễn phí)</button>
              </div>
            </div>

            {mode === 'delivery' && (
              <label className="field">
                Vị trí giao (tầng, phòng)
                <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Ví dụ: Tầng 3, phòng Dev" />
              </label>
            )}

            <div className="field">Khung nhận hàng
              <div className="slot-list">
                {slots.map((s) => (
                  <button
                    key={`${s.date}|${s.part}`}
                    className={slotKey === `${s.date}|${s.part}` ? 'slot active' : 'slot'}
                    onClick={() => setSlotKey(`${s.date}|${s.part}`)}
                  >
                    {s.label}
                    {s.remaining != null && <span className="remain">còn {s.remaining} chỗ</span>}
                  </button>
                ))}
              </div>
            </div>

            <div className="field">Cách thanh toán
              <div className="chip-row">
                <button className={payment === 'transfer' ? 'chip active' : 'chip'} onClick={() => setPayment('transfer')}>Chuyển khoản (mã QR)</button>
                <button className={payment === 'cash' ? 'chip active' : 'chip'} onClick={() => setPayment('cash')}>Tiền mặt khi nhận</button>
              </div>
            </div>

            <label className="field">
              Ghi chú
              <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="Ít đá, không đường..." />
            </label>

            {formError && <p className="form-error">{formError}</p>}

            <div className="form-actions">
              <button className="btn-ghost" onClick={() => setStep('menu')}>← Thực đơn</button>
              <button className="btn-primary" disabled={submitting || cart.length === 0} onClick={() => void submit()}>
                {submitting ? 'Đang gửi...' : `Đặt hàng • ${fmtVnd(cartTotal)}`}
              </button>
            </div>
          </section>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="menu-panel">
        <div className="corner tl">❦</div><div className="corner tr">❦</div>
        <div className="corner bl">❦</div><div className="corner br">❦</div>

        <header className="menu-head">
          <div className="brand">DUKIN <span>Cafe &amp; Bistro</span></div>
          <div className="tagline">~ L'Art du Café ~</div>
          <div className="divider">☕</div>
        </header>

        <p className="quote">« Cà phê là nghệ thuật, DUKIN là chữ ký. »</p>

        {items.map((item) => {
          const s = sel[item.id] ?? { optionIds: [], qty: 1 }
          const price = linePrice(item, s.optionIds)
          return (
            <div className="item" key={item.id}>
              <div className="item-top">
                <div className="body">
                  <div className="name">{item.name}<span className="fr">{item.nameFr}</span></div>
                  <div className="desc">{item.description}</div>
                </div>
                <span className="price">{fmtVnd(price)}</span>
              </div>
              {item.groups.map((g) => (
                <div className="group" key={g.id}>
                  <span className="group-name">{g.name}{g.required && !g.multiple ? '' : ' (tùy chọn)'}</span>
                  <div className="chip-row">
                    {g.options.map((o) => (
                      <button
                        key={o.id}
                        className={s.optionIds.includes(o.id) ? 'chip active' : 'chip'}
                        onClick={() => toggleOption(item, g.id, o.id, g.multiple)}
                      >
                        {o.name}{o.priceAdd > 0 ? ` +${o.priceAdd / 1000}K` : ''}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              <div className="item-actions">
                <span className="qty-ctrl">
                  <button onClick={() => setItemQty(item.id, -1)}>−</button>
                  <b>{s.qty}</b>
                  <button onClick={() => setItemQty(item.id, 1)}>+</button>
                </span>
                <button className="btn-primary btn-add" onClick={() => addToCart(item.id)}>Thêm vào đơn</button>
              </div>
            </div>
          )
        })}

        <p className="quote mid">« Chậm một nhịp, đậm một đời. »</p>

        <div className="order-note">
          ✦ ĐẶT HÔM TRƯỚC SÁNG HÔM SAU CÓ HÀNG • SÁNG ĐẶT CHIỀU CÓ HÀNG (CHỐT 10:00) ✦
        </div>
      </div>

      {cart.length > 0 && (
        <div className="cart-bar">
          <span>{cartCount} món • {fmtVnd(cartTotal)}</span>
          <button className="btn-primary" onClick={() => setStep('form')}>Đặt hàng →</button>
        </div>
      )}
    </div>
  )
}
