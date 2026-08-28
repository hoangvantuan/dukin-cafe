import { useEffect, useState } from 'react'
import { api } from '../api'
import type { Customer, TeamMember } from '../types'
import { MemberPicker, useTeamMembers } from './TeamsPicker'

/** Danh bạ Khách: tên quen kèm mã người dùng Teams để nhắc trong Luồng Đơn hàng. */
export default function Customers() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [name, setName] = useState('')
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

  // Tải sẵn danh sách nhóm để bảng hiện được tên người đã liên kết, không chỉ mã.
  const { members, load: loadMembers } = useTeamMembers()

  useEffect(() => {
    void load()
    loadMembers()
  }, [loadMembers])

  async function save(): Promise<void> {
    if (!name.trim()) {
      setError('Vui lòng nhập tên khách')
      return
    }
    setError('')
    setOkMsg('')
    try {
      await api.saveCustomer(name.trim(), '')
      setName('')
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

        </div>

        <p className="admin-hint-text">
          💡 Liên kết Khách với tài khoản Teams ở cột bên phải bảng dưới: bấm "Liên kết Teams" rồi gõ
          tên hoặc email để tìm. Bot DUKIN gắn thẻ đúng người này mỗi khi đơn của họ đổi trạng thái.
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
                <th>Tài khoản Teams được gắn thẻ</th>
                <th className="th-actions">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <CustomerRow
                  key={c.id}
                  customer={c}
                  members={members}
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
  members,
  onSave,
  onDelete,
}: {
  customer: Customer
  members: TeamMember[]
  onSave: (teamsId: string) => void
  onDelete: () => void
}) {
  const [picking, setPicking] = useState(false)
  const linked = members.find((m) => m.teamsId === customer.teamsId)
  const hasId = customer.teamsId.length > 0
  // Teams chỉ gắn thẻ được bằng mã 29:...; mã kiểu cũ lưu tay sẽ không nhắc được ai.
  const suspect = hasId && !customer.teamsId.startsWith('29:')

  return (
    <tr>
      <td className="td-name">
        <b>{customer.name}</b>
      </td>
      <td>
        {picking ? (
          <MemberPicker
            mode="one"
            selectedIds={hasId ? [customer.teamsId] : []}
            onPick={(m) => {
              onSave(m.teamsId)
              setPicking(false)
            }}
            onClose={() => setPicking(false)}
          />
        ) : hasId ? (
          <span className="linked-person">
            <span className="chip-who">
              <b>{linked?.name ?? 'Tài khoản ngoài nhóm'}</b>
              <small>{linked?.email ?? customer.teamsId}</small>
            </span>
            {suspect && (
              <span className="teams-badge warn" title="Teams chỉ gắn thẻ được bằng mã 29:...">
                Mã không dùng được
              </span>
            )}
            <button className="btn-admin-light btn-inline" onClick={() => setPicking(true)}>
              Đổi
            </button>
            <button className="btn-admin-light btn-inline" onClick={() => onSave('')}>
              Bỏ liên kết
            </button>
          </span>
        ) : (
          <button className="btn-admin-light btn-inline" onClick={() => setPicking(true)}>
            + Liên kết Teams
          </button>
        )}
      </td>
      <td className="td-actions">
        <button className="btn-table-delete" onClick={onDelete}>
          Xóa
        </button>
      </td>
    </tr>
  )
}
