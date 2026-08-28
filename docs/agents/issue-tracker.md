# Issue tracker: GitHub

Issue và đặc tả của repo này sống trên GitHub Issues. Dùng CLI `gh` cho mọi thao tác.

## Quy ước

- Tạo issue: `gh issue create --title "..." --body "..."`. Dùng heredoc cho nội dung nhiều dòng.
- Đọc issue: `gh issue view <số> --comments`, lọc bình luận bằng `jq`, đồng thời lấy nhãn.
- Liệt kê issue: `gh issue list --state open --json number,title,body,labels,comments --jq '[.[] | {number, title, body, labels: [.labels[].name], comments: [.comments[].body]}]'` kèm bộ lọc `--label` và `--state` phù hợp.
- Bình luận: `gh issue comment <số> --body "..."`
- Gán / gỡ nhãn: `gh issue edit <số> --add-label "..."` / `--remove-label "..."`
- Đóng: `gh issue close <số> --comment "..."`

Suy ra repo từ `git remote -v`; `gh` tự nhận khi chạy trong bản clone.

## Pull request như bề mặt triage

**PRs as a request surface: no.** (Đặt thành `yes` nếu repo coi PR từ bên ngoài là yêu cầu tính năng; `/triage` đọc cờ này.)

Khi đặt `yes`, PR đi qua cùng bộ nhãn và trạng thái như issue, dùng lệnh `gh pr` tương ứng:

- Đọc PR: `gh pr view <số> --comments` và `gh pr diff <số>` cho phần diff.
- Liệt kê PR ngoài để triage: `gh pr list --state open --json number,title,body,labels,author,authorAssociation,comments`, chỉ giữ `authorAssociation` là `CONTRIBUTOR`, `FIRST_TIME_CONTRIBUTOR` hoặc `NONE` (bỏ `OWNER` / `MEMBER` / `COLLABORATOR`).
- Bình luận / nhãn / đóng: `gh pr comment`, `gh pr edit --add-label` / `--remove-label`, `gh pr close`.

GitHub dùng chung một dải số cho issue và PR, nên `#42` có thể là cả hai: phân giải bằng `gh pr view 42` rồi fallback sang `gh issue view 42`.

## Khi skill nói "xuất bản lên issue tracker"

Tạo một GitHub issue.

## Khi skill nói "lấy ticket liên quan"

Chạy `gh issue view <số> --comments`.

## Thao tác wayfinding

Dùng bởi `/wayfinder`. Bản đồ (map) là một issue duy nhất, các ticket là issue con (child).

- Bản đồ: một issue duy nhất mang nhãn `wayfinder:map`, phần thân chứa Notes / Decisions-so-far / Fog. Tạo bằng `gh issue create --label wayfinder:map`.
- Ticket con: issue liên kết với bản đồ dưới dạng GitHub sub-issue (`gh api` trên endpoint sub-issues). Khi sub-issue không bật được, thêm con vào task list trong thân bản đồ và đặt `Part of #<bản-đồ>` ở đầu thân ticket con. Nhãn: `wayfinder:<loại>` (`research` / `prototype` / `grilling` / `task`). Khi đã nhận việc, gán ticket cho dev đang điều hành.
- Chặn: dùng quan hệ phụ thuộc gốc (native issue dependencies) của GitHub, biểu diễn chính thống, nhìn thấy được trên giao diện. Thêm cạnh bằng `gh api --method POST repos/<owner>/<repo>/issues/<con>/dependencies/blocked_by -F issue_id=<db-id-của-blocker>`, trong đó `<db-id-của-blocker>` là id cơ sở dữ liệu số của blocker (`gh api repos/<owner>/<repo>/issues/<n> --jq .id`, không phải `#number` hay `node_id`). GitHub báo qua `issue_dependencies_summary.blocked_by` (chỉ blocker còn mở, là cổng sống). Khi không dùng được phụ thuộc, fallback bằng dòng `Blocked by: #<n>, #<n>` ở đầu thân ticket con. Ticket hết bị chặn khi mọi blocker đã đóng.
- Truy vấn biên (frontier): liệt kê issue con còn mở của bản đồ (`gh issue list --state open`, giới hạn theo sub-issue / task list của bản đồ), bỏ mọi ticket còn blocker mở (`issue_dependencies_summary.blocked_by > 0`, hoặc issue mở trong dòng `Blocked by`) hoặc đã có người nhận; ticket đầu tiên theo thứ tự bản đồ thắng.
- Nhận việc: `gh issue edit <n> --add-assignee @me`, là lệnh ghi đầu tiên của phiên.
- Giải quyết: `gh issue comment <n> --body "<câu trả lời>"`, rồi `gh issue close <n>`, rồi nối một con trỏ ngữ cảnh (gist + liên kết) vào Decisions-so-far của bản đồ.
