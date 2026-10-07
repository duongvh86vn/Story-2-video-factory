# Góc nhìn bạn diễn — bản đăng ký kỹ thuật

Ngày 08/10/2026. Base `2a7bd5ead00d66dff78789745506257a4ee96991`, source nền `a63259ce731afbf34630d93b58f6469a33b02371`, follow-up `f88ae6e427fac1ed60c9014274af6c3b390209b4`, fix `004cd8be6c3eb0f4449ef5a27959fcf0cc4816cd`, test-clock fix `674ac04032f66d3b9104f6f6c47f89eadf7f8a4b`. [Plan](../plans/2026-10-08-partner-facing-views.md), [review source](reviews/partner-facing-views-source-review-v1.md). Bản này bổ sung góc trái cố định cho Lila/Karo, chưa là đối thoại chuyển động hoặc video đạt mẫu.

## Đã nối trong source

- Profile `forest-body-view-1` nhận `bodyView=three-quarter-left|three-quarter-right`. Mỗi actor/view chọn PNG độc lập theo exact SHA; không lật mặt, tóc hoặc quần áo. API `bodyViewRegistration[actor]` cũ tiếp tục trỏ đúng bản phải; registry mới `bodyViewRegistrations[actor][view]` chọn cả hai hướng.
- Landmark cổ/vai/hông/cằm và mask trái được author trên native canvas thật: Lila leftv2 1024×1536, Karo leftv1 910×1729. Contour áo đo theo vùng màu đã chọn thủ công, thêm band7px để giữ ink. Đây không phải xác nhận anatomy hoặc đoạn xương do AI suy ra. PNG nguồn giữ nguyên bytes. Bản library manifest0.20 cũ là snapshot lịch sử, không là kết quả nghiệm thu hoặc snapshot code0.29; controller chưa chạy lại pack/renderer sản xuất.
- Head/body dùng scale đồng đều riêng và giữ toàn bộ khuôn mặt happy trong cùng ảnh. Chain tay/chân, cuff/palm/mitten/sole lấy rig nguồn; không đổi chiều dài theo ảnh góc mới hay target. Tay gần của góc trái là rig-right, tay xa là rig-left; các label không đổi theo hướng màn hình. Branch gối của góc trái có dấu đối diện góc phải; đây là candidate, chưa nghiệm thu pose/motion.
- Facing/headView phải khớp exact view. Validation và direct sampler đều chặn view/turn/motion/expression/gaze chưa đăng ký; hàm lấy điểm neo cũng giữ hai guard fixed-view/lunge, sampler chặn speech activity. Góc trái chưa có grip giáo/lunge: chặn rõ, không tự dùng góc phải. Góc trái hiện chỉ có rest/point/think im lặng, happy. Các phép IK/clearance có thể tiếp tục chặn pose cụ thể; test runtime cần xác định điều đó.
- Workbench góc thân, gallery và trang landmark có cả bốn actor/view, namespace mask khác nhau. Hash profile gồm view và registration fingerprint; compiler body19/registration2 invalidate phần hình. Chọn màu RGB gốc vẫn chỉ hợp lệ với source body; authored views dùng artwork riêng. Giọng/narration không thay đổi ở các helper này. Topic context0.29 mô tả candidate trái/phải riêng với availability/production còn pending; narrative context vẫn version1.

## Bằng chứng hình tĩnh và lỗi còn thấy

[Bốn PNG độc lập](reviews/partner-views-artwork-v1.png), [inventory](reviews/partner-views-artwork-v1.json). Layer draftv1 từng giữ một đoạn tay thừa dưới tóc Lila và cắt chéo râu Karo; draftv2 đã sửa hai clip. Giữ cả lịch sử để đối chiếu:

- [Lila v1](reviews/left-view-layers-lila-v1.png) → [v2](reviews/left-view-layers-lila-v2.png).
- [Karo v1](reviews/left-view-layers-karo-v1.png) → [v2](reviews/left-view-layers-karo-v2.png).
- [Metadata v1](reviews/left-view-layers-v1.json), [metadata v2](reviews/left-view-layers-v2.json): exact PNG/figure/registration hashes, `bodyEvaluatorUsed=false`, `approved=false`, `productionReady=false`.

V2 vẫn còn cut/seam vùng cổ và underside tóc Lila, thiếu tóc/cloth bị che, shoulder emergence, tỷ lệ đầu/thân và identity giữa góc. Karo còn phải kiểm râu/cổ liền lớp và đường viền quần áo khi di chuyển. AI artwork không giống nguyên ảnh gốc chỉ vì giữ màu ấm; không đổi chuẩn gốc sang các ảnh này. Áo góc mới còn rigid. Chưa có native miệng/biểu cảm, continuous turn, gaze tracking, contact/handoff hoặc locomotion cho góc trái.

Controller chỉ đo màu nativePNG, author mask/SVG và raster **tài liệu tĩnh** bằng Sharp; không chạy body evaluator, scene, GSAP, browser/API, giọng hoặc MP4. Script authoring `scripts/prehistoric-left-view-contours.ts` và `scripts/prehistoric-left-view-layers.mjs` lưu output với `flag:wx`; không ghi đè evidence. Để author sửa mới, chọn revision/output mới trước; không chạy lại lên các file đã tồn tại. Figure lớp dùng trực tiếp native registration, không dựng pose/episode.

## Kiểm build và bàn giao test

Core/full build, `test:typecheck` và schema export exit0 trước source nền; full build/test:typecheck mới exit0 trước follow-up và fix004cd8b, schema export mới exit0 ở fix. Một lượt typecheck ban đầu báo literal-widening của hai test plans; đã thêm type PerformancePlan và lượt typecheck mới exit0. Đây là kiểm kiểu/bundle/schema, không phải test callbacks. Mười callbacks ở `tests/partner-facing-views.test.ts` **NOT RUN**; source review cũng không thay cho kiểm hình/motion. Test-clock fix674ac04 đổi chin equality từ approach800ms sang hold1000ms; typecheck mới exit0. Các ca cũ còn NOT RUN theo từng handoff.

Cho model được giao test chạy đúng nhánh/source:

```powershell
Set-Location -LiteralPath 'C:/Users/Duongvh-pc/.codex/worktrees/stickman-acting-v22/Story-2-video-factory2.1'
git rev-parse HEAD
node --experimental-test-module-mocks --import tsx --test --test-concurrency=1 tests/partner-facing-views.test.ts
```

Mười nhóm: native asset/hash/canvas và right compatibility; physical metrics; cặp nhìn ngược hướng/slot/namespace; raw sampler và validation gates; left-tool/lunge rejection; canonical resources/security; exact clock/random seek; workbench lựa chọn/blocked actions; topic metadata/production gate; think grip so với native chin transform thật. Ghi exact commit và PASS/FAIL/NOT RUN, không chỉ ghi “test xong”. Kiểm thêm ảnh/video các điểm mask/cổ/tóc/vai, limb clearance, sole/knee, hai actor khác view trong một scene và cache/resume. Lỗi cần pose/time/hand/actor/view/colour và evidence. Giữ gate nếu thiếu art/motion/voice acceptance.

## Khởi động server test riêng

Môi trường Node≥22.13, package-lock/dependency hiện có (GSAP, Sharp, TypeScript, Vite). Không cần API image-to-video. Controller chưa start/restart instance8850/8851 ở checkpoint này. Launcher dưới đây đọc từ source, cần model test kiểm khởi động:

```powershell
Set-Location -LiteralPath 'C:/Users/Duongvh-pc/.codex/worktrees/stickman-acting-v22/Story-2-video-factory2.1'
powershell -ExecutionPolicy Bypass -File scripts/start-studio.ps1 `
  -Port 8851 -EnvFile 'D:/github/Story-2-video-factory2.1/.env' `
  -ProjectsRoot 'projects-partner-view-test'
```

Giữ terminal; Ctrl+C dừng instance này. EnvFile chỉ tham chiếu key riêng, không in/gửi/commit. Trang dự kiến sau khi chạy đúng source:

```text
http://127.0.0.1:8851/api/topics/prehistoric-life/body?action=rest&timeMs=0&mood=happy&view=three-quarter-left
http://127.0.0.1:8851/api/topics/prehistoric-life/view-registration
http://127.0.0.1:8851/api/topics/prehistoric-life/view-art
```

Đổi view sang `three-quarter-right`, dùng point/think hai tay và random seek; kiểm lỗi rõ cho left spear/lunge/walk/run/jump/sit/head-turn, expression khác happy, speech/gaze track hoặc màu nguồn. Workbench này xem pose theo clock, chưa là continuous video preview.

## Còn lại để hoàn thành sản phẩm

Giữ `productionReady=false`, `productionRig=null`. Hoàn thiện/duyệt silhouette, mask/anchors, occluded layers, native views/biểu cảm/miệng, mềm mại và clearance/contact/handoff, world màu đậm và receipts; sau đó nghiệm thu toàn luồng kịch bản nguyên văn / WAV giữ audio-clock / câu chuyện→kịch bản trung thành→video, legacy SRT, EN chính/VI/JA/KO và TTS ngoài/local. Cue lẫn nhiều speaker cần clock subcue/word thật, không chia clock giả. Lila/Karo là diễn viên trong chuyện người dùng đưa, không cố định làm host và không giới hạn tool thành demo săn.
