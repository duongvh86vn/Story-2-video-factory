# Lila/Karo — trang phục ngồi native

Hiện hành **0.44, source candidate:** [Ánh nhìn theo bạn diễn](NATIVE-ACTOR-GAZE-HANDOFF.md) nối original physical eye target vào clock4/body compiler32/tracer2. Thêm8 callback NOT RUN; art/anatomy/motion và mọi media vẫn chưa nghiệm thu. Phần0.43 bên dưới giữ lịch sử exporter.

Lịch sử **0.43, source candidate:** [Công cụ xuất tracer và lệnh test/media](NATIVE-SEAT-TRACER.md) dùng một canonical chung với test, hai actor/camp/ghế riêng/5 camera slice. Scene security4 nhận viền SVG hở bounded; WAV diagnostic giữ bytes và clock, không có giọng mặc định. Implementation chưa gọi builder/tracer/test/browser/audio/video. Exporter không tạo final/DONE hoặc duyệt production. [Record0.43](reviews/native-seat-tracer-source-record-v1.md). Mốc0.42 bên dưới là lịch sử source-clock.

Source0.43 đã publish `cb445581aeb8847bb6cd006fd38dc7870e73e8d9`,20 owned paths; build/typecheck và static manifest hashes exit0, push/exact GitHub SHA khớp. Đây là bàn giao source để model test chạy, chưa có frame/video/test runtime cho tracer.

Mốc **0.42, 08/10/2026**, nhánh `codex/prehistoric-life`, tiếp tục từ `ec61d0e379642966ec158a7e299267e402b6f360`. Source thêm **`performance.sourceBody.supports`** cho native Lila/Karo đã chọn `bodySeat='registered-seated-v1'` và registered locomotion. Ghế, chân chuẩn bị/trụ, hông/contact, vải và lịch sử tóc đọc cùng clock gốc qua camera và đổi vai primary/supporting. Đây là source candidate, **chưa có kết quả runtime hoặc video nghiệm thu**.7 callback source-clock mới,12 callback surface và8 callback material **NOT RUN** bởi implementation agent. [Plan](../plans/2026-10-08-native-seating.md), [record hiện hành](reviews/native-seat-clock-source-record-v1.md); [record0.41](reviews/native-seat-surface-source-record-v1.md) là lịch sử.

Source/artifact0.42 đã push tại `90879b5d9bfb36451dfafe454818346a2742e04a`,28 file đúng scope. Exact SHA local/remote khớp (511309/834e7a exit0); final build/typecheck/schema/static inventory thành công. [Record0.42](reviews/native-seat-clock-source-record-v1.md) ghi review/failures/corrections và raw handles; docs-only follow-up không thay code đã kiểm. Không dùng kết quả V1 hoặc source build để nhận là video đã đạt.

## Đã có trong source

- Profile/cast dùng cùng appearance contract, bắt buộc native actor/view và `bodyMotion='registered-locomotion-v1'`. Không chọn `bodySeat` thì guard ngồi native vẫn chặn. CLI/canonical kế thừa schema chung; default production rig không đổi.
- [Correspondence](../../library/topics/prehistoric-life/native-seat-v1/correspondence-v1.json) giữ exact primary/standing/atlas hashes, UV riêng cho hai hướng, eo ghim và50 điểm contour. Đo alpha tĩnh và tính minimum của đa thức diện tích trên toàn đoạn hình học đứng→ngồi; không gọi sampler/renderer hoặc sửa PNG. Số mảnh Lila phải/trái48/222; Karo phải/trái48/226. Kết quả này chỉ chứng minh đăng ký hình học chưa biến dạng.
- Renderer dùng phần thân trên/đai áo native và một fill đục, một đường viền ngoài. Hai texture đứng/ngồi blend bên trong cùng surface; eo không bị xóa texture hoặc thêm vạch đen ngang. Lila giữ một váy, Karo có material hai miệng ống; hình dáng thực tế khi diễn vẫn cần review. PNG alpha250–254 được giữ nguyên.
- Compiler lấy progress từ chuyển trọng lượng của solver support hiện có; giữ bone/sole offsets, chân chuẩn bị trước khi hông chạm support. Rise hoàn tất rồi mới đi tiếp. Vạt đứng theo đùi với lag90ms, giới hạn hình học25% diện tích trung tính; matrix suy biến/lật/nonfinite vẫn lỗi. Đầu/mắt/miệng/tóc dùng các lựa chọn riêng hiện có; không gọi đây là phoneme lip-sync.
- Camera bao contour vải và support của cả primary/supporting. Texture tài nguyên đi cùng actor rig, namespace/scene security và cap2MB giữ nguyên. Brief/context/manifest/inventory/cache fingerprint nhận selection/material/geometry. Body compiler31, body SVG16, head SVG16, view registration4; seat surface2 và support clock `native-source-seat-1`.
- Schema bounded tối đa12 support trong source gốc, chặn ID trùng/thiếu, pose không ngồi nhận support và local/source conflict. `sourceBodyPlan()` giữ full supports/postures/entry. Solver/body/report đọc `shot.startMs + localTimeMs - sourceBody.startMs`, không khởi động lại ở cut. Run phải phủ kín, mỗi shot lặp nguyên source, actor/view/root/stage/scale giữ nguyên.1500ms/reach/facing/ẩn actor vẫn chặn.
- Occupancy giữ cả approach/hold/rise và project chính xác về đoạn shot. Hai actor không được cùng dùng một support khi interval chồng; cùng ID phải cùng geometry trong world. Camera, scene seats, report, review timestamps và publication/repair hash dùng cùng source. Chuẩn bị chân/chuyển hông/đứng dậy có các mốc baked tường minh; lag vải/tóc vẫn đọc lịch sử trước cut.
- Có7 callback mới trong `tests/native-source-seat.test.ts`: contract/guard; whole-run so với slices cho2 actor×2view×3scale và seek ngược; exclusive occupancy/world geometry; invalidation/hidden/missing/cut/repair; baked clock/report/camera/review; ca canonical **không có diagram/object**, hai actor ngồi–đứng–đi với5 camera slice, primary/speaking ownership đổi, môi trường SVG có màu và hai support. Ca này được khai báo, **chưa tạo scene/frame/video**, chưa chứng minh giọng hoặc chất lượng diễn.
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

1. **Runtime của Task3 và ca canonical.** Source đã nối support clock; cần model test chạy whole/slices, original XYZ limbs/sole/hip, continuity và occupancy thật. Thiếu một actor slice, đổi geometry/definition hoặc thiếu full board phải lỗi. Chưa thể nhận camera swap hoặc ngồi native đã chạy đúng chỉ từ việc source/typecheck hợp lệ.
2. **Runtime và chất lượng.** Model của người dùng phải kiểm sit/hold/rise/walk, xương, gối, tay, chân trụ, hip contact, áo/quần/cuff, màu/mặt/identity, gaze, random/reverse seek và video60fps. Hai mesh trái lớn: phải đo compile/seek cost và scene byte count; nếu vượt2MB phải tối ưu representation, **không nâng cap hoặc giấu lỗi**.
3. **Task4: chạy exporter và full pipeline**: source0.43 đã có lệnh xuất canonical scene/master/subtitle và tùy chọn frame/video60fps, báo cáo cap/clock/camera/resource/actual media. Tool, builder và5 callback bổ sung vẫn NOT RUN. Cần model test chạy thật, review video với ảnh gốc, kiểm giọng/nội dung, repair/resume và sibling/source changes trên artifact thật. Không thay full input test; ca kiểm chứng phục vụ tool tổng quát, không ép chủ đề hoặc đặt cốt truyện mặc định.
4. Full factory còn ba input script nguyên văn/WAV giữ audio-clock/story→script→video, SRT, EN chính/VI/JA/KO và TTS local/ngoài, đầy đủ views/turns/tools/grasp/handoff/world/colours và final audio/subtitle/QC. `productionReady=false`, `productionRig=null`; final/art/identity/source/target/voice/sync gates giữ nguyên.

## Model test chạy

Windows, Node>=22.13; implementation hiện dùng24.19. Không cần image-to-video API. Các lệnh dưới **chưa được implementation chạy**:

```powershell
Set-Location -LiteralPath 'C:/Users/Duongvh-pc/.codex/worktrees/stickman-acting-v22/Story-2-video-factory2.1'
git rev-parse HEAD
node --experimental-test-module-mocks --import tsx --test --test-concurrency=1 tests/native-seat-art.test.ts tests/native-seat.test.ts tests/native-source-seat.test.ts tests/native-locomotion.test.ts tests/native-source-body.test.ts tests/native-secondary.test.ts tests/seated-acting.test.ts tests/view-cloth-geometry.test.ts
```

27 callback seating được khai báo (8 material +12 surface +7 source-clock); không có callback nào được implementation agent chạy. Phải lưu raw PASS/FAIL/NOT RUN và full SHA, stderr/log, byte count/compile/seek cost, frame và video so với ảnh gốc. Typecheck, alpha inventory và static triangulation **không phải** test runtime PASS.

Khởi động Studio riêng để không tác động project8850:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/start-studio.ps1 -Port 8851 -ProjectsRoot 'C:/Users/Duongvh-pc/.codex/worktrees/stickman-acting-v22/Story-2-video-factory2.1/projects-native-seat-test'
```

Giữ terminal mở; Ctrl+C dừng. Launcher không dừng server ở cổng khác. Parent không chạy launcher hoặc mở browser trong mốc này.

- [Pose ngồi–đứng–đi hướng phải](http://127.0.0.1:8851/api/topics/prehistoric-life/body?action=sit-walk-right&timeMs=2500&mood=happy&view=three-quarter-right&motion=registered-locomotion-v1&seat=registered-seated-v1)
- [Pose ngồi–đứng–đi hướng trái](http://127.0.0.1:8851/api/topics/prehistoric-life/body?action=sit-walk-left&timeMs=2500&mood=happy&view=three-quarter-left&motion=registered-locomotion-v1&seat=registered-seated-v1)

Source/static commands: `npm run build`, `npm run test:typecheck`, `npm run schemas`, `node --import tsx scripts/native-seat-inventory.ts`, `node --import tsx scripts/prehistoric-pack.ts`, `git diff --check`. `scripts/native-seat-correspondence.ts` là công cụ đo PNG alpha/tạo geometry JSON, không phải test pose hoặc ảnh/video; chưa xuất bản preview chuyển động.
