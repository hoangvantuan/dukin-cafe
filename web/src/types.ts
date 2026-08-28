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
  /** Đường dẫn ảnh Món do máy chủ phát; rỗng là Món chưa có ảnh. */
  image: string
  groups: MenuGroup[]
}

/** Tình hình nhận đơn hôm nay; remaining là null khi quán không đặt trần. */
export interface Intake {
  open: boolean
  remaining: number | null
}

export type OrderStatus = 'new' | 'confirmed' | 'paid' | 'done' | 'cancelled'

export interface AdminOrderItem {
  itemId: number | null
  name: string
  optionSummary: string
  /** Mã Tùy chọn đã chọn, để dựng lại form khi sửa đơn. */
  optionIds: number[]
  unitPrice: number
  qty: number
}

/** Một mục đã đổi khi sửa đơn, dùng để báo lại cho chủ quán. */
export interface OrderChange {
  label: string
  before: string
  after: string
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
  email: string
}

/** Đồng nghiệp trong nhóm Teams đã cài Bot DUKIN. */
export interface TeamMember {
  /** Mã Teams dùng khi gắn thẻ, dạng 29:... */
  teamsId: string
  name: string
  email: string
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

export type StatsPeriod = 'day' | 'week' | 'month' | 'year'

export interface StatsBucket {
  key: string
  label: string
  orders: number
  cancelled: number
  revenue: number
  cups: number
  customers: number
}

export interface Stats {
  period: StatsPeriod
  buckets: StatsBucket[]
  total: {
    orders: number
    cancelled: number
    revenue: number
    cups: number
    customers: number
    avgOrder: number
  }
  byStatus: Array<{ status: string; count: number }>
  byChannel: Array<{ channel: string; count: number }>
  byReceiveMode: Array<{ mode: string; count: number }>
  byPayment: Array<{ method: string; count: number }>
  topItems: Array<{ name: string; optionSummary: string; qty: number; revenue: number }>
  topCustomers: Array<{ name: string; orders: number; revenue: number }>
}

/** Một cặp Món và Tùy chọn đã gộp trong Bảng pha chế. */
export interface BrewRow {
  name: string
  optionSummary: string
  qty: number
}

/** Bảng pha chế do máy chủ gộp sẵn; giao diện chỉ hiển thị, không cộng lại. */
export interface BrewSheet {
  rows: BrewRow[]
  totalCups: number
}
