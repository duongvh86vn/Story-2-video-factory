# Kiểm tra cảnh trên nguồn gốc — source0.82

**Cập nhật source0.106:** [Tọa độ vật/giáo tại camera cut trên câu chuyện gốc](ORIGINAL-MODEL-BOUNDARIES-HANDOFF.md). Source audit2 và candidate explainer đọc đúng actual owner/source clock và translation của glyph giáo, kiểm đủ bindings cả camera đầu và cut; production checker vẫn chặn nguồn chưa nghiệm thu. Sáu ca regression đã viết, **DECLARED / NOT RUN**; không tạo video hoặc tuyên bố tay/mặt/chuyển động đã đạt. Toàn story/script/WAV→video, diễn viên trong câu chuyện, EN/VI/JA/KO/local TTS và nghiệm thu hình/motion/final/QC vẫn là mục tiêu; source0.105 trở xuống là lịch sử.

Hiện hành source0.83 bổ sung nhận diện `sourceSpear` và báo pending rotating model/action/cue/native tool acceptance, không thông qua candidate/production binding. Xem [bàn giao clock giáo](ORIGINAL-SPEAR-CLOCK-HANDOFF.md). Phần source0.82 dưới đây là lịch sử; runtime/video vẫn chưa nghiệm thu.

Đã viết màn hình **Kiểm tra cảnh** và API chỉ đọc để model test biết lỗi nào còn thiếu theo toàn câu chuyện, cảnh và diễn viên. Source `forest-tribe-0.82-original-source-audit`, producer `story-direction-2.2.45`, audit `original-source-audit-1`. Chưa chạy API, test callback, server, geometry, renderer hoặc video; chưa nghiệm thu chất lượng phim hay toàn sản phẩm.

## Contract và phần đã triển khai

- Studio hiện nút khi storyboard có `sourceWorld`, `sourceOwnership` hoặc original `sourceManipulation`. Kiểm tra bản đã lưu; không bỏ chỉnh sửa chưa lưu, không chạy provider, sửa nguồn, đổi approval hoặc tạo job production. Báo cáo có bảng lỗi theo cảnh/người và JSON cho model test.
- `GET /api/projects/:name/source-audit` không nhận override/query. Đọc storyboard, narration, beats, character bible, host profile/rig, config; ưu tiên `work/voiced-narration.json` nếu tồn tại. Thiếu context trả `409 SOURCE_AUDIT_CONTEXT_MISSING`; quá 4 MiB mỗi artifact trả `413 SOURCE_AUDIT_TOO_LARGE`; JSON/source invalid bị từ chối; thay đổi source/settings/host trong lượt kiểm tra trả `409 SOURCE_AUDIT_STALE` khi phát hiện được. Có `Cache-Control: no-store`.
- Cặp validator candidate dùng cùng quy tắc explainer/cinematic với production. Fragment phải khớp chính xác một shot trong complete board có ID duy nhất và clock liên tục `0..narration.durationMs`; không tự tuyên bố lịch sử bị cắt là nguồn toàn bộ. World, canonical/independent original bindings và model exits được kiểm trước worker diễn viên. World-only giữ ordinary binding check; row không có original source vẫn dùng production validator.
- Báo cáo kiểm độc lập storyboard/clock/source, complete context, actor continuity, acting coverage toàn chuyện và final direction; từng shot kiểm cả cạnh continuity với shot trước, explainer/physical/source và camera của actual primary/supporting. Lỗi nguồn hoặc artwork không được xóa các lỗi camera còn kiểm được. Nếu camera/source dependency hoặc xây subject thất bại, từng người chưa được kiểm phải có `unavailable`; không báo đạt vì bị bỏ qua.
- `binding`/`fingerprint` gắn canonical parsed input và settings dùng cho kiểm cảnh; `fileReceipts` gắn raw JSON bytes và lựa chọn narration. So sánh source/config/verified base host trước và cuối lượt đọc là freshness lạc quan, không phải snapshot hệ điều hành, receipt audio/asset, scene render hoặc quyền publish. Native/supporting artwork vẫn cần nghiệm thu riêng.
- `sourceChecksPassed` chỉ nói các quy tắc source đã qua. Kể cả `true`, `canPublish`, `approved`, `productionReady`, `productionApproval`, `motionVerified` luôn `false`; `productionRig=null`, `availableBanks=[]`, `productionBinding=needs-source-prop-binding`. Public production validator, pipeline và guard trong `props.ts` không chuyển sang candidate checker.

## Model hỗ trợ và bằng chứng source

9router combo `tester` đã gọi được, trả model `gpt-6-luna`. Một lượt GPT-6.1 Sol được yêu cầu xhigh đọc bốn file source0.81 cùng excerpt worker và đề xuất thiết kế; parent tích hợp thủ công. Một lượt `tester` đọc năm file ứng viên và excerpt entry mới, chỉ ra catch camera thiếu actor-specific unavailable; parent sửa và khai báo regression. Không execute code do model trả. Phạm vi frozen source/hash, trả lời, usage, adjudication và những phần model chưa đọc nằm trong `reviews/original-source-audit-agent-record-v1.json`. Final parent correction chưa được agent đọc lại; xhigh thực tế không được xác nhận độc lập.

`reviews/original-source-audit-source-record-v1.json` ghi build/typecheck/schema export và raw static checks cùng handles. `reviews/original-source-audit-static-record-v1.json` ghi raw image/header/JSON/code-hash inventory, guard, callbacks và false flags. Build/typecheck không là runtime/video acceptance. `TEST-RESULTS.md` V1 và các kết quả version cũ không nghiệm thu source0.82.

## Môi trường và lệnh dành cho model test của người dùng

Implementation không chạy những lệnh runtime dưới đây. Dùng C worktree riêng; không sửa D checkout hoặc project/server `8850`. Node >=22.13; source đã build bằng Node24.19.0. Video sau này cần Chromium/Hyperframes, FFmpeg/FFprobe; WAV cần ASR, script cần TTS hỗ trợ ngôn ngữ. API diagnostics không gọi ASR/TTS/model hoặc render.

```powershell
Set-Location -LiteralPath 'C:/Users/Duongvh-pc/.codex/worktrees/stickman-acting-v22/Story-2-video-factory2.1'
git rev-parse HEAD
node --experimental-test-module-mocks --import tsx --test --test-concurrency=1 tests/original-source-audit.test.ts tests/mixed-ownership.test.ts tests/ownership-render.test.ts tests/ownership-observation.test.ts tests/source-ownership.test.ts tests/source-prop-binding.test.ts tests/cast-camera.test.ts
$env:STUDIO_PORT='8861'
$env:STUDIO_PROJECTS_ROOT='C:/Users/Duongvh-pc/.codex/tmp/story-factory-source082-test-projects'
npm run studio
```

Mở `http://127.0.0.1:8861/` với project test riêng có đầy đủ artifacts nguồn. Trong Studio bấm **Kiểm tra cảnh**, hoặc model test lấy JSON sau khi thay tên project:

```powershell
$taskProject='TEN_PROJECT_TEST'
Invoke-RestMethod -Uri ('http://127.0.0.1:8861/api/projects/'+[Uri]::EscapeDataString($taskProject)+'/source-audit') -Headers @{'X-Studio-Request'='1'} | ConvertTo-Json -Depth 100
```

Combo chat qua 9router không tự có terminal/browser của máy. Model/người có công cụ thực thi phải chạy và ghi kết quả. Mười callbacks mới **DECLARED / NOT RUN**; fixture deliberately invalid dùng kiểm aggregation/clock/security, không là native geometry/art/motion baseline hợp lệ.

1. Chạy callbacks và ghi full SHA, command, exit, raw failures; sửa fixture lỗi nếu có qua model triển khai, không bỏ assertion. Kiểm cả project source thực: full original world/bindings/native/cue/actors/camera/model-exit checks vẫn bắt lỗi. Một scene lỗi phải không xóa findings của scene khác.
2. Kiểm all-passed source hợp lệ nhưng approval/final luôn false; thiếu nguồn/contact/world/identity/rig/cue/target/final direction không thành pass. Kiểm duplicate cast/ownership-world failure và actual primary/supporting đổi vai qua cuts đều có camera result hoặc unavailable theo đúng người.
3. Kiểm fragment thiếu đầu/cuối narration, gap/duplicate ID/foreign shot/sibling revision, cả hai cạnh model continuity, acting coverage toàn câu chuyện và unsupported renderer đều bị từ chối. Omitted actor_renderer phải giữ default rig.
4. Kiểm voiced-narration preference, source/voice selection/settings/host thay đổi trong lượt đọc, file missing/invalid/oversized/link/traversal, cache no-store, redaction, không write/provider/job/approval/review/final. Freshness race/ABA và timeout/chi phí geometry nhiều shot cần đo riêng; không tuyên bố atomicity.
5. Kiểm UI không bỏ editor chưa lưu, không hiện báo cáo của project cũ sau khi đổi project, không inject HTML từ lỗi/actor IDs và không gọi run/approve/repair. API/server/UI behavior chưa chạy bởi implementation.

## Phần còn thiếu để sản phẩm đạt yêu cầu

Chưa mở production source. Cần actual native registrations và kiểm SVG/GSAP/preflight geometry/contact/bones/soles/cloth/face/gaze, normal/random/reverse seeks; rotating tools, canonical airborne ownership, depth đổi trong action đúng câu chuyện. Không thay câu chuyện bằng pose trỏ tay để né capability thiếu.

Cần nghiệm thu Lila/Karo đúng ảnh gốc (mặt/tóc/viền quần áo/tay chân mềm/màu đậm), nam phụ trọc không râu, nữ giữ nguyên, bối cảnh day/sunset/night và director/camera có động cơ. Toàn story→script, exact script, original WAV, EN chính/VI/JA/KO/external-local TTS, resume/rebuild/locks, final MP4 có giọng/SRT/thumbnail/review/QC còn cần bằng chứng current source. Mouth RMS/segment không được gọi phoneme lip-sync. Mục tiêu toàn bộ vẫn đang hoạt động.
