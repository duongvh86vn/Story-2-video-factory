# Báo cáo kiểm tra — Cuộc sống thời tiền sử

Ngày lập: **2026-10-10**. Báo cáo được lưu tại thư mục gốc project theo yêu cầu người dùng.

**Kết luận hiện tại: build/typecheck và kiểm tra tĩnh đã qua; chưa có kết quả runtime/video hiện hành để nghiệm thu. Sản phẩm chưa hoàn thành.** File này tổng hợp bằng chứng đã có và dành phần cập nhật cho model test; việc lập báo cáo không đồng nghĩa đã chạy các lệnh test bên dưới.

## 1. Phiên bản và phạm vi bằng chứng

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

## 2. Những kiểm tra đã thực hiện

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

## 3. Các phần chưa có kết quả nghiệm thu hiện hành

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

## 4. Môi trường và lệnh bàn giao cho model test

**Các lệnh trong mục này chưa được agent triển khai chạy khi lập báo cáo.** Chạy trong checkout đúng source, dùng Node ≥22.13 và dependencies sẵn có. `node_modules` của worktree C đang là junction tới checkout D; không chạy `npm ci` vào junction đó. FFmpeg/FFprobe, trình duyệt render và cấu hình TTS/model phải được model test kiểm tra tại thời điểm chạy; kết quả môi trường V1 không thay thế việc này.

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

## 5. Phần model test cập nhật sau khi chạy

Chưa điền kết quả giả định. Giữ phần lịch sử source checks ở trên và bổ sung từng lượt thực tế vào đây:

- Ngày/giờ, người/model thực hiện, SHA đầy đủ, worktree, phiên bản công cụ, provider/model/voice đã dùng (không chứa key).
- Từng command, exit code, số pass/fail/skip và đường dẫn log trong project; ghi cả trường hợp không chạy được và lý do.
- Đường dẫn project, MP4, frames, audio, SRT, probe/decode và báo cáo QC; xem phim ở tốc độ thường để nhận xét độ mượt.
- Với mỗi lỗi: mức độ, cách tái hiện, actor/action/staging, time/frame cụ thể, mong đợi/thực tế và ảnh/video minh họa.
- Chỉ kết luận đạt trong phạm vi có bằng chứng. Nêu rõ phần còn thiếu để agent triển khai tiếp nhận và sửa; chưa có báo cáo runtime thì chưa nghiệm thu.

Việc bổ sung file báo cáo này thay đổi tiến độ **+0 điểm phần trăm**; mốc toàn dự án vẫn khoảng **40%**. Cách tính và giới hạn của ước lượng nằm trong [PROJECT-PROGRESS.md](docs/topics/PROJECT-PROGRESS.md).
