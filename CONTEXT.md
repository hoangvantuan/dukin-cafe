# DUKIN Cafe & Bistro

Ngữ cảnh bán hàng theo mô hình đặt trước (pre-order) trong phạm vi công ty cho đồng nghiệp, và quản lý đơn hàng cà phê của DUKIN Cafe & Bistro, "Lờ Át Đu Ca Phê".

## Ngôn ngữ

### Giao diện

**Trang bán**:
Giao diện công khai để Khách tự đặt trước trên điện thoại của họ.
_Avoid_: landing page, trang chủ, website

**Trang quản lý**:
Giao diện riêng của chủ quán để xử lý Đơn hàng và chỉnh Thực đơn.
_Avoid_: dashboard, admin, backoffice

### Thực đơn

**Món**:
Một đồ uống bán cho Khách, có tên tiếng Việt, tên tiếng Pháp, mô tả và giá; do chủ quán tự thêm, sửa, xóa.
_Avoid_: sản phẩm, item

**Tùy chọn**:
Thuộc tính có cấu trúc của một Món (ví dụ kích cỡ, đá, đường), do chủ quán định nghĩa; mỗi lựa chọn có thể cộng thêm vào giá Món.
_Avoid_: topping, biến thể

### Đặt hàng

**Đơn hàng**:
Yêu cầu đặt trước của một Khách, gồm các Món kèm Tùy chọn, ghi chú và Cách nhận hàng. Đơn không hẹn giờ: quán tự quyết lúc nào pha và lúc nào giao.
_Avoid_: hóa đơn, đơn mua, bill

**Khách**:
Đồng nghiệp đặt Đơn hàng trong phạm vi công ty, định danh bằng tên. Tên là duy nhất không phân biệt hoa thường và khoảng trắng thừa, nhưng phân biệt dấu: "Hoàng Tuấn" và "hoàng tuấn" là một người, "Hoang Tuan" là người khác.
_Avoid_: user, tài khoản, khách vãng lai

**Kênh đặt hàng**:
Nơi Đơn hàng phát sinh: Trang bán (Khách tự đặt) hoặc Zalo (chủ quán Nhập hộ).
_Avoid_: nguồn, funnel

**Nhập hộ**:
Việc chủ quán tạo Đơn hàng thay Khách từ kênh Zalo.
_Avoid_: đơn chèn, đơn tay

**Trần đơn mỗi ngày**:
Số Đơn hàng tối đa quán nhận trong một ngày, do chủ quán đặt; chạm trần thì Trang bán ngưng nhận cho tới hôm sau. Đặt 0 là không giới hạn.
_Avoid_: quota, capacity, sức chứa

**Ngày đặt**:
Ngày Đơn hàng được pha và giao; luôn là chính ngày Khách đặt, không chọn ngày mai.
_Avoid_: đặt trước nhiều ngày, hẹn ngày nhận, dải ngày

**Cách nhận hàng**:
Lựa chọn của Khách khi đặt: Nhận tại quán hoặc Giao tận nơi.
_Avoid_: phương thức giao, ship

**Nhận tại quán**:
Khách đến quán lấy Đơn hàng khi quán báo đã pha xong.
_Avoid_: pickup

**Giao tận nơi**:
Quán mang Đơn hàng đến vị trí của Khách trong công ty, miễn phí, vào lúc quán thu xếp được.
_Avoid_: delivery, ship

**Vị trí giao**:
Nơi Khách hẹn nhận Đơn hàng khi Giao tận nơi (tầng, phòng, số bàn).
_Avoid_: địa chỉ

**Hàng đợi xử lý**:
Danh sách mọi Đơn hàng chưa Hoàn tất và chưa Hủy, không phân theo ngày; đây là màn hình mặc định của Trang quản lý.
_Avoid_: pending list, inbox, backlog

**Bảng pha chế**:
Bản gộp các Đơn hàng đang chờ xử lý theo từng cặp Món và Tùy chọn, kèm tổng số ly phải pha; chỉ để xem, không đánh dấu đã pha.
_Avoid_: kitchen view, ticket, lệnh pha

**Trạng thái Đơn hàng**:
Một trong: Mới, Đã xác nhận, Đã thu tiền, Hoàn tất, Đã hủy; chỉ chủ quán thực hiện việc chuyển trạng thái.
_Avoid_: pending, processing, done

**Cách thanh toán**:
Chuyển khoản theo mã QR khi đặt, hoặc tiền mặt khi nhận hàng.
_Avoid_: thanh toán trực tuyến, cổng thanh toán

**Danh bạ Khách**:
Danh sách tên Khách quen kèm tài khoản Microsoft Teams đã liên kết, để nhắc Khách trong Luồng Đơn hàng. Mỗi Khách đúng một dòng.
_Avoid_: liên hệ, contact

**Liên kết Teams**:
Việc gắn một Khách hoặc một Người phụ trách với một tài khoản trong nhóm Microsoft Teams, chọn từ danh sách nhóm chứ không gõ tay. Teams chỉ gắn thẻ được bằng mã dạng 29:..., không nhận email.
_Avoid_: mapping, gán ID, tag

**Người phụ trách**:
Người của quán được Bot DUKIN gắn thẻ khi có đơn mới (chủ quán, người pha chế, người giao), chọn riêng trong Cấu hình, không nằm trong Danh bạ Khách.
_Avoid_: admin, người nhận thông báo, staff

**Kỳ thống kê**:
Cách gộp số liệu bán hàng theo thời gian: Ngày, Tuần (bắt đầu từ thứ Hai), Tháng hoặc Năm. Doanh thu mọi kỳ đều bỏ Đơn hàng đã hủy.
_Avoid_: period, khoảng, range

**Luồng Đơn hàng**:
Chuỗi tin nhắn trên nhóm Microsoft Teams tương ứng với một Đơn hàng: mở khi có đơn mới, cập nhật mỗi lần đổi Trạng thái Đơn hàng. Mỗi tin là một Thẻ đơn hàng.
_Avoid_: thread, notification, alert

**Sửa đơn**:
Việc chủ quán đổi nội dung một Đơn hàng đã đặt: Món, Tùy chọn, số lượng, Cách nhận hàng, Vị trí giao, ghi chú, Cách thanh toán. Không đổi Trạng thái Đơn hàng. Mỗi lần sửa, Bot DUKIN trả lời vào Luồng Đơn hàng nêu rõ trước và sau.
_Avoid_: edit, cập nhật đơn, chỉnh sửa

**Đơn lần trước**:
Nội dung Đơn hàng thành công gần nhất của Khách, lưu tại máy của chính Khách; Món không còn bán bị bỏ khi dựng lại.
_Avoid_: reorder, đơn mẫu, lịch sử đơn

**Thẻ đơn hàng**:
Tin nhắn dạng thẻ (Adaptive Card) Bot DUKIN gửi lên Teams, gồm mã đơn, danh sách Món, tổng tiền, Cách nhận hàng, giờ đặt và phần gắn thẻ người liên quan.
_Avoid_: message, notification, tin nhắn thường

**Bot DUKIN**:
Ứng dụng Microsoft Teams do quán vận hành, thay quán mở Luồng Đơn hàng, trả lời trạng thái và nhắc Khách.
_Avoid_: connector, webhook
