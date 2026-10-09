# Nhãn, bóng và hiệu ứng theo hình đạo cụ — source0.88

`forest-tribe-0.88-projected-overlays`, producer `story-direction-2.2.51`, projected geometry2/overlay1. Tiếp nối [source0.87](PROJECTED-RELATIONS-HANDOFF.md). Đây là source candidate; **chưa nghiệm thu runtime, phim hay toàn tool**.

## Phần đã viết

- Focus/energy/thermal do factory tạo từ scalar data của chính model, trong cùng whole-glyph matrix sau SVG/viewBox/aspect projection. Base layer vẽ một lần; foreground chỉ giữ artwork của chính nó và cùng matrix/parent. Caller SVG không được giả namespace overlay. Không đưa raw decorator SVG qua sanitizer.
- Nhãn giữ thẳng, đi theo center và đáy transformed declared quadrilateral thực. Bóng chỉ đi ngang theo center trên baseline cũ của fixed model hoặc ground của owned/canonical entity, không xoay hoặc bay lên cùng bàn tay. Reveal rời rạc ở object wrapper; opacity theo original matrix clock riêng. Adaptive label position dùng gap.2px, depth12/max12000 retained frames và exact fractional timeline, không reset ở cut.
- Resolver đọc actual emitted own-actor transform hoặc canonical bake do renderer cung cấp, áp dụng scale đúng một lần. Conservative local envelope dùng breakpoint của coefficient-linear AttrPlugin matrix và rounding pad; owned rotating parent dùng circle envelope quanh actual serialized translations/max scale. Camera bao generated effects, bóng và label box; preflight chưa có renderer channels được báo scope khác. Label text extents vẫn là heuristic, chưa có measured font metrics. Conservative envelope có thể làm framing rộng; chưa profiling hay nghiệm thu cảm giác camera.
- Static contactFrame cũng nạp original board/narration để cache và geometry có đúng revision; cache có overlay/geometry/track version và original source hash. Các source/world/owner/foreground/camera clocks tiếp tục dùng chung dữ liệu gốc.
- Native shaft giữ original physical artwork/binding; contract hiện cấm thay bằng authored model/foreground/canonical. Không dùng overlay này để tự suy luận registration cho shaft. Declared bounds không phải measured contour hoặc occlusion proof.
- Giữ productionReady=false, productionRig=null, availableBanks=[] và mọi art/motion/production approval false. **needs-source-prop-binding tiếp tục chặn final** cho source candidates chưa nghiệm thu. Không báo DONE từ build/typecheck.

## Review source qua 9router

Combo tester trả HTTP200, model thực tế gpt-6-luna,13680ms/9898 tokens. Review chỉ đọc bốn module snapshot, không chạy code/test/geometry. Agent nêu một nguy cơ envelope dùng breakpoint khi nội suy rotation. Parent đối chiếu: local glyph dùng linear interpolation của sáu hệ số matrix, không decomposed rotation/scale; mỗi corner là affine trên interval, có rounding pad. Actual rotating owner dùng radius riêng. Ghi disposition và source references ở reviews/projected-overlays-advice-record-v1.json; không coi đây là independent final-integration hoặc runtime acceptance.

## Model test cần làm

8 callbacks mới trong tests/projected-model-overlays.test.ts **DECLARED / NOT RUN**. 9 callbacks source0.87 chỉ tách fixture sang helper, vẫn NOT RUN. Implementation không gọi fixture/schema instance/sampler/compiler/renderer/server/browser/TTS/ASR/audio/video.

1. Chạy callback và regression relation/contact/source-world/ownership/camera/cache/publication. Ca mới có viewport/aspect, namespace, transformed label entry, fractional/reverse sampled envelope, foreign revision, base-only effect selectors và actual original native carry declaration. Synthetic canonical fixture source0.87 chỉ kiểm consumer wiring, không chứng minh shared physical provenance.
2. Thêm rồi chạy real canonical shared hold/handoff/place với hai người đổi lead; rotating owned/carry, foreground/depth, reveal/opacity qua cut non-grid, label sát phụ đề và font EN/VI/JA/KO. Đối chiếu actual DOM/GSAP ở fractional/random/reverse seeks với label/bóng/effects và path/flow. Nếu lỗi source/target/voice/identity/sync phải dừng final, không nới gate để chạy ca.
3. Xem video60fps bình thường, không chỉ ảnh tĩnh: hai bàn tay, arm/knee anatomy, foot plant, face/eyes/nose/mouth/hair/costume outlines, partner gaze, contact/reaction, vivid day/sunset/night và shot composition. Lila/Karo giữ mẫu da ấm; nam phụ trọc không tóc/không râu; nữ phụ giữ mẫu.

Môi trường: Node>=22.13/PowerShell (source build dùng Node24.19.0); video cần Chromium/Hyperframes, FFmpeg/FFprobe và TTS/ASR đúng ngôn ngữ. 9router local http://127.0.0.1:20128/v1, key qua MODEL_GATEWAY_KEY/env hoặc .env; không đưa key vào Git/chat/báo cáo. D checkout/Studio8850 được giữ nguyên.

**Lệnh dưới đây dành cho model test, chưa chạy runtime trong bàn giao này:**

```powershell
Set-Location -LiteralPath 'C:/Users/Duongvh-pc/.codex/worktrees/stickman-acting-v22/Story-2-video-factory2.1'
git rev-parse HEAD
npm run build
npm run test:typecheck
node --experimental-test-module-mocks --import tsx --test --test-concurrency=1 tests/projected-model-overlays.test.ts tests/projected-relations.test.ts tests/model-contact-frame.test.ts tests/source-spear-emitted.test.ts tests/source-world.test.ts tests/source-ownership.test.ts tests/ownership-render.test.ts tests/mixed-ownership.test.ts tests/camera.test.ts
```

Sau khi xác nhận cổng8851 trống, model test có thể mở Studio riêng:

```powershell
$env:STUDIO_PORT='8851'
npm run studio
```

Ghi full SHA, command/exit/stdout, failures và NOT RUN vào báo cáo mới, kèm ảnh/video thực. TEST-RESULTS.md V1 không nghiệm thu bản này. Source check ở reviews/projected-overlays-source-record-v1.json chỉ chứng minh source delivery.

## Việc còn thiếu để sử dụng

- Native art/continuous acting/turn/contact/depth và integrated source production audit chưa nghiệm thu. Chuyển động phải đạt mẫu người dùng, không thể suy từ metadata hay finite probes. Không mở production candidates trước bằng chứng phù hợp.
- Tool tổng quát: câu chuyện/chủ đề→kịch bản; kịch bản nguyên văn; WAV giữ giọng/ASR (+ legacy SRT giữ text/clock). EN chính, VI/JA/KO, HTTP/command/external-local TTS; audio thật quyết định clock. Cần xác minh review/repair, resume/locks/content-voice-actor changes/rebuild và toàn bộ final MP4/audio/SRT/thumbnail/storyboard/profile/timeline/manifest/QC trên SHA hiện hành.
- Chủ đề tiền sử là một bộ diễn viên/bối cảnh; đạo cụ/carry/giáo là khả năng diễn xuất, không giới hạn tool vào máy móc hoặc đi săn. Cần ca truyện hai người, cả đồ ăn/sinh hoạt và chủ đề khác do người dùng cung cấp. Toàn mục tiêu vẫn chưa hoàn thành.
