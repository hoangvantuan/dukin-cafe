import { fmtVndShort } from '../api'

interface StickyBarProps {
  cartCount: number
  cartTotal: number
  /** Quán còn nhận đơn hôm nay hay đã chạm Trần đơn mỗi ngày. */
  intakeOpen: boolean
  submitting: boolean
  onSubmit: () => void
}

/**
 * Thanh dính đáy: luôn hiện số ly và tổng tiền ở mọi vị trí cuộn, và là nút đặt
 * hàng duy nhất. Thiếu thông tin bắt buộc thì trang tự cuộn tới chỗ còn thiếu.
 */
export default function StickyBar({
  cartCount,
  cartTotal,
  intakeOpen,
  submitting,
  onSubmit,
}: StickyBarProps) {
  const empty = cartCount === 0

  return (
    <aside className="floating-cart-tray">
      <div className="cart-tray-content">
        <div className="cart-tray-left">
          <div className="tray-badge">
            <span className="tray-icon">🛍️</span>
            {!empty && <span className="tray-count">{cartCount}</span>}
          </div>
          <div className="tray-info">
            <div className="tray-label">{cartCount} ly trong khay</div>
            <div className="tray-price">{fmtVndShort(cartTotal)}</div>
          </div>
        </div>
        <button
          type="button"
          className="bistro-btn btn-gold tray-action-btn"
          disabled={submitting || !intakeOpen}
          onClick={onSubmit}
        >
          <span>
            {!intakeOpen ? 'Đã đủ đơn' : submitting ? 'Đang gửi...' : 'Đặt hàng'}
          </span>
          {intakeOpen && !submitting && <span className="tray-arrow">→</span>}
        </button>
      </div>
    </aside>
  )
}
