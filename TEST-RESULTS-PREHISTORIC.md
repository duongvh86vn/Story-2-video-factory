# Báo cáo kiểm tra — Cuộc sống thời tiền sử

Ngày lập và cập nhật runtime: **2026-10-10**, múi giờ **Asia/Saigon**. Báo cáo được lưu tại thư mục gốc project theo yêu cầu người dùng.

**Kết luận hiện tại: 56 test đã chạy, 35 PASS / 21 FAIL / 0 SKIP; cả hai lượt xuất chẩn đoán FAIL trước khi tạo cảnh. Chưa tạo được MP4/frames để đánh giá độ mượt. Sản phẩm chưa hoàn thành.**

Người dùng đã cho phép agent triển khai chạy test và render chẩn đoán cục bộ. Lượt này không gọi model/TTS trả phí, không tạo ảnh, không sửa source hay nới guard. Chi tiết thực tế ở phần đầu dưới đây; các mục 1–5 phía sau giữ hồ sơ bàn giao **trước lượt chạy**, nên NOT RUN trong các bảng lịch sử không thay thế kết quả mới.

## Kết quả runtime thực tế — 10/10/2026

Checkout được chạy: **`bf8bcfbd4018fbff2aceb4cdb8eb448f4c8ecd35`**, tracked source sạch tại lúc chạy. Commit này chỉ bổ sung báo cáo cho implementation **`c2d436a907e2f76f585807bf7f63800503986199`**; năm hash source/test trong source record vẫn khớp sau lượt chạy.

| File test | PASS | FAIL |
| --- | ---: | ---: |
| `tests/seated-rest-arm.test.ts` | 5 | 0 |
| `tests/native-source-seat.test.ts` | 4 | 4 |
| `tests/forest-arm-trajectory.test.ts` | 9 | 0 |
| `tests/native-source-gesture.test.ts` | 8 | 5 |
| `tests/native-source-gesture-project.test.ts` | 4 | 0 |
| `tests/native-manipulation.test.ts` | 5 | 6 |
| `tests/native-head-seat-tracer.test.ts` | 0 | 6 |
| **Tổng** | **35** | **21** |

Command regression ở mục 4 đã chạy, exit **1**, thời gian **62.885 giây**, cancelled/skip/todo đều **0**. Năm test đơn vị mới cho tay nghỉ và test tích hợp mới `native seated rest arms retain their own cuff/palm bones and original phase through cuts and reverse seeks` đều PASS. Kết quả hẹp này chưa chứng minh toàn thân, mặt hoặc phim đã mượt.

| Lệnh xuất chẩn đoán | Kết quả | Bước dừng |
| --- | --- | --- |
| `--native-heads --staging lila-left --acting emotional-reactions --face source-motion --validate --frames --render` | Exit **1** | `canonical`: `needs-head-face-registration: edit region touches another edit or protected paint` |
| `--native-heads --staging lila-right --acting emotional-reactions --face source-motion --validate --frames --render` | Exit **1** | `canonical`: `needs-head-face-registration: brow rotation/shift hull leaves its own skin region` |

Cả hai lượt dừng khi nạp/kiểm registration đầu, trước cast/scene/master/HyperFrames. Lint/check, snapshots, encode, probe/decode và visual-motion-review đều **NOT RUN vì bước trước lỗi**, không phải PASS hoặc lỗi đã xác nhận của renderer. Không có MP4 mới, không có frames mới. Chưa thể so sánh độ mượt với video mẫu. `productionAcceptance=false`, `finalExportAllowed=false` được giữ đúng.

### Log và artifact bàn giao

- [results.json](docs/validation/2026-10-10-prehistoric-source113/results.json): command đầy đủ, môi trường, kết quả 56 ca, vị trí source của 21 failure, vùng dòng trong log và SHA256 các bằng chứng.
- [regression-original.log](docs/validation/2026-10-10-prehistoric-source113/regression-original.log): log đầy đủ, giữ nguyên; [exit code](docs/validation/2026-10-10-prehistoric-source113/regression-original-exit.json).
- [Log bố trí Lila trái](docs/validation/2026-10-10-prehistoric-source113/tracer-lila-left-original.log) và [tracer-report.json](docs/validation/2026-10-10-prehistoric-source113/tracer-lila-left-report.json).
- [Log bố trí Lila phải](docs/validation/2026-10-10-prehistoric-source113/tracer-lila-right-original.log) và [tracer-report.json](docs/validation/2026-10-10-prehistoric-source113/tracer-lila-right-report.json).
- [Phạm vi người dùng đã cho phép](docs/validation/2026-10-10-prehistoric-source113/authorization.json).

Các bản log/receipt trên là bản sao nguyên byte từ `runtime/prehistoric-life/qa/source113-local-20261010/` và hai thư mục tracer UUID ghi trong `results.json`. Chúng được đưa vào Git để model tiếp theo đọc được. Hai thư mục tracer hiện chỉ có report lỗi; không có video hoặc ảnh để bàn giao.

### Công việc cần sửa, theo bằng chứng

21 test FAIL có lỗi chung và lỗi fixture; **không được hiểu là 21 lỗi production độc lập**. Cần phân biệt nguyên nhân trong source với dữ liệu/expectation test đã cũ.

| Ưu tiên | Bằng chứng hiện tại | Phần cần xử lý |
| --- | --- | --- |
| P0 — registration mặt | Hai lệnh tracer thất bại; 6/6 test native-head và một ca supporting-head dừng vì registration | Kiểm đúng ảnh/mask/edit/protected contour của Lila. Với `source-motion`, `lila-left` nạp `lila-right-follow-v1.json`, `lila-right` nạp `lila-left-follow-v1.json` trong `library/topics/prehistoric-life/head-face-registrations/`. Kiểm cả các face/emotion registrations mà suite dùng và Karo sau khi qua Lila. Hàm nạp nằm ở `packages/topics/head-face-source.ts`; geometry ở `packages/animation/native-head-face.ts`. Sửa vùng hoặc chuyển động chân mày theo chính ảnh nguồn; không tắt kiểm overlap hoặc dùng mặt khác |
| P1 — pose tay chạm cằm | Hai ca source-gesture báo khuỷu **151.4°**, vượt giới hạn **145°** | Rà keypose, vị trí cổ/tay và đường tiếp cận trong own rig; `packages/animation/source-arm.ts` / `compiler.ts`. Không tăng giới hạn chỉ để test xanh; kiểm cả reach/hold/recovery và seek |
| P1 — thả đồ vật / contact | Landing x cần **124.4553**, nhận **106.35895079660392**; một ca contact thiếu release/destination | Đối chiếu nguồn release, vận tốc tay, clock và destination ở `airborne.ts`, `native-contact-arm.ts`, `compiler.ts` và fixture `tests/native-manipulation.test.ts`. Giữ momentum thật; chưa kết luận source hay fixture sai khi chưa đối chiếu |
| P1 — camera cảnh không đạo cụ | `world.propBindings is not iterable`; ca khác tạo scale ngoài wide **0.65–1.12** | Rà optional/default `propBindings` và source context trong `packages/director/camera.ts`; sửa planner/layout để khung chứa cả nhân vật, ghế, bóng và lưng tựa. Không clamp zoom để che crop hoặc bỏ validation |
| P1 — kích thước cảnh | Ca hai diễn viên ngồi báo `Scene exceeds max_scene_bytes` | Đo byte và tìm phần lặp trong output canonical renderer; tối ưu emitter/bake/layers với cap hiện có, giữ đủ diễn hoạt và source clock. Chưa có số byte cụ thể trong assertion gốc; cần bổ sung chẩn đoán khi sửa |
| P1 — identity và fixture liên cảnh | `Performance identity/profile mismatch`; hai fixture có `Host action interval must be positive`; một fixture bị `Diagram visualization requires an explanatory event.` | Rà profile/rig/hash qua primary swap; sửa fixture để có đúng mode, source và khoảng thời gian hợp lệ trước khi kiểm hành vi đích. Không tự thêm sự kiện giải thích vào mọi câu chuyện để qua schema |
| P2 — determinism số thực | `deepStrictEqual` khác seat weight khoảng **4e-17** và tọa độ khoảng **3e-14** tại cùng phase | Đối chiếu clock/local↔original và sai số số thực. Không coi chênh lệch này là rung nhìn thấy; chỉ dùng tolerance có căn cứ cho số thực, giữ assertion identity/source/paint và clock quan trọng |
| P2 — expectation lỗi đã cũ | Hai regex đòi `/source.../`, nhưng thực tế guard báo `needs-view-gesture-phase...selected current native mouth/eyes/head candidate` | Chuẩn bị fixture tới đúng guard cần kiểm hoặc cập nhật expectation đúng contract; không tính việc fail regex là bằng chứng tay biến dạng |

Sau sửa cần chạy lại bảy file và cả hai staging bằng đúng lệnh mục 4, lưu SHA mới và log mới riêng. Chỉ sau khi xuất được phim mới mới kiểm identity/màu/mặt/hướng nhìn, va chạm/khớp, reverse seek và độ mượt ở tốc độ thường. Ba luồng sản phẩm, giọng đa ngôn ngữ/local TTS, resume và final/QC vẫn cần nghiệm thu riêng.

### Môi trường thực tế của lượt chạy

Windows/PowerShell; Node **v24.19.0**; HyperFrames cài đặt **0.8.96**; FFmpeg/FFprobe **2025-09-25-git-9970dc32bf-full_build-www.gyan.dev**, tại `C:/ffmpeg/bin/`. Browser/encode chưa được gọi vì registration lỗi sớm. Không cài lại dependencies, không khởi động hoặc thay server8850/checkout D.

Lượt này chỉ kiểm tra và lưu bằng chứng: tiến độ triển khai vẫn ước lượng **40%, +0 điểm phần trăm**. Số test PASS không được đổi thành phần trăm hoàn thành dự án.

---

Các mục 1–5 sau đây là **hồ sơ bàn giao trước lượt runtime vừa ghi**, giữ để truy nguồn build/typecheck và các lệnh. Kết quả thực tế phía trên thay thế trạng thái chờ test của những ca đã chạy.

## 1. Hồ sơ trước test — phiên bản và phạm vi bằng chứng

| Trường | Giá trị |
| --- | --- |
| Source được ghi nhận | `c2d436a907e2f76f585807bf7f63800503986199` |
| Nhánh | `codex/prehistoric-life` |
| Topic | `forest-tribe-0.113-seated-rest-arms` |
| Body compiler | `forest-source-body-motion-44` |
| Môi trường source checks | Windows / PowerShell; Node `v24.19.0` |
| Source record | [seated-rest-arm-source-record-v1.json](docs/topics/reviews/seated-rest-arm-source-record-v1.json) |
| Hướng dẫn test chi tiết | [SEATED-REST-ARMS-HANDOFF.md](docs/topics/SEATED-REST-ARMS-HANDOFF.md) |
| Tiến độ toàn dự án | Khoảng **40%**, là ước lượng triển khai, không phải tỷ lệ nghiệm thu |

Các kết quả source checks dưới đây thuộc source SHA nêu trên, đã được ghi trước khi lập file này; không chạy lại trong lượt chỉ viết báo cáo. Commit bổ sung báo cáo không làm thay đổi source của các kết quả đó. Khi model test chạy, phải ghi lại SHA thực tế, không mặc nhiên coi SHA mới đã được kiểm thử.

`TEST-RESULTS.md` cũ ghi kết quả V1 của SHA `81bf7b8df9c94cbf1562519ba8ccdfd769c22b51`. Không dùng kết quả đó để xác nhận Lila/Karo, diễn hoạt hoặc ba luồng hiện tại đạt yêu cầu.

## 2. Hồ sơ trước test — source checks đã thực hiện

| Kiểm tra | Kết quả thực tế | Giới hạn / bằng chứng |
| --- | --- | --- |
| `npm run build` | Exit **0** | Backend và Studio TypeScript, Vite build; 69 modules, 902 ms. Completion log `abcb25`, ghi trong source record |
| `npm run test:typecheck` | Exit **0** | Chỉ kiểm tra kiểu của source test; **0 callback test được thực thi**. Completion log `ef7e25` |
| `node --import tsx scripts/prehistoric-pack.ts` | Exit **0** | Inventory/metadata tĩnh; log `77256c`; không render hoặc nghiệm thu chuyển động |
| Kiểm tra Git/file/hash/JSON/TypeScript AST | Exit **0** | Log `30e708`; 121 raster được theo dõi giữ nguyên byte, hash vật lý trong manifest khớp; không gọi helper/pose/renderer/test |
| Kiểm tra giao source lên GitHub | Local và remote cùng SHA `c2d436a907e2f76f585807bf7f63800503986199` | Source bytes khớp bản đã giao; không chứng minh runtime đúng |

Không tạo ảnh mới trong thay đổi source0.113. Sáu callback mới đã được khai báo: năm trong `tests/seated-rest-arm.test.ts`, một trong `tests/native-source-seat.test.ts`; **chưa được thực thi trong lượt triển khai**.

Combo `coder` và `tester` qua 9router đã hỗ trợ bằng đề xuất/review source. Review của `tester` diễn ra trước chỉnh sửa cuối về nhánh góc liên tục và hai khai báo test bổ sung; không phải kết quả test runtime hoặc phê duyệt source cuối. Không gọi thêm model khi lập báo cáo này.

Thay đổi cần kiểm chứng: tay nghỉ khi đứng → ngồi → đứng dùng nội suy góc với chiều dài xương cố định, cùng nguồn clock cho frame và đầu gesture. Chưa thể kết luận các lỗi tay, mặt hoặc độ mượt trong thành phẩm đã được giải quyết chỉ từ thay đổi này.

## 3. Hồ sơ trước test — các phần chờ nghiệm thu

**NOT RUN / chưa nhận báo cáo** dưới đây nghĩa là không có bằng chứng runtime cho source hiện tại trong báo cáo này, không phải kết luận FAIL.

| Hạng mục | Trạng thái | Bằng chứng cần bổ sung |
| --- | --- | --- |
| Sáu callback mới và các suite hồi quy liên quan | NOT RUN | Command, SHA, exit code, số pass/fail/skip, log đầy đủ |
| Tay nghỉ ngồi/đứng của cả Lila/Karo, cả hai tay | NOT RUN | Chiều dài xương, cuff/palm, elbow pole, không gập sai hoặc xuyên thân/trang phục |
| Gesture giữa chuyển trọng lượng; camera cut; reverse/random seek | NOT RUN | Kết quả hồi quy và frames ở trước/sau các mốc; góc không nhảy 360° |
| Tracer hai bố trí, đầu gốc, diễn xuất và listener | NOT RUN | MP4/frames của cả `lila-left` và `lila-right`, nhận xét ở tốc độ thường |
| Identity, mắt/mũi/miệng, hướng nhìn bạn diễn, trang phục và màu | NOT RUN | So sánh ảnh gốc và nhiều thời điểm trong phim; không chỉ một pose đứng |
| Đi/chạy/nhảy, săn/cầm/đâm giáo, tương tác đạo cụ | NOT RUN | Hồi quy toàn thân, tiếp xúc tay/đạo cụ và chân/đất; silhouette hợp lý |
| Câu chuyện → kịch bản → video | Chưa nghiệm thu | Câu chuyện do người dùng cung cấp; Lila/Karo là diễn viên trong cảnh, có đạo diễn/camera và thành phẩm thật |
| Kịch bản nguyên văn → audio/clock → video | Chưa nghiệm thu | Đối chiếu lời đọc, audio thực tế, phụ đề và video; không sửa/thêm lời ngoài yêu cầu |
| WAV gốc → transcript/clock → video | Chưa nghiệm thu | Giữ audio và nội dung gốc; đối chiếu đồng bộ, người nói và diễn xuất |
| SRT và WAV + SRT tương thích | Chưa nghiệm thu | Giữ text/clock; mismatch và cue không fit chặn final đúng cách |
| Giọng EN chính, VI/JA/KO; TTS local/external | Chưa nghiệm thu | Matrix provider/voice/ngôn ngữ; lỗi/thiếu giọng chặn final, không cắt lời để fit |
| Resume/cache/locks; sửa nội dung/giọng/diễn viên; rebuild shot | Chưa nghiệm thu | Artifact nào được giữ/tạo lại, lỗi nguồn và lock được xử lý đúng |
| Final MP4/audio/SRT/thumbnail/storyboard/manifest/QC | Chưa nghiệm thu | Đường dẫn artifact, probe/decode, review phim và QC thật trên SHA đã chạy |

Chưa có video hiện hành và QA ledger được chấp nhận cho source này. `productionReady=false`, `fullGoalComplete=false`. Không tạo hồ sơ duyệt giả hoặc bỏ guard để biến phim chẩn đoán thành final đạt yêu cầu.

## 4. Các lệnh bàn giao — đã chạy trong lượt runtime phía trên

Bảy file regression và hai lệnh tracer dưới đây đã được chạy sau xác nhận của người dùng, với kết quả ở đầu báo cáo. **Lệnh khởi động Studio phía sau chưa chạy trong lượt này.** Dùng Node ≥22.13 và dependencies sẵn có. `node_modules` của worktree C đang là junction tới checkout D; không chạy `npm ci` vào junction đó. Môi trường V1 không thay thế việc kiểm tra môi trường hiện hành.

```powershell
Set-Location -LiteralPath 'C:/Users/Duongvh-pc/.codex/worktrees/stickman-acting-v22/Story-2-video-factory2.1'
git rev-parse HEAD
node --version

node --experimental-test-module-mocks --import tsx --test --test-concurrency=1 tests/seated-rest-arm.test.ts tests/native-source-seat.test.ts tests/forest-arm-trajectory.test.ts tests/native-source-gesture.test.ts tests/native-source-gesture-project.test.ts tests/native-manipulation.test.ts tests/native-head-seat-tracer.test.ts

npm run tracer:native-seat -- --native-heads --staging lila-left --acting emotional-reactions --face source-motion --validate --frames --render
npm run tracer:native-seat -- --native-heads --staging lila-right --acting emotional-reactions --face source-motion --validate --frames --render
```

Tracer mặc định là phim chẩn đoán 7,2 giây không có audio và xuất thư mục UUID mới. Ghi đường dẫn thực tế từ output của lệnh. Chỉ thêm `--wav 'đường dẫn tuyệt đối tới WAV'` khi có WAV chẩn đoán thực sự khớp clock. Tracer không thay nghiệm thu ba luồng câu chuyện/kịch bản/WAV và final có giọng.

Khởi động Studio riêng để kiểm source trong worktree C:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/start-studio.ps1 -Port 8861 -ProjectsRoot 'C:/Users/Duongvh-pc/.codex/worktrees/stickman-acting-v22/Story-2-video-factory2.1/runtime/source113-test-projects'
```

Giữ terminal mở, vào `http://127.0.0.1:8861/`; Ctrl+C dừng server này. Dùng `-EnvFile` với đường dẫn file cấu hình thực tế nếu cần model/TTS; không ghi API key vào báo cáo. Server8850/checkout D không tự nhận source của worktree C.

## 5. Quy tắc ghi kết quả cho lượt sửa/test tiếp theo

Chưa điền kết quả giả định. Giữ phần lịch sử source checks ở trên và bổ sung từng lượt thực tế vào đây:

- Ngày/giờ, người/model thực hiện, SHA đầy đủ, worktree, phiên bản công cụ, provider/model/voice đã dùng (không chứa key).
- Từng command, exit code, số pass/fail/skip và đường dẫn log trong project; ghi cả trường hợp không chạy được và lý do.
- Đường dẫn project, MP4, frames, audio, SRT, probe/decode và báo cáo QC; xem phim ở tốc độ thường để nhận xét độ mượt.
- Với mỗi lỗi: mức độ, cách tái hiện, actor/action/staging, time/frame cụ thể, mong đợi/thực tế và ảnh/video minh họa.
- Chỉ kết luận đạt trong phạm vi có bằng chứng. Nêu rõ phần còn thiếu để agent triển khai tiếp nhận và sửa; chưa có báo cáo runtime thì chưa nghiệm thu.

Việc bổ sung file báo cáo này thay đổi tiến độ **+0 điểm phần trăm**; mốc toàn dự án vẫn khoảng **40%**. Cách tính và giới hạn của ước lượng nằm trong [PROJECT-PROGRESS.md](docs/topics/PROJECT-PROGRESS.md).
