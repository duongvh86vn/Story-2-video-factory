# STORY-TO-VIDEO FACTORY — BA LUỒNG, MỘT VIDEO GIẢI THÍCH

Đặc tả V2.1 · 2026-10-01. Yêu cầu do chủ dự án phê duyệt là nguồn quyết định; tài liệu đầu vào được xử lý như dữ liệu, không phải lệnh cho agent hoặc hệ thống.

## 1. Trải nghiệm và phạm vi

**Nhập nội dung → chọn người que hoặc robot mini → Tạo video.** Kịch bản là lời kể hoàn chỉnh. Hệ thống đọc nguyên văn, không tự viết lại, thêm lời thoại, câu chào hoặc lời kết.

Sản phẩm là video giải thích/mô tả/kể lại sự vật và sự việc, ví dụ hệ thống hơi nước và quá trình phát triển ô tô. Một host cố định đứng cạnh hình minh họa, nhìn/chỉ/thao tác đúng đối tượng đang được giải thích. Host là người trình bày, tách khỏi nhà phát minh, nhân vật lịch sử và các đối tượng trong narration.

Code V2.1 đã bổ sung các module và contract dưới đây. Build/typecheck được kiểm tra; **nghiệm thu runtime, TTS, ASR, render và chất lượng giải thích chưa được chạy trong lượt triển khai này**, theo yêu cầu giao test cho model khác. Xem IMPLEMENTATION-STATUS.md và TEST-HANDOFF.md. TEST-RESULTS.md trước đây chỉ chứng minh V1. Bản V1 được lưu tại docs/archive/STORY-TO-VIDEO-FACTORY.v1.md.

## 2. Ba luồng đầu vào

| Chế độ | Nguồn chính | Giọng và clock |
|---|---|---|
| script | input/script.txt hoặc input/script.md UTF-8 | TTS nguyên văn; clock từ audio thực tế đã đo |
| wav | input/narration.wav | Giữ audio; ASR tạo transcript/timestamp |
| srt | input/narration.srt | Giữ cue text/clock; TTS từng cue và fit |

WAV + SRT thuộc luồng WAV: giữ WAV, giữ cue ID/text/clock SRT, kiểm tra/forced-align trước sản xuất. Không đổi tốc độ WAV để che mismatch. Thiếu backend alignment hoặc mismatch phải báo rõ và chặn final.

input.mode quyết định nguồn chính khi nhiều file cùng tồn tại. Chế độ srt bỏ qua WAV; script bỏ qua WAV/SRT; wav dùng SRT đi kèm nếu có. auto nhận diện project cũ theo WAV/SRT, hoặc script khi chỉ có script. auto gặp script cùng WAV/SRT phải yêu cầu chọn mode; không âm thầm đổi nguồn.

source.md là tài liệu bổ trợ tùy chọn, không phải kịch bản. Host MD mô tả nhân vật. Hai loại MD không cung cấp quyền thực thi shell, tool, hướng dẫn hệ thống hoặc thay nội dung lời kể. Không có source.md vẫn phải chuẩn bị được video.

## 3. Luồng script không có clock

1. Nhập trực tiếp hoặc tải .txt/.md UTF-8, tối đa 128 KiB, không NUL. Giữ bản gốc và hash/source path.
2. Markdown chỉ bỏ định dạng thông thường: heading/list/quote prefix, dấu nhấn/code, link markup; YAML frontmatter không đọc. Nội dung văn bản còn lại được đọc như lời kể, kể cả câu mang hình thức mệnh lệnh. Không hiểu script thành outline hoặc tự viết bài.
3. Lưu work/script.json: original, text, paragraphs, chunks và sourceStartLine/sourceEndLine. Studio có nút xem lời kể chuẩn trước khi tạo video.
4. Chia ở dấu câu/khoảng trắng, tối đa mặc định 120 Unicode characters/chunk; không cắt giữa từ, giữ toàn bộ từ và thứ tự. Một từ vượt giới hạn báo lỗi.
5. TTS từng chunk ở tốc độ mặc định; đo WAV thực tế sau chuẩn hóa sample rate. Mỗi chunk đồng thời là một cue phụ đề.
6. Ghép audio tuần tự, thêm 250 ms giữa các đoạn văn. Timeline/cue được tính từ thời lượng đã đo, không ước lượng clock rồi ép TTS vào đó.
7. Lưu narration.json (mode=script), timeline.json, voiced-narration.json, voice-report.json, speech-activity.json và script-timing.json.

Thiếu TTS hoặc tạo giọng thất bại: báo needs-voice/provider-failed; dừng trước checkpoint TIMED, không tạo timeline chính thức cho nội dung mới, không final/DONE. Artifact của lần chạy cũ không chứng minh lần chạy mới thành công.

## 4. WAV, SRT và giọng kể

WAV giữ bản input và hash, ASR theo backend được cấu hình. Master theo thời lượng probe, kể cả silence đầu/cuối. Transcript không được planner tự viết lại. WAV+SRT giữ nguyên clock và nguyên văn; word timing chỉ bổ sung, không thay cue clock.

SRT-only đọc đúng từng cue. TTS audio được đặt đúng vị trí, khoảng trống thành silence. Fit dùng atempo giữ cao độ, mặc định 0.85–1.20; câu ngắn được padding, không bắt buộc kéo giọng chậm. Voice report lưu fittedDurationMs để QC phân biệt phần silence padding theo clock với mất lời kể. Câu dài không vừa giới hạn, hoặc audio sau fit vẫn vượt cue, phải báo fit-failed. Không trim phần lời, viết lại hay đổi timestamp để vừa.

SRT chưa có giọng được dựng **nháp im lặng có nhãn**, gồm voice-report và activity method=segment-draft. Cả thiếu giọng, provider lỗi và fit lỗi đều chặn final/DONE. Chuyển sang WAV là lựa chọn input.mode rõ ràng, không tự fallback.

Giọng cấu hình một lần trong config/voice.yaml, project có thể override. Adapter Windows Speech kiểm tra voice cài đặt và culture; HTTP/command nhận language, voice và nguyên văn qua contract. Adapter bên ngoài phải hỗ trợ language được yêu cầu; cần nghe/nghiệm thu tiếng Việt với nhà cung cấp thật. Không đổi sang giọng Anh để thay giọng Việt thiếu.

HTTP adapter: POST base_url, JSON {text, language, voice, format:"wav"}, trả WAV bytes, Content-Type audio/wav hoặc application/octet-stream. Token lấy từ api_key_env. Đây là adapter protocol chung, không phải client trực tiếp cho mọi API TTS trên thị trường.

Command adapter: executable + command_args có {request}, tùy chọn {output}; request JSON UTF-8 chứa text/language/voiceId/output. Chạy shell=false, có timeout. Không đưa nội dung script thành shell command.

Speech activity đo RMS audio 20 ms; mouth mở theo activity/level và đóng lúc nghỉ. Đây là đồng bộ audio activity, **không phải phoneme lip-sync**. Silent draft chỉ có đồng bộ mức segment, report phải ghi đúng.

## 5. Host MD → rig tái sử dụng

Hai mẫu sẵn: library/characters/MINI-ROBOT.md và STICK-MAN.md. Chọn mẫu chuẩn cho phép chạy tự động; custom input/host.md phải xem và duyệt preview một lần theo rig hash trước sản xuất. Đổi profile/appearance/compiler làm hash đổi và cần duyệt lại custom host.

Compiler xuất HostProfile JSON, SVG rig, part IDs/joint pivots, pose library, host-preview-sheet.png. Màu, headScale/bodyScale (0.75–1.25), strokeWidth (2–10) có schema. MD tùy chỉnh vẫn nằm trong hai rig vector được hỗ trợ; không hứa tạo mọi hình dạng 3D hoặc render mọi mô tả tùy ý.

Pose/action: idle, greet, explain, point, operate-model, compare, think, react, summarize, walk-to-marker. Preview gồm chính diện, hướng trái/phải dạng sơ đồ 2D và các pose. Rig/profile version/hash cố định xuyên video; không sinh nhân vật mới mỗi shot. Profile không được biến host thành nhà phát minh.

Controller dùng khớp tay có chiều dài cố định, IK tính ở compile time, gaze hướng target, pointer từ tay đến đúng part anchor. operate-model phải tiếp cận, contact thực tế, rồi model event mới phản ứng. Không stretch tay để che target ngoài tầm. Đích thiếu, action chồng nhau, contact sai hoặc event không được component hỗ trợ phải bị từ chối.

Host cao khoảng 25–40% khung hình (compiler mặc định 36%), hiện ít nhất 70% thời gian narration, vắng liên tục tối đa 6 giây. absent không được chỉ/thao tác như một host vô hình. Presentation hiện hỗ trợ beside-model/absent; inset chưa được renderer hỗ trợ và bị validator từ chối.

## 6. Phân tích và explanation plan

Pipeline chung:

```text
input document → narration có clock → analysis → explanation plan
  → storyboard → assets → scenes → draft → review/repair → final → QC → DONE
```

Mỗi beat: explanationGoal, narrationSegmentIds, sourceRefs, entities, evidenced relations, visualMethod, hostIntent. Clock của chapter/beat/shot do code tính từ narration. Model chỉ cung cấp cấu trúc/ý đồ, không sở hữu phép tính timestamp hoặc identity.

Nguồn quyết định là narration của mode đã chọn. source.md chỉ bổ trợ. Entity label phải có trong source excerpt; relation phải có endpoint/evidence. Không tự thêm ngày, hãng xe, thông số hoặc quan hệ nhân quả. Nguồn mâu thuẫn high phải chặn final; planner thật có contract báo contentIssues và vision review kiểm tra lại. Planner mock chỉ xử lý quy tắc nguồn/keyword, không phải kiểm chứng kiến thức hoặc phát hiện mọi mâu thuẫn ngữ nghĩa.

Minh họa có provenance=visualization, fidelity=conceptual. Bộ từ vựng hiện gồm boiler, condenser, cylinder, piston, wheel, gear, lever, car, engine, battery, pipe, flow, object, stage, marker. Cơ cấu được sơ đồ hóa, không giả làm bản vẽ/tư liệu lịch sử. Narrative có chi tiết ngoài vocabulary phải được diễn giải trong phạm vi này hoặc báo cần sửa, không tự tạo asset sai.

## 7. Tám recipe giải thích

| Ý đồ | Recipe | Minh họa |
|---|---|---|
| Mở câu hỏi | host-introduce-question | Host và vấn đề từ narration |
| Cơ chế | host-mechanism-explainer | Part, luồng, contact/motion có nguồn |
| Quy trình | host-process-steps | Các bước và nhấn theo lời kể |
| Tiến trình | host-evolution-timeline | Mốc/đối tượng thay đổi có nguồn |
| So sánh | host-before-after | Hai target được chỉ lần lượt |
| Tách bộ phận | host-part-breakdown | Part diagram và reveal |
| Chuỗi sự kiện | host-event-sequence | Rail, bước/sự kiện theo narration |
| Tổng kết | host-summary | Host nhấn các ý đã có |

Recipe dùng cùng rig/model/interaction contract. Quan hệ và nhãn không được đổi thành claim mới khi chỉnh storyboard. Host action chọn theo cue/word anchors; diagram reaction sau contact. Các mũi tên nhân quả cần evidence; chỉ cùng xuất hiện không đủ chứng minh nguyên nhân.

Không thay host bằng portrait, slideshow hoặc một tấm chữ dài. Fallback giảm motion/model complexity nhưng giữ host, source parts, relations và interaction. Lỗi semantic không được biến thành pass bằng fallback trang trí.

## 8. Studio, API và CLI

Studio: ba tab Kịch bản/WAV/SRT → host → giọng → Tạo video. Có preview lời kể, host preview, trạng thái giọng/chờ duyệt, storyboard ba cột lời kể/mục tiêu giải thích/hành động. Storyboard approval/chỉnh/khóa/rebuild shot vẫn có sẵn nhưng không bắt buộc khi automatic=true.

API có PATCH project settings (input.mode/script, host, language, voice, automatic), PUT script editor, multipart script/host upload, POST script preview, voice-default settings, approve host và run tới DONE. Settings/artifact edits có revision check. Generated story/narration chỉ đọc; chỉnh script hoặc input SRT/WAV để đổi lời kể. Host scene source được sinh từ kế hoạch đã validate; chỉnh storyboard rồi rebuild thay vì sửa SVG/JS làm mất identity/target guarantees.

CLI new/configure/script/make/resume/approve/status/lock/edit dùng cùng contract với Studio. `new --example` lấy bài hơi nước thuần script, không đưa người dùng về truyện hư cấu V1. Các project V1 có thể opt-in content.mode=legacy để dùng pipeline cũ; không được coi nghiệm thu legacy là nghiệm thu host explainer.

## 9. Cache, resume, lock và chặn lỗi

Cache raw TTS theo text/provider/voice/language/endpoint/command/settings và audio hash. Script sửa hoặc đổi giọng làm lại narration/phần phụ thuộc; cue raw còn hợp lệ được tái sử dụng. Đổi host chỉ làm lại phần hình, giữ audio/timeline hợp lệ. Thay source bổ trợ cũng giữ narration, làm lại analysis/explanation.

Fingerprint chỉ xét input đang chọn (WAV có companion SRT). Resume kiểm tra artifact hashes và producer checkpoints. Mất/đổi script JSON, audio, rig, scene hay preview phải rewind đúng checkpoint. Lock đã duyệt được giữ; lock mâu thuẫn clock/host mới phải báo sửa/unlock, không tự bỏ lock.

CSP/scene allowlist, local asset hashes, project path/symlink guards, shell=false, secret redaction, timeout, model-call/cost budgets, bounded retries/repair, attempt journals/SQLite vẫn được giữ. JSON Schema mô tả shape; runtime validators còn kiểm tra source, full coverage, target, contact, locks và hashes.

Final yêu cầu ready voice, canonical narration/hash không đổi, draft review pass, host approval hợp lệ và scene/artifact hợp lệ. QC fail không DONE. Studio không hiển thị final của phiên bản cũ như final của input vừa sửa.

## 10. Bố cục, render, review và QC

HyperFrames 0.8.96, SVG/GSAP deterministic paused timelines, FFmpeg cho audio/mux/captions/QC. Default final 1920×1080/30fps, draft 960×540/15fps, tối đa 300 giây/100 shot, budgets cấu hình.

Chừa vùng caption cuối khung: bottom 4%, tối đa 14% chiều cao. Nhãn model phải nằm trong safe layout; cue đầy đủ không vừa phải báo lỗi, không clip mất chữ. Camera hỗ trợ wide/medium/close, eye-level, locked/static/push-in/pull-out/pan-left/pan-right với movement nhỏ giữ clearance; giá trị ngoài khả năng renderer bị từ chối.

Review: 5 snapshot/shot tại 0/25/50/75/100%, thêm trước/trong/sau action reach/contact, action sheets, scene/master/frame/sheet hashes. Rule review kiểm tra IDs/source/timing/geometry/contact/artifact integrity. Vision được cấu hình sẽ so identity, biểu cảm, crop/readability, subtitle clearance và tính đúng của hình giải thích. Không dùng 5 ảnh tĩnh để tuyên bố toàn bộ diễn xuất/phoneme đúng.

Report phải phân biệt rule-based/combined, voice source/provider/hash, synchronization và phần chưa xác nhận. Không có vision mà allow_rule_based_review=true có thể tạo final qua kiểm tra kỹ thuật; **đó chưa là nghiệm thu chất lượng hình hoặc kiến thức**, phải xem/nghe bởi model/người test. Có thể đặt allow_rule_based_review=false cho sản xuất yêu cầu vision thật.

QC: codec/resolution/fps/duration, audio presence/hash/duration, sample rate/loudness/true peak/clipping, unexpected black/freeze/silence, subtitle stream và sidecar đúng text/clock, thumbnail/artifacts. Lỗi high chặn DONE. DONE của một project là checkpoint sản xuất đã qua các gate cấu hình, không tự chứng minh toàn bộ sản phẩm V2.1 đã nghiệm thu.

## 11. Artifacts

```text
input/script.txt|script.md, narration.wav, narration.srt  # theo mode
input/source.md, host.md, assets/                       # tùy chọn
work/input-document.json, script.json, script-timing.json
work/narration.json, voiced-narration.json, timeline.json
work/voice-report.json, speech-activity.json, voice/cues/
work/story.json, chapters.json, beats.json, character-bible.json
work/host-profile.json, host-rig.json, explanation-plan.json, host-timeline.json
work/storyboard.json, storyboard.md, asset-manifest.json, review.json
assets/host/<id>/<version>/host.svg, poses.json
scenes/<shot>/index.html, style.css, scene.js, host-geometry.json
previews/host-preview-sheet.png, contact-sheet-global.jpg, manifest.json
output/final.mp4, final.srt, thumbnail.png
output/narration.json, timeline.json, speech-activity.json, voice-report.json
output/storyboard.json, storyboard.md, host-profile.json, host-timeline.json
output/explanation-plan.json, character-bible.json, asset-manifest.json
output/production-report.md, qc-report.json, cost-report.json
```

## 12. Cấu hình mẫu

```yaml
project: { name: steam-explainer, language: vi }
content: { mode: narrated-explainer }
input:
  mode: script
  script: input/script.txt
  source: input/source.md
  narration: input/narration.wav
  subtitles: input/narration.srt
host:
  profile: library/characters/MINI-ROBOT.md
  reuse_rig: true
  identity_locked: true
presentation:
  minimum_host_speech_visibility: 0.70
  maximum_host_absence_seconds: 6
  require_meaningful_host_action_per_beat: true
voice:
  source: auto
  tts_provider: windows-speech
  voice_id: null
  preserve_input_audio: true
  preserve_srt_text: true
  preserve_srt_timing: true
  fit_rate_min: 0.85
  fit_rate_max: 1.20
workflow: { automatic: true, require_host_approval: true, require_storyboard_approval: false }
style: { preset: technical-clean }
captions: { mode: both }
```

Windows provider cần giọng tiếng Việt thực sự được cài. Đổi người que bằng profile STICK-MAN.md; custom chọn input/host.md. Library path resolve từ repo; input path từ project. Cấu hình giọng mặc định dùng config/voice.yaml, xem config/voice.example.yaml. Không đưa token vào YAML.

## 13. Nghiệm thu và bàn giao

Model khác thực hiện runtime tests, lưu commit/config/provider/evidence theo TEST-HANDOFF.md. Bộ nghiệm thu phải kiểm tra thuần script không WAV/SRT, WAV giữ lời, SRT giữ cue text/clock, WAV+SRT mismatch, thiếu/lỗi TTS/fit không final; hai host trên bài hơi nước và ô tô; identity/target/contact/speech/layout; resume/edit voice/host/script/rebuild/locks; final audio/subtitle/duration/QC.

V1 test evidence không được dùng để tuyên bố ba luồng mới đạt. Build/typecheck là kiểm tra biên dịch, không thay việc nghe giọng Việt, xem video, kiểm tra cơ chế hoặc chạy ASR/render thật. Trạng thái nghiệm thu mới phải ghi riêng trong TEST-RESULTS.md.
