# CV website - Nguyễn Ngọc Doanh

Trang CV tĩnh (HTML, CSS, một file JS viết tay), không cần build, không dùng thư viện ngoài.
Giao diện nền tối, nhiều hiệu ứng: chữ tự gõ, sơ đồ luồng dữ liệu có chấm chạy, số đếm lên,
dòng thời gian tự vẽ khi cuộn, thẻ dự án nghiêng 3D.

Điểm nhấn pixel art (kiểu Stardew Valley nhưng mang chất công nghệ):
- Trời sao pixel ở phần mở đầu, gần con trỏ thì các sao nối thành mạng; thỉnh thoảng có sao băng.
- Dải phong cảnh đêm: nhà xưởng, cột điện kéo cáp, gói dữ liệu chạy trên dây vào tủ máy chủ SQL.
- Nhân vật đi trên cỏ, bấm vào (hoặc Tab rồi Enter) để mở hộp thoại kiểu game, Esc để đóng.
- Biểu tượng pixel, thanh cấp độ kỹ năng 5 ô, mèo đuổi bit dữ liệu ở chân trang.
- Khối vuông gom thành hình: chân dung pixel ở đầu trang (khi chưa có `avatar.jpg`, bấm đúp để gom lại),
  huy chương, chip AI, quyển sách ở phần Học vấn. Rê chuột vào thì các khối dạt ra rồi quay về.
- Nổ pixel vòng tròn đồng tâm: khi hình gom xong, khi bấm chuột, khi thanh kỹ năng đầy.
- Doanh dẫn đường: cuộn qua ảnh chân dung thì ảnh vỡ thành khối, bay xuống góc trái và thành nhân vật đứng trên
  bệ nổi. Mỗi phần nói một câu, có thanh tiến độ "Phần x/6", tới Liên hệ thì ăn mừng và hiện nút Tải CV, Gửi email.
  Cuộn lên đầu thì bay về thành ảnh. Bấm vào nhân vật để ẩn hoặc hiện lời thoại.
- Thẻ "STAGE 0X" ghép từ khối vuông trên mỗi phần, thông báo "Thành tựu mở khóa" ở góc phải,
  trời ửng bình minh khi cuộn gần cuối.
- Mã bí mật: gõ ↑↑↓↓←→←→BA (hoặc bấm nhanh 5 lần vào nhân vật) để có mưa khối vuông.

```
index.html          Bản tiếng Việt
en/index.html       Bản tiếng Anh
style.css           Giao diện, dùng chung
script.js           Hiệu ứng, dùng chung
pixel.css           Khung pixel, hộp thoại, thanh cấp độ kỹ năng
sprites.js          Hình pixel vẽ bằng lưới ký tự (biểu tượng, nhân vật, cây, mèo) và bảng màu
pixel.js            Vẽ trời sao, dải phong cảnh, nhân vật, hộp thoại, biểu tượng pixel, bãi cỏ, nổ vòng, khối gom
guide.js            Doanh dẫn đường ở góc màn hình
extras.js           Thẻ STAGE, thông báo thành tựu, bình minh, mã bí mật
favicon.svg         Biểu tượng tab
assets/cv/          CV PDF (tiếng Việt, tiếng Anh)
avatar.jpg          Ảnh chân dung (tự thêm vào; chưa có thì hiện chữ ND)
.nojekyll           Để GitHub Pages không xử lý Jekyll
```

Tắt JavaScript trang vẫn hiện đủ nội dung. Máy bật "giảm chuyển động" (reduce motion) thì hiệu ứng tự tắt.

## Đưa lên GitHub Pages

1. Tạo repo tên `<tài-khoản>.github.io` trên GitHub (web sẽ có địa chỉ `https://<tài-khoản>.github.io`).
2. Đẩy nội dung thư mục này lên nhánh `main`:

   ```bash
   cd website
   git init
   git config user.name "Nguyen Ngoc Doanh"
   git config user.email "doanh.nn.work@gmail.com"
   git add .
   git commit -m "CV website"
   git branch -M main
   git remote add origin https://github.com/<tài-khoản>/<tài-khoản>.github.io.git
   git push -u origin main
   ```

3. Vào Settings → Pages, chọn Deploy from a branch, nhánh `main`, thư mục `/ (root)`, bấm Save.

Bản tiếng Anh nằm ở `https://<tài-khoản>.github.io/en/`.

## Ảnh chân dung

Đặt ảnh tên `avatar.jpg` ngay trong thư mục này (cạnh `index.html`). Nên dùng ảnh vuông hoặc dọc, khoảng 600x600 px trở lên.
Ảnh hiện trong khung tròn ở phần mở đầu, và cũng được CV PDF dùng khi xuất lại.

## Sửa nội dung

Sửa thẳng trong `index.html` và `en/index.html`. Nhớ sửa cả hai bản.

- Mức kỹ năng (thanh 5 ô): số ô có `class="on"` là mức, sửa cả chữ `LV 4<small>/5</small>` và `aria-label`.
  Biểu tượng chọn bằng `data-px` (tên hình trong `sprites.js`, ví dụ `py`, `db`, `js`).
- Câu thoại của nhân vật: các thẻ `<li>` trong `<ul class="dlg-lines">` ở cuối trang.
- Lời của Doanh dẫn đường: `<ul class="g-lines">`, mỗi `<li data-for="...">` ứng với `id` của một phần
  (`top` là câu chào, `konami` là câu khi gõ mã bí mật).
- Tên các thành tựu: mảng `ACH` trong `extras.js`.
- Hình gom từ khối vuông: `<canvas class="badge-art" data-art="ai">`, tên hình nằm trong `PX.art` của `sprites.js`.
- Vòng GPA ở phần Học vấn: `style="--p:81.75"` là phần trăm.
- Ngoại ngữ (thanh ngang): `style="--w:40%"`.
- Số đếm ở phần mở đầu: `data-count="25"` (ghi cả số trong thẻ để tắt JS vẫn đúng).
- Chữ tự gõ: thuộc tính `data-words` của thẻ `.typed`.

CV PDF được xuất từ `CV_Nguyen_Ngoc_Doanh.html` và `CV_Nguyen_Ngoc_Doanh_EN.html` ở thư mục cha:
mở bằng Chrome hoặc Edge, nhấn Ctrl+P, chọn Lưu dưới dạng PDF, bỏ chọn "Đầu trang và chân trang",
rồi chép đè vào `assets/cv/` (đổi tên bản tiếng Việt thành `..._VI.pdf`).
Hoặc chạy `node tools/cdp.mjs pdf CV_Nguyen_Ngoc_Doanh.html <file.pdf>` ở thư mục cha.

Máy công ty có DRM: tắt DRM trước khi xuất PDF và đẩy lên GitHub, nếu không file sẽ bị mã hoá và không mở được.
Kiểm tra nhanh: mở file PDF bằng Notepad, dòng đầu phải là `%PDF`, không phải `DRMONE`.
