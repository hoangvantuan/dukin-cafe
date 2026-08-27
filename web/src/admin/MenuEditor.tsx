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
      setError('Giá phải là số nguyên không âm')
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
      setError(e instanceof Error ? e.message : 'Lưu thất bại')
    }
  }

  async function remove(id: number): Promise<void> {
    if (!window.confirm('Xóa món này khỏi thực đơn?')) return
    try {
      await api.deleteItem(id)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Xóa thất bại')
    }
  }

  if (draft) {
    return (
      <div className="edit-card">
        <h3>{editingId ? 'Sửa món' : 'Thêm món mới'}</h3>
        <div className="manual-grid">
          <label>
            Tên <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          </label>
          <label>
            Tên Pháp <input value={draft.nameFr} onChange={(e) => setDraft({ ...draft, nameFr: e.target.value })} />
          </label>
          <label>
            Giá (đ) <input value={draft.price} onChange={(e) => setDraft({ ...draft, price: e.target.value })} inputMode="numeric" />
          </label>
          <label>
            Thứ tự <input value={draft.sort} onChange={(e) => setDraft({ ...draft, sort: e.target.value })} inputMode="numeric" />
          </label>
          <label className="span2">
            Mô tả <input value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
          </label>
          <label className="check">
            <input type="checkbox" checked={draft.active} onChange={(e) => setDraft({ ...draft, active: e.target.checked })} />
            Còn bán
          </label>
        </div>

        <h4>Nhóm tùy chọn</h4>
        {draft.groups.map((g, gi) => (
          <div className="group-edit" key={gi}>
            <div className="group-edit-head">
              <input
                value={g.name}
                onChange={(e) => {
                  const groups = [...draft.groups]
                  groups[gi] = { ...g, name: e.target.value }
                  setDraft({ ...draft, groups })
                }}
                placeholder="Tên nhóm (Kích cỡ, Đá...)"
              />
              <label className="check">
                <input
                  type="checkbox"
                  checked={g.required}
                  onChange={(e) => {
                    const groups = [...draft.groups]
                    groups[gi] = { ...g, required: e.target.checked }
                    setDraft({ ...draft, groups })
                  }}
                />
                Bắt buộc
              </label>
              <label className="check">
                <input
                  type="checkbox"
                  checked={g.multiple}
                  onChange={(e) => {
                    const groups = [...draft.groups]
                    groups[gi] = { ...g, multiple: e.target.checked }
                    setDraft({ ...draft, groups })
                  }}
                />
                Chọn nhiều
              </label>
              <button
                className="btn-danger"
                onClick={() => setDraft({ ...draft, groups: draft.groups.filter((_, i) => i !== gi) })}
              >
                Xóa nhóm
              </button>
            </div>
            {g.options.map((o, oi) => (
              <div className="option-edit" key={oi}>
                <input
                  value={o.name}
                  onChange={(e) => {
                    const groups = [...draft.groups]
                    const options = [...g.options]
                    options[oi] = { ...o, name: e.target.value }
                    groups[gi] = { ...g, options }
                    setDraft({ ...draft, groups })
                  }}
                  placeholder="Tên lựa chọn"
                />
                <input
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
                  className="btn-light"
                  onClick={() => {
                    const groups = [...draft.groups]
                    groups[gi] = { ...g, options: g.options.filter((_, i) => i !== oi) }
                    setDraft({ ...draft, groups })
                  }}
                >
                  ×
                </button>
              </div>
            ))}
            <button
              className="btn-light"
              onClick={() => {
                const groups = [...draft.groups]
                groups[gi] = { ...g, options: [...g.options, { name: '', priceAdd: '0' }] }
                setDraft({ ...draft, groups })
              }}
            >
              + Lựa chọn
            </button>
          </div>
        ))}
        <button
          className="btn-light"
          onClick={() => setDraft({ ...draft, groups: [...draft.groups, { name: '', required: true, multiple: false, options: [{ name: '', priceAdd: '0' }] }] })}
        >
          + Nhóm tùy chọn
        </button>

        {error && <p className="form-error">{error}</p>}
        <div className="form-actions">
          <button
            className="btn-light"
            onClick={() => {
              setDraft(null)
              setEditingId(null)
            }}
          >
            Hủy
          </button>
          <button className="btn-dark" onClick={() => void save()}>
            Lưu
          </button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="toolbar">
        <button
          className="btn-dark"
          onClick={() => {
            setDraft(emptyDraft())
            setEditingId(null)
          }}
        >
          + Thêm món
        </button>
        {saved && <span className="ok-msg">Đã lưu.</span>}
      </div>
      {error && <p className="form-error">{error}</p>}
      <table className="admin-table">
        <thead>
          <tr>
            <th>Món</th>
            <th>Tên Pháp</th>
            <th>Giá</th>
            <th>Nhóm tùy chọn</th>
            <th>Trạng thái</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {items.map((i) => (
            <tr key={i.id}>
              <td>{i.name}</td>
              <td className="muted">{i.nameFr}</td>
              <td>{fmtVnd(i.price)}</td>
              <td className="muted">{i.groups.map((g) => g.name).join(', ') || '−'}</td>
              <td>{i.active ? 'Còn bán' : 'Đã ẩn'}</td>
              <td className="row-actions">
                <button
                  className="btn-light"
                  onClick={() => {
                    setDraft(toDraft(i))
                    setEditingId(i.id)
                  }}
                >
                  Sửa
                </button>
                <button className="btn-danger" onClick={() => void remove(i.id)}>
                  Xóa
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
