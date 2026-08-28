/**
 * Đầu trang thương hiệu của Trang bán, ba dạng dùng ở ba màn khác nhau:
 * màn Thực đơn, màn hoàn tất và biểu mẫu đặt hàng.
 */

/** Dạng đầy đủ, dùng ở màn Thực đơn. */
export function MenuBrandHeader() {
  return (
    <header className="brand-header">
      <div className="brand-insignia">DUKIN CAFE &amp; BISTRO</div>
      <h1 className="brand-title">L'Art du Café</h1>
      <div className="brand-divider">
        <span className="divider-line"></span>
        <span className="divider-icon">☕</span>
        <span className="divider-line"></span>
      </div>
      <p className="brand-quote">« Cà phê là nghệ thuật, DUKIN là chữ ký. »</p>
    </header>
  )
}

/** Dạng gọn không có đường phân cách, dùng ở màn hoàn tất. */
export function ReceiptBrandHeader() {
  return (
    <header className="brand-header">
      <span className="brand-sub">DUKIN CAFE &amp; BISTRO</span>
      <h1 className="brand-title">L'Art du Café</h1>
      <p className="brand-quote">« Cà phê là nghệ thuật, DUKIN là chữ ký. »</p>
    </header>
  )
}

/** Dạng thu nhỏ kèm lối quay lại Thực đơn, dùng ở biểu mẫu đặt hàng. */
export function FormBrandHeader({ onBack }: { onBack: () => void }) {
  return (
    <header className="brand-header compact">
      <button className="btn-back-link" onClick={onBack}>
        ← Quay lại thực đơn
      </button>
      <h1 className="brand-title-small">Xác nhận Đơn hàng</h1>
      <p className="brand-quote">« Chậm một nhịp, đậm một đời. »</p>
    </header>
  )
}
