# Chính diện và góc lưng Lila/Karo — source0.91

`forest-tribe-0.91-front-rear-art`; source-art candidate, chưa là rig/turn/video đã nghiệm thu. Mục tiêu vẫn là câu chuyện/chủ đề bất kỳ → screenplay, script nguyên văn/thoại theo vai hoặc WAV gốc → diễn viên trong câu chuyện → video có giọng/phụ đề/QC. [Giọng theo vai](EXPLICIT-DIALOGUE-VOICES-HANDOFF.md) và [profile phải](RIGHT-PROFILE-ART-HANDOFF.md) tiếp tục áp dụng.

## Artwork mới và nguồn

Built-in imagegen,8 calls:6 nguồn riêng chính diện/hai góc lưng3/4 và2 repair hướng đầu. Mỗi PNG giữ nguyên byte từ Codex generated_images; JSON cùng tên giữ prompt cuối, primary/edit roles và SHA, raw alpha/bounds/pixel hash, requested view/yaw=null và false flags. Không dùng ảnh white-face/chibi/sheet chi tiết thay primary ấm của người dùng. Không crop/resize/mirror/warp/recolor/normalize alpha hoặc mượn ROI/tọa độ góc khác.

| Diễn viên | Chính diện | Lưng3/4 trái | Lưng3/4 phải |
|---|---|---|---|
| Lila | [V1](../../library/topics/prehistoric-life/body-views/lila-front-v1.png) | [V1](../../library/topics/prehistoric-life/body-views/lila-back-three-quarter-left-v1.png),[V2](../../library/topics/prehistoric-life/body-views/lila-back-three-quarter-left-v2.png) | [V1](../../library/topics/prehistoric-life/body-views/lila-back-three-quarter-right-v1.png) |
| Karo | [V1](../../library/topics/prehistoric-life/body-views/karo-front-v1.png) | [V1](../../library/topics/prehistoric-life/body-views/karo-back-three-quarter-left-v1.png) | [V1](../../library/topics/prehistoric-life/body-views/karo-back-three-quarter-right-v1.png),[V2](../../library/topics/prehistoric-life/body-views/karo-back-three-quarter-right-v2.png) |

Full prompts/sources nằm ở `library/topics/prehistoric-life/body-views/<actor>-<view>-vN.json`. Original generated outputs giữ nguyên ở Codex; project dùng copy trong repo. [Raw inventory/repair comparison](reviews/front-rear-art-inventory-v1.json).

## Kết quả kiểm ảnh tĩnh và giới hạn

Một lượt tester9router HTTP200/actual `gpt-6-luna`,15450 token,JSON đầy đủ. [Reply/hash/disposition](reviews/front-rear-art-advice-v1.json). Claim primary che vai image-left không khớp tam giác da trần cổ/vai image-left thấy trên primary Lila/Karo; không đảo áo theo claim này. Claim rear Lila đảo vai cũng chưa chứng minh anatomical side khi screen-side đổi theo góc. Claim crotch Karo rear-left chưa có tỷ lệ đo tương ứng; giữ pending review, không tự sửa. Review này không chứng minh identity/anatomy/turn/motion hoặc production.

Parent thấy Lila rear-left và Karo rear-right V1 còn lộ mắt/profile trong khi thân quay sau; đã tạo V2 yêu cầu đầu nhìn ra sau, che mắt. V1 giữ trạng thái held. V2 chưa review độc lập. Lila repair đổi canvas1676→1675; Karo cùng canvas nhưng đổi526140 pixel, trong đó196079 ở nửa dưới ảnh. Không nhận câu lệnh “chỉ sửa đầu” làm bằng chứng body giữ nguyên; không kế thừa masks/landmarks/coordinates.

Preview alpha trên nền đen che nét tay/chân đen. Alpha margin/extent không chứng minh đủ chi, anatomy, chân trụ hoặc garment opaque. Karo front không có pixel alpha255; các nguồn khác có số pixel255 ít. Human/model test phải xem PNG gốc trên nền sáng và day/sunset/night thật, không normalize alpha âm thầm hoặc tự duyệt từ histogram.

## Catalog và phần phải triển khai tiếp

- 14/14 vị trí metadata nguồn theo requested view,0 production. Seven views:front,3/4left,3/4right,left,right,rear3/4left,rear3/4right; back thẳng bổ sung. Không coi góc primary là front, không suy actual yaw từ tên/prompt.
- Gallery `/api/topics/prehistoric-life/view-art` hiển thị status/review notes; latest là mới nhất, không nghĩa tốt nhất/đã duyệt. Inventory `/api/topics/prehistoric-life/view-art/inventory`; ảnh dùng exact hash/header/canvas/actual MIME và nguồn primary/edit được kiểm lại khi trả ảnh. PNG original không đổi. Bốn engineering registrations3/4 cũ không đổi; các nguồn mới chưa đi vào body/host/render pipeline.
- Cần own measured landmarks, anatomical side/neck/face/eyes/shoulder/hips/feet, clothing/head/hair/beard masks/occlusion/topology và own speech/blink/emotions cho từng view; rồi continuous turns, locomotion/seat/contact/gaze/cloth/hair theo original clock. Không lấp thiếu bằng mirror/warp/portrait slideshow hoặc đổi góc cắt để giả chuyển hướng.
- Một video giữ identity diễn viên, không ép host giải thích. Đạo diễn/camera/world/props/crowd/ownership cần tương tác đúng kịch bản và màu tươi/chiều sâu thật; nam phụ trọc/không tóc/không râu, nữ phụ giữ nguyên.

## Test do model của người dùng thực hiện

Một callback trong `tests/view-art-catalog.test.ts` được cập nhật cho14 requested source slots/latest rearV2 và partial inventory thiếu front; tổng6 callbacks **DECLARED / NOT RUN**,0 callback mới. Implementation không chạy tests/fixtures/schema instances/geometry/compiler/browser/server/API pipeline/TTS/ASR/audio/video.

Windows PowerShell,Node>=22.13,lockfile dependencies. Ghi full SHA/commands/exit/output/NOT RUN và ảnh/video thực. Giữ D checkout/cổng8850; model test dùng port/root riêng sau khi xác nhận8851 trống:

```powershell
Set-Location -LiteralPath 'C:/Users/Duongvh-pc/.codex/worktrees/stickman-acting-v22/Story-2-video-factory2.1'
git rev-parse HEAD
npm run build
npm run test:typecheck
node --experimental-test-module-mocks --import tsx --test --test-concurrency=1 tests/view-art-catalog.test.ts tests/partner-facing-views.test.ts tests/native-head-bank.test.ts
$env:STUDIO_PORT='8851'
$env:STUDIO_PROJECTS_ROOT='C:/Users/Duongvh-pc/.codex/tmp/story-factory-front-rear-tests'
npm run studio
```

Mở gallery/view-registration,đối chiếu primary và6 nguồn/V2 sửa:đúng mặt/mắt/mũi/miệng/tóc/râu/trang phục/màu/viền/alpha,head-body angle và anatomical shoulder,hai cuff Karo/một váy Lila,tay/chân/sole. API/browser kiểm source stale/link/actual MIME/canvas,no-store/nosniff,375/760/1280width và không chọn vào production tự động. Full rig/60fps/normal-speed/seek/cut/role-swap/contact/speech review còn phải chạy sau registration phù hợp.

Ba input + legacy SRT,EN chính/VI/JA/KO/external-local TTS,resume/locks/rebuild/review/repair và final MP4/audio/SRT/thumbnail/storyboard/profile/timeline/manifest/QC vẫn chưa nghiệm thu. Giữ productionReady=false,productionRig=null,availableBanks=[] và false art/motion/production approvals. **Không gỡ needs-source-prop-binding riêng lẻ.** TEST-RESULTS.md V1 không nghiệm thu source0.91; build/typecheck/schema/raw inventory chỉ kiểm source.

## Source checks và bàn giao source0.91

Build/typecheck/schema definition export/raw pack/raw static inventory đều kết thúc exit0. 299 ảnh cũ,18 head definitions và27 head metadata nguyên byte;8 PNG mới nguyên byte từ imagegen, tổng307 raster thuộc source.14/14 metadata nguồn theo hướng yêu cầu,0 production. Một callback cập nhật,6 tổng DECLARED/NOT RUN. [Source checks](reviews/front-rear-source-record-v1.json),[raw static record](reviews/front-rear-static-record-v1.json). Source text so Git có chuẩn hóa CRLF sẵn trong checkout; không sửa các file cũ đó.

Full SHA xem `git rev-parse HEAD` trên `codex/prehistoric-life`; freeze/verification nằm ngoài repo tránh tự tham chiếu SHA. 52 đường dẫn untracked không thuộc thay đổi giữ nguyên. Source checks không xác nhận rig, độ mượt hay nghiệm thu tool; các điều kiện production tiếp tục chặn.
