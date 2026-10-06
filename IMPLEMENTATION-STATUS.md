# Trạng thái triển khai V2.2

Checkpoint06/10: lần public resume trên project sinh nhật gốc đã tái dùng đủ7bước phân tích và nhận explanation mới; storyboard còn thiếu diễn xuất/ownership/camera nên dừng trước render. Journal25/25/0, còn5/30calls, review0/2; chưa video hoặc native image review. Source mới sửa phép kiểm shared world khi nhân vật chính di chuyển đồ vật trong cảnh nhiều diễn viên, gom đầy đủ lỗi diễn xuất và cung cấp rig/cue/clock/ownership cho bộ dựng cảnh. Build/typecheck và149ca kiểm độc lập source/protocol qua; chưa nghiệm thu phim. Các306/82PASS trước có phạm vi riêng; giữ mọi FAIL/gap lịch sử, nghiệm thu chất lượng và toàn tool vẫn mở. [Phạm vi và việc tiếp](docs/validation/2026-10-06-actor-airborne-cache.md).

Các checkpoint bên dưới giữ lịch sử và phạm vi source riêng; đoạn này thay trạng thái hiện hành của ca sinh nhật và motion batch mới.

Hiện hành05/10: ca chủ đề sinh nhật đã tự viết lời kể và tạo audio tiếng Anh51,421s/12cues, nhưng dừng tại source-review, chưa có phim hoặc review ảnh thật. Source đã sửa lỗi nhận “pin” trong “dropping”, ngữ cảnh rig và hướng dẫn seed; build/typecheck qua, kiểm hồi quy và tiếp tục cùng project đang chờ. Ca trạm xe buýt có MP4/QC kỹ thuật PASS, nhưng đánh giá độc lập PARTIAL với lỗi chân lệch nền. [Bằng chứng mới](docs/validation/2026-10-05-birthday-garden-source.md). Toàn sản phẩm chưa nghiệm thu.

Các đoạn tiếp theo là snapshot lịch sử, không thay trạng thái hiện hành ở trên.

Hiện hành: tool tổng quát chủ đề/câu chuyện → kịch bản → phân vai → video; người que là diễn viên theo nội dung. Native thư viện có phim27.067s nhưng QC FAIL cảnh tĩnh6.733–12.067s. Lượt sửa thật tiếp theo cũng FAIL: model thêm target vào react, không có phim mới;28 call hoàn tất/0 pending, review và scene budget2/2. Sửa schema/prompt react và regex màu đã build/export schema; kiểm tra độc lập50/50 và11/11, whole-test typecheck qua. Đây là kiểm tra contract, chưa nghiệm thu phim mới. Identity/bố cục, xem/nghe toàn phim và matrix nhiều chủ đề/input/ngôn ngữ/backend vẫn mở. [Evidence và giới hạn](docs/validation/2026-10-04-general-story-followup.md).

Các checkpoint bên dưới là lịch sử; trạng thái mới nhất ở đoạn đầu và evidence hiện hành.

Source31/explanation6 sửa thiếu taxonomy chỉ tay/lời nói của diễn viên từ lỗi native truyện thư viện: indication phải có point/action/target/cue đúng, speech phải thuộc cue của đúng diễn viên. Nhãn entity được mô tả rõ là excerpt liên tục; validator nguồn không nới. Native đầu tiên chỉ tớiTIMED,8call thật thành công transport/schema nhưng explanation bị chặn vì Library table không có nguyên cụm trong nguồn; không có phim. Script/audio27.062s và journal giữ nguyên; resume thật cùng project đang giao model khác. Source30 motion đã qua unchanged30/30, supplemental32/32 và169/169; whole npm test INCOMPLETEexit-1, không tuyên bố toàn suitePASS. Build/typecheck/schema31 qua; nghiệm thu lớp acting31 và phim tổng quát còn mở. [Evidence](docs/validation/2026-10-04-general-story-followup.md).

Source30/animation13: Studio bỏ tích sẵn ví dụ máy hơi nước và mở form nội dung khi tạo project; thêm input tổng quát ngoài chủ đề máy móc. Sau independent source29 focused26PASS/4FAIL (sai lệch số giữa frame), bổ sung face refinement và giữ clock GSAP đủ độ chính xác, giữ legacy12. Build/test:typecheck/schema qua; follow-up runtime và native truyện đời thường đang giao model khác. Public FINAL source29 đã qua10/10 ca fail-closed, chưa chứng minh chất lượng MP4. [Evidence hiện hành và giới hạn](docs/validation/2026-10-04-general-story-followup.md). Toàn sản phẩm chưa nghiệm thu.

Checkpoint trước runtime: Source29/animation2.2.12 nối biểu cảm liền nhau và chuyển trực tiếp phản ứng mới; build44882/typecheck3ab33b exit0. Lượt mới26PASS/4FAIL và follow-up30 ở đầu tài liệu thay trạng thái NOT RUN của checkpoint này. [Phạm vi](docs/validation/2026-10-04-emotion-continuity.md).

Source28/animation2.2.11: thêm16 mood và camera reaction close-up cho diễn viên; build22643 và test:typecheck9d5c24 exit0. Runtime mới NOT RUN vì hai worker hết usage limit; source27 27/27 và210/210 là snapshot trước. [Chi tiết và bàn giao](docs/validation/2026-10-04-story-emotions.md). Toàn sản phẩm vẫn PROGRESS.

04/10/2026 — người dùng chỉnh lại phạm vi: **câu chuyện/chủ đề → kịch bản → video**, người que là diễn viên; ví dụ máy móc không định hình sản phẩm. Nhánh idea có writer thật, cache độc lập giọng/cast, kịch bản/provenance/title/kind và Studio/API/CLI; có thể chỉ viết để xem/sửa hoặc chạy video. Source24 sửa camera ensemble và transient cast/contact/serialization. Lượt độc lập mới trên24 + artwork2.2.6: authoring23/23, locked15/15, generic36/36 PASS; tổng bảy suite173/179 PASS, sáu FAIL thuộc propFixture cũ được tái hiện trên archive9b94593 và sửa setup giữ nguyên assertions; actor53/53, tám-file193/193 PASS. Renderer đạo cụ thường7/7 PASS; build và whole test:typecheck exit0. Giữ raw thất bại và lỗi lịch chạy/báo cáo quá hạn của worker. [Phạm vi evidence](docs/validation/2026-10-04-general-story-tool.md), [luồng hiện hành](docs/GENERAL-STORY-TOOL.md), [checklist](docs/plans/2026-10-04-general-story-tool.md). Source27 thêm acting/source/target và nguyên câu nguồn theo vai, coverage qua beat/cue, canonical cast, posture/gaze review và offline final gate; independent focused27/27, regression210/210 và whole typecheck qua. Build/schema đồng bộ; [phạm vi và raw failures](docs/validation/2026-10-04-story-acting-coverage.md) phân biệt helper/protocol với public pipeline FINAL và toàn phim còn NOT RUN. Chưa chứng nhận chất lượng phim tự sinh nhiều chủ đề. Native car thử tiếp đã hủy theo steering mới, giữ raw attempt/pending và billing unknown, không reset quota/budget hoặc coi là lỗi provider đã xác định.

## Checkpoint lịch sử trước luồng idea và source23

03/10/2026 — phát hiện new-project cinematic còn kế thừa draft15fps từ config nền; các phim authored dùng30fps override nên không chứng minh default phù hợp. Initializer nay ghi draft30fps cho project mới, giữ dimensions/quality kế thừa và cấu hình project cũ. Build/typecheck và [handoff](TEST-HANDOFF.md) tách khỏi runtime còn NOT RUN. Bản MD hợp nhất và [audit theo yêu cầu](docs/validation/2026-10-03-completion-audit.md) đã có; file Downloads cũ được backup nguyên byte rồi đồng bộ contract diễn viên/TTS mới.

03/10/2026 — hai bản ô tô mới với mechanic người que/robot đã qua pipeline thật đến DONE/QC kỹ thuật, giữ nguyên script/narration/audio bytes. Hành động gồm tiếp cận, cúi, chạm mô hình, mô hình phản ứng, đứng và đổi biểu cảm; sửa nhãn bị ép và cửa sổ bị cắt bằng artwork iteration, giữ các bản lỗi. [Bản cuối và provenance](docs/validation/2026-10-03-car-workshop-production.md). Đây là art direction được biên soạn, không phải native model output hoặc nghiệm thu toàn phim. TTS API local/OmniVoice đã có Studio/API/CLI và [ví dụ cấu hình API riêng](docs/EXTERNAL-TTS.md); backend thật vẫn chờ nghiệm thu.

03/10/2026 — bổ sung diagnostics Codex CLI chỉ ghi event counters/category; timeout giữ partial capture trong memory và báo đã tới thread/turn/response nào. Lỗi quota/auth/context/model-access có bằng chứng từ CLI chặn auto retry/fallback, vẫn cần explicit recovery. Build/test:typecheck qua; runtime mới NOT RUN vì worker chẩn đoán đã báo hạn mức đến18:30. Sáu timeout production cũ không được đổi nhãn thành quota. [Contract và test còn chờ](docs/validation/2026-10-03-cli-diagnostics.md).

03/10/2026 — audit source76ac9e3: acting/seating/carry **64/64**, regression không đổi **135/135**, pristine migration **17/17**, nhánh chưa khóa đến SCENES_READY; audio/cache/host đã duyệt giữ bytes, TTS3→3. Nhánh khóa chặn conflict rõ. Retry targeted35/36 và broad88/89 FAIL thiếu completion marker được giữ lịch sử. Sau sửa journal/annotation report ghế: build và independent targeted **36/36**, cùng broad command **92/92**, whole test:typecheck và compiled proof đều qua. [Phạm vi hiện tại](docs/validation/2026-10-03-current-runtime.md) phân biệt các ca trùng và phần browser/phim/native/ba luồng/live TTS còn mở. Các trạng thái NOT RUN trong checkpoint cũ phía dưới là lịch sử trước lượt này.

03/10/2026 — bổ sung thao tác retry model rõ ràng trong Studio/CLI/API để phục hồi sau lỗi dịch vụ. Journal giữ nguyên các attempt cũ; cycle mới tham chiếu failed call bằng `retryOf`, chỉ một lần/hash/invocation, chặn pending và giữ global call/cost limits. Normal resume giữ budget. Build/typecheck qua; runtime độc lập NOT RUN, chưa gọi lại native provider trong hạn mức. [Contract và test còn chờ](docs/validation/2026-10-03-explicit-model-retry.md).

03/10/2026 — animation10/director22/physical-seat2.2.1 đã nối tư thế ngồi có support vào production, primary/supporting actors, feet/xương/knee waypoint, ownership/facing/reach/continuous/camera, Studio review, schema và cache hình. Build/typecheck/schema generation qua; runtime độc lập NOT RUN. Authored hơi nước người que và robot ngồi–chạm giấy–đứng đã DONE/QC kỹ thuật; robot quay trái lần đầu FAIL contrast chữ1769 được giữ nguyên evidence. Hai phim dựng trước refinements guard cuối, xem [phạm vi](docs/validation/2026-10-03-supported-seating.md). Các checkpoint8/9 phía dưới là lịch sử; chưa đóng nghiệm thu chất lượng/native final hoặc matrix ba luồng.

03/10/2026 — follow-up độc lập d882 đã chạy và **FAIL** ở `ANALYZED/host-approval`: host input không đổi nhưng animation version đổi rig hash, compilation thay rig/poses. Audio/cues/cache vẫn nguyên, TTS3→3, locked scene giữ bytes; language6/6PASS chỉ trên d882. Source mới tách `host-rig-identity-2.2.1` khỏi runtime, nhận hash7/8/9 bằng canonical data và kiểm toàn metadata/files; build/typecheck qua, runtime của sửa mới **NOT RUN**. Giữ nguyên raw FAIL; [kế hoạch chạy lại](docs/validation/2026-10-03-renderer-language.md) phân biệt host approval, storyboard dựng lại và locked-plan conflict. [Bản nháp carry](docs/validation/pending/README.md) chưa có kết quả runtime.

03/10/2026 — tích hợp `bound-model-motion-2.2.1`: primary actor có thể nhấc–mang–đặt bằng tay được chọn trong một shot có nguồn; phân biệt điểm nắm với tâm vật, giữ support cố định, nhãn/thermal/emphasis/relations theo prop clock và camera kiểm toàn vùng di chuyển. Guard chặn target cố định đã lỗi vị trí sau pickup và sai primary hand owner. Build/typecheck và schema generation qua sau sửa import; independent runtime **NOT RUN**. Hai artist production hơi nước đã terminal0/DONE/QC kỹ thuật, chưa là nghiệm thu toàn phim; bản người que bắt đầu trước guard cuối, bản robot dùng đầy đủ batch. [Phạm vi và handoff](docs/validation/2026-10-03-bound-model-motion.md). Không thay evidence source9 hoặc toàn bộ sản phẩm thành PASS.

03/10/2026 — animation2.2.9 đã có hand tracks trái/phải trong rig, ghép gesture qua cue riêng từng tay, kiểm contact và preview theo tay, event đợi đủ tay của đúng diễn viên. Primary pickup chọn được tay; joint moving prop/handoff/supporting attachment còn chặn rõ. Build/typecheck và schema generation qua; ba artist iteration hơi nước đã DONE/QC kỹ thuật, bản robot cuối cải thiện nét mặt so với bản được giữ có contrast thấp. Runtime độc lập **NOT RUN**. TTS local API/OmniVoice đã có adapter/Studio/CLI; chưa có endpoint thực tế để chứng nhận giọng. [Bàn giao mới](docs/validation/2026-10-03-bilateral-acting.md). Mục tiêu chất lượng toàn phim, native final và matrix ba luồng vẫn mở.

03/10/2026 — checkpoint animation2.2.8: body posture cúi/nghiêng/đứng có blend và held pose, chân giữ điểm đặt, guard đi sau khi về đứng và continuity tư thế. Cinematic `idle` không ép arm gesture; prompt cập nhật cách diễn trong shared world và đọc chữ sau transform. Build + schema generation qua. Runtime test mới **NOT RUN** vì model test hết hạn mức; không lấy audit source trước làm PASS cho thay đổi này. [Checklist](TEST-HANDOFF.md). Checkpoint8 chưa có seated/tool-stir/bilateral arm contract hoặc nghiệm thu chất lượng toàn phim; phần bilateral source9 được ghi riêng phía trên.

03/10/2026 — checkpoint trước follow-up d882: [nhãn theo nguồn và cache renderer](docs/validation/2026-10-03-renderer-language.md), [kiểm tra phim và diễn xuất](docs/validation/2026-10-03-film-quality.md). Nhãn English/Vietnamese và feedback action có 275/275 test scoped + typecheck qua trên source trước các thay đổi diễn xuất. Probe migration thật giữ voice/cache và 3→3 request nhưng FAIL do thiếu version ở scene cache; source đã sửa/build qua, lần giao follow-up đầu chưa chạy vì model hết hạn mức. Lượt sau d882 đã chạy và phát hiện lỗi rig ghi phía trên. Hai phim người que được dàn cảnh lại đã DONE/QC kỹ thuật; chưa nghiệm thu thẩm mỹ. Native hơi nước đã qua storyboard nhưng dừng ASSETS_READY do contrast recap và provider/account error, chưa có final. Các ghi chép phía dưới là lịch sử evidence; không dùng checkpoint cũ để tuyên bố sản phẩm hoàn thành.

> Contract hiện hành ngày 02/10/2026: [STORY-ACTOR-DIRECTION.md](STORY-ACTOR-DIRECTION.md). Người que là diễn viên đóng vai trong câu chuyện; bỏ người dẫn cố định và quota. Source2.2.21 đang triển khai/nghiệm thu; evidence presenter cũ không chứng minh chế độ mới đạt.


2026-10-02. Nhánh đang làm: `codex/stickman-acting-v22`, bắt đầu từ `22953fa`. **Đã có runtime cinematic trong pipeline; chưa nghiệm thu toàn bộ và chưa công bố release hoàn thành.** Tài liệu A0 và kết quả V1 không chứng minh runtime mới.

## Source2.2.21 — trạng thái hiện hành

Bổ sung 03/10/2026: model độc lập đã dựng một English script → Windows Speech thật → actors → final từ archive/dependencies sạch cùng máy: DONE/QC true, text/clock/SRT/stored samples đúng. Raw audit giữ **30 PASS/1 FAIL** do đòi thêm `work/narration.srt` ngoài contract; không gọi full audit PASS hoặc nghiệm thu chất lượng tự động. [Phạm vi](docs/validation/2026-10-03-clean-english-runtime.md). Native hơi nước sau account reset kết thúc ở ANALYZED sau ba response bị semantic gate từ chối: model rút gọn/đổi label và gán configuration sai component. Không có final native. Feedback cụ thể/gom lỗi semantic và comparison/state English có nguồn đã qua **120/120 scoped audit**, test:typecheck0 và parent build0, sau hai lượt FAIL được giữ nguyên. [Phạm vi và giới hạn grammar](docs/validation/2026-10-03-english-explanation.md). Bản authoring mới đang gọi model thật; giữ identity/source/clock gates, không thay giọng hoặc mặc định ASR.

Bổ sung 02/10/2026: narration EN/VI/JA/KO, lựa chọn hiện ở Studio, catalog Windows theo culture, `voice_profiles`, Japanese segmentation giữ ký tự và ASR dùng mã chính. Thêm Azure Speech, local OmniVoice Studio/VoiceStudio, API tương thích speech và HTTP API riêng có field mapping/model/options/timeouts; cả script/SRT dùng cache giọng và pipeline chung. Build/typecheck qua. Audit đầu tiên 10:05–10:11 UTC: **437/442 PASS, 5 FAIL**; 403 regression cũ qua, 34/39 ca mới qua. Lỗi gồm command cũ còn sót khi đổi provider, API default nhận executable và fingerprint narration cũ sau đổi ngôn ngữ. Sau sửa, audit 13:29–13:30 UTC: **40/40 ca mới +33/33 regression liên quan PASS**, test:typecheck0; 39 assertions cũ giữ nguyên byte, thêm một ca chặn executable qua API project. Không chạy lại full suite hoặc xóa lịch sử FAIL. Giọng Windows English thật đo được 5.323 giây, giữ đúng text và clock, cache dùng lại; chưa có backend OmniVoice hoặc credentials Azure/JA/KO để chứng nhận giọng thật. [Hướng dẫn](docs/EXTERNAL-TTS.md), [phạm vi kiểm tra](docs/validation/2026-10-02-multilingual-tts.md).

Matrix độc lập snapshot trước bổ sung ngôn ngữ: hai lệnh stick/robot exit0, 16/16 technical checks và tám final decode/QC qua, **nghiệm thu yêu cầu FAIL**. Acceptance script bỏ `character_mode: actors`, thực tế dựng presenter/cast rỗng; WAV ASR Việt sai lời và embedded subtitle WAV mất whitespace đầu. Giữ bằng chứng lỗi, không tính thành PASS actors hoặc sản phẩm. Chi tiết ở [matrix scope](docs/validation/2026-10-02-input-matrix-scope.md).

Matrix mới15:02–15:19UTC đã sửa harness chọn actors và kiểm tra cast/HTML/rig/performance/export thực: **14/16PASS, hai WAV FAIL** vì ASR Việt sai5/13 từ. Script/SRT/aligned và bốn loại gate mỗi kiểu tạo hình qua;8final decode/QC/stored subtitle samples qua, extraction WAV vẫn mất whitespace. Metadata chung script/WAV/SRT có6FAIL do preset parser biến thành phong cách được khai; parent đã sửa tách authoredStyle và version fingerprint hình, build qua. Follow-up giữ nguyên13 tests và thêm resume: **14/14PASS**, test:typecheck0; audio/narration bytes/cache giữ khi refresh hình. [Phạm vi và lỗi còn mở](docs/validation/2026-10-02-actors-input-matrix.md). Không chứng nhận toàn sản phẩm hoặc nâng matrix cũ thành PASS.

Đã có cast nhiều vai, costume gắn khớp, primary=null, voiceover/speech phân vai, cut/continuous, supporting actor và report theo rig thực. Studio có thẻ vai, nguồn, preview, editor JSON áp dụng mọi lần xuất hiện và lock từng identity. API `/actors/:id` giữ revision/lock/clock; replan giữ identity đã khóa cả khi renderer cũ được migrate. Cast assets/profile/poses/preview có hash, đường dẫn rig khớp file thực, được chép vào output; cache giọng tách khỏi cast. Named actor không cần ảnh chân dung trong character bible cũ. Primary actor có thể đặt mô hình có nguồn như thao tác minh họa; legacy presenter vẫn giữ contract riêng.

Evidence: build/typecheck source21 qua, gồm bản CSS Studio sửa tương phản thẻ vai và tên project dài. Source19 độc lập22/26 FAIL; source20 41/43 FAIL; source21 cùng43/43 PASS và probe SVG vô hình bị chặn. Audit07:03UTC **89/89 PASS** (46 Actor Studio +43 story actors), test:typecheck exit0, thuộc snapshot trước sửa khuỷu tay. Phạm vi ghi tại [báo cáo source21](docs/validation/2026-10-02-story-actors.md). Suite07:19UTC **378/386, FAIL8** giữ như lịch sử. Sau sửa production/fixtures, model độc lập Descartes chạy lại npm test09:01–09:06UTC **403/403 PASS**, test:typecheck0; không skip/retry, source không đổi. [Báo cáo full suite](docs/validation/2026-10-02-release-regressions.md) giữ phạm vi và phần chưa chạy.

Animation hiện tại **performance-2.2.7**, artwork **passive-svg-2.2.4**, director **story-direction-2.2.21**. Khuỷu mở ra ngoài ở tư thế nghỉ theo hình người dùng; đổi hướng gập qua duỗi liên tục; tay suy nghĩ đi theo cung quanh vai. Audit performance6 **143/145 FAIL2** do robot thu tay quá nhanh gần vai; bản7 chạy lại cùng assertions **145/145 PASS**, test:typecheck0, không sửa ngưỡng. Build bản7 exit0. [Evidence sửa tay](docs/validation/2026-10-02-outward-elbows.md) phân biệt geometry/GSAP đã kiểm tra với ánh xạ giải phẫu và thẩm mỹ chưa được chứng nhận.

Authored adaptation37.154s đã DONE/QC; bản xưởng nhiều lớp có bàn và đạo cụ nhỏ hơn, Watt thay đổi biểu cảm khi đặt bình. Bản background minh họa được dựng lại bằng animation7/artwork4, không còn bị lớp màu phủ kín; diễn viên và cơ cấu là SVG chuyển động riêng. Đây là thiết kế được chỉnh tay từ response native bị từ chối, ghi rõ authored; không phải kết quả model tự hoàn thành hoặc chứng nhận thẩm mỹ. Ba request native source20 đều bị từ chối camera contract; native source21 dừng lỗi provider. Không đổi raw response thành model thành công.

Snapshot runtime **b7f94e6** đã push tới [nhánh GitHub](https://github.com/duongvh86vn/Story-2-video-factory/tree/codex/stickman-acting-v22); remote SHA được kiểm tra khớp local. Nhánh main vẫn là bản trước; đây là bản triển khai có thể review, chưa phải release hoàn thành. Hai plugin HyperFrames/Remotion đã được đọc: [bộ công cụ](docs/VIDEO-TOOLKIT.md) phân biệt HyperFrames renderer đã chạy với Remotion adapter chưa triển khai.

Snapshot mới **a292794** gồm TTS bên ngoài/đa ngôn ngữ, literal subtitle và metadata actors ba luồng đã push cùng nhánh; remote SHA khớp local. Studio riêng được khởi động lại trên source mới, giữ project đã dựng. Parent xuất Git archive sang thư mục mới và npm ci/build qua với node_modules thường, không junction; [phạm vi clean dependency build](docs/validation/2026-10-03-clean-install-build.md). Chưa là nghiệm thu máy sạch khác hoặc whole runtime.

ASR turbo diagnostic độc lập trên đúng WAV cũ: English11/11words qua, Việt còn4/13 và5/13 word edits; timestamps3/3 qua nhưng word fidelity Việt FAIL. Candidate/default tách riêng, không đổi cấu hình mặc định hoặc xóa matrixFAIL; phân biệt ASR với phát âm Piper cần bằng chứng nghe thêm. [Phạm vi](docs/validation/2026-10-03-asr-turbo-comparison.md). Native creative generation sau account-limit reset giữ nguyên script và raw response; ba response bị semantic gate từ chối, chưa có final/quality acceptance.

Chưa nghiệm thu: autonomous model và chất lượng toàn bài, hai bài/hai kiểu tạo hình trên snapshot hiện tại, chất lượng ASR Việt còn FAIL trong matrix actors/media, tổ hợp edit/cache/locks ngoài regression và cài đặt sạch trên máy khác. Mock/offline là seed; video presenter source18 không chứng minh sản phẩm actors đạt. Handoff đạo cụ giữa diễn viên hoặc xuyên cut chưa được hỗ trợ; báo lỗi, không giả lập bằng jump.

Parent đã dựng thêm bản ô tô42.666667s có vai Karl Benz, người quan sát và năm cảnh cơ cấu không có người dẫn; clip được chỉnh tên khỏi mặt và chữ năm khỏi kéo dẹt sau khi xem frame thật. QC kỹ thuật qua nhưng chất lượng diễn xuất/autonomous/fullstory vẫn chưa nghiệm thu. [Phạm vi bản thiết kế](docs/validation/2026-10-02-car-actor-design.md). Điều tra subtitle độc lập xác nhận SRT/ASS/WebVTT qua FFmpeg đều có biến đổi literal text. Bản `literal-tx3g-1` stream-copy track UTF-8 nguyên văn đã qua **26/26** test FFmpeg thật và test:typecheck0, giữ nguyên19 assertions sau hai lượt FAIL16/17 và17/19. SRT export/stored samples giữ text và ms clock; FFmpeg extraction vẫn có biến đổi whitespace, không gọi strict extraction PASS. [Contract](docs/LITERAL-SUBTITLES.md), [phạm vi](docs/validation/2026-10-02-literal-subtitles.md).

## Lịch sử evidence trước khi đổi vai trò

Các bảng và kết quả bên dưới thuộc các source cũ được nêu rõ. Yêu cầu một host, quota và mặc định diagram trong lịch sử đã bị thay thế; không áp dụng cho chế độ actors.

Source2.2.18 tại thời điểm ghi evidence: `story-direction-2.2.18`; animation `performance-2.2.5` giữ nguyên. Đã triển khai model đạo diễn cho cinematic, artwork SVG/layers/gradient/mask, palette và camera riêng, biểu cảm theo cue, nhãn do artwork hoặc renderer quản lý, tâm quay trong tọa độ glyph, cùng đối tượng xuyên các cue có nguồn khớp. Studio có ý tưởng hình ảnh và cấu hình model; API/CLI dùng cùng contract. Tám recipe mô tả ý đồ giải thích, không ép bố cục.

| Evidence mới | Kết quả | Giới hạn |
|---|---|---|
| Provider native Codex CLI | Probe JSON thật thành công; sáu response model thật đã được journal; một storyboard qua scene runtime/MP4 | Model `default`; không đo dollar, không coi usage là miễn phí |
| Provider Claude CLI | Adapter/fixtures có; probe máy này báo credit không đủ | Không có video do Claude tạo được nghiệm thu; không thay đăng nhập/mua credit |
| Model pilot source17 | H.264 1280×720/30fps, 21.333s; AAC giọng Việt 21.304s; SRT/QC qua | Quan sát video tìm thấy nhãn lặp, tâm bánh xe sai và bố cục còn tĩnh; không đạt chất lượng mục tiêu |
| Kiểm thử độc lập provider/art source17 | 27/27 scoped, test:typecheck qua | Trước các thay đổi world/renderer sau đó; không thay build/suite/media cuối |
| Kiểm tra độc lập creative world source17 | 48/51; ba regression đỏ thuộc hai lỗi nguồn | Phủ định trước chủ thể và mượn cue khẳng định cũ cho flow ở cue phủ định; giữ lịch sử lỗi |
| Source18 | Build/typecheck qua; đã sửa hai lỗi nguồn, tâm quay và quyền chọn nhãn | Đang kiểm tra độc lập bản sửa, render lại và dựng bài đầy đủ; chưa nghiệm thu release |

Candidate bị model validator từ chối chỉ được dùng lại khi binding cấu hình provider/model, prompt và nguồn khớp. Sửa metadata dẫn xuất không sửa factual visualization, host identity hay narration clock. Report ghi `model`/`authored`/`offline`; technical QC không xác nhận sức hấp dẫn của video.

### Theo dõi sửa lỗi và resume ngày 2026-10-02

- Audit suite source18 trước bản sửa settings: **227/228**, một lỗi nhận presentation patch rỗng. Source đã sửa; log độc lập sau đó **12/12** ca settings/revision qua. Reviewer bị ngắt bởi usage limit trước khi hoàn thành báo cáo; không coi báo cáo còn `IN PROGRESS` là nghiệm thu cuối.
- Studio giữ revision từ lúc mở form; upload/script trả revision do chính mutation tạo. Một editor khác đổi host/model/ý tưởng sẽ gây conflict, không lấy revision mới để ghi đè bằng form cũ.
- Điểm target từ JSON có sai số số thực cỡ `1e-13` pixel so với phép nhân tọa độ stage. Validator hiện chấp nhận sai số tối đa `1e-6` pixel, vẫn chặn target sai hoặc thiếu.
- Creative contract yêu cầu goal/refs/cue IDs/host/visualization/cinematic ngay ở schema dành cho model. Các lỗi độc lập giữa các cảnh được gom vào cùng feedback. Resume dùng bản rejected mới nhất còn khớp binding cùng lỗi hiện tại để model sửa; không sửa raw response, không âm thầm nhận một bản chưa hợp lệ.
- Hai lượt native đầy đủ cũ đã kết thúc: hơi nước semantic validation chưa đạt; ô tô provider thất bại sau timeout. Hai project đang resume bằng cơ chế feedback mới. Chưa có final mới cho hai lượt này, chưa chứng nhận chất lượng hoặc release.
- Build sau schema/feedback qua; còn kiểm tra build sau bổ sung initial repair, suite và các thành phẩm cuối. Reviewer mới kiểm tra độc lập các sửa đổi này; kết quả sẽ ghi theo fingerprint thực tế.

Audit độc lập mới đã hoàn thành: **240/240 suite**, **21/21 focused**, test typecheck exit 0; fingerprint input/source `848bf2e7f0ef297cc5c98cff964bb256cf1f337ab130c25b17bdf2a4ce6de685`. Bao gồm schema bắt buộc, sai số target, nhiều lỗi trong cùng feedback và resume bằng raw design mới nhất; không đổi nguồn thành công để cho qua. Report assembly vượt giới hạn thời gian của lượt audit 22 giây, được ghi riêng; không ảnh hưởng các exit test nhưng không được gọi là hoàn thành đúng thời hạn. Sau audit đã bỏ style vector tự gán khi không có style; build sau thay đổi này exit 0. Matrix giọng/ASR/render hiện tại đang chạy độc lập, chưa có kết quả toàn bộ.

| Phần | Đã triển khai trên nhánh | Việc còn cần xác nhận |
|---|---|---|
| Ba nguồn | Script nguyên văn/TTS clock đo thật; WAV/ASR; SRT/TTS fit; aligned WAV+SRT; matrix source2.2.6 thật 8/8: bốn final qua QC/decode và bốn lỗi bị chặn | Xác nhận lại artifacts trên source bàn giao; sửa/đổi/resume đầy đủ |
| Rig hai host | Pelvis/chest/neck/head, tay/chân phân khớp, face layers, mood/gaze/mouth | Xem chuyển động và identity xuyên bài ở source cuối |
| Animation | Compiler performance-2.2.5: fixed bones/IK, foot plant, walk/stop/turn, think, contact, pick/place, carry và carried entry/exit; audit độc lập phạm vi animation PASS | Tích hợp clip đạo cụ vào contract sản phẩm có nguồn; cut khi đang đi chưa được chứng nhận |
| Director | Story/stage/performance/camera plans; model sáng tạo thay seed; custom SVG/layers, camera và mood; cùng clock/refs/targets/identity/locks | Camera/diễn xuất/ngữ nghĩa và chất lượng video đầy đủ cần kiểm chứng ở source cuối |
| Stage/render | Bối cảnh tự thiết kế hoặc catalog/hash/provenance; SVG thụ động nhiều lớp, props, model và GSAP dưới CSP; flow lặp theo cue; label/pivot riêng | Full story visual/content review; scene limit mặc định 2 MB cho transforms đã bake |
| Studio/API/CLI | Chọn cinematic/diagram; ba cột; bounded edits; derived reports chỉ đọc; freshness; đọc kế hoạch cũ để resume, không sửa/relabel renderer cũ hay tự bỏ lock | GUI đã mở/phát và sửa mood; hoàn tất edit/rebuild/cache và start trên thư mục dùng thật |
| Bàn giao | Scripts preview, setup Piper/ASR và tests mới | Build/suite cuối, docs theo commit, GitHub/release và cài dùng |

Giữ rõ các giới hạn:

- Mouth theo speech activity/RMS; không phải phoneme lip-sync.
- `presentation.mode: story-cinematic` dùng renderer mới; mặc định config vẫn là `diagram` tới khi nghiệm thu.
- Nền do imagegen tạo, không phải tư liệu lịch sử. Catalog/hash duyệt kỹ thuật không có nghĩa người dùng đã duyệt chất lượng từng video.
- Sơ đồ Benz chỉ vẽ đặc điểm có trong narration/source refs; không quảng cáo là bản phục dựng chính xác xe lịch sử.
- Clip carry/entry-exit ở compiler không tự làm mọi action tương ứng hợp lệ trong editor/planner.
- Rule review xác minh contracts/hình học; không thay nghe giọng hoặc kiểm chứng kiến thức/thẩm mỹ. DONE là checkpoint một project dưới các gate cấu hình.

## Evidence đã chạy, còn giới hạn

| Ca | Kết quả thực tế | Phạm vi |
|---|---|---|
| Audit độc lập 2.2.4 | FAIL: góc nội suy gây hở khuỷu, hướng lift, cổ bị che, stage vô hạn | Giữ lịch sử; kết quả render/test 2.2.4 không chứng minh bản sửa |
| Animation/camera/cinematic 2.2.5 | 55/55 tests qua; production/test typecheck qua; build qua | Khớp ở GSAP thật, neck pixel và kích thước custom, targets, source-derived models, camera/seek |
| Suite 2.2.6 | 136/136 tests qua | Có thay đổi predicate/migration sau đó; không thay nghiệm thu video |
| Scoped 2.2.7 | 35/35 cinematic/explainer/Studio tests qua; build và test:typecheck qua | Thêm regression Xe/cue riêng, clause/negation/energy supply và kế hoạch cũ trong Studio |
| Suite 2.2.7 | 141/141 qua; atomic write Windows có ba regression đỏ/xanh | Studio resume/rebuild thật đã chạy sau sửa EPERM/collision |
| Suite 2.2.10 | 155/155 qua; build/test:typecheck qua | Dàn cảnh có trạng thái, paired comparison, control/flow và model transforms; gate scene thật phát hiện fill tween chưa được allowlist chấp nhận |
| Suite 2.2.11 | 155/155 qua; build/test:typecheck qua; cả bốn bài DONE/QC/decode | Audio và narration giữ nguyên; kiểm tra độc lập vẫn tìm thấy hai P2 dàn cảnh |
| Audit sản phẩm 2.2.11 | Predicate, nhiệt, flow/contact và world transforms được xác minh ở các cảnh thực tế | So sánh hai thiết kế hơi nước chưa đủ; cảnh ô tô che nhãn/xe. Không nghiệm thu toàn bài |
| Suite 2.2.12 | 160/160 qua; build/test:typecheck qua | Hai cấu hình hơi nước có nguồn; stage hai xe có đường đi/nút pin; validator nhãn trên toàn clock. Cảnh thật đang kiểm chứng; có lỗi mép nền cần sửa |
| Bốn benchmark 2.2.5 | Acting và carry × hai host: H.264 1280×720, 30fps, 10s, decode qua | Audit độc lập PASS phạm vi animation; clip im lặng riêng |
| Audit animation 2.2.5 | 40/40 tests; 108427 probes; hở khớp lớn nhất <0.2px; 1200 frames và 44 snapshots của bốn MP4 khớp artifact | Fingerprint 869daef3ee8239d673f2298e8369191ec5f48a273951b27aed439f2bfd07b7ec; không phải nghiệm thu sản phẩm |
| Browser carry 2.2.5 | Tua 5.6s → 9.4s → 5.6s: SVG/face giống nhau, prop/hand trùng ở cả hai host | Điểm seek đã lấy evidence, không phải mọi thời điểm |
| Input timing thật | 8/8 đúng kết quả mong đợi: script, WAV, SRT, aligned có giọng/clock; mismatch/no-TTS/fit-failed chặn final | Piper Việt, faster-whisper small và alignment Việt local; render/review/QC của matrix này NOT RUN |
| Matrix render 2.2.6 | 8/8: script/SRT/WAV/aligned DONE và QC/decode/subtitle/30fps qua; mismatch/script thiếu TTS/SRT thiếu TTS/fit-failed chặn final | Rule/technical review, câu ngắn; không thay nghiệm thu nội dung/diễn xuất hai bài đầy đủ |
| Bốn bài 2.2.5 | Hơi nước: người que 37.2s, robot 37.333s; ô tô: người que 42.6s, robot 42.467s; H.264/AAC/subtitle, QC kỹ thuật qua | Bản cũ; audit sản phẩm chưa đạt, chưa chứng minh source hiện tại |
| Stage/caption/history | Resume/hash/locked migration; caption Việt đo glyph; ba bánh được nhận diện | Tests scoped, không thay matrix sản phẩm |

Media/logs và cấu hình giọng local không commit. Evidence source cũ được giữ trong lịch sử và đánh dấu stale; không đổi thành PASS của source mới.

Lỗi ghép SRT đa cue được tái hiện và sửa: padding hữu hạn, giới hạn output `-t`/`-fs`, kiểm tra duration sau ghép. Ba ca hồi quy audio qua. Lần chạy lỗi đã dừng và file tạm lớn được dọn; lần matrix sau hoàn thành. Đây là lỗi runtime thực, không phải TTS thiếu giọng.

Audit sản phẩm 2.2.6 tìm thấy 1 P1 và 5 P2. Kiểm tra độc lập 2.2.11 xác minh các sửa predicate, nóng/lạnh, hai phương án xe/động cơ, contact trước flow và model transforms ở các cảnh được lấy mẫu. Cả bốn video 2.2.11 qua QC/decode kỹ thuật, audio/narration giữ nguyên. Còn hai P2: hơi nước mới so hai bộ phận thay vì hai thiết kế; ô tô có xe/nhãn bị che.

Source 2.2.12 đã sửa hai điểm trên. Bốn regression so sánh ban đầu đỏ trên 2.2.11; năm ca hiện tại xanh, gồm chặn việc dùng chu kỳ nóng/lạnh cũ để suy ra xi-lanh cải tiến giữ nóng. Hai cấu hình dùng source refs của câu so sánh và các trạng thái được kể trước đó. Template hai xe chừa hành lang nhân vật và station pin có thể chạm; validator nhãn kiểm tra toàn clock. Gate contrast thật phát hiện chữ nội bộ chìm nền, đã thêm nền sáng cho nhãn. Preview Studio còn lộ dải trống ở mép khi camera chuyển; việc này và depth/đạo cụ sản phẩm vẫn mở. Bộ clip riêng hoặc suite xanh không đóng các yêu cầu này.

Một lần dựng scene xe 2.2.6 dừng đúng gate do chữ trong sơ đồ đè nhãn; đã bỏ chữ nội bộ trùng vùng và chỉ tạo motion selector thực sự có trong SVG. Không tính lần thất bại này là final đạt.

Scene hơi nước 2.2.10 dừng đúng gate vì tween fill nằm ngoài declarative allowlist. 2.2.11 dùng hai lớp màu SVG cố định và opacity crossfade; regression scene security đỏ/xanh qua, không mở rộng quyền chạy JS. Lần dừng này không tính là final đạt. Audio/narration của các bài giữ nguyên khi replan hình.

## Điều kiện bàn giao còn mở

Theo [kế hoạch A0–A7](V2-IMPLEMENTATION-PLAN.md) và [TEST-HANDOFF.md](TEST-HANDOFF.md): đủ hai bài × hai host, script/WAV/SRT/aligned thật; gates lỗi, sửa nội dung/giọng/host, locks/resume/rebuild; final QC cùng kiểm tra diễn xuất/ngữ nghĩa; Studio dùng được và GitHub đúng commit.

<!-- CAST-MODEL-DEPTH-SOURCE-20261005 -->
## Source05/10: tạo hình vai và chiều sâu đồ vật

Đã có source cast-design-similarity medium, report/context của model và
foregroundSvg thuộc cùng sourced model/shared projection/prop/event clock.
Không ép palette/trang phục hoặc tự đổi actor. Fullbuild49223/schema0992a8
exit0; test độc lập đã giao, chưa nghiệm thu source mới hoặc video.
Native thư viện vẫn QCFAIL/28call/reviewscene2of2, chưa chạy lại.
Xem docs/validation/2026-10-05-cast-and-model-depth.md.
<!-- CAST-DEPTH-SCOPED-PASS-20261005 -->
### Cast/depth contract đã kiểm độc lập; nghiệm thu sản phẩm còn mở

32/32focused,563PASS/2SKIP relevant regression trên current patched source,
whole-test typecheckPASS; parent build1861f9PASS. Cảnh báo trùng vai không tự đổi
identity; foreground cùng nguồn/clock và prop cả hai rig được kiểm bằng actual
headless AUTHORED SVG. Không thêm presenter/máy móc bắt buộc. Phim native QCFAIL
cũ, full playback/listening và input/language/livebackend matrix còn mở.
Xem [evidence](docs/validation/2026-10-05-cast-and-model-depth.md).

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


<!-- CODEX-IMAGE-REVIEW-20261005 -->
### Review ảnh tùy chọn qua Codex CLI

Role visual_review với provider=codex-cli và vision=true có thể gửi contact/
action/reference sheets bằng --image. Request được gắn hash đúng bytes/MIME;
giới hạn64ảnh/20MiB mỗi ảnh/128MiB tổng. Workspace vẫn read-only, tool disabled;
không tự đổi model/account/configuration hoặc xóa budget. Review dùng identity
của từng vai đã duyệt, không khóa mọi diễn viên vào mascot của rig nền.

Bản vá đã build/typecheck; test độc lập và native vision mới PENDING. Phim trạm
xe buýt đã render trước đó vẫn QC FAIL. Ảnh tĩnh chưa chứng minh chuyển động
mượt hoặc audio sync. [Cấu hình, giới hạn và bộ kiểm tiếp](docs/CODEX-IMAGE-REVIEW.md).


<!-- ARTWORK-EASING-20261005 -->
### Nhịp chuyển động theo từng keyframe artwork

Artwork có ease tùy chọn ở keyframe đích:none, sine.in, sine.out, sine.inOut.
Model có thể chọn tốc độ đều hoặc tăng/giảm tốc theo ý đồ, giữ clock narration.
Shot khai báo nhận renderer identity riêng; thiếu ease giữ nhánh legacy. Không
áp template, movement quota hoặc tự thêm motion để vượt QC.

Build/typecheck b42000 đã qua; runtime/seek/cache/video mới PENDING model test.
Giới hạn renderer đã được xác nhận từ source, chưa chứng minh nguyên nhân
freeze hoặc phim đã mượt. [Contract và nghiệm thu](docs/ARTWORK-MOTION-TIMING.md).


<!-- WORLD-BACKGROUND-20261005 -->
### Nền cảnh cùng camera với diễn viên

Background SVG có coordinateSpace tùy chọn:world đi theo camera của actor/model;
frame hoặc bỏ trường giữ bố cục cũ. Midground/foreground đã là world, overlay là
frame; khai báo coordinateSpace ở plane khác bị reject. Designer có thể dựng sàn,
đường, tường và bối cảnh theo câu chuyện; không có mẫu nền/chủ đề bắt buộc.

Opt-in world background nhận scene renderer identity riêng; accepted-cache,
narration/audio, actor/shot locks và source/contact/QC gates vẫn giữ nguyên.
Source/build đã triển khai; nghiệm thu runtime mới PENDING model test. Phim trạm
xe buýt cũ còn QC FAIL; khác hệ tọa độ không chứng minh đã sửa freeze hay video
đã đạt kỳ vọng. [Contract và bộ kiểm](docs/ARTWORK-WORLD-SPACE.md).


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
[Report có phạm vi và bộ kiểm tiếp](docs/validation/2026-10-05-rainy-native-resume.md).
