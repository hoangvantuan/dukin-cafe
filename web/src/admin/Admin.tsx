import { useEffect, useState } from 'react'
import { api } from '../api'
import Orders from './Orders'
import MenuEditor from './MenuEditor'
import Customers from './Customers'
import SettingsForm from './SettingsForm'
import './admin.css'

type Tab = 'orders' | 'menu' | 'customers' | 'settings'

const TAB_CONFIG: Record<Tab, { label: string; icon: string }> = {
  orders: { label: 'Đơn hàng', icon: '📋' },
  menu: { label: 'Thực đơn', icon: '☕' },
  customers: { label: 'Danh bạ Khách', icon: '👥' },
  settings: { label: 'Cấu hình', icon: '⚙️' },
}

export default function Admin() {
  const [authed, setAuthed] = useState<boolean | null>(null)
  const [tab, setTab] = useState<Tab>('orders')

  useEffect(() => {
    api.session().then(() => setAuthed(true)).catch(() => setAuthed(false))
  }, [])

  if (authed === null) {
    return (
      <div className="admin-loading-screen">
        <div className="loading-spinner">☕</div>
        <p>Đang kiểm tra phiên làm việc...</p>
      </div>
    )
  }

  if (!authed) {
    return <Login onOk={() => setAuthed(true)} />
  }

  return (
    <div className="admin-layout">
      {/* THANH TOPBAR QUẢN TRỊ */}
      <header className="admin-topbar">
        <div className="admin-brand">
          <span className="brand-logo">☕</span>
          <div>
            <h1 className="admin-brand-name">DUKIN CAFE &amp; BISTRO</h1>
            <span className="admin-brand-tag">Bảng điều khiển Quản lý &amp; Vận hành</span>
          </div>
        </div>

        <div className="admin-top-actions">
          <a href="/dat-hang" target="_blank" rel="noreferrer" className="btn-view-store">
            <span>↗ Xem Trang bán</span>
          </a>
          <button
            className="btn-logout"
            onClick={() => {
              void api.logout().finally(() => setAuthed(false))
            }}
          >
            Đăng xuất
          </button>
        </div>
      </header>

      {/* THANH TABS ĐIỀU HƯỚNG */}
      <nav className="admin-nav-tabs">
        {(Object.keys(TAB_CONFIG) as Tab[]).map((t) => (
          <button
            key={t}
            className={`admin-tab-btn ${tab === t ? 'active' : ''}`}
            onClick={() => setTab(t)}
          >
            <span className="tab-icon">{TAB_CONFIG[t].icon}</span>
            <span className="tab-label">{TAB_CONFIG[t].label}</span>
          </button>
        ))}
      </nav>

      {/* NỘI DUNG TỪNG TAB */}
      <main className="admin-main-content">
        {tab === 'orders' && <Orders />}
        {tab === 'menu' && <MenuEditor />}
        {tab === 'customers' && <Customers />}
        {tab === 'settings' && <SettingsForm />}
      </main>
    </div>
  )
}

function Login({ onOk }: { onOk: () => void }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function go(): Promise<void> {
    setBusy(true)
    setError('')
    try {
      await api.login(password)
      onOk()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Đăng nhập không thành công')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="admin-login-screen">
      <div className="login-card">
        <div className="login-header">
          <div className="login-logo">☕</div>
          <h2>DUKIN CAFE &amp; BISTRO</h2>
          <p>Trang quản trị quán cà phê</p>
        </div>

        <form
          className="login-form"
          onSubmit={(e) => {
            e.preventDefault()
            void go()
          }}
        >
          <div className="login-field">
            <label>Mật khẩu quản trị</label>
            <input
              type="password"
              placeholder="Nhập mật khẩu..."
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
            />
          </div>

          {error && <div className="admin-error-alert">{error}</div>}

          <button className="btn-admin-primary" disabled={busy || !password.trim()}>
            {busy ? 'Đang xác thực...' : 'Đăng nhập vào quầy'}
          </button>
        </form>
      </div>
    </div>
  )
}

