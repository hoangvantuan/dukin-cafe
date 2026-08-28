# Bỏ Khung nhận hàng, đơn không hẹn giờ

Mô hình cũ bắt Khách chọn một Khung nhận hàng (sáng 7:00 tới 10:30, chiều 13:30 tới 17:00) và có Giờ chốt đơn 10:00. Hai hệ quả xấu:

Thứ nhất, sai với cách quán thật sự chạy. Quán bán nội bộ cho đồng nghiệp, người vận hành pha và giao lúc nào thuận tay, không cam kết cửa sổ thời gian. Khung nhận hàng là ràng buộc do phần mềm đặt ra chứ không phải do nghiệp vụ.

Thứ hai, nó sinh ra một lỗi vận hành nghiêm trọng. Trang quản lý lọc đơn theo `slot_date` với mặc định là hôm nay, trong khi từ 10:00 trở đi mọi đơn mới đều rơi vào khung của hôm sau. Kết quả: **từ 10:00 mỗi ngày, đơn mới không hiện trên màn hình mặc định của chủ quán**. Triệu chứng ("không thấy đơn mới") nằm ở tầng hiển thị, nhưng nhân nằm ở chính mô hình: màn quản trị lọc theo *ngày nhận hàng*, còn chủ quán trông đợi thấy *đơn vừa vào*.

Quyết định: bỏ hẳn Khung nhận hàng và Giờ chốt đơn. Đơn chỉ ghi `order_date` là ngày Khách đặt theo giờ Việt Nam. Trang quản lý mặc định mở tab Hàng đợi xử lý (mọi đơn chưa Hoàn tất, chưa Hủy, không phân theo ngày), tab thứ hai lọc theo ngày đặt để đối sổ. Khách muốn hẹn giờ thì viết vào Ghi chú, không thành ràng buộc của hệ thống.

Giới hạn theo khung đổi thành Trần đơn mỗi ngày, mặc định 0 tức không giới hạn. Migration nhân đôi giá trị cũ vì mỗi ngày trước đây có hai khung.

Đánh đổi: mất khả năng cam kết giờ giao với Khách và mất công cụ dàn tải giữa sáng và chiều. Chấp nhận được ở quy mô nội bộ, nơi Khách ngồi cùng tòa nhà và hỏi trực tiếp được. Nếu sau này quán cần cam kết giờ, cách đúng là thêm trường "mong muốn nhận lúc" tự do cho Khách kèm trường "hẹn giao lúc" do quán tự điền, chứ không quay lại khung cứng.
