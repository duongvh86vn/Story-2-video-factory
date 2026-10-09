# Camera repair theo đúng revision — source0.78

Cập nhật source0.79: [đúng người, đúng vật và entity motion](ENTITY-MOTION-HANDOFF.md). Prop IDs theo từng diễn viên; relation/flow dùng canonical entity, không chọn theo tên prop của người đầu tiên. Đã sửa thêm explicit legacy primary binding. Source vẫn chưa nghiệm thu native art/motion/video và toàn luồng. Các mốc dưới đây là lịch sử.

Mục tiêu vẫn là câu chuyện → kịch bản, kịch bản nguyên văn hoặc WAV → video có diễn viên trong câu chuyện. Source0.78 sửa một lỗi được phát hiện khi đọc code camera repair sau [source0.77](OWNERSHIP-OBSERVATION-HANDOFF.md). Chưa chạy lại lỗi hoặc nghiệm thu video. Không đổi ảnh, nét, mặt, tóc, trang phục hoặc màu; nam phụ trọc/không râu và nữ phụ giữ nguyên.

## Lỗi và thay đổi

Source publication identity chứa toàn bộ các shot thuộc original clock, bao gồm camera. Trước đây `repairCinematicCameras` lấy binding của storyboard cũ rồi kiểm storyboard mới bằng binding ấy. Một sửa camera hợp lệ cũng đổi fingerprint, nên nhánh source-aware có thể bị từ chối như nguồn bị thay đổi. Đây là kết luận từ source; không phải kết quả chạy runtime.

`camera-repair-source.ts` đóng băng riêng hai snapshot: board/narration/shot source binding trước sửa và của candidate sau canonical validation. Khi publish, pha `before` kiểm snapshot gốc, pha `after` kiểm snapshot candidate. Vẫn so toàn bộ source/config/assets/locks trước và sau transaction; `assertCameraOnlyChange` vẫn cấm đổi body, hành động, vật, cue, source clock, bố trí hoặc shot khóa. Report ghi cả hai revision.

Candidate chỉ là kế hoạch camera mới. Binding của scene đã render và receipt review cũ vẫn phải thất bại khi đối chiếu với storyboard mới, kể cả thay camera ở shot khác thuộc original run. Không retag scene/review/audio/MP4 cũ thành đã nghiệm thu. Bước rebuild scene → draft → review mới → final/QC vẫn bắt buộc. Helper snapshot không thay canonical validator hoặc final gate.

Phiên bản topic=`forest-tribe-0.78-camera-revision`, camera repair=`camera-repair-2`, snapshot=`camera-repair-source-1`. Renderer/interactions/cast-camera/source-prop versions của0.77 giữ nguyên. Manifest ghi hash helper và speech binding hiện hành. `needs-source-prop-binding`, productionReady=false, productionRig=null, availableBanks=[] và art/motion/production approval=false vẫn giữ. Chưa mở ownership production.

## Phân việc qua 9router

Một task độc lập `ownership-source-audit-v1` gửi ba module ownership source0.77 cho `cx/gpt-6.1-sol`, yêu cầu reasoning `xhigh`. Backend trả `gpt-6.1-sol`, tổng15.519 tokens (9.796 prompt +5.723 completion), một lượt, không retry. Mức reasoning thực không được xác nhận độc lập; requested max output4.200 không được backend cưỡng chế. Agent chỉ review text, không chạy code hay test và không review bản sửa camera của parent.

Agent nêu một giới hạn: hai actor dùng cùng propId cục bộ bị candidate renderer từ chối. Parent chưa đổi guard: `library/shots/cinematic.ts` hiện có map frame key bằng propId; cho alias trùng mà chưa chuyển hết lookup sang owner-qualified identity có thể chọn sai người. Contract hiện yêu cầu alias ID khác nhau và báo lỗi rõ. Muốn hỗ trợ alias trùng cần sửa đồng bộ mọi lookup/frame/effect/camera/report và test của model người dùng. Đây là giới hạn tương thích đã xác định, chưa là tính năng được sửa.

Combo `tester` người dùng vừa tạo đã gọi thử thành công: HTTP200, response model=`gpt-6-luna`, trả `TESTER_OK`, khoảng1,4s,44 tokens. Đây chỉ là kiểm tra kết nối. Lượt chat này chưa chạy bất kỳ bộ test dự án nào; gọi chat API không tự cấp shell/browser cho model từ xa.

Chi tiết source review và đánh giá parent: [agent record](reviews/camera-revision-agent-record-v1.json). Kiểm tra biên dịch và bytes: [source record](reviews/camera-revision-source-record-v1.json), [static record](reviews/camera-revision-static-record-v1.json). Không có key hoặc env trong báo cáo.

## Test bàn giao — NOT RUN

Sáu callback mới trong `tests/camera-repair-source.test.ts` chỉ được viết và typecheck. Chúng kiểm hai revision khác nhau, pha publish đúng/sai, old scene binding và sibling camera, source/narration thay đổi, lock/noncamera authority và fingerprint riêng của mỗi shot. Chưa gọi fixtures, geometry, renderer, provider pipeline hoặc test callbacks. Các callback này không thay test end-to-end `repairCinematicCameras`/transaction/rollback.

Môi trường source: worktree C dưới đây, Node24.19.0 (tối thiểu22.13), dependencies đã có. Checkout D và server8850 giữ nguyên. Implementation chỉ build/typecheck/schema definition export và kiểm kê bytes/metadata; runtime do model của người dùng chạy.

Các lệnh sau **chỉ bàn giao**, chưa được implementation thực thi:

```powershell
Set-Location -LiteralPath 'C:/Users/Duongvh-pc/.codex/worktrees/stickman-acting-v22/Story-2-video-factory2.1'
git rev-parse HEAD
node --experimental-test-module-mocks --import tsx --test --test-concurrency=1 tests/camera-repair-source.test.ts tests/camera-direction.test.ts tests/cast-camera.test.ts tests/source-world.test.ts tests/source-prop-binding.test.ts tests/source-interactions.test.ts tests/source-ownership.test.ts tests/ownership-render.test.ts tests/ownership-observation.test.ts
$env:STUDIO_PORT='8861'
$env:STUDIO_PROJECTS_ROOT='C:/Users/Duongvh-pc/.codex/tmp/story-factory-source078-test-projects'
npm run studio
```

Mở `http://127.0.0.1:8861/`. Chỉ dùng project riêng và tài nguyên hợp lệ; không giả approval hoặc xóa source fields để vượt production guard. Với ownership còn chặn production, tester kiểm helper candidate riêng; chưa được gọi full repair thành công là bằng chứng đã mở production.

Model test cần ghi đầy đủ SHA, lệnh/kết quả và thiếu sót:

1. Camera-only edit hợp lệ giữ nguyên narration, full original body/head/prop clock, cast, target và locks. Publish trước bằng snapshot cũ và sau bằng snapshot mới; provider/normalizer không được sửa field khác.
2. Thay source/assets/narration/config/locks trong lúc provider chờ hoặc giữa transaction phải từ chối/rollback đúng. Kiểm crash/failure ở cả hai pha và mọi pending plan/report; snapshot không phải OS snapshot/CAS.
3. Sau camera sửa, old scene, preview, review receipt, final/QC/download không được tiếp tục hợp lệ. Rebuild và review mới trên đúng camera/source/asset/audio bytes. Không giữ một render cũ bằng cách viết lại binding của nó.
4. Kiểm preflight envelope với renderer có actual actor breakpoints, contact/release/authority boundaries, forward/reverse/random seek, primary/supporting swaps, đúng palm/entity/depth/shadow và report recomputation.
5. Kiểm video tốc độ thường: mặt/mắt/tóc/viền/trang phục đúng mẫu, tay chân mềm hợp lý, nhìn bạn diễn, màu sống động và camera phục vụ diễn xuất. Tiếp tục toàn story/script/WAV, EN chính/VI/JA/KO, local/external TTS, resume/rebuild/locks và final MP4/audio/subtitle/thumbnail/QC. Kết quả V1 không nghiệm thu luồng mới.

## Còn thiếu

Integrated production source semantics và native art/motion acceptance vẫn chờ; ownership generic không xoay chưa hỗ trợ rotating spear, airborne drop, mixed local bindings hoặc depth thay trong action. Chưa có bằng chứng source0.78 làm video mượt hơn; bản sửa này giải quyết identity của kế hoạch camera. Toàn mục tiêu sản phẩm chưa hoàn thành.
