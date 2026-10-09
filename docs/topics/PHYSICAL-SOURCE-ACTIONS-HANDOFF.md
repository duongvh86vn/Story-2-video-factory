# Source0.67 — hình học riêng và tham chiếu động tác gốc

Mục tiêu sản phẩm vẫn là câu chuyện → kịch bản, kịch bản nguyên văn hoặc WAV gốc → giọng/timeline → diễn viên trong câu chuyện → cảnh → review/repair → video có audio/subtitle/QC. Tiếng Anh là ngôn ngữ chính, có VI/JA/KO và TTS local/ngoài. Source0.67 là một phần triển khai; chưa nghiệm thu toàn bộ sản phẩm hoặc chất lượng video. Source0.66 trước đó: `2162893f6b950afdd5034b271beb34f68ff97617`.

## Đã viết trong source

- `samplePhysicalPerformance` trong `packages/animation/compiler.ts` dùng chung body/head/attention/expression/arm/prop history và các kiểm tra hình học với bộ dựng thật. Kết quả có `purpose:physical-geometry`, không có `FrameState.face`, không tính animation mặt/miệng, không nhận audio và không sinh speech activity. Surface state chỉ phục vụ cloth/hair/hand depth; không phải frame thay thế để dựng video im lặng. Seek ngoài shot, nguồn/clock/person sai hoặc thiếu native selection vẫn lỗi.
- Camera đo geometry thay vì gọi sampler mặt với một đoạn narration giả im lặng. Bộ dựng video và compiler vẫn đòi đúng narration/speech clock của nhân vật. Đối tượng rơi dùng bàn tay/vận tốc tại thời điểm thả thật từ complete original body/head/attention run; inner query không tính prop lần nữa hoặc mở rộng một speech clock của shot ra cả run.
- `HostActionSchema` có optional `sourceManipulation:{sourceId,gestureId}`. Action này bắt buộc là `operate-model`, có tay explicit, narrationAnchor và một target model center. `projectManipulationAction` lấy đúng giao của động tác gốc với shot. Chỉ slice chứa contact thật mới có contactMs; một shot sau contact giữ reference và không tạo contact tại đầu shot.
- `validateManipulationActionSlices` yêu cầu đúng một reference cho mỗi đoạn nguồn đang diễn, đúng source/gesture/hand/start/end/contact; thiếu, trùng, đổi hoặc lệnh khác chiếm tay đều lỗi. Idle không chỉ định tay chiếm cả hai; non-idle legacy không chỉ định tay vẫn là right. Canonical director gọi validator này trước world binding. Repair đã bảo vệ nguyên entry operate-model và sourceManipulation của performance.
- Schema export, brief, manifest và revision source ghi contract mới. Body compiler39 / direction35 làm nguồn phụ thuộc thay đổi. Nam phụ vẫn v2 trọc/không râu; nữ và mọi PNG/màu/viền quần áo giữ nguyên.

## Còn phải hoàn thành

`needs-source-prop-binding` **vẫn chặn production**. Action reference mới chỉ xác nhận phase/hand; không chứng minh source cue, model/entity/part ownership, target center, phản ứng tiếp xúc hoặc continuity. Cần nối những phần này cùng nhau trước khi bỏ guard:

1. Nhận props gốc trên cả primary/supporting và source-action group, matching binding/part/source/person; kiểm bằng toàn storyboard, không chỉ một shot.
2. Lấy actual prop entry/exit từ geometry clock và giữ identity/art/source/world anchor xuyên camera/đổi primary; không lấy destination cuối thay cho vật còn đang cầm hoặc đang rơi.
3. Contact-required events, motion/effects/thermal/labels/shadows/foreground, camera/model bounds, coverage và renderer phải giữ complete original contact/release/landing. Cue thực mới có quyền chứng minh hành động; bỏ contactMs ở slice sau không có nghĩa mất nguồn contact trước.
4. API, authored storyboard normalization, model continuity, cache/resume/rebuild/review phải cùng contract. Không bỏ sourceManipulation, tự tạo contact đầu shot, đổi carry thành point hoặc tự duyệt artwork để chạy qua.
5. Sau đó model test của người dùng kiểm toàn ba input, giọng EN/VI/JA/KO/TTS ngoài, diễn xuất/model fidelity, resume/rebuild, video/audio/subtitle/QC. Chuyền vật nhiều người, pose công cụ mới, hướng/góc thiếu và optical face/eye/cuff/color vẫn cần các phần riêng.

Giữ `productionReady=false`, `productionRig=null`, `availableBanks=[]`, approval/motion false. V1 TEST-RESULTS không nghiệm thu nhánh này. Không có video mới được render trong lượt triển khai này.

## Môi trường và bàn giao test

Implementation chỉ sửa C worktree; checkout D hiện có được giữ nguyên. Node >=22.13, Node hiện tại24.19; dependencies lấy từ package-lock. Lệnh dưới **chỉ dành cho model test/người dùng**. Agent triển khai không chạy callback, fixture, schema-instance geometry, builder/pose sampler, server/browser, pipeline, TTS/ASR hoặc media.

```powershell
Set-Location 'C:\Users\Duongvh-pc\.codex\worktrees\stickman-acting-v22\Story-2-video-factory2.1'
git rev-parse HEAD
node --import tsx --test --test-concurrency=1 tests/physical-performance.test.ts tests/source-manipulation-actions.test.ts tests/native-source-manipulation.test.ts tests/native-manipulation.test.ts tests/native-head-face.test.ts tests/native-head-follow.test.ts tests/camera.test.ts
# Nếu cần Studio: cấu hình .env/key trên máy; không gửi key vào chat.
npm run studio
```

Studio: `http://127.0.0.1:8850/`. Giữ project đang có và dùng project kiểm chứng riêng. Báo cáo phải ghi full SHA, lệnh/exit, lỗi/source, clock/slice/time, own actor/view/hand/model, random/reverse seeks và đường dẫn artifact/video. Chín callback mới chỉ được khai báo, **0 executed**. Các ca quan trọng: geometry trùng physical state của rendered source face ở bốn own actor/view × hai tay; camera không đòi audio giả nhưng render thiếu voice vẫn lỗi; drop release trước cut với narration chỉ thuộc shot hiện tại; nguồn/tay/contact sai và fake re-contact đều lỗi; gate production vẫn giữ.

## Rà source

Một lượt Gemini qua 9router đọc frozen source excerpts và test declarations; không chạy hình học/video. [Input và hash](reviews/physical-source-actions-review-metadata-v1.json), [raw review và quyết định](reviews/physical-source-actions-source-review-v1.json), [record kiểm tra nguồn](reviews/physical-source-actions-source-record-v1.json). Helper không có kết luận runtime/art/motion PASS. Source phát sinh sau freeze không được gọi là đã review độc lập.
