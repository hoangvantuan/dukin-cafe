/** Thông báo nổi ngắn, hiện khi Khách vừa thêm Món vào khay. */
export default function Toast({ message }: { message: string }) {
  return (
    <div className="dukin-toast">
      <span className="toast-icon">✨</span>
      <span>{message}</span>
    </div>
  )
}
