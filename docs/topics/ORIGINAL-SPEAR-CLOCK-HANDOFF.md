# Clock gốc cho động tác cầm/đâm giáo — source0.83

Source `forest-tribe-0.83-original-spear-clock`, producer `story-direction-2.2.46`, body compiler `forest-source-body-motion-40`, acting clock `native-view-acting-clock-7`, partner eye source `native-actor-gaze-source-3`. Đây là phần code chuyển động, chưa phải video hoặc tư thế đã nghiệm thu.

## Phần đã triển khai trong source

- `performance.sourceSpear` là lịch sử đầy đủ của một diễn viên có giáo gắn vào tay từ đầu run. Mỗi camera slice lặp đúng cùng source/owner/body/prop/track/shaft/grip/aim/poles/phases, kể cả khi đổi diễn viên chính/phụ. Clock global dùng safe integers; phase/seek được chuyển sang clock gốc bằng hiệu hai mốc trước khi cộng thời gian local. Không crop, clamp, modulo hoặc tự khởi động lại thrust ở đầu shot.
- Shaft, hai bàn tay và mũi giáo dùng chung evaluator hiện có. Poles trái/phải được chuyển đúng sang primary/secondary theo tay cầm thực tế. Grip phải nằm trên thân gỗ, tránh đuôi và mũi. Thrust giữ thứ tự `start < ready < contact < recover < end`; lunge yêu cầu đúng một thrust hai tay. Không bịa pickup/drop/throw/handoff.
- Source bắt buộc có `sourceBody` cùng full run; local props/spears/lunge/body tracks bị từ chối. Hai tay cầm giáo không được có lệnh khác cùng lúc. Hold một tay có thể đi cùng cử chỉ hoặc original manipulation trên tay còn lại, với clock gốc khớp và không trùng ID; các giới hạn vật lý/native contact hiện có vẫn áp dụng.
- Compiler và camera dùng phase gốc, gồm mốc sát trước/sau ready/contact/recover và độ trễ secondary motion. Shot rộng/trung phải giữ shaft/tip trong vùng an toàn; ensemble planner có envelope của props. Face close không được giấu thrust đang diễn ra. Đây là kiểm tra envelope bằng evaluator và các mốc đã định nghĩa, không phải bằng chứng toán học liên tục hay review video.
- Partner gaze nhận body-only lunge và phase gốc để tính eye anchor theo thân đang chuyển trọng lượng. Tool/arm/manipulation/gaze commands không được vào nguồn eye target; không tạo vòng phản hồi gaze. Vẫn giữ face identity/view/source registration và giới hạn hướng mắt đã có.
- Original audit/Studio nhận diện sourceSpear; immutable acting repair và fingerprints chứa lịch sử giáo. Export thêm `spear-source.schema.json`. Metadata/manifest giữ mọi approval false, `productionReady=false`, `productionRig=null`, `availableBanks=[]`.

## Phần chưa hoàn thành

Không bỏ `needs-source-prop-binding`. SourceSpear chưa có contract hoàn chỉnh cho rotating entity/model/world/action/cue và emitted model glyph; production, candidate scene binding và model entry/exit đều báo pending rõ ràng. Chưa có native tool artwork/motion được duyệt, thêm pose đối hướng, continuous head turn hoặc depth handoff. Không dùng schema/helper này để thông qua production bằng empty props, bỏ source, đổi owner hoặc trỏ sang pointing/slideshow.

Chưa chạy test callback, fixture, sampler, geometry, browser, API diagnostics, server, TTS/ASR, render hoặc MP4. Chưa chứng minh random/reverse seeks, actual SVG/GSAP versus evaluator, film smoothness/anatomy/face/cloth/shaft contact. Bộ sản phẩm vẫn cần nghiệm thu riêng cả story→script, exact script, WAV, legacy SRT, EN/VI/JA/KO, external/local TTS, resume/rebuild/locks và final audio/subtitle/thumbnail/review/QC. Kết quả V1 không nghiệm thu source0.83.

## Agent và quyền chạy

Combo 9router `tester` gọi được: HTTP200, response model `gpt-6-luna`, reply `TESTER_OK`, 1.377 giây, 44 tokens. Đây chỉ là connectivity. Có thể gửi request OpenAI-compatible với `model: "tester"` và authentication đã cấu hình trên máy; không đưa key vào chat hoặc Git.

Một lượt `cx/gpt-6.1-sol` được yêu cầu xhigh đã đọc frozen snapshot trong lúc triển khai trên nền source0.82 và đề xuất schema/helper. Parent đọc, tích hợp và sửa wooden grip bounds, lunge, disjoint-hand integration, compiler/actor/gaze/camera/production guards. Không execute code trả về hoặc cho agent tự sửa repository. Actual response ghi 31.313 tokens; cap đề nghị 6.000 không được provider thực hiện; xhigh không được xác minh độc lập. Agent không review toàn bộ integration cuối cùng.

## Môi trường và lệnh bàn giao cho model test

Implementation chỉ chạy build/typecheck, schema definitions và raw metadata inventory. Các lệnh runtime dưới đây dành cho model test của người dùng, chưa được implementation chạy. Không thao tác D checkout/project/server8850.

```powershell
Set-Location -LiteralPath 'C:/Users/Duongvh-pc/.codex/worktrees/stickman-acting-v22/Story-2-video-factory2.1'
git rev-parse HEAD
node --version
npm run build
npm run test:typecheck
npm run schemas
node --experimental-test-module-mocks --import tsx --test --test-concurrency=1 tests/native-source-spear.test.ts tests/native-source-manipulation.test.ts tests/native-source-body.test.ts tests/native-source-seat.test.ts tests/original-source-audit.test.ts
```

Node >=22.13; build hiện dùng Node24.19.0. Ca này không cần provider/TTS để kiểm geometry; video thật cần Chromium/Hyperframes, FFmpeg/FFprobe và voice/ASR phù hợp input. Nếu cần Studio riêng, model test kiểm tra cổng8851 chưa dùng rồi đặt `$env:STUDIO_PORT='8851'` và chạy `npm run studio`; server đọc biến này và bind127.0.0.1. Xác nhận bằng output thực tế, không restart server8850.

Model test ghi full SHA, command/exit/stdout, test chưa qua hoặc chưa chạy. Chín callback mới cần kiểm cấu trúc và original clock, hand conflicts, coverage/identity, no mutation, source adapter, full versus sliced palms/shaft/legs/head (Lila/Karo, thrust/lunge, reverse seek), bake phase seeds và production gate cả primary/supporting. Sau đó bổ sung canonical hai diễn viên đổi vai chính/phụ qua camera cuts và partner eye anchor body-only, camera crop, actual emitted GSAP/contact/bone length/cloth/hair và video60fps. Có đủ ca test không đồng nghĩa đã đạt; thiếu native pose/geometry phải báo blocker chính xác, không giảm constraint.

Bản ghi source, raw inventory và agent nằm trong `reviews/original-spear-clock-{source,static,agent}-record-v1.json`; chỉ source checks có thể đạt. Film và toàn tool vẫn chờ nghiệm thu.
