# CORTIS BRB HUB — GitHub + Netlify

Giao diện V8.3 đã chốt, chạy dạng site tĩnh. Các tính năng dành cho fan (copy, điểm danh, streak, history) lưu trên **trình duyệt riêng**.

## Deploy lần đầu

1. Tạo repository GitHub **mới** (ví dụ `cortis-brb-hub`) và upload **toàn bộ nội dung thư mục** của gói ZIP vào nhánh `main` (không upload mỗi `index.html`).
2. Netlify: **Add new project → Import an existing project → GitHub** → chọn repository.
3. Netlify nhận `netlify.toml`. Nếu phải điền thủ công, `Publish directory` = `site`, `Build command` = để trống, `Functions` = `netlify/functions`.
4. Vào **Project configuration → Environment variables**, tạo 4 biến bên dưới. Đặt scope có **Functions**:
   - `ADMIN_PASSWORD` — tự tạo mật khẩu dài, khó đoán; không dùng `demo123`.
   - `GITHUB_TOKEN` — GitHub fine-grained personal access token, chỉ cấp quyền **Contents: Read and write** cho **đúng repository này**.
   - `GITHUB_REPO` — dạng `ten-github/ten-repository` (ví dụ `abc/cortis-brb-hub`).
   - `GITHUB_BRANCH` — `main`.
5. **Trigger deploy/redeploy** sau khi thêm biến môi trường. Mở website Netlify và test Admin.

**Quan trọng:** Không đưa mật khẩu hay GitHub token vào repository, vào mã JavaScript, vào chat công khai hoặc screenshot.

## Cập nhật kho comment

Đăng nhập Admin trên website → chọn file `.csv` hoặc `.json`. Cửa sổ chọn file có thể hiển thị mọi định dạng nhưng hệ thống **chỉ xử lý CSV UTF-8/JSON**. Nếu có Excel `.xlsx`, dùng **Save As → CSV UTF-8** trước.

CSV có 4 cột:

```csv
id,language,content,translation
EN-004,en,Love the energy of CORTIS.,Mình yêu năng lượng của CORTIS.
KR-004,ko,CORTIS의 무대가 정말 좋아요.,Mình rất thích sân khấu CORTIS.
```

`id` có thể để trống để tự cấp ID. `language` là `en` hoặc `ko`. Không có comment trùng trong mỗi ngôn ngữ. Admin nhập dữ liệu sẽ tạo commit trên GitHub, sau đó Netlify triển khai lại website.

**Hiện ZIP chỉ có 6 comment mẫu** (3 EN + 3 KO) để test. Bạn cần import 600 comment thực tế sau khi website được deploy.

## Đổi ảnh nền

Admin → upload ảnh JPG, PNG, WEBP tối đa 4 MB → Netlify Function cập nhật `site/assets/background.*` và `site/data/settings.json` lên GitHub → Netlify deploy mới. Có thể căn ảnh bằng các nút trong Admin.

**Lưu ý:** Trang thử ảnh trên bản demo đã được bỏ khỏi website công khai. Chỉ admin có thể thay ảnh cho tất cả người xem.

## Giới hạn & vận hành

- Site tĩnh miễn phí trong hạn mức Netlify Free; Netlify Functions và deploy tiêu tốn quota theo gói hiện hành.
- Tính năng Admin chỉ hoạt động sau khi kết nối GitHub/Netlify và cấu hình 4 biến môi trường; mở `index.html` trực tiếp trên máy không chạy được Admin thực.
- Lịch sử fan lưu theo trình duyệt (localStorage), không đồng bộ nhiều thiết bị. Trình duyệt xóa dữ liệu thì lịch sử có thể mất.
- Số ngày điểm danh dựa trên **copy thành công** trong website, không xác minh đã bình luận trên X.
- Dashboard thống kê tổng cộng toàn fandom **chưa có**. Đây là tính năng cần backend sự kiện riêng.
- Mật khẩu admin gửi qua HTTPS đến Function ở mỗi thao tác; chỉ dùng qua Netlify HTTPS. Bản cơ bản chưa có chống brute-force nâng cao hoặc phân quyền nhiều admin; cần bổ sung nếu dự án lớn.
- Không mở nhiều phiên Admin cập nhật đồng thời vì có thể gặp xung đột commit.
- Không thay đổi ID của comment đang lưu nếu muốn giữ lịch sử fan.
- Link X CORTIShield trong mã là link mẫu, xác minh đúng tài khoản trước khi public.
- Ảnh mặc định đang lấy từ nguồn bên ngoài; tốt nhất upload ảnh có quyền sử dụng ngay sau triển khai.

## Cấu trúc

```text
site/index.html                    giao diện web V8.3
site/data/comments-en.json        kho tiếng Anh
site/data/comments-ko.json        kho tiếng Hàn
site/data/settings.json           cấu hình ảnh
netlify/functions/admin-publish.mjs  quản trị có xác thực, ghi file vào GitHub
netlify.toml                       cấu hình deploy
```
