# Lila/Karo 0.20 — cổ tay, lòng bàn tay và contact

Ngày 07/10/2026. Source ứng viên, `productionReady=false`, `productionRig=null`. Không phải video đã nghiệm thu. Giữ mục tiêu tool tổng quát: **kịch bản nguyên văn / WAV giữ giọng và clock / câu chuyện → kịch bản trung thành → video**; Lila/Karo là diễn viên. Săn và giáo là hành động, không phải chủ đề bắt buộc.

## Nguyên nhân và thay đổi

Rig trước dùng một điểm trong mitten cho cả endpoint cẳng tay, origin ảnh và contact đạo cụ. Góc bàn tay giáo lại lấy shaft ±90°, khác góc cẳng tay; một mitten có thể chạm đúng giáo nhưng nối vào cẳng tay lệch. Mask Karo cũ còn cắt đầu mitten. Hai lượt review 0.19 qua 9router đã chỉ ra grasp/joint silhouette chưa đạt.

- `forest-hand.ts`: cuff/cổ tay và palm/grip đo riêng trên **canvas SVG nguồn**, không nhầm với pixel PNG lớn. Lila: cuff trái `(117,474)`, grip `(113,501)`; cuff phải `(373,474)`, grip `(376,501)`. Karo: `(77,453)/(76,480)` và `(335,450)/(340,479)`. Đây là landmark ứng viên, không chứng nhận anatomy. Tay rig-left tương ứng tay phải giải phẫu ở ảnh nguồn.
- Migration không phụ thuộc target: lấy tổng chain cũ đến hand-lobe, trừ khoảng cuff→anchor cũ; tổng mới là shoulder→cuff, split 52/48 vẫn suy luận. Thêm đoạn cuff→palm đo cố định. **Không gọi đây là giữ nguyên tổng bone cũ**; source/profile/cache phải dựng lại. Trong mỗi shot, các chiều dài mới giữ cố định, không rút xương theo target.
- `forest-body-art.ts`: crop nguyên mitten, origin mới ở palm. Clip Lila trái giới hạn x≤141 để không giữ áo cạnh tay. Không sửa PNG hoặc nới contact tolerance. Rect mask còn overlap 6–7 source units ở cuff, cần kiểm seam khi xoay.
- `compiler.ts`: giải upper + (lower + hand), dựng wrist trên cùng tiếp tuyến; ink và lower bone dừng tại cuff, mitten quay quanh palm theo cẳng tay. `FrameState.hands` và `hand-*` origin vẫn là contact palm, thêm `FrameState.wrists` cho endpoint thật. Không đổi contract pick/carry/drop thành contact cổ tay.
- `source-arm.ts`: flexion kiểm theo wrist; khoảng grip của hai role lấy palm. Góc rear elbow có thể cao, không áp quy tắc luôn thấp hơn vai.
- Source spear phải có `elbowPoles` được tác giả pose chọn cố định. `secondaryOffset` không còn default -20 dễ làm crowd hai tay; phải khai báo trong plan. Không lấy pole từ vị trí root/aim ở mỗi frame. Source plan cũ thiếu dữ liệu phải re-author.
- Frame nội suy kiểm cuff thật từ hand transform, đồng thời kiểm palm→shaft và tip trong contact hold, vẫn dùng giới hạn gap 0.2 px. Reach analytic giáo vẫn 0.01 px. Upper/lower planar rõ ràng; không dùng hàm chiếu gối cho cánh tay.
- Think foreground/back slots đổi bằng `tl.set` tại start/end. Bỏ các slot này khỏi refinement liên tục để tránh fade hai hình của một tay hoặc recursion tại boundary. Một definition vật lý vẫn được dùng ở cả hai painter slots.
- Rà soát tìm thấy preset **spear-thrust chính diện tại 1800ms** hụt reach Lila 0.86 px/Karo 1.12 px sau migration. Sửa riêng preset developer từ `(±65,60)` sang `(±60,58)*bodyScale`; lunge vẫn `(65,60)`, grip span/giáo/clock giữ nguyên. Target câu chuyện không được âm thầm dịch theo preset.

Versions: `forest-tribe-0.20-wrist-palm-registration-candidate`, `forest-wrist-palm-1`, `forest-arm-role-shape-3`, body compiler `forest-source-body-motion-16`, body renderer `forest-source-body-svg-11`. Source `forest-body-1` giữ family; không tái dùng evidence 0.19 như kết quả 0.20.

## Bằng chứng và phạm vi

- [Đúng hunt-aim 500ms người dùng báo lỗi](http://127.0.0.1:8850/api/topics/prehistoric-life/body?action=hunt-aim&timeMs=500&mood=happy#karo-detail-view): [ảnh hiện tại](reviews/source-wrist-karo-hunt-aim-v1.png). Vẫn là pose chính diện giữ giáo; chưa phải toàn động tác săn hoặc hướng nhìn bạn diễn đã duyệt.
- [Cuff/palm và view registration](http://127.0.0.1:8850/api/topics/prehistoric-life/view-registration): [ảnh](reviews/source-wrist-registration-v2.png).
- Contact lunge 1800ms: [Lila](reviews/source-wrist-lila-contact-v2.png), [Karo](reviews/source-wrist-karo-contact-v2.png). V2 chụp sau giới hạn clip Lila; V1 là ảnh trước, không dùng làm bằng chứng cuối.
- [DOM audit](reviews/source-wrist-audit-dom-v1.json) giữ lỗi ban đầu và vòng sau sửa preset. Bốn nhóm gestures/locomotion/spear/seated × ba phase: **144 actor–clock**, 138 có SVG và sáu head-turn bị chặn `needs-head-view`. V2 là screenshots sau sửa preset; spear V1 giữ evidence reach thất bại. Đây là đọc DOM và inspection tĩnh ở các clock ghi trong card, không phải tất cả thời điểm, mood, scale hoặc motion.
- [Inspection với hash source/ảnh và receipt lệnh](reviews/source-wrist-self-inspection-v1.json): build, test declaration typecheck, schema export, inventory và diff check exit 0. Ảnh audit precede bổ sung kiểm interpolation trong compiler; evaluator/artwork tĩnh không đổi ở phần bổ sung đó, không gọi là đã render/test lại compiler video cuối.
- [Review source + năm ảnh thật qua 9router](reviews/coder-wrist-palm-advice-v1.json) xác nhận phép migrate độc lập target và scale mapping hợp lý, nhưng nêu pole fallback, painter fade, mask cuff overlap, thiếu shape limits và grasp. Review lưu source hashes trước sửa preset/pole/slot/interpolation; không phải review source cuối. `projectSourceKnee` cũ với weight=1 thực tế đã planar, không phải rút xương; nay code thể hiện trực tiếp để tránh nhập nhằng. Không áp đề xuất đổi tỷ lệ xương máy móc.

## Còn thiếu

1. Review neutral/source tỷ lệ sau migrate, seam cuff và silhouette từng tay, đặc biệt shoulder shelf Karo, tóc che tay Lila, chin cross-body và lap. 52/48 chưa phải khuỷu đo thật. Contact toán học không chứng minh pose đẹp.
2. Grasp hiện là mitten nguồn cứng che shaft ở palm; cần thumb/finger/shaft coverage đã đăng ký, wrist flexion thật. Không xoay mitten rời cuff để giả nắm.
3. Arm roles rest/walk/lap/react thiếu giới hạn đã hiệu chỉnh và clearance theo áo/râu/tóc; automatic gesture pole transition qua extension 80ms còn quá nhanh. Cần keypose/trajectory được duyệt và kiểm velocity/acceleration, không chỉ curve C1.
4. View 3/4 phải chỉ là hai engineering candidates happy/im lặng, áo rigid; góc đối diện/profile/lưng, biểu cảm, speech, tóc/râu/áo chuyển động phụ và stance preparation vẫn chưa hoàn thiện. Không flip trang phục để giả view.
5. Model test kiểm scale, all clocks, random seek/GSAP, cuff seam, palm/shaft/tip contact, source plan thiếu pole/offset, mask bounds và chuyển painter slot. Sau đó mới kiểm video và nhiều câu chuyện, ba input, EN/VI/JA/KO và TTS ngoài. Không mở topic guard từ build hoặc 138 SVG.

## Môi trường và bàn giao

Source thực: `C:/Users/Duongvh-pc/.codex/worktrees/stickman-acting-v22/Story-2-video-factory2.1`, branch `codex/prehistoric-life`. Checkout D có WIP riêng; chỉ dùng `.env` ở D. Không commit/in key. Node ≥22.13, Windows; 9router `http://127.0.0.1:20128/v1`.

```powershell
Set-Location -LiteralPath 'C:/Users/Duongvh-pc/.codex/worktrees/stickman-acting-v22/Story-2-video-factory2.1'
# Nếu Studio 8850 đã chạy, chỉ mở trang; không mở thêm instance.
./scripts/start-studio.ps1 -Port 8850 -SkipBuild -Watch `
  -EnvFile 'D:/github/Story-2-video-factory2.1/.env' `
  -ProjectsRoot './runtime/prehistoric-life/projects'
```

Kiểm build/typecheck/schema không chạy assertion. `tests/forest-hand.test.ts` được chuẩn bị để kiểm cuff thật, tangent, palm contact, nonunit scale, seek và compiler slot; đã sửa hai assertion source forearm cũ dùng palm thành wrist. **Runtime assertions, fixture export và video vẫn giao model khác.**

```powershell
# Chỉ model được giao test chạy:
npm test
node --import tsx scripts/forest-motion-fixture.ts --actor karo --action hunt-aim --mood happy
node --import tsx scripts/forest-motion-fixture.ts --actor karo --action spear-lunge --view three-quarter-right --mood happy
node --import tsx scripts/forest-motion-fixture.ts --actor lila --action spear-lunge --view three-quarter-right --mood happy
# --render mới tạo MP4 thật. Fixture im lặng không phải tập truyện hoàn chỉnh.
```

Kết quả V1/bus stop/sinh nhật/0.18/0.19 chỉ áp dụng phạm vi source của chúng; không chứng minh 0.20 hoặc sản phẩm đã hoàn thành. [Lịch sử view/lunge 0.19](VIEW-LUNGE-IMPLEMENTATION.md).
