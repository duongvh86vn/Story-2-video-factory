# Sprite story compositor — source review

Ngày 07/10/2026. Phạm vi `e40bdfc..3a403a8`, fix `3a403a8..8b4b930`. Reviewer độc lập Hegel; chỉ đọc source và test declarations. Không chạy assertions, GSAP, browser, render, audio hoặc pipeline. Đây là source milestone actor fragment; renderer canonical và production release vẫn còn công việc.

## Finding accumulator

| Finding | Mức | Sửa tại `8b4b930` | Trạng thái |
|---|---|---|---|
| Stage clip mở rộng truyền vào strict SpriteClipSchema | Important | Project rõ fields base thành playbackClip ở mọi player boundary; giữ cả hai schema strict | Source resolved, reviewer xác nhận |
| Clip IDs hợp lệ có thể trùng wrapper/root/frame IDs | Important | DOM dùng ordinal global + role namespace tách biệt; public clip ID chỉ trong data/report; thêm test IDs gây collision | Source resolved, reviewer xác nhận |
| Nested cinematic/performance shot ID chưa được so với Shot | Important | Kiểm cinematic.shotId, primary và supporting performance.id; test mismatch riêng | Source resolved, reviewer xác nhận |
| Effect ordering so raw clock thay vì renderer cell | Minor | So clock lượng tử hóa; cùng cell hợp lệ, cell trước bị chặn | Source resolved, reviewer xác nhận |
| GSAP parity declarations chỉ xem X/slot, contact dùng identity root | Minor | X/Y/rotation/scale + active frame, contact qua rotated/scaled root | Resolved ở mức khai báo; runtime NOT RUN |
| Controller phát hiện AttrPlugin làm tròn interior transform 4 decimals | Controller source finding | Sampler dùng precision của GSAP 3.15.0 đã cài, giữ endpoint/static nguyên | Source resolved, reviewer xác nhận |

Nhận định ban đầu của reviewer: không có lỗi Critical mới, nhưng giữ source-ready push/merge đến khi Important được sửa. Build/typecheck không thể phát hiện việc strict parser từ chối value hay selector collision khi chạy.

## Verification do controller thực hiện

Trên source fix `8b4b930`: `npm run build` exit 0 (core TypeScript, Studio typecheck, Vite 7.3.6); `npm run test:typecheck` exit 0; `npm run schemas` exit 0; `git diff --check` không báo lỗi. Các lệnh type/build/schema không gọi test callbacks. Đã chuẩn bị 12 stage tests và 8 binding tests; tất cả runtime **NOT RUN**.

## Gate

Focused re-review của Hegel trên `3a403a8..8b4b930` và context trực tiếp: source milestone ready để push, không còn finding Critical/Important. Các finding ban đầu được giữ trong bảng, không bị xóa bởi verdict sau. Đây không phải approval production hoặc merge vào nhánh chính.

Không có chứng nhận art/identity/fluidity/foot support/speech, không có video mới hoặc bằng chứng đạt mẫu. Không thay topic `productionReady=false`/`productionRig=null`, không fake rig metrics, không mở final.
