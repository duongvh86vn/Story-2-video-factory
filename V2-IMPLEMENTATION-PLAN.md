# Kế hoạch V2.2 — diễn viên trong câu chuyện

Checkpoint06/10: code443220f đã qua hai đợt độc lập: source-context494PASS/0FAIL/2SKIP và corrected contact229PASS/0FAIL/1SKIP, đều exit0. Sáu assertion custom-handle GSAP/outbound chưa chạy vì fixture ESM setup thất bại; cache parity cụ thể, browser contact và phim còn chờ. Raw failures giữ nguyên. Ca sinh nhật gốc vẫn28started/28completed/0pending, còn2/30calls, chưa video mới. Tester cũ hếtquota trước completion/counter receipt; parent closure chỉ đọc xác nhận703artifact hashes,403source/423dist/169case nguyên vẹn và74known resources terminal, không thay attestation thiếu. Chủ dự án giao model test khác. [Bàn giao có lệnh và fixture chuẩn bị](docs/NEXT-MODEL-TEST-HANDOFF.md), [kết quả/phạm vi](docs/validation/2026-10-06-sourced-world-contact.md). Chất lượng phim và toàn sản phẩm chưa nghiệm thu.

Các checkpoint bên dưới giữ lịch sử và phạm vi source riêng; đoạn này thay trạng thái hiện hành của ca sinh nhật và motion batch mới.

Hiện hành: tool tổng quát chủ đề/câu chuyện → kịch bản → phân vai → video; người que là diễn viên theo nội dung. Native thư viện có phim27.067s nhưng QC FAIL cảnh tĩnh6.733–12.067s. Lượt sửa thật tiếp theo cũng FAIL: model thêm target vào react, không có phim mới;28 call hoàn tất/0 pending, review và scene budget2/2. Sửa schema/prompt react và regex màu đã build/export schema; kiểm tra độc lập50/50 và11/11, whole-test typecheck qua. Đây là kiểm tra contract, chưa nghiệm thu phim mới. Identity/bố cục, xem/nghe toàn phim và matrix nhiều chủ đề/input/ngôn ngữ/backend vẫn mở. [Evidence và giới hạn](docs/validation/2026-10-04-general-story-followup.md).

## Checkpoint lịch sử trước khi đổi phạm vi sang tool tổng quát

Cập nhật04/10: [TTS local public](docs/validation/2026-10-04-external-local-tts.md) qua15 checks bằng HTTP bridge có speech WindowsEN thật và10 schema/preset checks; adapter user/OmniVoice/JA/KO vẫn chờ live backend. [Projection SVG](docs/ARTWORK-PROJECTION.md) thêm mode opt-in giữ aspect của complete SVG trong part viewport, giữ normalized geometry cũ và tách visual fingerprint khỏi narration. [Kiểm tra projection](docs/validation/2026-10-04-artwork-projection.md) giữ raw FAIL, sửa grammar và xác định browser precision; named5/5/final-file typecheck/build qua, resume/full-film mới chưa kiểm. Phim gốc vẫn giữ finding cũ, chưa coi tính năng mới là sửa xong mọi phim.

[Checkpoint phim và input04/10](docs/validation/2026-10-04-real-film-and-input-results.md): native car technicalPASS nhưng visualFAIL; sửa typography, vùng nhãn và hành động nghiên cứu/chế tạo có nguồn. Authored V2 đã qua review support/contact/recovery trong mẫu, toàn phimPARTIAL vì nhãn chồng viền sách và chưa xem/nghe full-rate. Public scriptEN qua final/resume; SRT/WAV mớiTIMED, aligned thiếu WhisperX và các edit/gate cases chưa chạy. Giữ whole goal mở, backend user chưa cung cấp không được nhận là đã testlive.

Cập nhật04/10: [nhánh sửa artwork từ QC](docs/validation/2026-10-04-qc-artwork-repair.md) giữ finding review, khóa và lịch sử phim lỗi; giới hạn lượt trước model call và dựng lại toàn bộ các bước sau scenes. Build/typecheck qua; unchanged independent11/11,42/42,4/4, batch3/3 và storage negatives qua sau hai lỗi thật. Genuine native car71165 đang sửa một cảnh trong project cũ, chưa có terminal/QC mới. Bản thiết kế authored tiếp theo tách nhãn/date khỏi occlusion và thay payoff cards bằng tiếp xúc/đọc sổ; chưa render/nghiệm thu. Sau nhánh này tiếp tục sửa các finding toàn phim và kiểm ba luồng/edit/resume/TTS thật.

Cập nhật04/10: [diagnostics repair/default30 và review phim](docs/validation/2026-10-04-cli-capture-boundaries.md) thay các checkpoint chờ bên dưới bằng phạm vi đã kiểm chứng. Tiếp tục sửa nhãn hơi nước và biến recap ô tô thành diễn xuất với artifact có nguồn; không đóng mục tiêu từ DONE hoặc các test scoped. Native car được resume bounded trong project cũ, giữ pending/usage/history; native full-film vẫn mở.

Trạng thái hiện hành03/10, code6c1de03: source director22/animation10, hai bản ô tô authored đã DONE/QC kỹ thuật và giữ narration/audio bytes; diagnostics CLI, storage-recovery gate và default draft30fps mới chưa chạy runtime độc lập. [Audit theo yêu cầu](docs/validation/2026-10-03-completion-audit.md) giữ full-film/native, WAV ASR, browser/edit matrix và live TTS còn mở. [Bốn project native](docs/validation/2026-10-03-native-deadline.md) đã chuẩn bị timeout20 phút và ANALYZED, không gọi lại native/TTS hoặc xóa attempt cũ; chưa có native final. Những đoạn “đang chạy” trong checkpoint cũ dưới đây chỉ mô tả thời điểm lịch sử.

Cập nhật03/10: [audit độc lập hiện tại](docs/validation/2026-10-03-current-runtime.md) đã kiểm acting/carry/seating64/64, regression135/135 và genuine migration17/17; giữ audio/cache/host đã duyệt, nhánh khóa conflict rõ. Retry missing completion marker và report annotation đã sửa: independent targeted36/36, broad92/92, whole test:typecheck/compiled proof qua; build qua. Tiếp tục native full-film, browser/edit/ba-luồng và live TTS; các checkpoint NOT RUN phía dưới là lịch sử. Pipeline bên ngoài nhận API HTTP riêng hoặc OmniVoice local theo [contract TTS](docs/EXTERNAL-TTS.md), rồi tạo clock từ audio thật và dùng cùng luồng dựng phim.

Checkpoint mới03/10: animation10/director22 thêm seated support thật vào pipeline, chuyển ngồi–đứng với feet/xương/knee liên tục, primary/supporting ownership, camera và review/schema/cache. Hai authored hơi nước người que/robot đã DONE/QC; robot left lần đầu failcontrast được giữ evidence. Phim dựng trước refinements guard cuối; [phạm vi và test còn chờ](docs/validation/2026-10-03-supported-seating.md). Tiếp tục full-film/native/ba-luồng/edit/resume/locks và independent current-source audit; không đóng mục tiêu bằng clip ngồi riêng.

Carry03/10: compiler có clip nhưng production trước đây chưa nhận binding. Source `bound-model-motion-2.2.1` nối một primary actor nhấc–mang–đặt, cùng nhãn/thermal/relations và camera theo clock thực. Dàn một cảnh ghép cue nguyên văn đủ thời gian chuẩn bị/đi/đặt, sau đó giao model độc lập kiểm cả JS/GSAP, media, negative guards và migration giữ giọng/locks. [Phạm vi](docs/validation/2026-10-03-bound-model-motion.md). Handoff và moving-prop phối hợp nhiều tay còn chặn; không coi artist production là model tự đạo diễn hoặc nghiệm thu toàn phim.

Checkpoint animation2.2.9: hai kênh tay, contact owner/hand và primary pickup chọn tay. Hoàn thiện dàn cảnh thực rồi giao model độc lập kiểm tra overlap/hold/seek/prop ownership, compatibility7/8 và migration giữ audio/locks. Dựng artist iteration không thay nghiệm thu model tự đạo diễn. Tư thế ngồi có support đã bổ sung ở source10 phía trên; dụng cụ khuấy, handoff và phối hợp trên moving prop vẫn cần contract hình học thật khi nội dung yêu cầu. [Phạm vi source9](docs/validation/2026-10-03-bilateral-acting.md).

Ưu tiên acting03/10: animation2.2.8 bổ sung cúi/nghiêng/đứng và idle không kèm arm gesture; build qua, runtime độc lập chưa chạy. Tiếp tục kiểm tra feet/bone/seek/continuous/cache và xem full phim. Sau đó mở rộng tư thế ngồi có support, thao tác dụng cụ và phối hợp hai tay/diễn viên bằng contract hình học thật khi nội dung cần; không giả các động tác đó bằng một pose đứng hoặc chèn người bên cạnh poster. Yêu cầu này hướng tới chất lượng như video mẫu, không ép mọi bài dùng cùng động tác/cấu trúc cảnh.

Cập nhật03/10: tiếp tục mục tiêu đầy đủ. Đã triển khai nhãn thành phần hơi nước theo nguồn EN/VI và diagnostics action; thêm version renderer vào project/scene cache, giữ fingerprint narration. Probe thật trước sửa scene key FAIL, dù giữ toàn bộ audio/cues/cache. Kiểm tra độc lập sau sửa đang chờ model; xem [phạm vi](docs/validation/2026-10-03-renderer-language.md). Theo [review phim](docs/validation/2026-10-03-film-quality.md), ưu tiên độ rõ thao tác Watt, chú thích đọc được và diễn viên quay lại sau cutaway khi phù hợp. Native storyboard đã được chấp nhận nhưng contrast recap/provider còn chặn final; không đánh dấu hoàn thành ba luồng hoặc hai bài/hai kiểu tạo hình.

Ngày02/10/2026. [STORY-ACTOR-DIRECTION.md](STORY-ACTOR-DIRECTION.md) là đặc tả hiện hành. Người que đóng vai trong câu chuyện, có thể là người lịch sử được narration/source nêu tên. Bỏ người dẫn cố định và quota. Ba luồng script/WAV/SRT cùng WAV+SRT vẫn giữ nguyên văn và clock.

Kế hoạch tác vụ, files/contracts/checks và checkbox triển khai tại [docs/plans/2026-10-02-story-actors.md](docs/plans/2026-10-02-story-actors.md). Kế hoạch thiết kế mở01/10 giữ nền artwork/provider/security; những đoạn về presenter đã bị thay thế. Evidence cũ giữ ở IMPLEMENTATION-STATUS và TEST-RESULTS; không đổi thành nghiệm thu actors.

Cập nhật03/10: external/local TTS đã triển khai và có audit contract; English script đã ra actors MP4 trong clean dependencies cùng máy, scope offline và raw audit30/31 giữ nguyên. Native hơi nước kết thúc semantic rejection; feedback đã sửa và lượt authoring mới dùng narration không đổi đang chạy. Patch comparison/state English và diagnostic qua120/120 scoped audit; exact version migration/audio retention chưa chạy trong scope này. Các mốc chất lượng toàn bài, hai kiểu diễn viên, live OmniVoice/JA/KO và ASR Việt không được đánh dấu hoàn thành bởi các probe này.

| Phần | Trạng thái source2.2.21 | Điều còn phải xác minh |
|---|---|---|
| Narration | Ba luồng, TTS actual clock, SRT fit, ASR/alignment, cache và final gates đã có | Hồi quy trên source bàn giao; chất lượng ASR Việt |
| Cast | Vai/nguồn/identity/costume, cast/timeline/preview đã có | Nhiều vai nguồn đúng, tạo hình và editor/locks đầy đủ |
| Acting | Nhiều performance, voiceover/speech riêng, supporting contact, cut/continuous | Browser/video, đạo cụ/handoff, nhịp và biểu cảm tự nhiên |
| Design | Model director, SVG/layers/camera/artwork có provenance | Full bài do model thiết kế; không đứng cạnh bảng suốt bài |
| Studio/API/CLI | Actors mặc định project mới; tương thích project cũ; artifact contract | Cast controls, edits/cache/resume/locks; phiên Studio mới |
| Acceptance | Build scoped đã qua; model test actors độc lập đang kiểm tra | Hai bài/hai kiểu tạo hình, ba luồng, final QC và xem/nghe thực tế |
| Delivery | Actors/runtime, multilingual/external TTS và literal subtitle đã push nhánh; ingest metadata đang follow-up | Source/docs/evidence cuối và GitHub đúng commit; không merge main như release đã nghiệm thu |

Pipeline: narration → phân tích → cast/tình huống → storyboard/stage/performance/camera → assets → scenes → draft → review/repair → final → QC. Giọng/audio không phụ thuộc cast; đổi hình không dựng lại narration còn hợp lệ. Mọi lỗi nguồn/clock/identity/target/voice/security phải chặn final.

Các video presenter source18 và animation benchmark chứng minh phạm vi được nêu trong evidence; không chứng minh phim nhiều diễn viên hay chất lượng mục tiêu mới. Model test độc lập chạy runtime; người triển khai kiểm tra build/typecheck và xem bản dựng để sửa thiết kế.

<!-- CAST-MODEL-DEPTH-SOURCE-20261005 -->
## Source05/10: tạo hình vai và chiều sâu đồ vật

Đã có source cast-design-similarity medium, report/context của model và
foregroundSvg thuộc cùng sourced model/shared projection/prop/event clock.
Không ép palette/trang phục hoặc tự đổi actor. Fullbuild49223/schema0992a8
exit0; test độc lập đã giao, chưa nghiệm thu source mới hoặc video.
Native thư viện vẫn QCFAIL/28call/reviewscene2of2, chưa chạy lại.
Xem docs/validation/2026-10-05-cast-and-model-depth.md.
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
