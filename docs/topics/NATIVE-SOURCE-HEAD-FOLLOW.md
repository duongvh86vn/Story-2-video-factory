# Source0.63 — đuôi tóc theo nhịp cơ thể

09/10/2026. Source mới nối chuyển động của **đuôi tóc riêng** vào renderer chung. Chưa nghiệm thu geometry, hình hoặc video; không tuyên bố hoàn tất toàn tool. Mục tiêu vẫn là arbitrary story → script, exact script hoặc original WAV → narration → actors trong câu chuyện → scenes/review/final/audio/subtitle/QC, EN chính và VI/JA/KO, local/external TTS, resume/rebuild/locks.

## Phần đã viết

- Lựa chọn tường minh `face=source-motion`: bốn definition mới `*-follow-v1.json`, bank6, paint2. Giữ nguyên 14 definition trước và mọi PNG. Bank1–5 không tự nhận motion.
- Lila trái/phải: 12 tam giác affine trên đúng đuôi tóc trong nguồn đầu. Mép trên tại gốc tóc và hai cạnh bên cố định. Mặt, mắt, mũi, miệng, cổ, nút buộc tóc, tay/chân không bị mesh này kéo. Texture vẫn vẽ phía sau thân như source0.62.
- Karo trái/phải: `rear=[]`, `secondary=false` được khai báo rõ. Không tạo đuôi tóc/râu sau giả và không mượn vùng tóc của Lila. Tóc/râu phụ riêng của Karo và quần chúng vẫn cần nguồn/layer thích hợp và nghiệm thu.
- Causal kernel dùng head pose ở thời gian hiện tại và 40/80/120/160 ms trước trên **original actor run**, cùng trọng số hiện có, tanh bounds. Không tích lũy frame state, không dùng camera transform; random/reverse seek và camera slices đọc cùng lịch sử. Mean lag 80 ms trước run-clamping, không phải delay audio.
- Control ở source-pixel coordinates: angle hiện tại = world head angle + registered cell neck-axis angle; scale = source pixelScale × unitScale × planScale × headScale × bodyScale. Body/expression history được lấy trước camera slice. Không gán yaw cho ảnh có yaw=null.
- Mỗi node đổi vị trí tối đa 24 source pixel, gain0.8 ở hai definition Lila. Area influence giữ tam giác dương ≥0.4. UV overlap2px chỉ ở clip tam giác; region/crop nguồn áp dụng **trước matrix**, đầu tóc ở destination không bị cắt lại vào silhouette cũ.
- Refinement tính sai số tại expanded UV hull và kiểm analytically diện tích trên toàn khoảng giữa hai matrix; endpoint area dương không đủ nếu giữa đoạn bị lật. Bounds bảo thủ dùng barycentric weights của expanded UV vertices, không đoán padding để fit camera.
- Thay cell trong một original run có secondary bị chặn `needs-head-turn-secondary` cho đến khi có correspondence tóc liên tục thật. Shot-local lunge không được reset history qua continuous cut. Không lấy mode cũ hoặc một góc khác làm fallback.
- Metadata temporal dùng SHA256 của cùng JSON bytes qua helper thuần, để Studio không import Node fs/crypto/process. Đây là thay đổi đường import cho browser; runtime/fingerprint regression vẫn cần model test xác nhận.

Các vùng đuôi tóc, layer/UV/pin và max travel là khai báo engineering, **chưa validate/duyệt art**. Đây là bounded texture follow, không mô phỏng vật lý sợi tóc, không collision solver, không turn3D hoặc phoneme sync. Seam, double alpha, hair silhouette/identity, tóc xuyên vai và chất lượng motion phải kiểm trên thân và video thật.

## Source và môi trường

| Phần | File |
|---|---|
| Motion schema/mesh/source matrices/refinement/bounds | `packages/animation/native-head-follow.ts` |
| Own source partition/version | `packages/animation/native-head-paint.ts`, `native-head-bank.ts`, `native-head-identity.ts` |
| Rear image/cell selection và renderer | `packages/animation/body-head-bank.ts`, `rig.ts`, `compiler.ts` |
| Original run/lunge gates | `packages/actors/view-acting-clock.ts`, `view-secondary-motion.ts` |
| Studio và exact mode/source binding | `packages/topics/head-face-candidates.ts`, `head-face-source.ts`, `head-face-workbench.ts`, `apps/server/index.ts` |
| Canonical two actors/cuts | `benchmarks/native-seat-tracer.ts`, `scripts/native-seat-tracer.ts`, `packages/topics/native-dialogue-candidates.ts` |
| Current model brief | `packages/director/acting-brief.ts` |
| New source definitions | `library/topics/prehistoric-life/head-face-registrations/{lila,karo}-{left,right}-follow-v1.json` |
| Test declarations | `tests/native-head-follow.test.ts` |

Node >=22.13, npm dependencies theo lockfile; môi trường source đã dùng Node24.19.0 và ffmpeg/ffprobe ở `C:/ffmpeg/bin`. Render dùng HyperFrames/browser hiện có. Face workbench và silent tracer không cần TTS/ASR/model. Audio acceptance cần narration WAV đúng nội dung/clock; không ghép WAV bất kỳ rồi báo đồng bộ. Key provider/local9router giữ ở môi trường hoặc `.env`, không đưa vào chat/report.

**Model triển khai không chạy runtime/test, kể cả geometry validator, builder, compiler/sampler, callback, server/browser/API pipeline, TTS/ASR/media/tracer `--help`. Những lệnh dưới chỉ dành cho model test của người dùng.** Build/typecheck/schema export và static byte/inventory là kiểm source, không là test video. Checkout D và projects8850 giữ nguyên; source C không tự triển khai vào server D.

```powershell
Set-Location -LiteralPath 'C:/Users/Duongvh-pc/.codex/worktrees/stickman-acting-v22/Story-2-video-factory2.1'
git rev-parse HEAD
$env:STUDIO_PORT='8861'
$env:STUDIO_PROJECTS_ROOT='C:/Users/Duongvh-pc/.codex/worktrees/stickman-acting-v22/Story-2-video-factory2.1/runtime/source-follow-test-projects'
npm run studio
```

Mở `http://127.0.0.1:8861/api/topics/prehistoric-life/head-faces?actor=lila&view=three-quarter-left&face=source-motion&mood=concerned&action=think&look=ahead`. So `source-motion` với `source-layers` tại cùng thời gian gốc ở whole và second-half, hai góc, mọi mood/action được hỗ trợ. Karo rõ không rear motion; supporting source chưa có phải lỗi, không tự tạo. Ctrl+C dừng server trong terminal đó.

```powershell
node --experimental-test-module-mocks --import tsx --test --test-concurrency=1 tests/native-head-follow.test.ts tests/native-head-paint.test.ts tests/native-source-emotions.test.ts tests/native-secondary.test.ts tests/view-secondary-motion.test.ts tests/native-head-bank.test.ts tests/native-head-bank-sources.test.ts tests/head-face-workbench.test.ts tests/native-seat-tracer.test.ts tests/supporting-native-head.test.ts tests/topic-cast-source.test.ts
npm run tracer:native-seat -- --native-heads --face source-motion --acting emotional-reactions --staging lila-left --validate --frames --render
npm run tracer:native-seat -- --native-heads --face source-motion --acting emotional-reactions --staging lila-right --validate --frames --render
```

Tracer xuất folder runtime mới, silent draft nếu không có WAV đúng cue/story7200ms. Không final/DONE/production acceptance. Dùng cùng `renderCinematic`/master renderer; không dùng isolated hair/head demo thay phim canonical. Không nâng cap2MB, bỏ validation/actors/gaze/actions/source clocks hoặc thay truyện để ca pass.

## Nghiệm thu và phần còn thiếu

10 callbacks mới chỉ **khai báo, NOT RUN**: browser-safe temporal hash; bốn source definitions/legacy; gates phiên bản/nguồn/capability/mesh;12 triangles/pins/area/displacement; nonlinear area/refinement; bounds/UV; whole/slice/reverse seek và body/face/hand unchanged; invalid head-cell source/context; hai staging qua các camera/lead swaps bằng renderer canonical; Studio route/revision/missing source. Ca invented cell chỉ kiểm không bypass registration, không chứng minh real head-turn correspondence.

Model test cần full Git SHA, commands/exit/PASS/FAIL/NOT RUN, raw/source/definition hashes, stills trên thân và video tốc độ thật. Kiểm đầu tóc không gãy, alpha seam không tối/nhòe/double, silhouette giống mẫu, tóc không xuyên vai hoặc mất sau garment; face/hair-tie/cloth outlines/colors không bị đổi; đứng/ngồi/rise/walk/think/reactions và cut không giật/reset. Kiểm random/reverse seek, namespace giữa primary/supporting, scene cap, camera framing và legacy no-motion bank modes. Hash/RGBA/model advice không thay bằng chứng này. [Review Gemini9router/disposition](reviews/native-head-follow-source-review-v1.json) và [frozen source input](reviews/native-head-follow-review-inputs-v1.md) chỉ hỗ trợ source; [source record](reviews/native-head-follow-source-record-v1.json) ghi các build/typecheck/schema/static byte checks. Source reviewer không thực hiện geometry/render/test hoặc duyệt art.

Full goal chưa đạt: faithful art và đủ views/profile/rear/continuous turns; kín cổ; tay/chân mềm hợp lý và grounded feet; tóc/vải/contact/collision; tool/prop/hunting/handoff/shared ownership; supporting own heads/expressions; world vivid day/sunset/night; ba input thật bất kỳ, EN/VI/JA/KO và external/local TTS/ASR; resume/rebuild/locks; narration/audio/subtitle/final/QC. TEST-RESULTS V1 không nghiệm thu source0.63. Giữ `productionReady=false`, `productionRig=null`, `availableBanks=[]` cho đến khi toàn yêu cầu có bằng chứng đầy đủ.
