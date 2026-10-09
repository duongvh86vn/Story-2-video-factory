# Đường nối và luồng theo hình đang vẽ — source0.87

`forest-tribe-0.87-projected-relations`, producer `story-direction-2.2.50`, cinematic models `2.2.7`. Tiếp nối [contact frame source0.86](EMITTED-CONTACT-HANDOFF.md). Đây là source candidate, **chưa nghiệm thu runtime, video hoặc toàn tool**.

## Phần đã viết

- `projectedModelGeometry` nhận storyboard/narration đúng revision, compilation thực của từng diễn viên và canonical bake do renderer cung cấp. Fixed parent dùng stage; independent owned dùng chính kênh translate/rotate/scale đã serialize; canonical dùng chính clock/center bake đang vẽ. Chỉ áp dụng parent một lần. Không tự chạy compiler hoặc thay bằng physical center gần giống.
- Center và bốn góc bounds của `contactFrame` được biến đổi qua ma trận whole glyph sau projection. Đường nối cắt tia tại declared quadrilateral của chính hai đối tượng; không bám vào part center cũ. Bounds là khai báo, không phải contour/occlusion đã chứng minh. Legacy endpoint dùng logical rectangle, không suy luận silhouette; nếu legacy endpoint có whole-world motion thì phải khai báo frame riêng trước khi dùng đường nối mới.
- Quan hệ có ít nhất một endpoint `contactFrame` dùng một quadratic SVG path và arrow path. Các mốc thực từ model matrix, actual emitted owner, canonical bake và world event được giữ. Refine tại midpoint với probe `.17/.5/.83`, so mỗi vertex với nội suy complex-string của GSAP. Gap cố định `.2px`, depth tối đa12, tối đa12000 retained frames; vượt giới hạn phải báo `needs-source-prop-binding`, không cắt hoặc nới tolerance. Giới hạn này có thể chặn shot dài/dày mốc; chưa có profiling runtime.
- Flow dot đi trên **path đã phát ra**, giữ progress từ event gốc khi camera vào giữa luồng; ẩn đúng split gốc. Flow position cũng có adaptive serialization riêng. Không tạo lại flow ở đầu cut hoặc đổi thời điểm phản ứng. Đồng hồ fractional giữ nguyên, không làm tròn các vị trí timeline về6 chữ số.
- Reveal của cả hai đối tượng là visibility rời rạc của link. Hai nhóm opacity riêng nhận từng kênh opacity model, tránh đường nối còn hiện khi một đầu đã trong suốt. Không gộp hai kênh thành một minimum/product tween xấp xỉ.
- Contact/relation sampler snapshot dữ liệu một lần, query binary, trả bản sao, không clamp time hoặc duyệt lại cả track mỗi query. Có cache version riêng, report `projectedRelations` và manifest/acting brief/prompt mới. Quan hệ legacy không chọn frame giữ renderer cũ.
- Giữ `continuousGeometryVerified=false`, `motionVerified=false`, `productionApproval=false`; mọi art/production approval vẫn false. Topic `productionReady=false`, `productionRig=null`, `availableBanks=[]`. Production gate `needs-source-prop-binding` giữ nguyên.

## Kết nối 9router

Combo **`tester` đã gọi được**: POST `/v1/chat/completions` tại `http://127.0.0.1:20128`, HTTP200, returned model `gpt-6-luna`, 9568ms, 13525 tokens. Đây là source-only advice, không thực thi test. Model phát hiện relation visibility chưa tính opacity; parent đã thêm hai opacity parent. Snapshot được ghi ở `reviews/projected-relations-advice-record-v1.json`, không xác nhận final integration độc lập.

Lượt giao source task riêng cho `cx/gpt-6.1-sol` với `reasoning_effort=xhigh` hết timeout240000ms, không có code trả về. Không biết response model/usage/status của lượt đó; không tính là triển khai thành công từ agent.

## Model test cần làm

Chín callbacks mới trong `tests/projected-relations.test.ts` là **DECLARED / NOT RUN**. Chỉ typecheck source; implementation chưa gọi fixture, schema instance, geometry/sampler/compiler, server/browser, pipeline, TTS/ASR hoặc render audio/video.

1. Chạy callbacks mới và regression contact/spear/world/ownership/camera/publication/cache. Có ca source probe/refinement, immutable reverse/fractional seek, fixed projected center, actual owner channels hai người đổi lead, original flow qua cut, opacity source code, sai revision/channel và supplied canonical bake. Canonical fixture mới **synthetic**, chỉ kiểm consumer wiring, không chứng minh physical provenance hoặc shared handoff thật.
2. Thêm và chạy target owned đang carry/turn, canonical shared/handoff/place, source target dịch tại contact, chiều đối diện, reveal/pulse qua cut không nằm trên fps grid, endpoint overlap, foreground/depth/occlusion. Không coi một fixture pass là cả luồng pass. Đối chiếu DOM/GSAP thực, đặc biệt path/arrow/flow rounding, time precision và cú seek đảo/ngẫu nhiên.
3. Xem video60fps thực: cả hai palm, shaft/tip/target, khớp tay/chân, chân bám đất, mắt/mũi/miệng/tóc, viền quần áo, nhìn bạn diễn và màu day/sunset/night. Giữ mẫu Lila/Karo da ấm; nam phụ trọc không tóc/không râu; nữ phụ giữ mẫu. Chưa có art/motion acceptance mới.

Môi trường: Node>=22.13, PowerShell; build source dùng Node24.19.0. Studio/video cần Chromium/Hyperframes, FFmpeg/FFprobe và voice/ASR đúng ngôn ngữ. Key 9router/TTS đặt env hoặc `.env`, không đưa vào Git/chat/báo cáo.

**Các lệnh sau dành cho model test, implementation chưa chạy runtime:**

```powershell
Set-Location -LiteralPath 'C:/Users/Duongvh-pc/.codex/worktrees/stickman-acting-v22/Story-2-video-factory2.1'
git rev-parse HEAD
npm run build
npm run test:typecheck
node --experimental-test-module-mocks --import tsx --test --test-concurrency=1 tests/projected-relations.test.ts tests/model-contact-frame.test.ts tests/source-spear-emitted.test.ts tests/source-world.test.ts tests/source-ownership.test.ts tests/ownership-render.test.ts tests/mixed-ownership.test.ts tests/camera.test.ts
```

Chỉ mở Studio riêng sau khi xác nhận cổng8851 trống. Giữ Studio8850 và D checkout:

```powershell
$env:STUDIO_PORT='8851'
npm run studio
```

Ghi full SHA, commands/exit/stdout, failures, NOT RUN và ảnh/video thực vào báo cáo mới. `TEST-RESULTS.md` V1 không nghiệm thu bản này. Source bị chặn production không thể coi là final PASS; không nới gate để chạy một ca.

## Việc triển khai còn thiếu

- Nối nhãn/focus/energy/thermal/shadow và camera envelope vào projected geometry phù hợp; hiện chúng giữ contract cũ. Không dùng overlay đứng ngoài glyph làm contact authority.
- Hoàn thiện artwork/continuous acting/turn/contact/depth và nghiệm thu phim so ảnh/video mẫu. Finite probes không chứng minh liên tục, draw order, pixel/contour hoặc cảm giác mượt.
- Nghiệm thu tool tổng quát: câu chuyện/chủ đề→kịch bản; kịch bản nguyên văn; WAV giữ giọng/ASR; legacy SRT giữ cue/clock; EN chính, VI/JA/KO, TTS HTTP/command/local. Narration clock từ audio thật; review/repair, resume/locks/rebuild; final MP4/audio/SRT/thumbnail/storyboard/profile/timeline/manifest/QC. Đạo cụ giáo chỉ là một khả năng diễn xuất.
- Tích hợp source production audit và toàn bộ nghiệm thu trước khi mở final. **Toàn mục tiêu chưa hoàn thành; chưa sẵn sàng dùng sản xuất.**

Build/typecheck/schema definitions/raw byte inventory được ghi riêng ở `reviews/projected-relations-source-record-v1.json`; không phải kết quả runtime.
