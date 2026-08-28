import type { MenuItem } from '../types'
import MenuCard from './MenuCard'
import type { Selection } from './cart'

interface MenuListProps {
  items: MenuItem[]
  /** Tùy chọn và số lượng đang chọn của từng Món, tra theo mã Món. */
  sel: Record<number, Selection>
  /** Quán còn nhận đơn hôm nay; chạm Trần đơn mỗi ngày thì không thêm Món được nữa. */
  canAdd: boolean
  onToggleOption: (item: MenuItem, groupId: number, optionId: number, multiple: boolean) => void
  onChangeQty: (itemId: number, delta: number) => void
  onAdd: (itemId: number) => void
}

/** Danh sách Món trên Trang bán, mỗi Món một thẻ Món. */
export default function MenuList({
  items,
  sel,
  canAdd,
  onToggleOption,
  onChangeQty,
  onAdd,
}: MenuListProps) {
  return (
    <main className="menu-items-flow">
      {items.map((item, index) => (
        <MenuCard
          key={item.id}
          item={item}
          itemNum={String(index + 1).padStart(2, '0')}
          selection={sel[item.id] ?? { optionIds: [], qty: 1 }}
          canAdd={canAdd}
          onToggleOption={onToggleOption}
          onChangeQty={onChangeQty}
          onAdd={onAdd}
        />
      ))}
    </main>
  )
}
