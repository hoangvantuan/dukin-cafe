import type { Intake, MenuItem } from '../types'
import { MenuBrandHeader } from './BrandHeader'
import MenuCard from './MenuCard'
import type { Selection } from './cart'

interface MenuListProps {
  items: MenuItem[]
  /** Tùy chọn và số lượng đang chọn của từng Món, tra theo mã Món. */
  sel: Record<number, Selection>
  intake: Intake
  onToggleOption: (item: MenuItem, groupId: number, optionId: number, multiple: boolean) => void
  onChangeQty: (itemId: number, delta: number) => void
  onAdd: (itemId: number) => void
}

/** Màn Thực đơn: đầu trang thương hiệu, tình hình nhận đơn và danh sách Món. */
export default function MenuList({
  items,
  sel,
  intake,
  onToggleOption,
  onChangeQty,
  onAdd,
}: MenuListProps) {
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
            : '✦ Hôm nay quán đã nhận đủ đơn, hẹn bạn ngày mai ✦'}
        </div>
      </div>

      {/* Danh sách món */}
      <main className="menu-items-flow">
        {items.map((item, index) => (
          <MenuCard
            key={item.id}
            item={item}
            itemNum={String(index + 1).padStart(2, '0')}
            selection={sel[item.id] ?? { optionIds: [], qty: 1 }}
            onToggleOption={onToggleOption}
            onChangeQty={onChangeQty}
            onAdd={onAdd}
          />
        ))}
      </main>

      <div className="menu-closing-quote">« Chậm một nhịp, đậm một đời. »</div>

      <footer className="bistro-footer">
        <div className="footer-tagline">DUKIN CAFE &amp; BISTRO · L'ART DU CAFÉ</div>
        <div className="footer-sub">
          Phục vụ nội bộ đồng nghiệp · Chăm chút từng giọt cà phê phin thủ công
        </div>
      </footer>

      <div className="gold-ornament bottom-ornament">✦ ❦ ✦</div>
    </div>
  )
}
