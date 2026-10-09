# Source0.66 — đồng hồ gốc cho tay và đồ vật qua góc máy

09/10/2026. Đây là bước triển khai tiếp của tool câu chuyện/kịch bản/WAV → diễn viên → video. Không đổi Lila/Karo thành host cố định, không ép tập thành món ăn/máy móc. Nam phụ trọc/không râu giữ v2, nữ phụ giữ v1; toàn bộ PNG/màu/trang phục/đầu đã có được giữ.

## Code đã viết

- `performance.sourceManipulation` dùng `native-source-manipulation-1`: ID và start/end global của cả run, toàn bộ props và operate/pick-place/carry/drop theo thời gian tương đối từ source.startMs. Đây là nguồn tay/vật riêng; `gesture.sourceSpan` vẫn chỉ là point/think, không giả contact/voice clock.
- Mỗi native actor chọn explicit `bodyManipulation=registered-manipulation-v1` và matching `sourceBody` có cùng start/end. Local props/contact/spear/lunge không được thay hoặc restart nguồn. Full original tracks được kiểm bằng compiler/shape/contact/ownership guards có sẵn; các arrays camera-local không chứa bản xấp xỉ.
- Clock6 và actor collector đòi mọi camera slice trong run continuous đủ coverage, cùng person/cast/view/root/stage/scale, cùng nguồn body/hand/prop/target/release/grip. Thiếu slice, nguồn đổi, hand conflict, source point/think chồng contact đều chặn. Sửa appearance/actor/source không tự chọn art hoặc đổi lời kể.
- Sampler dùng thời điểm gốc cho gesture entry, approach, lift, hold, lower, release và recovery. Prop center/rigid cuff/palm/painter giữ contract0.65. Nếu một cú thả bắt đầu rơi trước shot hiện tại, release palm và vận tốc được lấy từ full original body/head/attention context; không clamp về đầu shot hoặc lấy anchor đoán. Inner evaluation không tính prop/flight lần nữa, không sửa source bytes. Speech data vẫn là nguồn caller cung cấp; không sinh giọng hoặc chứng nhận phoneme lip-sync từ đánh giá hình học này.
- Baking/camera sampling thêm contact/release/landing và lift/lower boundary ở đúng offset, kể cả hai phía boundary. Report ghi full source/hash/offset và `motionVerified=false`. Generic preview có thể dựng placeholder theo nguồn này; placeholder không là model story được nghiệm thu.
- Acting repair giữ `sourceManipulation` bất biến. Không lấy source contact làm ROI/pose/approval mới. Body compiler38, native-contact-angle2, direction34 và cinematic-models4 ghi revision mới; audio/narration/cue không thay đổi.

## Phần phải nối tiếp để chạy sản xuất

**Canonical storyboard hiện chặn nhánh mới bằng `needs-source-prop-binding`.** Clock/compiler này chưa đủ để mở final. Phải hoàn thành cùng một model/entity/source/actor ownership qua các shot, matching action projection có tham chiếu contact gốc, model exit/entry và source evidence, camera/world/event/thermal/label/foreground/shadow bounds, primary/supporting swap, renderer/API/coverage/cache/resume/review. Không tắt gate, bỏ field hoặc đổi carry thành point/in-shot placement để né câu chuyện gốc.

Handoff/chung giữ một vật/sequential ownership giữa người với người vẫn chưa đăng ký. Complete native finger/wrist/left-spear/tool poses, measured continuous body/head turns, nét tay/áo/mặt/hair/seams, ánh sáng/màu/bối cảnh và normal-speed film vẫn cần triển khai/nghiệm thu. PNG hoặc source continuity không chứng minh chất lượng giống video mẫu.

`productionReady=false`, `productionRig=null`, `availableBanks=[]`; không xuất final hoặc báo DONE từ source check. Full arbitrary story→script / exact script / original WAV (+legacy SRT), EN chính + VI/JA/KO/external-local TTS, narration/speaker/subtitle/source/locks/resume/rebuild và final MP4/audio/QC vẫn thuộc mục tiêu, chưa nghiệm thu đầy đủ.

## Kiểm cho model TEST

Parent chỉ chạy build/typecheck/schema export/static raw inventory và review source giới hạn qua9router. Không chạy callback/fixture/schema geometry/builder/compiler/sampler/renderer/server/browser/TTS/ASR/audio/video/MP4/tracer, kể cả lệnh help của các script runtime.

Có7 callback mới **DECLARED/NOT RUN** trong `tests/native-source-manipulation.test.ts`: schema/immutable source, coverage/source drift, cả4 body×2 tay qua pickup cuts, actual forward carry, drop release trước shot, conflicting clock/hand/selection và baked boundaries/production gate. Fixture factory chỉ gọi trong callback. Test source0.65 được sửa literal clock5 sang constant clock6; không dùng test V1 hoặc build xanh làm bằng chứng video mới.

Môi trường: writable C worktree dưới đây, branch `codex/prehistoric-life`, Node>=22.13, dependencies/package-lock hiện có. D checkout readonly. Lệnh sau dành riêng model TEST:

~~~powershell
Set-Location -LiteralPath 'C:/Users/Duongvh-pc/.codex/worktrees/stickman-acting-v22/Story-2-video-factory2.1'
git rev-parse HEAD
node --import tsx --test --test-concurrency=1 tests/native-source-manipulation.test.ts tests/native-manipulation.test.ts tests/native-source-body.test.ts tests/native-source-gesture.test.ts tests/actor-owned-props.test.ts
~~~

Không cần TTS/model/API cho các callback geometry này. Khi nhánh production binding được triển khai, test tiếp qua Studio riêng, FFmpeg/ffprobe/Chromium/HyperFrames và project root riêng; không ghi đè project user. Ở revision này Studio source-contact production sẽ bị chặn đúng như phần trên; không dùng trang pose cũ làm bằng chứng nhánh clock mới.

Model TEST cần ghi full SHA, command/exit, artifact/hash và PASS/FAIL/NOT RUN; kiểm random/reverse seeks, ở đúng cut/contact/release/landing, sourceEntryHeld và bank3/4/6 own heads/voices, props/hand/cuff/painter/stage/ground/target/camera, source mismatch và sửa/resume. Source-only review hoặc sự bằng nhau giữa hai sampler không là nghiệm thu anatomy/pose/normal-speed60fps film hoặc full3-input factory.

Record: `reviews/source-manipulation-clock-source-record-v1.json`. Input source review đóng băng: `reviews/source-manipulation-clock-review-inputs-v1.md`; kết quả/disposition: `reviews/source-manipulation-clock-source-review-v1.json`.
