# Lila/Karo — giữ clock miệng qua điểm cắt cảnh

**Lịch sử0.31:** [Mốc0.32](NATIVE-VIEW-EYES-HANDOFF.md) mở rộng source-clock/context/cache/repair cho eye-only silent actor và thêm native eye controls. Record0.31/14 NOT RUN vẫn giữ; blink phase không đồng nghĩa whole-body/head/gaze phase đã liên tục.

Mốc source 0.31, 08/10/2026, tiếp nối `616aac5171420ed15602f89d4500a2bb8fe635ed` trên `codex/prehistoric-life`. Đây là phần triển khai tiếp của tool, chưa là nghiệm thu diễn xuất hoặc video. Người dùng không có API image-to-video; vẫn dùng SVG/HTML5/GSAP.

Source/fixtures/docs đã push tại `d8ce672d3fdbc8470ffc6779d4d8b92b847ade35`; local/remote SHA đối chiếu trùng. Full build/test:typecheck/schema export/whitespace exit0; source re-review PASS sau ba P2 đã sửa, 14 callbacks vẫn NOT RUN. Bản ghi publication là bổ sung tài liệu, không có lượt test/render/video mới.

## Thay đổi và phạm vi

Trước đây renderer cắt activity vào từng shot rồi mới tính attack/release và nội suy sample centers. Câu đang nói qua điểm cắt có thể bị khép/mở miệng lại và đổi aperture dù audio tiếp tục. Source mới giữ timestamp của activity đã giao cho diễn viên và cộng shot offset khi lấy hình miệng. Không thay audio, lời kể, phụ đề hoặc clock nguồn.

- `packages/animation/speech-clock.ts`: context `speech-source-clock-1` tách riêng khỏi `SpeechActivity` lưu trên đĩa. Context có owner, scope, cue IDs, shot start/end, hash của toàn bộ activity thuộc diễn viên và một cửa sổ activity giữ timestamp gốc. Halo bao phủ attack45ms/release70ms và thêm sample lân cận để giữ nội suy centers; khoảng im lặng và level0 được giữ. Đây là tối ưu source, chưa đo hiệu năng runtime.
- `packages/actors/speech-clock.ts`: một cue hoàn chỉnh chỉ có một owner được khai báo. Union cue cùng actor qua storyboard; lần xuất hiện primary/supporting được dedup. Cue không rõ, ngoài anchors hoặc được giao cho hai actor bị chặn. Không đoán người nói từ camera, text hay tiếng; không tự chia cue hai người thành word timestamps.
- `body-view-mouth.ts`/`compiler.ts`/`scene.ts`: optional context được kiểm owner/span và **projection local phải đúng cả intervals lẫn metadata**. Sampler dùng thời gian nguồn, kể cả frame cuối shot. Sample/refinement grid và geometry interaction dùng cùng context. Attack/release không mở rộng cửa sổ có lời, không nối qua gap/zero. Lựa chọn vẫn `registered-mouth-v1`; mouth protocol2, body compiler21, body/head renderer13. Không gọi đây là phoneme lip-sync.
- `library/shots/cinematic.ts`: cả primary và supporting dùng clock của mình. Canonical renderer nhận complete board ở argument10. Standalone không có board chỉ dùng cue đã khai báo trong shot, report `shot-cues`; không tuyên bố biết toàn bộ owner lân cận. Trường hợp không có actorScene dùng source activity với scope `narration`.
- `packages/scenes/index.ts`: generation, source comparison, geometry/report, cache, locks và repair dùng cùng board. Canonical saved-source verification cần `work/storyboard.json` khi có mouth actor được chọn. Input identity gồm narration hash và union cue của actor liên quan; đổi cue của cảnh bên cạnh cũng có thể làm scene cũ stale.
- `packages/director/artwork-repair.ts`: acceptance đối chiếu binding ownership/narration của board dùng khi dựng với board thực sắp ghi; đổi owner ở sibling hoặc narration phải chặn. Sau staging, đọc lại board hash và narration binding trước publication. Giữ transaction/rollback và scene record cùng revision. Source review tìm ra P2 này; regression đã khai báo, **NOT RUN**.
- `library/schemas/speech-source-clock.schema.json`: schema context mới. `speech-activity.schema.json` không được mở rộng. JSON schema mô tả shape; kiểm overlap/projection/owner và cross-field span vẫn do runtime helpers/Zod thực hiện.

PNG, đăng ký native ROI, mắt/mũi/tóc, tỷ lệ rig, màu và trang phục không đổi trong mốc này. [Figure/measurement mouth v1](FIXED-VIEW-SPEECH-HANDOFF.md) là tài liệu hình tĩnh của mốc 0.30; mouth protocol2 thay clock, không phải artwork mới đã duyệt. Karo vẫn giữ grin/rim của ảnh, chưa có môi neutral khép thật.

Report ghi scope, offset, source/window hash và `audioVerified=false`, `approved=false`, `phonemeLipSync=false`. Hash/projection không xác minh waveform, speaker assignment hay chất lượng hình.

## Source checks và test bàn giao

Chi tiết lệnh, trạng thái và findings/fixes nằm trong [source review record](reviews/source-speech-phase-source-review-v1.md). Controller chỉ đọc source, compile/typecheck và export schema; không chạy callbacks, body evaluator, GSAP, browser, API, ASR/TTS/audio hoặc video.

**14 callbacks mới đều NOT RUN**, trong `tests/source-speech-phase.test.ts`:

1. Context/projection/metadata/owner/span và ActivitySchema cũ.
2. Cùng cue qua hai shot: hai actor × hai view, exact endpoint và seek khác thứ tự.
3. Hai cue liên tiếp: cùng owner giữ phase; đổi owner không mượn activity.
4. Whole-board union/dedup/primary-supporting và conflict/unknown/anchor guards.
5. Repair override một shot, không mutate board hoặc suy cue chưa khai báo.
6. Halo so với toàn source: short/long intervals, centers/ramps/gaps, timestamp/hash.
7. Gap và zero tại điểm cắt và trong shot.
8. Source sai ở ngoài shot, stale local, thiếu narration/cue, duplicate IDs, span sai.
9. Compiler endpoint, namespace, resource security, report và duration.
10. Không có context giữ local behavior; default silent vẫn chặn speech.
11. Pure cache dependency khi đổi neighbor owner/narration; chưa là cache/lock runtime.
12. Binding repair khi đổi owner/narration, thiếu binding, candidate override.
13. Disk-boundary P2: sibling owner đổi sau dựng; acceptance phải giữ nguyên scene/record/board/narration/attempt và dừng trước staging.
14. Canonical paired scenes/report/resource namespace dùng cùng complete board.

Fixture canonical mượn stage kỹ thuật chỉ để kiểm contract renderer; không là nội dung sản phẩm, hạn chế chủ đề hoặc nghiệm thu dữ kiện/ba input. Bộ mouth0.30 có 11 ca, partner views0.29 có 10 ca; trạng thái runtime của chúng vẫn theo handoff/model test, không tự đổi thành PASS.

Cho model test chạy trên đúng nhánh/SHA:

```powershell
Set-Location -LiteralPath 'C:/Users/Duongvh-pc/.codex/worktrees/stickman-acting-v22/Story-2-video-factory2.1'
git rev-parse HEAD
node --experimental-test-module-mocks --import tsx --test --test-concurrency=1 tests/source-speech-phase.test.ts tests/fixed-view-speech.test.ts tests/partner-facing-views.test.ts tests/artwork-repair.test.ts
```

Ghi exact SHA, PASS/FAIL/NOT RUN, output và đường dẫn evidence. Chạy regression cache/resume/locked scene thực: đổi owner cue bên cạnh, narration clock/text, host/voice; cảnh không lock cần stale/rebuild, cảnh lock cần báo conflict và giữ accepted bytes. Kiểm cả repair rejected/accepted/rollback/replay và sửa đồng thời sau staging; ca13 chỉ cover rejection sớm tại disk boundary.

Tiếp tục playback/GSAP seek bằng audio thật tại source attack/release, cut trước/giữa/sau sample, cùng owner/đổi owner, gap/zero và cut nằm giữa cùng cue. Đối chiếu cả primary/supporting, fps, byte-size, thời gian compile, mute/offscreen/no-owner. Context window không được biến thành lời khẳng định đã đo performance. Chỉ chạy pipeline/model có chi phí trong phạm vi người dùng đã cho phép; không suy thêm phép cho câu chuyện mới từ ca sinh nhật/trạm xe buýt cũ.

## Môi trường và server

Node≥22.13, npm/dependencies từ package-lock (TypeScript/Vite/Sharp/GSAP). Controller chưa start8851/restart8850 ở mốc này. Trong PowerShell, giữ terminal đến khi test xong; Ctrl+C dừng server đó:

```powershell
Set-Location -LiteralPath 'C:/Users/Duongvh-pc/.codex/worktrees/stickman-acting-v22/Story-2-video-factory2.1'
powershell -ExecutionPolicy Bypass -File scripts/start-studio.ps1 -Port 8851 -ProjectsRoot 'projects-source-speech-phase-test'
```

Studio dự kiến `http://127.0.0.1:8851/`. Trang body có `mouth=registered-mouth-v1` vẫn chỉ là calibration signal `segment-draft` một shot; không chứng minh cross-shot/full speaker ownership. Khi model test cần 9router, thêm `-EnvFile 'D:/github/Story-2-video-factory2.1/.env'` chỉ nếu key thực sự ở đó; không in/gửi/commit key. Không ghi đè project người dùng ở8850. Mốc này chưa xác minh endpoint hay key/API.

## Toàn mục tiêu còn tiếp tục

Giữ `productionReady=false`, `productionRig=null` và final gates identity/voice/source/target/sync. Fixed views hiện chỉ happy/rest/point/think và tool bên phải đã đăng ký; gaze/turn/locomotion/seat/expression/tool khác vẫn chặn. Clock nguồn không làm khớp tay/chân tự nhiên hơn và không giữ phase whole-body/head/cloth qua cut.

Còn phải hoàn thiện identity/tỷ lệ/nét/màu theo ảnh gốc, native masks/occluded layers, neutral/talking/blink/expressions/gaze nhìn bạn diễn, turning/walk/run/jump/seat và cloth/hair follow, props/grip/contact/handoff, môi trường giàu màu/texture; sau đó nghiệm thu acting/video qua ba input và resume/edit/cache. Kịch bản nguyên văn→TTS clock thật; WAV giữ audio/clock→ASR; câu chuyện→kịch bản bám nội dung→voice/video. Legacy SRT, EN chính/VI/JA/KO và HTTP/command/local TTS vẫn thuộc sản phẩm. Lila/Karo là diễn viên trong bất kỳ câu chuyện người dùng đưa, không là người dẫn cố định hay một mẫu máy móc/săn cố định. Test V1/source review không thay thế nghiệm thu mới.
