import { fmtVndShort } from '../api'
import type { MenuItem } from '../types'
import { linePrice, optionNames, type CartLine } from './cart'

interface LastOrderCardProps {
  lines: CartLine[]
  itemsById: Map<number, MenuItem>
  /** Số Món trong đơn cũ quán không còn bán, đã bỏ khỏi đơn dựng lại. */
  dropped: number
  /** Quán còn nhận đơn hôm nay hay đã chạm Trần đơn mỗi ngày. */
  canAdd: boolean
  onReuse: () => void
}

/**
 * Thẻ Đơn lần trước ở đỉnh trang: ghi rõ đơn cũ gồm Món nào, Tùy chọn nào, giá
 * theo Thực đơn hôm nay, và một lần bấm là khay có sẵn đúng đơn đó.
 */
export default function LastOrderCard({
  lines,
  itemsById,
  dropped,
  canAdd,
  onReuse,
}: LastOrderCardProps) {
  const total = lines.reduce(
    (sum, l) => sum + linePrice(itemsById.get(l.itemId)!, l.optionIds) * l.qty,
    0,
  )

  return (
    <section className="last-order-card">
      <div className="last-order-head">
        <span className="last-order-badge">ĐƠN LẦN TRƯỚC</span>
        <span className="last-order-total">{fmtVndShort(total)}</span>
      </div>

      <ul className="last-order-lines">
        {lines.map((l) => {
          const item = itemsById.get(l.itemId)!
          const opts = optionNames(item, l.optionIds)
          return (
            <li key={l.key} className="last-order-line">
              <span className="last-order-qty">{l.qty} ×</span>
              <span className="last-order-name">
                {item.name}
                {opts && <span className="last-order-opts"> · {opts}</span>}
              </span>
            </li>
          )
        })}
      </ul>

      {dropped > 0 && (
        <p className="last-order-note">
          {dropped} Món trong đơn lần trước quán không còn bán nên đã bỏ khỏi đơn dựng lại.
        </p>
      )}

      <button
        type="button"
        className="bistro-btn btn-gold last-order-btn"
        disabled={!canAdd}
        onClick={onReuse}
      >
        Đặt lại đơn lần trước • {fmtVndShort(total)}
      </button>
    </section>
  )
}
