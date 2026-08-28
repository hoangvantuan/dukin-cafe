import { fmtVnd } from '../api'
import { ReceiptBrandHeader } from './BrandHeader'
import type { PaymentMethod, ReceiveMode } from './cart'

interface DoneViewProps {
  result: { id: number; total: number; qrUrl: string | null }
  name: string
  mode: ReceiveMode
  location: string
  payment: PaymentMethod
  zaloLink: string
  onReset: () => void
}

/** Màn hoàn tất: mã đơn, tóm tắt Đơn hàng, mã VietQR và lối đặt tiếp. */
export default function DoneView({
  result,
  name,
  mode,
  location,
  payment,
  zaloLink,
  onReset,
}: DoneViewProps) {
  return (
    <div className="bistro-board receipt-view">
      <div className="gold-ornament top-ornament">✦ ❦ ✦</div>

      <ReceiptBrandHeader />

      <div className="receipt-badge">
        <span className="badge-ring">✓</span>
        <h2>ĐÃ GHI NHẬN ĐƠN HÀNG</h2>
        <div className="order-number">#{String(result.id).padStart(3, '0')}</div>
      </div>

      <div className="receipt-details">
        <div className="receipt-row">
          <span>Khách đặt:</span>
          <b>{name}</b>
        </div>
        <div className="receipt-row">
          <span>Hình thức:</span>
          <b>{mode === 'delivery' ? `Giao tận nơi (${location})` : 'Nhận tại quán'}</b>
        </div>
        <div className="receipt-row">
          <span>Thanh toán:</span>
          <b>{payment === 'transfer' ? 'Chuyển khoản VietQR' : 'Tiền mặt khi nhận'}</b>
        </div>
        <div className="receipt-row highlight">
          <span>Tổng thanh toán:</span>
          {/* Số tiền phải trả giữ dạng đầy đủ cho khớp mã VietQR và ứng dụng ngân hàng. */}
          <span className="price-big">{fmtVnd(result.total)}</span>
        </div>
      </div>

      {result.qrUrl && (
        <div className="vietqr-section">
          <div className="qr-frame">
            <img src={result.qrUrl} alt="Mã thanh toán VietQR" width={240} height={240} />
          </div>
          <p className="qr-tip">
            Quét mã VietQR bằng ứng dụng ngân hàng để thanh toán. Nội dung chuyển khoản đã được tạo sẵn tự động.
          </p>
        </div>
      )}

      {payment === 'cash' && (
        <div className="cash-tip-box">
          <span className="tip-icon">💵</span>
          <p>Bạn có thể chuẩn bị tiền mặt và thanh toán trực tiếp khi nhận cà phê từ quán.</p>
        </div>
      )}

      <div className="receipt-notice">
        <p>
          Quán pha theo thứ tự đơn về và sẽ báo bạn khi xong, qua luồng thông báo trên Microsoft
          Teams của công ty.
        </p>
        {zaloLink && (
          <p className="zalo-link-row">
            Cần điều chỉnh đơn gấp? Nhắn Zalo:{' '}
            <a href={zaloLink} target="_blank" rel="noreferrer">
              {zaloLink}
            </a>
          </p>
        )}
      </div>

      <div className="receipt-actions">
        <button className="bistro-btn btn-gold" onClick={onReset}>
          + Đặt thêm món khác
        </button>
      </div>

      <div className="gold-ornament bottom-ornament">✦ ❦ ✦</div>
    </div>
  )
}
