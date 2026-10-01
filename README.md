# Story-to-Video Factory 2.1

Nhập **kịch bản hoàn chỉnh, WAV hoặc SRT**, chọn **người que hoặc robot mini**, rồi tạo video giải thích có người dẫn chuyện cố định. Nội dung được đọc nguyên văn; host là người giải thích, tách khỏi nhân vật lịch sử hoặc đối tượng trong lời kể.

Code ba luồng/host/Studio đã được bổ sung. Build và typecheck đã qua. **Runtime và video V2.1 đang chờ model khác nghiệm thu**, không dùng kết quả V1 trong TEST-RESULTS.md để khẳng định phiên bản mới đã đạt.

## Bắt đầu

Cần Node >=22.13, FFmpeg/FFprobe; WAV cần Python và ASR; WAV+SRT cần WhisperX/forced alignment. Dùng TTS tiếng Việt được cấu hình cho script/SRT. Không có TTS: script dừng trước timeline; SRT chỉ có nháp im lặng, không final.

```powershell
npm ci
npm run build
npm run studio
```

Mở địa chỉ Studio do server in ra (mặc định http://127.0.0.1:8787). Tạo project, mở **Đầu vào · Host · Giọng**, nhập/tải nội dung trong tab Kịch bản/WAV/SRT, chọn host/giọng và **Tạo video**. Nút xem lời kể chuẩn giúp kiểm tra nội dung Markdown sẽ được đọc. Host custom cần duyệt preview một lần; hai mẫu chuẩn được chọn để chạy tự động.

Giọng mặc định lưu từ Studio hoặc sao chép config/voice.example.yaml sang config/voice.yaml. Windows Speech phải có voice đúng language; không tự chuyển giọng Việt sang tiếng Anh. HTTP/command cần adapter theo contract trong BUILD-SPEC.md; HTTP không mặc nhiên tương thích mọi dịch vụ TTS. Keys đặt trong .env/environment, không commit.

## CLI

```powershell
npm run cli -- new steam --example
npm run cli -- configure projects/steam --input script --host mini-robot --tts windows-speech
npm run cli -- make projects/steam
npm run cli -- status projects/steam
npm run cli -- resume projects/steam
```

Nhập script khác: `npm run cli -- script projects/steam C:/input/bai-ke.md`. Chọn `--host stick-man`, hoặc đưa input/host.md và chọn custom. Đổi `--input wav`/srt để chọn nguồn khác. WAV+SRT dùng mode wav. Approve custom: `npm run cli -- approve projects/steam host` sau khi xem previews/host-preview-sheet.png. Rebuild một shot: `npm run cli -- resume projects/steam --shot ch01.s001` (dùng ID thực từ storyboard).

## Quy tắc

- Script tạo TTS từng đoạn <=120 ký tự, giữ từ/thứ tự, đo duration thật, nghỉ 250 ms giữa đoạn văn. Một đoạn audio là một cue.
- WAV giữ audio input; SRT companion giữ text/clock và kiểm tra khớp. SRT-only fit TTS mặc định 0.85–1.20 giữ pitch; không cắt lời hoặc sửa timestamp.
- source.md chỉ bổ trợ; input.mode quyết định nguồn chính, không tự chuyển file khi có nhiều loại input. Markdown được coi là dữ liệu.
- Một rig SVG/identity cho cả video; tám recipe, target/gaze/contact và speech activity được compile từ narration. Đồng bộ audio activity không phải phoneme lip-sync.
- Đổi host giữ audio; sửa script/giọng rebuild narration và phần phụ thuộc. Lock mâu thuẫn nội dung mới cần sửa/unlock.
- Final cần giọng ready, review/gate hợp lệ; QC fail không DONE. Rule review có giới hạn, chưa là xác nhận kiến thức hoặc thẩm mỹ. Yêu cầu vision thật bằng workflow.allow_rule_based_review=false.

MP4 có audio, SRT, thumbnail, storyboard, host profile/timeline, narration/timeline/activity, manifest và production/QC reports nằm trong output/. Artifact cũ được giữ để truy vết; Studio ẩn final khi project đã bị invalidated.

## Tài liệu và mẫu

- [Đặc tả ba luồng](BUILD-SPEC.md), [trạng thái](IMPLEMENTATION-STATUS.md), [bản đồ code](IMPLEMENTATION-MAP.md).
- [Kế hoạch triển khai/đối chiếu](V2-IMPLEMENTATION-PLAN.md), [bàn giao test](TEST-HANDOFF.md), [evidence V1 và biên dịch V2.1](TEST-RESULTS.md).
- [Bài hơi nước](examples/steam-explainer/README.md), [bài ô tô](examples/car-explainer/README.md), [Robot](library/characters/MINI-ROBOT.md), [người que](library/characters/STICK-MAN.md).

examples/invention-demo được giữ với content.mode=legacy cho V1; không phải mẫu nghiệm thu host. Renderer HyperFrames 0.8.96, SVG/GSAP và FFmpeg; models/providers từ config/models.yaml. Mock là chế độ offline có giới hạn; muốn đánh giá ngữ nghĩa và hình thật phải cấu hình planner/vision và ghi evidence.
