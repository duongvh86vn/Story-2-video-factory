# Story-to-Video Factory

Biên dịch `source.md` + `narration.srt` / `narration.wav` thành storyboard, scene HyperFrames, bản nháp, contact sheet, review, audio/caption và MP4 cuối. Model chỉ tạo dữ liệu hoặc mã scene; HyperFrames và FFmpeg thực hiện render và xử lý media.

Đặc tả gốc: [BUILD-SPEC.md](BUILD-SPEC.md). Phạm vi triển khai: renderer HyperFrames cho V1; các engine bổ sung được giữ dưới dạng interface. Phần test và xác nhận video thực tế được bàn giao riêng theo yêu cầu của chủ dự án: [TEST-HANDOFF.md](TEST-HANDOFF.md).

## Cài đặt trên Windows

Cần Node.js **22.13+**, Git và FFmpeg/FFprobe trong PATH. Python 3.11+ cần khi dùng WAV/transcription. HyperFrames được pin ở `0.8.96`; GSAP và các asset được lưu cục bộ trong composition.

```powershell
git clone https://github.com/duongvh86vn/Story-2-video-factory.git
cd Story-2-video-factory
npm ci
Copy-Item .env.example .env
npm run build
```

Nếu chỉ có SRT, hệ thống tạo video với subtitle; không tự tạo giọng đọc. Có thể thêm WAV của cùng narration trước khi sản xuất. Audio WAV phải khớp thời lượng SRT trong tolerance cấu hình.

Để xử lý WAV:

```powershell
python -m venv .venv
.\.venv\Scripts\python -m pip install -r scripts/requirements.txt
# Chế độ chính xác hoặc SRT + WAV cần thêm WhisperX:
.\.venv\Scripts\python -m pip install -r scripts/requirements-whisperx.txt
```

Đặt `PYTHON_PATH` hoặc `VIDEO_FACTORY_PYTHON` trong `.env` thành Python của môi trường này. Model ASR có thể tải weights ở lần chạy đầu (`asr.allow_downloads: true`). Đặt tùy chọn này thành `false` để chỉ dùng model/resource đã chuẩn bị cục bộ. CPU/int8 là cấu hình mặc định; GPU là tùy chọn.

## Chạy dự án

```powershell
npm run cli -- new my-video --example
npm run cli -- storyboard projects/my-video
npm run cli -- make projects/my-video
npm run cli -- status projects/my-video
```

Mẫu `--example` có narration SRT 60 giây, câu chuyện hư cấu và ba pose SVG cố định của nhân vật An. Model mặc định là `mock`: planner offline giúp chuẩn bị dự án mà không cần key. Đây không phải vision model; review được ghi rõ là rule-based. Để dùng vision thực, cấu hình provider có khả năng nhận ảnh.

CLI sau build cũng chạy trực tiếp:

```powershell
node dist/apps/cli/index.js make projects/my-video
```

Các lệnh theo công đoạn:

| Lệnh | Điểm dừng |
|---|---|
| `ingest <project>` | Canonical story, narration và timeline |
| `storyboard <project>` | Character bible, chapter, beat, storyboard JSON/Markdown |
| `build-scenes <project>` | Asset, scene và master composition đã qua validator |
| `preview <project>` | HyperFrames preview |
| `render <project> --draft` | Draft và snapshot/contact sheet |
| `review <project>` | Báo cáo review |
| `render <project>` | Final render qua review và xử lý audio/caption |
| `produce`, `make`, `resume <project>` | Đến QC và báo cáo sản xuất |
| `status <project>` | Trạng thái, artifact, job, cost và lỗi |

`make` tự resume từ trạng thái và artifact còn hợp lệ. `--until STORYBOARDED` dừng theo trạng thái; `build-scenes <project> --shot <shot-id>` chỉ build lại shot được chỉ định và master. `--force` vô hiệu hóa planning cache theo input nhưng vẫn tôn trọng khóa. Scene source sửa bằng tay được giữ và được validate lại trước draft.

## Model gateway

Điền URL, key và **model ID thật do provider/gateway của bạn cung cấp** vào `.env`. Không dùng các tên model giả trong ví dụ của đặc tả.

```powershell
Copy-Item config/models.gateway.example.yaml config/models.yaml
```

Mỗi role `planner`, `storyboard`, `coder`, `repair`, `visual_review`, `fallback` có provider và model riêng. Provider hỗ trợ: `gateway`, `openai-compatible`, `deepseek`, `gemini`, `ollama`, `litellm`, `mock`. Provider OpenAI-compatible nhận `base_url` và `api_key_env`; Gemini dùng API native; Ollama có thể không cần key.

```yaml
models:
  planner:
    provider: gemini
    model: YOUR_REAL_GEMINI_MODEL_ID
    api_key_env: GEMINI_API_KEY
    temperature: 0.3
  coder:
    provider: deepseek
    model: YOUR_REAL_DEEPSEEK_MODEL_ID
    api_key_env: DEEPSEEK_API_KEY
    temperature: 0.2
  visual_review:
    provider: gateway
    base_url: "${MODEL_GATEWAY_URL}"
    api_key_env: MODEL_GATEWAY_KEY
    model: "${REVIEW_MODEL}"
    vision: true
```

JSON của model được kiểm tra bằng Zod và domain validator. Lỗi schema gửi feedback cụ thể, rồi retry/fallback có giới hạn. Call journal ghi role, model, hash, token, cost và latency, không ghi key. Điền `input_cost_per_million` / `output_cost_per_million` để tính chi phí; giá bằng 0 mặc định nghĩa là **chưa cấu hình giá**, không chứng minh dịch vụ miễn phí. Giới hạn bằng `workflow.max_model_calls`, `workflow.max_model_cost_usd`, số lần repair và số asset/shot.

## Project, khóa và sửa bằng tay

```text
projects/my-video/
  project.yaml
  input/source.md
  input/narration.srt
  input/narration.wav                 # tùy chọn
  input/assets/{characters,images,video,music,sfx}/
  work/                              # JSON chuẩn hóa, SQLite, attempts
  scenes/<shot-id>/{index.html,scene.js,style.css,scene.json}
  scenes/index.html                  # master composition
  previews/                          # 5 snapshot/shot và contact sheets
  output/                            # kết quả sản xuất
  logs/
  project-state.json
```

Narration là đồng hồ chính. Chapter và beat lấy interval từ segment; shot được phép chia tại các boundary narration/word hợp lệ. Không để model tự thay timestamp. Identity nhân vật, version, costume và pose được quản lý riêng. Asset local được ưu tiên, reference được hash và tái sử dụng. Asset remote phải có nguồn và license, được download trước render.

Video local được chuẩn hóa thành H.264/MP4; ảnh raster thành PNG tĩnh trước khi đưa vào scene. GIF/WebP động dùng khung đầu để giữ tính seekable; chuyển động media nên cung cấp dưới dạng video. PDF/tài liệu văn bản được giữ làm nguồn tham chiếu; recipe dùng hình sơ đồ dựng bằng code. Để hiển thị chính trang tài liệu, cung cấp bản ảnh PNG/JPG của trang đó. Thay tư liệu sẽ resolve lại asset và chỉ dựng lại những scene có hash đầu vào thay đổi.

```powershell
npm run cli -- lock projects/my-video characterBible
npm run cli -- lock projects/my-video SHOT_ID
npm run cli -- lock projects/my-video SHOT_ID --unlock
npm run cli -- approve projects/my-video characters
npm run cli -- approve projects/my-video storyboard
npm run cli -- edit projects/my-video storyboard D:\edited-storyboard.json
```

`project.yaml` có thể bật `workflow.require_storyboard_approval` hoặc `workflow.require_character_approval`. Pipeline dừng ở artifact cần duyệt; sau lệnh `approve`, chạy `resume`. `workflow.automatic: false` cũng yêu cầu duyệt storyboard. Khóa shot giữ cả spec và mã scene, kể cả khi model muốn repair; lỗi trên shot khóa cần thao tác người dùng.

## Web Studio

```powershell
npm run build
npm run studio
# Mở http://127.0.0.1:8787
```

Studio có project/input upload, chapter/shot list, preview, timeline, narration/storyboard/scene editor, khóa/duyệt, job status, log, cost, QC và tải artifact. Server bind localhost; upload và file editing chỉ đi qua project namespace/allowlist. Trong lúc phát triển UI: chạy `npm run studio:dev` ở terminal thứ hai; Vite proxy về server trên port 8787.

## Audio, subtitle và QC

FFmpeg mix voice, nhạc nền local và SFX đặt theo shot, duck nhạc dưới giọng, normalize theo `audio.target_lufs` / `audio.true_peak`. Subtitle: `none`, `burned`, `soft`, `both`. Output SRT sidecar được giữ để dễ tái sử dụng.

QC kiểm tra codec, resolution, fps, duration, audio, black/freeze/silence/clipping. Khoảng đen được cho phép qua `qc.allowed_black`; shot tĩnh chủ ý qua `intentionalStatic`. Final chỉ được sản xuất sau draft review đạt yêu cầu; lỗi high được repair tự động trong giới hạn. Rule-based review không được trình bày như xác nhận mỹ thuật bằng vision.

```text
output/
  final.mp4
  final.srt
  thumbnail.png
  storyboard.json
  storyboard.md
  character-bible.json
  timeline.json
  asset-manifest.json
  qc-report.json
  cost-report.json
  production-report.md
```

## Series và mở rộng

`project.series` trỏ đến thư mục trong `series/`. Series có thể cung cấp `series.yaml`, `series-bible.md`, `character-bible.json` và asset được duyệt. Global → series → episode config được merge; character identity vẫn giữ khóa. Style preset hỗ trợ sáu phong cách, với episode overrides.

Interface model, asset/image/video provider và video engine tách riêng. V1 tích hợp HyperFrames, không fork renderer hoặc implement Remotion/Manim/Motion Canvas cùng lúc. Có thể thêm provider asset và renderer qua interface, giữ nguyên storyboard và pipeline.

Research mặc định tắt. Nếu bật, danh sách URL HTTPS chỉ định được lưu vào `work/research.json` và production report; dữ kiện mới vẫn cần đưa vào canonical source, không tự biến một trang web thành sự thật trong storyboard.

Benchmark là công cụ opt-in, không chạy trong build:

```powershell
npm run benchmark -- --count 20 --config config/models.gateway.example.yaml
npm run benchmark -- --count 20 --full
npm run benchmark -- --count 20 --generated --config config/models.gateway.example.yaml
```

Các phép đo chưa chạy được ghi `null`, không tính như đạt. Việc đánh giá chất lượng, lỗi có chủ ý và chạy toàn bộ acceptance suite nằm trong bàn giao test.

## Generated scene isolation

Scene được validate theo file allowlist, CSP, local asset và deterministic GSAP. Renderer subprocess không kế thừa key model. Production có thể bật `rendering.docker: true` để dùng sandbox renderer của upstream. Một validator source không thay thế sandbox hệ điều hành khi chạy mã không tin cậy.

Dependencies được tích hợp từ upstream thay vì sao chép lõi renderer: [HyperFrames](https://github.com/heygen-com/hyperframes), [FFmpeg](https://ffmpeg.org/), [faster-whisper](https://github.com/SYSTRAN/faster-whisper), [WhisperX](https://github.com/m-bain/whisperX). Giữ các điều khoản license của dependency khi phân phối.
