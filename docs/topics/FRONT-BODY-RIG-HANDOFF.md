# Rig chính diện riêng Lila/Karo — source0.92

`forest-tribe-0.92-front-body-rig`. Mục tiêu sản phẩm vẫn là câu chuyện/chủ đề bất kỳ → kịch bản → diễn viên trong câu chuyện → video có giọng/phụ đề/QC; script nguyên văn/thoại theo vai và WAV gốc dùng clock riêng. Đây là phần tích hợp rig đang phát triển, **chưa phải video đạt chất lượng hay sản phẩm dùng được hoàn chỉnh**.

## Thay đổi thực tế

- `body-view-front-registration.ts` đăng ký riêng PNG front của từng người: canvas, SHA, head/clothing masks, cổ/vai/hông, scale. Các tọa độ/mask là xấp xỉ tác giả dựng thủ công, chưa đo anatomy/yaw, chưa duyệt hình hay pose. Không sao chép ROI/tọa độ từ ảnh3/4.
- `bodyCandidateRegistrations` nhận front; `bodyViewRegistrations` và `REGISTERED_BODY_VIEWS` giữ đúng hai góc3/4 cho các tính năng cũ. Bốn registration3/4 không đổi dữ liệu.
- Renderer dùng own-front head/áo, hai tay đồng phẳng trước thân và dưới đầu ở rest/point. Khi think tiếp xúc cằm, compiler đổi đúng một painter tay/mitten sang foreground chung như rig nguồn; không vẽ hai lần cùng tay. Giữ xương vật lý, mitten/sole của cùng diễn viên từ rig nguồn; không lật hoặc warp mặt. `bodyViewFacing` trả `front` thật.
- Compiler và workbench có fixed-happy/silent/rigid **rest, point, think**, cả hai tay. Schema và accessor raw chặn front speech/eyes/emotion/locomotion/seat/cloth-hair follow/manipulation/tools/head bank/supporting/source-colour; source carriers/props/turn/gaze cũng không được dùng như dữ liệu đã đăng ký. Các consumer chi tiết và tracer seat chỉ dùng accessor nhận3/4.
- Gallery/API inventory phân biệt có ảnh, có đăng ký kỹ thuật và có nghiệm thu production. Metadata ảnh gốc không bị sửa thành approved/registered. Không tạo thêm ảnh trong mốc này.

| Diễn viên | Source PNG | Canvas | SHA256 |
|---|---|---|---|
| Lila | `library/topics/prehistoric-life/body-views/lila-front-v1.png` | 939×1675 | `f25c96337a4afbee79a9ed2650e1f065d43a5bb92eade24201cafe30acff36ce` |
| Karo | `library/topics/prehistoric-life/body-views/karo-front-v1.png` | 1024×1536 | `51dbffa390baea557b569d293bb9e7d87ad53948da17c253d060cc9efb5b1f9e` |

Karo front có alpha nhưng không có pixel alpha255 theo inventory0.91; alpha không được normalize. Lila tóc buộc chồng vùng vai/thân; cần review mask và overlap trên nền sáng/tươi. Preview ảnh trên matte đen che nét tay/chân đen, không chứng minh chân/tay thiếu. Chưa có bằng chứng mặt, trang phục, khớp hoặc trọng lượng cơ thể đạt ở rig render. Karo source happy có miệng cười mở; trạng thái silent ở đây chỉ là không animation thoại, chưa chứng minh mouth-rest cho narration.

## Môi trường và lệnh giao model test

Chỉ model test của người dùng chạy các lệnh dưới. Implementation chỉ build/typecheck, export định nghĩa schema và kiểm inventory nguồn; **không chạy callback, fixture, sampler, render, browser, server, TTS/ASR hoặc video**.

Windows PowerShell, Node≥22.13.0 (máy hiện tại24.19.0), dependencies theo lockfile. Dùng worktree C chứa source0.92; không ghi vào checkout D hoặc server8850. Trong PowerShell riêng:

```powershell
Set-Location 'C:\Users\Duongvh-pc\.codex\worktrees\stickman-acting-v22\Story-2-video-factory2.1'
npm run build
npm run test:typecheck
node --experimental-test-module-mocks --import tsx --test --test-concurrency=1 tests/native-front-body.test.ts tests/native-seat.test.ts tests/native-secondary.test.ts tests/native-view-eyes.test.ts tests/native-head-seat-tracer.test.ts tests/partner-facing-views.test.ts tests/view-art-catalog.test.ts
$env:STUDIO_PORT = '8851'
$env:STUDIO_PROJECTS_ROOT = 'C:\Users\Duongvh-pc\.codex\tmp\story-factory-front-test-projects'
$env:STORY_FACTORY_ENV_FILE = 'D:\github\Story-2-video-factory2.1\.env'
npm run studio
```

Server: `http://127.0.0.1:8851`. Dừng bằng Ctrl+C tại terminal server. Không gửi key vào chat; `.env` không được commit. Kiểm chứng rig không cần model/TTS. Khi nghiệm thu pipeline có API/TTS, giữ giới hạn gọi/cost của ca người dùng đã duyệt và các production blockers.

Các URL review source:

- `/api/topics/prehistoric-life/view-registration`: so ảnh/mask/vai/hông/cổ; front là xấp xỉ chưa đo, không phải anatomy đạt.
- `/api/topics/prehistoric-life/body?view=front&action=rest&timeMs=0&mood=happy`
- `/api/topics/prehistoric-life/body?view=front&action=point&hand=left&timeMs=1771&mood=happy`
- `/api/topics/prehistoric-life/body?view=front&action=think&hand=right&timeMs=1771&mood=happy`
- `/api/topics/prehistoric-life/view-art/inventory`: front source match riêng nhưng production slots vẫn0.

Trang body cho cả hai diễn viên. Kiểm cả hai tay, nhiều thời điểm và seek ngẫu nhiên/đảo chiều, không chỉ ảnh chụp duy nhất. Toàn bộ `tests/native-front-body.test.ts` có sáu callback **DECLARED / NOT RUN**; năm module legacy chỉ đổi accessor để giữ đúng bank3/4, không nới điều kiện nghiệm thu.

## Tiêu chí review và việc còn thiếu

Phải xem render/video thật: head/neck/hair seam, mắt/mũi/miệng đúng hình nguồn, mask giữ ink áo/quần, không giữ tay cũ trong mask, không cắt tóc/viền hoặc double ink; vai/hông/front orientation đúng; hai arm painter duy nhất; xương không co giãn, khuỷu/cổ tay hợp lý và sole đứng yên. Tọa độ và mask hiện có thể sai và phải sửa theo bằng chứng này. Nếu sai, ghi full commit, actor/action/hand/time, frame và bước tái hiện; không coi build hoặc đọc source là PASS.

Còn phải triển khai/hoàn thiện own profile/rear rig, registered front speech/eyes/emotions/acting/cloth/hair, chuyển đầu/thân liên tục qua view, run/jump/hunt/spear/grip/seat/contact/partner gaze; bối cảnh day/sunset/night sống động, đạo diễn/camera, nhiều vai và tương tác. Tiếp đó kiểm story→script, exact script/dialogue, original WAV/legacy SRT, EN chính/VI/JA/KO/TTS ngoài-local, resume/locks/rebuild/review/repair và final MP4/audio/SRT/thumbnail/storyboard/profile/timeline/manifest/QC trên câu chuyện mới. Chủ đề máy móc hay một demo món ăn không thay tool tổng quát.

`productionReady=false`, `productionRig=null`, `availableBanks=[]`, art/motion/production approvals=false. Giữ topic pre-model/TTS gate và `needs-source-prop-binding`; không mở final/DONE bằng riêng thay đổi này. Kết quả V1 không nghiệm thu0.92. [Lịch sử artwork0.91](FRONT-REAR-ART-HANDOFF.md), [đặc tả đầy đủ](CUOC-SONG-THOI-TIEN-SU.md).

## Kiểm source và bàn giao

Kết quả build/typecheck/schema-definition/raw inventory và source-only agent advice được ghi trong `reviews/front-body-source-record-v1.json` và `reviews/front-body-static-record-v1.json` sau khi kiểm source cuối. Git full SHA được xác nhận ngoài repo để tránh tự tham chiếu hash. Mọi test/render/video và nghiệm thu toàn bộ sản phẩm vẫn **NOT RUN / PENDING**.

### Kết quả kiểm source đã ghi

Build và test:typecheck exit0; schema definitions export exit0; pack inventory và raw static inventory exit0. 307 raster giữ nguyên byte (144 PNG/163 JPEG; 101 JPEG tên PNG),18 head definitions và27 head metadata giữ nguyên; legacy registration data fixed2 giữ nguyên. Manifest có156 mapped source hashes và46 scalar code entries đã đối chiếu. Sáu callback mới DECLARED/NOT RUN; năm module test legacy và tracer chỉ đổi accessor3/4, không chạy. Code review qua planner/tester chỉ là lời khuyên nguồn, không nghiệm thu. 43 đường dẫn thuộc source này được freeze/stage riêng;52 untracked khác giữ nguyên. Git/GitHub full SHA xác nhận trong hồ sơ ngoài repo. Chưa có render/video/test hoặc bằng chứng độ mượt cho0.92.
