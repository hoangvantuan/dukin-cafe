# Tài liệu miền (Domain Docs)

Cách các skill kỹ thuật tiêu thụ tài liệu miền của repo này khi khám phá mã nguồn.

## Trước khi khám phá, đọc các file sau

- `CONTEXT.md` ở gốc repo. Repo này là đơn ngữ cảnh: không có `CONTEXT-MAP.md`.
- `docs/adr/`: đọc các ADR chạm tới vùng sắp làm việc.

Nếu file nào không tồn tại, im lặng tiếp tục. Đừng báo thiếu; đừng gợi ý tạo trước. Skill `/domain-modeling` (đi qua `/grill-with-docs` và `/improve-codebase-architecture`) sẽ tạo chúng một cách lười khi thuật ngữ hoặc quyết định thực sự được chốt.

## Cấu trúc file

Repo đơn ngữ cảnh (phần lớn repo):

```
/
├── CONTEXT.md
├── docs/adr/
│   ├── 0001-tu-van-hanh-docker-compose.md
│   ├── 0002-bot-teams-thay-vi-webhook.md
│   └── 0003-bo-khung-nhan-hang.md
└── src/
```

## Dùng từ vựng của bảng thuật ngữ

Khi output gọi tên một khái niệm miền (trong tiêu đề issue, đề xuất tái cấu trúc, giả thuyết, tên test), dùng thuật ngữ đúng như định nghĩa trong `CONTEXT.md`. Đừng trôi sang từ đồng nghĩa mà bảng thuật ngữ né tránh.

Nếu khái niệm cần dùng chưa có trong bảng thuật ngữ, đó là tín hiệu: hoặc bạn đang phát minh ngôn ngữ dự án không dùng (cân nhắc lại), hoặc có khoảng trống thật (ghi chú lại cho `/domain-modeling`).

## Báo xung đột ADR

Nếu output của bạn mâu thuẫn với một ADR hiện có, nêu rõ thay vì ghi đè ngầm:

> Mâu thuẫn ADR-0003 (bỏ khung đặt hàng), nhưng đáng mở lại vì...
