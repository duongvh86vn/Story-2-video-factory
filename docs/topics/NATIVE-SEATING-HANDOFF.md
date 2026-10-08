# Lila/Karo — trang phục ngồi native

Mốc **0.41, 08/10/2026**, nhánh `codex/prehistoric-life`, tiếp tục từ `4ff12ddfa216344a86fbd907d92550bfc001cc13`. Đã viết source cho lựa chọn **`appearance.bodySeat='registered-seated-v1'`** ở cả hai actor × hai góc3/4. Đây là ứng viên **một shot**, chưa có kết quả runtime hoặc video nghiệm thu.12 callback mới và8 callback material cũ **NOT RUN** bởi implementation agent. [Plan](../plans/2026-10-08-native-seating.md), [record source](reviews/native-seat-surface-source-record-v1.md).

## Đã có trong source

- Profile/cast dùng cùng appearance contract, bắt buộc native actor/view và `bodyMotion='registered-locomotion-v1'`. Không chọn `bodySeat` thì guard ngồi native vẫn chặn. CLI/canonical kế thừa schema chung; default production rig không đổi.
- [Correspondence](../../library/topics/prehistoric-life/native-seat-v1/correspondence-v1.json) giữ exact primary/standing/atlas hashes, UV riêng cho hai hướng, eo ghim và50 điểm contour. Đo alpha tĩnh và tính minimum của đa thức diện tích trên toàn đoạn hình học đứng→ngồi; không gọi sampler/renderer hoặc sửa PNG. Số mảnh Lila phải/trái48/222; Karo phải/trái48/226. Kết quả này chỉ chứng minh đăng ký hình học chưa biến dạng.
- Renderer dùng phần thân trên/đai áo native và một fill đục, một đường viền ngoài. Hai texture đứng/ngồi blend bên trong cùng surface; eo không bị xóa texture hoặc thêm vạch đen ngang. Lila giữ một váy, Karo có material hai miệng ống; hình dáng thực tế khi diễn vẫn cần review. PNG alpha250–254 được giữ nguyên.
- Compiler lấy progress từ chuyển trọng lượng của solver support hiện có; giữ bone/sole offsets, chân chuẩn bị trước khi hông chạm support. Rise hoàn tất rồi mới đi tiếp. Vạt đứng theo đùi với lag90ms, giới hạn hình học25% diện tích trung tính; matrix suy biến/lật/nonfinite vẫn lỗi. Đầu/mắt/miệng/tóc dùng các lựa chọn riêng hiện có; không gọi đây là phoneme lip-sync.
- Camera bao contour vải hiện tại. Texture tài nguyên đi cùng actor rig, namespace/scene security và cap2MB giữ nguyên. Brief/context/manifest/inventory/cache fingerprint nhận selection/material/geometry. Body compiler30, body SVG16, head SVG16, view registration4.
- API diagnostic `/api/topics/prehistoric-life/body` có `seat=registered-seated-v1`; form giữ lựa chọn trong link đổi action/time. Đây là trang xem pose, không phải video hoặc nghiệm thu chuyển động.
- Review mã nguồn độc lập tìm ba lỗi alias metadata, mask eo và vòng phụ thuộc generator. Đã sửa: active registration/description deep-freeze, mask chỉ xóa texture sát mép ngoài, generator dùng landmark modules độc lập. Verdict follow-up được ghi ở record; không có verdict art/motion/video.

## Asset và nguồn

Hai PNG từ mốc0.40 được sử dụng nguyên bytes; mốc0.41 **không gọi imagegen hoặc tạo lại ảnh**:

| Actor | Asset | Kích thước | SHA256 |
|---|---|---|---|
| Lila | [Váy ngồi](../../library/topics/prehistoric-life/native-seat-v1/lila-seated-folds-v1.png) |2172×724|`a8d005d62c046044466684bfe1ca59c84608aabc6bbcfa52e6ce67556828ab02`|
| Karo | [Quần ngồi](../../library/topics/prehistoric-life/native-seat-v1/karo-seated-folds-v1.png) |1774×887|`411980eb6d11c6d2a31e3419efb4f264ea82d4095b837a90ea210eca88d5eeed`|

Prompt đầy đủ tại `native-seat-v1/lila-seated-folds-v1-prompt.json` và `karo-seated-folds-v1-prompt.json`. Các close-up da ấm/tóc/trang phục chính của người dùng giữ nguồn identity; bảng bổ trợ không thay model. Kết quả pose/UV không là xác nhận giống ảnh gốc hoặc video mẫu.

## Chưa hoàn thành

1. **Task3: full sourceBody support clock.** Schema/sourceBody hiện chưa sở hữu support; không cắt một chuyển động ngồi native đang diễn sang shot khác rồi nhận là continuous. Cần nối clock hông/chân/vải/tóc, geometry/occupancy/facing/coverage, camera/primary swap và source/cache/repair invalidation.
2. **Runtime và chất lượng.** Model của người dùng phải kiểm sit/hold/rise/walk, xương, gối, tay, chân trụ, hip contact, áo/quần/cuff, màu/mặt/identity, gaze, random/reverse seek và video60fps. Hai mesh trái lớn: phải đo compile/seek cost và scene byte count; nếu vượt2MB phải tối ưu representation, **không nâng cap hoặc giấu lỗi**.
3. **Task4: ca canonical hai người**, camera/subtitle bounds, vai nói/nghe, repair/resume/sibling edits và source publication. Ca kiểm chứng chỉ phục vụ tool tổng quát, không ép truyện về máy móc/đồ ăn/săn thú.
4. Full factory còn ba input script nguyên văn/WAV giữ audio-clock/story→script→video, SRT, EN chính/VI/JA/KO và TTS local/ngoài, đầy đủ views/turns/tools/grasp/handoff/world/colours và final audio/subtitle/QC. `productionReady=false`, `productionRig=null`; final/art/identity/source/target/voice/sync gates giữ nguyên.

## Model test chạy

Windows, Node>=22.13; implementation hiện dùng24.19. Không cần image-to-video API. Các lệnh dưới **chưa được implementation chạy**:

```powershell
Set-Location -LiteralPath 'C:/Users/Duongvh-pc/.codex/worktrees/stickman-acting-v22/Story-2-video-factory2.1'
git rev-parse HEAD
node --experimental-test-module-mocks --import tsx --test --test-concurrency=1 tests/native-seat-art.test.ts tests/native-seat.test.ts tests/native-locomotion.test.ts tests/native-source-body.test.ts tests/native-secondary.test.ts tests/seated-acting.test.ts tests/view-cloth-geometry.test.ts
```

12 callback mới: contract/gates;4 bindings/UV/waist; invalid geometry; immutable alias; opaque surface/positive area; matrix interpolation; SVG/resources/namespaces; sit-rise-walk/fixed bones/random seeks; facing/support/reach/transition blockers; camera contour; form/link selection; scene security/cap/interpolation. Phải lưu raw PASS/FAIL/NOT RUN và full SHA. Typecheck, alpha inventory và static triangulation **không phải** test runtime PASS.

Khởi động Studio riêng để không tác động project8850:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/start-studio.ps1 -Port 8851 -ProjectsRoot 'C:/Users/Duongvh-pc/.codex/worktrees/stickman-acting-v22/Story-2-video-factory2.1/projects-native-seat-test'
```

Giữ terminal mở; Ctrl+C dừng. Launcher không dừng server ở cổng khác. Parent không chạy launcher hoặc mở browser trong mốc này.

- [Pose ngồi–đứng–đi hướng phải](http://127.0.0.1:8851/api/topics/prehistoric-life/body?action=sit-walk-right&timeMs=2500&mood=happy&view=three-quarter-right&motion=registered-locomotion-v1&seat=registered-seated-v1)
- [Pose ngồi–đứng–đi hướng trái](http://127.0.0.1:8851/api/topics/prehistoric-life/body?action=sit-walk-left&timeMs=2500&mood=happy&view=three-quarter-left&motion=registered-locomotion-v1&seat=registered-seated-v1)

Source/static commands: `npm run build`, `npm run test:typecheck`, `npm run schemas`, `node --import tsx scripts/native-seat-inventory.ts`, `node --import tsx scripts/prehistoric-pack.ts`, `git diff --check`. `scripts/native-seat-correspondence.ts` là công cụ đo PNG alpha/tạo geometry JSON, không phải test pose hoặc ảnh/video; chưa xuất bản preview chuyển động.
