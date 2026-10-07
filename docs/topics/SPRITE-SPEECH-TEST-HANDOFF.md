# Bàn giao test — ảnh miệng và clock thoại của sprite

## Phạm vi source hiện có

Source tích hợp `3d9aab1532afd4ba44c63f1e471cfa6ce8558dc6`, correction hiện hành `818b03683c51586a6061277a1811aef4cc628904`, base `97a7c13a677f7f94d13144ecd0a3dacbc3445b65`. Foundation `a6b62fa`, fixes `59af28e` được giữ làm lịch sử. [Plan đầy đủ](../plans/2026-10-07-sprite-speech.md), [review tích hợp](reviews/sprite-speech-integration-source-review-v1.md), [findings foundation](reviews/sprite-speech-source-review-v1.md).

Fresh build core/Studio/Vite, test:typecheck, schema export exit 0; diff check clean. Một lỗi TS2339 trong khai báo test mới đã sửa bằng narrowing trước typecheck thành công. Full build/test:typecheck chạy lại sau correction exit 0; schemas không đổi. **42 ca NOT RUN:** importer 10, clock/player 10, API 5, stage 11, integration 6; 18 ca được thêm tính cả fix review. Không thực chạy assertion, fixture, GSAP VM, browser/API/CLI, model acceptance, TTS/ASR, render hoặc MP4.

Task 1–3 có source: importer/player, actor-owned bindings trong spriteStage/story, canonical renderer/source checks, catalog/Director và Studio chọn phiên bản. Sourced dialogue chỉ được chấp nhận về contract khi đủ binding và clock; thiếu artwork/ownership/coverage phải chặn, không fallback sang rig. **Chưa có artwork miệng/chuyển động Lila/Karo mới được tạo hoặc duyệt, chưa có video nghiệm thu.** Review độc lập tích hợp tìm một Important vượt budget preview, đã sửa tại `818b036`; focused re-review xác nhận đã giải quyết, không có Critical/Important/Minor mới trong fix. Review foundation không phủ code mới. Topic giữ `productionReady=false`, `productionRig=null`, và final candidate vẫn chặn.

## Contract artwork

`ActorSpeechRegistrationSchema` version `actor-speech-registration-1` nhận `id`, exact `motionId`/`motionFingerprint`, `regions[]` và notes. Mỗi region là rectangle pixel trong frame native tương ứng, không là tọa độ cả atlas. Người dựng artwork phải đo sẵn các landmark `face_left/right/top/bottom`, `mouth_center`, `nose` và ít nhất một `eye`, `eye_left/right/visible` trong mọi frame. Không tự suy luận từ mép canvas.

Alternate PNG phải có cùng toàn bộ kích thước/layout; pose/anchor/view/timing đều lấy từ native motion. Mouth region chứa tâm miệng, nằm trong face/frame và tránh eye/nose/brow points với clearance. Importer so decoded sRGB RGBA của hai ảnh, chặn khác biệt ngoài region, kể cả alpha; mỗi native frame phải có khác biệt miệng. Các rect native chồng/lặp cũng phải bảo vệ vùng riêng của từng frame. Cả phần sheet không được phát cũng bị kiểm ngoài union vùng miệng.

Landmark bảo vệ gồm `eye`, `nose`, `brow`, `eyebrow` và mọi tên thuộc prefix `<family>_` hợp lệ trong Motion schema, kể cả compound/numeric (`eye_right_inner`, `brow_left_2`). Không bỏ qua tên này bằng regex chỉ nhận một suffix. API import dùng mutation local có reservation/layout/idle checks, không load coordinator; một regression khai báo kiểm trường hợp server không inject coordinator và loader sẽ lỗi nếu bị gọi.

Đây là kiểm kỹ thuật theo registration, **không chứng minh landmark là anatomy thật, biểu cảm đẹp hoặc nhân vật đúng mẫu**. Chưa có artwork miệng Lila/Karo mới được tạo/duyệt trong mốc này. Fixture chỉ là hai ô màu có landmark giả; không dùng làm art evidence.

JSON <=2 MiB; PNG <=16 MiB, alpha, một page, <=64 Mpx; <=512 frame; tổng frame pixel so sánh <=64 Mpx. `assets/motion-speech/<id>/<fingerprint>/sheet.png` và manifest bất biến, không ghi đè bản khác. Load kiểm descriptor/fingerprint/native identity/PNG rồi so pixels lại. Nguồn/alternate PNG lưu nguyên bytes, không re-encode. Pixel decoding vẫn chưa chứng minh browser paint hoặc colour management giống mẫu.

## Clock và compiler

`buildSpriteSpeechSchedule` dùng narration/cue gốc cùng speech activity narration-global, clip theo shotStart/slot; không ước lượng thời lượng hoặc đổi từ. Cue thiếu/duplicate/không overlap, clock sai/overlap hoặc RMS thiếu hash bị chặn. Khoảng level=0 và gap giữ miệng rest; positive windows sát nhau gộp. Hash nguồn là hash contract đã parse, không thay kiểm hash audio bytes ở upstream.

`createSpriteSpeechSampler` và optional `createActorSpeechSampler` có snapshot riêng, seek hai chiều theo clock 0.0001 ms và biên trái đóng/phải mở. Rate đổi pose clock native; lịch miệng giữ clock audio. Native hide không được có mouth activity kéo vào phần artwork đã ẩn. Native hold/first giữ behavior player cũ sau clip; stage sau này phải tiếp tục sở hữu visibility slot.

`compileActorMotion(..., speechContext?)` đặt artwork rest/open trong cùng crop/native anchor; dùng literal opacity calls trên timeline hiện có, không callback/timer hoặc fade hai cơ thể. Cap 6000 events bao gồm mouth changes; không truncate audio/schedule. Không có context thì markup/report/script giữ nhánh cũ. Report nói rõ binary-rest-open, `audio-activity` hoặc `segment-draft`, `phonemeLipSync=false`, candidate và acceptance pending.

Direct low-level caller phải dùng variant đã load và schedule từ clock gốc. Parser/compiler không tự đọc/hash file audio hoặc chứng minh pixels. Stage/story/canonical hiện xây schedule từ narration/activity nguồn, không nhận schedule do model tự khai. Kiểm hash audio bytes và waveform thật vẫn thuộc upstream/test toàn luồng.

## Binding actor, stage và nguồn canonical

Mỗi `cinematic.spriteStage.actors[].clips[].speech` là `{variantId,fingerprint,segmentIds}`: phiên bản ảnh miệng chính xác, danh sách ID cue gốc, không phải tên pose nói chuyện. Variant phải khớp native motion/version/actor/view/reference và được liên kết trong catalog của chính motion đó. `actorScene` khai báo diễn viên sở hữu cue; một cue không được thuộc nhiều diễn viên hoặc lặp ownership. Clip cần narration source reference có cùng cue ID và quote nằm trong text gốc, không mượn evidence từ lời người khác.

Coverage là toàn bộ cue gốc sau khi clip vào cửa sổ shot, không chỉ đoạn speech activity có tiếng. Các clip native liền nhau có thể chia coverage cùng cue nếu không để gap; once/hide kết thúc sớm phải lỗi kể cả khoảng còn lại im lặng. Cue lạ, sai shot clock, binding thiếu/sai native/variant và quote không có trong narration phải lỗi. `createSpriteStageSpeechSampler` và compiler dùng snapshot và clock chung; seek ngược, boundary, đổi pose giữa câu phải cho cùng kết quả. Tổng stage cap 12000 events bao gồm miệng, không bỏ event để vừa cap.

Verified loader đọc lại PNG/manifest và pixel constraints; staging giữ raw native/alternate PNG ở `assets/<hash>.png`. Canonical allowlist/source comparison và geometry provenance nhận cùng narration, speech activity và variants; geometry ghi actor/clip/variant, original cue IDs, audio/narration/activity/schedule hashes và synchronization level. Cache/lock phải phản ánh phiên bản miệng và nguồn narration/activity khi bound; đổi giọng hoặc nội dung không được reuse clock cũ. Hash metadata không chứng minh audio/art đã được duyệt.

Director chỉ thấy các phiên bản catalog đã load/verify; source normalization dùng draft activity có nhãn để kiểm contract, không coi đó là voice evidence. Body capability không được đổi thành `kind: speech` để tránh thiếu ảnh miệng. `story-coverage` đòi actual mouth binding cùng owner/source, rồi timed canonical validation kiểm đủ visible cue. Missing/unsupported assets phải báo blocker, không dựng fallback hoặc mở final.

Ownership hiện ở mức **một cue — một diễn viên được khai báo**, không tự nhận diện người nói từ WAV. Cue có nhiều lượt thoại trong cùng clock cần word/subcue timing cùng ownership chính xác; chưa hỗ trợ, không tự chia timestamp/đổi text để né giới hạn. Model test phải ghi rõ trường hợp này chưa đạt.

## CLI/API có source — chưa chạy

Node >=22.13/npm lockfile; source worktree `C:/Users/Duongvh-pc/.codex/worktrees/stickman-acting-v22/Story-2-video-factory2.1`, branch `codex/prehistoric-life`.

```powershell
# Chỉ model test thực chạy trong project riêng, không dùng project người dùng.
node --experimental-test-module-mocks --import tsx --test --test-concurrency=1 tests/sprite-speech-import.test.ts tests/sprite-speech-clock.test.ts tests/sprite-speech-api.test.ts tests/sprite-speech-stage.test.ts tests/sprite-speech-integration.test.ts
node --experimental-test-module-mocks --import tsx --test --test-concurrency=1 tests/sprite-motion-import.test.ts tests/sprite-motion-player.test.ts tests/sprite-motion-api.test.ts
node --experimental-test-module-mocks --import tsx --test --test-concurrency=1 tests/cinematic-sprites.test.ts

# Khi có artwork/registration thật và Studio project riêng:
npm run cli -- speech-import <project> <alternate.png> --registration <registration.json>
npm run cli -- speech-list <project>
npm run cli -- speech-preview <project> <variant-id> <variant-fingerprint> --port 8850
```

API `GET /api/projects/:name/motions/speech`, `POST .../speech/import` strict `{sheet,registration}` bên trong project và idle/mutation guard; `GET .../speech/:id/:fingerprint/sheet` và `.../native-sheet` chỉ serve bytes đã verify. `GET .../preview` là diagnostic rest/open, không audio. Không nhận provider/account/query/path tùy ý; local import không load coordinator production hoặc gọi model, không mở final.

Studio motion library có form nhập variant riêng: PNG alternate và registration JSON cần nằm sẵn trong project input, điền đường dẫn project-relative. Đây chưa phải upload file từ ngoài project. Lưu lựa chọn library trước khi import vì import reload form. Mỗi native motion chỉ hiện mouth variants đúng phiên bản; lưu catalog dùng snapshot/revision, không âm thầm bỏ liên kết nếu listing lệch snapshot. Preview từng variant có nhãn `diagnostic-rest-open`, đổi miệng theo nửa frame trong một native cycle để xem artwork (loop preview tối đa 120s). Native-only preview vẫn hai cycle như trước; compiler cap 6000 không đổi. Preview **không có narration/audio**, không dùng các hash chẩn đoán làm receipt voice hoặc nghiệm thu.

## Nghiệm thu và công việc còn thiếu

Model test ghi từng lệnh/exit/assertion/NOT RUN cùng commit; kiểm seek frame/clock ở cả chiều, native once/loop/end/rate, cue/audio silence, scoped GSAP/security, corruption/path/busy và regression helpers/fingerprints/legacy output. Real GSAP trong một callback kiểm plain opacity targets, chưa là browser render hoặc video acceptance.

Các ca mới cần kiểm hai diễn viên không mượn cue; silence và seek hai chiều; đổi native pose giữa câu; gap nhỏ và once/hide; variant thuộc native khác; unknown/duplicate cue; source quote/clock mismatch; immutable/corrupt bytes; catalog exact linkage; Studio snapshot/form boundary; API diagnostic labels/native-sheet; 512-frame mouth preview budget và native duration không đổi; source staging/geometry/provenance/legacy equality. Fixture nhiều actor/event cap chỉ kiểm contract, không chứng minh diễn xuất đẹp, acoustic speaker identity hoặc video đúng kỳ vọng.

Sau khi có artwork thật, test riêng source staging/allowlist, source comparison, cache/lock/resume/rebuild với đổi script/voice/actor/variant; review ảnh và xem toàn chu kỳ ở scale/crop video. Diagnostic preview và source tests không thay kiểm browser paint, màu, anatomy hoặc độ mượt.

Tiếp tục công việc sản phẩm: actual mouth/motion art và các head views đúng nguồn; gaze/expressions; grips/props/contact/handoff; art/motion receipts; exact mixed-speaker word/subcue ownership; rồi video script/WAV/story trong EN/VI/JA/KO với giọng thật/local TTS. Giữ blocker thiếu artwork/voice/unsupported props/handoff và final candidate; không dùng fallback tránh lỗi thoại. Kết quả V1 hoặc build không thay nghiệm thu video ba input.
