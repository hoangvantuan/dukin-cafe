export interface MenuOption {
  id: number
  name: string
  priceAdd: number
  sort: number
}

export interface MenuGroup {
  id: number
  name: string
  required: boolean
  multiple: boolean
  sort: number
  options: MenuOption[]
}

export interface MenuItem {
  id: number
  name: string
  nameFr: string
  description: string
  price: number
  active: boolean
  sort: number
  groups: MenuGroup[]
}

/** Tình hình nhận đơn hôm nay; remaining là null khi quán không đặt trần. */
export interface Intake {
  open: boolean
  remaining: number | null
}

export type OrderStatus = 'new' | 'confirmed' | 'paid' | 'done' | 'cancelled'

export interface AdminOrderItem {
  name: string
  optionSummary: string
  unitPrice: number
  qty: number
}

export interface AdminOrder {
  id: number
  code: string
  customerName: string
  channel: 'web' | 'zalo'
  receiveMode: 'pickup' | 'delivery'
  location: string
  note: string
  orderDate: string
  paymentMethod: 'transfer' | 'cash'
  status: OrderStatus
  statusLabel: string
  total: number
  createdAt: string
  teamsThread: string
  items: AdminOrderItem[]
}

export interface Customer {
  id: number
  name: string
  teamsId: string
}

export interface AdminSettings {
  bankCode: string
  accountNo: string
  accountName: string
  zaloLink: string
  dailyCapacity: string
  teamsTenantId: string
  teamsAppId: string
  teamsAppSecret: string
  teamsServiceUrl: string
  teamsConvId: string
  /** Chuỗi JSON [{ name, teamsId }] người phụ trách được nhắc khi có đơn mới. */
  notifyRecipients: string
  /** '1' thì nhắc luôn Khách trong tin đơn mới nếu Khách đã liên kết Teams. */
  notifyCustomerOnNew: string
}

/** Một người được Bot DUKIN nhắc trên Teams. */
export interface NotifyRecipient {
  name: string
  teamsId: string
}

export interface ItemPayload {
  name: string
  nameFr: string
  description: string
  price: number
  active: boolean
  sort: number
  groups: Array<{
    name: string
    required: boolean
    multiple: boolean
    sort: number
    options: Array<{ name: string; priceAdd: number; sort: number }>
  }>
}
