import { useEffect, useMemo, useState } from 'react'
import { api, type PlaceOrderBody } from '../api'
import type { Intake, MenuItem } from '../types'
import { linePrice, type CartLine, type PaymentMethod, type ReceiveMode, type Selection } from './cart'
import DoneView from './DoneView'
import MenuList from './MenuList'
import OrderForm from './OrderForm'
import StickyBar from './StickyBar'
import './store.css'

/**
 * Trang bán: giữ toàn bộ trạng thái đặt hàng của Khách và ghép các khối
 * giao diện lại. Mọi phần hiển thị nằm ở các thành phần con.
 */
export default function Store() {
  const [items, setItems] = useState<MenuItem[]>([])
  const [intake, setIntake] = useState<Intake>({ open: true, remaining: null })
  const [zaloLink, setZaloLink] = useState('')
  const [loadError, setLoadError] = useState('')
  const [sel, setSel] = useState<Record<number, Selection>>({})
  const [cart, setCart] = useState<CartLine[]>([])
  const [step, setStep] = useState<'menu' | 'form' | 'done'>('menu')
  const [name, setName] = useState(() => localStorage.getItem('dukin_name') ?? '')
  const [mode, setMode] = useState<ReceiveMode>('pickup')
  const [location, setLocation] = useState(() => localStorage.getItem('dukin_location') ?? '')
  const [payment, setPayment] = useState<PaymentMethod>('transfer')
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [result, setResult] = useState<{ id: number; total: number; qrUrl: string | null } | null>(null)

  useEffect(() => {
    Promise.all([api.menu(), api.intake(), api.publicConfig()])
      .then(([m, i, c]) => {
        setItems(m.items)
        setIntake(i)
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
    const body: PlaceOrderBody = {
      customerName: name.trim(),
      receiveMode: mode,
      location: mode === 'delivery' ? location.trim() : '',
      note: note.trim(),
      paymentMethod: payment,
      items: cart.map((l) => ({ itemId: l.itemId, qty: l.qty, optionIds: l.optionIds })),
    }
    setSubmitting(true)
    try {
      const r = await api.placeOrder(body)
      localStorage.setItem('dukin_name', name.trim())
      if (mode === 'delivery') localStorage.setItem('dukin_location', location.trim())
      // Đơn vừa vào có thể là đơn cuối trong trần ngày, hỏi lại cho lần đặt sau.
      void api.intake().then(setIntake).catch(() => undefined)
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
    void api.intake().then(setIntake).catch(() => undefined)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function openForm(): void {
    setStep('form')
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

      {step === 'done' && result && (
        <DoneView
          result={result}
          name={name}
          mode={mode}
          location={location}
          payment={payment}
          zaloLink={zaloLink}
          onReset={resetAll}
        />
      )}

      {step === 'form' && (
        <OrderForm
          cart={cart}
          itemsById={itemsById}
          cartCount={cartCount}
          cartTotal={cartTotal}
          name={name}
          setName={setName}
          mode={mode}
          setMode={setMode}
          location={location}
          setLocation={setLocation}
          payment={payment}
          setPayment={setPayment}
          note={note}
          setNote={setNote}
          formError={formError}
          submitting={submitting}
          intakeOpen={intake.open}
          onBack={() => setStep('menu')}
          onChangeCartQty={changeCartQty}
          onSubmit={() => void submit()}
        />
      )}

      {step === 'menu' && (
        <MenuList
          items={items}
          sel={sel}
          intake={intake}
          onToggleOption={toggleOption}
          onChangeQty={setItemQty}
          onAdd={addToCart}
        />
      )}

      {step === 'menu' && cart.length > 0 && (
        <StickyBar cartCount={cartCount} cartTotal={cartTotal} onOpenForm={openForm} />
      )}
    </div>
  )
}
