# Tool câu chuyện/chủ đề → kịch bản → video

Sản phẩm nhận chủ đề/câu chuyện, lời kể hoàn chỉnh, WAV hoặc SRT. Nội dung quyết định kịch bản, các vai, bối cảnh và cách dàn cảnh; người que/robot là diễn viên. Ca tiếng Anh trạm xe buýt đã public resume/QC PASS, nhưng tạo hình/cảnh/normal-speed watch/listen và real vision vẫn chưa được nghiệm thu. [Kết quả có phạm vi và giới hạn](validation/2026-10-05-rainy-native-resume.md).

Phạm vi ngày 04/10/2026. Người que là diễn viên trong câu chuyện, không có host cố định. Ví dụ máy hơi nước/ô tô dùng kiểm tra riêng, không phải template bắt buộc.

Diễn xuất hỗ trợ tư thế, hai tay độc lập, ánh nhìn và16 biểu cảm. Cận mặt, cảnh tương tác nhiều vai và cảnh đồ vật/môi trường được chọn theo nội dung. Thiết kế không bắt buộc bộ mẫu máy móc.

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

Typed actor-freeze repair có kiểm tra protocol độc lập. Lượt sửa model thật gần nhất bị từ chối vì động tác react có target sai contract; chưa có phim mới. Schema/prompt react và contract màu đã qua kiểm tra độc lập50/50 +11/11, build/typecheck/export schema qua; chưa có render/QC mới. Giữ đúng các vai,
lời kể và clock; sửa biểu cảm/ánh nhìn/tư thế/phản ứng của diễn viên. Chưa lấy phim
QC-failed làm thành phẩm. Studio hiện nút **Sửa chuyển động và dựng lại** ở lỗi
freeze của FINAL_RENDERED. Mặc định giữ retry.scene_repair của project.

Cho phép một lượt sửa cảnh trong riêng invocation hiện tại:
`POST /api/projects/:name/run` với `{until:"DONE",sceneRepairAttempts:1}` hoặc
CLI `resume <project> --scene-repair-attempts 1`. Giá trị0–3, không reset lịch sử,
call/cost ceiling hoặc review/scene iteration budget; không sửa config/fingerprint.
Chỉ khi sửa được và phim render/QC lại đạt mới tiếp tục DONE.

Project kiểm chứng đã dùng hết2/2 review/scene iterations; nút sửa cảnh không vượt giới hạn đó. Muốn tiếp tục cần quyết định phục hồi rõ ràng, giữ nguyên lịch sử và số lượt đã dùng. Không lấy final cũ làm phim đạt yêu cầu sau khi lần sửa thất bại.

<!-- CAST-MODEL-DEPTH-SOURCE-20261005 -->
### Nhận diện vai và đồ vật phía trước

Model thiết kế mỗi vai theo câu chuyện. Cảnh báo tạo hình trùng gợi ý xem lại
hai vai có cùng rendered inputs trong cùng cảnh, vẫn cho phép giống nhau có
chủ đích. Không tự đổi màu/trang phục.

foregroundSvg của model là mảnh cùng đồ vật vẽ trước diễn viên, dùng chung
source/anchor/projection/clock; đi cùng vật khi nhấc/đặt. Mặt, tay, tiếp xúc và
phụ đề vẫn cần đọc rõ trong hình thật. Source đã build, nghiệm thu mới đang
được giao model khác; xem validation/2026-10-05-cast-and-model-depth.md.
<!-- CAST-DEPTH-SCOPED-PASS-20261005 -->
### Cập nhật cast/depth05/10

Đã bổ sung advisory tạo hình cùng cảnh và mảnh foreground cùng sourced model;
không áp palette/wardrobe/người dẫn/chủ đề bắt buộc.32/32focused và563PASS/2SKIP
relevant regression/whole-test typecheck đã qua trên source đã sửa. Default cache
và khóa cũ được giữ; prop hai rig/eventclock/tua ngược kiểm bằng AUTHORED browser
fixtures. Nghiệm thu tự viết/phân vai/dàn cảnh/phim đa chủ đề và livevoices còn mở,
không lấy phim QCFAIL cũ làm thành phẩm. Chi tiết ở validation/2026-10-05-cast-and-model-depth.md
(đường dẫn từ root: docs/validation/2026-10-05-cast-and-model-depth.md).

<!-- SCENE-LABELS-RESUME-SOURCE-20261005 -->
## Nhãn theo ngôn ngữ và tiếp tục dự án hoàn thành

Tool vẫn nhận chủ đề/câu chuyện bất kỳ; người que hoặc robot đóng vai trong
câu chuyện. Máy hơi nước và ô tô chỉ là ví dụ. Nhãn có sẵn của renderer dùng
EN/VI/JA/KO theo project.language, gồm tiêu đề tám recipe, mô tả và control
ARIA. Font Nhật/Hàn có fallback phù hợp. Không dịch lại lời kể, cue, tên vai
hoặc chữ trong artwork nguồn. VI và các cảnh không phát sinh chữ thay đổi giữ
cache cũ; không tăng phiên bản toàn bộ animation/director/art.

Model test độc lập release02:39:10UTC:40/40 focused,29/29 regression và whole-test
typecheck qua. Actual Chrome AUTHORED chứng minh nhãn/glyph/font, không chứng
minh chất lượng diễn xuất hay phim model thật. Raw lỗi oracle/typecheck đầu
và các giới hạn được giữ nguyên. Báo cáo: docs/validation/2026-10-05-scene-labels-and-resume.md.

Đọc nguồn phát hiện DONE cũ có thể bỏ qua identity nhãn mới. Source tiếp theo
thêm kiểm tra inputHash/sourceHash scene read-only dùng chung cho resume và
cổng download. Dự án đã dựng cảnh bị ảnh hưởng quay về ASSETS_READY; giữ
narration/audio, kế hoạch đã duyệt, locks, review iteration và toàn bộ budget/
journal. Scene đã khóa xung đột phải chặn trước khi viết. Các file final cũ
giữ để truy vết nhưng không được tải như kết quả hiện hành khi scene stale.
Fullbuild fb8cf8 exit0; runtime sửa DONE-resume đang được model khác kiểm tra,
chưa ghi PASS cho source mới. Ca đời thường rainy-bus-stop là đầu vào khác
cần assignment native riêng, chưa có phim mới. Nghiệm thu đa chủ đề/đầu vào/
hai rig/live TTS/EN-VI-JA-KO/toàn phim vẫn mở; không thay bằng fixture authored.

<!-- SCENE-LABELS-FINAL-RELEASE-20261005 -->
### Checkpoint đã kiểm độc lập: nhãn, resume và preview

EN/VI/JA/KO factory labels đã triển khai; cache chỉ đổi khi chữ/font phát
sinh thay đổi. Source-only scene migration kiểm cả DONE, dựng lại từ
ASSETS_READY và giữ narration, approved plans, locks cùng consumed budgets.
Studio bỏ các link preview stale và chặn truy cập clip cũ. Lỗi semantic/art
của actor vẫn báo tại FINAL job và giữ draft đã có.

Locale40/40 +29/29 relevant regressions; migration9/9 +39/39 locale source
regressions +3/3 screened pipeline; source cuốiFINAL10/10 +migration9/9 và
whole-test typecheckPASS. Fullbuildd6a785PASS. Không gộp các lượt này thành
full suite hoặc nghiệm thu phim. Fixture FINAL được sửa phần setup bằng
public buildScenes/buildMaster; toàn assertion tail byte-identical vớia321.
Report cuối release07:25:58UTC sau fresh read-only closeout: deadline gốc bị
lỡ trong gián đoạn quota, không viết lại lịch sử thành release đúng giờ.

Báo cáo và raw failures: docs/validation/2026-10-05-scene-labels-and-resume.md.
Mixed-shot migration chưa kiểm riêng; coordinated scene/record tampering còn
là giới hạn hash gate, không gọi đó là trusted render validation. Mẫu browser
authored và protocol media giả không chứng minh chất lượng video model tự dựng.

Đã chuẩn bị project rainy-bus-stop-native với nguyên scriptMaya/Noah, EN và
giọngZira, actors/story-cinematic; NEW/0calls, productionNOTRUN tại release
prep07:24:55UTC. Bước tiếp theo là chạy pipeline thật bằng model độc lập trong
phạm vi mới. Tool nhận nội dung bất kỳ; máy móc chỉ là ví dụ.
Hướng dẫn thiết kế và vai trò hai plugin: docs/VIDEO-DESIGN-WORKFLOW.md.
Remotion chưa là backend chọn được; renderer hiệnHyperFrames0.8.96. Nghiệm
thu đa chủ đề/input/hai rig/ngôn ngữ/backend và xem/nghe toàn phim vẫn mở.


<!-- NATIVE-RAINY-BUS-DIAGNOSTICS-20261005 -->
### Ca truyện đời thường và thông tin sửa dàn cảnh

Ca rainy-bus-stop-native đã chạy đúng một public make trên source0ba63bb.
Windows Speech Zira tạo audio27.906521s,7cue/clock27907ms và giữ nguyên
lời kể. Pipeline dừng ANALYZED: hai thiết kế bị từ chối bởi SVG/camera/source
gates; watchdog ngắt yêu cầu cuối08:13:21UTC. Không có storyboard được
chấp nhận, scene, draft hoặc video. Frame/acting/filmQC/xem-nghe toàn phim
NOTRUN.9call hoàn tất ở provider/schema,1call interrupted còn pending;
169793input/31462outputtokens đã ghi, usage của call ngắt và actualUSD chưa
đo được. Không gọi provider success là domain/filmPASS. Budget30call/2review,
review0 và scene{} giữ nguyên; dead-owner lock/journal được bảo tồn.

Release08:17:36UTC/report08:19:38UTC trước deadline08:21:06; không còn known
ownedprocess/listener. Giới hạn census/watchdog và raw failures nằm tại
docs/validation/2026-10-05-rainy-bus-stop-native.md. Full tool/matrix chưa
nghiệm thu; source mới không biến ca FAIL này thành phim đạt.

Source follow-up thêm danh sách SVG hiện được renderer hỗ trợ vào prompt
generation, diagnostic crop bằng projected envelope/viewport và lỗi câu
nguồn có shotID/received/currentcue. Giữ nguyên predicate/tolerance/tag
whitelist, câu nguồn, normalizer, identity, approved caches/locks và budget.
Không áp palette/bối cảnh hoặc template máy móc. Fullbuild0b446e+7897a9PASS;
kiểm độc lập source mới đang chạy trong scope riêng không gọi native/TTS.
README bắt đầu bằng project trống và nội dung người dùng; ví dụ hơi nước
chỉ còn là lựa chọn phụ. Bàn giao phiên bản: docs/GENERAL-TOOL-HANDOFF.md.


<!-- DESIGN-DIAGNOSTICS-SOURCE-RELEASE-20261005 -->
### Kiểm source độc lập đã bàn giao

Release08:45:40UTC trước deadline08:48:31UTC:125/125 existing tests và
5/5 supplemental tests PASS; whole-test typecheckPASS. Năm sourcehash và
66existingtestfiles không đổi.23 observed processbirths đều terminal,
không còn listener thuộc phiên test. Newtest source-protocol-diagnostics
được bàn giao với SHA8E9C7FFCC017D65E4BAD6405ABFF16FC74F88458144EFA8AF53AB0D93A0D038A.

SVG/source/crop negatives vẫn bị từ chối. Promptgeneration và matching
repair có capability list; JSON rejected được gửi nguyên vẹn, receipt cũ
không sửa. Accepted cache roundtrip giữ storyboard/artwork/scene bytes
và không gọi model lại. Chưa chạy riêng renderer trước patch để so byte;
không gọi đó là proof pre-patch parity. Native replay/film/broad suite NOTRUN.
Raw harness/fixture failures và typecheckFAIL ban đầu được giữ trong
C:/Users/Duongvh-pc/codex-test-evidence/source-protocol-20261005T083200Z/REPORT.md.

Build0b446e+7897a9 đã qua trước test, source sau release không đổi. Đây là
nghiệm thu source/protocol riêng, không biến native rainy case time-bound
FAIL hoặc phim thư viện QCFAIL thành video đạt. Full product/matrix OPEN.


<!-- STORY-DESIGN-GUIDANCE-FOLLOWUP-20261005 -->
### Dàn cảnh và tạo hình theo nội dung: bản sửa tiếp

Director nhận brief thiết kế phim ở đầu generation prompt và danh sách actor/shot
locks thực sự đã duyệt. Preview/immutable của rig nền không khóa mọi vai thành
một mascot giống nhau. Tạo hình, costume, góc máy, chiều sâu và nhịp diễn chọn
theo câu chuyện; không áp palette, chủ đề, tỉ lệ actor, quota góc máy hay mẫu
layout cố định. Lời kể, nguồn, identity và lock đã duyệt vẫn giữ nguyên.

Guidance chỉ dùng khi sinh/sửa thiết kế; cache đã chấp nhận không bị redesign
tự động. Đây chưa là bằng chứng chất lượng hình mới. Build/typecheck đã qua;
kiểm runtime/lock/cache/director và video mới vẫn PENDING do tester hết hạn mức.
[Ca đã chạy và bộ kiểm tiếp](docs/validation/2026-10-05-rainy-bus-stop-continuation.md).


<!-- RAINY-NATIVE-RESUME-20261005 -->
### Một ca native đã DONE/QC PASS; chất lượng toàn tool vẫn mở

Ca tiếng Anh trạm xe buýt public resume exit0/QC PASS, giữ nguyên nguồn/audio/clock,
journal13started12completed1oldpending và không gọi provider mới. Cảnh đầu dùng
lại đúng completed response, qua browser/full merged-board trước khi xuất.
Review/scene budget2/2, lỗi/phim cũ được giữ; không reset/clone/force.

Model test hết hạn mức trước báo cáo đánh giá cuối; parent chỉ đọc artifact đã có.
Ảnh preview còn diễn viên nhỏ, hai vai gần giống và nền sơ sài. Chưa nghiệm thu
visual design/normal-speed watch/full audio/real vision hoặc matrix toàn sản phẩm.
Source3718:205PASS1SKIP,18PASS và14PASS synthetic ở các lần kiểm riêng; typecheck0.
[Report có phạm vi và bộ kiểm tiếp](validation/2026-10-05-rainy-native-resume.md).
