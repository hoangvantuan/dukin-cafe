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
Yêu cầu đặt trước của một Khách, gồm các Món kèm Tùy chọn, ghi chú và một Khung nhận hàng.
_Avoid_: hóa đơn, đơn mua, bill

**Khách**:
Đồng nghiệp đặt Đơn hàng trong phạm vi công ty, định danh bằng tên.
_Avoid_: user, tài khoản, khách vãng lai

**Kênh đặt hàng**:
Nơi Đơn hàng phát sinh: Trang bán (Khách tự đặt) hoặc Zalo (chủ quán Nhập hộ).
_Avoid_: nguồn, funnel

**Nhập hộ**:
Việc chủ quán tạo Đơn hàng thay Khách từ kênh Zalo.
_Avoid_: đơn chèn, đơn tay

**Khung nhận hàng**:
Khoảng thời gian trong ngày mà Khách hẹn nhận Đơn hàng.
_Avoid_: giờ giao, slot

**Giờ chốt đơn**:
Mốc trong ngày mà sau đó Đơn hàng mới chỉ có thể hẹn Khung nhận hàng của hôm sau.
_Avoid_: deadline, cut-off

**Cách nhận hàng**:
Lựa chọn của Khách khi đặt: Nhận tại quán hoặc Giao tận nơi.
_Avoid_: phương thức giao, ship

**Nhận tại quán**:
Khách đến quán lấy Đơn hàng trong Khung nhận hàng.
_Avoid_: pickup

**Giao tận nơi**:
Quán mang Đơn hàng đến vị trí của Khách trong công ty trong Khung nhận hàng, miễn phí.
_Avoid_: delivery, ship

**Vị trí giao**:
Nơi Khách hẹn nhận Đơn hàng khi Giao tận nơi (tầng, phòng, số bàn).
_Avoid_: địa chỉ

**Trạng thái Đơn hàng**:
Một trong: Mới, Đã xác nhận, Đã thu tiền, Hoàn tất, Đã hủy; chỉ chủ quán thực hiện việc chuyển trạng thái.
_Avoid_: pending, processing, done

**Cách thanh toán**:
Chuyển khoản theo mã QR khi đặt, hoặc tiền mặt khi nhận hàng.
_Avoid_: thanh toán trực tuyến, cổng thanh toán

**Danh bạ Khách**:
Danh sách tên Khách quen kèm mã người dùng Microsoft Teams, chủ quán tự cấu hình tay để nhắc Khách trong Luồng Đơn hàng.
_Avoid_: liên hệ, contact

**Luồng Đơn hàng**:
Chuỗi tin nhắn trên nhóm Microsoft Teams tương ứng với một Đơn hàng: mở khi có đơn mới, cập nhật mỗi lần đổi Trạng thái Đơn hàng.
_Avoid_: thread, notification, alert

**Bot DUKIN**:
Ứng dụng Microsoft Teams do quán vận hành, thay quán mở Luồng Đơn hàng, trả lời trạng thái và nhắc Khách.
_Avoid_: connector, webhook
