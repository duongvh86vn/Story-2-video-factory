# Bàn giao test — ảnh miệng và clock thoại của sprite

## Phạm vi source hiện có

Base `e2b040e94546aa56cc2732dd0431f7f0345af02f`, source `a6b62fa7dda49c139ff6868fb3f6bf2dc960a7f4`, fixes `59af28e`. [Plan đầy đủ](../plans/2026-10-07-sprite-speech.md), [review accumulator](reviews/sprite-speech-source-review-v1.md). Fresh build core/Studio/Vite, test:typecheck, schema export exit 0; diff check clean. **24 ca mới NOT RUN:** importer 10, clock/player 10, API 4. Không thực chạy assertion, fixture, GSAP VM, browser/API/CLI, model acceptance, TTS/ASR, render hoặc MP4.

Task 1–2 có source và CLI/API nhập/đọc/serve artwork. **Chưa nối vào spriteStage/story/canonical renderer, Director/catalog/Studio lựa chọn hoặc pipeline video.** Cảnh nhiều actor vẫn chặn dialogue như trước. Không dùng mốc này để nói video đã có lip-sync. Topic giữ `productionReady=false`, `productionRig=null`, và mọi ảnh miệng vẫn candidate.

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

Direct low-level caller phải dùng variant đã load và schedule từ clock gốc. Parser/compiler không tự đọc/hash file audio hoặc chứng minh pixels; story/canonical integration Task 3 sẽ phải xây schedule từ narration/activity thật, không nhận schedule do model tự khai.

## CLI/API có source — chưa chạy

Node >=22.13/npm lockfile; source worktree `C:/Users/Duongvh-pc/.codex/worktrees/stickman-acting-v22/Story-2-video-factory2.1`, branch `codex/prehistoric-life`.

```powershell
# Chỉ model test thực chạy trong project riêng, không dùng project người dùng.
node --experimental-test-module-mocks --import tsx --test --test-concurrency=1 tests/sprite-speech-import.test.ts tests/sprite-speech-clock.test.ts tests/sprite-speech-api.test.ts
node --experimental-test-module-mocks --import tsx --test --test-concurrency=1 tests/sprite-motion-import.test.ts tests/sprite-motion-player.test.ts tests/sprite-motion-api.test.ts

# Khi có artwork/registration thật và Studio project riêng:
npm run cli -- speech-import <project> <alternate.png> --registration <registration.json>
npm run cli -- speech-list <project>
```

API `GET /api/projects/:name/motions/speech`, `POST .../speech/import` strict `{sheet,registration}` bên trong project và idle/mutation guard, `GET .../speech/:id/:fingerprint/sheet` chỉ serve bytes đã verify. Không nhận provider/account/query/path tùy ý; không gọi model/coordinator production, không mở final. Import hiện chưa có form Studio hoặc preview speech chạy audio thật.

## Nghiệm thu và công việc còn thiếu

Model test ghi từng lệnh/exit/assertion/NOT RUN cùng commit; kiểm seek frame/clock ở cả chiều, native once/loop/end/rate, cue/audio silence, scoped GSAP/security, corruption/path/busy và regression helpers/fingerprints/legacy output. Real GSAP trong một callback kiểm plain opacity targets, chưa là browser render hoặc video acceptance.

Tiếp tục Task 3: actor-owned cue/variant bindings, speaker ownership và visible slot coverage, source refs, staging/allowlist, camera/source comparison/cache/lock/resume, Director/catalog/Studio. Giữ blocker thiếu artwork/voice/unsupported props/handoff; không dựng rig fallback để tránh lỗi thoại. Cần actual mouth/motion art, gaze/expressions và acceptance receipts, rồi mới video script/WAV/story trong EN/VI/JA/KO. Kết quả V1 hoặc build không thay nghiệm thu đó.
