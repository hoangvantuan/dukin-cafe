import { fmtVndShort } from '../api'
import type { MenuItem } from '../types'
import { linePrice, optionNames, type CartLine } from './cart'

interface CartSummaryProps {
  cart: CartLine[]
  itemsById: Map<number, MenuItem>
  cartCount: number
  cartTotal: number
  onChangeCartQty: (key: string, delta: number) => void
  onRemoveLine: (key: string) => void
}

/** Khay Món đã chọn, sửa số lượng và bỏ Món ngay trên trang. */
export default function CartSummary({
  cart,
  itemsById,
  cartCount,
  cartTotal,
  onChangeCartQty,
  onRemoveLine,
}: CartSummaryProps) {
  return (
    <div className="cart-summary-card">
      <div className="card-header">
        <span className="card-title">Món đã chọn</span>
        <span className="card-count">{cartCount} ly</span>
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
                <span className="cart-item-price">{fmtVndShort(linePrice(item, l.optionIds) * l.qty)}</span>
                <div className="bistro-stepper mini">
                  <button type="button" onClick={() => onChangeCartQty(l.key, -1)} aria-label="Giảm">
                    −
                  </button>
                  <span className="step-val">{l.qty}</span>
                  <button type="button" onClick={() => onChangeCartQty(l.key, 1)} aria-label="Tăng">
                    +
                  </button>
                </div>
                <button
                  type="button"
                  className="cart-item-remove"
                  aria-label={`Bỏ ${item.name} khỏi khay`}
                  onClick={() => onRemoveLine(l.key)}
                >
                  ✕
                </button>
              </div>
            </div>
          )
        })}
      </div>
      <div className="cart-summary-total">
        <span>Tổng cộng</span>
        <span className="total-gold">{fmtVndShort(cartTotal)}</span>
      </div>
    </div>
  )
}
