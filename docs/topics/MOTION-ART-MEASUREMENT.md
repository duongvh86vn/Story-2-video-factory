# Đo atlas Lila/Karo bằng vùng chọn rõ ràng

Ngày 07/10/2026. Source `8998b39`, sửa `7f7b28b`/`9cc8b63`. Đây là công cụ authoring ảnh tĩnh và bằng chứng chọn vùng, không nghiệm thu chuyển động hoặc video. Lila/Karo vẫn **candidate-needs-correction-unregistered**, `productionReady=false`, `productionRig=null`.

## Input, output và giới hạn

`packages/motion/measure.ts` nhận PNG thật và JSON `actor-motion-measure-layout-1`, gồm SHA-256 của PNG, các frame rectangle nguyên pixel và vùng con frame-local. ID frame/vùng phải duy nhất; frame/vùng có bounds rõ, tổng sampling ≤64 triệu pixel. PNG ≤16 MiB, decode RGBA đúng kích thước; JSON ≤2 MiB. Không tự chia lưới theo prompt, tìm người/khớp hay đoán mặt đất. Sai hash/bounds/threshold phải dừng trước xuất artifact.

Runner nhẹ `apps/cli/art-tools.ts` không import coordinator/model/TTS. Command tương tự cũng có ở CLI chung nhưng dùng runner nhẹ cho authoring. Output bất biến gồm raw `source.png` giữ đúng bytes nguồn, `report.json` và worksheet SVG phân trang 16 ô. Mỗi ô có clip native riêng; SVG chỉ tham chiếu `source.png` tương đối, không JS/timer. Không ghi vào assets/input/scenes/output/renders/artifacts/work/previews/logs, không đổi project/config/catalog/clock/lock/approval.

Layout và regions là lựa chọn của người author. `upper-band` và `lower-left-band`/`lower-right-band` chỉ là cửa sổ pixel; không là đầu hoặc chân đã được nhận dạng. Alpha bounds không xác định contact/sole/shoulder/face, không chứng minh artwork không cắt tóc ở một alpha khác. Không dùng đầu ra để tự sinh `anchors` hoặc đăng ký motion.

## Artifact hiện hành

| PNG thực | Layout chọn thủ công | Báo cáo và hình đọc tĩnh |
|---|---|---|
| Lila v3, 1254×1254 | [layout](../../library/topics/prehistoric-life/motion-studies/lila-present-right-v3.measure-layout.json) | [JSON](reviews/lila-present-right-v3-alpha-v2/report.json), [SVG](reviews/lila-present-right-v3-alpha-v2/worksheet-01.svg), [figure PNG](reviews/lila-present-right-v3-alpha-v2/worksheet-01.png) |
| Karo v2, 1437×1095 | [layout v2](../../library/topics/prehistoric-life/motion-studies/karo-present-left-v2.measure-layout-v2.json) | [JSON](reviews/karo-present-left-v2-alpha-v2/report.json), [SVG](reviews/karo-present-left-v2-alpha-v2/worksheet-01.svg), [figure PNG](reviews/karo-present-left-v2-alpha-v2/worksheet-01.png) |

Ngưỡng alpha 128. Không frame hiện hành nào có pixel vượt ngưỡng chạm mép ô. Lila occupancy height 305–306 px, hai vùng dưới có outer-left x=99–100, outer-right exclusive x=216–217, lower occupied-bottom y=307–308. Karo height 255–258 px, x=137–140 / 249–252, y=262–264. Tất cả tọa độ frame-local; các range là quan sát pixel, chưa là sai số anatomical landmark hoặc ground contact sau placement. Các ô không cùng kích thước; không scale từng frame theo bounds để che tỷ lệ trôi.

Vùng chọn Karo đầu tiên dùng y boundaries `[0,274,548,821,1095]`; ở hàng 3–4 cắt qua tóc frame sau. Controller đọc alpha các dải quanh ranh giới: y265–278, 537–548, 807–819 không có pixel ≥128; chọn lại `[0,272,543,813,1095]`. Đây là quyết định author dựa trên pixel, không code detector/chứng nhận layout native. X boundaries giữ `[0,359,719,1078,1437]`. Lila chọn x `[0,314,627,940,1254]`, y `[0,314,627,941,1254]`. Layout final phải còn được kiểm landmark, silhouette và toàn bộ frame.

Các artifact `*-alpha-v1` được giữ làm lịch sử **superseded**: Karo có ranh giới sai, worksheet cả hai chưa clip PNG ngoài ô. Không dùng v1 để nhận xét ảnh gốc bị mất chân. Figure v2 được raster từ worksheet, chỉ nhúng raw PNG dưới dạng data URL trong buffer tạm để Sharp đọc; SVG và raw PNG đã lưu giữ nguyên. Không phải PNG production hoặc render/MP4 acceptance.

## Chạy authoring và môi trường

Windows, Node ≥22.13, Sharp từ dependency lock của repo. Các lệnh sau đo ảnh thật, không chạy tests/provider/audio/video. Chọn output version mới nếu đổi source, layout, threshold hoặc source worksheet; output cùng path chỉ idempotent khi bytes không đổi.

```powershell
Set-Location -LiteralPath 'C:/Users/Duongvh-pc/.codex/worktrees/stickman-acting-v22/Story-2-video-factory2.1'
npm run art:tools -- motion-measure . `
  library/topics/prehistoric-life/motion-studies/lila-present-right-v3.png `
  --layout library/topics/prehistoric-life/motion-studies/lila-present-right-v3.measure-layout.json `
  --output docs/topics/reviews/lila-present-right-v3-alpha-v2
npm run art:tools -- motion-measure . `
  library/topics/prehistoric-life/motion-studies/karo-present-left-v2.png `
  --layout library/topics/prehistoric-life/motion-studies/karo-present-left-v2.measure-layout-v2.json `
  --output docs/topics/reviews/karo-present-left-v2-alpha-v2
```

Mốc `9cc8b63`: fresh full build, test:typecheck và schema export exit 0, diff check clean. **4 measurement declarations NOT RUN**; 3 anchor và 42 speech declarations trước đó vẫn NOT RUN. Review source độc lập đã hoàn tất sau sửa; không rerun controller checks, không approve art/runtime. Actual authoring đã gọi measurement runner và raster tài liệu; không gọi production pipeline/CLI/API, test callback/fixture/assertion, GSAP playback, browser, TTS/ASR hoặc render/MP4 nghiệm thu. [Review đầy đủ](reviews/motion-art-measurement-source-review-v1.md), [bàn giao test](SPRITE-MOTION-TEST-HANDOFF.md).

## Việc tiếp theo cho sản phẩm

Hai sheet mới vẫn còn limb/cloth/rest drift theo [Gemini static advice v2](reviews/motion-atlas-static-advice-v2.json). Giữ màu ấm và source identity, ổn định chiều dài chi và khuỷu mềm; không áp dụng yêu cầu góc sắc trái với mẫu người dùng. Đo landmark và anchor thực sau khi bản vẽ đủ tốt, author frame order/native clock/once-hold, rồi bổ sung mouth variants, các pose/view, gaze, props/contact/handoff và art/motion receipts. Chưa có API image-to-video; tiếp tục code/art workflow hiện có. Full tool vẫn script nguyên văn / WAV giữ audio-clock / story→script trung thành→video, EN/VI/JA/KO, diễn viên trong truyện. Tất cả còn phải nghiệm thu bằng model test được giao, không dùng phép đo tĩnh này mở final.
