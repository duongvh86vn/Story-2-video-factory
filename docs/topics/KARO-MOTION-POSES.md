# Karo: sửa dáng chân và bộ pose chuyển động

**Hiện hành 0.20:** cuff/palm tách riêng theo ảnh nguồn; chain migrate độc lập target, contact vẫn ở palm, mitten theo tiếp tuyến cẳng tay. Preset frontal đã re-author, slot think discrete và shaft interpolation có kiểm riêng. Grasp/anatomy/motion/video chưa nghiệm thu, `productionReady=false`; ba input và diễn viên trong truyện giữ nguyên. [Chi tiết, bằng chứng và lệnh bàn giao](WRIST-PALM-IMPLEMENTATION.md). Các đoạn 0.19 trở về trước dưới đây là lịch sử.

**Lịch sử 0.19:** hai view 3/4 phải có registration kỹ thuật và ứng viên lunge qua rig/evaluator chung; giữ source bones, cổ/mặt nguyên lớp, near/far arms, sole trụ và clock giáo. Áo view mới vẫn rigid, wrist/palm/grasp và độ đọc joint còn thiếu; hai model review qua 9router chưa chấp nhận anatomy hoàn thiện. Chỉ build/typecheck và inspection clock tĩnh; runtime/MP4/ba input giao model test khác. `productionReady=false`, `productionRig=null`. [Source, ảnh, việc thiếu và lệnh server/test](VIEW-LUNGE-IMPLEMENTATION.md). Các mốc 0.18 trở về trước bên dưới là lịch sử, không phải trạng thái mới.

Bổ sung theo yêu cầu chạy/nhảy/đi săn/cầm–đâm giáo ở [POSES-CHAY-NHAY-SAN.md](POSES-CHAY-NHAY-SAN.md), mốc 0.14. Phần 0.13 dưới đây giữ làm lịch sử; build/typecheck không thay nghiệm thu video.

Ngày 07/10/2026, chủ đề 0.13. Cả Karo và Lila vẫn là diễn viên trong câu chuyện. Tạo hình, màu, trang phục và lời kể đã chốt không đổi khi hiệu chỉnh chuyển động.

## Lỗi và phần đã sửa trong source

Pose `walk 800ms` từng nhấc chân cao kể cả bước ngắn; gối bị vẽ toàn bộ độ gập sang bên. Cùng một pole cho cả hai chân còn tạo chân cong vào trong. Tay đánh mạnh cố định dù đi chậm. Đây là lỗi rig/motion, không phải tạo hình có chủ đích.

`packages/animation/source-walk.ts` định nghĩa một chu kỳ:

| Pose | Pha bước | Ràng buộc |
|---|---:|---|
| Chuyển lực | 0 | Hai đế trên nền, hông bắt đầu chuyển về chân trụ |
| Rời đất | 0.12 | Chân trụ giữ tọa độ thế giới; chân còn lại bắt đầu nhấc |
| Đưa chân qua | 0.47 | Chân nhấc đi theo quỹ đạo thấp, hông giữ chuyển lực có giới hạn |
| Đặt chân | 0.82 | Đế về đúng nền với tốc độ/gia tốc bằng 0 |
| Nhận lực | 1 | Hai đế giữ vị trí; chuẩn bị bước tiếp theo |

Quãng nâng chân tối đa là `min(quãng chân thực × 0.18, đùi × scale × 0.10)`. Quỹ đạo ngang quintic và đường nâng bậc sáu thay cho nhấc sinus 25% đùi. Không thay sprite ở từng cue. Các bước chuẩn bị ngồi/đứng dùng cùng quỹ đạo, không đá chân đột ngột tại điểm tiếp xúc.

Gối có độ sâu suy luận để phần gập về trước không biến thành chân vòng kiềng trong ảnh front. Xương giữ chiều dài trong XYZ; renderer vẽ độ dài chiếu qua scale Y. Mực là nét cubic nối qua joint đã chiếu, gắn đúng ankle của bàn chân nguồn. Đây không phải rig 3D toàn thân hoặc chứng minh giải phẫu. Khi chuyển vào ghế, mặt phẳng gập theo chuyển pelvis vào support; khi rời ghế, trở về projection front. Không flip một gối đang gập giữa hai cue.

Điều khiển này dùng chung `bodyCalibrationPlan`, `samplePerformance`, `compilePerformance`, `performanceScene`. Body compiler `forest-source-body-motion-8`, renderer art `forest-source-body-svg-7`. Fingerprint nguồn mới làm mất hiệu lực cache hình cũ; không làm lại narration vì narrative contract vẫn phiên bản 1. Generic người que/robot không dùng source body vẫn giữ bộ gait hiện có.

## Xem pose hiện tại

Studio 8850 có [bản 800 ms](http://127.0.0.1:8850/api/topics/prehistoric-life/body?action=walk&timeMs=800&mood=happy) và action `walk-left`. Thanh **Pose bước đầu** có các mốc tính theo metrics của Karo; các actor có metrics khác cần lấy clock riêng. Trang này xem ảnh tĩnh từ evaluator, chưa phát một video đã nghiệm thu.

Evidence developer inspection:

- [Karo 800 ms](reviews/karo-walk-depth-800-v1.png), [đưa chân qua](reviews/karo-walk-depth-passing-v1.png), [đặt chân](reviews/karo-walk-depth-contact-v1.png).
- [Bước trái Karo](reviews/karo-walk-left-depth-800-v1.png), [hai actor bước trái](reviews/source-walk-left-both-800-v1.png).
- [Giữ ghế Karo 2200 ms](reviews/karo-seat-after-depth-2200-v1.png).
- [Hash và phạm vi inspection](reviews/source-walk-pose-self-inspection-v1.json): không có PASS độc lập, không có nghiệm thu chuyển động.

## Bộ pose/artwork còn phải hoàn thiện

1. Dựng thân ba phần tư trái/phải, profile và lưng từ đúng model đã gửi; vẽ phần áo/tóc/đùi bị che. Không xoay đầu trên một thân front để gọi là đi nghiêng; không mirror nguyên canvas làm đổi áo một vai.
2. Với mỗi hướng đi có bộ tám key pose: contact trái → down → passing → up → contact phải → down → passing → up, cùng tỷ lệ/identity/pivot. Các pose mới dùng làm chuẩn hình, sau đó điều khiển một rig liên tục; không crossfade ảnh toàn thân hoặc vẽ lại model ở từng frame.
3. Đo hướng mặt, hông, vai, gối, ankle, heel/toe và thứ tự lớp gần/xa cho từng view. Bàn chân có độ lăn gót/mũi theo bước, nhưng chân trụ không trượt, không xuyên nền; contact và cloth phải theo cùng projection.
4. Hoàn thiện chuyển đứng–đi–dừng, quay–đổi hướng, cúi/nhặt, ngồi–đứng, mang/chuyền đồ. Giữ trọng lượng, nhịp hành động, mắt nhìn bạn diễn và tóc/vạt theo sau. Offset hông hiện tại chỉ là ứng viên diễn xuất nhỏ, không phải mô phỏng động lực học.
5. Review toàn chu kỳ ở tỷ lệ xuất video, không chỉ pose đẹp nhất. Cho Karo và Lila diễn bằng dữ liệu shot/timeline của câu chuyện mới; không đóng cứng một bài thức ăn hoặc người dẫn.

## Môi trường và lệnh giao model test

Dùng worktree `C:/Users/Duongvh-pc/.codex/worktrees/stickman-acting-v22/Story-2-video-factory2.1`, Node >=22.13 và dependencies hiện có. `.env` ở checkout D vẫn dùng cho dịch vụ thực tế; fixture silent dưới đây không gọi model/TTS/ASR hoặc gửi dữ liệu qua 9router. `.env`, runtime và output không commit.

Khởi động Studio nếu cổng 8850 chưa chạy:

```powershell
Set-Location -LiteralPath 'C:/Users/Duongvh-pc/.codex/worktrees/stickman-acting-v22/Story-2-video-factory2.1'
./scripts/start-studio.ps1 -Port 8850 -SkipBuild -Watch -EnvFile 'D:/github/Story-2-video-factory2.1/.env' -ProjectsRoot './runtime/prehistoric-life/projects'
```

Giữ terminal mở; `Ctrl+C` dừng server. Nếu 8850 đang chạy, mở trang hiện có. Launcher không dừng server khác để chiếm cổng.

`npm run build` và `npm run test:typecheck` đã PASS cho source 0.13; `git diff --check` sạch. Đây là build/kiểm kiểu, không phải kiểm chuyển động. Runtime và các lệnh sau giao model test, **chưa chạy ở mốc này**:

```powershell
node --experimental-test-module-mocks --import tsx --test tests/forest-body.test.ts tests/forest-walk.test.ts tests/forest-head-projection.test.ts

# Chỉ biên dịch/stage fixture HTML, chưa xuất MP4:
node --import tsx scripts/forest-motion-fixture.ts --actor karo --action walk --mood happy

# Validator HyperFrames thật và MP4 60fps, cần FFmpeg/Chromium của cấu hình repo:
node --import tsx scripts/forest-motion-fixture.ts --actor karo --action walk --mood happy --render
node --import tsx scripts/forest-motion-fixture.ts --actor karo --action walk-left --mood happy --render
node --import tsx scripts/forest-motion-fixture.ts --actor lila --action walk --mood happy --render
node --import tsx scripts/forest-motion-fixture.ts --actor lila --action walk-left --mood happy --render
node --import tsx scripts/forest-motion-fixture.ts --actor karo --action sit-walk-right --mood happy --render
node --import tsx scripts/forest-motion-fixture.ts --actor karo --action sit-walk-left --mood happy --render
```

Tool chỉ dùng builder/renderer sản xuất chung, hash-check và stage PNG gốc, validate allowlist/scene limit 2 MB. Output tại `runtime/prehistoric-life/motion-fixtures/<actor>/<action>/<mood>/`, MP4 `work/rendered.mp4`. Report scope là fixture im lặng, không phải tập kể chuyện hoặc production approval; render xong cũng không tự đổi readiness.

Model test cần thêm Lila ngồi→đứng→đi hai hướng; bước ngắn/dài, nhanh/chậm, scale/crop khác; random/reverse seek quanh mọi pose, support và speech/gesture boundary. Kiểm chiều dài XYZ với knee depth; scale Y là chiều dài chiếu, không được kiểm bằng chiều dài 2D cũ rồi báo sai. Phải đo contact/khớp/ground, kiểm derivative tại rời/chạm đất, pose không gối lộn nhánh, áo không khe/mất viền/lật UV, silhouette/nét/màu đúng mẫu. Xem render/bake so với evaluator tĩnh; metadata và typecheck không đủ để báo PASS.

`productionReady=false` tiếp tục giữ vì góc thân, diễn xuất, tóc/râu, cảnh và ba luồng tập chưa nghiệm thu. Không dùng bằng chứng hẹp của phần chân để tuyên bố tool ra video đã hoàn thành.
