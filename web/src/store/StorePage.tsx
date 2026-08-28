import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import type { Intake } from '../types'
import { MenuBrandHeader } from './BrandHeader'

interface StorePageProps {
  intake: Intake
  /** Tên Người pha lấy từ Cấu hình; rỗng thì cuối trang không có mục đó. */
  brewers: string[]
  children: ReactNode
}

/**
 * Khung giấy da của Trang bán: hoa văn, đầu trang thương hiệu, tình hình nhận đơn
 * hôm nay và chân trang. Mọi phần đặt hàng nằm gọn bên trong, cùng một trang cuộn.
 */
export default function StorePage({ intake, brewers, children }: StorePageProps) {
  return (
    <div className="bistro-board">
      {/* Họa tiết trang trí góc cổ điển */}
      <div className="gold-ornament top-ornament">✦ ❦ ✦</div>

      <MenuBrandHeader />

      {/* Tình hình nhận đơn hôm nay */}
      <div className={`schedule-banner ${intake.open ? '' : 'closed'}`}>
        <div className="schedule-badge">{intake.open ? 'ĐANG NHẬN ĐƠN' : 'TẠM NGƯNG'}</div>
        <div className="schedule-text">
          {intake.open
            ? `✦ Cứ đặt, quán pha xong sẽ báo bạn${
                intake.remaining != null ? ` • hôm nay còn nhận ${intake.remaining} đơn` : ''
              } ✦`
            : '✦ Hôm nay quán đã nhận đủ đơn nên tạm ngưng nhận, hẹn bạn ngày mai ✦'}
        </div>
      </div>

      {children}

      <div className="menu-closing-quote">« Chậm một nhịp, đậm một đời. »</div>

      <footer className="bistro-footer">
        <div className="footer-tagline">DUKIN CAFE &amp; BISTRO · L'ART DU CAFÉ</div>
        <div className="footer-sub">
          Phục vụ nội bộ đồng nghiệp · Chăm chút từng giọt cà phê phin thủ công
        </div>

        {/* Chưa ai đồng ý công khai tên thì mục này không hiện, không để chỗ trống. */}
        {brewers.length > 0 && (
          <div className="footer-brewers">
            <div className="footer-brewers-label">Người pha</div>
            <div className="footer-brewers-names">{brewers.join(' · ')}</div>
          </div>
        )}

        <nav className="footer-legal">
          <Link to="/quyen-rieng-tu">Quyền riêng tư</Link>
          <span className="footer-legal-sep" aria-hidden="true">
            ·
          </span>
          <Link to="/dieu-khoan-su-dung">Điều khoản sử dụng</Link>
        </nav>
      </footer>

      <div className="gold-ornament bottom-ornament">✦ ❦ ✦</div>
    </div>
  )
}
