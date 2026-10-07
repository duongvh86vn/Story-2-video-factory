# Lila/Karo — chuyển động tay theo góc khớp

Ngày 08/10/2026. Foundation `e609097caf9df34afae6ccd5974ad29075e2a794`, fixes `718b53c` và `31297be1c5e9874c173cc84ede2c406e62b11379`; body compiler `forest-source-body-motion-17`, trajectory descriptor v3. [Plan](../plans/2026-10-07-source-arm-trajectories.md). Đây là sửa mã chuyển động ứng viên, chưa phải ảnh/video đã nghiệm thu. Giữ Lila/Karo làm diễn viên; màu ấm, khuôn mặt/tóc/râu/trang phục gốc và nét chi mềm vẫn là yêu cầu.

## Nguyên nhân và thay đổi

Rig cũ đã giữ độ dài xương. Lỗi còn nằm ở cách đi từ tay nghỉ sang gesture: mặc định đảo pole của khuỷu qua một pha duỗi chỉ 80ms. Nét cubic mềm không xử lý được chuyển động khớp quá nhanh đó. Offset phản ứng mặc định `+25/-110` còn là hằng số world, không theo độ dài tay/scale từng diễn viên. Những vấn đề này khác với lỗi tạo hình trong atlas AI; sửa FK không sửa nét áo/mặt/identity của PNG.

`packages/animation/arm-trajectory.ts` nội suy góc vai và góc gập khuỷu có dấu, rồi dựng upper/lower bằng forward kinematics giữ chiều dài. Cung vai được chọn một lần từ tư thế bắt đầu gesture, tie 180° có hướng dương cố định. Keypose đang chuyển động được giữ trong corridor ±90° quanh cung đã đăng ký; vượt corridor báo `needs-arm-keypose`, không chọn lại đường quay giữa chừng. Mặc định giữ dấu gập khuỷu của arm chain thực ở thời điểm bắt đầu; explicit `rest`/`reach` vẫn được tôn trọng, đổi nhánh qua zero flexion liên tục. Nội suy quintic ở vào/ra có C2 với keypose cố định; khi body/keypose cùng chuyển động, velocity/acceleration toàn thân vẫn phải kiểm riêng.

Chỉ các source-body gesture không contact trong các version hiện hành 2.2.13/14/15 dùng branch mới. Script/gesture giữ nguyên start/end; explicit contact/release clock được giữ. Thời gian sáng tạo mặc định vào pose tối đa600ms hoặc35% clip, ra pose tối đa400ms hoặc25%; không đổi clock narration, audio hoặc native sprite. Compiler có seed các mốc này trong refinement hiện có. Default reaction/indication lấy độ vươn từ chiều dài tay; target rõ ràng và chin giữ nguyên. Target không với tới báo `needs-arm-keypose`, không âm thầm dài xương hoặc sửa target.

Khi chạy đồng thời gesture, entry lấy arm chain đang có của run. Pole và nhánh vai giữ theo entry xuyên qua lúc kết thúc chạy; không đổi theo `walk.direction` của frame hiện tại. `think` mặc định cũng dùng entry thật; synthesized rest override của `think` chỉ còn ở đường legacy. Explicit rest/reach vẫn có nghĩa theo tay rig. Các tay cầm/đặt/thả/vận hành/giáo giữ solver contact trước đó. Generic và version source cũ giữ đường goal/IK số cũ. Mitten nguồn vẫn rigid theo tangent cẳng tay, ink dừng ở cuff, palm là grip; không đưa lại kiểu khuỷu `<`/`>` sắc. Không sửa bitmap nguồn, expression, mouth hoặc gaze trong mốc này.

Body compiler16→17, fingerprint thêm mô tả trajectory. Scene identity nay nhận cả `forest-body-1` và `forest-body-view-1` qua cùng predicate; quarter-view candidate cũng đổi cache khi source motion pack đổi. Narration identity không phải output của helper này. Current topic/candidate final guards vẫn giữ; geometry đúng chưa là art/motion approval.

## Phạm vi kiểm được

Fresh full build/test:typecheck/schema export exit0 sau bản cuối `31297be`; diff clean, export không thay schema đã commit. Foundation `e609097` và hai fix cũng đã qua kiểm source tương ứng, ghi trong [review accumulator](reviews/source-arm-trajectory-review-v1.md). Chín declarations ở `tests/forest-arm-trajectory.test.ts` **NOT RUN**. Controller không gọi callback/assertion/fixture, body evaluator, GSAP, browser, production API/CLI/model/audio/TTS/ASR/render/MP4 để nghiệm thu bước này. Không có ảnh/video body mới được gán cho source17. Review độc lập đã PASS trong phạm vi source sau khi giải quyết ba P2; không suy từ build hoặc source review ra anatomy/motion/art acceptance.

## Bàn giao model test

```powershell
Set-Location -LiteralPath 'C:/Users/Duongvh-pc/.codex/worktrees/stickman-acting-v22/Story-2-video-factory2.1'
# Chỉ model được giao test chạy callback sau; không cần model/API/TTS:
node --experimental-test-module-mocks --import tsx --test --test-concurrency=1 tests/forest-arm-trajectory.test.ts
```

Chín declarations kiểm fixed lengths/random seek/branch crossing, C2 với keypose cố định/clock rõ, input/window rejection, hai diễn viên × hai tay giữ target/cuff/palm, reaction theo scale/unreachable target, legacy/contact compatibility, cung vai moving-keypose quanh antipode, default react qua hai hướng chạy/hai tay/run exit, và implicit think cùng explicit pole overrides khi chạy. Test phải ghi PASS/FAIL/NOT RUN với exact commit. Đừng lấy tính chất toán học của helper làm bằng chứng tay trong video đẹp.

Model test tiếp tục kiểm compile/refinement/GSAP real seek, default và explicit pole, không contact bị khóa bị kéo lệch, run/gesture vào–ra với cả hướng, seated/lap, scale/cuff seam, chuyển động toàn thân/clearance tóc-râu-áo, world target/prop, source-version cache/resume và renderer cũ. Kiểm cả fixed authored body-view; view đó vẫn happy/im lặng, chưa có speech/turn/cloth motion được duyệt.

## Khởi động Studio để kiểm

Launcher hiện có `scripts/start-studio.ps1` được đọc lại source: Node≥22.13/dependency cài sẵn, không dừng server khác khi trùng cổng. Để model test tránh instance8850 đang mở, chạy terminal riêng trên8851 với project root riêng. Đây là hướng dẫn chưa được chạy ở checkpoint này:

```powershell
Set-Location -LiteralPath 'C:/Users/Duongvh-pc/.codex/worktrees/stickman-acting-v22/Story-2-video-factory2.1'
powershell -ExecutionPolicy Bypass -File scripts/start-studio.ps1 `
  -Port 8851 -EnvFile 'D:/github/Story-2-video-factory2.1/.env' `
  -ProjectsRoot 'projects-arm-trajectory-test'
```

Mở http://127.0.0.1:8851/. Giữ terminal, Ctrl+C dừng instance này. EnvFile chỉ chọn file key riêng; không gửi/in/commit nội dung. Các trang body là inspection ở một clock, không phát video: `/api/topics/prehistoric-life/body?action=point&timeMs=900&mood=happy`, `think`, `jump`; source/API runtime còn phải do model test kiểm. Hand trái/phải thêm qua callback/calibration/arm-audit đang có, không tự thêm query hand chưa được API hỗ trợ. Server/port8850 và checkout D có WIP riêng chưa được restart/sửa trong checkpoint này.

## Còn phải làm để dùng được

Sửa tạo hình và author đủ pose/view/mouth, ánh mắt bạn diễn, biểu cảm, di chuyển/diễn xuất, props/contact/handoff và approval receipts. [Mẫu giữ RGB gốc](SOURCE-RGB-MASTERS.md) mới là SVG tĩnh với matte cần căn lại, chưa nối rig. Các atlas Lila v3/Karo v2 vẫn chưa đăng ký/duyệt theo [phép đo](MOTION-ART-MEASUREMENT.md). Rà full pipeline ba input script nguyên văn / WAV audio-clock gốc / story→script trung thành→video, EN/VI/JA/KO và TTS bên ngoài. Mốc này không mở final/DONE, không chứng minh đạt video mẫu hoặc thay mục tiêu tool bằng một helper.
