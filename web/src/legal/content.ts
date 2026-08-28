/**
 * Nội dung hai trang pháp lý, tiếng Việt là bản chính và tiếng Anh là bản dịch.
 * Giữ nội dung ở dạng dữ liệu để một thành phần dựng chung cả hai trang, và để
 * sửa câu chữ không phải đụng vào phần dựng giao diện.
 */

export type Lang = 'vi' | 'en'

export interface LegalSection {
  heading: string
  paras?: string[]
  bullets?: string[]
}

export interface LegalText {
  kicker: string
  title: string
  quote: string
  updated: string
  intro: string
  sections: LegalSection[]
  contactHeading: string
  contactLead: string
  contactEmailLabel: string
  contactZaloLabel: string
  contactFallback: string
  otherLabel: string
  backLabel: string
}

export interface LegalDoc {
  /** Tuyến của trang pháp lý còn lại, để hai trang trỏ qua nhau. */
  otherPath: string
  vi: LegalText
  en: LegalText
}

const NGAY_CAP_NHAT = 'Cập nhật ngày 28 tháng 8 năm 2026'
const UPDATED_AT = 'Last updated 28 August 2026'

export const privacyDoc: LegalDoc = {
  otherPath: '/dieu-khoan-su-dung',
  vi: {
    kicker: 'DUKIN Cafe & Bistro',
    title: 'Quyền riêng tư',
    quote: '« Nói đúng những gì quán chạm tới, không hơn không kém. »',
    updated: NGAY_CAP_NHAT,
    intro:
      'DUKIN Cafe & Bistro, "Lờ Át Đu Ca Phê", là quán cà phê tự phát do một nhóm đồng nghiệp trong công ty tự bỏ công vận hành. Đây không phải dịch vụ của công ty. Trang này kể đúng những dữ liệu hệ thống thật sự chạm vào khi bạn đặt một Đơn hàng.',
    sections: [
      {
        heading: '1. Hệ thống lưu những gì về bạn',
        bullets: [
          'Tên Khách bạn tự điền. Tên là cách duy nhất hệ thống nhận ra bạn: không mật khẩu, không tài khoản, không email của bạn.',
          'Vị trí giao khi bạn chọn Giao tận nơi: tầng, phòng hoặc số bàn bạn hẹn nhận.',
          'Ghi chú bạn viết cho quán, lưu nguyên văn.',
          'Nội dung Đơn hàng: các Món kèm Tùy chọn, số lượng, tổng tiền, Cách nhận hàng, Cách thanh toán, giờ đặt và Trạng thái Đơn hàng.',
          'Mã người dùng Microsoft Teams của bạn trong Danh bạ Khách, dạng 29:..., nếu chủ quán liên kết tên bạn với một tài khoản trong nhóm Teams. Mã này chỉ dùng để gắn thẻ bạn trong Luồng Đơn hàng.',
        ],
      },
      {
        heading: '2. Đơn hàng của bạn hiện trên nhóm Teams của công ty',
        paras: [
          'Đây là điều bạn cần biết rõ nhất trước khi đặt. Mỗi Đơn hàng mở một Luồng Đơn hàng: Bot DUKIN đăng một Thẻ đơn hàng lên nhóm Microsoft Teams của công ty, rồi trả lời vào chính luồng đó mỗi lần Trạng thái Đơn hàng đổi hoặc quán Sửa đơn.',
          'Thẻ đơn hàng ghi mã đơn, tên bạn, danh sách Món, tổng tiền, Cách nhận hàng và giờ đặt; khi bạn chọn Giao tận nơi thì ghi cả Vị trí giao. Nếu bạn có trong Danh bạ Khách và đã Liên kết Teams, Bot DUKIN gắn thẻ bạn để bạn nhận thông báo.',
          'Mọi đồng nghiệp trong nhóm Teams đó đọc được luồng này. Vậy nên: chi tiết nào bạn không muốn đồng nghiệp thấy thì đừng viết vào Đơn hàng.',
        ],
      },
      {
        heading: '3. Máy của bạn giữ gì',
        paras: [
          'Trang bán ghi tên Khách và Vị trí giao vào bộ nhớ trình duyệt trên chính máy bạn, để lần sau bạn không phải điền lại. Phần đó nằm ở máy bạn, xóa dữ liệu trang của trình duyệt là hết.',
          'Trang bán không dùng bộ đo lường của bên thứ ba, không quảng cáo, không cookie theo dõi. Cookie duy nhất trong hệ thống là cookie đăng nhập của Trang quản lý, chỉ chủ quán dùng.',
        ],
      },
      {
        heading: '4. Thanh toán',
        paras: [
          'Chuyển khoản dùng mã QR VietQR dựng từ số tài khoản của quán và số tiền của Đơn hàng. Bạn trả bằng ứng dụng ngân hàng của mình: hệ thống không nhận, không thấy và không lưu số thẻ hay thông tin ngân hàng của bạn.',
          'Nội dung chuyển khoản do quán tạo sẵn gồm mã đơn và tên bạn viết không dấu, để quán đối chiếu được. Nghĩa là tên bạn xuất hiện trong sao kê ngân hàng của quán, và ảnh mã QR được dựng bởi dịch vụ vietqr.io nên dịch vụ đó thấy số tiền cùng nội dung chuyển khoản đó.',
          'Chọn tiền mặt thì không có bước nào ra ngoài: bạn trả khi nhận hàng.',
        ],
      },
      {
        heading: '5. Ai xem được',
        paras: [
          'Chủ quán và người của quán được cấp mật khẩu Trang quản lý đọc được toàn bộ Đơn hàng và Danh bạ Khách. Đồng nghiệp trong nhóm Teams của công ty đọc được Luồng Đơn hàng.',
          'Ngoài hai chỗ đó, quán không chuyển dữ liệu của bạn cho ai, không bán, và không dùng cho việc gì khác ngoài pha đúng và giao đúng Đơn hàng của bạn.',
        ],
      },
      {
        heading: '6. Lưu bao lâu, muốn xóa thì làm sao',
        paras: [
          'Đơn hàng nằm trong cơ sở dữ liệu của quán để đối sổ và xem Thống kê. Dòng của bạn trong Danh bạ Khách gồm tên và mã người dùng Teams, giữ tới khi chủ quán xóa.',
          'Muốn xóa tên khỏi Danh bạ Khách, bỏ Liên kết Teams, hoặc xóa một Đơn hàng cũ, hãy nhắn cho quán qua kênh liên hệ dưới đây. Tin đã đăng lên nhóm Teams thì quán xóa được tin, nhưng đồng nghiệp nào đã đọc thì đã đọc rồi.',
        ],
      },
    ],
    contactHeading: 'Liên hệ',
    contactLead: 'Có câu hỏi về dữ liệu của bạn, hoặc muốn xóa, hãy nhắn cho nhóm vận hành quán:',
    contactEmailLabel: 'Email',
    contactZaloLabel: 'Zalo',
    contactFallback: 'Chưa khai kênh liên hệ trong Cấu hình. Bạn nhắn trực tiếp cho chủ quán tại quán.',
    otherLabel: 'Đọc Điều khoản sử dụng →',
    backLabel: '← Về Trang bán',
  },
  en: {
    kicker: 'DUKIN Cafe & Bistro',
    title: 'Privacy',
    quote: '« Only what the shop actually touches, nothing more. »',
    updated: UPDATED_AT,
    intro:
      'DUKIN Cafe & Bistro, "Lờ Át Đu Ca Phê", is an informal coffee shop run by a group of colleagues inside the company, on their own time. It is not a company service. This page states exactly what data the system touches when you place an order.',
    sections: [
      {
        heading: '1. What the system stores about you',
        bullets: [
          'The customer name you type in. Your name is the only way the system recognises you: no password, no account, no email address of yours.',
          'Your delivery spot when you choose in-office delivery: the floor, room or desk number where you want the order.',
          'The note you write for the shop, stored word for word.',
          'The order itself: drinks with their options, quantities, total, how you want to receive it, how you pay, the time you ordered and the order status.',
          'Your Microsoft Teams user id in the shop’s customer directory, in the 29:... form, if the owner links your name to an account in the Teams group. That id is used only to mention you in the order thread.',
        ],
      },
      {
        heading: '2. Your order appears in the company Teams group',
        paras: [
          'This is the part you should be clearest about before ordering. Every order opens an order thread: the DUKIN bot posts an order card into the company Microsoft Teams group, then replies in that same thread every time the order status changes or the shop edits the order.',
          'The order card carries the order code, your name, the list of drinks, the total, how you receive it and the time you ordered; if you chose delivery, it also carries your delivery spot. If you are in the customer directory with a linked Teams account, the bot mentions you so you get notified.',
          'Every colleague in that Teams group can read the thread. So: anything you would not want colleagues to see should not go into the order.',
        ],
      },
      {
        heading: '3. What stays on your own device',
        paras: [
          'The order page saves your name and delivery spot in your browser storage, on your own device, so you do not retype them next time. That copy lives on your device; clearing the site data in your browser removes it.',
          'The order page uses no third-party analytics, no ads and no tracking cookies. The only cookie in the system is the owner’s login cookie for the management page.',
        ],
      },
      {
        heading: '4. Payment',
        paras: [
          'Bank transfer uses a VietQR code built from the shop’s account number and the order total. You pay from your own banking app: the system never receives, sees or stores your card or bank details.',
          'The transfer memo is prefilled with the order code and your name without diacritics so the shop can reconcile payments. That means your name shows up in the shop’s bank statement, and because the QR image is rendered by vietqr.io, that service sees the amount and that memo.',
          'If you pay cash, nothing leaves the shop at all: you pay when you collect the drink.',
        ],
      },
      {
        heading: '5. Who can see it',
        paras: [
          'The owner and the shop people who hold the management-page password can read every order and the whole customer directory. Colleagues in the company Teams group can read the order threads.',
          'Beyond those two places, the shop hands your data to nobody, sells nothing, and uses it for nothing other than brewing and delivering your order correctly.',
        ],
      },
      {
        heading: '6. How long it is kept, and how to have it removed',
        paras: [
          'Orders stay in the shop’s database for reconciliation and sales figures. Your row in the customer directory holds your name and Teams user id, and stays until the owner deletes it.',
          'To have your name removed from the customer directory, your Teams link dropped, or an old order deleted, message the shop through the contact channel below. Messages already posted in the Teams group can be deleted, but colleagues who already read them have already read them.',
        ],
      },
    ],
    contactHeading: 'Contact',
    contactLead: 'Questions about your data, or a deletion request, go to the people running the shop:',
    contactEmailLabel: 'Email',
    contactZaloLabel: 'Zalo',
    contactFallback: 'No contact channel has been filled in yet. Speak to the owner at the shop.',
    otherLabel: 'Read the Terms of Use →',
    backLabel: '← Back to the order page',
  },
}

export const termsDoc: LegalDoc = {
  otherPath: '/quyen-rieng-tu',
  vi: {
    kicker: 'DUKIN Cafe & Bistro',
    title: 'Điều khoản sử dụng',
    quote: '« Một nhóm đồng nghiệp pha cà phê cho đồng nghiệp. »',
    updated: NGAY_CAP_NHAT,
    intro:
      'Đặt một Đơn hàng trên Trang bán là bạn đồng ý với những điều dưới đây. Nội dung ngắn vì việc này cũng nhỏ.',
    sections: [
      {
        heading: '1. Quán này là của ai',
        paras: [
          'DUKIN Cafe & Bistro, "Lờ Át Đu Ca Phê", là quán tự phát do một nhóm đồng nghiệp tự bỏ công vận hành trong phạm vi công ty.',
          'Đây không phải dịch vụ của công ty, không phải phúc lợi công ty, và công ty không đứng ra chịu trách nhiệm gì về nó. Bạn mua cà phê của nhóm đồng nghiệp đó. Hệ thống này cũng do chính nhóm đó dựng và vận hành.',
        ],
      },
      {
        heading: '2. Đặt hàng',
        bullets: [
          'Đơn hàng luôn là của chính ngày bạn đặt. Không chọn ngày khác và không hẹn giờ: quán tự quyết lúc nào pha và lúc nào giao. Muốn nhận vào một lúc nhất định thì viết vào ghi chú, đó là mong muốn chứ không phải cam kết.',
          'Giá tính theo Thực đơn tại lúc bạn đặt.',
          'Quán đặt Trần đơn mỗi ngày. Chạm trần thì Trang bán ngưng nhận cho tới hôm sau.',
          'Điền đúng tên của chính bạn, vì tên trên đơn là tên hiện lên nhóm Teams. Đặt hộ người khác thì ghi rõ trong ghi chú.',
        ],
      },
      {
        heading: '3. Sửa đơn và hủy đơn',
        paras: [
          'Chỉ chủ quán chuyển Trạng thái Đơn hàng và Sửa đơn. Muốn đổi hay hủy, bạn nhắn cho quán qua kênh liên hệ dưới đây, càng sớm càng tốt: ly đã pha thì không hoàn lại được.',
          'Mỗi lần quán Sửa đơn, Bot DUKIN trả lời vào Luồng Đơn hàng nêu rõ trước và sau, nên đồng nghiệp trong nhóm Teams cũng thấy lần sửa đó.',
        ],
      },
      {
        heading: '4. Thanh toán',
        paras: [
          'Hai cách: chuyển khoản theo mã QR lúc đặt, hoặc tiền mặt khi nhận hàng. Giao tận nơi trong phạm vi công ty miễn phí.',
          'Tiền vào thẳng tài khoản ngân hàng của quán, không qua cổng thanh toán nào. Chuyển khoản rồi mà đơn không thành, quán chuyển lại đủ.',
        ],
      },
      {
        heading: '5. Những điều quán không hứa',
        paras: [
          'Quán pha ngoài giờ làm việc của chính mình, nên không hứa giờ giao, không hứa lúc nào cũng còn đủ Món, và có ngày nghỉ không nhận đơn.',
          'Nếu Đơn hàng của bạn không thành, quán trả lại tiền bạn đã chuyển và xin lỗi. Đó là toàn bộ trách nhiệm của quán. Hệ thống này viết cho một quán nội bộ, không dựng cho mục đích thương mại ngoài phạm vi đó.',
        ],
      },
      {
        heading: '6. Dữ liệu của bạn',
        paras: [
          'Phần dữ liệu nằm ở trang Quyền riêng tư. Điểm quan trọng nhất, nhắc lại ở đây cho rõ: Đơn hàng của bạn mở một Luồng Đơn hàng trên nhóm Microsoft Teams của công ty, nơi đồng nghiệp đọc được tên bạn, các Món và Vị trí giao.',
        ],
      },
      {
        heading: '7. Trang này đổi khi nào',
        paras: [
          'Quán sửa trang này khi cách chạy của quán đổi. Bản đang hiện là bản có hiệu lực.',
        ],
      },
    ],
    contactHeading: 'Liên hệ',
    contactLead: 'Muốn sửa đơn, hủy đơn, hay hỏi gì thêm, hãy nhắn cho nhóm vận hành quán:',
    contactEmailLabel: 'Email',
    contactZaloLabel: 'Zalo',
    contactFallback: 'Chưa khai kênh liên hệ trong Cấu hình. Bạn nhắn trực tiếp cho chủ quán tại quán.',
    otherLabel: 'Đọc Quyền riêng tư →',
    backLabel: '← Về Trang bán',
  },
  en: {
    kicker: 'DUKIN Cafe & Bistro',
    title: 'Terms of Use',
    quote: '« A few colleagues brewing coffee for colleagues. »',
    updated: UPDATED_AT,
    intro:
      'Placing an order on the order page means you accept the terms below. They are short because the whole thing is small.',
    sections: [
      {
        heading: '1. Whose shop this is',
        paras: [
          'DUKIN Cafe & Bistro, "Lờ Át Đu Ca Phê", is an informal shop run by a group of colleagues on their own time, inside the company.',
          'It is not a company service, not a company benefit, and the company takes no responsibility for it. You are buying coffee from those colleagues. This software is also built and run by the same group.',
        ],
      },
      {
        heading: '2. Ordering',
        bullets: [
          'An order is always for the same day you place it. There is no date picker and no time slot: the shop decides when to brew and when to deliver. If you want it at a particular moment, write it in the note; that is a wish, not a commitment.',
          'Prices follow the menu as it stands when you order.',
          'The shop sets a daily order cap. Once it is reached, the order page stops accepting orders until the next day.',
          'Use your own real name, because the name on the order is the name that appears in the Teams group. If you are ordering for someone else, say so in the note.',
        ],
      },
      {
        heading: '3. Edits and cancellations',
        paras: [
          'Only the owner changes an order status or edits an order. To change or cancel, message the shop through the contact channel below, as early as you can: a drink already brewed cannot be refunded.',
          'Every time the shop edits an order, the DUKIN bot replies in the order thread spelling out the before and after, so colleagues in the Teams group see the edit too.',
        ],
      },
      {
        heading: '4. Payment',
        paras: [
          'Two ways: bank transfer by QR code when you order, or cash when you collect. Delivery inside the company is free.',
          'Money goes straight to the shop’s bank account, through no payment gateway. If you transferred and the order does not happen, the shop transfers it back in full.',
        ],
      },
      {
        heading: '5. What the shop does not promise',
        paras: [
          'The shop brews outside its own working hours, so it promises no delivery time, no guarantee that every drink is always available, and there are days it takes no orders at all.',
          'If your order does not happen, the shop refunds what you transferred and apologises. That is the full extent of its liability. This system was written for one internal shop, not for commercial use beyond that.',
        ],
      },
      {
        heading: '6. Your data',
        paras: [
          'The data details live on the privacy page. The most important point, repeated here for clarity: your order opens a thread in the company Microsoft Teams group, where colleagues can read your name, your drinks and your delivery spot.',
        ],
      },
      {
        heading: '7. When this page changes',
        paras: [
          'The shop updates this page when the way it operates changes. The version you are reading is the one in force.',
        ],
      },
    ],
    contactHeading: 'Contact',
    contactLead: 'To edit an order, cancel one, or ask anything else, message the people running the shop:',
    contactEmailLabel: 'Email',
    contactZaloLabel: 'Zalo',
    contactFallback: 'No contact channel has been filled in yet. Speak to the owner at the shop.',
    otherLabel: 'Read the Privacy page →',
    backLabel: '← Back to the order page',
  },
}
