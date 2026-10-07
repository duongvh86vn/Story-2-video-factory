# Thử nghiệm mesh vải v1 — rejected, không import vào renderer

Không dùng file này trong pipeline. Đây là lịch sử thử hướng sửa opacity ghosting
của garment ngồi. Mesh native SVG dùng 4×2 cell/16 triangle mỗi view, giữ eo và
xoay lap theo góc đùi; ảnh PNG alpha không bị sửa.

Self-inspection `restored-rejected-v1.jpg` cho thấy mapping folded → standing bị
gấp méo, một ống quần/vạt váy kéo xuống thành mảnh nhỏ; có đường seam tam giác.
Loại bản này thay vì coi hết transparency là đã đạt.

Việc tiếp theo: đo correspondence eo/hông/crotch/cuff giữa artwork đứng và ngồi,
tạo contour/UV topology tương thích hoặc authored inbetweens; một silhouette
đục với một gấu ngoài, không alpha fade hai bộ viền. Skinning phải theo từng
thigh/hip, giữ mông trên support, không co toàn váy thành mảnh bên một chân.
Kiểm Jacobian/seam và vertex interpolation trong cả chiều enter/recover; không
gỡ production guard khi mới đẹp ở pose cuối.

Code prototype giữ để tham khảo phép affine và kiểm sai số tại UV vertices,
chưa được chạy unit/runtime acceptance. Không reset journal review cũ.
