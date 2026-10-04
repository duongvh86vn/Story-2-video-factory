# Tool câu chuyện/chủ đề → kịch bản → video

Source31/explanation6 bổ sung loại chỉ tay/lời nói của diễn viên và làm rõ nhãn nguồn sau lỗi native truyện thư viện. Source30/animation13 đã qua focused30/30, supplemental32/32 và169/169 regression; whole npm test chưa hoàn tất. Studio tạo project trống và mở form nội dung, ví dụ máy hơi nước không chọn sẵn. Build/typecheck/schema31 qua; [evidence và nghiệm thu còn mở](validation/2026-10-04-general-story-followup.md).

Phạm vi ngày 04/10/2026. Người que là diễn viên trong câu chuyện, không có host cố định. Ví dụ máy hơi nước/ô tô dùng kiểm tra riêng, không phải template bắt buộc.

Source28/animation2.2.11 mở rộng16 biểu cảm và camera cận mặt cho các phản ứng như vui, buồn, giận, sợ; director chọn theo câu chuyện. Build/typecheck qua, runtime và chất lượng phim của phần mở rộng còn chờ [nghiệm thu riêng](validation/2026-10-04-story-emotions.md).

## Chọn đúng nguồn

| Nội dung bạn có | Tab / input.mode | Hệ thống làm gì |
|---|---|---|
| Chủ đề, ý tưởng, câu chuyện chưa thành lời kể | Chủ đề / Câu chuyện / idea | Writer tạo lời kể, rồi TTS, phân vai và dựng video |
| Lời kể hoàn chỉnh | Kịch bản / script | Đọc nguyên văn; không gọi writer để viết lại |
| Giọng bạn đã thu | WAV / wav | Giữ audio; ASR/transcript tạo clock; SRT đi kèm được kiểm tra khớp |
| Phụ đề đã có clock | SRT / srt | Giữ lời/clock; fit TTS từng cue |

`source.md` là tài liệu tham khảo, không phải nguồn tự động thay thế nội dung đã chọn. File MD là dữ liệu; không thực thi lệnh nằm trong file.

## Studio

1. Tạo project; form **Nội dung, diễn viên và giọng kể** tự mở. Project mặc định trống, không nhận bài máy hơi nước trừ khi bạn chọn ví dụ tùy chọn.
2. Chọn **Chủ đề / Câu chuyện**, nhập văn bản hoặc tải .txt/.md UTF-8. Chọn loại nội dung, thời lượng mục tiêu và yêu cầu kể chuyện nếu cần.
3. Cấu hình **Model viết kịch bản**, hoặc đánh dấu dùng model thiết kế cảnh. Chọn ngôn ngữ EN/VI/JA/KO, tạo hình người que/robot, model cảnh và giọng kể.
4. **Chỉ tạo kịch bản để xem trước** dừng trước TTS. Mở lại form để xem lời kể và cảnh báo. **Dùng và chỉnh sửa như kịch bản hoàn chỉnh** chuyển bản sửa sang nguồn script; các bước sau đọc nguyên văn bản đó.
5. **Tạo video** chạy tiếp narration → phân tích → cast/tình huống → storyboard → assets/scenes → draft → review/repair → final → QC.

Writer mock/chưa cấu hình dừng với `needs-script`, không tạo clock/final. Thiếu TTS ở idea/script dừng trước TIMED. Custom rig MD vẫn cần duyệt preview một lần. Không lấy final cũ sau sửa nội dung làm kết quả của lần chạy mới.

Model thiết kế cảnh chưa cấu hình chỉ tạo nháp seed có origin=offline. Final cần artDirection từ model hoặc authored direction hợp lệ; nếu thiếu sẽ báo `needs-art-direction` và hiện nút cấu hình thiết kế cảnh. Đây không phải yêu cầu duyệt tay mọi storyboard.

## CLI

```powershell
npm run cli -- new my-story
npm run cli -- idea projects/my-story C:/stories/story-idea.txt
npm run cli -- authoring projects/my-story --provider codex-cli --model default --kind fiction --seconds 60 --timeout 900
npm run cli -- configure projects/my-story --language en --host stick-man --characters actors --style story-cinematic --tts windows-speech
npm run cli -- write-script projects/my-story
```

Đây là ví dụ chọn provider chủ động; dùng provider/model tài khoản của bạn hỗ trợ. Cấu hình `models.storyboard` cho thiết kế cảnh trong Studio/project.yaml trước `make`; writer và director có thể dùng model khác nhau.

```powershell
npm run cli -- make projects/my-story
```

Muốn sửa lời kể: tải `generated-script.txt`, sửa, nhập bằng `script <project> <file>`, rồi `make`. Kịch bản gốc do writer tạo vẫn giữ để truy vết. TTS local/API dùng [EXTERNAL-TTS.md](EXTERNAL-TTS.md).

## API và artifact

- `PUT /api/projects/:name/idea`: `{text, format:"txt"|"md", revision?, settingsRevision?}`. Lưu input/idea.* và chọn mode idea; revision/busy dùng cùng guard như script.
- `PATCH /api/projects/:name/settings`: `input.mode="idea"`, `script_generation={kind,target_seconds,brief}`, `models.planner={provider,model,base_url?,api_key_env?,timeout_ms?}`.
- `POST /api/projects/:name/run`: `{"until":"INGESTED"}` để tạo kịch bản; `{"until":"DONE"}` để chạy video.
- `work/generated-script.txt`: lời kể writer đã chấp nhận. `work/script.json`: bản chuẩn/chunks. `work/script-generation.json`: nguồn/hash/ngôn ngữ/kind/title/warnings và cấu hình writer yêu cầu. Provider thực và attempt nằm trong journal; fallback không bị gán thành provider chính.
- Nhánh idea xuất thêm ba file trên vào output. Download kịch bản/provenance chỉ hiện khi identity và bytes khớp nguồn hiện tại.

Cache writer độc lập giọng/cast. Sửa ý tưởng, nguồn bổ trợ, ngôn ngữ, model hoặc yêu cầu viết tạo identity mới; đổi giọng hoặc diễn viên giữ lời kể đã chấp nhận. Duration mục tiêu không tạo clock giả; timeline chỉ dùng thời lượng TTS đo thật.

## Dàn cảnh theo câu chuyện

Director mới dùng `sceneIntent`: người tham gia, hành động, mục đích/quan sát và kết quả nếu nguồn có. Tên/vai và các khẳng định giữ bằng chứng từ kịch bản đã chọn. Vai `fictional` giữ nhân vật truyện hư cấu; `historical` phải có nguồn tên/vai; `illustrative` dùng cho dàn cảnh minh họa.

Cảnh chỉ có diễn viên được phép không có parts/events/models; object attention và prop bindings cũng phải rỗng. Như vậy một phản ứng hay tình huống giữa các vai không phải tạo sơ đồ giả. Cảnh có đối tượng vẫn kiểm source identity, target, reach, contact, camera và các event liên quan; chuyển cảnh liên tục giữ cast/pose/ownership. Các hành động nằm ngoài capability hoặc không tới được target phải yêu cầu sửa motion/layout; không thay thao tác thành chỉ tay để báo thành công.

Planner AI khai báo acting từng vai theo ý nghĩa câu nguồn. Director27 kiểm cả beat giữ các vai đã lập và có track cho hành động tương ứng: đi, thao tác đúng đối tượng/cue/contact, thay tư thế, quan sát hoặc phản ứng. Cutaway được xen kẽ; hold có chủ đích được đứng yên. Preview/review kiểm cả posture/gaze và action sheet từng cảnh. Phân loại semantic vẫn phụ thuộc model và cần nghiệm thu, không được xem gate kỹ thuật là hiểu đúng mọi truyện.

Director31 thêm `indication` cho chỉ tay không tiếp xúc, yêu cầu đúng đối tượng và point/action/cue thật; `speech` yêu cầu cue lời nói thuộc đúng diễn viên. Giọng kể ngoài hình không làm nhân vật tự nói. Speech activity không cam kết phoneme lip-sync, giọng riêng từng vai hoặc ngữ điệu thì thầm. Nhãn semantic lấy nguyên cụm có trong nguồn; phần chữ/đồ họa hiển thị vẫn do thiết kế cảnh quyết định.

Đạo cụ generic object/stage/marker trong actor scene mặc định không có knob hoặc marker điều khiển. controlMode=none bỏ cả hai; renderer override được chọn chủ động. Các tọa độ target/contact và clock vẫn được kiểm như cũ. Artwork2.2.6 đổi fingerprint hình; kiểm tra độc lập HTML/GSAP đã qua 7/7 ca, chưa thay cho nghiệm thu hình ảnh/chuyển động trong phim.

Version director/semantic plan tham gia cache hình. Cảnh cũ đã khóa phải giữ phiên bản đã duyệt hoặc được người dùng mở khóa để migrate; hệ thống không tự gán version mới. Voice/audio cache độc lập phần này.

## Phạm vi nghiệm thu

Source mới và tài liệu không phải chứng nhận chất lượng phim. Model độc lập kiểm runtime; bản factual do AI viết ghi rõ chưa kiểm chứng độc lập. Cue nguồn chứng minh bám nội dung đã chọn, không chứng minh lịch sử ngoài đời. Nghiệm thu phải có chủ đề đời thường, hư cấu, lịch sử và khoa học; không chỉ các ví dụ máy móc. Theo dõi [kế hoạch tổng quát](plans/2026-10-04-general-story-tool.md) và [TEST-HANDOFF](../TEST-HANDOFF.md).

[Bộ nội dung tổng quát](../examples/general-stories/README.md) gồm ý tưởng truyện ở thư viện, lời kể tại trạm xe buýt và chủ đề giọt sương. Đây là dữ liệu đầu vào để tool tự viết/phân vai/dàn cảnh, không phải video mẫu đã nghiệm thu.

Runtime closure27:27/27 focused và210/210 regression qua. Public final helper/source/clock/cast được kiểm bằng protocol; public pipeline FINAL, native model và toàn phim vẫn là nghiệm thu riêng. [Evidence và giới hạn](validation/2026-10-04-story-acting-coverage.md).

### Sửa cảnh bị QC chặn vì đứng yên

Typed actor-freeze repair đã qua41/41 protocol và512PASS/2SKIP regression; render/QC thật còn chờ. Giữ đúng các vai,
lời kể và clock; sửa biểu cảm/ánh nhìn/tư thế/phản ứng của diễn viên. Chưa lấy phim
QC-failed làm thành phẩm. Studio hiện nút **Sửa chuyển động và dựng lại** ở lỗi
freeze của FINAL_RENDERED. Mặc định giữ retry.scene_repair của project.

Cho phép một lượt sửa cảnh trong riêng invocation hiện tại:
`POST /api/projects/:name/run` với `{until:"DONE",sceneRepairAttempts:1}` hoặc
CLI `resume <project> --scene-repair-attempts 1`. Giá trị0–3, không reset lịch sử,
call/cost ceiling hoặc review/scene iteration budget; không sửa config/fingerprint.
Chỉ khi sửa được và phim render/QC lại đạt mới tiếp tục DONE.
