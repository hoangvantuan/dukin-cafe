/**
 * Cắt vuông và nén ảnh Món ngay trên máy Khách bằng canvas của trình duyệt.
 * Làm ở đây để máy chủ không phải mang thư viện xử lý ảnh, và để chủ quán chụp
 * bằng điện thoại là gửi được luôn, không cần mở ứng dụng chỉnh ảnh.
 */

/** Cạnh ảnh sau khi cắt. Đủ nét cho thẻ Món trên điện thoại mà tệp vẫn nhẹ. */
const CANH = 640

/** Mức nén WebP: đủ để ảnh cà phê còn đẹp, tệp thường dưới trăm KB. */
const CHAT_LUONG = 0.82

export interface AnhDaNen {
  /** Nội dung ảnh dạng base64 thuần, không kèm tiền tố data:. */
  data: string
  /** Loại ảnh thật sự nén ra được; trình duyệt cũ không có WebP thì ra PNG. */
  type: string
}

function blobSangBase64(blob: Blob): Promise<string> {
  return new Promise((giai, bo) => {
    const doc = new FileReader()
    doc.onerror = () => bo(new Error('Không đọc được ảnh vừa nén'))
    doc.onload = () => {
      const chuoi = String(doc.result)
      const dau = chuoi.indexOf(',')
      giai(dau >= 0 ? chuoi.slice(dau + 1) : chuoi)
    }
    doc.readAsDataURL(blob)
  })
}

/**
 * Cắt phần vuông ở giữa ảnh rồi nén lại. Cắt giữa vì ảnh chụp ly cà phê gần
 * như luôn đặt ly vào giữa khung, cắt giữa là đoán đúng ý người chụp nhất.
 */
export async function catVuongVaNen(tep: File): Promise<AnhDaNen> {
  if (!tep.type.startsWith('image/')) throw new Error('Hãy chọn một tệp ảnh')

  const anh = await createImageBitmap(tep)
  try {
    const canhGoc = Math.min(anh.width, anh.height)
    const canhRa = Math.min(CANH, canhGoc)
    const khung = document.createElement('canvas')
    khung.width = canhRa
    khung.height = canhRa
    const but = khung.getContext('2d')
    if (!but) throw new Error('Trình duyệt không dựng được canvas để nén ảnh')
    but.drawImage(
      anh,
      (anh.width - canhGoc) / 2,
      (anh.height - canhGoc) / 2,
      canhGoc,
      canhGoc,
      0,
      0,
      canhRa,
      canhRa,
    )
    const nen = await new Promise<Blob | null>((giai) =>
      khung.toBlob(giai, 'image/webp', CHAT_LUONG),
    )
    if (!nen) throw new Error('Trình duyệt không nén được ảnh')
    return { data: await blobSangBase64(nen), type: nen.type || 'image/webp' }
  } finally {
    anh.close()
  }
}
