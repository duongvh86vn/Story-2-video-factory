# STORY-TO-VIDEO FACTORY — NHÂN VẬT DẪN CHUYỆN GIẢI THÍCH

**Đặc tả sản phẩm V2 — 2026-10-01**

**Mục tiêu:** nhận câu chuyện giải thích/mô tả/kể lại sự vật, sự việc dưới dạng WAV hoặc SRT; dựng một robot mini hoặc người que từ hồ sơ Markdown; để nhân vật đó kể và minh họa câu chuyện bằng hoạt hình.

Ví dụ đầu vào: “Hệ thống hơi nước ra đời như thế nào?”, “Quá trình phát triển ô tô như thế nào?”, “Một cơ cấu hoạt động ra sao?”, “Một quy trình diễn ra như thế nào?”.

Tài liệu này thay định hướng V1. Nội dung là yêu cầu cho lần sửa hệ thống tiếp theo, không phải tuyên bố code hiện tại đã hỗ trợ V2. Xem `IMPLEMENTATION-STATUS.md` để biết khoảng cách triển khai. Bản V1 được giữ ở `docs/archive/STORY-TO-VIDEO-FACTORY.v1.md` trong repository để tra cứu kỹ thuật cũ.

## 1. Trải nghiệm cần tạo ra

Người dùng đưa narration WAV/SRT và chọn host. Hệ thống dựng hoạt hình giải thích có nhân vật dẫn chuyện cố định, sơ đồ/mô hình/timeline phù hợp nội dung và giọng kể bám đúng đầu vào.

```text
WAV / SRT của người dùng
          +
MD mô tả robot mini / người que
          ↓
Hiểu điều đang được giải thích và giữ narration clock
          ↓
Dựng một host có rig cố định
          ↓
Chia lời kể thành chapter → beat → cảnh giải thích
          ↓
Host chỉ dẫn / thao tác + minh họa cơ chế / quy trình / tiến trình
          ↓
Draft → review nội dung, host, tương tác, đồng bộ → sửa
          ↓
MP4 có host kể chuyện, audio, subtitle và QC
```

Một cảnh đúng: robot đứng cạnh mô hình, hướng mắt và tay vào chi tiết đang được nhắc tới; chi tiết đó chuyển động hoặc được làm rõ đúng lúc lời kể giải thích nó.

Một cảnh chưa đạt: hình chân dung đứng yên kèm một đoạn chữ; ảnh lịch sử trôi trên màn hình; một host nhỏ như logo không tham gia giải thích; chuyển cảnh và hiệu ứng đẹp nhưng không diễn tả nội dung narration.

## 2. Đầu vào và quyền quyết định nội dung

### 2.1 Đầu vào tối thiểu

| Đầu vào | Bắt buộc | Ý nghĩa |
|---|---|---|
| `input/narration.wav` hoặc `input/narration.srt` | Có, ít nhất một | Lời kể và clock chính |
| Host profile MD | Có, hệ thống cung cấp sẵn mặc định | Thiết kế và hành vi của nhân vật dẫn chuyện |
| `input/source.md` | Không | Chủ đề, mục tiêu, kiến thức bổ trợ, yêu cầu riêng |
| Assets người dùng | Không | Ảnh tư liệu, logo, hình sản phẩm, diagram, BGM/SFX có nguồn |

Không bắt người dùng viết thêm một câu chuyện hư cấu hoặc một character bible phức tạp. Nếu chưa có `source.md`, hệ thống tạo canonical story từ transcript/cue text và lưu bản phân tích để review. Không có MD nội dung bổ trợ vẫn phải chuẩn bị được video từ narration.

Hai hồ sơ host cung cấp sẵn:

- [Robot mini](library/characters/MINI-ROBOT.md): lựa chọn mặc định.
- [Người que](library/characters/STICK-MAN.md): lựa chọn thay thế.

Người dùng có thể dùng profile MD riêng hoặc sửa profile sẵn. Một video dùng một host chính. Đổi host là lựa chọn ở project/series, không do model tự quyết ở từng shot.

### 2.2 Ưu tiên nguồn

1. WAV người dùng cung cấp quyết định giọng/audio thật; SRT đi cùng quyết định nguyên văn cue và cue timing sau khi được kiểm tra khớp audio.
2. SRT-only quyết định cue text và cue clock. WAV-only được ASR thành transcript và timeline, không tự viết lại lời kể.
3. `source.md`/tư liệu bổ trợ chỉ giúp diễn giải và thiết kế hình, không tự thay lời kể hoặc kéo dài video.
4. Host MD quyết định nhận dạng/rig/hành vi; không cung cấp dữ kiện về lịch sử hay cơ chế ngoài narration.

Nếu WAV/SRT/source mâu thuẫn đáng kể, ghi issue và yêu cầu sửa/chọn nguồn trước khi final; không âm thầm chọn một câu chuyện khác. Chỉ bôi sáng/chuyển động những quan hệ có trong nguồn, hoặc sơ đồ hóa chúng với provenance `visualization`.

Giữ riêng `fact`, `interpretation`, `visualization`. Không tự thêm người phát minh, ngày tháng, hãng xe, thông số máy hoặc quan hệ nhân quả chưa có nguồn. Host là hư cấu phục vụ trình bày và không được gắn vai trò lịch sử của người được nhắc tới.

## 3. Giọng kể và clock

### WAV-only

- Probe audio, ASR bằng backend được cấu hình; giữ nguyên file giọng của người dùng.
- Lưu segment, word timing có evidence và mức confidence thực tế.
- Thời lượng master theo audio probe, gồm leading silence, khoảng nghỉ và tail.
- Không đổi giọng, dựng thêm lời thoại hoặc tự rút ngắn nội dung để khớp recipe.

### WAV + SRT

- Giữ cue ID, text, start/end của SRT; đối chiếu/align với WAV.
- Word timing chỉ là lớp bổ sung, không thay clock gốc.
- Mismatch vượt tolerance phải được báo rõ; không dịch timestamp hoặc đổi tốc độ WAV người dùng để che lỗi.

### SRT-only

- Final có nhân vật **kể bằng giọng nói**: cần một TTS provider/voice được cấu hình, hoặc WAV tương ứng do người dùng bổ sung.
- TTS dùng đúng nguyên văn từng cue, không đổi ý, bỏ từ hay thêm câu chào/kết ngoài SRT.
- Dựng audio theo cue clock; khoảng trống giữ thành khoảng nghỉ. Fit tốc độ trong giới hạn cấu hình và giữ pitch; nếu cue quá ngắn, báo không fit được thay vì sửa timestamp.
- Khi thiếu TTS/WAV, vẫn cho lập storyboard/render nháp im lặng để review hình. Gắn rõ `silent-draft`/`needs-voice`; không coi đó là sản phẩm cuối đạt yêu cầu kể chuyện.
- TTS là module tùy cấu hình, không giả định người dùng đã có một dịch vụ hoặc voice ID cụ thể.

Nhân vật dùng giọng của narration. Cử động miệng theo speech activity đo từ audio và cử chỉ theo ý nghĩa đoạn kể. V2 đầu có thể đồng bộ ở mức segment/word; phải ghi đúng mức đồng bộ, không tuyên bố phoneme lip-sync nếu chưa có dữ liệu đó. Miệng đóng trong khoảng nghỉ, kể cả khi nhân vật vẫn giữ pose chỉ dẫn.

## 4. Dựng host từ file MD

Host cần được dựng thành nhân vật hoạt hình có thể điều khiển. Một MD ghi “robot dễ thương” hoặc một ảnh chân dung cố định chưa đủ để coi là đã dựng host.

```text
profile.md
    ↓
HostProfile JSON có schema
    ↓
SVG rig / part IDs / joint pivots / pose library
    ↓
Host preview sheet → duyệt một lần
    ↓
Host asset/rig đã khóa và có hash
    ↓
Mọi scene tái sử dụng cùng rig
```

V2 ưu tiên vector 2D/SVG để robot/người que giữ nhận dạng và diễn xuất rõ. Model hỗ trợ đọc MD thành dữ liệu, nhưng renderer/controller dựng và seek animation theo clock. Không sinh lại hình nhân vật ở mỗi shot.

Host profile phải mô tả:

- ID, version, loại host, vai trò dẫn chuyện.
- Hình đầu/thân/mặt, tỷ lệ, màu, đường nét và điểm nhận dạng bất biến.
- Bộ phận rig, vị trí khớp, action/pose ID và biến đổi được phép.
- Biểu cảm, miệng, hướng nhìn, pointer/prop và quy tắc tương tác.
- Cách dùng giọng, đồng bộ, bố cục và điều kiện duyệt.

Host compiler phải xuất ít nhất:

```text
work/host-profile.json
work/host-rig.json
assets/host/<profile-id>/<version>/host.svg
assets/host/<profile-id>/<version>/poses.json
previews/host-preview-sheet.png
```

Hồ sơ/rig đã duyệt được khóa. Cache theo profile hash, compiler version và style phù hợp; đổi host/profile thì invalidate các cảnh liên quan. Không đánh đồng host với nhân vật/sự vật được narration nói đến. Canonical model tách `host` khỏi `subjectActors`/`illustratedEntities`.

## 5. Ngôn ngữ hình ảnh của video giải thích

Mỗi beat phải trả lời: **người xem cần hiểu điều gì, và hình/chuyển động nào làm điều đó rõ hơn?**

| Loại nội dung | Hình chính | Vai trò host |
|---|---|---|
| Cơ chế hoạt động | Part diagram, cutaway, lực/dòng/chuyển động theo nguồn | Chỉ đúng part, thao tác với mô hình, hướng mắt theo diễn biến |
| Một quy trình | Các bước, vật liệu/trạng thái đi qua từng bước | Chỉ bước hiện tại, chuyển sang bước kế khi narration chuyển |
| Quá trình ra đời/phát triển | Timeline có mốc và hình/đối tượng được nguồn nhắc tới | Đi/chỉ tới mốc, giải thích thay đổi giữa các giai đoạn |
| So sánh/cải tiến | Hai trạng thái hoặc hai phương án cùng tiêu chí | Chỉ từng phía, làm rõ điểm khác biệt |
| Mô tả cấu tạo | Sơ đồ phân lớp, tách các part có tên | Chỉ/tách part, giữ nhãn gọn |
| Kể lại sự kiện | Không gian, đối tượng và chuỗi diễn biến từ narration | Dẫn người xem qua các bước; host vẫn là người kể ngoài sự kiện |

Ưu tiên nền đơn giản, đối tượng vector, nhãn ngắn và motion có mục đích. Tư liệu thật được dùng khi giúp xác định đúng đối tượng/mốc; không trở thành chuỗi ảnh thay cho cảnh giải thích.

Không lấy nguyên `visualDescription`, prompt hoặc đoạn narration dài làm chữ trên màn hình. Text on screen chỉ là tên bộ phận, mốc, nhãn, con số có nguồn hoặc ý ngắn; phụ đề đảm nhiệm lời kể đầy đủ.

Không giả lập hình ảnh “chính xác kỹ thuật” nếu chỉ là mô hình khái niệm. Giữ sơ đồ đơn giản nhưng quan hệ nối/lực/hướng/trình tự phải đúng với narration và evidence có sẵn.

## 6. Host phải tham gia vào câu chuyện

- Mặc định host hiện trong mỗi cảnh, ở cạnh vùng minh họa hoặc ô host khi zoom detail.
- Có thể tạm vắng mặt ở close-up cơ chế, tối đa 6 giây liên tiếp theo storyboard mặc định. Host hiện ở mở đầu, các phần giới thiệu chapter và tổng kết.
- Mục tiêu mặc định: nhìn thấy host ít nhất 70% thời gian có speech. Tỷ lệ này đo trên host timeline, không tính một logo/ảnh host bất động làm hành động dẫn chuyện.
- Mỗi beat giải thích có ít nhất một hành động có ý nghĩa: point, explain, operate-model, compare, walk-to-marker hoặc summarize. Idle, chớp mắt và mouth loop không tính là hành động đó.
- Narration nhắc part/mốc/bước nào thì host nhìn/chỉ đúng target đó trong cửa sổ thời gian tương ứng.
- Thao tác phải có tiếp xúc trước khi mô hình phản ứng; không diễn hoạt ngẫu nhiên để làm cảnh có vẻ sống động.
- Giữ một host ID/profile version/rig hash trong cả tập và trong series được chọn.

Người dùng có thể thay mục tiêu hiện diện khi duyệt storyboard. Planner không tự hạ mức này để xử lý thiếu asset hoặc recipe.

## 7. Bố cục và diễn xuất

Vùng bố cục điển hình: host 25–40% chiều cao khung hình ở một bên; mô hình/sơ đồ ở vùng còn lại; phụ đề ở phía dưới. Layout đổi theo nội dung và camera, không giữ một chân dung lớn che cả mô hình.

Yêu cầu:

- Chừa vùng caption phía dưới và margin an toàn; chữ/nhãn/host không che nhau.
- Host nhìn rõ mặt và hướng tay ở kích thước xem thông thường.
- Khi pointer target di chuyển hoặc camera zoom, đầu pointer vẫn bám anchor của target, không dùng tọa độ cứng khiến chỉ sai sau layout đổi.
- Cảnh cơ chế phải nhìn thấy part đang chuyển động; nhãn khớp với part.
- Chuyển cảnh giữ host identity, hướng không gian và nội dung; không tự thay pose/style/nhân vật.
- Motion diễn tả sự kiện trong narration. Nhịp và độ dài cảnh theo ý nghĩa, không ép đổi recipe ở mỗi đoạn vì mục tiêu đa dạng mỹ thuật.

## 8. Phân tích narration và intermediate representation

Phân tích phải tạo:

1. Canonical transcript/story và nguồn của từng nội dung.
2. Các chapter theo phần giải thích; beat theo câu hỏi, cơ chế, bước, mốc, so sánh hoặc kết luận.
3. Các đối tượng/part và quan hệ cần minh họa; không tạo nhân vật lịch sử chỉ vì cần “main character”.
4. Host action plan theo từng beat và cue/word anchor.
5. Storyboard có visualization plan, host plan và nguồn nội dung riêng.

Beat phải có `explanationGoal`, `narrationSegmentIds`, `sourceRefs`, `entities`, `relations`, `visualMethod` và `hostIntent`. Timeline math do ứng dụng tính/validate; model không tự bịa timestamp.

Shot schema mục tiêu bổ sung các nhóm sau vào schema V1:

```json
{
  "id": "ch001.s002",
  "startMs": 6000,
  "endMs": 10000,
  "narrationSegmentIds": ["seg002"],
  "explanationGoal": "Cho thấy bộ phận được lời kể nhắc tới chuyển động",
  "sourceRefs": [{"kind": "narration", "segmentId": "seg002"}],
  "visualization": {
    "type": "mechanism",
    "modelId": "mechanism-01",
    "partIds": ["piston"],
    "events": [{"type": "part-motion", "targetId": "piston", "narrationAnchor": "seg002"}],
    "provenance": "visualization"
  },
  "host": {
    "id": "mini-robot-01",
    "profileVersion": 1,
    "presence": "beside-model",
    "actions": [
      {"type": "point", "startMs": 6000, "endMs": 7400, "target": {"modelId": "mechanism-01", "partId": "piston", "anchor": "center"}},
      {"type": "explain", "startMs": 7400, "endMs": 10000}
    ]
  },
  "textOnScreen": "Pít-tông",
  "captionRegion": "bottom-safe",
  "recipeId": "host-mechanism-explainer"
}
```

Đây là ví dụ cấu trúc cho một shot, không phải dữ kiện/cue thật của một bài cụ thể. Các field trên là yêu cầu V2 chưa có đầy đủ trong code hiện tại. Validator phải kiểm tra narration/source/target thật; không nhận một chuỗi `visualDescription` chung chung để thay cho interaction plan.

Host action/event dùng global clock. Word/segment anchor được ứng dụng resolve thành timestamp hợp lệ; action nằm trong shot và gắn đúng đối tượng. Storyboard phải cover toàn bộ narration, kể cả khoảng nghỉ, không có gap/overlap.

## 9. Scene factory và recipe mới

Thư viện chính của V2:

| Recipe ID mục tiêu | Nội dung |
|---|---|
| `host-introduce-question` | Host và câu hỏi/đối tượng mở bài từ narration |
| `host-mechanism-explainer` | Host, part diagram, chuyển động cơ cấu và pointer anchors |
| `host-process-steps` | Host và quy trình nhiều bước |
| `host-evolution-timeline` | Host, timeline, các thay đổi có nguồn |
| `host-before-after` | Host giải thích hai trạng thái/cải tiến |
| `host-part-breakdown` | Host và mô hình tách part |
| `host-event-sequence` | Host dẫn qua chuỗi sự kiện/không gian |
| `host-summary` | Host và các ý đã được kể để kết bài |

Recipe nhận host rig + visualization model + interaction timeline, không tự tạo identity. Diagram/model phải có part IDs và anchors; host controller biết cách nhìn/chỉ/thao tác trên chúng.

Recipe V1 như map, newspaper, portrait, patent có thể làm vật liệu phụ khi đúng nguồn; không dùng chúng để thay cho host hoặc diễn giải cơ chế.

Fallback đúng: giữ host đã duyệt, giảm minh họa xuống vài part/mũi tên/bước nhưng vẫn diễn tả quan hệ chính. Fallback sai: đổi thành chân dung, slideshow, đoạn text dài hoặc bỏ host. Nếu không thể dựng một minh họa trung thực, giữ draft/report và báo cần sửa; không đánh dấu final pass bằng một cảnh trang trí không giải thích được ý.

## 10. Renderer và module

Giữ renderer HyperFrames trong lượt triển khai này, deterministic timeline/GSAP, SVG cục bộ và FFmpeg cho audio/caption/mux/QC. Không cần xây thêm engine để đổi đúng ngôn ngữ sản phẩm.

Các trách nhiệm bổ sung:

| Module mục tiêu | Trách nhiệm |
|---|---|
| Narration ingest | WAV/SRT là đầu vào chính, source MD tùy chọn |
| Host profile compiler | Đọc MD → schema → rig/pose library |
| Host controller | Pose, gaze, gesture, speech activity và seek theo clock |
| Explainer planner | Goals, đối tượng/part, quan hệ, chapter/beat |
| Visualization builder | Mechanism/process/timeline/compare với anchor ổn định |
| Interaction planner/compiler | Resolve pointer/contact/event từ narration anchors |
| Voice resolver | WAV người dùng hoặc TTS được cấu hình cho SRT-only |
| Semantic/visual reviewer | Nội dung hình, host identity, đúng target, speech/gesture/caption |

Model chỉ trả structured data/source trong contract. Orchestrator validate, ghi artifact, chạy renderer, đọc lỗi và retry có giới hạn. Dùng provider/model ID từ config, không hard-code tên model giả. Không giao việc giữ character identity hoặc timestamp arithmetic cho lời hứa trong prompt.

Giữ các nền tảng V1: persisted checkpoints/SQLite, artifact hashes, locked manual edits, local assets/provenance, schema validation, CSP/scene allowlist, sandbox renderer khi có, secret redaction, model budgets, attempt journals và bounded repair. Khi profile/voice/diagram/interaction plan đổi, phải invalidate đúng artifacts phụ thuộc.

## 11. Project và artifacts mục tiêu

```text
projects/steam-explainer/
  project.yaml
  input/
    narration.wav        # ít nhất WAV hoặc SRT
    narration.srt
    source.md            # tùy chọn
    host.md              # tùy chọn, thay cho profile mặc định
    assets/
  work/
    narration.json
    timeline.json
    story.json
    host-profile.json
    host-rig.json
    explanation-plan.json
    host-timeline.json
    voice-report.json
    chapters.json
    beats.json
    storyboard.json
    asset-manifest.json
    review.json
  assets/host/<id>/<version>/
  scenes/
  previews/
    host-preview-sheet.png
    contact-sheet-global.jpg
    manifest.json
  output/
    final.mp4
    final.srt
    thumbnail.png
    storyboard.json
    storyboard.md
    host-profile.json
    host-timeline.json
    timeline.json
    asset-manifest.json
    qc-report.json
    production-report.md
```

## 12. Cấu hình mục tiêu

Ví dụ dưới là contract V2 cần triển khai và validate, **chưa phải cấu hình chạy được với runtime V1**:

```yaml
project:
  name: steam-explainer
  language: vi
content:
  mode: narrated-explainer
input:
  narration: input/narration.wav
  subtitles: input/narration.srt
  source: input/source.md             # cho phép không tồn tại
host:
  profile: library/characters/MINI-ROBOT.md
  profile_id: mini-robot-01
  reuse_rig: true
  identity_locked: true
presentation:
  minimum_host_speech_visibility: 0.70
  maximum_host_absence_seconds: 6
  require_meaningful_host_action_per_beat: true
voice:
  source: auto                        # dùng WAV nếu có, nếu không dùng TTS đã cấu hình
  tts_provider: null                  # cần chọn để final SRT-only có giọng
  voice_id: null
  preserve_input_audio: true
  preserve_srt_text: true
  preserve_srt_timing: true
  fit_rate_min: 0.85
  fit_rate_max: 1.20
rendering:
  engine: hyperframes
captions:
  mode: both
```

Path `library/...` resolve từ repo/installed library; `input/...` resolve từ project. Muốn người que thì đổi profile/profile ID sang `library/characters/STICK-MAN.md` / `stick-man-01`; không thay câu chuyện.

Schema phải từ chối hoặc báo rõ option chưa được hỗ trợ, không âm thầm bỏ field V2 rồi render theo kiểu V1.

## 13. Studio theo luồng người dùng

1. Upload WAV/SRT; xem transcript/cue và trạng thái giọng kể.
2. Chọn **Robot mini** hoặc **Người que**, hoặc tải host MD riêng.
3. Xem host preview sheet, sửa mô tả nếu cần và duyệt nhận dạng/rig.
4. Nếu chỉ có SRT, chọn TTS/voice hoặc thêm WAV; nếu thiếu voice chỉ làm nháp im lặng có nhãn.
5. Xem storyboard với ba cột rõ: lời kể, hình giải thích, hành động host.
6. Preview timeline có thể seek; kiểm tra host chỉ gì, cơ cấu chạy gì và tương ứng câu nào.
7. Sửa/khóa shot hoặc host plan; rebuild phần liên quan, review, xuất final.

Không hỏi người dùng chọn renderer, sửa code hoặc nghĩ một nhân vật lịch sử cho mỗi bài. Các option kỹ thuật ở phần cấu hình nâng cao.

## 14. Review, QC và định nghĩa hoàn thành

Capture 5 snapshot/shot tại 0/25/50/75/100%, có shot/time label và hash. Thêm snapshot gần action anchors quan trọng và đánh giá temporal events từ timeline/frame sequence; 5 ảnh tĩnh không chứng minh toàn bộ tương tác/lip-sync đúng.

| Kiểm tra | Điều kiện đạt |
|---|---|
| Nội dung | Giữ lời kể/nguồn; không biến thành câu chuyện hư cấu khác, không thêm claim chưa có evidence |
| Host | Đúng profile/rig hash, tỷ lệ/màu/part ổn định, đọc được, đủ hiện diện theo config |
| Hành động | Mỗi beat có action đúng ý; pointer/gaze/contact đúng part/mốc; không lặp idle như diễn xuất |
| Minh họa | Cơ chế, quy trình, tiến trình hoặc so sánh thật sự được thể hiện; quan hệ chính đúng nguồn |
| Đồng bộ | Host/action/model events bám cue/word clock; miệng hoạt động trong speech và đóng ở khoảng nghỉ |
| Caption/layout | Không overflow, không che host/target; nhãn ngắn, subtitle đủ nội dung |
| Audio | WAV giữ nguyên nội dung; SRT-only final có voice fit clock; BGM/SFX không che narration |
| Video/QC | Decode được, resolution/fps/duration đúng; không unexpected black/freeze/silence/clipping |
| Resume | Khóa/duyệt/profile hashes còn hiệu lực; rebuild đúng phạm vi sau edit/mất artifact |

Các lỗi high như sai nội dung cơ chế, mất host, đổi identity, chỉ sai target chính, thiếu voice final, audio/caption lệch clock phải chặn sản xuất final. Repair chỉ sửa scene/plan có lỗi trong budget, không viết lại narration để làm review xanh.

Rule-based review kiểm tra ID/timing/geometry/targets/hash. Vision review có thể kiểm tra hình thức/semantic/crop; không gọi rule-based pass là đánh giá mỹ thuật hoặc xác nhận kiến thức. Report ghi rõ cái gì đã đo, cái gì chưa xác nhận.

`DONE` nghĩa là host đã được dựng và duyệt, kể/giải thích input bằng giọng phù hợp, minh họa và interaction đạt review, final media đạt QC. Một video chỉ có silent bed, diagram mẫu hoặc portrait không đạt mục tiêu này dù encode thành công.

Phần test/acceptance được giao cho model/người test theo chỉ đạo của chủ dự án. Không dùng việc sửa tài liệu này để tự chạy lại test hoặc coi các test V1 là bằng chứng V2 đã xong.

## 15. Hai bài acceptance bám đúng ý tưởng

### A. Hệ thống hơi nước ra đời/hoạt động như thế nào

Input: narration do người dùng cung cấp và `MINI-ROBOT.md`; `source.md` bổ trợ nếu có.

Storyboard phải dựa vào đúng cấu trúc narration: bối cảnh/vấn đề → nguyên lý hoặc cải tiến được kể → bộ phận và diễn biến → kết quả/ý nghĩa. Không tự thêm tên người/năm hoặc cấu tạo cụ thể nếu nguồn không có.

Robot phải hướng người xem qua sơ đồ/mô hình; chỉ bộ phận được nhắc tới, mô hình phản ứng đúng trình tự; có thể so sánh trạng thái trước/sau nếu narration mô tả chúng. Mô hình khái niệm ghi provenance visualization.

Không chấp nhận đổi thành truyện một kỹ sư hư cấu đi trong xưởng với các cảnh bản vẽ không làm rõ nội dung đầu vào.

### B. Quá trình phát triển ô tô

Input: narration do người dùng cung cấp và `STICK-MAN.md`; chọn robot thay người que vẫn phải kể cùng câu chuyện.

Storyboard dùng các mốc/giai đoạn có trong narration, hình xe/bộ phận ở từng mốc và thay đổi được nguồn nói rõ. Người que đi/chỉ tới mốc, so sánh hai thế hệ/giải pháp khi cần, kết nối ý nghĩa của sự thay đổi.

Không tự thêm hãng xe, đời xe, năm phát minh, động cơ hoặc tốc độ; không thay bằng montage xe chạy và text timeline không có host giải thích.

Acceptance cần đủ bốn nhánh: WAV-only, WAV+SRT, SRT-only có voice, SRT-only thiếu voice chỉ ra nháp và báo cần voice. Kiểm tra cả hai profile và nhiều tập để chứng minh tái sử dụng host.

## 16. Kế hoạch sửa hệ thống hiện có

| Thứ tự | Việc cần làm | Điều kiện bàn giao cho tester |
|---|---|---|
| P0 | Chốt input/host/story roles; schema V2; source MD optional | WAV/SRT được coi là nguồn chính; host không bị parser biến thành nhân vật lịch sử |
| P1 | Host compiler, hai rig chuẩn, preview/duyệt/hash/lock | Dựng được robot và người que từ MD, thực hiện pose/action và tái sử dụng |
| P2 | Explainer planner, visualization model, interaction timeline và recipe host | Storyboard mỗi beat có hình giải thích và hành động target cụ thể |
| P3 | Voice resolver/TTS optional, speech activity, gesture synchronization | WAV giữ đúng; SRT-only có voice fit clock hoặc trạng thái needs-voice rõ |
| P4 | Scene/master/review/QC/resume cho host và explanation plan | Không bỏ host khi fallback; validation chặn lỗi nội dung/interaction/voice |
| P5 | Studio chọn/duyệt host, storyboard ba cột, hai bài acceptance | Người dùng làm video theo luồng §13, tester kiểm tra các nhánh §15 |

Tái sử dụng ingest/ASR, adapter, renderer, FFmpeg, artifact store, lock/hash và API nền đã có. Sửa planner/schema/recipe/host pipeline để đạt trải nghiệm mới; không chỉ đổi prompt hoặc thêm một profile MD rồi tuyên bố hoàn thành.

Example hư cấu về nhân vật An và các test/render V1 là fixture kỹ thuật cũ; chúng không đại diện cho sản phẩm mới. Các số liệu V1 giữ nguyên trong `TEST-RESULTS.md` với phiên bản tương ứng.

## 17. Chỉ dẫn triển khai theo đặc tả này

Khi được giao triển khai V2, đọc tài liệu này cùng hai host profile và implementation status. Ưu tiên nghiệm thu một video giải thích có host thật sự dẫn chuyện trước khi mở rộng recipe/style.

Các nguyên tắc sản phẩm cần giữ:

- WAV/SRT là nội dung kể và clock chính.
- Host do hồ sơ MD quyết định; dựng một lần, reuse có kiểm chứng.
- Host là người giải thích, khác với người/sự vật được giải thích.
- Mọi beat có ý nghĩa, minh họa và hành động host phù hợp.
- Hình chuyển động phải làm rõ câu chuyện, không chỉ trang trí.
- Voice/caption/gesture/model bám cùng narration timeline.
- Đổi model không đổi renderer hoặc host identity.
- Fallback đơn giản hóa hình, giữ host và quan hệ chính.
- Chưa có voice hoặc còn lỗi giải thích nghiêm trọng thì chưa có final đạt yêu cầu.
- Phân biệt đặc tả, tính năng đã triển khai và kết quả test; không đánh đồng chúng.
