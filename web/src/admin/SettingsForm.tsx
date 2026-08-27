import { useEffect, useState } from 'react'
import { api } from '../api'
import type { AdminSettings } from '../types'

const BANKS: Array<{ code: string; name: string }> = [
  { code: 'ACB', name: 'ACB' },
  { code: 'BIDV', name: 'BIDV' },
  { code: 'VCB', name: 'Vietcombank' },
  { code: 'CTG', name: 'VietinBank' },
  { code: 'TCB', name: 'Techcombank' },
  { code: 'MB', name: 'MB Bank' },
  { code: 'VBA', name: 'Agribank' },
  { code: 'TPB', name: 'TPBank' },
  { code: 'VPB', name: 'VPBank' },
  { code: 'MSB', name: 'MSB' },
  { code: 'OCB', name: 'OCB' },
  { code: 'STB', name: 'Sacombank' },
  { code: 'HDB', name: 'HDBank' },
  { code: 'VIB', name: 'VIB' },
  { code: 'SHB', name: 'SHB' },
]

export default function SettingsForm() {
  const [s, setS] = useState<AdminSettings | null>(null)
  const [error, setError] = useState('')
  const [okMsg, setOkMsg] = useState('')

  useEffect(() => {
    api.settings().then((r) => setS(r.settings)).catch((e: Error) => setError(e.message))
  }, [])

  async function save(): Promise<void> {
    if (!s) return
    setError('')
    setOkMsg('')
    try {
      await api.saveSettings(s)
      const r = await api.settings()
      setS(r.settings)
      setOkMsg('Đã lưu.')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Lưu thất bại')
    }
  }

  if (!s) {
    return <p className="muted">{error || 'Đang tải cấu hình...'}</p>
  }

  const set = (patch: Partial<AdminSettings>): void => setS({ ...s, ...patch })

  return (
    <div className="settings-grid">
      <section className="manual-card">
        <h3>Thanh toán chuyển khoản</h3>
        <p className="muted small">Mã QR VietQR sinh từ thông tin này, hiển thị khi khách chọn chuyển khoản.</p>
        <div className="manual-grid">
          <label>
            Ngân hàng{' '}
            <select value={BANKS.some((b) => b.code === s.bankCode) ? s.bankCode : ''} onChange={(e) => set({ bankCode: e.target.value })}>
              <option value="">Chọn ngân hàng</option>
              {BANKS.map((b) => (
                <option key={b.code} value={b.code}>{b.name}</option>
              ))}
              {!BANKS.some((b) => b.code === s.bankCode) && s.bankCode && (
                <option value={s.bankCode}>{s.bankCode}</option>
              )}
            </select>
          </label>
          <label>
            Số tài khoản <input value={s.accountNo} onChange={(e) => set({ accountNo: e.target.value })} />
          </label>
          <label>
            Tên chủ tài khoản <input value={s.accountName} onChange={(e) => set({ accountName: e.target.value })} />
          </label>
        </div>
      </section>

      <section className="manual-card">
        <h3>Bán hàng</h3>
        <div className="manual-grid">
          <label>
            Giới hạn đơn mỗi khung (0 là không giới hạn){' '}
            <input value={s.slotCapacity} onChange={(e) => set({ slotCapacity: e.target.value })} inputMode="numeric" />
          </label>
          <label>
            Link Zalo <input value={s.zaloLink} onChange={(e) => set({ zaloLink: e.target.value })} placeholder="https://zalo.me/..." />
          </label>
        </div>
      </section>

      <section className="manual-card">
        <h3>Bot Teams (Bot DUKIN)</h3>
        <p className="muted small">
          Đăng ký ứng dụng trong Azure AD, mở kênh Bot, messaging endpoint đặt{' '}
          <code>https://tên-miền/api/teams/events?secret=khóa-biết-mật</code>. Cài bot vào nhóm Teams một lần,
          mã kênh tự điền.
        </p>
        <div className="manual-grid">
          <label>
            Tenant ID <input value={s.teamsTenantId} onChange={(e) => set({ teamsTenantId: e.target.value })} />
          </label>
          <label>
            App ID <input value={s.teamsAppId} onChange={(e) => set({ teamsAppId: e.target.value })} />
          </label>
          <label>
            App Secret{' '}
            <input
              value={s.teamsAppSecret}
              onChange={(e) => set({ teamsAppSecret: e.target.value })}
              placeholder={s.teamsAppSecret === '•••' ? 'Đã lưu, nhập lại nếu đổi' : 'nhập khóa'}
            />
          </label>
          <label>
            Service URL <input value={s.teamsServiceUrl} onChange={(e) => set({ teamsServiceUrl: e.target.value })} />
          </label>
          <label className="span2">
            Mã kênh conversation (tự điền khi cài bot){' '}
            <input value={s.teamsConvId} onChange={(e) => set({ teamsConvId: e.target.value })} />
          </label>
        </div>
      </section>

      {error && <p className="form-error">{error}</p>}
      <div>
        <button className="btn-dark" onClick={() => void save()}>
          Lưu cấu hình
        </button>{' '}
        {okMsg && <span className="ok-msg">{okMsg}</span>}
      </div>
    </div>
  )
}
