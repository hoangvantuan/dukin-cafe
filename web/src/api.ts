import type { AdminOrder, AdminSettings, BrewSheet, Customer, Intake, ItemPayload, MenuItem, OrderChange, OrderStatus, Stats, StatsPeriod, TeamMember } from './types'

async function req<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init)
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null
    throw new Error(body?.error ?? `Lỗi ${res.status}`)
  }
  return (await res.json()) as T
}

const POST = { method: 'POST', headers: { 'content-type': 'application/json' } } as const

export interface PlaceOrderBody {
  customerName: string
  receiveMode: 'pickup' | 'delivery'
  location?: string
  note?: string
  paymentMethod: 'transfer' | 'cash'
  items: Array<{ itemId: number; qty: number; optionIds: number[] }>
}

export const api = {
  menu: () => req<{ items: MenuItem[] }>('/api/menu'),
  intake: () => req<Intake>('/api/intake'),
  publicConfig: () => req<{ zaloLink: string }>('/api/public-config'),
  placeOrder: (body: PlaceOrderBody) =>
    req<{ id: number; total: number; qrUrl: string | null }>('/api/orders', {
      ...POST,
      body: JSON.stringify(body),
    }),

  login: (password: string) =>
    req<{ ok: true }>('/api/admin/login', { ...POST, body: JSON.stringify({ password }) }),
  logout: () => req<{ ok: true }>('/api/admin/logout', { method: 'POST' }),
  session: () => req<{ ok: true }>('/api/admin/session'),

  orders: (scope: 'pending' | 'date', date: string) =>
    req<{ date: string; scope: string; orders: AdminOrder[] }>(
      `/api/admin/orders?scope=${scope}&date=${date}`,
    ),
  pendingCount: () => req<{ pending: number; fresh: number }>('/api/admin/orders/pending-count'),
  brewSheet: () => req<BrewSheet>('/api/admin/brew-sheet'),
  patchOrder: (id: number, status: OrderStatus) =>
    req<AdminOrder>(`/api/admin/orders/${id}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ status }) }),
  editOrder: (id: number, body: PlaceOrderBody) =>
    req<AdminOrder & { changes: OrderChange[] }>(`/api/admin/orders/${id}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    }),
  createManualOrder: (body: PlaceOrderBody) =>
    req<{ id: number; total: number; qrUrl: string | null }>('/api/admin/orders', {
      ...POST,
      body: JSON.stringify(body),
    }),
  adminIntake: () => req<Intake>('/api/admin/intake'),
  teamMembers: () => req<{ members: TeamMember[] }>('/api/admin/teams/members'),
  stats: (period: StatsPeriod, span?: number) =>
    req<Stats>(`/api/admin/stats?period=${period}${span ? `&span=${span}` : ''}`),

  adminMenu: () => req<{ items: MenuItem[] }>('/api/admin/menu'),
  saveItem: (item: ItemPayload, id?: number) =>
    req<{ id?: number; ok?: boolean }>(id ? `/api/admin/menu/${id}` : '/api/admin/menu', {
      method: id ? 'PUT' : 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ item }),
    }),
  deleteItem: (id: number) => req<{ ok: true }>(`/api/admin/menu/${id}`, { method: 'DELETE' }),

  settings: () => req<{ settings: AdminSettings }>('/api/admin/settings'),
  saveSettings: (settings: AdminSettings) =>
    req<{ ok: true }>('/api/admin/settings', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ settings }) }),

  customers: () => req<{ customers: Customer[] }>('/api/admin/customers'),
  saveCustomer: (name: string, teamsId: string) =>
    req<{ ok: true }>('/api/admin/customers', { ...POST, body: JSON.stringify({ name, teamsId }) }),
  deleteCustomer: (id: number) => req<{ ok: true }>(`/api/admin/customers/${id}`, { method: 'DELETE' }),
}

/**
 * Tiền dạng đầy đủ: 20000 thành "20.000đ".
 * Dùng cho Trang quản lý và mọi chỗ Khách phải đối chiếu với số tiền chuyển khoản.
 */
export function fmtVnd(n: number): string {
  return `${n.toLocaleString('vi-VN')}đ`
}

/**
 * Tiền dạng viết tắt như tờ thực đơn in: 20000 thành "20K", 5000 thành "5K".
 * Chỉ dùng cho Trang bán. Giá lẻ vẫn ghi đúng số: 12500 thành "12,5K".
 * Dưới một nghìn thì viết tắt hóa khó đọc nên trả về dạng đầy đủ.
 */
export function fmtVndShort(n: number): string {
  if (n < 1000) return fmtVnd(n)
  return `${(n / 1000).toLocaleString('vi-VN', { maximumFractionDigits: 3 })}K`
}

/** Ngày hôm nay theo giờ Việt Nam, dạng YYYY-MM-DD. */
export function vnToday(): string {
  return new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10)
}
