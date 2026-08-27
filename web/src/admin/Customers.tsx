import { useEffect, useState } from 'react'
import { api } from '../api'
import type { Customer } from '../types'

/** Danh bạ Khách: tên quen kèm mã người dùng Teams để nhắc trong Luồng Đơn hàng. */
export default function Customers() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [name, setName] = useState('')
  const [teamsId, setTeamsId] = useState('')
  const [error, setError] = useState('')

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
      setError('Cần tên khách')
      return
    }
    try {
      await api.saveCustomer(name.trim(), teamsId.trim())
      setName('')
      setTeamsId('')
      setError('')
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Lưu thất bại')
    }
  }

  async function updateRow(c: Customer, teamsId: string): Promise<void> {
    await api.saveCustomer(c.name, teamsId).catch((e: Error) => setError(e.message))
    await load()
  }

  async function remove(id: number): Promise<void> {
    await api.deleteCustomer(id).catch((e: Error) => setError(e.message))
    await load()
  }

  return (
    <div>
      <div className="manual-card">
        <h3>Thêm / cập nhật danh bạ</h3>
        <div className="manual-grid">
          <label>
            Tên khách <input value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label>
            Mã người dùng Teams <input value={teamsId} onChange={(e) => setTeamsId(e.target.value)} placeholder="8:orgid:..." />
          </label>
        </div>
        <p className="muted small">
          Mã Teams lấy từ trang hồ sơ Teams (mục "Copy user ID" hoặc tra trong Azure AD). Khách được nhắc tên
          trong Luồng Đơn hàng khi đổi trạng thái.
        </p>
        {error && <p className="form-error">{error}</p>}
        <button className="btn-dark" onClick={() => void save()}>
          Lưu
        </button>
      </div>

      <table className="admin-table">
        <thead>
          <tr>
            <th>Tên</th>
            <th>Mã Teams</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {customers.map((c) => (
            <CustomerRow key={c.id} customer={c} onSave={(v) => void updateRow(c, v)} onDelete={() => void remove(c.id)} />
          ))}
        </tbody>
      </table>
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
      <td>{customer.name}</td>
      <td>
        <input value={value} onChange={(e) => setValue(e.target.value)} placeholder="8:orgid:..." />
      </td>
      <td className="row-actions">
        {dirty && (
          <button className="btn-dark" onClick={() => onSave(value)}>
            Lưu
          </button>
        )}
        <button className="btn-danger" onClick={onDelete}>
          Xóa
        </button>
      </td>
    </tr>
  )
}
