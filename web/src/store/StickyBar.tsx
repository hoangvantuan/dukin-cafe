import { fmtVnd } from '../api'

interface StickyBarProps {
  cartCount: number
  cartTotal: number
  onOpenForm: () => void
}

/** Thanh dính đáy màn Thực đơn: số ly trong khay, tổng tiền và lối sang đặt hàng. */
export default function StickyBar({ cartCount, cartTotal, onOpenForm }: StickyBarProps) {
  return (
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
        <button type="button" className="bistro-btn btn-gold tray-action-btn" onClick={onOpenForm}>
          <span>Xem đơn &amp; Đặt hàng</span>
          <span className="tray-arrow">→</span>
        </button>
      </div>
    </aside>
  )
}
