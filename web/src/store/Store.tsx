import { useEffect, useMemo, useState } from 'react'
import { api, type PlaceOrderBody } from '../api'
import type { Intake, MenuItem } from '../types'
import { linePrice, type CartLine, type PaymentMethod, type ReceiveMode, type Selection } from './cart'
import DoneView from './DoneView'
import LoadErrorView from './LoadErrorView'
import MenuList from './MenuList'
import OrderForm, { type FormErrors } from './OrderForm'
import StickyBar from './StickyBar'
import StorePage from './StorePage'
import Toast from './Toast'
import './store.css'

/**
 * Cuộn tới chỗ còn thiếu rồi đặt con trỏ vào đó. Hoãn một nhịp để phần tử kịp
 * hiện sau khi trạng thái lỗi đổi, chẳng hạn ô báo lỗi gửi đơn.
 */
function focusField(id: string): void {
  window.setTimeout(() => {
    const el = document.getElementById(id)
    if (!el) return
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    if (el instanceof HTMLInputElement) {
      window.setTimeout(() => el.focus({ preventScroll: true }), 400)
    }
  }, 0)
}

/**
 * Trang bán: một trang cuộn liền gồm Thực đơn, khay Món và biểu mẫu nhận hàng,
 * kèm thanh dính đáy. Chỉ màn hoàn tất là màn riêng, để Khách quét mã yên tĩnh.
 */
export default function Store() {
  const [items, setItems] = useState<MenuItem[]>([])
  const [intake, setIntake] = useState<Intake>({ open: true, remaining: null })
  const [zaloLink, setZaloLink] = useState('')
  const [brewers, setBrewers] = useState<string[]>([])
  const [loadError, setLoadError] = useState('')
  const [sel, setSel] = useState<Record<number, Selection>>({})
  const [cart, setCart] = useState<CartLine[]>([])
  const [step, setStep] = useState<'order' | 'done'>('order')
  const [name, setName] = useState(() => localStorage.getItem('dukin_name') ?? '')
  const [mode, setMode] = useState<ReceiveMode>('pickup')
  const [location, setLocation] = useState(() => localStorage.getItem('dukin_location') ?? '')
  const [payment, setPayment] = useState<PaymentMethod>('transfer')
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState<FormErrors>({})
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [result, setResult] = useState<{ id: number; total: number; qrUrl: string | null } | null>(null)

  useEffect(() => {
    Promise.all([api.menu(), api.intake(), api.publicConfig()])
      .then(([m, i, c]) => {
        setItems(m.items)
        setIntake(i)
        setZaloLink(c.zaloLink)
        setBrewers(c.brewers)
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

  /** Khách vừa sửa chỗ nào thì xóa lỗi của chỗ đó, không bắt đọc lại lời nhắc cũ. */
  function clearError(field: keyof FormErrors): void {
    setErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev))
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
    clearError('cart')
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

  function removeLine(key: string): void {
    setCart((prev) => prev.filter((l) => l.key !== key))
  }

  async function submit(): Promise<void> {
    // Thiếu chỗ nào thì báo đúng chỗ đó rồi cuộn tới, không gom lỗi về một nơi.
    if (cart.length === 0) {
      setErrors({ cart: 'Khay còn trống, mời bạn chọn Món ở Thực đơn phía trên.' })
      focusField('dukin-khay')
      return
    }
    if (!name.trim()) {
      setErrors({ name: 'Vui lòng nhập tên của bạn để quán tiện xưng hô.' })
      focusField('dukin-ten')
      return
    }
    if (mode === 'delivery' && !location.trim()) {
      setErrors({ location: 'Vui lòng nhập Vị trí giao để quán mang cà phê tới đúng chỗ.' })
      focusField('dukin-vi-tri')
      return
    }
    setErrors({})
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
      setErrors({ submit: e instanceof Error ? e.message : 'Đặt hàng chưa thành công, vui lòng thử lại.' })
      focusField('dukin-loi-gui')
    } finally {
      setSubmitting(false)
    }
  }

  function resetAll(): void {
    setCart([])
    setNote('')
    setResult(null)
    setErrors({})
    setStep('order')
    void api.intake().then(setIntake).catch(() => undefined)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (loadError) return <LoadErrorView message={loadError} />

  if (step === 'done' && result) {
    return (
      <div className="dukin-viewport">
        <DoneView
          result={result}
          name={name}
          mode={mode}
          location={location}
          payment={payment}
          zaloLink={zaloLink}
          onReset={resetAll}
        />
      </div>
    )
  }

  return (
    <div className="dukin-viewport">
      {toastMessage && <Toast message={toastMessage} />}

      <StorePage intake={intake} brewers={brewers}>
        <MenuList
          items={items}
          sel={sel}
          canAdd={intake.open}
          onToggleOption={toggleOption}
          onChangeQty={setItemQty}
          onAdd={addToCart}
        />
        <OrderForm
          cart={cart}
          itemsById={itemsById}
          cartCount={cartCount}
          cartTotal={cartTotal}
          name={name}
          onNameChange={(v) => {
            setName(v)
            clearError('name')
          }}
          mode={mode}
          onModeChange={setMode}
          location={location}
          onLocationChange={(v) => {
            setLocation(v)
            clearError('location')
          }}
          payment={payment}
          onPaymentChange={setPayment}
          note={note}
          onNoteChange={setNote}
          errors={errors}
          onChangeCartQty={changeCartQty}
          onRemoveLine={removeLine}
        />
      </StorePage>

      <StickyBar
        cartCount={cartCount}
        cartTotal={cartTotal}
        intakeOpen={intake.open}
        submitting={submitting}
        onSubmit={() => void submit()}
      />
    </div>
  )
}
