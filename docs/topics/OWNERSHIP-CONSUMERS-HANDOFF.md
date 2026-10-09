# Renderer, camera và đường nối dùng chung bake đã kiểm — source0.80

Cập nhật source0.81: [mixed ownership](MIXED-OWNERSHIP-HANDOFF.md) bổ sung candidate contract cho vật chung cùng vật riêng, clock channels và phase hand masks. Nội dung source0.80 bên dưới là lịch sử; runtime/art/motion/full-factory acceptance vẫn pending.

Sản phẩm vẫn là câu chuyện → kịch bản, kịch bản nguyên văn hoặc WAV → video có các diễn viên thực hiện câu chuyện. Source0.80 nối tiếp [source0.79](ENTITY-MOTION-HANDOFF.md), sửa ba điểm đọc dữ liệu của canonical ownership. Đây là sửa source và hợp đồng dữ liệu; chưa có nghiệm thu hình/chuyển động/video.

## Đã sửa

1. `ownershipBakeSnapshot` dùng lại toàn bộ kiểm tra của camera/query: clock hữu hạn tăng đúng thứ tự, đầy đủ endpoint và phase boundary, mọi palm kể cả tay chưa cầm, đúng active/authority theo nguồn gốc, candidate flags và sampled-gap metadata. Renderer và relation reader cùng gọi hàm này, rồi dùng bản sao riêng của source/phase/points. Không còn đọc thẳng các sample có thể bị sửa mà bỏ qua kiểm tra. Snapshot không tính lại pose hoặc chứng minh tiếp xúc.
2. `renderOwnershipLayer` đối chiếu hash của **paint thực sự sẽ vẽ** với receipt và kế hoạch trong shot; dùng bản sao paint đã kiểm. Sửa depth hoặc đổi hai grip thành cùng một ID không thể giữ receipt cũ để vẽ trùng palm/bỏ mất tay người nhận.
3. `ownershipRelationFrames` kiểm đủ entities, exact shot hash và source membership trước khi gom keyframes. Bake của revision A không được dùng cho đường nối/flow của revision B dù partId và thời lượng giống nhau. Mỗi entity dùng một snapshot và một center channel; không lấy alias đầu tiên làm vật chung.

Bàn tay vẫn dùng `<use>` trỏ tới definition của chính diễn viên, được compiler animate trong world space. Không thêm transform thứ hai, kéo tay để khớp vật hoặc sửa mặt/tóc/trang phục. Namespace và alias suppression hiện có giữ nguyên. Khi so revision, dùng hash source artifact gốc; không lấy thứ tự thuộc tính do schema parser tạo lại để thay hash artifact.

Version: topic=`forest-tribe-0.80-ownership-consumers`, producer=`story-direction-2.2.43`, renderer=`canonical-ownership-render-4`. Generated shot/storyboard schema và manifest code hashes cập nhật theo source cuối; cache/scene/review cũ không được đổi nhãn để tái sử dụng.

## Agent và kiểm tra source

Một task GPT‑6.1 Sol qua 9router, yêu cầu xhigh, rà năm file source0.79 đã đóng băng. Agent xác nhận ba lỗi trên; parent rà và sửa, thêm năm regression callbacks. Agent không review bản sửa cuối hoặc toàn diff và không chạy code/test. Helper source-agent được mở allowlist riêng cho TypeScript trong `library/shots`, vẫn giới hạn nguồn/kích thước, không tự áp dụng hoặc chạy code trả về. Hai lỗi chuẩn bị packet trước khi gửi HTTP được lưu trong record; chỉ một call model được thực hiện.

- [Agent record và toàn bộ frozen inputs](reviews/ownership-consumers-agent-record-v1.json).
- [Build/typecheck/schema/static source record](reviews/ownership-consumers-source-record-v1.json).
- [Kiểm kê raw bytes và cờ production](reviews/ownership-consumers-static-record-v1.json).

Combo `tester` đã xác nhận HTTP200, backend `gpt-6-luna`, reply `TESTER_OK`; đây chỉ là kiểm kết nối đã có, không phải kết quả test dự án. Chat API không tự cung cấp quyền chạy terminal/browser của máy local.

## Bàn giao test — implementation chưa chạy

Năm callbacks mới trong `tests/ownership-observation.test.ts` là **DECLARED / NOT RUN**. Ca relation cũ trong `tests/ownership-render.test.ts` bổ sung metadata/canonical shot cho contract mới. Synthetic records chỉ kiểm cách đọc/serialize dữ liệu, không là native anatomy, artwork, shared contact hoặc film acceptance.

Môi trường: C worktree dưới đây, Node24.19.0 (tối thiểu22.13), dependencies hiện có. Checkout D và server8850 giữ nguyên. Các lệnh chỉ dành cho model/người test:

```powershell
Set-Location -LiteralPath 'C:/Users/Duongvh-pc/.codex/worktrees/stickman-acting-v22/Story-2-video-factory2.1'
git rev-parse HEAD
node --experimental-test-module-mocks --import tsx --test --test-concurrency=1 tests/ownership-observation.test.ts tests/ownership-render.test.ts tests/source-ownership.test.ts tests/source-interactions.test.ts tests/cast-camera.test.ts tests/camera-repair-source.test.ts tests/model-motion.test.ts
$env:STUDIO_PORT='8861'
$env:STUDIO_PROJECTS_ROOT='C:/Users/Duongvh-pc/.codex/tmp/story-factory-source080-test-projects'
npm run studio
```

Mở `http://127.0.0.1:8861/` sau khi server test đã sẵn sàng. Ghi full SHA, raw command results và lỗi còn thiếu trong MD mới; TEST-RESULTS V1 ngày01/10 không chứng minh source0.80.

1. Xóa endpoint/contact boundary, trùng clock, sai active/authority, NaN hoặc thiếu palm: camera query, renderer và relation reader cùng phải báo `needs-source-prop-binding`. Palm accessor không được gọi; lỗi bake của entity phải bị chặn trước khi vẽ artwork của entity đó.
2. Đổi depth/grip ID nhưng giữ paintHash cũ phải fail. Hai grip bị đổi thành một ID không được vẽ trùng tay hoặc mất tay người nhận. Snapshot không sửa object nguồn và không nhận thay đổi tiếp theo từ object ấy; lần đọc mới kiểm dữ liệu mới.
3. Dùng bake khác revision, thiếu entity hoặc khác source nhưng cùng clock/partId phải fail. Dữ liệu hợp lệ phải giữ đúng union keyframes và canonical centers; kiểm relation/flow/label/foreground/shadow cùng vật ở giữa keyframes.
4. Với own native registrations và original source thật, kiểm world→held→shared→đổi authority→held→world, camera cuts, primary/supporting swaps và random/reverse seeks. Đo palm/center/offset trong SVG/GSAP thật; so camera preflight với renderer có thêm actual actor breakpoints. Không suy ra continuous proof từ sampled gap0.2px.
5. Nghiệm thu Lila/Karo và diễn viên phụ đúng mẫu, mềm/hợp lý, nhìn bạn diễn, viền quần áo và màu sống động; toàn story/script/WAV, EN chính/VI/JA/KO, external/local TTS, resume/rebuild/locks và final MP4/audio/subtitle/thumbnail/QC.

## Còn thiếu để đưa vào sử dụng

`needs-source-prop-binding`, `productionReady=false`, `productionRig=null`, mọi `availableBanks=[]` và art/motion/production approval=false giữ nguyên. Nhánh ownership chưa được mở production. Giáo xoay, airborne drop, mixed local/shared bindings, đổi depth trong action và native tool/contact poses vẫn cần hợp đồng vật lý/art đầy đủ và nghiệm thu thật. Preflight envelope so với actual renderer, native anatomy/identity/acting và full-input/voice/resume/final vẫn **NOT RUN / chưa nghiệm thu**. Build/typecheck xanh không thay thế các bước này; toàn mục tiêu chưa hoàn thành.
