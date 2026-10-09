# Story-to-Video Factory — diễn viên trong câu chuyện

**Cập nhật source0.82:** [Kiểm tra cảnh trên nguồn gốc](docs/topics/ORIGINAL-SOURCE-AUDIT-HANDOFF.md). Studio/API có báo cáo chỉ đọc theo cảnh và actual diễn viên, full context/acting/source/camera, raw revision receipts; không tự duyệt hoặc mở final. Producer2.2.45; 10 callbacks mới NOT RUN; runtime/art/motion/toàn sản phẩm vẫn chờ model test. Các mốc cũ bên dưới là lịch sử.

**Hiện hành0.43 — 08/10/2026, source candidate:** thêm `npm run tracer:native-seat` xuất scene/master và tùy chọn ảnh/video draft60fps cho ca hai diễn viên ngồi–đứng–đi, dùng cùng canonical với test và không bootstrap sơ đồ máy móc. Cue SRT diagnostic im lặng mặc định; WAV tùy chọn giữ bytes/clock và vẫn cần kiểm nội dung/speaker. Scene guard nhận viền SVG hở bounded, cache security4. Builder/test/tracer/browser/media chưa chạy; productionReady=false/productionRig=null, không final/DONE hoặc nghiệm thu độ mượt. [Cách chạy và artifact](docs/topics/NATIVE-SEAT-TRACER.md).

Chủ đề tiền sử 0.20: tách cuff/cổ tay khỏi palm/grip, migrate chain theo landmark nguồn, giữ contact và nối mitten theo cẳng tay. Sửa preset frontal hết reach, khai báo pole/offset rõ và painter slot discrete; bổ sung kiểm shaft khi nội suy. DOM tĩnh có 144 ô: 138 SVG, sáu head-turn bị chặn. Không chứng minh video mượt; grasp, pose/secondary motion và runtime còn thiếu. `productionReady=false`. [Source, evidence và lệnh server/test](docs/topics/WRIST-PALM-IMPLEMENTATION.md).

> Contract hiện hành ngày 04/10/2026: [STORY-ACTOR-DIRECTION.md](STORY-ACTOR-DIRECTION.md). Người que là diễn viên đóng vai trong câu chuyện; bỏ yêu cầu một người dẫn cố định, quota xuất hiện và kích thước bắt buộc. Nhánh chủ đề/câu chuyện tạo kịch bản trước ba luồng nguyên văn. Director2.2.31/animation2.2.14 đang nghiệm thu; evidence presenter cũ không chứng minh chế độ mới đạt.

Nhập **chủ đề/câu chuyện → tạo kịch bản → phân vai → dựng video**. Người que hoặc robot là diễn viên trong nội dung: đời thường, hư cấu, văn hóa, lịch sử, khoa học hay giải thích. Máy hơi nước và ô tô chỉ là ví dụ kiểm tra. Kịch bản hoàn chỉnh, WAV và SRT vẫn có nhánh đọc nguyên văn; voiceover độc lập diễn viên.

Studio có tab **Chủ đề / Câu chuyện**, model viết kịch bản, nút **Chỉ tạo kịch bản để xem trước** và **Tạo video**. Có thể đưa kịch bản AI sang tab Kịch bản để sửa và dùng nguyên văn. [Hướng dẫn luồng tổng quát](docs/GENERAL-STORY-TOOL.md). Source mới đang kiểm tra độc lập; video mẫu đã dựng không chứng nhận tool tổng quát hay chất lượng mục tiêu đã đạt.

**Director2.2.31/animation2.2.14 đang nghiệm thu.** Dự án mới mặc định trống, story-cinematic, character_mode=actors và người que. Ví dụ máy hơi nước là lựa chọn riêng, không chọn sẵn. Dự án cũ giữ chế độ tương thích; chuyển sang actors cần replan hình. Đọc [đặc tả diễn viên](STORY-ACTOR-DIRECTION.md), [kế hoạch](V2-IMPLEMENTATION-PLAN.md) và [trạng thái](IMPLEMENTATION-STATUS.md). Build và QC không chứng minh chất lượng video.

[STORY-TO-VIDEO-FACTORY.md](STORY-TO-VIDEO-FACTORY.md) là bản đặc tả hợp nhất hiện hành trong worktree, dùng mô hình diễn viên trong câu chuyện. Bản này giữ toàn bộ contract narration, diễn viên và TTS bên ngoài; [audit hoàn thành](docs/validation/2026-10-03-completion-audit.md) liệt kê riêng bằng chứng đã có và yêu cầu còn mở.

Checkpoint06/10: source-context494PASS/0FAIL/2SKIP và corrected contact229PASS/0FAIL/1SKIP trên code443220f; custom-handle temporal/outbound và phim còn chờ. Ca sinh nhật gốc28/28/0, còn2/30calls, chưa video mới. Chủ dự án giao model test khác; [bàn giao để gửi model test](docs/NEXT-MODEL-TEST-HANDOFF.md), [phạm vi evidence](docs/validation/2026-10-06-sourced-world-contact.md).

Lịch sử **Cuộc sống thời tiền sử 0.18** thêm artwork 3/4/profile qua 9router và kiểm silhouette cả cặp tay giáo, giữ bones/contact thật. Bản mới bỏ coils trước ngực; vẫn là low frontal hold, chưa phải lunge. Artwork mới chưa đăng ký/duyệt; xem [góc thân/đầu](docs/topics/AUTHORED-VIEWS.md). Think giữ ink/hand trước cằm; run chỉ tác động khi clip đang hoạt động. Có bảng rà soát hai tay 138 ô tĩnh, gồm sáu head-turn báo thiếu artwork; ảnh tĩnh không chứng minh video đạt. Body giữ happy trên cutout cùng cổ/thân, bỏ mesh yaw làm lệch mặt. Profile, partner head views, lunge toàn thân, grip/shaft story binding và ba luồng vẫn còn thiếu/nghiệm thu; `productionReady=false` chặn topic trước model/TTS. [Sửa tay, bằng chứng và việc còn thiếu](docs/topics/ARM-POSE-REPAIR.md), [Pose AI và tool](docs/topics/AI-POSE-WORKFLOW.md), [đặc tả](docs/topics/CUOC-SONG-THOI-TIEN-SU.md), [bàn giao](docs/topics/PREHISTORIC-IMPLEMENTATION-HANDOFF.md).

## Bắt đầu

Cần Node >=22.13, FFmpeg/FFprobe; WAV cần Python và ASR; WAV+SRT cần WhisperX/forced alignment. Script/SRT cần TTS hỗ trợ ngôn ngữ lời kể đã chọn. Không có TTS: script dừng trước timeline; SRT chỉ có nháp im lặng, không final.

```powershell
npm ci
npm run build
npm run studio
```

Mở địa chỉ Studio do server in ra (mặc định http://127.0.0.1:8787). Tạo project; form **Nội dung, diễn viên và giọng kể** tự mở. Chọn tab **Chủ đề / Câu chuyện, Kịch bản, WAV hoặc SRT**, chọn tạo hình/giọng và **Tạo video**. Nhánh chủ đề cần model writer thật; nhánh Kịch bản đọc đúng lời bạn đưa. Rig MD riêng cần duyệt preview một lần; vai do director phân từ nội dung có preview riêng, không bắt buộc duyệt từng vai. [Input tổng quát](examples/general-stories/README.md) là dữ liệu cho tool tự dàn cảnh, không phải video authored.

Project mới trong Studio mặc định chọn `story-cinematic`. Trong **Model thiết kế cảnh**, chọn dịch vụ/model đang dùng; Codex CLI có thể chọn `default` với tài khoản đã đăng nhập, Claude CLI cần model và credit khả dụng. Có thể ghi ý tưởng hình ảnh tùy chọn, để model tự chọn thiết kế, dàn cảnh và nhịp diễn. Cấu hình phát hành sẵn dùng mock để mở ngoại tuyến; đây là bản phác thảo theo quy tắc. Muốn model thiết kế video, cấu hình role `storyboard` theo [OPEN-ART-DIRECTION.md](OPEN-ART-DIRECTION.md). Một lời gọi model thành công hoặc QC qua chưa chứng minh chất lượng toàn bài.

Giọng mặc định lưu từ Studio hoặc sao chép config/voice.example.yaml sang config/voice.yaml. Windows Speech phải có voice đúng language; không tự chuyển giọng Việt sang tiếng Anh. HTTP/command cần adapter theo contract trong BUILD-SPEC.md; HTTP không mặc nhiên tương thích mọi dịch vụ TTS. Keys đặt trong .env/environment, không commit.

Studio có ngôn ngữ narration **English / Việt / Nhật / Hàn**, preset giọng riêng và catalog Windows. TTS bên ngoài hỗ trợ **OmniVoice Studio/VoiceStudio local**, server tương thích `/v1/audio/speech`, HTTP JSON API riêng có field mapping và command. Nhập endpoint/model/voice rồi dùng cùng luồng Tạo video. [Cấu hình và contract TTS bên ngoài](docs/EXTERNAL-TTS.md) ghi rõ phần cần backend/credentials thật để nghiệm thu.

Sau khi lỗi dịch vụ model đã được giải quyết, Studio có **Thử lại yêu cầu model đã lỗi**; CLI dùng `resume <project> --retry-model-errors`. Lần gọi mới giữ lịch sử và vẫn tính vào giới hạn tổng; bấm Tạo video thông thường không xóa budget lỗi. [Contract và phạm vi nghiệm thu](docs/validation/2026-10-03-explicit-model-retry.md).

Codex CLI ghi counters/category lỗi tại `logs/model-cli-diagnostics.jsonl`, giúp phân biệt tiến độ trước timeout và lỗi account/configuration đã nhận diện. Log diagnostics không chứa lời kể, nội dung model hoặc key; lỗi không rõ giữ nhãn unknown. [Phạm vi mới và test còn chờ](docs/validation/2026-10-03-cli-diagnostics.md).

Giọng Việt local có thể cài bằng `python scripts/setup-piper.py`; script cài phiên bản Piper cố định, kiểm tra checksum model và giữ cấu hình giọng đã có. Dùng `--replace-default` để chọn Piper làm mặc định, cấu hình cũ được sao lưu. Model/card nằm trong runtime/tts/models; đọc attribution và giấy phép dataset trong MODEL_CARD. Thư mục runtime và config/voice.yaml là dữ liệu riêng từng máy.

ASR/alignment: tạo venv Python và cài `scripts/requirements.txt` hoặc `scripts/requirements-whisperx.txt`. Đặt `VIDEO_FACTORY_PYTHON` trỏ tới Python của venv; alignment Việt có thể chọn `VIDEO_FACTORY_ALIGN_MODEL=nguyenvulebinh/wav2vec2-base-vi-vlsp2020`. Xem packages/ingest/README.md để provision model cache trước khi chạy offline; pipeline không coi thiếu model là kết quả đạt.

## CLI

Ví dụ chính là một project trống nhận **chủ đề hoặc câu chuyện của bạn**. Các
lệnh dưới đây chọn English; đổi ngôn ngữ và provider/voice theo nội dung và
dịch vụ bạn có. Cấu hình `models.storyboard` cho model thiết kế cảnh trong
Studio hoặc project.yaml trước khi tạo video; model writer và director có thể khác nhau.

```powershell
npm run cli -- new my-story
npm run cli -- idea projects/my-story C:/input/my-story.txt
npm run cli -- authoring projects/my-story --provider codex-cli --model default --kind auto --seconds 60 --timeout 900
npm run cli -- configure projects/my-story --language en --input idea --host stick-man --style story-cinematic --characters actors --tts windows-speech
npm run cli -- write-script projects/my-story
```

`write-script` cho phép xem lời kể trước TTS. Sau khi nguồn và model/giọng đã
cấu hình, chạy tiếp tới video; có thể gọi `make` trực tiếp để tool tự tạo
kịch bản và chạy toàn luồng.

```powershell
npm run cli -- make projects/my-story
npm run cli -- status projects/my-story
npm run cli -- resume projects/my-story
```

Nếu đã có lời kể hoàn chỉnh, dùng `npm run cli -- script projects/my-story C:/input/narration.md`;
tool đọc nguyên văn thay vì gọi writer. Chọn `--input wav` hoặc `--input srt`
để dùng nguồn audio/phụ đề; WAV+SRT dùng mode wav. TTS local/API được cấu hình
theo [EXTERNAL-TTS.md](docs/EXTERNAL-TTS.md).

Chọn `--host mini-robot` để đổi kiểu tạo hình, hoặc nhập input/host.md và chọn
`--host custom`. Custom rig cần `npm run cli -- approve projects/my-story host`
sau khi xem previews/host-preview-sheet.png. Rebuild một shot:
`npm run cli -- resume projects/my-story --shot ch01.s001` (dùng ID thực từ storyboard).

Bài máy hơi nước chỉ là ví dụ tùy chọn: `npm run cli -- new steam --example`.
Lệnh đó không xác định chủ đề, vai diễn hoặc thiết kế cho project thông thường.
## Quy tắc

- Script tạo TTS từng đoạn <=120 ký tự, giữ từ/thứ tự, đo duration thật, nghỉ 250 ms giữa đoạn văn. Một đoạn audio là một cue.
- WAV giữ audio input; SRT companion giữ text/clock và kiểm tra khớp. SRT-only fit TTS mặc định 0.85–1.20 giữ pitch; không cắt lời hoặc sửa timestamp.
- source.md chỉ bổ trợ; input.mode quyết định nguồn chính, không tự chuyển file khi có nhiều loại input. Markdown được coi là dữ liệu.
- Mỗi vai giữ identity/rig riêng. Có thể có nhiều vai và cảnh cơ cấu không có người dẫn. Tám ý đồ giải thích phục vụ nội dung; target/gaze/contact đúng. Voiceover không làm mọi nhân vật nói; speech activity không phải phoneme lip-sync.
- Đổi host giữ audio; sửa script/giọng rebuild narration và phần phụ thuộc. Lock mâu thuẫn nội dung mới cần sửa/unlock.
- Final cần giọng ready, review/gate hợp lệ; QC fail không DONE. Rule review có giới hạn, chưa là xác nhận kiến thức hoặc thẩm mỹ. Yêu cầu vision thật bằng workflow.allow_rule_based_review=false.

MP4 có audio, SRT, thumbnail, storyboard, actor-cast/actor-timeline, narration/timeline/activity, manifest và production/QC reports nằm trong output/. Tạo hình/preview từng vai ở assets/actors; host profile/timeline là dữ liệu tương thích của rig nền. Artifact cũ giữ để truy vết; Studio ẩn final khi project bị invalidated.

Soft subtitles lưu UTF-8 và clock nguyên văn bằng track riêng rồi stream-copy, kiểm tra trực tiếp samples sau mux; SRT xuất riêng từ narration. [Contract phụ đề](docs/LITERAL-SUBTITLES.md) và [phạm vi26/26 kiểm tra độc lập](docs/validation/2026-10-02-literal-subtitles.md) phân biệt stored text với extraction của FFmpeg vẫn có biến đổi whitespace.

Director21, animation7 và artwork4 đã qua build. Audit độc lập **145/145** cho tay/khớp/GSAP, cast, Studio API, khóa vai, resume và export; [evidence sửa tay](docs/validation/2026-10-02-outward-elbows.md). Full suite sau sửa **403/403 PASS**, test:typecheck0; [báo cáo](docs/validation/2026-10-02-release-regressions.md) giữ lịch sử378/386 FAIL8 và các phần chưa kiểm tra. Đây vẫn là nhánh triển khai; chưa tuyên bố sản phẩm hoàn thành hoặc chất lượng toàn bài đạt.

[Review ảnh qua Codex CLI](docs/CODEX-IMAGE-REVIEW.md) là tùy chọn cho model vision: xem contact/action sheets và đối chiếu identity từng vai. Bản vá đã build; nghiệm thu runtime/native còn chờ model test. Không tự bật cho các project hiện có.

## Tài liệu và mẫu

- [Đặc tả sản phẩm V2.2 và ba luồng](BUILD-SPEC.md), [vai diễn và diễn xuất](STORY-ACTOR-DIRECTION.md), [trạng thái](IMPLEMENTATION-STATUS.md), [bản đồ code](IMPLEMENTATION-MAP.md).
- [Kế hoạch triển khai/đối chiếu](V2-IMPLEMENTATION-PLAN.md), [bàn giao test](TEST-HANDOFF.md), [evidence V1 và biên dịch V2.1](TEST-RESULTS.md).
- [Bài hơi nước](examples/steam-explainer/README.md), [bài ô tô](examples/car-explainer/README.md), [Robot](library/characters/MINI-ROBOT.md), [người que](library/characters/STICK-MAN.md).

examples/invention-demo được giữ với content.mode=legacy cho V1; không phải mẫu nghiệm thu host. Renderer HyperFrames 0.8.96, SVG/GSAP và FFmpeg; models/providers từ config/models.yaml. Mock là chế độ offline có giới hạn; muốn đánh giá ngữ nghĩa và hình thật phải cấu hình planner/vision và ghi evidence.
