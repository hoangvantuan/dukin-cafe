import { useEffect, useState } from 'react'
import { api } from '../api'
import type { Customer } from '../types'

/** Danh bạ Khách: tên quen kèm mã người dùng Teams để nhắc trong Luồng Đơn hàng. */
export default function Customers() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [name, setName] = useState('')
  const [teamsId, setTeamsId] = useState('')
  const [error, setError] = useState('')
  const [okMsg, setOkMsg] = useState('')

  async function load(): Promise<void> {
    try {
      const r = await api.customers()
      setCustomers(r.customers)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không tải được danh bạ')
    }
  }

  useEffect(() => {
    void load()
  }, [])

  async function save(): Promise<void> {
    if (!name.trim()) {
      setError('Vui lòng nhập tên khách')
      return
    }
    setError('')
    setOkMsg('')
    try {
      await api.saveCustomer(name.trim(), teamsId.trim())
      setName('')
      setTeamsId('')
      setOkMsg('Đã thêm khách vào danh bạ.')
      setTimeout(() => setOkMsg(''), 2500)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Lưu khách thất bại')
    }
  }

  async function updateRow(c: Customer, teamsId: string): Promise<void> {
    await api.saveCustomer(c.name, teamsId).catch((e: Error) => setError(e.message))
    await load()
  }

  async function remove(id: number): Promise<void> {
    if (!window.confirm('Xóa thông tin khách này khỏi danh bạ?')) return
    await api.deleteCustomer(id).catch((e: Error) => setError(e.message))
    await load()
  }

  return (
    <div className="customers-view">
      <div className="admin-editor-card">
        <div className="editor-head">
          <h3>Thêm / Cập nhật Danh bạ Đồng nghiệp</h3>
          <span className="editor-sub">
            Liên kết tên khách với mã tài khoản Microsoft Teams để Bot DUKIN tự động gắn thẻ (tag/mention) khi đổi trạng thái đơn
          </span>
        </div>

        <div className="editor-form-grid">
          <div className="field-block">
            <label>Tên khách quen *</label>
            <input
              className="admin-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ví dụ: Hoàng Tuấn"
            />
          </div>

          <div className="field-block">
            <label>Mã người dùng Microsoft Teams</label>
            <input
              className="admin-input"
              value={teamsId}
              onChange={(e) => setTeamsId(e.target.value)}
              placeholder="8:orgid:..."
            />
          </div>
        </div>

        <p className="admin-hint-text">
          💡 Mã Teams lấy từ hồ sơ Microsoft Teams (mục "Copy user ID") hoặc Azure AD. Bot DUKIN sẽ gắn thẻ tên đồng nghiệp này trên nhóm Teams khi đơn hàng được cập nhật.
        </p>

        {error && <div className="admin-error-alert">{error}</div>}
        {okMsg && <div className="admin-success-alert">{okMsg}</div>}

        <div className="editor-actions">
          <button className="btn-admin-primary" onClick={() => void save()}>
            ✓ Lưu vào danh bạ
          </button>
        </div>
      </div>

      <div className="customers-list-section">
        <h3>Danh sách khách quen ({customers.length})</h3>

        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th style={{ width: '30%' }}>Tên đồng nghiệp</th>
                <th>Mã người dùng Teams</th>
                <th className="th-actions">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <CustomerRow
                  key={c.id}
                  customer={c}
                  onSave={(v) => void updateRow(c, v)}
                  onDelete={() => void remove(c.id)}
                />
              ))}
              {customers.length === 0 && (
                <tr>
                  <td colSpan={3} className="td-empty">
                    Chưa có khách nào trong danh bạ.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function CustomerRow({
  customer,
  onSave,
  onDelete,
}: {
  customer: Customer
  onSave: (teamsId: string) => void
  onDelete: () => void
}) {
  const [value, setValue] = useState(customer.teamsId)
  const dirty = value !== customer.teamsId

  return (
    <tr>
      <td className="td-name">
        <b>{customer.name}</b>
      </td>
      <td>
        <input
          className="admin-input table-inline-input"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="8:orgid:..."
        />
      </td>
      <td className="td-actions">
        {dirty && (
          <button className="btn-table-save" onClick={() => onSave(value)}>
            Lưu
          </button>
        )}
        <button className="btn-table-delete" onClick={onDelete}>
          Xóa
        </button>
      </td>
    </tr>
  )
}

