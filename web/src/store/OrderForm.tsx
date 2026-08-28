import { fmtVndShort } from '../api'
import type { MenuItem } from '../types'
import { FormBrandHeader } from './BrandHeader'
import CartSummary from './CartSummary'
import type { CartLine, PaymentMethod, ReceiveMode } from './cart'

interface OrderFormProps {
  cart: CartLine[]
  itemsById: Map<number, MenuItem>
  cartCount: number
  cartTotal: number
  name: string
  setName: (v: string) => void
  mode: ReceiveMode
  setMode: (v: ReceiveMode) => void
  location: string
  setLocation: (v: string) => void
  payment: PaymentMethod
  setPayment: (v: PaymentMethod) => void
  note: string
  setNote: (v: string) => void
  formError: string
  submitting: boolean
  /** Quán còn nhận đơn hôm nay hay đã chạm Trần đơn mỗi ngày. */
  intakeOpen: boolean
  onBack: () => void
  onChangeCartQty: (key: string, delta: number) => void
  onSubmit: () => void
}

/** Biểu mẫu đặt hàng: khay Món, tên Khách, Cách nhận hàng, Cách thanh toán, ghi chú. */
export default function OrderForm({
  cart,
  itemsById,
  cartCount,
  cartTotal,
  name,
  setName,
  mode,
  setMode,
  location,
  setLocation,
  payment,
  setPayment,
  note,
  setNote,
  formError,
  submitting,
  intakeOpen,
  onBack,
  onChangeCartQty,
  onSubmit,
}: OrderFormProps) {
  return (
    <div className="bistro-board form-view">
      <div className="gold-ornament top-ornament">✦ ❦ ✦</div>

      <FormBrandHeader onBack={onBack} />

      <CartSummary
        cart={cart}
        itemsById={itemsById}
        cartCount={cartCount}
        cartTotal={cartTotal}
        onChangeCartQty={onChangeCartQty}
      />

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
          <button type="button" className="bistro-btn btn-ghost" onClick={onBack}>
            ← Chọn thêm món
          </button>
          <button
            type="button"
            className="bistro-btn btn-gold"
            disabled={submitting || cart.length === 0 || !intakeOpen}
            onClick={onSubmit}
          >
            {submitting
              ? 'Đang xử lý...'
              : intakeOpen
                ? `Xác nhận đặt (${fmtVndShort(cartTotal)})`
                : 'Hôm nay quán đã đủ đơn'}
          </button>
        </div>
      </section>

      <div className="gold-ornament bottom-ornament">✦ ❦ ✦</div>
    </div>
  )
}
