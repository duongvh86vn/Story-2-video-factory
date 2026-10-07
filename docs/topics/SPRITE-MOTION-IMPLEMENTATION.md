# Cầu nối sprite motion — kế hoạch triển khai

Source mục tiêu: [đánh giá sprite-gen](SPRITE-GEN-ASSESSMENT.md), pin 2.38.0 / f7cb0db. Kết quả mong muốn là nhập asset chuyển động đã có, đăng ký model/view/anchor và phát trong clock của Factory, trước khi dùng asset đó cho các cảnh kể chuyện.

## Tiến độ source — chưa nghiệm thu runtime

**Source-colour candidate `31070cc`:** original RGB+AI matte đã nối vào đầu/cổ/áo/vạt/mitten/foot của source body qua optional `sourceColour=original-rgb-v2`; source-only/actor-required, không đổi default hoặc view3/4. Candidate matte loại bớt giấy bằng bounded SVG matrices, stage hai PNG/hash và đổi body/head renderer12/fingerprint/cache. [Figure tĩnh và giới hạn](SOURCE-RGB-MASTERS.md), [sáu NOT RUN/lệnh server](SOURCE-COLOUR-RIG-HANDOFF.md), [review/fixes](reviews/source-colour-rig-review-v1.md). Full build/typecheck/schema exit0 trên foundation; source review không là art/video approval. Anchor/pose/cloth/mouth/view/props/receipts và video ba input vẫn phải hoàn thiện.

**Source arms `e609097`, fixes `718b53c`/`31297be` (08/10/2026):** current source-body expressive gestures dùng góc khớp/FK fixed lengths thay pole transit80ms. Default lấy dấu gập chain thật ở entry, kể cả think khi chạy, giữ xuyên run exit; explicit rest/reach qua zero flexion. Cung vai được đăng ký từ entry, có canonical180° tie và corridor±90°; vượt phạm vi chặn thay vì đổi cung giữa chừng. Aim scale theo source reach. Contact/carry/drop/spear và generic/legacy giữ solver. Bodycompiler17/trajectory descriptor v3 và cache cả source/body-view families có fingerprint mới. [Source/commands/limits và9NOTRUN](SOURCE-ARM-TRAJECTORIES.md), [ba P2 và source PASS sau sửa](reviews/source-arm-trajectory-review-v1.md). Không approve artwork/runtime/speech/native motion; model test còn phải kiểm actual acting/clearance và pipeline video.

**Authoring giữ RGB gốc:** hai [SVG master tĩnh và ảnh so sánh](SOURCE-RGB-MASTERS.md) nhúng nguyên màu ảnh cận gốc, dùng cutout AI chỉ làm matte. Viền nền/cắt tóc-áo-biên tay chân vẫn cần căn lại; chưa layer registration/rig/view/mouth/pose/timeline/approval. Không thay asset sản xuất hoặc mở final từ các mẫu này. Người dùng không có API chuyển động từ ảnh; SVG/HTML5/GSAP và công cụ ảnh hiện có vẫn là đường triển khai.

**Mốc authoring hiện hành `8998b39` + fixes `7f7b28b`/`9cc8b63`:** công cụ đo alpha offline với native windows thủ công/hash-bound và worksheet clipped tĩnh đã có source. Lila v3/Karo v2 đã tạo, đo và có Gemini static advice; vẫn candidate chưa đăng ký/duyệt, không có motion clock tự suy ra. Người dùng không có API image-to-video; tiếp tục HTML5/SVG/GSAP/art workflow. [Artifact/lệnh/môi trường](MOTION-ART-MEASUREMENT.md), [review source sau ba fixes, phạm vi và giới hạn](reviews/motion-art-measurement-source-review-v1.md). Fresh full build/test:typecheck/schema export exit 0, **4 measurement declarations NOT RUN**; các declarations trước đó vẫn chưa chạy. Source này bổ trợ authoring, không mở final hoặc hoàn thành toàn tool ba input.

| Phần | Trạng thái | Bằng chứng |
|---|---|---|
| Import atlas/strip, registration, hash và version bất biến | Đã triển khai, qua review source | `f0b4ae4`, `0d5eeff`; test khai báo trong `tests/sprite-motion-import.test.ts` |
| Frame sampler, landmark world và literal GSAP compiler | Đã triển khai, qua review source | `5a9950f`, `0bb0c44`; 22 test khai báo trong `tests/sprite-motion-player.test.ts` |
| CLI/API, preview và schema export | Đã triển khai, qua review source | `1f83b3f`, `3ee1801`; 21 test khai báo trong `tests/sprite-motion-api.test.ts` |
| Runtime/GSAP/browser, art chuyển động thật và pipeline video | Chờ model test và bước tích hợp sản phẩm | [Bàn giao test](SPRITE-MOTION-TEST-HANDOFF.md) |

Review source không xác nhận test assertions pass hoặc video đạt mẫu. Import/preview hiện vẫn là công cụ kiểm asset ứng viên; topic giữ `productionReady=false` và `productionRig=null`.

Kiểm chứng source của controller trên code snapshot `3ee1801` ngày 07/10/2026:

| Lệnh/kiểm tra | Kết quả | Phạm vi |
|---|---|---|
| `npm run build` | Exit 0 | TypeScript core, typecheck Studio, Vite build |
| `npm run test:typecheck` | Exit 0 | Kiểm kiểu khai báo test; không chạy callback/assertion |
| `npm run schemas` | Exit 0, regenerate không đổi file đã commit | Ba schema mới xuất ở `1f83b3f`, source/schema không đổi ở `3ee1801` |
| Review từng task | Đã qua source gate sau sửa | Ancestor junction, manifest expansion, clock chung và CLI print URL |
| Review toàn mốc cầu nối | Source gate ready; không có finding Critical/Important | Review độc lập `b3fcef0..e9d41f5`; không chứng nhận runtime hoặc toàn sản phẩm lịch sử |
| Runtime/browser/video/asset Lila-Karo | NOT RUN / chưa nghiệm thu | Giao model test theo yêu cầu người dùng |

Minor được giữ cho bước sau: biểu thức đếm/phát event trong player còn dày, nên tách và đặt tên biến khi nối actorScene. Review từng task và toàn mốc chưa thấy lỗi hành vi ở phần này; quyết định hoãn refactor đến bước tích hợp actorScene, giữ các test ranh giới đã chuẩn bị. Đây là source candidate được bàn giao để model khác test; merge sản phẩm/nghiệm thu video vẫn chờ runtime và art evidence.

Minor preflight đã được xử lý trong mốc actor composition dưới đây bằng helper `visualEdges`; regression player vẫn chờ thực chạy.

## Bước tiếp theo — actor composition source

Đã bổ sung stage contract/compositor nhiều actor, root keyframes, clip visibility, contact tại điểm có registration và adapter gắn fragment với Shot/cast/source refs. Clock được chuyển thành helper chung; event preflight của player được tách thành `visualEdges`. Xem [plan](../plans/2026-10-07-sprite-story-composition.md) và [bàn giao test](SPRITE-STORY-TEST-HANDOFF.md).

Đây là actor fragment có ràng buộc câu chuyện, chưa nối vào renderer canonical hoặc chọn asset từ pipeline. Giữ `productionReady=false`, `speechSync=none`; sourced dialogue bị chặn `needs-sprite-speech`. Source `3a403a8`, fix `8b4b930`: build/test:typecheck/schema export exit 0; [review độc lập](reviews/sprite-story-source-review-v1.md) xác nhận source gate sau sửa ba Important và hai Minor. Chuẩn bị 20 ca test mới; runtime/video acceptance **NOT RUN**.

## Renderer canonical — source tại `5e396a7`

Opt-in `cinematic.spriteStage` đã có branch scene đầy đủ với world art planes, đối tượng, camera và actor PNG nguyên dữ liệu; shot không chọn field này giữ renderer cũ. Loader kiểm immutable descriptor/sheet; staging, source comparison và input identity dùng cùng context. Scene geometry tagged `sprite-actors` và camera report nói rõ chỉ kiểm bounds/landmarks tại các clock được lấy mẫu. Clip phải khai `sourcedAction` để được tính coverage; registered motion state phải khớp declaration, nhưng declaration không chứng minh animation đúng nguồn.

Candidate final bị chặn ở engine, pipeline, QC và download. Speech, skeletal props và cross-shot continuous handoff chưa có trong branch mới nên báo blocker rõ. Async domain normalization được await trước receipt/hash/cache acceptance. Ban đầu có 11 test canonical scene và 2 test async normalization; thêm ba ca regression sau review, tổng 14 + 2, **chưa chạy callback/assertion**. Fix `d1fb7e4`, `36e2172` giải quyết resource allowlist, same-actor hands và contact object/label/response endpoint framing. Fresh build, test:typecheck, schema export và diff check qua; [review source độc lập](reviews/canonical-sprite-source-review-v1.md) PASS trong phạm vi mốc code, không phải nghiệm thu sản phẩm. [Plan](../plans/2026-10-07-canonical-sprite-scenes.md), [lệnh bàn giao](SPRITE-STORY-TEST-HANDOFF.md).

Catalog/Studio chọn asset đã được viết source ở mốc tiếp theo; receipt art/motion acceptance, source artwork đủ diễn xuất, speech/props/continuous contact và video ba input đến final vẫn là công việc sản phẩm còn thiếu. Không dùng mốc renderer này để công bố tool hoàn thành hoặc Lila/Karo đạt mẫu.

## Thư viện chuyển động — source tại `d974dbd`

`input/motion-catalog.json` gắn nhãn hành động cho phiên bản motion bất biến. Snapshot cho Director gồm actor/state/view/reference, native clock/playback, frame bounds và common landmarks. Chọn `presentation.actor_renderer: sprite` yêu cầu actor shot dùng spriteStage đúng thư viện; explicit rig từ chối sprite, cấu hình cũ thiếu field vẫn giữ behavior trước. Asset và labels vẫn candidate; thư viện không duyệt anatomy hoặc mở final.

API/CLI có đọc thư viện verified; Studio có form chọn khả năng và preview từng phiên bản, lưu với revision. Input identity phần hình và normalization kiểm lại selection khi cache/resume/locked shot; narration identity tách riêng. Fix `d8954d7` giữ annotations không hiện trong một listing lệch snapshot và hash effective prompt; `8401278` invalidate phần hình ngay khi lưu thay đổi, giữ audio/locks. Nhập motion vẫn qua CLI/API hiện có, chưa có generator tự dựng bộ diễn xuất được duyệt. [Plan](../plans/2026-10-07-sprite-motion-catalog.md), [review pending vì quota/timeouts](reviews/sprite-catalog-source-review-v1.md), [20 khai báo test mới và lệnh bàn giao](SPRITE-CATALOG-TEST-HANDOFF.md). Fresh build/typecheck/schema export exit 0; runtime/UI/video **NOT RUN**; cần review và nghiệm thu đúng phạm vi trước khi dùng.

## Global Constraints

**Actual motion studies + per-position anchors `5b283ad`:** ba PNG đối thoại Lila/Karo đã tạo bằng built-in image_gen, một lượt Gemini/9router tư vấn ảnh tĩnh còn nêu stroke/foot/hem/scale drift. [Artwork và việc cần sửa](MOTION-ART-STUDIES.md); vẫn chưa đăng ký/duyệt. Importer có optional complete `anchors[]` frame-local, không infer từ alpha hoặc đổi PNG; absent giữ shared anchor/legacy contract. Existing native player/camera/contact dùng mỗi frame anchor. Full build/typecheck/schema export exit 0; ba ca mới NOT RUN; [review source](reviews/sprite-frame-anchor-source-review-v1.md) không có findings trong phạm vi mới. Không dùng điểm neo để che head/body hoặc limb drift; final candidate, art/runtime và full product acceptance vẫn pending.

**Speech foundation source (lịch sử):** `a6b62fa` có importer/loader/list mouth PNG theo exact native version và optional player rest/open trên cue/audio clock; fix `59af28e` qua focused source review hai Important. CLI/API và 24 ca NOT RUN có ở mốc đó; [review foundation](reviews/sprite-speech-source-review-v1.md) giữ findings, không phủ code mới.

**Speech canonical source `3d9aab1`:** Stage/Shot yêu cầu exact variant/native, original cue/source refs, unique actor ownership và toàn cửa sổ cue có actor hiện. Canonical renderer/sources/staging/allowlist/review/cache/locks, catalog/Director và Studio selection dùng verified variants cùng narration/activity gốc. CLI/API/Studio có diagnostic rest/open preview không audio; không là voice evidence. Build/typecheck/schema export exit 0; [plan](../plans/2026-10-07-sprite-speech.md), [42 ca NOT RUN](SPRITE-SPEECH-TEST-HANDOFF.md), [review source và fix 818b036 đã giải quyết Important](reviews/sprite-speech-integration-source-review-v1.md). Thiếu/sai speech binding vẫn chặn, final candidate không mở. Chưa tạo/duyệt artwork thật, chưa nghiệm thu độ mượt hoặc ba input video; props/handoff, mixed-speaker word/subcue timing, art/motion receipts và gaze còn phải làm.

- Tool vẫn ba input: kịch bản / WAV / câu chuyện → kịch bản. Lila/Karo là diễn viên; không giới hạn nội dung vào demo săn.
- Không sửa PNG nguồn hoặc tự duyệt ảnh AI. Mọi motion import là candidate, productionReady=false. Hash ảnh tham chiếu là provenance, chưa chứng minh identity hoặc chất lượng.
- Không mirror áo/tóc để giả view; registration phải chỉ rõ view, anchor và playback semantics. Không mặc định cú đâm lặp theo loop flag nguồn.
- Compiler chỉ xuất paused GSAP literal timeline calls trong validator hiện tại. Không thêm callback hoặc timer chạy độc lập, không nới validator.
- Runtime tests, fixture/render/MP4 và nghiệm thu video giao model khác. Chỉ chuẩn bị test cases, chạy build/typecheck và kiểm source trong triển khai này.
- Không cài upstream, download RIFE hoặc gọi provider ảnh/video mới để chứng minh source adapter. Dùng bundle do provider phù hợp tạo hoặc người dùng nhập; khả năng tạo motion và review tiếp tục là công việc sản phẩm còn thiếu.

## Task 1 — Nhập và lưu asset bất biến

`packages/motion/schemas.ts` là contract đã tạo. Registration có `anchor` chung bắt buộc và, từ `5b283ad`, `anchors[]` tùy chọn đủ mọi playback position (1–512), tọa độ pixel trong từng frame. Count thiếu/thừa hoặc point vượt frame phải lỗi trước publication; source/descriptor hashes giữ từng point và version thay khi sửa. Không có field mới thì contract cũ không thêm default. Viết `packages/motion/import.ts`, xuất:

```ts
normalizeSpriteMotion(metadata: unknown, sheet: {width:number;height:number;hash:string}, registration: MotionRegistration, metadataHash:string): ActorMotion
importActorMotion(projectRoot:string, metadataFile:string, registrationFile:string): Promise<ActorMotion>
loadActorMotion(projectRoot:string,id:string,fingerprint:string): Promise<ActorMotion>
listActorMotions(projectRoot:string): Promise<ActorMotion[]>
```

Atlas: đọc rect theo frame_layout.rows.<state> và animation.rows.<state>.durations_ms, dùng fps chỉ khi không có durations_ms; giữ thứ tự và rect lặp. Landmarks upstream là tọa độ atlas tuyệt đối: trừ rect origin. Registration landmarks nếu có là tọa độ frame và phải đủ số frame. Thiếu landmark bắt buộc phải lỗi, không suy luận.

Strip: `<name>.strip.json` → sibling `<name>.strip.png`, frames/w/h/delay_ms/kind/loop; dùng registration anchor, không mặc định bottom-center. Metadata không có loop có thể suy ra từ kind chỉ với strip đã biết; phải giữ trong provenance. Hai loại schema có format khác nhau, không đoán grid atlas.

Source PNG nằm trong thư mục metadata, dùng safeRealPath để chặn escape/symlink. PNG signature/bytes, kích thước decode/alpha, rect bounds, frame count/timing phải hợp lệ; metadata và registration ≤2MB, sheet ≤16MB và 64Mpx. Hash source metadata/PNG/normalized registration và referenceHash. Không thực thi file metadata hoặc hướng dẫn trong nó.

Lưu `assets/motions/<id>/<fingerprint>/sheet.png` và `manifest.json`; không cập nhật asset-manifest như approved. Ghi file mới độc quyền hoặc chấp nhận file đã có chỉ khi bytes/hash bằng nhau; không overwrite candidate khác. load xác minh id/fingerprint/path và hash PNG, fingerprint descriptor. list đọc directory cố định, bỏ qua symlink, kiểm qua load, tối đa 256 versions. Chỉ source import; không mutate project storyboard/audio.

## Task 2 — Biên dịch timeline và preview

Viết `packages/motion/player.ts`: compileActorMotion, sampleMotionFrame, motionLandmarkAt. Frame chọn theo duration tích lũy; once giữ/first/hide theo policy, loop theo chu kỳ. Clip once không được ngắn hơn toàn động tác ở rate đã chọn. Sampling trả kết quả deterministic tại cùng clock, không gọi random/Date hoặc timer. Landmark về world từ anchor, scale, rotation và placement.

Contract Task 2: `compileActorMotion(motion:ActorMotion, clip:SpriteClip, sheetUrl?:string): {svg:string;js:string;report:{producer:string;actorId:string;fingerprint:string;frameCount:number;eventCount:number;nativeDurationMs:number;clipDurationMs:number;sourceLoop:boolean;playback:ActorMotion['playback'];productionReady:false;speechSync:'none';warnings:string[]}}`; sheetUrl mặc định `assets/<sheet.hash>.png`, override chỉ nhận local relative path an toàn. `sampleMotionFrame(motion:ActorMotion,clip:SpriteClip,timeMs:number):number|null`; null trước clip hoặc khi end=hide, index theo clock. `motionLandmarkAt(motion:ActorMotion,clip:SpriteClip,name:string,timeMs:number):{x:number;y:number}|null`; yêu cầu landmark thiếu phải lỗi, còn actor đang hide trả null. Clip placement cố định tại bước này; chuyển động root/camera trong scene sẽ là lớp timeline ngoài.

Cuối clip: once kết thúc chuỗi ở nativeDurationMs/rate; hold giữ frame cuối, first trả frame đầu, hide ẩn ngay khi hành động kết thúc. Loop lặp chỉ trong [startMs,endMs); tại/bên ngoài endMs áp end policy: hold giữ frame sát trước end, first về frame0, hide ẩn. Các ranh giới frame là trái đóng/phải mở. Rate không ép toàn động tác vào clip quá ngắn. Không giữ float-to-integer rounding làm đổi timing strip. SpriteClipSchema parse trước mọi phép tính; frame schema parse trước dùng. Một helper kiểm once span được dùng bởi sampler/compiler.

Clock renderer và sampler dùng chung độ phân giải GSAP: `Math.round(seconds * 10000000) / 10000000` (0.0001 ms). Áp dụng cho clock đầu vào và mốc chuyển frame/entry/end đã tính; native duration và metadata không được làm tròn thành millisecond nguyên. Ranh giới trái đóng/phải mở được xét trên clock renderer này; hai clock raw trong cùng ô độ phân giải không được hứa cho hai frame khác nhau. Compiler/report ghi rõ độ phân giải này; test parity dùng cùng quy tắc và có case ngay trước/trong/sau ô làm tròn. Once span vẫn kiểm đầy đủ thời lượng native trước lượng tử hóa.

Tối đa 6000 transition events; tính/kiểm trước vòng sinh để không hang vì vòng ngắn lặp 120s. Rect/anchor giống nhau chia sẻ visual node; landmarks của từng instance không nhập chung. Sprite SVG crop giữ alpha và source pixel; group placement dùng scale dương, không mirror. Sinh `tl.set` trên selector scoped compositionId, set baseline ở0, future changes có immediateRender:false; không thêm tl registration trong js fragment, renderer tiêu thụ fragment trên timeline hiện có. Không đổi validator.

Ảnh PNG local đã đăng ký được crop bằng SVG clip/translation tĩnh. Rect lặp có thể chia sẻ hình nhưng vẫn giữ instance timing/landmark. Baked pose đổi bằng tl.set opacity, không fade hai cơ thể. Rate không thay native metadata. Limit tổng timeline events để tránh scene quá lớn, báo lỗi rõ thay vì cắt frame. Preview hiển thị candidate, actor/view, nguồn loop và playback được chọn.

## Task 3 — CLI/API, test handoff và review

CLI: motion-import, motion-list, motion-preview; API project GET motions, POST import (đường dẫn bundle bên trong project), GET preview và sheet theo id+fingerprint đã xác minh. Không nhận URL hay đường dẫn PNG tùy ý trong GET.

Chi tiết Task 3: CLI `motion-import <project> <metadata> --registration <file>` (relative selections theo projectRoot, absolute được dùng khi người dùng chọn file local); `motion-list <project>` xuất JSON; `motion-preview <project> <id> <fingerprint> --port 8850` kiểm descriptor và in URL preview, không render/xuất fixture. Import yêu cầu project có config và idle; load/list không cần gọi narration/model.

API `GET /api/projects/:name/motions` trả descriptors candidate; `POST /api/projects/:name/motions/import` dùng mutate/ensureIdle hiện có, body `{metadata:string,registration:string}` strict và cả hai path phải được boundPath bên trong project trước import. `GET /api/projects/:name/motions/:id/:fingerprint/preview` là workbench trusted (không phải scene production), dùng compiler Task2, hiển thị model/state/view, candidate, speechSync none và playback policy. `GET .../sheet` chỉ trả PNG của descriptor đúng hash; reread bounded + hash trước reply, không reopen stream chưa xác minh. API GET stock GSAP runtime dưới `/api/motions/runtime/gsap.min.js` dùng fixed package resolution, không path người dùng.

Preview HTML ở `packages/motion/workbench.ts`; player JS fragment vẫn là literal subset. Controls workbench riêng drives paused timeline bằng một clock, play/pause/reset/seek và đọc frame index qua sampler; không chèn controls vào scene.js sản xuất. Khoảng preview loop tối đa hai cycle và 120s; once phải đủ toàn động tác. Gọi compiler trước response để event cap/duration lỗi hiện rõ. Không gọi model/provider/ffmpeg hoặc Python. Chưa thêm motion vào Director/actorScene vì asset chưa có approval/contact/speech gate; bàn giao bước tích hợp này rõ, không gọi importer/preview là pipeline hoàn thành.

Thêm ba schema ActorMotion/registration/SpriteClip vào library/schema export. Test declarations API: candidate listing/import, path escapes, corrupt hash/file, busy project, preview policy và no arbitrary URL; source typecheck. Test sampler/compiler: arbitrary forward/backward seek trên timeline GSAP thật trong callback test, boundaries/rate/once policy/loop, repeated rects và world landmark transform. Không chạy các callbacks trong lượt triển khai.

Tạo test declarations cho atlas rect lặp/timing/coordinate, strip, malformed input, missing anchor/landmark, hash mutation, once/loop/end/rate và seek/GSAP subset; chưa chạy assertions. Schema export + build/typecheck. Commit local có phạm vi làm đầu vào review; review code độc lập và sửa lỗi trước khi đẩy GitHub.

## Chưa phải pipeline video đã hoàn thành

Importer/compiler không tự tạo pose đẹp. Còn cần motion assets được duyệt, biểu cảm/head-view/speech track, lựa chọn hành động từ kịch bản, binding vào actor scene với contact/camera/continuity, preview/review trong Studio, và model khác chạy nghiệm thu. Production guard hiện có không được mở chỉ từ build hoặc preview candidate.
