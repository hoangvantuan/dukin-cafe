import type { MenuItem } from '../types'
import CartSummary from './CartSummary'
import type { CartLine, PaymentMethod, ReceiveMode } from './cart'

/** Lỗi thiếu thông tin, mỗi khóa gắn với đúng một chỗ trên trang. */
export interface FormErrors {
  cart?: string
  name?: string
  location?: string
  submit?: string
}

interface OrderFormProps {
  cart: CartLine[]
  itemsById: Map<number, MenuItem>
  cartCount: number
  cartTotal: number
  name: string
  onNameChange: (v: string) => void
  mode: ReceiveMode
  onModeChange: (v: ReceiveMode) => void
  location: string
  onLocationChange: (v: string) => void
  payment: PaymentMethod
  onPaymentChange: (v: PaymentMethod) => void
  note: string
  onNoteChange: (v: string) => void
  errors: FormErrors
  onChangeCartQty: (key: string, delta: number) => void
  onRemoveLine: (key: string) => void
}

/**
 * Phần đặt hàng nằm ngay dưới Thực đơn trên cùng một trang cuộn: khay Món,
 * tên Khách, Cách nhận hàng, Vị trí giao, Cách thanh toán và ghi chú.
 */
export default function OrderForm({
  cart,
  itemsById,
  cartCount,
  cartTotal,
  name,
  onNameChange,
  mode,
  onModeChange,
  location,
  onLocationChange,
  payment,
  onPaymentChange,
  note,
  onNoteChange,
  errors,
  onChangeCartQty,
  onRemoveLine,
}: OrderFormProps) {
  return (
    <>
      {/* Khay Món: sửa số lượng và bỏ Món ngay tại đây */}
      <section className="order-section" id="dukin-khay">
        <h2 className="section-heading">Khay của bạn</h2>
        {cart.length > 0 ? (
          <CartSummary
            cart={cart}
            itemsById={itemsById}
            cartCount={cartCount}
            cartTotal={cartTotal}
            onChangeCartQty={onChangeCartQty}
            onRemoveLine={onRemoveLine}
          />
        ) : (
          <p className="cart-empty-hint">
            Khay còn trống. Mời bạn chọn Món ở Thực đơn phía trên, chọn xong quay lại đây điền
            thông tin nhận hàng.
          </p>
        )}
        {errors.cart && <p className="field-error">{errors.cart}</p>}
      </section>

      {/* Thông tin nhận hàng */}
      <section className="order-section">
        <h2 className="section-heading">Thông tin nhận hàng</h2>
        <div className="bistro-form-fields">
          {/* Tên khách */}
          <div className="form-group">
            <label className="form-label" htmlFor="dukin-ten">
              Tên của bạn <span className="req">*</span>
            </label>
            <input
              id="dukin-ten"
              type="text"
              className={`bistro-input ${errors.name ? 'has-error' : ''}`}
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              placeholder="Ví dụ: Hoàng Tuấn, Thu Hà..."
            />
            {errors.name && <p className="field-error">{errors.name}</p>}
          </div>

          {/* Cách nhận hàng */}
          <div className="form-group">
            <span className="form-label">Cách nhận hàng</span>
            <div className="mode-toggle-grid">
              <button
                type="button"
                className={`mode-btn ${mode === 'pickup' ? 'active' : ''}`}
                onClick={() => onModeChange('pickup')}
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
                onClick={() => onModeChange('delivery')}
              >
                <span className="mode-icon">🚀</span>
                <span className="mode-text">
                  <b>Giao tận nơi</b>
                  <small>Miễn phí trong công ty</small>
                </span>
              </button>
            </div>
          </div>

          {/* Vị trí giao chỉ hỏi khi Khách chọn Giao tận nơi */}
          {mode === 'delivery' && (
            <div className="form-group">
              <label className="form-label" htmlFor="dukin-vi-tri">
                Vị trí giao <span className="req">*</span>
              </label>
              <input
                id="dukin-vi-tri"
                type="text"
                className={`bistro-input ${errors.location ? 'has-error' : ''}`}
                value={location}
                onChange={(e) => onLocationChange(e.target.value)}
                placeholder="Ví dụ: Tầng 4, Phòng Thiết kế, Bàn 12..."
              />
              {errors.location && <p className="field-error">{errors.location}</p>}
            </div>
          )}

          {/* Cách thanh toán */}
          <div className="form-group">
            <span className="form-label">Cách thanh toán</span>
            <div className="mode-toggle-grid">
              <button
                type="button"
                className={`mode-btn ${payment === 'transfer' ? 'active' : ''}`}
                onClick={() => onPaymentChange('transfer')}
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
                onClick={() => onPaymentChange('cash')}
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
            <label className="form-label" htmlFor="dukin-ghi-chu">
              Ghi chú cho Barista
            </label>
            <textarea
              id="dukin-ghi-chu"
              className="bistro-textarea"
              rows={2}
              value={note}
              onChange={(e) => onNoteChange(e.target.value)}
              placeholder="Ít ngọt, nhiều đá, dùng ly cá nhân, đem ống hút giấy..."
            />
          </div>

          {errors.submit && (
            <p className="field-error form-error-box" id="dukin-loi-gui">
              {errors.submit}
            </p>
          )}

          <p className="form-hint">
            Bấm nút đặt hàng ở thanh cuối màn hình. Đơn hàng là của chính ngày hôm nay, quán tự
            quyết lúc nào pha và lúc nào giao.
          </p>
        </div>
      </section>
    </>
  )
}
