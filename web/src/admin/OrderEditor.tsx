import { useEffect, useState } from 'react'
import { api, fmtVnd, type PlaceOrderBody } from '../api'
import type { AdminOrder, MenuItem, OrderChange } from '../types'

interface DraftLine {
  key: string
  itemId: number
  qty: number
  optionIds: number[]
}

/** Khóa gộp dòng: cùng Món và cùng Tùy chọn thì là một dòng. */
function lineKey(itemId: number, optionIds: number[]): string {
  return `${itemId}:${[...optionIds].sort((a, b) => a - b).join('-')}`
}

function priceOf(menu: MenuItem[], l: DraftLine): number {
  const item = menu.find((m) => m.id === l.itemId)
  if (!item) return 0
  let add = 0
  for (const g of item.groups) for (const o of g.options) if (l.optionIds.includes(o.id)) add += o.priceAdd
  return item.price + add
}

/**
 * Sửa nội dung một Đơn hàng. Không đụng Trạng thái Đơn hàng: việc chuyển trạng
 * thái vẫn là các nút riêng trên thẻ đơn.
 */
export default function OrderEditor({
  order,
  onDone,
  onCancel,
}: {
  order: AdminOrder
  onDone: (changes: OrderChange[]) => void
  onCancel: () => void
}) {
  const [menu, setMenu] = useState<MenuItem[]>([])
  const [name, setName] = useState(order.customerName)
  const [mode, setMode] = useState(order.receiveMode)
  const [location, setLocation] = useState(order.location)
  const [note, setNote] = useState(order.note)
  const [payment, setPayment] = useState(order.paymentMethod)
  const [lines, setLines] = useState<DraftLine[]>(
    order.items
      .filter((i) => i.itemId != null)
      .map((i) => ({
        key: lineKey(i.itemId as number, i.optionIds),
        itemId: i.itemId as number,
        qty: i.qty,
        optionIds: i.optionIds,
      })),
  )
  const [addingId, setAddingId] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    api
      .adminMenu()
      .then((m) => setMenu(m.items))
      .catch((e: Error) => setError(e.message))
  }, [])

  // Món đã xóa khỏi Thực đơn vẫn còn trong đơn cũ; báo để chủ quán biết mà xử lý.
  const missing = lines.filter((l) => !menu.some((m) => m.id === l.itemId))
  const total = lines.reduce((s, l) => s + priceOf(menu, l) * l.qty, 0)

  function bump(key: string, delta: number): void {
    setLines((prev) =>
      prev.map((l) => (l.key === key ? { ...l, qty: Math.max(0, l.qty + delta) } : l)).filter((l) => l.qty > 0),
    )
  }

  function toggleOption(key: string, groupId: number, optionId: number, multiple: boolean): void {
    setLines((prev) =>
      prev.map((l) => {
        if (l.key !== key) return l
        const item = menu.find((m) => m.id === l.itemId)
        const group = item?.groups.find((g) => g.id === groupId)
        if (!group) return l
        const groupIds = group.options.map((o) => o.id)
        const next = multiple
          ? l.optionIds.includes(optionId)
            ? l.optionIds.filter((x) => x !== optionId)
            : [...l.optionIds, optionId]
          : [...l.optionIds.filter((x) => !groupIds.includes(x)), optionId]
        return { ...l, optionIds: next, key: lineKey(l.itemId, next) }
      }),
    )
  }

  function addItem(itemId: number): void {
    const item = menu.find((m) => m.id === itemId)
    if (!item) return
    const defaults = item.groups
      .filter((g) => g.required && !g.multiple)
      .map((g) => g.options[0]?.id)
      .filter((x): x is number => x != null)
    const key = lineKey(itemId, defaults)
    setLines((prev) =>
      prev.some((l) => l.key === key)
        ? prev.map((l) => (l.key === key ? { ...l, qty: l.qty + 1 } : l))
        : [...prev, { key, itemId, qty: 1, optionIds: defaults }],
    )
    setAddingId(null)
  }

  async function save(): Promise<void> {
    setError('')
    if (!name.trim()) return setError('Cần tên khách')
    if (mode === 'delivery' && !location.trim()) return setError('Cần vị trí giao khi chọn giao tận nơi')
    if (lines.length === 0) return setError('Đơn phải còn ít nhất một món')
    const body: PlaceOrderBody = {
      customerName: name.trim(),
      receiveMode: mode,
      location: mode === 'delivery' ? location.trim() : '',
      note: note.trim(),
      paymentMethod: payment,
      items: lines.map((l) => ({ itemId: l.itemId, qty: l.qty, optionIds: l.optionIds })),
    }
    setBusy(true)
    try {
      const r = await api.editOrder(order.id, body)
      onDone(r.changes)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sửa đơn thất bại')
    } finally {
      setBusy(false)
    }
  }

  const paidWarning = order.status === 'paid' || order.status === 'done'

  return (
    <div className="order-editor">
      <div className="panel-head">
        <h3>Sửa đơn {order.code}</h3>
        <span className="panel-sub">
          Sửa xong Bot DUKIN trả lời vào đúng luồng của đơn trên Teams, nêu rõ trước và sau.
        </span>
      </div>

      {paidWarning && (
        <div className="edit-warning">
          ⚠️ Đơn này đã {order.status === 'paid' ? 'thu tiền' : 'hoàn tất'}. Đổi món sẽ làm lệch số tiền
          đã nhận, nhớ thu thêm hoặc trả lại cho khách.
        </div>
      )}

      <div className="manual-form-grid">
        <div className="field-block">
          <label>Tên khách *</label>
          <input className="admin-input" value={name} onChange={(e) => setName(e.target.value)} />
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
            <input className="admin-input" value={location} onChange={(e) => setLocation(e.target.value)} />
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
          <input className="admin-input" value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
      </div>

      <div className="manual-items-selector">
        <label className="section-label">Món trong đơn:</label>

        {missing.length > 0 && (
          <div className="edit-warning">
            ⚠️ Đơn có món đã bị xóa khỏi Thực đơn. Bấm trừ để bỏ món đó ra rồi chọn món khác thay.
          </div>
        )}

        <div className="edit-line-list">
          {lines.map((l) => {
            const item = menu.find((m) => m.id === l.itemId)
            return (
              <div key={l.key} className="edit-line">
                <div className="edit-line-top">
                  <div className="sel-item-name">
                    <b>{item?.name ?? `Món đã xóa (mã ${l.itemId})`}</b>
                    <span className="sel-price">{fmtVnd(priceOf(menu, l) * l.qty)}</span>
                  </div>
                  <div className="admin-stepper">
                    <button type="button" onClick={() => bump(l.key, -1)}>
                      −
                    </button>
                    <span className="val">{l.qty}</span>
                    <button type="button" onClick={() => bump(l.key, 1)}>
                      +
                    </button>
                  </div>
                </div>

                {item?.groups.map((g) => (
                  <div className="option-chip-wrap edit-options" key={g.id}>
                    <span className="edit-group-name">{g.name}</span>
                    {g.options.map((o) => (
                      <button
                        key={o.id}
                        type="button"
                        className={`option-chip ${l.optionIds.includes(o.id) ? 'active' : ''}`}
                        onClick={() => toggleOption(l.key, g.id, o.id, g.multiple)}
                      >
                        {o.name}
                        {o.priceAdd > 0 && <span className="chip-addon">+{fmtVnd(o.priceAdd)}</span>}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            )
          })}
          {lines.length === 0 && <p className="muted picker-hint">Đơn chưa còn món nào, thêm món bên dưới.</p>}
        </div>

        <div className="edit-add-row">
          <select
            className="admin-select"
            value={addingId ?? ''}
            onChange={(e) => e.target.value && addItem(Number(e.target.value))}
          >
            <option value="">+ Thêm món vào đơn...</option>
            {menu
              .filter((m) => m.active)
              .map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} · {fmtVnd(m.price)}
                </option>
              ))}
          </select>
          <span className="edit-total">
            Tổng mới: <b>{fmtVnd(total)}</b>
            {total !== order.total && <span className="edit-total-old"> (cũ {fmtVnd(order.total)})</span>}
          </span>
        </div>
      </div>

      {error && <div className="admin-error-alert">{error}</div>}

      <div className="panel-actions">
        <button className="btn-admin-light" onClick={onCancel} disabled={busy}>
          Thôi, không sửa
        </button>
        <button className="btn-admin-primary" disabled={busy} onClick={() => void save()}>
          {busy ? 'Đang lưu...' : '✓ Lưu và báo lên Teams'}
        </button>
      </div>
    </div>
  )
}
