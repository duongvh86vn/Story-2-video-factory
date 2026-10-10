# Rig nghiêng và góc lưng — source0.93

`forest-tribe-0.93-profile-rear-body-rigs`. Mục tiêu vẫn là một tool nhận câu chuyện/chủ đề → kịch bản, script nguyên văn/thoại theo vai hoặc WAV gốc → các diễn viên trong câu chuyện → video có giọng/subtitle/QC. Thay đổi này nối thêm góc nhìn và sửa cơ chế tay nghỉ; **chưa chứng minh hình đẹp, khớp hợp lý, chuyển hướng liên tục hoặc video đạt mục tiêu**.

## Đã viết trong source

- Thêm tám own-source registration: Lila/Karo × profile trái/phải và lưng3/4 trái/phải. Mỗi registration có đúng file/SHA/canvas riêng, masks, cổ/vai/hông, head scale, arm depth và neutral-arm cues. Không sửa ảnh hoặc generation metadata, không mirror/warp mặt hay mượn tọa độ góc3/4.
- Front/profile/rear dùng cùng capability boundary ở schema, raw profile accessor, detailed consumers, compiler và workbench. Bốn registration3/4 cũ giữ nguyên dữ liệu. Có14 engineering source positions không đồng nghĩa có14 view đã nghiệm thu.
- Tay nghỉ của front/profile/rear được dựng lại từ hướng upper/forearm tác giả đặt trên từng nguồn, dùng chiều dài xương và wrist-to-palm của cùng diễn viên. Khuỷu dùng một pole theo hướng vẽ này trong rest, gesture-entry và recovery; không chọn lại theo target từng frame. Các góc3/4 cũ không chọn helper/cues mới.
- Góc lưng có `chin=null`. Compiler chỉ đọc chin cho think; rest/point không gọi fallback cằm/mặt của góc khác. Gọi chin trực tiếp hoặc chọn think ở góc lưng báo thiếu registration.
- Discovery/API/source gallery nhận đủ bảy hướng fixed. Đây vẫn là từng rig cố định; chưa nội suy/chuyển hướng liên tục. Không gọi chuyển cảnh giữa những ảnh này là continuous turn hoặc animation đã nghiệm thu.

| Nguồn | Body/head ID trong contract | Source-art ID giữ nguyên | Pose kỹ thuật đang có |
|---|---|---|---|
| Chính diện | `front` | `front` | silent/happy/rigid rest, point, think |
| Profile trái/phải | `left`, `right` | `left`, `right` | silent/happy/rigid rest, point, think |
| Lưng3/4 trái/phải | `back-left`, `back-right` | `back-three-quarter-left`, `back-three-quarter-right` | silent/fixed-source/rigid rest, point; không think/chin |
| 3/4 trái/phải cũ | `three-quarter-left`, `three-quarter-right` | cùng ID | Giữ các candidate features/source clocks trước đó; chưa production |

`Facing=left/right` ở profile/rear chỉ là quy ước hướng ngang trong contract, không đo yaw hoặc hướng nhìn quang học. Đầu/thân dùng đúng source ID. Màu, biểu cảm, tóc/râu/trang phục và tỷ lệ nguồn mới vẫn cần đối chiếu ảnh primary của người dùng.

## Nguồn ảnh và thẩm quyền tọa độ

Source files trong `library/topics/prehistoric-life/body-views/`:

- Lila: `lila-left-v2.png`, `lila-right-v3.png`, `lila-back-three-quarter-left-v2.png`, `lila-back-three-quarter-right-v1.png`.
- Karo: `karo-left-v1.png`, `karo-right-v2.png`, `karo-back-three-quarter-left-v1.png`, `karo-back-three-quarter-right-v2.png`.

`body-view-oblique-registration.ts` chứa canvas/SHA và dữ liệu từng source. Landmark, masks, depth và arm directions là **xấp xỉ authoring, không phải đo anatomy/yaw/pose**. Source Karo profile trái có neck/nose/beard dài, Lila profile trái có head/canvas khác; không tự chấp thuận identity. Matte đen che nét đen, không chứng minh thiếu tay/chân.

Ba yêu cầu 9router chỉ đọc source/ảnh tĩnh: planner cho neutral-arm và architect cho profile hết timeout180s; architect rear trả HTTP200/model `gpt-6-astra`, JSON đầy đủ. Không retry/khởi động lại request. Client timeout không chứng minh công việc phía provider đã hủy; không có job handle để theo dõi phía provider. Bản rear đề xuất pelvis Lila lệch các hàng màu belt gốc và bỏ tie; parent sửa anchor/tie mask theo chính source, không áp dụng mù đề xuất. Các sửa này **chưa có render/visual approval**. [Hồ sơ authoring và phần chưa chắc](reviews/oblique-body-authoring-v1.json), [reply nguồn và giới hạn](reviews/oblique-body-agent-advice-v1.json).

Long ponytail/head mask có thể che gần vai/thân hoặc mất/cắt tie/ink, garment mask có thể giữ tay cũ/cắt viền. Rear hips, depth và shoulder ownership vẫn là ứng viên; skin/hair/clothes ở vùng bị che chưa được tái dựng. Source alpha/bounds không xác nhận topology. Helper rest-arm chỉ giải quyết dữ liệu neutral vector/pole; không chứng nhận tất cả khớp hay chuyển động đúng.

## Giao model test

Implementation không chạy callbacks, fixture, sampler, compiler/render, server/browser, TTS/ASR hay video. Source build/typecheck, definition export và source asset inventory được ghi riêng. Tám callback mới ở `tests/native-oblique-body.test.ts` **DECLARED / NOT RUN**; sáu callback front cũng chưa chạy (chỉ cập nhật expected discovery list). Model test chạy trong PowerShell riêng, worktree C, giữ checkout D và server8850:

```powershell
Set-Location 'C:\Users\Duongvh-pc\.codex\worktrees\stickman-acting-v22\Story-2-video-factory2.1'
npm run build
npm run test:typecheck
node --experimental-test-module-mocks --import tsx --test --test-concurrency=1 tests/native-oblique-body.test.ts tests/native-front-body.test.ts tests/partner-facing-views.test.ts tests/native-seat.test.ts tests/native-secondary.test.ts tests/native-view-eyes.test.ts tests/native-head-seat-tracer.test.ts tests/view-art-catalog.test.ts
$env:STUDIO_PORT = '8851'
$env:STUDIO_PROJECTS_ROOT = 'C:\Users\Duongvh-pc\.codex\tmp\story-factory-oblique-test-projects'
$env:STORY_FACTORY_ENV_FILE = 'D:\github\Story-2-video-factory2.1\.env'
npm run studio
```

Windows/Node≥22.13.0; máy hiện tại Node24.19.0, dependencies từ lockfile. Server `http://127.0.0.1:8851`, dừng Ctrl+C ở terminal đó. `.env` chỉ đọc cấu hình; không commit hoặc đưa key vào chat. Review rig không cần gọi model/TTS. Khi test pipeline/API/TTS, giữ giới hạn ca/cost người dùng đã duyệt.

URL nguồn (thay `view`, `hand`, `timeMs` và action để xem tất cả case):

- `/api/topics/prehistoric-life/view-registration`
- `/api/topics/prehistoric-life/body?view=left&action=point&hand=left&timeMs=1771&mood=happy`
- `/api/topics/prehistoric-life/body?view=right&action=think&hand=right&timeMs=1771&mood=happy`
- `/api/topics/prehistoric-life/body?view=back-left&action=rest&timeMs=0&mood=happy`
- `/api/topics/prehistoric-life/body?view=back-right&action=point&hand=right&timeMs=1771&mood=happy`
- `/api/topics/prehistoric-life/view-art/inventory`

Kiểm cả Lila/Karo, cả hai tay, entry/hold/recovery, seek ngẫu nhiên/đảo chiều, khung toàn thân và cận. So PNG gốc và rig trên nền sáng/tươi: mặt đúng nguồn, seam cổ/tóc/râu/tie, ink áo/quần/cuff/hem, không tay/đầu nguồn sót trong masks, không double painter, near/far/occlusion hợp lý. Xương/mitten/sole không co giãn; khuỷu/cổ tay/chân trụ/hip hợp lý ở toàn chu kỳ. Ghi full SHA, actor/view/action/hand/time và frame/video lỗi. Các test invariant passing cũng không tự chứng minh hình đẹp/diễn xuất đạt.

## Còn phải hoàn thiện để dùng tool

Own per-view speech/eyes/emotions/acting/locomotion/seat/cloth/hair/manipulation; anatomy/identity/mask corrections theo render thật; chuyển đầu/thân liên tục không face warp/stepped swap; run/jump/hunt/spear/grasp/contact/partner gaze. Bối cảnh day/sunset/night có chiều sâu và màu tươi; đạo diễn/camera, nhiều vai và vật thể có phản ứng. Ba input/câu chuyện mới, script/thoại nguyên văn, WAV/legacy SRT, EN chính/VI/JA/KO và TTS ngoài-local, resume/locks/rebuild/review/repair, final MP4/audio/SRT/thumbnail/storyboard/profile/timeline/manifest/QC đều cần kiểm toàn tuyến.

Giữ `productionReady=false`, `productionRig=null`, `availableBanks=[]`, mọi art/motion/production approvals=false, topic pre-model/TTS gate và `needs-source-prop-binding`. Không final/DONE từ mốc này. V1 và báo cáo source0.92 không nghiệm thu0.93. [Đặc tả đầy đủ](CUOC-SONG-THOI-TIEN-SU.md).

## Hồ sơ source

`reviews/oblique-body-source-record-v1.json` và `reviews/oblique-body-static-record-v1.json` ghi kiểm source cuối. Git/GitHub full SHA xác nhận ngoài repo để tránh tự tham chiếu. Bằng chứng này không thay video/test/runtime acceptance.

### Kết quả kiểm source đã ghi

Build, test:typecheck, schema definition export, source asset inventory và raw static inventory exit0. 307 raster giữ nguyên byte (144 PNG/163 JPEG;101 JPEG tên PNG),18 head definitions và27 head metadata giữ nguyên. Tám binding nguồn nghiêng/lưng và hai nguồn front được đối chiếu header/hash/alpha; tọa độ/mask vẫn chưa đo hoặc nghiệm thu. Legacy detailed registration và fixed2 order giữ nguyên. Manifest có160 mapped source hashes và46 scalar code entries đã đối chiếu. Tám callback mới và sáu callback front DECLARED/NOT RUN. 42 đường dẫn thuộc source này được freeze/stage riêng;52 untracked khác giữ nguyên. Git/GitHub full SHA xác nhận trong hồ sơ ngoài repo. Chưa có render/test/video hoặc bằng chứng độ mượt cho0.93.
