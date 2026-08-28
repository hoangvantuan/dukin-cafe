import type { MenuItem } from '../types'

/** Một dòng trong khay: cùng Món và cùng bộ Tùy chọn thì gộp làm một dòng. */
export interface CartLine {
  key: string
  itemId: number
  qty: number
  optionIds: number[]
}

/** Tùy chọn và số lượng Khách đang chọn trên một thẻ Món, chưa thêm vào khay. */
export interface Selection {
  optionIds: number[]
  qty: number
}

export type ReceiveMode = 'pickup' | 'delivery'
export type PaymentMethod = 'transfer' | 'cash'

/** Giá một ly: giá Món cộng phần cộng thêm của các Tùy chọn đã chọn. */
export function linePrice(item: MenuItem, optionIds: number[]): number {
  let add = 0
  for (const g of item.groups) {
    for (const o of g.options) {
      if (optionIds.includes(o.id)) add += o.priceAdd
    }
  }
  return item.price + add
}

/** Tên các Tùy chọn đã chọn, ghép bằng dấu phẩy để hiển thị gọn. */
export function optionNames(item: MenuItem, optionIds: number[]): string {
  const names: string[] = []
  for (const g of item.groups) {
    for (const o of g.options) {
      if (optionIds.includes(o.id)) names.push(o.name)
    }
  }
  return names.join(', ')
}
