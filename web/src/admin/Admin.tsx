import { useEffect, useState } from 'react'
import { api } from '../api'
import Orders from './Orders'
import MenuEditor from './MenuEditor'
import Customers from './Customers'
import SettingsForm from './SettingsForm'
import './admin.css'

type Tab = 'orders' | 'menu' | 'customers' | 'settings'

const TAB_LABEL: Record<Tab, string> = {
  orders: 'Đơn hàng',
  menu: 'Thực đơn',
  customers: 'Danh bạ',
  settings: 'Cấu hình',
}

export default function Admin() {
  const [authed, setAuthed] = useState<boolean | null>(null)
  const [tab, setTab] = useState<Tab>('orders')

  useEffect(() => {
    api.session().then(() => setAuthed(true)).catch(() => setAuthed(false))
  }, [])

  if (authed === null) {
    return (
      <div className="admin-shell">
        <p className="muted">Đang kiểm tra phiên...</p>
      </div>
    )
  }

  if (!authed) {
    return <Login onOk={() => setAuthed(true)} />
  }

  return (
    <div className="admin-shell">
      <header className="admin-top">
        <h1>DUKIN • Trang quản lý</h1>
        <button
          className="btn-light"
          onClick={() => {
            void api.logout().finally(() => setAuthed(false))
          }}
        >
          Đăng xuất
        </button>
      </header>
      <nav className="admin-tabs">
        {(Object.keys(TAB_LABEL) as Tab[]).map((t) => (
          <button key={t} className={tab === t ? 'tab active' : 'tab'} onClick={() => setTab(t)}>
            {TAB_LABEL[t]}
          </button>
        ))}
      </nav>
      {tab === 'orders' && <Orders />}
      {tab === 'menu' && <MenuEditor />}
      {tab === 'customers' && <Customers />}
      {tab === 'settings' && <SettingsForm />}
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
      setError(e instanceof Error ? e.message : 'Đăng nhập thất bại')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="admin-shell login-shell">
      <form
        className="login-card"
        onSubmit={(e) => {
          e.preventDefault()
          void go()
        }}
      >
        <h1>DUKIN • Trang quản lý</h1>
        <input
          type="password"
          placeholder="Mật khẩu"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoFocus
        />
        {error && <p className="form-error">{error}</p>}
        <button className="btn-dark" disabled={busy}>
          {busy ? 'Đang vào...' : 'Vào'}
        </button>
      </form>
    </div>
  )
}
