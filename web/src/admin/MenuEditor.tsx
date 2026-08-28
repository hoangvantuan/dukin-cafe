import { useEffect, useState } from 'react'
import { api, fmtVnd } from '../api'
import type { MenuItem } from '../types'

interface DraftOption {
  name: string
  priceAdd: string
}

interface DraftGroup {
  name: string
  required: boolean
  multiple: boolean
  options: DraftOption[]
}

interface DraftItem {
  name: string
  nameFr: string
  description: string
  price: string
  active: boolean
  sort: string
  groups: DraftGroup[]
}

function toDraft(item: MenuItem): DraftItem {
  return {
    name: item.name,
    nameFr: item.nameFr,
    description: item.description,
    price: String(item.price),
    active: item.active,
    sort: String(item.sort),
    groups: item.groups.map((g) => ({
      name: g.name,
      required: g.required,
      multiple: g.multiple,
      options: g.options.map((o) => ({ name: o.name, priceAdd: String(o.priceAdd) })),
    })),
  }
}

function emptyDraft(): DraftItem {
  return { name: '', nameFr: '', description: '', price: '', active: true, sort: '99', groups: [] }
}

export default function MenuEditor() {
  const [items, setItems] = useState<MenuItem[]>([])
  const [draft, setDraft] = useState<DraftItem | null>(null)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  async function load(): Promise<void> {
    try {
      const r = await api.adminMenu()
      setItems(r.items)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không tải được thực đơn')
    }
  }

  useEffect(() => {
    void load()
  }, [])

  async function save(): Promise<void> {
    if (!draft) return
    setError('')
    setSaved(false)
    const price = Number(draft.price)
    if (!Number.isInteger(price) || price < 0) {
      setError('Giá phải là số nguyên không âm (ví dụ: 25000)')
      return
    }
    const groups = draft.groups.map((g) => ({
      name: g.name,
      required: g.required,
      multiple: g.multiple,
      sort: 0,
      options: g.options.map((o) => ({ name: o.name, priceAdd: Number(o.priceAdd) || 0, sort: 0 })),
    }))
    try {
      await api.saveItem(
        {
          name: draft.name,
          nameFr: draft.nameFr,
          description: draft.description,
          price,
          active: draft.active,
          sort: Number(draft.sort) || 0,
          groups,
        },
        editingId ?? undefined,
      )
      setDraft(null)
      setEditingId(null)
      setSaved(true)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Lưu món thất bại')
    }
  }

  async function remove(id: number): Promise<void> {
    if (!window.confirm('Bạn có chắc muốn xóa món này khỏi thực đơn?')) return
    try {
      await api.deleteItem(id)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Xóa món thất bại')
    }
  }

  if (draft) {
    return (
      <div className="admin-editor-card">
        <div className="editor-head">
          <h3>{editingId ? 'Chỉnh sửa Món ăn' : 'Thêm Món mới vào Thực đơn'}</h3>
          <span className="editor-sub">Thiết lập tên gọi, định giá và các nhóm tùy chọn kèm theo</span>
        </div>

        <div className="editor-form-grid">
          <div className="field-block">
            <label>Tên tiếng Việt *</label>
            <input
              className="admin-input"
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              placeholder="Ví dụ: Đen Huyền Bí"
            />
          </div>

          <div className="field-block">
            <label>Tên tiếng Pháp</label>
            <input
              className="admin-input"
              value={draft.nameFr}
              onChange={(e) => setDraft({ ...draft, nameFr: e.target.value })}
              placeholder="Ví dụ: Le Noir"
            />
          </div>

          <div className="field-block">
            <label>Giá bán (VNĐ) *</label>
            <input
              className="admin-input"
              value={draft.price}
              onChange={(e) => setDraft({ ...draft, price: e.target.value })}
              placeholder="20000"
              inputMode="numeric"
            />
          </div>

          <div className="field-block">
            <label>Thứ tự hiển thị</label>
            <input
              className="admin-input"
              value={draft.sort}
              onChange={(e) => setDraft({ ...draft, sort: e.target.value })}
              placeholder="1, 2, 3..."
              inputMode="numeric"
            />
          </div>

          <div className="field-block span-full">
            <label>Mô tả hương vị / pha chế</label>
            <textarea
              className="admin-textarea"
              rows={2}
              value={draft.description}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              placeholder="Phin nhỏ giọt, đắng thanh hậu ngọt..."
            />
          </div>

          <div className="field-block span-full">
            <label className="admin-checkbox-label">
              <input
                type="checkbox"
                checked={draft.active}
                onChange={(e) => setDraft({ ...draft, active: e.target.checked })}
              />
              <span>Đang mở bán (hiển thị trên trang đặt hàng của khách)</span>
            </label>
          </div>
        </div>

        <div className="options-management-block">
          <div className="options-block-head">
            <h4>Nhóm Tùy chọn (Topping, Size, Đường, Đá...)</h4>
            <button
              type="button"
              className="btn-admin-light"
              onClick={() =>
                setDraft({
                  ...draft,
                  groups: [
                    ...draft.groups,
                    {
                      name: '',
                      required: true,
                      multiple: false,
                      options: [{ name: '', priceAdd: '0' }],
                    },
                  ],
                })
              }
            >
              + Thêm nhóm tùy chọn
            </button>
          </div>

          {draft.groups.map((g, gi) => (
            <div className="group-edit-box" key={gi}>
              <div className="group-edit-row">
                <input
                  className="admin-input group-name-input"
                  value={g.name}
                  onChange={(e) => {
                    const groups = [...draft.groups]
                    groups[gi] = { ...g, name: e.target.value }
                    setDraft({ ...draft, groups })
                  }}
                  placeholder="Tên nhóm (ví dụ: Kích cỡ, Lượng đá...)"
                />

                <label className="admin-checkbox-label">
                  <input
                    type="checkbox"
                    checked={g.required}
                    onChange={(e) => {
                      const groups = [...draft.groups]
                      groups[gi] = { ...g, required: e.target.checked }
                      setDraft({ ...draft, groups })
                    }}
                  />
                  <span>Bắt buộc</span>
                </label>

                <label className="admin-checkbox-label">
                  <input
                    type="checkbox"
                    checked={g.multiple}
                    onChange={(e) => {
                      const groups = [...draft.groups]
                      groups[gi] = { ...g, multiple: e.target.checked }
                      setDraft({ ...draft, groups })
                    }}
                  />
                  <span>Chọn nhiều</span>
                </label>

                <button
                  type="button"
                  className="btn-admin-danger"
                  onClick={() =>
                    setDraft({ ...draft, groups: draft.groups.filter((_, i) => i !== gi) })
                  }
                >
                  ✕ Xóa nhóm
                </button>
              </div>

              <div className="options-list-editor">
                {g.options.map((o, oi) => (
                  <div className="option-row-edit" key={oi}>
                    <input
                      className="admin-input"
                      value={o.name}
                      onChange={(e) => {
                        const groups = [...draft.groups]
                        const options = [...g.options]
                        options[oi] = { ...o, name: e.target.value }
                        groups[gi] = { ...g, options }
                        setDraft({ ...draft, groups })
                      }}
                      placeholder="Tên lựa chọn (ví dụ: Size Lớn)"
                    />
                    <input
                      className="admin-input opt-price-input"
                      value={o.priceAdd}
                      onChange={(e) => {
                        const groups = [...draft.groups]
                        const options = [...g.options]
                        options[oi] = { ...o, priceAdd: e.target.value }
                        groups[gi] = { ...g, options }
                        setDraft({ ...draft, groups })
                      }}
                      placeholder="Cộng thêm (đ)"
                      inputMode="numeric"
                    />
                    <button
                      type="button"
                      className="btn-remove-opt"
                      onClick={() => {
                        const groups = [...draft.groups]
                        groups[gi] = { ...g, options: g.options.filter((_, i) => i !== oi) }
                        setDraft({ ...draft, groups })
                      }}
                    >
                      ✕
                    </button>
                  </div>
                ))}

                <button
                  type="button"
                  className="btn-add-opt-inline"
                  onClick={() => {
                    const groups = [...draft.groups]
                    groups[gi] = { ...g, options: [...g.options, { name: '', priceAdd: '0' }] }
                    setDraft({ ...draft, groups })
                  }}
                >
                  + Thêm lựa chọn con
                </button>
              </div>
            </div>
          ))}
        </div>

        {error && <div className="admin-error-alert">{error}</div>}

        <div className="editor-actions">
          <button
            type="button"
            className="btn-admin-light"
            onClick={() => {
              setDraft(null)
              setEditingId(null)
            }}
          >
            Hủy thao tác
          </button>
          <button type="button" className="btn-admin-primary" onClick={() => void save()}>
            ✓ Lưu món ăn
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="menu-admin-view">
      <div className="menu-top-bar">
        <div>
          <h2>Quản lý Thực đơn</h2>
          <span className="section-sub">Thêm bớt món, cập nhật giá và các tùy chọn món uống</span>
        </div>

        <button
          className="btn-admin-primary"
          onClick={() => {
            setDraft(emptyDraft())
            setEditingId(null)
          }}
        >
          + Thêm món mới
        </button>
      </div>

      {saved && <div className="admin-success-alert">Đã lưu thay đổi vào thực đơn.</div>}
      {error && <div className="admin-error-alert">{error}</div>}

      <div className="admin-table-wrapper">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Món đồ uống</th>
              <th>Tên tiếng Pháp</th>
              <th>Giá bán</th>
              <th>Nhóm tùy chọn</th>
              <th>Trạng thái</th>
              <th className="th-actions">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {items.map((i) => (
              <tr key={i.id} className={!i.active ? 'tr-inactive' : ''}>
                <td className="td-name">
                  <b>{i.name}</b>
                  {i.description && <small className="td-desc">{i.description}</small>}
                </td>
                <td className="td-muted italic">{i.nameFr || '—'}</td>
                <td className="td-price">{fmtVnd(i.price)}</td>
                <td className="td-groups">
                  {i.groups.length > 0 ? (
                    i.groups.map((g) => (
                      <span key={g.id} className="group-tag">
                        {g.name} ({g.options.length})
                      </span>
                    ))
                  ) : (
                    <span className="td-muted">—</span>
                  )}
                </td>
                <td>
                  <span className={`badge-active ${i.active ? 'is-active' : 'is-hidden'}`}>
                    {i.active ? 'Đang bán' : 'Đã ẩn'}
                  </span>
                </td>
                <td className="td-actions">
                  <button
                    className="btn-table-edit"
                    onClick={() => {
                      setDraft(toDraft(i))
                      setEditingId(i.id)
                    }}
                  >
                    Sửa
                  </button>
                  <button className="btn-table-delete" onClick={() => void remove(i.id)}>
                    Xóa
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

