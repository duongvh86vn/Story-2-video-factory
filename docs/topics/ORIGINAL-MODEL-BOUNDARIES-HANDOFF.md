# Vật và giáo qua góc quay của câu chuyện gốc — source0.106

Source `forest-tribe-0.106-original-model-boundaries` sửa đường kiểm tra cảnh gốc có giáo: source audit/candidate explainer được kiểm hình học thực thay vì dừng ngay tại guard production. Đây là code phục vụ kiểm chứng và tích hợp câu chuyện; chưa có phim mới hoặc nghiệm thu tạo hình/chuyển động. Người dùng xác nhận ngày 10/10 rằng model test chưa có kết quả cho Lila/Karo mới. `TEST-RESULTS.md` V1 không nghiệm thu bản này.

## Thay đổi đã viết

- `sourceModelEntryParts`/`sourceModelExitParts` bắt buộc toàn storyboard/narration gốc, exact shot membership, original world và tất cả original prop/tool bindings. Thiếu camera đầu/cuối, nguồn khác, registration/identity/evidence bị sửa ở cảnh sau không được dùng một pose đầu thay lịch sử.
- Giáo đọc đúng người đang cầm, full actor/body/tool clock, physical state tại đầu/cuối camera và translation bốn chữ số của đúng glyph `prop-<id>`. Origin trong descriptor không phải vị trí giáo lúc thrust; destination không được dùng thay physical state. Góc unwrap trong emitted timeline không thay translation tại endpoint. Không suy đoán tay, rút ngắn giáo, đảo mặt hoặc sửa nguồn để đạt reach.
- Canonical ownership vẫn đọc chính canonical bake; generic manipulation vẫn đọc đúng original source frame. Hai người cùng local prop ID không ghi đè nhau; source owner rõ ràng giữ nguyên qua đổi primary/supporting. Solver, bone/cuff/palm/sole, pose, source clock, glyph, emitted interpolation và painter không đổi.
- `validateSourceModelContinuity` dùng cùng quy tắc so sánh world transform với production, nhưng giữ context/bindings ngay ở camera đầu và intentional actor cut. Candidate cinematic dùng original boundaries và nhận `sourceSpear` vào full binding checker. Candidate explainer và source audit dùng checker này; audit tăng `original-source-audit-2`, prop cache tăng `bound-model-motion-2.2.8`.
- Public `modelEntryParts`/`modelExitParts`, production `validatePropBindings`, production cinematic/explainer/pipeline giữ guard. Không có public skip flag hoặc caller-supplied validator/bake. Source audit all-passed vẫn không là quyền final; profile/plate phải có QA đúng code/version, voice/review/QC vẫn phải đạt.
- Static pack ghi scope và code hashes mới. Không tạo accepted ledger, production rig/head bank, audio, MP4 hoặc artifact approval. Catalogue vẫn false/null/empty. Preview của project thật vẫn phải vượt **toàn** source audit, camera, cue/target/own art/resource checks rồi mới dùng chung emitter; nhãn chưa duyệt/không audio và scene security5 giữ nguyên. Không tuyên bố fixture là một project phim hợp lệ.

## Kiểm tra và model hỗ trợ

Sáu callback mới trong `tests/source-model-boundaries.test.ts` **DECLARED / NOT RUN**: physical thrust endpoints; continuous camera swaps; truncated/foreign/narration context; later sibling owner/dimension/glyph/phase/registration; first/cut camera bindings; production entry vẫn bị chặn. Factory chỉ nằm trong callback, implementation không gọi chúng.

Build/typecheck, schema **definition** export và inventory raw source/header/hash là kiểm source, không kiểm runtime/anatomy/art/motion. Bằng chứng/handles nằm tại `reviews/original-model-boundaries-source-record-v1.json` và `reviews/original-model-boundaries-static-record-v1.json`.

Combo `tester` của 9router đã xác nhận HTTP200 → `gpt-6-luna` → `TESTER_OK` (1.787s); đây là kết nối chat, không tự cấp terminal/browser cho model. Lượt giao viết test cho `cx/gpt-6.1-sol`, yêu cầu `xhigh`, dùng snapshot source có SHA, dừng phía client sau55s mà không có reply/job handle. Provider state **unknown**, không gọi lại và không tuyên bố đã hủy phía provider. Parent tự viết sáu declarations; không có code hoặc phán quyết từ lượt đó được tích hợp. Không có test/video do 9router chạy.

## Lệnh dành cho model test của người dùng

Implementation không chạy các lệnh runtime sau. D checkout và server8850 giữ nguyên. Môi trường source: Windows/PowerShell, Node>=22.13 (build bằng24.19), `node_modules` hiện có. Browser/Hyperframes/FFmpeg/FFprobe chỉ cần cho QA/render sau; TTS/ASR cần khi kiểm ba luồng thực.

```powershell
Set-Location -LiteralPath 'C:/Users/Duongvh-pc/.codex/worktrees/stickman-acting-v22/Story-2-video-factory2.1'
git rev-parse HEAD
node --experimental-test-module-mocks --import tsx --test --test-concurrency=1 tests/source-model-boundaries.test.ts tests/source-spear-model.test.ts tests/source-spear-actions.test.ts tests/source-spear-emitted.test.ts tests/original-source-preview.test.ts

$env:STUDIO_PORT='8861'
$env:STUDIO_PROJECTS_ROOT='C:/Users/Duongvh-pc/.codex/tmp/story-factory-source106-test-projects'
npm run studio
```

Port8861 là lựa chọn cho test riêng; nếu đang có service, chọn port trống khác, không dừng service đang dùng. Server bind127.0.0.1. Giữ riêng bản sao project test với toàn artifacts nguồn/cast/clock; không chỉnh project của người dùng đang chạy. Trong Studio bấm **Kiểm tra cảnh**, hoặc đọc endpoint sau khi điền đúng tên:

```powershell
$taskProject='TEN_PROJECT_TEST'
Invoke-RestMethod -Uri ('http://127.0.0.1:8861/api/projects/'+[Uri]::EscapeDataString($taskProject)+'/source-audit') -Headers @{'X-Studio-Request'='1'} | ConvertTo-Json -Depth 100
```

1. Ghi full Git SHA, command, exit, raw failures, artifact receipts và riêng PASS/FAIL/SKIP/NOT RUN. Sáu declarations cần chạy thật; fixture failure phải báo lại, không bỏ assertion hoặc gọi SKIP là PASS.
2. Kiểm trên **project câu chuyện thật** có actual sourced hold/thrust, cue và target, đầy đủ original camera run/cast/continuity.models/world/assets. Các fixture chỉ kiểm regression, không thay video yêu cầu. Guard production không được làm candidate bỏ qua world/contact/action/cue/camera/final direction. Audit phải giữ lỗi/unavailable của từng người.
3. Kiểm đầu/cuối và quanh ready/contact/recover/cut, swap primary/supporting, đồng thời props độc lập/canonical. Giáo đúng dài, một glyph, hai tay tiếp xúc đúng, không teleport hoặc duplicate contact sau cut; target phản ứng sau contact. Ghi rõ physical source geometry so với emitted transforms/relations/visible drawing, không chỉ tọa độ đơn lẻ.
4. Khi whole original audit đạt, dùng `npm run source:preview -- --project <absolute-existing-project> --shot <original-shot-id>` theo `ORIGINAL-SOURCE-PREVIEW-HANDOFF.md`. Preview có nhãn và im lặng; phải kiểm asset/code bytes rồi xem normal-speed và random/reverse seeks. Preview/artifacts/audit không được chuyển vào final bằng bỏ notes/marker. Nếu chưa có original project hợp lệ, ghi thiếu context; không tạo một mini demo khác rồi báo toàn tool đạt.
5. Full pipeline production và film QA vẫn cần đúng profile/own source/plate ledger cùng audio thực, screenplay fidelity, EN chính/VI/JA/KO/external-local TTS, actor roles/partner gaze, vivid backgrounds, director/camera, lock/cache/resume/rebuild và final MP4/SRT/thumbnail/reports/QC. Nhánh topic/story, exact script, original WAV đều cần current-source bằng chứng riêng.

## Phần còn thiếu

Chưa có QA runtime/video Lila/Karo hiện tại. Cần own continuous head/body turns, tool/seat/hunt/grasp/handoff và quần chúng, tóc/vạt áo theo motion, anatomy/viền/mặt đúng nguồn, vivid day/sunset/night và partner acting trên câu chuyện thật. Các binding và production barriers còn lại phải tích hợp với nghiệm thu thật, không mở chỉ vì build hoặc source audit đạt. Không có phần trăm hoàn thành hoặc ngày hoàn tất được suy ra từ số file/guard đã viết. Mục tiêu là đưa câu chuyện/kịch bản/WAV vào tool và nhận video đúng nội dung; mục tiêu tổng vẫn đang hoạt động.
