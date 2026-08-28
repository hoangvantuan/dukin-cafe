import { fmtVndShort } from '../api'
import type { MenuItem } from '../types'
import { linePrice, optionNames, type CartLine } from './cart'

interface CartSummaryProps {
  cart: CartLine[]
  itemsById: Map<number, MenuItem>
  cartCount: number
  cartTotal: number
  onChangeCartQty: (key: string, delta: number) => void
}

/** Danh sách Món trong khay kèm nút tăng giảm và tổng tiền, đặt trên biểu mẫu. */
export default function CartSummary({
  cart,
  itemsById,
  cartCount,
  cartTotal,
  onChangeCartQty,
}: CartSummaryProps) {
  return (
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
                <span className="cart-item-price">{fmtVndShort(linePrice(item, l.optionIds) * l.qty)}</span>
                <div className="bistro-stepper mini">
                  <button onClick={() => onChangeCartQty(l.key, -1)} aria-label="Giảm">
                    −
                  </button>
                  <span className="step-val">{l.qty}</span>
                  <button onClick={() => onChangeCartQty(l.key, 1)} aria-label="Tăng">
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
        <span className="total-gold">{fmtVndShort(cartTotal)}</span>
      </div>
    </section>
  )
}
