# Story-to-Video Factory — diễn viên trong câu chuyện

> Contract hiện hành ngày 02/10/2026: [STORY-ACTOR-DIRECTION.md](STORY-ACTOR-DIRECTION.md). Người que là diễn viên đóng vai trong câu chuyện; bỏ yêu cầu một người dẫn cố định, quota xuất hiện và kích thước bắt buộc. Ba luồng nguyên văn giữ nguyên. Source2.2.21 đang triển khai/nghiệm thu; evidence presenter cũ không chứng minh chế độ mới đạt.

Nhập **kịch bản hoàn chỉnh, WAV hoặc SRT**, chọn **người que hoặc robot mini**, rồi tạo phim hoạt hình kể lại nội dung. Mỗi vai có identity và tạo hình riêng: nhà nghiên cứu, thợ, người sử dụng hoặc nhân vật lịch sử được nguồn nêu tên. Giọng kể có thể ở ngoài hình; lời kể giữ nguyên văn.

**Source2.2.21 đang triển khai/nghiệm thu.** Dự án mới mặc định story-cinematic, character_mode=actors và người que. Dự án cũ giữ chế độ tương thích; chuyển sang actors cần replan hình. Đọc [đặc tả diễn viên](STORY-ACTOR-DIRECTION.md), [kế hoạch](V2-IMPLEMENTATION-PLAN.md) và [trạng thái](IMPLEMENTATION-STATUS.md). Build và QC không chứng minh chất lượng video.

## Bắt đầu

Cần Node >=22.13, FFmpeg/FFprobe; WAV cần Python và ASR; WAV+SRT cần WhisperX/forced alignment. Dùng TTS tiếng Việt được cấu hình cho script/SRT. Không có TTS: script dừng trước timeline; SRT chỉ có nháp im lặng, không final.

```powershell
npm ci
npm run build
npm run studio
```

Mở địa chỉ Studio do server in ra (mặc định http://127.0.0.1:8787). Tạo project, mở **Nội dung, diễn viên và giọng kể**, nhập/tải nội dung trong tab Kịch bản/WAV/SRT, chọn kiểu tạo hình/giọng và **Tạo video**. Xem lời kể chuẩn trước khi chạy. Rig MD riêng cần duyệt preview một lần; vai do director phân từ nội dung có preview riêng, không bắt buộc duyệt từng vai.

Project mới trong Studio mặc định chọn `story-cinematic`. Trong **Model thiết kế cảnh**, chọn dịch vụ/model đang dùng; Codex CLI có thể chọn `default` với tài khoản đã đăng nhập, Claude CLI cần model và credit khả dụng. Có thể ghi ý tưởng hình ảnh tùy chọn, để model tự chọn thiết kế, dàn cảnh và nhịp diễn. Cấu hình phát hành sẵn dùng mock để mở ngoại tuyến; đây là bản phác thảo theo quy tắc. Muốn model thiết kế video, cấu hình role `storyboard` theo [OPEN-ART-DIRECTION.md](OPEN-ART-DIRECTION.md). Một lời gọi model thành công hoặc QC qua chưa chứng minh chất lượng toàn bài.

Giọng mặc định lưu từ Studio hoặc sao chép config/voice.example.yaml sang config/voice.yaml. Windows Speech phải có voice đúng language; không tự chuyển giọng Việt sang tiếng Anh. HTTP/command cần adapter theo contract trong BUILD-SPEC.md; HTTP không mặc nhiên tương thích mọi dịch vụ TTS. Keys đặt trong .env/environment, không commit.

Giọng Việt local có thể cài bằng `python scripts/setup-piper.py`; script cài phiên bản Piper cố định, kiểm tra checksum model và giữ cấu hình giọng đã có. Dùng `--replace-default` để chọn Piper làm mặc định, cấu hình cũ được sao lưu. Model/card nằm trong runtime/tts/models; đọc attribution và giấy phép dataset trong MODEL_CARD. Thư mục runtime và config/voice.yaml là dữ liệu riêng từng máy.

ASR/alignment: tạo venv Python và cài `scripts/requirements.txt` hoặc `scripts/requirements-whisperx.txt`. Đặt `VIDEO_FACTORY_PYTHON` trỏ tới Python của venv; alignment Việt có thể chọn `VIDEO_FACTORY_ALIGN_MODEL=nguyenvulebinh/wav2vec2-base-vi-vlsp2020`. Xem packages/ingest/README.md để provision model cache trước khi chạy offline; pipeline không coi thiếu model là kết quả đạt.

## CLI

```powershell
npm run cli -- new steam --example
npm run cli -- configure projects/steam --input script --host stick-man --style story-cinematic --characters actors --tts windows-speech
npm run cli -- make projects/steam
npm run cli -- status projects/steam
npm run cli -- resume projects/steam
```

Nhập script khác: `npm run cli -- script projects/steam C:/input/bai-ke.md`. Chọn `--host stick-man`, hoặc đưa input/host.md và chọn custom. Đổi `--input wav`/srt để chọn nguồn khác. WAV+SRT dùng mode wav. Approve custom: `npm run cli -- approve projects/steam host` sau khi xem previews/host-preview-sheet.png. Rebuild một shot: `npm run cli -- resume projects/steam --shot ch01.s001` (dùng ID thực từ storyboard).

## Quy tắc

- Script tạo TTS từng đoạn <=120 ký tự, giữ từ/thứ tự, đo duration thật, nghỉ 250 ms giữa đoạn văn. Một đoạn audio là một cue.
- WAV giữ audio input; SRT companion giữ text/clock và kiểm tra khớp. SRT-only fit TTS mặc định 0.85–1.20 giữ pitch; không cắt lời hoặc sửa timestamp.
- source.md chỉ bổ trợ; input.mode quyết định nguồn chính, không tự chuyển file khi có nhiều loại input. Markdown được coi là dữ liệu.
- Mỗi vai giữ identity/rig riêng. Có thể có nhiều vai và cảnh cơ cấu không có người dẫn. Tám ý đồ giải thích phục vụ nội dung; target/gaze/contact đúng. Voiceover không làm mọi nhân vật nói; speech activity không phải phoneme lip-sync.
- Đổi host giữ audio; sửa script/giọng rebuild narration và phần phụ thuộc. Lock mâu thuẫn nội dung mới cần sửa/unlock.
- Final cần giọng ready, review/gate hợp lệ; QC fail không DONE. Rule review có giới hạn, chưa là xác nhận kiến thức hoặc thẩm mỹ. Yêu cầu vision thật bằng workflow.allow_rule_based_review=false.

MP4 có audio, SRT, thumbnail, storyboard, actor-cast/actor-timeline, narration/timeline/activity, manifest và production/QC reports nằm trong output/. Tạo hình/preview từng vai ở assets/actors; host profile/timeline là dữ liệu tương thích của rig nền. Artifact cũ giữ để truy vết; Studio ẩn final khi project bị invalidated.

Director21, animation7 và artwork4 đã qua build. Audit độc lập **145/145** cho tay/khớp/GSAP, cast, Studio API, khóa vai, resume và export; [evidence sửa tay](docs/validation/2026-10-02-outward-elbows.md). Full suite sau sửa **403/403 PASS**, test:typecheck0; [báo cáo](docs/validation/2026-10-02-release-regressions.md) giữ lịch sử378/386 FAIL8 và các phần chưa kiểm tra. Đây vẫn là nhánh triển khai; chưa tuyên bố sản phẩm hoàn thành hoặc chất lượng toàn bài đạt.

## Tài liệu và mẫu

- [Đặc tả sản phẩm V2.2 và ba luồng](BUILD-SPEC.md), [vai diễn và diễn xuất](STORY-ACTOR-DIRECTION.md), [trạng thái](IMPLEMENTATION-STATUS.md), [bản đồ code](IMPLEMENTATION-MAP.md).
- [Kế hoạch triển khai/đối chiếu](V2-IMPLEMENTATION-PLAN.md), [bàn giao test](TEST-HANDOFF.md), [evidence V1 và biên dịch V2.1](TEST-RESULTS.md).
- [Bài hơi nước](examples/steam-explainer/README.md), [bài ô tô](examples/car-explainer/README.md), [Robot](library/characters/MINI-ROBOT.md), [người que](library/characters/STICK-MAN.md).

examples/invention-demo được giữ với content.mode=legacy cho V1; không phải mẫu nghiệm thu host. Renderer HyperFrames 0.8.96, SVG/GSAP và FFmpeg; models/providers từ config/models.yaml. Mock là chế độ offline có giới hạn; muốn đánh giá ngữ nghĩa và hình thật phải cấu hình planner/vision và ghi evidence.
