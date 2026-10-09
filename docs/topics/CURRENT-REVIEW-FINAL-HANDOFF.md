# Review đúng bản cảnh và final — source0.74

Source hiện hành0.76: [ownership renderer](OWNERSHIP-RENDER-HANDOFF.md), còn guard và runtime/art/motion/full-product acceptance. Các receipt/current-review source0.74 vẫn bắt buộc.

Mốc0.75 bổ sung [shared ownership candidate](SHARED-OWNERSHIP-HANDOFF.md); renderer/production/runtime vẫn pending. Các receipt source0.74 dưới đây tiếp tục bắt buộc.

Mục tiêu vẫn là đưa câu chuyện, kịch bản nguyên văn hoặc WAV vào và dựng diễn viên trong chính câu chuyện, với hình và chuyển động đạt chất lượng mẫu. Source0.74 nối bằng chứng preview/review/final cho pipeline chung; chưa chứng minh nhân vật đã mượt hay chủ đề tiền sử đã dùng được đến final.

## Phần triển khai

- Đạo diễn và camera source0.72/0.73 vẫn là hai role riêng. Camera đo mọi primary/supporting bằng profile, original clock và world của chính người ấy. Camera-only repair giữ thoại, diễn xuất, chủ thể, artwork, nguồn và locks, rồi dựng draft/review mới.
- Preview ghi hash của canonical storyboard, cấu hình đang dùng, tài liệu narration/voice/actor/world, audio gốc, approved asset bytes và **toàn bộ tài nguyên thực trong scenes**, gồm ảnh, font, audio và vendor files. Nguồn được kiểm lại sau capture; nguồn đổi thì preview không được công bố là tương ứng.
- Review bắt đầu bằng generation/attempt ID riêng và marker chưa accepted, giữ source/preview snapshot trước khi chờ provider, rồi kiểm lại trước và sau khi lưu. Response của attempt đã bị thay thế không được nhận là review hiện hành, dù source giống nhau. Receipt do ứng dụng ghi, không phải field model tự khai báo.
- Final giữ chính receipt review lúc bắt đầu, kiểm lại sau render và postprocess, ghi hash của raw render, MP4, SRT và thumbnail. Review mới xuất hiện trong lúc render không tự thay cho review ban đầu.
- QC giữ cùng final receipt, kiểm source/artifact bytes và narration context trước và sau đo media. Download final và báo cáo production đóng khi receipt thiếu hoặc đã cũ. DONE giữ cùng receipt trước/sau export. Receipt cũng được export cho cả luồng hiện đại và legacy.
- Resume lùi tới boundary preview/review/final chưa hợp lệ. Migration riêng receipt không reset narration, approved locks hoặc ngân sách đã dùng; các thay đổi nội dung/voice/config vẫn theo invalidation hiện có. Những cảnh bị khóa vẫn chịu source/canonical validator như trước.

Schema mới: review-attempt, review-source, review-input, review-evidence, final-evidence; version release-evidence-1. Artifact work/review-attempt.json, work/review-evidence.json và work/final-evidence.json, bản export ở output. API đọc được marker reviewing/stale; production chỉ nhận receipt accepted khớp active generation. Dynamic path tên chính xác __proto__ bị chặn trước khi thêm vào record. Không đưa key/env vào packet hoặc report.

Accepted ở review receipt chỉ có nghĩa đã ghi kết quả cho đúng revision; kết quả ấy có thể FAIL. Final còn yêu cầu PASS và không có high issue. Các cờ visualAcceptance, motionVerified, productionApproval luôn false trong receipt. Chúng không là biên bản duyệt nét vẽ hoặc video.

Đây là kiểm hash trước/sau, không là snapshot/lock cấp hệ điều hành. Không khẳng định phát hiện được thay đổi tạm thời rồi hoàn nguyên giữa hai lần đọc. Frame/contact sheet không chứng minh diễn xuất mượt theo thời gian; cần xem video thật tốc độ thường.

## Rà soát đường đi source hiện có

| Điểm nối | Source chính | Bằng chứng và giới hạn |
|---|---|---|
| Original người/body/contact/cue qua cut | source-actor, source-prop-binding, source-manipulation-actions, source-interactions | Complete board/original clock, own owner/hand/model/art/target; chưa shared/sequential ownership. |
| World, trạng thái, effect, contact witness | source-world, source-world-phase, source-world-projection, source-grip-world | Nguồn gốc model/prop/flow/label/foreground dùng chung world; runtime/art/motion chưa nghiệm thu. |
| Coverage tình huống và hành động | story-coverage | Source interaction dùng cửa sổ narration gốc; không lấy động tác chung chung thay cho hành động trong nội dung. |
| Compiler/renderer | view-source-body, native-contact-arm, library/shots/cinematic | Original phase/contact geometry và nguồn hình dùng chung clock; nét/khớp/mặt/gaze/wardrobe/world vẫn cần video thật. |
| Canonical cache/publication | packages/scenes/index, source-publication, artwork transaction | Scene input identity và source guard; revision cảnh không tự đồng nghĩa với review hoặc nghiệm thu. |
| Đạo diễn/camera/review | camera-direction, cast-camera, camera-repair, packages/review | Source geometry độc lập framing; source0.74 thêm full resource/preview/provider-wait revision binding. |
| Final/postprocess/QC/download | packages/orchestrator/pipeline, packages/qc, apps/server/artifacts | Thêm receipt/current bytes; chưa có kết quả runtime của người test. |

OriginalPropGesture hiện yêu cầu đúng một original attachment cho một binding. Một vật đổi người sở hữu qua chuỗi hành động, handoff hoặc shared manipulation vẫn cần contract/compiler/renderer/coverage/camera/cache/review/QC đồng bộ. Không bỏ ownership để né yêu cầu này.

**Các guard production vẫn giữ:** needs-source-prop-binding, topic productionReady=false, productionRig=null, mọi availableBanks=[] và art/motion approval false. Full integrated original semantic production audit chưa hoàn tất. Không gỡ một guard riêng lẻ chỉ để xuất được video.

## Agent hỗ trợ triển khai

Theo yêu cầu người dùng, task riêng viết test revision evidence được giao qua 9router cho route cx/gpt-6.1-sol, yêu cầu reasoning_effort=xhigh. Agent nhận source hẹp, không nhận key/ảnh hoặc project production; chỉ trả đề xuất TypeScript. Parent tiếp tục pipeline/camera và kiểm đề xuất trước khi tích hợp.

Hai task viết test đầu tiên không trả đề xuất: timeout180s và network error. Parent tiếp tục viết test, đổi task giao agent thành rà riêng hai file evidence. Tool source-assistant dùng HTTP local với total deadline600s thay cho fetch header deadline ngắn hơn. Có ba lượt model trong batch tối đa sáu lượt, không retry tự động.

Lượt source review thứ ba thành công; backend trả model gpt-6.1-sol, usage3391 prompt +11574 completion =14965 total tokens. Xhigh là settings đã yêu cầu, không là xác nhận riêng từ backend. Usage hai lượt thất bại không có, không coi là zero hoặc đảm bảo đã hủy tính phí. Requested max_tokens không là bằng chứng ngân sách token được backend thực thi.

Agent chỉ review hai file đã đóng băng và nêu hai medium findings: superseded review attempt và reserved object key. Parent xác minh bằng source rồi sửa cả hai, giữ generation checks và thêm hai callback kiểm các trigger. Tám callback mới DECLARED/NOT RUN; các sửa cuối chưa được agent review lại. [Source/static record](reviews/release-evidence-source-record-v1.json) và agent record giữ nguồn/phạm vi/amendments; không là whole-product approval.

## Môi trường và lệnh cho model test

Implementation agent chỉ build/typecheck, export schema và kiểm source/static. **Các test callback, renderer/browser/server/TTS/ASR/video dưới đây chưa chạy trong lượt triển khai.**

~~~powershell
Set-Location -LiteralPath 'C:/Users/Duongvh-pc/.codex/worktrees/stickman-acting-v22/Story-2-video-factory2.1'
git rev-parse HEAD
node --experimental-test-module-mocks --import tsx --test --test-concurrency=1 tests/release-evidence.test.ts tests/review.test.ts tests/cinematic-review.test.ts tests/qc-artwork-pipeline.test.ts tests/scene-input-migration.test.ts tests/story-acting-public-final.test.ts tests/media.test.ts
$env:STUDIO_PORT='8861'
$env:STUDIO_PROJECTS_ROOT='C:/Users/Duongvh-pc/.codex/tmp/story-factory-source074-test-projects'
npm run studio
~~~

Node≥22.13; dùng npm ci nếu thiếu dependencies. Test migration còn cần SCENE_MIGRATION_BASELINE là archived source có scene producer cũ như fixture yêu cầu; không trỏ nó vào project của người dùng. Full pipeline cần FFmpeg/FFprobe, route model/ASR/TTS và voice hỗ trợ EN/VI/JA/KO. Key ở env/file riêng. Giữ Studio8850/D checkout; C source không tự cập nhật server đó.

Ca kiểm bắt buộc:

- Sửa ảnh/font/audio thực, canonical world/board/voice, frame hoặc contact sheet trong lúc capture/reviewer đang chờ: chặn review/final; pending attempt không dùng PASS cũ.
- Nguồn/preview hợp lệ nhưng review FAIL, high issue, missing/tampered receipt: không final/DONE.
- Begin A rồi B trên cùng source; B FAIL hoặc unfinished, A trả PASS muộn: A bị chặn, không nhận PASS cũ. Kiểm thêm actual concurrent publication/interruption với project reservation; optimistic metadata checks không là compare-and-swap/lock đối với edit ngoài pipeline.
- Nguồn hoặc receipt đổi trong lúc render/postprocess: không lấy snapshot mới để chứng minh video cũ.
- MP4/raw render/SRT/thumbnail bị sửa sau sản xuất, source/camera đổi sau QC hoặc project legacy thiếu receipt: download/DONE bị chặn; resume từ boundary cần làm lại, giữ valid voice/locks/budget.
- Test provider thật và video thật với hai bạn diễn và diễn viên phụ, đổi primary/supporting qua cut, camera giữ eyeline/contact và không che lỗi anatomy. Xem tốc độ thường mới đánh giá anticipation/reaction/recovery, chân trụ, nét/mặt/màu/viền/trang phục.
- Nghiệm thu ba input, EN chính/VI/JA/KO và TTS ngoài/local, mismatch/failed voice, resume/sửa nội dung/đổi giọng/đổi cast/rebuild/locks/finalQC. Test V1 không dùng để tuyên bố các luồng mới đã nghiệm thu.

## Còn phải làm để dùng được

1. Hoàn tất shared/sequential original prop ownership và integrated semantic source production audit trên mọi đường đi đã nêu.
2. Chốt art/pose/head/hair/garment/views/world riêng cho mỗi nhân vật, giữ đúng ảnh mẫu, màu sống động, nam phụ trọc không râu và nữ phụ đã duyệt. Không warp/mirror mặt, mượn ROI hoặc suy yaw.
3. Nhận kết quả runtime/test và film review hiện hành với full SHA, command/exit/output, đường dẫn clip/frame thật, pass/fail/skip rõ ràng; sửa lỗi được chứng minh.
4. Chỉ bật production theo đúng nghiệm thu nguồn, artwork, motion, voice, nội dung và final QC. Source receipt hoặc build PASS không thay các bước ấy.
