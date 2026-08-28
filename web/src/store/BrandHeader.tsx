/**
 * Đầu trang thương hiệu của Trang bán, hai dạng: một cho trang đặt hàng,
 * một cho màn hoàn tất.
 */

/** Dạng đầy đủ, dùng ở đầu trang đặt hàng. */
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
