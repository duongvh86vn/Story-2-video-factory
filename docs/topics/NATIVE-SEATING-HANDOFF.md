# Lila/Karo — trang phục ngồi native và việc nối vào rig

Mốc0.40 material-only,08/10/2026, base `6767b1287dea6a27e8258e5ab61b2eb71cb4a282`, nhánh `codex/prehistoric-life`. Đây là **bước1 trong [plan native seating](../plans/2026-10-08-native-seating.md)**. Có ảnh nếp vải, sidecar và inventory mới; **chưa có pose/UV/support registration hoặc chuyển động ngồi native dùng được**.8 callback test mới NOT RUN. [Record source và kiểm tra](reviews/native-seat-material-source-record-v1.md).

## Asset đã lưu

Built-in `imagegen` tạo hai atlas mới, mỗi atlas có hai tile: bên trái atlas cho view3/4 nhìn phải, bên phải atlas cho view3/4 nhìn trái. Prompt dùng ảnh toàn thân da ấm chính của người dùng, cả hai standing native view và atlas ngồi cũ làm tham chiếu cấu trúc. Không dùng các bảng mặt trắng/ủng/cổ lông bổ trợ để thay model chính. PNG output được copy nguyên bytes từ thư mục generated_images vào dự án; các ảnh gốc và asset cũ giữ nguyên. Có đúng2 call tạo ảnh, không có call sửa lại hoặc AI review trong mốc này.

| Actor | Asset | Kích thước | SHA256 |
|---|---|---|---|
| Lila | [Váy ngồi](../../library/topics/prehistoric-life/native-seat-v1/lila-seated-folds-v1.png) |2172×724|`a8d005d62c046044466684bfe1ca59c84608aabc6bbcfa52e6ce67556828ab02`|
| Karo | [Quần ngồi](../../library/topics/prehistoric-life/native-seat-v1/karo-seated-folds-v1.png) |1774×887|`411980eb6d11c6d2a31e3419efb4f264ea82d4095b837a90ea210eca88d5eeed`|

Prompt đầy đủ và source hashes nằm tại `native-seat-v1/lila-seated-folds-v1-prompt.json` và `karo-seated-folds-v1-prompt.json`; metadata tại hai sidecar cùng tên ảnh. Parent thấy váy Lila còn một tấm liền và quần Karo có hai miệng ống/viền trên ảnh; **chưa có review độc lập cho màu, góc phối cảnh, identity, cuff/hem hoặc chất lượng khi thu nhỏ**. Không có code mirror tile; việc model vẽ đúng hai góc độc lập vẫn cần review ảnh.

`native-seat-art.ts` kiểm schema strict, exact actor/view/source hash, alpha counts, toàn atlas/tile/clear margin, prompt provenance và PNG bytes. Inventory đo alpha>=8: Lila phải x105/y87/w825/h557, trái x1274/y84/w797/h564; Karo phải x75/y234/w750/h474, trái x979/y232/w730/h476. Đây là vùng ảnh tĩnh, không phải khớp cơ thể hoặc mốc UV.

Phần lớn pixel vải có alpha250–254; không sửa hoặc chuẩn hóa alpha PNG. Bề mặt chung ở bước2 phải có lớp fill đục và contour chung, texture chỉ blend bên trong để tránh xuyên nền/viền kép. Nếp vải không được thay cả người thành một sprite ngồi cứng hoặc tạo khoảng nhảy giữa đứng/ngồi.

Schema JSON mới `library/schemas/native-seat-material.schema.json` được export từ Zod. Context/manifest ghi candidate materials và fingerprint/code hash riêng. `selection=null`, `registered=false`, `approved=false`, `motionVerified=false`, `productionReady=false`, `productionRig=null`. **Chưa thêm field bodySeat cho profile, chưa mở guard needs-view-seat và chưa sửa renderer/compiler/support clock.** Mốc29 body compiler/SVG15/head16 và candidate tóc/râu0.39 giữ nguyên.

## Phần phải triển khai tiếp

1. Đăng ký semantic UV/contour cho standing native→seated folds của cả actor/view. Eo ghim, phần trên giữ texture/identity gốc; váy Lila liền, Karo đủ hai ống. Một contour đục, interior blend, không xoay cả tấm hoặc crossfade hai mép áo. Matrix suy biến/lật phải chặn.
2. Nối physical support/hip contact, fixed bone reach/sole offsets, foot preparation và chuyển trọng lượng. Ngồi giữ được, đứng lên rồi đi/chạy tiếp được; gesture/gaze/speech vẫn theo người thực hiện và audio.
3. Mở complete original support/posture tracks trong sourceBody để camera/primary swap không reset body/cloth/hair phase. Seat geometry/occupancy, source coverage, hidden actor, sibling edit và cache/repair binding phải kiểm cùng clock gốc.
4. Nối profile/API/CLI/Studio/brief, camera/viewport/subtitle bounds và scene resources/security/cap2MB. Viết ca canonical hai người ngồi trò chuyện và đứng đi tiếp theo truyện bất kỳ; không gán đó thành plot bắt buộc của tool.

## Lệnh bàn giao model test

Windows, Node>=22.13; implementation hiện dùng24.19 với npm dependencies trong worktree. Chỉ kiểm metadata ở mốc0.40, không gọi TTS/ASR/model/pipeline từ các lệnh dưới:

```powershell
Set-Location -LiteralPath 'C:/Users/Duongvh-pc/.codex/worktrees/stickman-acting-v22/Story-2-video-factory2.1'
git rev-parse HEAD
node --experimental-test-module-mocks --import tsx --test --test-concurrency=1 tests/native-seat-art.test.ts
```

8 ca: metadata actor/view/flags; record copy không sửa binding nội bộ; reject approval/cross-actor/path/duplicate tile; bounds/alpha/stale standing reference; inventory exact pixels/prompt; đổi/xóa PNG; đổi primary/construction; đổi prompt reference/provider/approval. **Callbacks, fixtures, hooks và file mutation bên trong chưa chạy bởi implementation agents.** Model test phải ghi raw PASS/FAIL/NOT RUN và full SHA, không coi typecheck/inventory là test suite PASS.

Source/static commands đã hoặc sẽ được ghi với exit thực tế trong record:

```powershell
npm run build
npm run test:typecheck
npm run schemas
node --import tsx scripts/native-seat-inventory.ts
node --import tsx scripts/prehistoric-pack.ts
git diff --check
```

Nếu cần Studio để xem các candidate đã có trước0.40, model test khởi động server riêng:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/start-studio.ps1 -Port 8851 -ProjectsRoot 'C:/Users/Duongvh-pc/.codex/worktrees/stickman-acting-v22/Story-2-video-factory2.1/projects-native-seat-test'
```

Giữ terminal mở, Ctrl+C dừng; launcher không dừng server8850 đang chạy. Mốc material này chưa có nút/endpoint diễn ngồi native; chưa dùng `sit-*` để tuyên bố nghiệm thu. Parent không mở/restart server hoặc browser.

Toàn factory vẫn phải hoàn tất ba input kịch bản nguyên văn/WAV giữ giọng-clock/câu chuyện→kịch bản trung thành→video, EN chính/VI/JA/KO và TTS ngoài/local, full views/turns/props/grasp/handoff/world/colours, final audio/subtitle/QC và resume/rebuild. Test/runtime do model của người dùng thực hiện. Không cần image-to-video API; tiếp tục renderer SVG/HTML5/GSAP. Có atlas mới không chứng minh video ngang mẫu hoặc tool đã hoàn thành.
