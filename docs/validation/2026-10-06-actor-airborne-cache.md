# Chuyển động diễn viên và tiếp tục pipeline — 06/10/2026

Tool vẫn hướng tới **chủ đề/câu chuyện → lời kể → phim theo nội dung**, với
người que hoặc robot làm diễn viên trong câu chuyện. Không có quota người dẫn,
cảnh máy móc, màu sắc, costume hay bố cục cố định. Máy hơi nước và ô tô là ví dụ.

Đã tích hợp source cho nhảy đứng tại chỗ và thả đồ vật, dùng chung cả hai rig:

- `performance-2.2.14` nhận jump có chuẩn bị, rời đất, bay, tiếp đất và hồi phục.
  Hai chân bám đất ở chuẩn bị/tiếp đất; shadow ở sàn; IK giữ chiều dài xương.
- Drop cần prop thật, chủ tay, điểm nắm, thời điểm nhả và tiếp đất. Vị trí và
  vận tốc nhả lấy từ bàn tay thực; đường rơi giữ động lượng và trọng lực dương.
  Không teleport prop hoặc thêm target vô nguồn để thay động tác trong lời kể.
- Acting phân biệt `movement: jump` và `operation: drop`. Coverage đòi hỏi clip
  đúng loại, target và cue; đi bộ hoặc chỉ đổi mặt không đáp ứng câu có nhảy.
- Scene editor, version migration, camera, prop binding và repair nhận track
  mới. Plan cũ không có clip mới tiếp tục dùng `performance-2.2.13`, giữ lock.
- Bước phân tích đã được chấp nhận có thể dùng lại receipt gốc, provider artifact
  và journal thành công phù hợp, rồi chạy lại schema/normalizer hiện tại. Không
  nhận một file aggregate chỉnh tay làm checkpoint, không xóa calls/failures.

Giới hạn clip cụ thể: nhảy đứng; không trùng đi bộ, quay, ngồi hoặc fixed-world
contact. Drop là một thao tác có ownership hoàn tất trong shot; một cut được
khai báo rõ có thể bắt đầu với prop đang cầm nếu nguồn, hand pose và các binding
khớp. Handoff, mang xuyên cut, chạy/nhào lộn chưa được công bố là capability.
Các giới hạn này mô tả clip đã code, không quy định phong cách phim phải dùng.

Build full core/Studio/Vite của bản tích hợp: `6903a9 → a4d412`, exit0. Một
typecheck trước đó exit1 vì TS2367 trong cache đã được sửa, giữ lịch sử lỗi.
Model test bản tích hợp trả 148PASS/1FAIL: lỗi thứ tự diagnostic làm subtype
drop che thông báo `needs-motion` của action unsupported. Tất cả tám regression
modal/imperative trước đó qua; các kiểm motion/cache mới chưa chạy. Release
17:35:48UTC, REPORT SHA256 `9939661F11D482AE67333ECF70EA81712834838B8A57BB99EB136EFDCA2E56DE`.

Sau release đã sửa thứ tự diagnostic, bỏ giá đỡ tự sinh dưới vật đang thả,
ghi đúng version compiler14 vào scene report, và giữ ngân sách review/scene
repair khi chỉ nâng cấp source airborne/vocabulary với cùng narration và
cùng fingerprint nội dung/config. Build `3dc328 → 29d579` exit0.

Kiểm độc lập tiếp theo: 149 expectations cũ, 99 motion/cache, 149 regression
liên quan, 26 drop/API/migration và 22 cache-path/legacy parity đã qua. Nhóm
affirmative-source64 có32PASS/32FAIL: public createExplanation vẫn nhận nhảy/
thả có phủ định hoặc giả định. Tally477PASS/32productFAIL và2harnessFAIL được
giữ; có overlap/retry, không phải unique whole suite. Release18:15:21UTC,
REPORT SHA256 `C8D4DCE786BCBE4E9D4F72C3FE39271C30DE83FB5C3F2681E81A7763BF55D47B`.
Benchmark/render/native đều NOTRUN do gate nguồn FAIL.

Sau release + closeout4dd9e9 đã thêm gate nhảy/thả khẳng định theo chủ thể
EN/VI, giữ nguyên cue/negation, không sửa raw response. Ngôn ngữ khác tiếp
tục contract nguồn/model review hiện hành, chưa được chứng minh semantic
gate đa ngôn ngữ. Robot resume đã sửa so sánh actual generationSystem; prompt
airborne phân biệt jump với walk. Hai sửa source đang chờ kiểm độc lập.
Build không chứng minh phim mượt hoặc pipeline tự sinh hoàn tất.

## Bằng chứng ca sinh nhật

Ca Riley/Sam đã tạo lời kể tiếng Anh và Windows Zira audio51,421s/12cues. Cùng
project được resume với tài khoản hiện tại đã được người dùng cho phép. Resume
15:48:40–16:04:10 UTC thoát1; 21 started/21 completed/0 pending, còn9 trong
tổng30. Review0/2; scene repair chưa dùng. Không có storyboard/video/native
vision/full watch-listen. Thực tế USD chưa đo được; cost0 cấu hình không là miễn phí.

318 kiểm nguồn của lexical/rig patch đã qua trong phạm vi riêng. Resume thật
loại bỏ false pin/lever, nhưng chặn câu “Riley tucked the last flower into its
vase…” do validator transfer thiên về cơ cấu, và báo thiếu clip nhảy/rơi.
Sửa source physical placement đã nhận đúng nguồn; các ca phủ định/chỉ dẫn vẫn
phải bị chặn. Hai vòng kiểm độc lập giữ nguyên lỗi thật:

| Snapshot | Kết quả độc lập | Phát hiện |
|---|---|---|
| b7c4 placement |116PASS/4FAIL|should/must/can và bare imperative lọt qua|
| f325 modal repair |145PASS/4FAIL|infinitive hoặc imperative có trạng từ lọt qua|
| Subject repair + airborne/cache |148PASS/1FAIL|Tám regression cũ qua; lỗi thứ tự diagnostic, motion/cache NOTRUN|
| Diagnostic/renderer/budget refinement |477PASS/32productFAIL|Physics/cache/migration qua; phủ định/giả định motion còn lọt|
| Affirmative motion + actual robot system |PENDING|Đã sửa source sau release; chờ kiểm độc lập|

Original script/audio/clock/locks/config/journal và raw responses giữ nguyên.
Không sửa high issue hoặc nhận storyboard viết tay thay kết quả native. Hai
REPORT FAIL có hash07AD6D99… và89F9E780…; release và parent closeout chỉ cho phép
sửa source tiếp, không biến các FAIL cũ thành PASS.

## Nghiệm thu tiếp

Model test kiểm source/cue/target/negation, hai rig, random/reverse seek,
GSAP/bones/feet, release/gravity/ownership/camera, editor/locks/legacy cache và
partial analysis reuse qua API thật. Sau các gate mới cân nhắc resume **cùng
project**, trong số9 còn lại và tổng30/2/2. Không có grant native trong lease
local hiện tại; benchmark im lặng không phải phim kể chuyện được nghiệm thu.

Những yêu cầu toàn sản phẩm vẫn mở: phim tự sinh nhiều thể loại; script/WAV/
SRT/WAV+SRT; sửa nội dung/giọng/cast/resume; EN/VI/JA/KO theo backend khả dụng;
backend TTS API của người dùng/OmniVoice; chất lượng toàn phim và xem/nghe thật.
HyperFrames HTML/CSS/SVG/JavaScript là renderer hiện hành; plugin Remotion đã
được đọc để đối chiếu workflow, chưa có Remotion adapter chọn được trong tool.


## Sửa chủ thể/modal — kiểm tiếp

Bản affirmative đầu đã build357e67→90d9cf exit0; cùng64predicates trả56PASS/8FAIL: phủ định đã chặn, May may jump và Will will drop còn lọt do token modal bị hiểu như tên lặp. Release18:25:17UTC, REPORT SHA2560E2FFBC13D365A2EFFB99870CEC24DE4E1E644BC9A894313C45DEA7138D73FAC. Source/compiled/case396/420/148 giữ bytes,7identities terminal. Các kiểm source/creative tiếp và native NOTRUN.

Sau closeout70cda6 đã sửa token tên lặp liền nhau và ngữ cảnh điều kiện/chỉ dẫn đầu câu; source9936bd/48e3fc, build42c5ed→ed53f9 exit0. Không sửa assertions/raw response/narration. Current plan.ts SHA256e75bf855e079709f09d716b8aa4a10ffb67b72a5d8a87cd1a00cd7c6620f963d, creative.ts e1c6268035b34ea4b91973b94de600a3db638470eda608c12e33aa85540b24ee. Test độc lập và robot resume mới đang chờ; chưa có grant native trong phase local này.


## Đại từ, mệnh lệnh và gap biên nhận phụ

Release18:46:22UTC:64+149cũPASS; nhóm156natural136PASS20FAIL. Tổng349PASS20FAIL không phải whole suite. Riley smiled; she jumped và Riley mỉm cười; cô ấy nhảy bị directvalidateSceneIntent từ chối; ba dạng mệnh lệnh lại được nhận. Bốn combinations rig/source/compiled đều giữ rawFAIL. Các20 publiccreateExplanation assertions sau bước directgate không tới, robotcreative checks NOTRUN. REPORT E7E8A7D0AAAAFCF8473F29916217FAA9CF8C3CDE839F60DC591AB26BC6A7CABE, release97F35392DB5A6F0676C76B394654ED144428DA35E4FC2E07B6F69C306FAF5AFE.

Copied helper từng trỏ root cũ affirmative64: driver EEXIST trước khi spawn behavioraltest. Không đổi raw focused stdout/stderr, REPORT/release cũ; đã ghi đè supervisor.json, driver stdout/stderr, current-census.json, process-release.json và append boundary-events. Không có backup byte trước cho cácreceipt phụ: giữcurrentcopies/provenance semantic recovery, không restore/hide và không tuyên bố toàn oldroot bất biến. Csource/compiled/case396/420/148 giữ bytes; closeout9b83db31identities terminal,21calls nguyên.

Sau release đã sửa đại từ có thể kết thúc prefix và không dùng chủ thể nhớ từ vế trước để chứng nhận bare Jump/Drop imperative. Source96c25f, build3188e5 và completion được ghi trong checkpoint máy. Runtime sửa mới và robot actualsystem replay vẫn chờ modeltest; không có native trong phase local.


## Source/creative gates qua; cache lịch sử còn chặn

REPORT1D57D378548A501E46DEA7FF923756971685F476AC4297E58195300684096610, formal19:14:24UTC05/10:156natural +64affirmative +26creative wire +60finite =306PASS. Hai lần sửa fixture creative giữ raw6FAIL rồi18FAIL; nguyên assertions. Tổng raw360 executions334PASS26FAIL có overlap/retry, không phải unique whole suite. Public source/compiled robot actualsystem replay, negative bindings, prepatch accepted-cache bytes và wording jump/walk qua trong phạm vi local fake router. Không có native/provider/media/browser/8850.

Preflight receipt sinh nhật authentic0PASS2FAIL: story-analysis tái dùng, character-bible gọi THROW-only stub rồi dừng; chapters/all beats NOTRUN. Native calls0;21/21/0remaining9 nguyên. Phiên tester bị giới hạn sử dụng sau khi tạo REPORT/release; freshparent8a2d55 lúc01:02:29UTC06/10 xác nhận396source420compiled148case exact và43identities terminal, gồm closingauditor. Parent không chạy runtime tests hoặc provider.

Read-only trace cho thấy cache chọn receipt62cfc5f1… với callbda36085… (phân tích cũ, IDs Riley/Sam), trong khi còn receipt5e08e3cc… có IDs riley/sam. UUID path order không phải thứ tự accepted. Source85f0df đổi thứ tự chọn sang successful journal response mới nhất có receipt domain-accepted và qua mọi gate hiện tại; không đổi request/source/config hoặc nhận rejected aggregate. Typecheck8ba2a3 FAIL do noUncheckedIndexedAccess; sửa guardcd1ddc rồi build e5f66e→ae1449 exit0. Current planning-cache SHA9c02c1cb050af8bccc2f4555e2bd79f2591ccd3470e6c84131ef1a44a8d5ad2e. Runtime kiểm thứ tự và toàn authentic chain mới PENDING; không suy ra cache cũ hoặc native resume đã qua.


## Checkpoint canonical của hồ sơ nhân vật

Chronology retest release01:10:32UTC06/10, REPORT32DC0B9A709D2B41E6F328DFF3A3A31785DA517AA804A92AE38EA9D84061CAFF và releaseE4524F204DDB40E801270E1C3CB616CF3CB40DA456DB778E27488191775EF9D5:0PASS2FAIL, no provider; further chronology tests NOTRUN. Cả source/compiled chọn đúng story-analysis5e08e3cc…/calld179c8b7…/completed index23. Bible accepted36d49d8a… khác duy nhất existing: lần đầu rỗng, lần resume là đúng accepted result riley/sam. Provider-parsed response và accepted result bằng nhau. Freshparent369e16 tại01:12:34 chứng minh396/420/148exact và9knownidentities terminal, gồm completion writer; original21/21/0remaining9.

Source e48718 nhận diện riêng character-bible checkpoint khi existing đúng accepted result và result đúng canonical parsed provider value; toàn context khác phải bằng nhau. Request/schema/routing/settings/provider/journal/status/hash và current normalizer/locks vẫn bắt buộc. Kết quả normalized khác raw canonical provider không dùng exception này. Không sửa receipt gốc, không lấy rejected aggregate, không xóa existing/locks khỏi source hoặc cache key. Proof ghi contextMatch=accepted-character-checkpoint hoặc exact. Build4beb6c→b31205exit0; planning-cache SHA20e23a1a13e429aa6c76d806cd24ca8f7535698b3b0666169e3f03a64f4723af. Authentic-chain/order/negative tests mới PENDING; không có native trong lease local.


## Gate local hiện hành — PASS, phim vẫn chờ

Lease01a10ec6, root planning-checkpoint-local-20261006T011427Z, released01:22:17UTC:82PASS0FAIL, child exits0, không retry/thay assertions. Exact authentic chain2PASS: source/compiled tái dùng story-analysis, character-bible, chapters và4beats;0structured stub attempts,0real provider calls. Supplement80PASS kiểm latest successful accepted journal thay UUID/mtime/timestamp traps; latest rejected/failed/corrupt/stale không được promote. Canonical provider checkpoint qua; source/cue/clock/identity/locks/approved references/schema/provider/model/settings/baseRequestHash/binding drift và coordinated receipt edits bị chặn. Không dùng normalized result khác canonical provider cho exception.

REPORT SHA231D967EAC136E66338C75E99F36F37640A970E33C50ED973BBF6369D91CB411; release3CC0A8C3033E42B6C65AE24B591DA815AC0200B24382ABECEED042262EC10D68. Freshparent2557fb lúc01:22:40UTC396/420/148exact15knownidentities terminal (completionwriter gồm riêng); giữ journal21/21/0remaining9. Optional4tsxIPC pipe attempts bị guard chặn, không là provider/service calls. Historical generation settings chưa được attested retroactively. Tất cả FAIL cũ và procedural auxiliary gap giữ nguyên.

Build4beb6c→b31205exit0; compiler/airborne/geometry không đổi kể từ scoped physics proof trước. Không cộng306+82 để gọi whole-product PASS. Đây là code/protocol acceptance; native original resume, fresh storyboard/film/vision/fullwatch-listen và genre/input/rig/language/backend matrix vẫn NOTRUN/OPEN. Native ca sinh nhật chỉ tiếp tục cùng project/nguồn/audio/clock/config/account đã duyệt, cap30/2/2 nguyên, tối đa9calls còn lại; không force/reset/clone exhaustedcase hoặc fakeDONE.


## Public resume trên project gốc — storyboard FAIL

Ca sinh nhật chạy đúng CLI resume một lần trên source2f2222f,01:32:26–01:44:21UTC06/10, exit1. Tái dùng7receipt phân tích được chứng minh trên project gốc; explanation được model thật chấp nhận,10beats/contentIssues[]. Ba storyboard structured response được provider trả thành công nhưng domain bị từ chối. Giữ toàn bộ phản hồi, không chuyển provider-success thành production-accepted. Lỗi cuối gồm thiếu Riley manipulation tại ch001.b002, model continuity trong ensemble, moving flowers không có primary hand/action owner khớp và camera cắt đầu. Render/scenes/draft/final/native image review/xem nghe toàn phim NOTRUN.

REPORT89857FF3E1AC19D41E7D16C703287C879DC02CF34FFC5B80234E1DA7C45873EF; release7F9BD6FCE8F92E53D7E2910BF2CF69E11D036BCA5BCDFA46AC860FACCF580DC0. Root C:/Users/Duongvh-pc/codex-test-evidence/birthday-native-continuation-20261006T012859Z. Formal01:52:47UTC và addendum01:53:57UTC; parentb9ed81 freshcloseout01:57:07UTC396source/420compiled/163case exact,55protected/old journal+logprefix exact,29observed identities terminal. Kernelbirth/argv/exe được đối chiếu; chưa quan sát hết mọi process thoáng qua, không suy ra toàn lịch sử OS.

Original21/21/0→25/25/0,5calls còn lại trong cap30. Review0/2,sceneRepairBudget{}; không reset, không viết lại nguồn/audio/clock/config, không writer/TTS mới.270218tokens ghi nhận; actualUSD UNKNOWN/UNMEASURED, journalcost0 không chứng minh miễn phí. Giữ failures và mọi gap lịch sử; source306/cache82 không thay nghiệm thu native.

Sau formal release, source mới sửa shared-model exit chỉ kiểm một lần ở scene primary; diễn viên phụ vẫn chịu gate riêng về nguồn, identity, clock, contact, props, rig và camera. Trước đây phép kiểm phụ bỏ primary props rồi đối chiếu model exit với vị trí ban đầu, gây false rejection khi primary thật sự di chuyển đồ vật. Điều này không khiến phản hồi native03 được chấp nhận: vẫn thiếu nhiều hành động và lỗi owner/camera. Kiểm độc lập source/protocol149ca đã qua; native03 vẫn bị từ chối đúng các lỗi còn lại. Thông tin hướng dẫn generation gồm metric rig thật, nghĩa vụ diễn xuất canonical/source windows, global/local clock, coordinate và primary moving-prop ownership; không viết tay storyboard, đổi nội dung hoặc ép palette/cuts/host quota. Chi tiết và phạm vi tại [ensemble acting guidance](2026-10-06-ensemble-acting-guidance.md).


## Gate source/protocol hiện hành —149PASS

Root acting-brief-ensemble-local-20261006T020049Z; formal02:19:17UTC, completion02:19:55UTC.149distinct scoped cases PASS,0currentFAIL;0native/provider/TTS/browser/media/vision calls. Source397/dist423/case163 byte/path exact; old repository tests unchanged. Both rigs/source+compiled validate legitimate primary pickup/carry with supporting fixed contact, reject incorrect primary exit and invalid supporting clock/source/identity/hand/contact/props/scale/camera. Whole public createCreativeStoryboard retains complete native03 JSON plus all current coverage/owner/camera diagnostics in initialRepair; invalid secondTarget is rejected at the whole-board gate that owns it. Actual generation capture includes rig/canonical windows/ownership data; accepted prepatch cache unchanged, edited/incompatible cache not promoted.33unchanged subject/relative-source regressions passed. EN/VI/JA/KO checks here prove request/source-data transport, not narrated-film acceptance.

Raw history retained: unit64PASS22FAIL, unit-corrected66PASS20FAIL, unit-final86PASS; boundary51PASS4FAIL, corrected22PASS; authentic6PASS2FAIL, corrected8PASS.149is the distinct current set, not a sum of every repeated execution.48raw failure observations remain classified as external fixture/setup/text/incorrect-entrypoint defects; no production predicate/tolerance/old repository assertion was relaxed. Required artwork/source identity/carryOffset were repaired in fixtures; the secondTarget rejection assertion moved to its existing whole-board authority and keeps the same semantic requirement.

REPORT SHA9AC87475C5C7B2D9AF3F3F7A8FBBAB96B0C19A800DAD4B4C2A1D6D6D390AA8E9; releaseCAE39B4AE088EA72B5A74DBB3B7347EDC687060B620039A64D6049C4C7F6E20D; completion1FD3E26FE6E54D3E5F9DE04B6147AB003100E3070E0D5DDFD61D5FF791251E9A. Freshparent66df09 exit0 at02:21:23UTC confirms397/423/163exact and48observed identities terminal, including final writer separately; no owned listener.18optional tsx socket attempts were guard-blocked, not native calls. Source/compiled freeze released; no further producer grant comes from that local lease. Original25/25/0remaining5,script/audio/config/clock/history unchanged. FullC1–C6 and actualmovie quality remainOPEN.
