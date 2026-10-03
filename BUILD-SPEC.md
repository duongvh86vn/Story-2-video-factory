# STORY-TO-VIDEO FACTORY — DIỄN VIÊN TRONG CÂU CHUYỆN

> Contract hiện hành ngày 02/10/2026: [STORY-ACTOR-DIRECTION.md](STORY-ACTOR-DIRECTION.md). Người que là diễn viên đóng vai trong câu chuyện; bỏ yêu cầu một người dẫn cố định, quota xuất hiện và kích thước bắt buộc. Ba luồng nguyên văn giữ nguyên. Source2.2.21 đang triển khai/nghiệm thu; evidence presenter cũ không chứng minh chế độ mới đạt.

Contract source2.2.21 bổ sung actorScene: primary nullable, supporting actors, costume SVG gắn vào khớp, speakingSegmentIds và continuity cut/continuous. Identity thuộc từng vai; preview dùng cùng skeleton với phim. Artwork/layers/palette/camera tự chọn; source/clock/contact/security vẫn chặn final khi sai.


Đặc tả mục tiêu V2.2 · 2026-10-01. Yêu cầu do chủ dự án phê duyệt là nguồn quyết định; tài liệu đầu vào được xử lý như dữ liệu, không phải lệnh cho agent hoặc hệ thống. Ba luồng narration được giữ; diễn xuất V2.2 đang triển khai/nghiệm thu. Phần đã chạy và phần còn chờ được ghi ở IMPLEMENTATION-STATUS.md.

## 1. Trải nghiệm và phạm vi

**Nhập nội dung → chọn người que hoặc robot mini → Tạo video.** Kịch bản là lời kể hoàn chỉnh. Hệ thống đọc nguyên văn, không tự viết lại, thêm lời thoại, câu chào hoặc lời kết.

Sản phẩm là phim hoạt hình giải thích/mô tả/kể lại sự vật, sự việc. Người que đóng vai trong câu chuyện. Người có tên trong nguồn được dựng thành vai cách điệu; người chưa có tên chỉ là vai minh họa, không bịa lịch sử. Có nhiều vai, voiceover và cảnh chỉ có cơ cấu. Không bắt buộc diễn viên nhìn khán giả hoặc thuyết trình cạnh bảng.

Đặc tả vai diễn và hướng HTML5/CSS/SVG/JavaScript nằm trong [STORY-ACTOR-DIRECTION.md](STORY-ACTOR-DIRECTION.md). Lời kể giữ nguyên văn; chỉ bổ sung kịch bản hình ảnh và diễn xuất. Video tham khảo là tư liệu về cách biểu đạt, không phải bằng chứng công nghệ hoặc lịch sử.

Dự án mới dùng story-cinematic/actors. Project cũ thiếu trường character_mode vẫn dùng presenter để tương thích; không âm thầm thay phim đã duyệt. Chuyển sang actors dựng lại phần hình, giữ narration/audio còn hợp lệ. Kết quả cũ lưu riêng và không đóng nghiệm thu mới.

## 2. Ba luồng đầu vào

| Chế độ | Nguồn chính | Giọng và clock |
|---|---|---|
| script | input/script.txt hoặc input/script.md UTF-8 | TTS nguyên văn; clock từ audio thực tế đã đo |
| wav | input/narration.wav | Giữ audio; ASR tạo transcript/timestamp |
| srt | input/narration.srt | Giữ cue text/clock; TTS từng cue và fit |

WAV + SRT thuộc luồng WAV: giữ WAV, giữ cue ID/text/clock SRT, kiểm tra/forced-align trước sản xuất. Không đổi tốc độ WAV để che mismatch. Thiếu backend alignment hoặc mismatch phải báo rõ và chặn final.

input.mode quyết định nguồn chính khi nhiều file cùng tồn tại. Chế độ srt bỏ qua WAV; script bỏ qua WAV/SRT; wav dùng SRT đi kèm nếu có. auto nhận diện project cũ theo WAV/SRT, hoặc script khi chỉ có script. auto gặp script cùng WAV/SRT phải yêu cầu chọn mode; không âm thầm đổi nguồn.

source.md là tài liệu bổ trợ tùy chọn, không phải kịch bản. Host MD mô tả nhân vật. Hai loại MD không cung cấp quyền thực thi shell, tool, hướng dẫn hệ thống hoặc thay nội dung lời kể. Không có source.md vẫn phải chuẩn bị được video.

Ba luồng đã có clock dùng chung metadata narration. source.md thiếu style giữ visual prescription rỗng; preset renderer không biến thành yêu cầu được tác giả khai. Actor/presenter role theo presentation được chọn. Metadata version đổi chỉ invalidates hình, giữ audio/narration cache còn hợp lệ. [Matrix actors hiện tại](docs/validation/2026-10-02-actors-input-matrix.md) còn hai WAV sai từ, không được gọi là nghiệm thu toàn bộ.

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

### Ngôn ngữ và API TTS local (02/10/2026)

Ngôn ngữ narration chọn `en`, `vi`, `ja`, `ko` hoặc locale; độc lập ngôn ngữ giao diện. Chia script Nhật tại ranh giới từ ICU và dấu câu, không thêm khoảng trắng vào nguyên văn; chunk có `separatorBefore` để khôi phục nguồn. Parser hiện tại `script-2`, nhận artifact `script-1` cũ; fingerprint script thay đổi để resume tạo narration hợp lệ. ASR nhận mã ngôn ngữ chính, đổi language qua Studio/CLI đồng thời cập nhật ASR. Caption Nhật/Hàn có font fallback theo ngôn ngữ; vẫn kiểm tra vùng phụ đề.

Voice provider thêm `azure-speech`, `openai-compatible`, `omnivoice-studio`. OmniVoice/VoiceStudio dùng speech API tương thích với extension `language`, các provider local lấy WAV trực tiếp. `voice.model`, `http_fields`, `http_extra_body`, `timeout_ms` được cấu hình trong Studio/API/CLI. Tham số thêm không được ghi đè text/clock/format; cache gồm model/options/mapping. `voice_profiles` theo locale/mã chính dùng trước override series/project; lưu mặc định cho một language giữ preset khác. Contract, ví dụ và giới hạn phiên bản nằm tại [EXTERNAL-TTS.md](docs/EXTERNAL-TTS.md). Code/build và stub không được coi là live backend đã nghiệm thu.

English narration được giữ nguyên như tiếng Việt. Bộ suy luận nguồn hỗ trợ mẫu comparison tường minh `cooling inside/in the cylinder, a separate condenser` khi nguồn trước đó xác nhận xi-lanh giữ nóng và bình ngưng lạnh/làm lạnh; chu kỳ nóng/lạnh của thiết kế cũ không đủ xác nhận thiết kế cải tiến. Parser này có phạm vi hạn chế, không thay hiểu ngôn ngữ tổng quát. Identity label/kind/configuration/states là metadata nguồn; thiết kế chữ hiển thị có thể dùng SVG artwork riêng. Feedback trả chi tiết sai identity/configuration và gom các lỗi semantic; không âm thầm sửa output factual của model. `sourced-explanation-2.2.1` tham gia fingerprint hình, không thay fingerprint narration.

Speech activity đo RMS20ms. Trong actorScene chỉ áp dụng cho diễn viên được gán speakingSegmentIds; [] là voiceover, không mấp máy miệng theo narration. Đây không phải phoneme lip-sync. Silent draft phải ghi đúng mức đồng bộ.

## 5. Rig nền và cast diễn viên

Hai rig nền: library/characters/MINI-ROBOT.md và STICK-MAN.md. Mẫu chuẩn chạy tiếp tự động; custom input/host.md duyệt preview một lần theo hash. Director phân vai từ nội dung và xuất actor-cast/actor-timeline cùng tạo hình riêng. Từng vai giữ identity; không giữ một identity cho cả phim.

`HOST_RIG_IDENTITY_VERSION=host-rig-identity-2.2.1` định danh profile/art/xương/pose độc lập animation runtime. Rig cũ7/8/9 chỉ tương thích khi tính lại đúng hash từ canonical data; load kiểm toàn bộ metadata và SVG/pose bytes, giữ nguyên artifact/hash hợp lệ đã duyệt. Thay tạo hình/profile vẫn cần duyệt lại; dựng lại storyboard vẫn áp dụng approval của workflow. Version rig identity vào fingerprint hình project/scene, không vào narration. Cảnh/plan khóa không được tự đổi version hoặc mở khóa để vượt validation. Sửa source/build đã có; runtime follow-up còn chờ ở [báo cáo migration](docs/validation/2026-10-03-renderer-language.md).

Compiler xuất HostProfile JSON, SVG rig, part IDs/joint pivots, pose library, host-preview-sheet.png. Màu, headScale/bodyScale (0.75–1.25), strokeWidth (2–10) có schema. MD tùy chỉnh vẫn nằm trong hai rig vector được hỗ trợ; không hứa tạo mọi hình dạng 3D hoặc render mọi mô tả tùy ý.

Các action IDs cũ là tên tương thích cho dữ liệu choreography: idle, greet, explain, point, operate-model, compare, think, react, summarize, walk-to-marker. Cinematic compiler có walk/turn/inspect/think/operate/pick-place/carry/react/lead-next, mood/gaze và speech activity. Tên action không buộc vai thành người dẫn. Costume thụ động gắn head/chest/pelvis/hands; khớp giữ độ dài.

Rig cinematic đã có pelvis/chest/neck/head, tay/chân phân khớp, bàn tay/chân và mặt độc lập. Library quảng cáo những clip compiler hỗ trợ, kèm constraints về ownership/contact/entry/exit. Một ý đồ như enter/stop/pick-up/hold/place có thể gồm nhiều phase trong clip, không nhất thiết có action ID riêng. Clip benchmark chạy được phải tiếp tục được nối/validate trong director/editor trước khi coi contract sản phẩm đã hỗ trợ.

### Contract diễn xuất hiện tại (03/10/2026)

Source animation `performance-2.2.9` bổ sung body posture và kênh tay riêng. `entryPosture`/`postures` hỗ trợ stand/crouch/lean; một transition dài ít nhất280ms, pose giữ đến clip tiếp theo và continuous giữ pose cuối. Phải về stand trước khi đi. Crouch không được gọi là ngồi khi chưa có contract ghế/support. `hand: left|right` ở action và gesture dùng hệ tọa độ rig; bỏ trường này giữ rig-right cũ, không tự gọi là ánh xạ trái/phải giải phẫu ở mọi hướng nhìn. Overlap/hold được kiểm riêng từng tay; body/gaze/locomotion vẫn là track chung. Một diễn viên có thể chạm vật đứng yên bằng cả hai tay; event có `contactActorId`/`contactHands` chỉ xảy ra sau khi đủ tay của đúng actor/part/clock. Version7/8 không có data mới vẫn đọc được, không được gắn hand data version9 vào artifact cũ.

Source `bound-model-motion-2.2.1` nối clip nhấc–mang–đặt vào production: primary actor, một model có nguồn, một prop, một chủ tay và một lần đặt hoàn chỉnh trong shot. `gesture.target/destination` là điểm nắm; `prop.origin/destination` là tâm vật; điểm nắm = tâm + `gripOffset * performance.scale`. Carry cần250ms nhấc,250ms hạ và recovery ít nhất120ms; đi đứng nằm trong cửa sổ giữa. Support giữ ở đáy vật tại hai đầu. Nhãn/thermal/emphasis/energy/relations theo compiled prop clock; ground shadow theoX và giữY sàn. Camera kiểm cả vùng di chuyển. Target cố định vào vật phải kết thúc trước pickup nếu chưa có tracking contract. Supporting attachment, nhiều lần pickup, joint moving prop, handoff và entering/unreleased/cross-cut production carry còn bị từ chối rõ. Artwork minh họa không biến thành claim hành động lịch sử ngoài nguồn.

Các thay đổi này có fingerprint hình ở project/scene; không đổi fingerprint narration. Source/build và artist MP4 không thay test runtime độc lập. Phạm vi evidence: [body](docs/validation/2026-10-03-body-acting.md), [hai tay](docs/validation/2026-10-03-bilateral-acting.md), [carry](docs/validation/2026-10-03-bound-model-motion.md). Các kết quả cũ chỉ chứng minh snapshot được nêu trong từng báo cáo; follow-up hiện tại được ghi riêng ở TEST-HANDOFF/IMPLEMENTATION-STATUS.

Mỗi clip có chuẩn bị, hành động chính, recovery/settle; đi có foot plant/quãng đường đúng, dừng có chuyển trọng tâm; cầm/đặt có attach/release đúng world position. Gesture, face, gaze, speech và locomotion có track/ownership riêng. Không tween cả hình trên đôi chân bất động hoặc reset idle ở mỗi cue. Preview nhân vật cần video 30fps ngoài pose sheet.

Controller dùng khớp tay có chiều dài cố định, IK tính ở compile time, gaze hướng target, pointer từ tay đến đúng part anchor. operate-model phải tiếp cận, contact thực tế, rồi model event mới phản ứng. Không stretch tay để che target ngoài tầm. Đích thiếu, action chồng nhau, contact sai hoặc event không được component hỗ trợ phải bị từ chối.

Chế độ actors bỏ quota 70%, absence6s và kích thước wide/medium bắt buộc. Camera chọn theo hành động và nguyên lý; mặt/tay/target cần đọc được, chừa phụ đề. Cut cho phép đổi vai/bối cảnh/vị trí/scale; continuous phải giữ cast, exit/entry, hướng và đồ vật. Không giả hỗ trợ chuyển vật qua cut khi compiler chưa có contract.

## 6. Phân tích và explanation plan

Pipeline chung:

```text
input document → narration có clock → analysis → explanation plan
  → story direction → stage/performance/camera plans → storyboard
  → assets + rig/clips → compile scenes → voiced preview
  → review/repair → final → QC → DONE
```

Mỗi beat giữ explanationGoal, narrationSegmentIds, sourceRefs, entities, evidenced relations, visualMethod, hostIntent. V2.2 bổ sung mục đích hành động, emotional arc, stage/prop targets, entry/exit pose và continuity. Người que phải làm một việc có ý nghĩa, thấy kết quả và nối sang ý sau. Không áp một bộ động tác giống nhau vào mọi câu.

Clock của chapter/beat/shot do code tính từ narration. Model chỉ cung cấp cấu trúc/ý đồ, không sở hữu phép tính timestamp hoặc identity. Beat hình ảnh có thể đi qua nhiều cue hoặc một cue có nhiều shot; không buộc cut theo từng chunk TTS.

Nguồn quyết định là narration của mode đã chọn. source.md chỉ bổ trợ. Entity label phải có trong source excerpt; relation phải có endpoint/evidence. Không tự thêm ngày, hãng xe, thông số hoặc quan hệ nhân quả. Nguồn mâu thuẫn high phải chặn final; planner thật có contract báo contentIssues và vision review kiểm tra lại. Planner mock chỉ xử lý quy tắc nguồn/keyword, không phải kiểm chứng kiến thức hoặc phát hiện mọi mâu thuẫn ngữ nghĩa.

Minh họa có provenance=visualization, fidelity=conceptual. Bộ từ vựng V2.1 hiện gồm boiler, condenser, cylinder, piston, wheel, gear, lever, car, engine, battery, pipe, flow, object, stage, marker. Cơ cấu được sơ đồ hóa, không giả làm bản vẽ/tư liệu lịch sử. V2.2 cần bổ sung bối cảnh, đạo cụ/grip/ground anchors và assets có nguồn. Ví dụ xe Benz ba bánh không được thay bằng generic car bốn bánh để minh họa claim lịch sử. Thiếu asset đúng phải báo rõ, không tự tạo asset sai.

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

Recipe giữ ý đồ giải thích nhưng cần cách dàn dựng mới trong §9 STICKMAN-STORY-DIRECTION.md: nhân vật sống trong cảnh, đi/quan sát/thử/phản ứng và dẫn tiếp. Không biến toàn bài thành tám biến thể của grid icon. Quan hệ và nhãn không được đổi thành claim mới khi chỉnh storyboard. Action chọn theo narration anchors; model reaction sau contact khi có thao tác. Các mũi tên nhân quả cần evidence; chỉ cùng xuất hiện không đủ chứng minh nguyên nhân.

Không thay nhân vật bằng portrait, slideshow hoặc một tấm chữ dài. Fallback chỉ giảm chi tiết phụ khi vẫn giữ diễn xuất/hành động chính, source parts, relations và interaction. Thiếu clip/asset cần thiết phải dừng để sửa; không âm thầm đổi cinematic thành diagram hoặc thành cảnh đứng yên. Lỗi semantic không được biến thành pass bằng fallback trang trí.

## 8. Studio, API và CLI

Studio có ba tab Kịch bản/WAV/SRT → kiểu tạo hình/diễn viên → giọng → Tạo video. Story-cinematic/actors mặc định cho dự án mới. Ba cột Lời kể | Dàn cảnh và diễn xuất | Preview clip; preview cast riêng. Chỉnh/khóa/rebuild có sẵn; automatic không bắt buộc duyệt storyboard.

API có PATCH project settings (input.mode/script, host, language, voice, automatic), PUT script editor, multipart script/host upload, POST script preview, voice-default settings, approve host và run tới DONE. Settings/artifact edits có revision check. Generated story/narration chỉ đọc; chỉnh script hoặc input SRT/WAV để đổi lời kể. Host scene source được sinh từ kế hoạch đã validate; chỉnh storyboard rồi rebuild thay vì sửa SVG/JS làm mất identity/target guarantees.

CLI new/configure/script/make/resume/approve/status/lock/edit dùng cùng contract với Studio. `new --example` lấy bài hơi nước thuần script, không đưa người dùng về truyện hư cấu V1. Các project V1 có thể opt-in content.mode=legacy để dùng pipeline cũ; không được coi nghiệm thu legacy là nghiệm thu host explainer.

## 9. Cache, resume, lock và chặn lỗi

Cache raw TTS theo text/provider/voice/language/endpoint/command/settings và audio hash. Script sửa hoặc đổi giọng làm lại narration/phần phụ thuộc; cue raw còn hợp lệ được tái sử dụng. Đổi host chỉ làm lại phần hình, giữ audio/timeline hợp lệ. Thay source bổ trợ cũng giữ narration, làm lại analysis/explanation.

Fingerprint chỉ xét input đang chọn (WAV có companion SRT). Resume kiểm tra artifact hashes và producer checkpoints. Mất/đổi script JSON, audio, rig, scene hay preview phải rewind đúng checkpoint. Lock đã duyệt được giữ; lock mâu thuẫn clock/host mới phải báo sửa/unlock, không tự bỏ lock.

CSP/scene allowlist, local asset hashes, project path/symlink guards, shell=false, secret redaction, timeout, model-call/cost budgets, bounded retries/repair, attempt journals/SQLite vẫn được giữ. JSON Schema mô tả shape; runtime validators còn kiểm tra source, full coverage, target, contact, locks và hashes.

Final yêu cầu ready voice, canonical narration/hash không đổi, draft review pass, host approval hợp lệ và scene/artifact hợp lệ. QC fail không DONE. Studio không hiển thị final của phiên bản cũ như final của input vừa sửa.

V2.2 tách cache rig/clip, stage/asset, performance, camera và rendered shot khỏi narration. Thêm trạng thái cần asset/animation và report lỗi ở schema/API/CLI trước khi sử dụng. Đổi action/mood/style không làm lại audio nếu narration/voice/clock hợp lệ. Profile hoặc clock mới xung đột lock vẫn phải báo rõ.

## 10. Bố cục, render, review và QC

Giữ nền hiện có HyperFrames 0.8.96, SVG/GSAP paused timelines, FFmpeg cho audio/mux/captions/QC. HTML5 dựng stage/layers; CSS dựng appearance/depth; SVG là rig/props có anchors; JavaScript compiler điều khiển tracks theo master clock. “Java” ở yêu cầu được hiểu là JavaScript trình duyệt.

Soft/both captions dùng `literal-tx3g-1`: tạo timed-text track bằng placeholder có dòng ngắn, kiểm tra offset/size/bytes/ms clock, thay UTF-8 có cùng chiều dài rồi stream-copy vào MP4. Xác minh lại stored samples trước media report/QC. Cue vượt65535 bytes hoặc có NUL bị chặn; không sửa text/clock. Media version làm invalidation tổng, giữ narration hợp lệ. SRT export vẫn từ canonical narration. [Contract](docs/LITERAL-SUBTITLES.md) ghi rõ FFmpeg-extracted text vẫn có thể mất whitespace; không gọi stored-byte PASS là strict extraction PASS.

Default final hiện là 1920×1080/30fps, draft 960×540/15fps, tối đa 300 giây/100 shot, budgets cấu hình. V2.2 cần preview diễn xuất tối thiểu 30fps; draft 15fps chỉ phù hợp kiểm tra bố cục. 60fps là lựa chọn cần đo runtime, không phải lời hứa chữa lỗi rig.

Frame state phải suy ra được từ masterTimeMs ở frame 0, seek tiến/lùi hoặc render theo batch. Compiler bake IK/foot plant/blend/attachment states vào scene allowlist; không dựa vào CSS clock độc lập, callback đã chạy, random hay frame trước. Không bỏ CSP/security để tạo animation. Chi tiết compiler và nguồn kỹ thuật ở §13 STICKMAN-STORY-DIRECTION.md.

Chừa vùng caption cuối khung: bottom 4%, tối đa 14% chiều cao. Nhãn phải nằm trong safe layout; cue đầy đủ không vừa phải báo lỗi, không clip mất chữ. V2.1 hỗ trợ wide/medium/close, eye-level, locked/static/push-in/pull-out/pan-left/pan-right với movement nhỏ. V2.2 cần camera framing theo người/target và scene depth; khả năng mới phải cập nhật compiler/validator và chứng minh safe regions.

Review hiện có 5 snapshot/shot tại 0/25/50/75/100%, thêm trước/trong/sau reach/contact và hashes. V2.2 bắt buộc có preview clip và chuỗi frame quanh bước chân, đổi cảm xúc, attach/release và cut; xem tốc độ 1×, slow motion, seek/reverse. Rule review kiểm tra source/timing/geometry/contact/artifact; review diễn xuất kiểm tra mục đích, trọng lượng, face/gaze, continuity và dễ hiểu. Không dùng năm ảnh tĩnh để chứng minh chuyển động mượt.

Report phải phân biệt rule-based/combined, voice source/provider/hash, synchronization và phần chưa xác nhận. Không có vision mà allow_rule_based_review=true có thể tạo final qua kiểm tra kỹ thuật; **đó chưa là nghiệm thu chất lượng hình hoặc kiến thức**, phải xem/nghe bởi model/người test. Có thể đặt allow_rule_based_review=false cho sản xuất yêu cầu vision thật.

QC: codec/resolution/fps/duration, audio presence/hash/duration, sample rate/loudness/true peak/clipping, unexpected black/freeze/silence, subtitle stream và sidecar đúng text/clock, thumbnail/artifacts. Freeze cần xác minh vùng diễn xuất nếu nền tĩnh chiếm nhiều khung; không tắt gate hoặc thêm rung giả để pass. Lỗi high chặn DONE. DONE của một project là checkpoint qua gate cấu hình, không tự chứng minh toàn bộ sản phẩm hoặc style V2.2 đã nghiệm thu.

## 11. Artifacts hiện có V2.1 và bổ sung dự kiến

```text
input/script.txt|script.md, narration.wav, narration.srt  # theo mode
input/source.md, host.md, assets/                       # tùy chọn
work/input-document.json, script.json, script-timing.json
work/narration.json, voiced-narration.json, timeline.json
work/voice-report.json, speech-activity.json, voice/cues/
work/story.json, chapters.json, beats.json, character-bible.json
work/host-profile.json, host-rig.json, explanation-plan.json, host-timeline.json
work/actor-cast.json, actor-timeline.json; assets/actors/<id>/<hash>/
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

Pipeline cinematic đã tạo và export story-direction.json, stage-plan.json, performance-plan.json, camera-plan.json, animation-library.json, performance-report.json và environment-provenance.json. Preview dùng scene/draft/final production và snapshots; benchmark riêng ở temp/animation-v22. Các báo cáo/clip evidence phải đúng producer/hash source đang nghiệm thu.

## 12. Cấu hình mẫu chạy với contract V2.1 hiện có

Ví dụ sau dùng technical-clean/rig sơ đồ. Để bật renderer mới, thêm `presentation: {mode: story-cinematic}`. Không thêm action/field ngoài schema hiện hành; xem IMPLEMENTATION-STATUS.md về phần còn chờ nghiệm thu.

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
  character_mode: actors
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

Bộ nghiệm thu giữ thuần script không WAV/SRT, WAV giữ lời, SRT giữ cue text/clock, WAV+SRT mismatch, thiếu/lỗi TTS/fit không final; hai kiểu tạo hình/hai bài; resume/cache/locks/rebuild và final media QC. V2.2 bổ sung role nhân vật chính, diễn xuất có mục đích, foot plant, face/mood, đạo cụ, liên tục giữa cảnh và deterministic seek. Xem TEST-HANDOFF.md và STORY-ACTOR-DIRECTION.md.

V1 hoặc các ca local V2.1 không được dùng để tuyên bố V2.2 đạt. Build/typecheck không thay nghe giọng Việt và xem diễn xuất. Runtime mới đang được triển khai/nghiệm thu; chỉ đóng release khi matrix và evidence source cuối đạt, ghi riêng trong IMPLEMENTATION-STATUS.md và TEST-RESULTS.md.
