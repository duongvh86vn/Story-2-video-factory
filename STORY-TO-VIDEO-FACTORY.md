# STORY-TO-VIDEO FACTORY — DIỄN VIÊN TRONG CÂU CHUYỆN

**Cập nhật source0.99:** [Đi/chạy/nhảy/cúi ở góc lưng riêng](docs/topics/REAR-LOCOMOTION-HANDOFF.md). Bốn own PNG/SHA/canvas garment cages, `registered-rear-locomotion-v1`; cùng native body/cloth kernel và original sourceBody qua camera cut/đổi vai. Clock13/schema/API/workbench/acting brief/report/cache/manifest cập nhật. Không cấp face/chin/secondary/seat/tools/turns; không mượn profile3/4 hoặc suy yaw. Tám callback DECLARED / NOT RUN. Khớp/viền áo/diễn xuất và toàn story/script/WAV→video vẫn chưa nghiệm thu; productionReady=false, productionRig=null, availableBanks=[] và needs-source-prop-binding giữ nguyên. Mốc0.98 trở xuống là lịch sử.

**Cập nhật source0.98:** [Tóc/râu theo góc nghiêng riêng](docs/topics/PROFILE-SECONDARY-HANDOFF.md). `registered-profile-secondary-v1` bind bốn own PNG/SHA/canvas, tám vùng crest/tail/beard; cùng original head/body clock và mask mắt/miệng/chân mày, camera lấy bounds của mesh. Clock12, schema/API/workbench/report/cache/manifest cập nhật. Tám callback DECLARED / NOT RUN. Vùng tách/seam/silhouette/khớp/diễn xuất và toàn story/script/WAV→video chưa nghiệm thu; productionReady=false, productionRig=null, availableBanks=[] và needs-source-prop-binding giữ nguyên. Mốc0.97 trở xuống là lịch sử.

**Cập nhật source0.97:** [Đi/chạy/nhảy/cúi theo góc nghiêng riêng](docs/topics/PROFILE-LOCOMOTION-HANDOFF.md). Bốn own PNG/SHA/canvas có garment cages riêng, `registered-profile-locomotion-v1`; pinned belt/lagged hem dùng cùng native body kernel. Complete sourceBody giữ body/cloth clock qua camera cut và đổi vai; không mượn3/4 source hoặc bật front/rear/seat/tools/turns. Tám callback DECLARED / NOT RUN. Khớp, garment seams/viền quần, diễn xuất và toàn story/script/WAV→video chưa nghiệm thu; productionReady=false, productionRig=null, availableBanks=[] và needs-source-prop-binding giữ nguyên. Mốc0.96 trở xuống là lịch sử.

**Cập nhật source0.96:** [Biểu cảm riêng chính diện/nghiêng](docs/topics/OWN-VIEW-EXPRESSIONS-HANDOFF.md). Sáu bộ own PNG/SHA/canvas có tám chân mày nhìn thấy; `registered-basic-expressions-v1` cần đúng own eyes/mouth. Clock gốc chuyển16mood; môi khép khi nghe, aperture chỉ theo cue của actor. Mask chân mày/mắt/miệng độc lập, không warp/mirror hoặc mượn ROI3/4. Tám callback mới DECLARED / NOT RUN. Skin/ink/contour seams, diễn xuất và story/script/WAV→video còn chờ test; productionReady=false, productionRig=null, availableBanks=[] và needs-source-prop-binding giữ nguyên. Mốc0.95 trở xuống là lịch sử.

**Cập nhật source0.95:** [Thoại riêng chính diện/nghiêng và clock đúng diễn viên](docs/topics/OWN-VIEW-SPEECH-HANDOFF.md). Sáu vùng miệng dùng đúng PNG/SHA/canvas, lựa chọn tường minh `registered-basic-mouth-v1`; Lila giữ smile nguồn khi im lặng, Karo dùng ứng viên contour khép. Miệng mở theo speech activity/clock gốc, không phải phoneme lip-sync. Mask miệng/mắt độc lập; không mirror hoặc mượn vùng mặt3/4. Thêm tám callback DECLARED / NOT RUN. Ghép da/viền/khẩu hình, diễn xuất liên tục và toàn story/script/WAV→video còn chờ model test; productionReady=false, productionRig=null, availableBanks=[] và needs-source-prop-binding giữ nguyên. Các mốc dưới là lịch sử.

**Hiện hành0.44 — 08/10/2026, source candidate:** thêm `actorTarget:{id,anchor:'eyes'}` để hai diễn viên nhìn theo vị trí mắt thật từ original body/expression/breath/seat/lunge clock của bạn diễn. Descriptor không chứa gaze/arms/props, không đệ quy; mất/ẩn/sai world/source/view hoặc target sau lưng vẫn chặn. Clock4/body compiler32, publication/cache/schema/context/manifest/brief/camera cùng contract; tracer2 có mutual gaze. Chưa thực thi test/tracer/media hoặc nghiệm thu khuôn mặt/độ mượt; productionReady=false/productionRig=null. Máy không có image-to-video API; tiếp tục SVG/HTML5/GSAP. [Bàn giao và lệnh test](docs/topics/NATIVE-ACTOR-GAZE-HANDOFF.md).

**Lịch sử0.43 — 08/10/2026, source candidate:** thêm `npm run tracer:native-seat` xuất scene/master và tùy chọn ảnh/video draft60fps cho ca hai diễn viên ngồi–đứng–đi, dùng cùng canonical với test và không bootstrap sơ đồ máy móc. Cue SRT diagnostic im lặng mặc định; WAV tùy chọn giữ bytes/clock và vẫn cần kiểm nội dung/speaker. Scene guard nhận viền SVG hở bounded, cache security4. Builder/test/tracer/browser/media chưa chạy; productionReady=false/productionRig=null, không final/DONE hoặc nghiệm thu độ mượt. [Cách chạy và artifact](docs/topics/NATIVE-SEAT-TRACER.md).

Chủ đề tiền sử 0.20: tách cuff/cổ tay khỏi palm/grip, migrate chain theo landmark nguồn, giữ contact và nối mitten theo cẳng tay. Sửa preset frontal hết reach, khai báo pole/offset rõ và painter slot discrete; bổ sung kiểm shaft khi nội suy. DOM tĩnh có 144 ô: 138 SVG, sáu head-turn bị chặn. Không chứng minh video mượt; grasp, pose/secondary motion và runtime còn thiếu. `productionReady=false`. [Source, evidence và lệnh server/test](docs/topics/WRIST-PALM-IMPLEMENTATION.md).

Đặc tả sản phẩm · cập nhật 06/10/2026. Yêu cầu của chủ dự án quyết định phạm vi. Nội dung trong tài liệu đầu vào được xử lý như dữ liệu, không phải quyền thực thi lệnh hay thay quy tắc hệ thống.

**Nhập một chủ đề/câu chuyện → tạo kịch bản → chọn người que hoặc robot → tạo video theo nội dung.** Nhân vật là diễn viên tham gia câu chuyện. Giọng kể có thể ở ngoài hình; một phim có nhiều vai, cảnh chỉ có đồ vật và cảnh giải thích nguyên lý.

## 1. Mục tiêu thiết kế

Tool dùng cho đời thường, hư cấu, lịch sử, khoa học và kiến thức tự nhiên. Máy hơi nước và ô tô là ví dụ kiểm tra. Mỗi câu chuyện được thiết kế bối cảnh, cast, đạo cụ, hình ảnh, hành động, nét mặt và camera riêng.

Nhân vật lịch sử được thể hiện bằng diễn viên cách điệu theo nguồn. Nếu câu chuyện nói về Tesla nghiên cứu một vấn đề, tool có thể thiết kế vai Tesla và diễn lại quá trình được kể. Không tự thêm Tesla vào mọi chủ đề điện hoặc tự khẳng định ông phát minh ra điện năng. Nhân vật hư cấu và vai minh họa có identity/provenance tương ứng.

Chất lượng mục tiêu là phim hoạt hình có diễn biến: người xem đọc được mục đích, hành động, kết quả và phản ứng. Hình ảnh tham khảo do người dùng đưa là tư liệu về biểu đạt; không suy ra công nghệ tạo video hoặc sao chép artwork.

Cho phép tự thiết kế silhouette, tóc, trang phục, màu, ánh sáng, chiều sâu, SVG, nhịp cảnh và bố cục. Giữ identity từng vai cùng các khóa đã duyệt. Không có người dẫn cố định, phần trăm xuất hiện bắt buộc, chiều cao nhân vật cố định hoặc lịch tám recipe phải dùng hết.

## 2. Nhánh ý tưởng và ba luồng narration

| Chế độ | Đầu vào chính | Lời kể và thời gian |
|---|---|---|
| `idea` | Chủ đề/câu chuyện thô, `input/idea.txt` hoặc `.md` UTF-8 | Writer phát triển thành lời kể hoàn chỉnh, sau đó dùng luồng script |
| `script` | Nhập trực tiếp, `input/script.txt` hoặc `.md` UTF-8 | TTS đọc nguyên văn; clock từ audio thực đã đo |
| `wav` | `input/narration.wav` | Giữ giọng/audio; ASR tạo transcript và timestamp |
| `srt` | `input/narration.srt` | Giữ cue text và clock; TTS đọc từng cue và fit |

WAV + SRT thuộc luồng WAV: giữ cả audio và cue/clock, kiểm tra độ khớp trước final. Không đổi tốc độ WAV để che mismatch; thiếu backend alignment hoặc mismatch phải báo rõ và chặn final.

`input.mode` quyết định nguồn chính. `auto` chỉ nhận một nhóm nguồn, WAV+SRT là một nhóm; nhiều nhóm cùng tồn tại phải chọn mode. `source.md` là tài liệu bổ trợ tùy chọn, không phải kịch bản. MD nhân vật mô tả rig nền. Không tài liệu nào cấp quyền chạy shell/tool hoặc thay lời kể.

### Chủ đề/câu chuyện → kịch bản

Writer dùng `models.planner`, có kind auto/factual/fiction, brief và thời lượng mục tiêu. Thời lượng mục tiêu chỉ hướng dẫn viết, không phải clock audio. Lưu nguyên liệu gốc, kịch bản, title/kind/warnings và provenance; factual do model viết có nhãn chưa kiểm chứng độc lập.

Người dùng có thể chỉ tạo kịch bản, xem/sửa rồi chuyển sang script, hoặc bấm Tạo video để chạy tiếp. Thiếu writer thật báo `needs-script` trước TTS/timeline; không dùng mock để giả một kịch bản đã viết. Khi đã chọn script hoàn chỉnh, các bước sau không tự viết lại, dịch hoặc thêm thoại.

### Script → narration có clock

1. Nhận UTF-8 tối đa128KiB, không NUL; lưu bản gốc, hash và nguồn dòng.
2. Bỏ định dạng Markdown thông thường và YAML frontmatter; hiển thị văn bản sẽ đọc. Câu mang hình thức mệnh lệnh vẫn là nội dung lời kể, không được thực thi.
3. Chia tại dấu câu/khoảng trắng, mặc định tối đa120Unicode characters/đoạn, giữ toàn bộ từ và thứ tự; từ vượt giới hạn phải báo lỗi. Nhật dùng ranh giới ICU/dấu câu, giữ separator để khôi phục nguyên văn.
4. TTS từng đoạn ở tốc độ mặc định; đo WAV thực sau chuẩn hóa sample rate. Một đoạn TTS đồng thời là một cue phụ đề.
5. Ghép audio tuần tự; thêm250ms giữa đoạn văn. Tạo cue/timeline từ thời lượng đã đo, không ước lượng trước rồi ép giọng vào đó.

Thiếu/lỗi TTS ở idea/script dừng trước TIMED và timeline chính thức, báo `needs-voice`/provider-failed. Không final/DONE. SRT thiếu giọng có thể dựng nháp im lặng có nhãn, vẫn chặn final. Artifact cũ không chứng minh input mới đã thành công.

### SRT → narration theo clock có sẵn

Đọc nguyên văn từng cue; đặt audio vào timestamp và giữ khoảng trống thành silence. Fit dùng atempo giữ cao độ, mặc định0.85–1.20; câu ngắn được padding. Câu dài vượt giới hạn hoặc audio sau fit vẫn vượt cue báo fit-failed. Không trim mất lời, viết lại câu hoặc đổi timestamp.

Các luồng có clock tạo chung `narration.json`, `timeline.json`, `voice-report.json`, `speech-activity.json`; voice-report phân biệt fitted speech và silence padding.

## 3. Ngôn ngữ và TTS ngoài

Hỗ trợ cấu hình English, Tiếng Việt, 日本語, 한국어 (`en`, `vi`, `ja`, `ko` hoặc locale), độc lập ngôn ngữ UI. Giọng phải hỗ trợ ngôn ngữ được yêu cầu; không đổi sang tiếng Anh để thay một giọng khác đang thiếu. ASR dùng ngôn ngữ tương ứng; phụ đề/nhãn có font fallback. Không tự dịch narration, tên vai hay artwork nguồn.

Preset theo locale/ngôn ngữ, mặc định trong `config/voice.yaml`, override theo project. Có adapter Windows Speech, HTTP, command, Azure Speech và API compatible/local/OmniVoice Studio. Adapter có code và protocol không đồng nghĩa backend/giọng thật đã nghiệm thu.

HTTP chung: POST endpoint, JSON `{text, language, voice, format:"wav"}`, nhận WAV bytes. Command chạy `shell=false`, nhận request JSON UTF-8 và output path qua tham số, có timeout. API compatible/OmniVoice có model/field mapping/extra body; các field bảo vệ không bị ghi đè. Token dùng env, không ghi vào project/YAML/log. Contract, ví dụ và giới hạn tại [EXTERNAL-TTS.md](docs/EXTERNAL-TTS.md).

Pipeline TTS ngoài dùng chung chuẩn hóa WAV, probe thời lượng, cue fit, cache, speech activity và QC. API local do người dùng phát triển có thể nối vào đây khi cấu hình endpoint và giọng thật.

## 4. Phân tích, cast và kịch bản hình ảnh

Mỗi beat giữ mục tiêu khán giả cần hiểu, cue/nguồn, người tham gia, hành động và đối tượng/quan hệ có nguồn. Tên, vai, identity và statement phải khớp narration; statement giữ nguyên câu, gồm phủ định. Những vai không tên là vai minh họa có nguồn, không được tự bịa tên riêng/sự kiện.

Cast thiết kế theo câu chuyện bằng người que hoặc mini-robot có khớp. Giữ tạo hình từng vai xuyên các cảnh; cho phép giống nhau có chủ đích. Tóc/trang phục/đạo cụ giúp đọc vai nhưng không biến minh họa thành ảnh tư liệu. Preview/chỉnh/khóa từng vai có sẵn. Rig chuẩn đã duyệt chạy tự động; rig MD tùy chỉnh cần duyệt preview một lần trước sản xuất.

Kịch bản hình ảnh xác định ai ở đâu, muốn gì, làm gì, gặp điều gì và có kết quả nào được kể. Không ép công thức thất bại–bất ngờ–thành công khi đầu vào không có. Cảnh quan sát, thử nghiệm, cơ chế, cận mặt, tiếp xúc hoặc môi trường được chọn theo nội dung; sơ đồ là một phương tiện biểu đạt.

Canonical acting gồm locomotion, manipulation, posture, observation, indication, speech, reaction, hold hoặc unsupported. Có subtype walk/jump và contact/pick-place/carry/drop. `targetIds` chỉ đúng đối tượng nguồn. Bộ dựng cảnh phải giữ toàn bộ nghĩa vụ theo vai/câu/clock; cutaway không thay mất tình huống hoặc hành động đã được chấp nhận. Unsupported phải báo cần bổ sung/sửa khả năng trước final.

Giữ eight visual methods: question, mechanism, process, evolution, comparison, breakdown, event-sequence, summary. Chọn khi phục vụ nội dung; ID recipe có `host-` chỉ là tương thích dữ liệu, không buộc một host thuyết trình. Không biến toàn phim thành grid icon, portrait, slideshow hoặc thẻ chữ.

Entity label/identity/states và quan hệ dùng nguồn có thể kiểm chứng; mũi tên nhân quả cần evidence. Cùng xuất hiện không đủ chứng minh nguyên nhân. High source conflict chặn final. Cue citation chứng minh bám narration, không tự chứng minh mọi claim factual đúng. Tạo hình/cơ cấu minh họa ghi `visualization/conceptual`; chi tiết lịch sử sai phải báo sửa thay vì dùng asset gần giống.

## 5. Diễn xuất và hình học

Diễn xuất có chuẩn bị, thay đổi, đáp lại và phục hồi. Mắt nhìn đúng người/vật; cảm xúc có nguyên nhân. Đi có foot plant và chuyển trọng tâm. Tay nối vai–khuỷu–cổ tay, giữ chiều dài xương; tư thế thả tay mở khuỷu tự nhiên theo hình người dùng, không đảo khuỷu đột ngột hoặc stretch để với tới target xa.

Hai kênh tay độc lập dùng cùng hand ở action/gesture; một tay không có hai gesture chồng nhau. Theo rig hiện tại, left/right là phía rig/ảnh, chưa chứng nhận ánh xạ giải phẫu sau xoay. Với, point và inspect dùng target/anchor thật. Thao tác tiếp cận và contact trước phản ứng của vật. Event đòi hai tay phải kiểm đúng hai tay, actor, vật và clock.

Posture hỗ trợ đứng/cúi/nghiêng và seated có ghế/support cùng world. Ngồi/đứng giữ chân sàn, mông đúng ghế, bone length và seat ownership; đứng trước khi đi/quay/đổi ghế. Không giả hỗ trợ quỳ, khuấy, joint moving-prop hoặc handoff ngoài contract hiện hành.

Nhảy có chuẩn bị, takeoff, flight hai chân rời sàn, landing và absorption; không thay bằng đi hoặc nhấp nhô cả hình. Drop theo tay đang giữ tới release, sau đó rơi với trọng lực và vận tốc tay thật; không bịa đích ngang để đẩy vật. Track mới dùng `performance-2.2.14`; grounded cũ tiếp tục dùng version hợp lệ của nó.

Prop chuyển động bind với đúng model có nguồn, một chủ tay và một thao tác hoàn chỉnh trong shot. Primary actor sở hữu moving prop; supporting actor có thể diễn/contact vật đứng yên nhưng chưa sở hữu primary binding. Có thể đổi primary qua một cut có chủ đích. Mang cần pha nhấc/hạ và phục hồi; các giới hạn cụ thể ở [STORY-ACTOR-DIRECTION.md](STORY-ACTOR-DIRECTION.md) và [bound-model contract](docs/validation/2026-10-03-bound-model-motion.md).

`gesture.target/destination` là điểm nắm, `prop.origin/destination` là tâm vật; điểm nắm = tâm + gripOffset × performance.scale. `visualization.parts/continuity.models` là normalized stage fractions, rig/root/prop/gesture là stage pixels. Action/cue/event dùng clock toàn narration; performance clip dùng clock shot-local. Action khớp hand/start/end/contact của gesture sau cộng shot.startMs và đúng cue anchor.

Continuous giữ cast, exit/entry, hướng, scale, posture, seat và world state. Cut cho phép đổi tình huống/vị trí/bối cảnh. Một entry drop đã cầm có nguồn được phép theo contract riêng; không suy ra handoff/carry xuyên cut. Moved model exit là state chung của cảnh, không bị rewind khi kiểm diễn viên phụ.

Artwork có thể khai báo điểm chạm riêng bằng artDirection.models[].handleAnchor:{x,y}, finite0–1 theo viewport part. partAnchor dùng cùng điểm cho action/gesture/controller/rendered control; center/label và fallback legacy giữ nguyên. SVG aspect padding phải được tính vào thiết kế. Binding giữ origin là tâm vật, gripOffset đúng scale; không stretch tay. EventcontactRequired bắt đầu strict sau contact và action phải bao phủ hết event. Field mới đã triển khai/build, runtime/visual verification còn chờ; [contract và giới hạn](docs/ARTWORK-CONTACT-ANCHORS.md).

Voiceover không làm mọi diễn viên mấp máy miệng. Chỉ vai có speakingSegmentIds tương ứng dùng speech activity của audio. Đồng bộ miệng theo speech activity không được gọi là phoneme lip-sync.

## 6. Pipeline, Studio và khả năng sửa

```text
idea → writer ───────┐
script/WAV/SRT ──────┴→ narration có clock → analysis → explanation/canonical acting
  → cast/world/performance/camera → storyboard → assets/rig → compile scenes
  → voiced draft → review/repair → final → QC → DONE
```

Studio: Chủ đề/Câu chuyện, Kịch bản, WAV, SRT → kiểu diễn viên/giọng/ngôn ngữ → Tạo video. Xem/sửa kịch bản, storyboard, cast, clip preview, lock và rebuild có sẵn; automatic không bắt buộc duyệt storyboard. Project mới dùng story-cinematic/actors và mở form nội dung. Ví dụ là tùy chọn.

CLI/API dùng cùng contract, gồm input mode/editor/upload, authoring/write-script, make/resume/status/approve, settings/revision, lock/edit/rebuild, voice presets và waitingFor. Narration/story artifact sinh ra chỉ đọc; đổi lời kể qua input/script/SRT/WAV, đổi hình qua kế hoạch rồi compile.

Project cũ giữ mode/renderer được chọn, không âm thầm thay phim đã duyệt. Presenter/legacy là tương thích dữ liệu cũ, không chứng minh chất lượng chế độ diễn viên.

## 7. Cache, resume và gate sản xuất

Cache writer theo ý tưởng/nguồn/ngôn ngữ/prompt/model; cache TTS theo text/provider/voice/language/endpoint/command/settings/audio hash. Đổi giọng làm lại narration; đổi cast/hình giữ audio/clock còn hợp lệ. Source bổ trợ sửa chỉ làm lại phân tích/hình cho narration nguyên văn; với idea nó còn là nguồn viết nên làm lại script.

Resume kiểm hashes/producer/binding/schema và checkpoint. Giữ accepted artifact và lock còn hợp lệ; lỗi/missing/edited artifact rewind đúng bước. Accepted partial planning cache cần domain receipt, provider response/journal và current normalizer; rejected aggregate không được promote. Settings chưa được ghi ở lịch sử không được attested hồi tố.

Đổi source/clock/rig xung đột lock phải báo rõ, không tự bỏ lock. Accepted artwork cache không bị redesign chỉ vì thêm lời hướng dẫn generation. Model sửa output bị từ chối nhận đầy đủ lỗi canonical, giữ nguyên narration/nguồn; không đổi thao tác thành đứng chờ để pass.

Giữ CSP/scene allowlist, local asset hashes, path/symlink guard, shell=false, secret redaction, timeout, model-call/cost cap, bounded repair, journal và database. Chỉ code compiler đã kiểm mới chạy; không thực thi HTML/JS tùy ý từ model/tài liệu.

Final cần voice thật ready, narration/clock đúng, nguồn/identity/target/contact/rig/scene/lock hợp lệ, review pass và QC pass. Thiếu model thiết kế/artDirection thật giữ nháp có nhãn và báo needs-art-direction; thiếu giọng, mismatch, fit failure, nguồn high hoặc media lỗi không final/DONE. UI không hiển thị stale final như kết quả input mới.

## 8. Render, review và chất lượng

Renderer hiện hành: HyperFrames HTML5/CSS/SVG/JavaScript, GSAP paused timeline, FFmpeg audio/mux/captions/QC. “Java” ở yêu cầu chỉ JavaScript trình duyệt. Plugin Remotion đã dùng để đối chiếu workflow; chưa có adapter Remotion chọn được, không tuyên bố đã hỗ trợ backend đó.

Mọi frame suy ra từ masterTimeMs, gồm seek tiến/lùi và batch render. IK, foot plant, blend, attachment, props và camera được compile; không phụ thuộc callback/wall clock/random/frame trước. Artwork keyframe ease và coordinateSpace dùng contract hiện hành; nền world/floor đi cùng camera với diễn viên, frame/overlay dùng cho lớp cố định.

Camera/framing chọn để đọc rõ vai, nét mặt, tay, nguyên lý và kết quả. Kiểm head/antenna, tay/chân, target, prop và flight/landing envelopes trong viewport ở cả endpoint. Không áp quota kích thước nhân vật; detail crop dùng đúng face/contact/object contract. Chừa vùng caption; không clip/thu nhỏ chữ tới mức không đọc được.

Default final1920×1080/30fps; project cinematic mới draft30fps, kích thước960×540. Override/project cũ giữ fps đã chọn. Giới hạn nền300s/100shot và budgets được cấu hình. 60fps không tự chữa rig/diễn xuất. Caption bottom4%, tối đa14% chiều cao; vượt layout phải báo lỗi, không cắt nội dung.

Phụ đề giữ nguyên text/clock; soft/both dùng verified literal timed-text track, sidecar canonical SRT. Stored-byte check không tự chứng minh mọi công cụ extraction giữ whitespace. Chi tiết tại [LITERAL-SUBTITLES.md](docs/LITERAL-SUBTITLES.md).

Review có ảnh theo shot và các mốc posture/gaze/reach/contact/foot/emotion/attach/release/cut; phân biệt rule-based và native vision với ảnh thật. Năm ảnh tĩnh không chứng minh chuyển động mượt. Nghiệm thu cần xem/nghe toàn phim ở1×, đọc hành động/biểu cảm/kể chuyện, kiểm seek/reverse và đối chiếu finding với khung hình gốc.

QC gồm codec/resolution/fps/duration, audio/hash/sample rate/loudness/peak/clipping, black/freeze/unexpected silence, caption stream/sidecar, thumbnail/artifacts. Không thêm rung giả hoặc tắt freeze gate để che diễn viên cứng. Một project DONE qua gate cấu hình không tự chứng minh thẩm mỹ hoặc toàn sản phẩm đã đạt.

## 9. Artifacts và bàn giao

Input giữ nguyên liệu gốc. Work có script/provenance, narration/timeline/voice/activity, story/chapter/beat/explanation, character bible/cast/timeline, host profile/rig, direction/stage/performance/camera/animation library, storyboard/assets/scenes/previews/review và journals. Scene có HTML/CSS/JS/geometry được compiler kiểm.

Output gồm MP4 có giọng, SRT, thumbnail, script/provenance của idea, narration/timeline, storyboard, host/actor profile và timeline, assets/manifest, direction/performance/camera và báo cáo production/voice/review/QC/cost. Artifact và evidence phải đúng producer/hash đang chạy.

Hướng dẫn thao tác và triển khai: [GENERAL-STORY-TOOL.md](docs/GENERAL-STORY-TOOL.md), [IMPLEMENTATION-STATUS.md](IMPLEMENTATION-STATUS.md), [V2-IMPLEMENTATION-PLAN.md](V2-IMPLEMENTATION-PLAN.md). Runtime giao model khác; parent triển khai và build/typecheck. GitHub bàn giao theo repo chủ dự án đã chỉ định.

## 10. Trạng thái và nghiệm thu

Ca sinh nhật gốc giữ lời kể/audio51.421s/12cues và7accepted analysis receipts; native continuation đã đóngFAIL tại storyboard,28started/28completed/0pending,2/30calls còn lại,review0/2. Candidate cuối còn chair anchor/reach/contact-clock errors; chưa render/video/native image review/full watch-listen. [Formal native và parent closeout](docs/validation/2026-10-06-native-ensemble-closeout.md).

Code443220f giữ sourced sceneIntent và có optional artwork handleAnchor/grip/event diagnostics; parent build/test:typecheck/schema qua. Hai đợt độc lập source-context494PASS/0FAIL/2SKIP và corrected contact229PASS/0FAIL/1SKIP exit0; custom-handle GSAP/outbound sáu assertions chưa chạy do fixture ESM, specific cache parity/browser/film còn chờ. Tester completion/counter receipt thiếu; parent chỉ đọc hashes/kernel và giữ khoảng trống thủ tục. Chủ dự án giao model test khác: [bàn giao cụ thể](docs/NEXT-MODEL-TEST-HANDOFF.md), [phạm vi kết quả](docs/validation/2026-10-06-sourced-world-contact.md).149checks trên source trước,306source/creative và82cache có phạm vi riêng; không dùng các số này hoặc V1 chứng nhận phim/toàn tool. Mọi FAIL/gap giữ trong [TEST-RESULTS.md](TEST-RESULTS.md) và validation history.

Nghiệm thu còn mở: idea/script thuần không WAV/SRT; WAV giữ lời; SRT giữ cue/clock; WAV+SRT mismatch; thiếu/lỗi TTS/fit không final; cả hai rig trong hư cấu/đời thường/lịch sử/kiến thức tự nhiên; EN/VI/JA/KO và backend TTS thật khi có cấu hình; sửa nội dung/giọng/cast, cache/resume/lock/rebuild; media/subtitle/QC và xem/nghe toàn phim. Build, fixture authored, stub, rule review hoặc một video ví dụ không đóng toàn matrix.
