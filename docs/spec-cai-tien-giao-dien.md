# Cải tiến giao diện Trang bán và Trang quản lý

> **Cập nhật sau khi bỏ Khung nhận hàng** (xem `docs/adr/0003-bo-khung-nhan-hang.md`).
> Bản spec này viết khi hệ thống còn Khung nhận hàng và Giờ chốt đơn. Hai khái niệm
> đó đã bị gỡ: Khách đặt lúc nào cũng được, quán tự quyết lúc nào pha và lúc nào giao.
> Những mục sau **không còn hiệu lực**:
>
> - Mọi mục về chọn Khung nhận hàng ở Trang bán: dải ngày chạy ngang, phạm vi ba
>   ngày trong Cấu hình, khung sớm nhất chọn sẵn, hiển thị số chỗ còn lại của khung,
>   lời giải thích khi qua Giờ chốt đơn (Vấn đề đoạn 3; Giải pháp đoạn 3 và 5; Câu
>   chuyện 16 tới 19; Thiết kế mục Khung nhận hàng; Kế hoạch mục truyền số ngày đặt
>   trước; Kiểm thử mục mô đun tính Khung nhận hàng).
> - Giới hạn đơn theo khung, thay bằng Trần đơn mỗi ngày trong Cấu hình.
>
> Những mục sau **vẫn còn hiệu lực nhưng đổi cách gộp**:
>
> - Bảng pha chế (Câu chuyện 50 tới 53 và 72; Thiết kế và Kiểm thử mục Bảng pha chế):
>   gộp theo hàng đợi xử lý hoặc theo ngày đặt, không còn gộp theo Khung nhận hàng.
>
> Phần còn lại của spec, gồm bộ token dùng chung, trang cuộn liền, thẻ Đặt lại đơn
> lần trước, ảnh Món, bố cục điện thoại cho Trang quản lý, xác nhận trước khi Hủy đơn,
> trang Quyền riêng tư và Điều khoản sử dụng, vẫn giữ nguyên giá trị.
>
> Ba việc trong spec đã làm xong ngoài kế hoạch này: Trang quản lý mặc định mở hàng
> đợi xử lý, danh sách tự làm mới kèm huy hiệu đếm đơn mới, và thông báo Teams dạng thẻ.

## Problem Statement

Khách mở Trang bán trên điện thoại và gặp một bảng thực đơn kiểu giấy da phủ kín hoa văn: viền vàng kép, cụm họa tiết ở cả đầu và cuối, một câu châm ngôn lặp lại ở cả ba bước đặt hàng. Phần trang trí ăn mất chiều cao mà nội dung thật đang cần, nên Khách phải cuộn nhiều hơn mức đáng phải cuộn cho một Thực đơn chỉ có bốn Món.

Đặt một ly cà phê hiện mất ba lần chuyển màn. Khách quen uống gần như cùng một Món mỗi ngày vẫn phải chọn lại Món, chọn lại Tùy chọn, điền lại mọi thứ từ đầu.

Khung nhận hàng bày ra tối đa mười lăm thẻ xếp dọc, phủ bảy ngày tới, trong khi không ai đặt cà phê trước cả tuần. Đây là danh sách dài nhất trên trang và phần lớn nội dung của nó không ai dùng.

Món không có ảnh. Với một quán cà phê, thiếu ảnh là mất một nửa sức thuyết phục.

Giao diện web cũng đã đi lệch khỏi tờ thực đơn in mà quán phát cho Khách: bản in đặt tên Pháp in nghiêng màu vàng đồng ngay sau tên Việt, ghi giá dạng "20K", có số hiệu 01 tới 04 để Khách gọi theo số. Web thì đặt tên Pháp xuống dòng riêng, ghi "20.000đ", và bỏ mất cách gọi theo số hiệu.

Chủ quán xử lý Đơn hàng trên điện thoại, nhưng Trang quản lý bày bốn tab ngang trên đỉnh cộng bốn thẻ số liệu xếp lưới trước khi nhìn thấy đơn đầu tiên, và mỗi thẻ Đơn hàng có tới bốn nút hành động cạnh nhau, trong đó có nút Hủy. Trên màn hình điện thoại, bấm nhầm ở đó là hủy Đơn hàng của đồng nghiệp mà không có bước xác nhận nào.

Mỗi buổi sáng chủ quán phải tự cộng trong đầu tổng số ly theo từng Món và từng Tùy chọn để biết phải pha bao nhiêu, vì Trang quản lý chỉ liệt kê từng Đơn hàng rời.

Quán chuẩn bị đăng ký Bot DUKIN trên Microsoft Teams. Bản khai báo ứng dụng Teams bắt buộc có địa chỉ trang quyền riêng tư và trang điều khoản sử dụng, mà hệ thống hiện chưa có trang nào trong hai trang đó. Việc này đáng nói rõ vì hệ thống thu thập tên Khách, vị trí bàn làm việc, và đăng Luồng Đơn hàng lên nhóm Teams của công ty nơi đồng nghiệp đọc được.

## Solution

Dựng lại lớp giao diện của cả Trang bán và Trang quản lý trên một bộ token dùng chung, lấy bản sắc từ chính tờ thực đơn in và từ trò chơi ngôn ngữ Việt trêu vẻ Pháp cao cấp vốn là chữ ký thật của quán: "Lờ Át Đu Ca Phê", "Le Nuase".

Trang bán trở thành một trang cuộn liền: Thực đơn, Khung nhận hàng, thông tin Khách, tất cả trên cùng một trang với một thanh dính đáy luôn hiện số ly và tổng tiền. Khách quen thấy ngay đỉnh trang một thẻ Đặt lại đơn lần trước, bấm một lần là có sẵn giỏ, chỉ cần chọn Khung nhận hàng. Màn mã QR sau khi đặt vẫn là màn riêng và sạch.

Mỗi Món hiển thị theo đúng thứ tự của bản in: số hiệu, ảnh vuông, tên Việt cỡ lớn, rồi tên Pháp in nghiêng màu vàng đồng kèm dòng phiên âm bằng chữ đơn cách. Dòng phiên âm là dấu hiệu nhận dạng của cả bản thiết kế, và nó có ích thật: đồng nghiệp không biết đọc "La Crème Salé" vẫn gọi được Món.

Khung nhận hàng chuyển từ danh sách dọc mười lăm thẻ thành một dải ngày chạy ngang, phạm vi rút còn ba ngày và đưa thành một dòng trong Cấu hình.

Trang quản lý chuyển sang bố cục điện thoại: điều hướng dính đáy, số liệu thu về một dòng, mỗi thẻ Đơn hàng chỉ còn một nút hành động chính là bước tiếp theo hợp lý, các bước còn lại nằm sau một nút mở rộng, và Hủy đơn có một lần xác nhận. Tab Đơn hàng có thêm chế độ Bảng pha chế, gộp Món và Tùy chọn theo từng Khung nhận hàng để chủ quán biết phải pha bao nhiêu ly mỗi loại.

Chủ quán tự thêm ảnh cho từng Món ngay trong Trang quản lý. Ảnh được nén và cắt vuông trên máy Khách trước khi tải lên, nên không cần thư viện xử lý ảnh phía máy chủ.

Bổ sung trang Quyền riêng tư và trang Điều khoản sử dụng, tiếng Việt là bản chính kèm bản tiếng Anh, nêu đúng những dữ liệu hệ thống thật sự chạm vào, trong đó nói rõ việc Luồng Đơn hàng hiện trên nhóm Teams của công ty.

## User Stories

1. Là Khách mở Trang bán trên điện thoại, tôi muốn thấy hết bốn Món trong một màn hình mà không phải cuộn, để biết ngay quán có gì.
2. Là Khách, tôi muốn thấy ảnh thật của từng Món, để chọn bằng mắt thay vì đoán theo tên.
3. Là Khách chưa biết đọc tên Pháp, tôi muốn thấy dòng phiên âm dưới tên Pháp, để gọi Món đúng khi tới quán lấy hàng.
4. Là Khách quen, tôi muốn thấy tên Việt của Món trước và to nhất trong thẻ, để quét mắt tìm đúng cái tên tôi vẫn gọi.
5. Là Khách đã xem tờ thực đơn in trên bàn, tôi muốn Trang bán ghi giá dạng "20K" giống bản in, để không phải quy đổi trong đầu.
6. Là Khách hay gọi "cho anh số 3", tôi muốn thấy số hiệu Món trên Trang bán giống bản in, để cách gọi quen của tôi vẫn dùng được.
7. Là Khách, tôi muốn chọn Tùy chọn của Món ngay tại thẻ Món, để không phải mở thêm màn nào.
8. Là Khách, tôi muốn tăng giảm số lượng ngay tại thẻ Món, để thêm hai ly cùng loại bằng một lần bấm.
9. Là Khách, tôi muốn thấy giá đã cộng Tùy chọn ngay trên nút thêm vào đơn, để biết mình sắp trả bao nhiêu trước khi bấm.
10. Là Khách vừa thêm Món, tôi muốn có một dấu hiệu xác nhận, để biết thao tác đã ăn.
11. Là Khách đang cuộn trang, tôi muốn luôn thấy số ly và tổng tiền ở thanh dính đáy, để không mất dấu giỏ hàng.
12. Là Khách, tôi muốn đặt hàng mà không phải chuyển màn giữa Thực đơn và phần điền thông tin, để đặt xong nhanh hơn.
13. Là Khách uống cà phê hàng ngày, tôi muốn một nút Đặt lại đơn lần trước ở đỉnh trang, để đặt lại đúng Món và Tùy chọn hôm qua bằng một lần bấm.
14. Là Khách dùng Đặt lại đơn lần trước, tôi muốn thấy rõ đơn cũ gồm gì trước khi bấm, để không đặt lại thứ mình không còn muốn.
15. Là Khách lần đầu vào trang, tôi muốn không thấy thẻ Đặt lại đơn lần trước, để trang không có thứ vô nghĩa với tôi.
16. Là Khách, tôi muốn chọn Khung nhận hàng trên một dải ngày chạy ngang thay vì cuộn qua mười lăm thẻ dọc, để chọn xong trong một lần nhìn.
17. Là Khách, tôi muốn thấy Khung nhận hàng còn bao nhiêu chỗ, để biết mình có kịp đặt hay không.
18. Là Khách, tôi muốn Khung nhận hàng sớm nhất được chọn sẵn, để trường hợp phổ biến nhất không cần thao tác nào.
19. Là Khách đặt sau Giờ chốt đơn, tôi muốn hiểu vì sao không còn khung nào của hôm nay, để không tưởng hệ thống lỗi.
20. Là Khách chọn Giao tận nơi, tôi muốn ô nhập Vị trí giao chỉ hiện khi cần, để không phải bỏ qua một ô trống vô ích.
21. Là Khách đã từng đặt, tôi muốn tên và Vị trí giao được điền sẵn từ lần trước, để không nhập lại mỗi ngày.
22. Là Khách, tôi muốn chọn Cách thanh toán ngay trên trang, để biết trước là sẽ quét mã hay trả tiền mặt.
23. Là Khách chọn Chuyển khoản, tôi muốn thấy mã QR trên một màn riêng sạch sẽ sau khi đặt, để quét được ngay mà không có gì chen vào.
24. Là Khách chọn Tiền mặt, tôi muốn màn hoàn tất nói rõ là trả khi nhận, để không đi tìm mã QR.
25. Là Khách vừa đặt xong, tôi muốn thấy mã Đơn hàng của mình, để nhắc lại khi cần hỏi chủ quán.
26. Là Khách gõ thiếu thông tin bắt buộc, tôi muốn thông báo chỉ đúng chỗ tôi thiếu và cách sửa, để không phải dò cả trang.
27. Là Khách có mắt kém, tôi muốn phóng to trang bằng hai ngón, để đọc được chữ nhỏ.
28. Là Khách dùng bàn phím hoặc trình đọc màn hình, tôi muốn thấy rõ ô đang được chọn, để biết mình đang ở đâu trên trang.
29. Là Khách bật chế độ giảm chuyển động trên máy, tôi muốn trang không chạy hiệu ứng, để không bị chóng mặt.
30. Là Khách vào trang khi máy chủ chưa trả dữ liệu, tôi muốn thấy trang đang tải chứ không phải một trang trống, để biết là chờ được.
31. Là Khách vào trang lúc mạng lỗi, tôi muốn một thông báo nói rõ chuyện gì xảy ra và một nút thử lại, để tự xử lý được.
32. Là Khách quan tâm dữ liệu của mình, tôi muốn thấy đường tới trang Quyền riêng tư ở cuối Trang bán, để đọc được khi muốn.
33. Là Khách, tôi muốn biết ai pha cà phê cho mình, để thấy đây là quán của người thật trong công ty.
34. Là chủ quán, tôi muốn Trang bán trông cùng một quán với tờ thực đơn in, để Khách nhận ra thương hiệu.
35. Là chủ quán, tôi muốn tự thêm ảnh cho từng Món trong Trang quản lý, để Thực đơn có ảnh mà không cần nhờ ai.
36. Là chủ quán, tôi muốn ảnh được tự cắt vuông và nén trước khi tải lên, để không phải mở ứng dụng chỉnh ảnh.
37. Là chủ quán, tôi muốn Món chưa có ảnh vẫn hiển thị tử tế, để không phải chụp cả bốn Món mới dám dùng.
38. Là chủ quán, tôi muốn thay ảnh của một Món, để cập nhật khi pha đẹp hơn.
39. Là chủ quán, tôi muốn xóa ảnh của một Món, để bỏ tấm ảnh không đạt.
40. Là chủ quán, tôi muốn ảnh Món còn nguyên sau khi dựng lại hệ thống, để không phải tải lại mỗi lần cập nhật.
41. Là chủ quán, tôi muốn tự điền phiên âm cho mỗi Món, để Món tôi thêm sau này cũng có dòng phiên âm như bốn Món đầu.
42. Là chủ quán chưa kịp điền phiên âm, tôi muốn thẻ Món vẫn gọn gàng, để không phải điền cho xong mới dám bán.
43. Là chủ quán, tôi muốn đổi số ngày Khách được đặt trước trong Cấu hình, để mở rộng khi có đợt đặt cho họp.
44. Là chủ quán, tôi muốn Trang quản lý dùng được bằng một tay trên điện thoại, để xử lý đơn khi đang pha chế.
45. Là chủ quán, tôi muốn điều hướng bốn mục nằm ở đáy màn hình, để ngón tay chạm tới mà không đổi tay cầm.
46. Là chủ quán, tôi muốn số liệu trong ngày thu về một dòng, để thấy Đơn hàng đầu tiên ngay khi mở trang.
47. Là chủ quán, tôi muốn mỗi thẻ Đơn hàng chỉ có một nút hành động chính là bước tiếp theo hợp lý, để không phải chọn giữa bốn nút.
48. Là chủ quán, tôi muốn các bước chuyển trạng thái còn lại nằm sau một nút mở rộng, để vẫn làm được việc ít gặp.
49. Là chủ quán, tôi muốn Hủy đơn có một lần xác nhận, để không hủy Đơn hàng của đồng nghiệp vì bấm nhầm.
50. Là chủ quán, tôi muốn thấy Bảng pha chế gộp Món và Tùy chọn theo từng Khung nhận hàng, để biết phải pha bao nhiêu ly mỗi loại.
51. Là chủ quán, tôi muốn Bảng pha chế nói tổng số ly của cả Khung, để chuẩn bị đủ ly và đá.
52. Là chủ quán, tôi muốn Bảng pha chế bỏ Đơn hàng đã hủy, để không pha thừa.
53. Là chủ quán, tôi muốn chuyển qua lại giữa danh sách Đơn hàng và Bảng pha chế trong cùng một tab, để không phải đi tìm ở chỗ khác.
54. Là chủ quán, tôi muốn phân biệt ngay Kênh đặt hàng của mỗi Đơn hàng, để biết đơn nào từ Zalo mà tôi Nhập hộ.
55. Là chủ quán, tôi muốn thấy ngay Đơn hàng nào chưa có Luồng Đơn hàng trên Teams, để biết đơn nào Khách chưa được nhắc.
56. Là chủ quán, tôi muốn Nhập hộ đơn từ Zalo trên điện thoại mà không phải phóng to trang, để nhập lúc đang nhận tin nhắn.
57. Là chủ quán, tôi muốn Trang quản lý và Trang bán dùng cùng một bộ màu và chữ, để hai trang là một sản phẩm.
58. Là chủ quán, tôi muốn thấy tổng tiền của ngày bằng con số đầy đủ chứ không phải dạng "165K", để đối chiếu tiền.
59. Là chủ quán, tôi muốn tự nhập danh sách Người pha trong Cấu hình, để hiện tên nhóm ở cuối Trang bán khi cả nhóm đã đồng ý.
60. Là chủ quán chưa nhập Người pha, tôi muốn mục đó ẩn hoàn toàn, để không công khai tên ai trước khi hỏi họ.
61. Là chủ quán, tôi muốn tự nhập email liên hệ trong Cấu hình, để trang pháp lý có kênh liên hệ mà tôi tự chọn.
62. Là chủ quán chưa nhập email, tôi muốn trang pháp lý dùng đường Zalo có sẵn làm kênh liên hệ, để trang vẫn đủ dùng.
63. Là chủ quán đăng ký Bot DUKIN, tôi muốn có địa chỉ trang Quyền riêng tư và trang Điều khoản sử dụng, để khai vào bản khai báo ứng dụng Teams.
64. Là người xét ứng dụng Teams, tôi muốn đọc được hai trang đó bằng tiếng Anh, để duyệt được hồ sơ.
65. Là Khách đọc trang Quyền riêng tư, tôi muốn biết chính xác hệ thống lưu những gì về tôi, để tự quyết có đặt hay không.
66. Là Khách đọc trang Quyền riêng tư, tôi muốn biết rõ Đơn hàng của tôi hiện trên nhóm Teams của công ty, để không bị bất ngờ khi đồng nghiệp nhìn thấy.
67. Là Khách đọc trang Điều khoản sử dụng, tôi muốn biết đây là quán tự phát của một nhóm đồng nghiệp chứ không phải dịch vụ của công ty, để hiểu đúng mình đang mua của ai.
68. Là Khách, tôi muốn chuyển giữa bản tiếng Việt và tiếng Anh ngay trên trang pháp lý, để đọc bản mình quen.
69. Là Khách, tôi muốn hai trang pháp lý trông cùng một quán với Trang bán, để tin đó là trang thật của quán.
70. Là lập trình viên bảo trì hệ thống, tôi muốn bộ token màu và chữ nằm ở một chỗ dùng chung, để đổi màu một lần là cả hai trang đổi theo.
71. Là lập trình viên bảo trì hệ thống, tôi muốn Trang bán được tách thành các thành phần theo từng khối, để sửa một khối không phải đọc cả tệp.
72. Là lập trình viên bảo trì hệ thống, tôi muốn phần gộp Bảng pha chế là hàm thuần ở tầng miền, để kiểm thử được mà không cần dựng giao diện.
73. Là lập trình viên bảo trì hệ thống, tôi muốn việc thêm cột vào Thực đơn không làm mất dữ liệu đang chạy, để cập nhật hệ thống mà không mất Món và Đơn hàng cũ.
74. Là lập trình viên bảo trì hệ thống, tôi muốn không thêm phụ thuộc mới nào, để bề mặt cần bảo trì không phình ra.

## Implementation Decisions

**Bản sắc và token dùng chung**

Bộ token màu và chữ tách thành một chỗ dùng chung cho cả Trang bán và Trang quản lý, thay cho hai bộ biến rời hiện nay. Palette lấy từ tờ thực đơn in: nền ngà, mực espresso, nhấn vàng đồng, cộng một màu đỏ tem chỉ dùng cho trạng thái cảnh báo và một màu xám nhôm cho ô chữ khi Món chưa có ảnh. Độ vàng của nền hạ xuống so với bản in để tránh sắc kem mặc định.

Bộ chữ ba vai: một mặt chữ Didone làm chữ hiển thị, mặt chữ thân hiện có giữ nguyên, thêm một mặt chữ đơn cách cho phiên âm, giá, mã Đơn hàng và các nhãn. Cả ba mặt chữ đã được kiểm là có bộ ký tự tiếng Việt. Hai mặt chữ hiển thị cũ bị loại khỏi danh sách tải.

**Trang bán**

Chuyển từ ba bước sang một trang cuộn liền, giữ riêng màn hoàn tất có mã QR. Thanh dính đáy hiện số ly và tổng tiền trong suốt quá trình cuộn.

Thẻ Món xếp theo thứ tự của bản in: số hiệu, ảnh vuông, tên Việt, rồi tên Pháp in nghiêng cùng dòng kèm phiên âm đơn cách, giá, mô tả, các Tùy chọn, cuối cùng là bộ tăng giảm và nút thêm.

Giá trên Trang bán dùng dạng viết tắt nghìn theo bản in. Trang quản lý và nội dung mã QR giữ dạng đầy đủ. Hai hàm định dạng khác nhau, dùng đúng chỗ.

Đặt lại đơn lần trước lưu ở máy Khách, gồm danh sách Món kèm Tùy chọn của lần đặt thành công gần nhất. Thẻ này chỉ hiện khi có dữ liệu cũ và mọi Món trong đó còn đang bán. Món đã bị ẩn hoặc xóa thì bỏ khỏi đơn dựng lại và nói rõ cho Khách.

Khung nhận hàng chuyển thành dải ngày ngang: chọn ngày trước, rồi chọn buổi trong ngày đó. Phạm vi ngày lấy từ Cấu hình, mặc định ba ngày thay cho bảy ngày viết cứng.

Mục Người pha ở cuối trang lấy danh sách từ Cấu hình, ẩn hoàn toàn khi Cấu hình để trống. Cuối trang có đường tới hai trang pháp lý.

Bỏ chặn phóng to trang. Thay toàn bộ emoji hệ thống bằng hình vẽ nội tuyến theo hệ chữ. Không làm chế độ tối, vì quán chỉ bán trong hai Khung nhận hàng ban ngày và thêm chế độ tối là thêm một bộ màu phải bảo trì mà không ai dùng.

**Trang quản lý**

Bốn tab ngang trên đỉnh chuyển thành điều hướng dính đáy. Bốn thẻ số liệu thu về một dòng gọn. Mỗi thẻ Đơn hàng chỉ còn một nút hành động chính, là bước chuyển trạng thái tiếp theo hợp lý theo bảng chuyển trạng thái đã có phía máy chủ, các bước còn lại nằm sau một nút mở rộng. Hủy đơn nằm trong nút mở rộng và có một lần xác nhận. Bảng chuyển trạng thái phía máy chủ không đổi, chỉ đổi cách bày ra.

Tab Đơn hàng có hai chế độ xem: danh sách Đơn hàng như hiện nay, và Bảng pha chế mới. Bảng pha chế gộp theo Khung nhận hàng rồi theo cặp Món và Tùy chọn, đếm số lượng, cộng tổng số ly mỗi Khung, và bỏ Đơn hàng đã hủy. Phần gộp là hàm thuần ở tầng miền phía máy chủ và trả qua một điểm cuối riêng, không tính ở web, để kiểm thử được ở điểm cắt cao nhất mà không cần thêm bộ chạy test cho web. Bảng pha chế chỉ để xem, không có ô tích đánh dấu đã pha, vì như vậy sẽ tạo ra nguồn sự thật thứ hai song song với Trạng thái Đơn hàng.

**Lược đồ dữ liệu**

Bảng Món thêm hai cột: phiên âm và đường dẫn ảnh, cả hai mặc định rỗng. Thêm cột bằng câu lệnh có kiểm tra sự tồn tại của cột trước khi thêm, để hệ thống đang chạy nâng cấp mà không mất dữ liệu.

Cấu hình thêm ba khóa: số ngày đặt trước mặc định ba, email liên hệ mặc định rỗng, danh sách Người pha mặc định rỗng. Danh sách Người pha để rỗng là quyết định có chủ ý: việc công khai tên người khác phải là một hành động chủ động của chủ quán, không phải mặc định của hệ thống.

**Hợp đồng API**

Điểm cuối Thực đơn công khai và Thực đơn quản lý trả thêm phiên âm và địa chỉ ảnh của mỗi Món. Điểm cuối lưu Món nhận thêm hai trường đó.

Thêm điểm cuối tải ảnh cho một Món, nhận ảnh dạng chuỗi base64 trong thân JSON. Không dùng multipart vì dự án chưa có phụ thuộc đó và quyết định là không thêm phụ thuộc mới. Ảnh được cắt vuông và nén thành WebP ngay trên máy Khách bằng canvas trước khi gửi, nên không cần thư viện xử lý ảnh phía máy chủ. Giới hạn kích thước thân yêu cầu được nâng vừa đủ cho một ảnh đã nén. Máy chủ kiểm tra loại ảnh và kích thước trước khi ghi, ghi vào thư mục dữ liệu đã được gắn ổ đĩa ngoài nên ảnh sống qua mỗi lần dựng lại, và phát ra qua bộ phát tệp tĩnh đã có sẵn ở một tiền tố riêng. Thêm điểm cuối xóa ảnh của một Món.

Thêm điểm cuối Bảng pha chế theo ngày.

Điểm cuối cấu hình công khai trả thêm danh sách Người pha và email liên hệ, để Trang bán và hai trang pháp lý dùng.

Việc tính Khung nhận hàng nhận số ngày đặt trước từ Cấu hình. Hàm tính đã có sẵn tham số này, chỉ cần truyền vào thay vì dùng giá trị mặc định.

**Hai trang pháp lý**

Hai tuyến đường mới cho trang Quyền riêng tư và trang Điều khoản sử dụng, đặt tên tuyến bằng tiếng Việt như các tuyến hiện có. Tiếng Việt là bản chính, có nút chuyển sang bản tiếng Anh ngay trên trang. Nội dung nêu đúng những dữ liệu hệ thống thật sự chạm vào: tên Khách, Vị trí giao, ghi chú, mã người dùng Teams trong Danh bạ Khách, và việc Bot DUKIN đăng Luồng Đơn hàng lên nhóm Teams của công ty. Chủ thể đứng tên là nhóm vận hành quán, kèm câu nói rõ đây không phải dịch vụ của công ty. Kênh liên hệ dùng email trong Cấu hình nếu có, nếu không thì dùng đường Zalo đã có. Hai trang dùng cùng bộ token với phần còn lại.

**Tổ chức mã nguồn**

Tệp thành phần Trang bán hiện gần bảy trăm dòng được tách theo từng khối của trang. Hai tệp CSS hiện mỗi tệp trên một nghìn dòng được rút về phần riêng của từng màn, phần chung chuyển vào tệp token. Không thêm phụ thuộc nào cho cả web và máy chủ.

## Testing Decisions

Test tốt ở dự án này kiểm hành vi quan sát được từ bên ngoài của một hàm thuần: đưa dữ liệu vào, khẳng định kết quả ra. Không kiểm cách hàm được viết bên trong, không kiểm thứ tự gọi, không dựng giao diện.

Prior art là bộ test hiện có của tầng miền tính Khung nhận hàng: dùng bộ chạy test có sẵn trong Node, khẳng định bằng thư viện assert chuẩn, mỗi test một tình huống, tên test viết bằng tiếng Việt mô tả hành vi. Bộ test mới theo đúng khuôn đó, không thêm bộ chạy test nào.

Ba mô đun được kiểm:

Mô đun tính Khung nhận hàng, đã có test, bổ sung tình huống số ngày đặt trước đến từ Cấu hình: giá trị mặc định, giá trị nhỏ hơn, giá trị không hợp lệ thì rơi về mặc định, và số lượng Khung sinh ra đúng theo số ngày.

Mô đun gộp Bảng pha chế, test mới: gộp đúng theo Khung nhận hàng, gộp đúng theo cặp Món và Tùy chọn, cộng đúng số lượng khi nhiều Đơn hàng chứa cùng một cặp, bỏ Đơn hàng đã hủy, tổng số ly đúng, danh sách rỗng trả về kết quả rỗng chứ không lỗi.

Mô đun nhận ảnh Món, test mới: chấp nhận loại ảnh cho phép, từ chối loại không cho phép, từ chối ảnh vượt kích thước, từ chối chuỗi base64 sai dạng, và sinh tên tệp không đụng nhau giữa hai lần tải.

Lớp giao diện web không có test tự động, vì dự án chưa có bộ chạy test cho web và quyết định là không thêm phụ thuộc. Nghiệm thu lớp giao diện bằng cách dựng chạy thật rồi chụp ảnh từng màn ở khổ điện thoại, gồm: Trang bán khi chưa có Món nào trong giỏ, khi đã có Món, màn hoàn tất có mã QR, Trang quản lý ở chế độ danh sách Đơn hàng, Trang quản lý ở chế độ Bảng pha chế, và hai trang pháp lý. Kiểm thêm bằng tay: phóng to được bằng hai ngón, thấy rõ ô đang chọn khi dùng bàn phím, và trang đứng yên khi bật chế độ giảm chuyển động.

## Out of Scope

Bản khai báo ứng dụng và bộ hình đại diện cho Bot DUKIN trên Microsoft Teams. Hai trang pháp lý là điều kiện cần cho việc đăng ký đó, nhưng bản khai báo nằm ngoài phạm vi giao diện.

Hệ thống nhiều người dùng cho Trang quản lý. Hiện vẫn là một mật khẩu duy nhất, hệ thống không ghi ai chuyển trạng thái Đơn hàng nào. Bốn Người pha chỉ là danh sách để giới thiệu ở cuối Trang bán, không phải bốn tài khoản.

Phân loại Món. Thực đơn có bốn Món nên chưa cần, và thêm bây giờ là thêm một khái niệm rỗng.

Ô tích đánh dấu đã pha trong Bảng pha chế.

Chế độ tối.

Thay đổi bảng chuyển trạng thái Đơn hàng phía máy chủ, thay đổi nội dung tin nhắn của Luồng Đơn hàng trên Teams, thay đổi cách sinh mã QR, và thay đổi cách xác thực Trang quản lý.

Thêm bất kỳ phụ thuộc mới nào cho web hoặc máy chủ, gồm cả khung CSS, thư viện thành phần, thư viện hiệu ứng, thư viện xử lý ảnh và bộ chạy test cho web.

## Further Notes

Việc rút số ngày đặt trước từ bảy xuống ba là thay đổi hành vi bán hàng, không phải thay đổi giao diện. Nó nằm trong Cấu hình để chủ quán tự nâng lại nếu quán từng nhận đơn cho cả tuần.

Danh sách Người pha để mặc định rỗng là quyết định có chủ ý. Việc công khai tên ba đồng nghiệp trên một trang truy cập được từ Internet cần họ đồng ý trước, và điều đó không phải việc phần mềm quyết được.

Ảnh Món chỉ phát huy tác dụng khi chủ quán thật sự chụp bốn tấm ảnh. Trước đó, Món hiển thị bằng ô chữ và Trang bán sẽ trông trống hơn bản hiện tại. Đây là mặt trái đã được nêu và chấp nhận.

Một trang cuộn liền dài hơn ba bước tách rời. Thanh dính đáy là cách bù. Nếu đo thực tế thấy trang quá dài, đường lùi là chia lại bước, và quyết định đó nên dựa trên hành vi Khách thật chứ không dựa trên cảm giác.

Đây là viết lại lớp giao diện, không phải chỉnh sửa dần. Bản hiện tại sẽ không còn nhận ra được.

Thứ tự làm được đề nghị: token và tách tệp trước, rồi Trang bán, rồi Trang quản lý, rồi hai trang pháp lý. Sau khi xong Trang bán thì dựng chạy thật và chụp ảnh để soát trước khi đi tiếp, để nếu lệch hướng thì chỉ mất một phần công.
