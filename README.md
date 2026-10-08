# CV website - Nguyễn Ngọc Doanh

Trang CV tĩnh (HTML, CSS, một file JS viết tay), không cần build, không dùng thư viện ngoài.
Giao diện nền tối, nhiều hiệu ứng: mạng điểm nối nhau theo chuột, chữ tự gõ, sơ đồ luồng dữ liệu
có chấm chạy, số đếm lên, dòng thời gian tự vẽ khi cuộn, thẻ dự án nghiêng 3D, vòng kỹ năng.

```
index.html          Bản tiếng Việt
en/index.html       Bản tiếng Anh
style.css           Giao diện, dùng chung
script.js           Hiệu ứng, dùng chung
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

- Mức kỹ năng (vòng tròn): `style="--p:80"` là phần trăm (4/5 = 80, 3/5 = 60), và số hiển thị trong `<b>4<small>/5</small></b>`.
- Ngoại ngữ (thanh ngang): `style="--w:40%"`.
- Số đếm ở phần mở đầu: `data-count="25"` (ghi cả số trong thẻ để tắt JS vẫn đúng).
- Chữ tự gõ: thuộc tính `data-words` của thẻ `.typed`.

CV PDF được xuất từ `CV_Nguyen_Ngoc_Doanh.html` và `CV_Nguyen_Ngoc_Doanh_EN.html` ở thư mục cha:
mở bằng Chrome hoặc Edge, nhấn Ctrl+P, chọn Lưu dưới dạng PDF, bỏ chọn "Đầu trang và chân trang",
rồi chép đè vào `assets/cv/` (đổi tên bản tiếng Việt thành `..._VI.pdf`).
Hoặc chạy `node tools/cdp.mjs pdf CV_Nguyen_Ngoc_Doanh.html <file.pdf>` ở thư mục cha.

Máy công ty có DRM: tắt DRM trước khi xuất PDF và đẩy lên GitHub, nếu không file sẽ bị mã hoá và không mở được.
Kiểm tra nhanh: mở file PDF bằng Notepad, dòng đầu phải là `%PDF`, không phải `DRMONE`.
