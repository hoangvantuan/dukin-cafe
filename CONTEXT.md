# DUKIN Cafe & Bistro

Ngữ cảnh bán hàng theo mô hình đặt trước (pre-order) và quản lý đơn hàng cà phê của DUKIN Cafe & Bistro, "Lờ Át Đu Ca Phê".

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
Thuộc tính có cấu trúc của một Món (ví dụ kích cỡ, đá, đường), do chủ quán định nghĩa.
_Avoid_: topping, biến thể

### Đặt hàng

**Đơn hàng**:
Yêu cầu đặt trước của một Khách, gồm các Món kèm Tùy chọn, ghi chú và một Khung nhận hàng.
_Avoid_: hóa đơn, đơn mua, bill

**Khách**:
Người đặt Đơn hàng, định danh bằng tên và số điện thoại.
_Avoid_: user, tài khoản

**Kênh đặt hàng**:
Nơi Đơn hàng phát sinh: Trang bán (Khách tự đặt) hoặc Zalo (chủ quán nhập hộ).
_Avoid_: nguồn, funnel

**Khung nhận hàng**:
Khoảng thời gian trong ngày mà Khách hẹn nhận Đơn hàng.
_Avoid_: giờ giao, slot

**Thanh toán chuyển khoản**:
Cách thu tiền: Khách tự chuyển theo mã QR khi đặt, chủ quán xác nhận đã nhận trên Trang quản lý.
_Avoid_: thanh toán trực tuyến, cổng thanh toán
