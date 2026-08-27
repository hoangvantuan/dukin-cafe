import type { AdminOrder, AdminSettings, Customer, ItemPayload, MenuItem, OrderStatus, SlotOffer } from './types'

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
  slotDate: string
  slotPart: string
  paymentMethod: 'transfer' | 'cash'
  items: Array<{ itemId: number; qty: number; optionIds: number[] }>
}

export const api = {
  menu: () => req<{ items: MenuItem[] }>('/api/menu'),
  slots: () => req<{ slots: SlotOffer[] }>('/api/slots'),
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

  orders: (date: string) => req<{ date: string; orders: AdminOrder[] }>(`/api/admin/orders?date=${date}`),
  patchOrder: (id: number, status: OrderStatus) =>
    req<AdminOrder>(`/api/admin/orders/${id}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ status }) }),
  createManualOrder: (body: PlaceOrderBody) =>
    req<{ id: number; total: number; qrUrl: string | null }>('/api/admin/orders', {
      ...POST,
      body: JSON.stringify(body),
    }),
  adminSlots: () => req<{ slots: SlotOffer[] }>('/api/admin/slots'),

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

export function fmtVnd(n: number): string {
  return `${n.toLocaleString('vi-VN')}đ`
}

/** Ngày hôm nay theo giờ Việt Nam, dạng YYYY-MM-DD. */
export function vnToday(): string {
  return new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10)
}
