# Story-to-Video Factory — nền V2.1, định hướng diễn xuất V2.2

Nhập **kịch bản hoàn chỉnh, WAV hoặc SRT**, chọn **người que hoặc robot mini**, rồi tạo video có nhân vật chính dẫn dắt câu chuyện. Mục tiêu V2.2: nhân vật bước vào bối cảnh, quan sát, suy nghĩ, thao tác, phản ứng và dẫn sang ý sau. Nội dung được đọc nguyên văn; nhân vật tham gia minh họa, không tự nhận là nhân vật lịch sử.

**Hệ diễn xuất V2.2 hiện là đặc tả/kế hoạch, chưa được triển khai.** Đọc [kịch bản hình ảnh và diễn xuất](STICKMAN-STORY-DIRECTION.md) và [thứ tự triển khai](V2-IMPLEMENTATION-PLAN.md). Code V2.1 đã có ba luồng/host/Studio với rig/recipe sơ đồ cơ bản; một số thử nghiệm local đã chạy, nghiệm thu toàn bộ còn thiếu. Các lệnh dưới đây dùng contract V2.1 hiện có; không dùng kết quả cũ để khẳng định style mới đã đạt. Xem [trạng thái](IMPLEMENTATION-STATUS.md).

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

- [Đặc tả sản phẩm V2.2 và ba luồng](BUILD-SPEC.md), [diễn xuất và hai storyboard mẫu](STICKMAN-STORY-DIRECTION.md), [trạng thái](IMPLEMENTATION-STATUS.md), [bản đồ code](IMPLEMENTATION-MAP.md).
- [Kế hoạch triển khai/đối chiếu](V2-IMPLEMENTATION-PLAN.md), [bàn giao test](TEST-HANDOFF.md), [evidence V1 và biên dịch V2.1](TEST-RESULTS.md).
- [Bài hơi nước](examples/steam-explainer/README.md), [bài ô tô](examples/car-explainer/README.md), [Robot](library/characters/MINI-ROBOT.md), [người que](library/characters/STICK-MAN.md).

examples/invention-demo được giữ với content.mode=legacy cho V1; không phải mẫu nghiệm thu host. Renderer HyperFrames 0.8.96, SVG/GSAP và FFmpeg; models/providers từ config/models.yaml. Mock là chế độ offline có giới hạn; muốn đánh giá ngữ nghĩa và hình thật phải cấu hình planner/vision và ghi evidence.
