import { fmtVndShort } from '../api'
import type { MenuItem } from '../types'
import { linePrice, type Selection } from './cart'

interface MenuCardProps {
  item: MenuItem
  /** Số hiệu Món trên thực đơn, đã đệm 0 ở đầu như bản in. */
  itemNum: string
  selection: Selection
  onToggleOption: (item: MenuItem, groupId: number, optionId: number, multiple: boolean) => void
  onChangeQty: (itemId: number, delta: number) => void
  onAdd: (itemId: number) => void
}

/** Thẻ một Món: số hiệu, tên, mô tả, giá, nhóm Tùy chọn và nút thêm vào khay. */
export default function MenuCard({
  item,
  itemNum,
  selection,
  onToggleOption,
  onChangeQty,
  onAdd,
}: MenuCardProps) {
  const price = linePrice(item, selection.optionIds)

  return (
    <article className="menu-card">
      <div className="menu-card-top">
        <span className="item-num">{itemNum}</span>
        <h2 className="item-name-vi">
          {item.name}
          {item.nameFr && <span className="item-name-fr">~ {item.nameFr} ~</span>}
        </h2>
        <div className="item-price-tag">{fmtVndShort(price)}</div>
      </div>

      {item.description && <p className="item-description">{item.description}</p>}

      {/* Nhóm tùy chọn */}
      {item.groups.length > 0 && (
        <div className="item-options-section">
          {item.groups.map((g) => (
            <div className="option-group" key={g.id}>
              <div className="option-group-title">
                {g.name}
                <span className="group-hint">
                  {g.required && !g.multiple ? '(bắt buộc)' : '(tùy chọn)'}
                </span>
              </div>
              <div className="option-chip-wrap">
                {g.options.map((o) => {
                  const isChecked = selection.optionIds.includes(o.id)
                  return (
                    <button
                      key={o.id}
                      type="button"
                      className={`option-chip ${isChecked ? 'active' : ''}`}
                      onClick={() => onToggleOption(item, g.id, o.id, g.multiple)}
                    >
                      <span className="chip-name">{o.name}</span>
                      {o.priceAdd > 0 && (
                        <span className="chip-addon">+{fmtVndShort(o.priceAdd)}</span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Thanh điều khiển số lượng và nút Thêm */}
      <div className="item-card-footer">
        <div className="bistro-stepper">
          <button type="button" onClick={() => onChangeQty(item.id, -1)} aria-label="Giảm số lượng">
            −
          </button>
          <span className="step-val">{selection.qty}</span>
          <button type="button" onClick={() => onChangeQty(item.id, 1)} aria-label="Tăng số lượng">
            +
          </button>
        </div>

        <button
          type="button"
          className="bistro-btn btn-gold btn-add-item"
          onClick={() => onAdd(item.id)}
        >
          <span className="btn-icon">☕</span>
          <span>Thêm vào đơn • {fmtVndShort(price * selection.qty)}</span>
        </button>
      </div>
    </article>
  )
}
