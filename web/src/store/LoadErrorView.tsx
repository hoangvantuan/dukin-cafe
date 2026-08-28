/** Màn báo lỗi khi không tải được Thực đơn, chỉ có một lối đi tiếp là tải lại. */
export default function LoadErrorView({ message }: { message: string }) {
  return (
    <div className="dukin-viewport">
      <div className="bistro-board error-board">
        <div className="error-icon">☕</div>
        <h2>Không thể tải thực đơn</h2>
        <p className="error-desc">{message}</p>
        <button className="bistro-btn btn-gold" onClick={() => window.location.reload()}>
          Tải lại trang
        </button>
      </div>
    </div>
  )
}
