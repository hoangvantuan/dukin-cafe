import { useEffect, useState } from 'react'
import { api } from '../api'
import type { AdminSettings, NotifyRecipient, TeamMember } from '../types'
import { MemberPicker } from './TeamsPicker'

const BANKS: Array<{ code: string; name: string }> = [
  { code: 'ACB', name: 'ACB (Ngân hàng Á Châu)' },
  { code: 'BIDV', name: 'BIDV (Đầu tư & Phát triển VN)' },
  { code: 'VCB', name: 'Vietcombank (Ngoại thương VN)' },
  { code: 'CTG', name: 'VietinBank (Công thương VN)' },
  { code: 'TCB', name: 'Techcombank (Kỹ thương VN)' },
  { code: 'MB', name: 'MB Bank (Quân đội)' },
  { code: 'VBA', name: 'Agribank (Nông nghiệp VN)' },
  { code: 'TPB', name: 'TPBank (Tiên Phong)' },
  { code: 'VPB', name: 'VPBank (Việt Nam Thịnh Vượng)' },
  { code: 'MSB', name: 'MSB (Hàng Hải)' },
  { code: 'OCB', name: 'OCB (Phương Đông)' },
  { code: 'STB', name: 'Sacombank (Sài Gòn Thương Tín)' },
  { code: 'HDB', name: 'HDBank (Phát triển TP.HCM)' },
  { code: 'VIB', name: 'VIB (Quốc Tế)' },
  { code: 'SHB', name: 'SHB (Sài Gòn - Hà Nội)' },
]

export default function SettingsForm() {
  const [s, setS] = useState<AdminSettings | null>(null)
  const [error, setError] = useState('')
  const [okMsg, setOkMsg] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    api
      .settings()
      .then((r) => setS(r.settings))
      .catch((e: Error) => setError(e.message))
  }, [])

  async function save(): Promise<void> {
    if (!s) return
    setError('')
    setOkMsg('')
    setBusy(true)
    try {
      await api.saveSettings(s)
      const r = await api.settings()
      setS(r.settings)
      setOkMsg('✓ Đã lưu toàn bộ cấu hình hệ thống thành công.')
      setTimeout(() => setOkMsg(''), 3000)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Lưu cấu hình thất bại')
    } finally {
      setBusy(false)
    }
  }

  if (!s) {
    return (
      <div className="admin-loading-screen">
        <p className="muted">{error || 'Đang tải cấu hình hệ thống...'}</p>
      </div>
    )
  }

  const set = (patch: Partial<AdminSettings>): void => setS({ ...s, ...patch })

  return (
    <div className="settings-container">
      {/* CẤU HÌNH TÀI KHOẢN NGÂN HÀNG & VIETQR */}
      <section className="admin-editor-card">
        <div className="editor-head">
          <h3>1. Thanh toán Chuyển khoản (VietQR)</h3>
          <span className="editor-sub">
            Thông tin này dùng để tự động tạo mã QR VietQR có sẵn số tiền và nội dung chuyển khoản trên màn hình hoàn tất đơn
          </span>
        </div>

        <div className="editor-form-grid">
          <div className="field-block">
            <label>Ngân hàng nhận tiền</label>
            <select
              className="admin-select"
              value={BANKS.some((b) => b.code === s.bankCode) ? s.bankCode : ''}
              onChange={(e) => set({ bankCode: e.target.value })}
            >
              <option value="">Chọn ngân hàng</option>
              {BANKS.map((b) => (
                <option key={b.code} value={b.code}>
                  {b.name}
                </option>
              ))}
              {!BANKS.some((b) => b.code === s.bankCode) && s.bankCode && (
                <option value={s.bankCode}>{s.bankCode}</option>
              )}
            </select>
          </div>

          <div className="field-block">
            <label>Số tài khoản</label>
            <input
              className="admin-input"
              value={s.accountNo}
              onChange={(e) => set({ accountNo: e.target.value })}
              placeholder="Ví dụ: 0987654321"
            />
          </div>

          <div className="field-block">
            <label>Tên chủ tài khoản (in hoa không dấu)</label>
            <input
              className="admin-input"
              value={s.accountName}
              onChange={(e) => set({ accountName: e.target.value.toUpperCase() })}
              placeholder="HOANG VAN TUAN"
            />
          </div>
        </div>
      </section>

      {/* CẤU HÌNH VẬN HÀNH & KÊNH LIÊN HỆ */}
      <section className="admin-editor-card">
        <div className="editor-head">
          <h3>2. Vận hành &amp; Giới hạn Đơn hàng</h3>
          <span className="editor-sub">
            Khách đặt lúc nào cũng được, quán tự liệu lúc nào pha và lúc nào giao. Đặt trần số đơn
            mỗi ngày cho những hôm không kham nổi.
          </span>
        </div>

        <div className="editor-form-grid">
          <div className="field-block">
            <label>Giới hạn đơn mỗi ngày (0 = không giới hạn)</label>
            <input
              className="admin-input"
              value={s.dailyCapacity}
              onChange={(e) => set({ dailyCapacity: e.target.value })}
              inputMode="numeric"
              placeholder="0"
            />
          </div>

          <div className="field-block">
            <label>Đường dẫn Zalo hỗ trợ quán</label>
            <input
              className="admin-input"
              value={s.zaloLink}
              onChange={(e) => set({ zaloLink: e.target.value })}
              placeholder="https://zalo.me/..."
            />
          </div>
        </div>
      </section>

      {/* CẤU HÌNH TÍCH HỢP BOT MICROSOFT TEAMS */}
      <section className="admin-editor-card">
        <div className="editor-head">
          <h3>3. Tích hợp Bot Microsoft Teams (Bot DUKIN)</h3>
          <span className="editor-sub">
            Bot tự động mở luồng thông báo, cập nhật tiến độ đơn hàng và nhắc tên đồng nghiệp trên kênh Teams của công ty
          </span>
        </div>

        <div className="editor-form-grid">
          <div className="field-block">
            <label>Tenant ID (Azure AD)</label>
            <input
              className="admin-input"
              value={s.teamsTenantId}
              onChange={(e) => set({ teamsTenantId: e.target.value })}
            />
          </div>

          <div className="field-block">
            <label>App ID (Client ID)</label>
            <input
              className="admin-input"
              value={s.teamsAppId}
              onChange={(e) => set({ teamsAppId: e.target.value })}
            />
          </div>

          <div className="field-block">
            <label>App Secret (Khóa bí mật)</label>
            <input
              className="admin-input"
              type="password"
              value={s.teamsAppSecret}
              onChange={(e) => set({ teamsAppSecret: e.target.value })}
              placeholder={s.teamsAppSecret === '•••' ? 'Đã lưu (nhập lại nếu muốn đổi)' : 'Nhập secret...'}
            />
          </div>

          <div className="field-block">
            <label>Service URL (Teams Service Endpoint)</label>
            <input
              className="admin-input"
              value={s.teamsServiceUrl}
              onChange={(e) => set({ teamsServiceUrl: e.target.value })}
              placeholder="https://smba.trafficmanager.net/..."
            />
          </div>

          <div className="field-block span-full">
            <label>Mã kênh hội thoại (Conversation ID - Tự động cập nhật khi bot nhận sự kiện)</label>
            <input
              className="admin-input"
              value={s.teamsConvId}
              onChange={(e) => set({ teamsConvId: e.target.value })}
            />
          </div>
        </div>
      </section>

      {/* AI ĐƯỢC BÁO KHI CÓ ĐƠN MỚI */}
      <NotifySection
        recipients={s.notifyRecipients}
        notifyCustomer={s.notifyCustomerOnNew === '1'}
        onChange={(recipients, notifyCustomer) =>
          set({ notifyRecipients: recipients, notifyCustomerOnNew: notifyCustomer ? '1' : '0' })
        }
      />

      {error && <div className="admin-error-alert">{error}</div>}
      {okMsg && <div className="admin-success-alert">{okMsg}</div>}

      <div className="settings-actions-bar">
        <button className="btn-admin-primary btn-large" disabled={busy} onClick={() => void save()}>
          {busy ? 'Đang lưu cấu hình...' : '✓ Lưu toàn bộ cấu hình'}
        </button>
      </div>
    </div>
  )
}


/**
 * Ai được Bot DUKIN nhắc khi có đơn mới. Danh sách này tách khỏi Danh bạ Khách:
 * đây là người phụ trách pha chế và giao hàng, không phải người đặt.
 * Chọn từ danh sách nhóm Teams vì Teams chỉ gắn thẻ được bằng mã 29:...
 */
function NotifySection({
  recipients,
  notifyCustomer,
  onChange,
}: {
  recipients: string
  notifyCustomer: boolean
  onChange: (recipients: string, notifyCustomer: boolean) => void
}) {
  const [picking, setPicking] = useState(false)

  const list: NotifyRecipient[] = (() => {
    try {
      const parsed = JSON.parse(recipients || '[]') as unknown
      return Array.isArray(parsed) ? (parsed as NotifyRecipient[]) : []
    } catch {
      return []
    }
  })()

  const write = (next: NotifyRecipient[]): void => onChange(JSON.stringify(next), notifyCustomer)

  // Bấm một người đang có thì bỏ ra, bấm người chưa có thì thêm vào.
  function toggle(m: TeamMember): void {
    const has = list.some((r) => r.teamsId === m.teamsId)
    write(
      has
        ? list.filter((r) => r.teamsId !== m.teamsId)
        : [...list, { name: m.name, teamsId: m.teamsId, email: m.email }],
    )
  }

  return (
    <section className="admin-editor-card">
      <div className="editor-head">
        <h3>4. Báo cho ai khi có đơn mới</h3>
        <span className="editor-sub">
          Bot DUKIN mở luồng đơn trên kênh Teams và gắn thẻ những người dưới đây. Bấm "Chọn từ nhóm
          Teams" rồi gõ tên hoặc email để tìm.
        </span>
      </div>

      <label className="notify-toggle-row">
        <input
          type="checkbox"
          checked={notifyCustomer}
          onChange={(e) => onChange(recipients, e.target.checked)}
        />
        <span>
          <b>Nhắc luôn Khách đặt đơn</b>
          <small>Chỉ nhắc được khi Khách đã liên kết tài khoản Teams trong tab Danh bạ Khách</small>
        </span>
      </label>

      <div className="picked-chips">
        {list.map((r) => (
          <span key={r.teamsId} className="person-chip">
            <span className="chip-who">
              <b>{r.name}</b>
              {r.email && <small>{r.email}</small>}
            </span>
            <button
              className="chip-remove"
              title="Bỏ người này"
              onClick={() => write(list.filter((x) => x.teamsId !== r.teamsId))}
            >
              ✕
            </button>
          </span>
        ))}
        {list.length === 0 && (
          <p className="muted picker-hint">
            Chưa chọn ai. Bot vẫn mở luồng đơn trên kênh nhưng không gắn thẻ ai cả.
          </p>
        )}
      </div>

      {picking ? (
        <MemberPicker
          mode="many"
          selectedIds={list.map((r) => r.teamsId)}
          onPick={toggle}
          onClose={() => setPicking(false)}
        />
      ) : (
        <div className="editor-actions">
          <button className="btn-admin-light" onClick={() => setPicking(true)}>
            + Chọn từ nhóm Teams
          </button>
        </div>
      )}
    </section>
  )
}
