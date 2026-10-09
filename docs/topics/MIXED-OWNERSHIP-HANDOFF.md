# Vật chung và vật cầm riêng trong cùng cảnh — source0.81

**Cập nhật source0.82:** [Kiểm tra cảnh trên nguồn gốc](ORIGINAL-SOURCE-AUDIT-HANDOFF.md). Studio/API có báo cáo chỉ đọc theo cảnh và actual diễn viên, full context/acting/source/camera, raw revision receipts; không tự duyệt hoặc mở final. Producer2.2.45; 10 callbacks mới NOT RUN; runtime/art/motion/toàn sản phẩm vẫn chờ model test. Các mốc cũ bên dưới là lịch sử.

Mục tiêu vẫn là câu chuyện → kịch bản, kịch bản nguyên văn hoặc WAV → video với diễn viên sống trong câu chuyện. Source0.81 nối tiếp [source0.80](OWNERSHIP-CONSUMERS-HANDOFF.md), bổ sung candidate contract cho cảnh có vật trao/cùng cầm và các vật được cầm riêng. Ví dụ Lila trao giỏ cho Karo rồi cầm bát; đây là tình huống kiểm chứng tool tổng quát, không giới hạn nội dung vào một câu chuyện. Chưa nghiệm thu hình, tiếp xúc, chuyển động hoặc video.

## Phần source đã viết

1. `ownershipBindingPartition` phân từng alias bằng bộ `(actorId, propId, partId)` gốc. Mọi grip của vật chung phải có đúng một binding; vật riêng cần người thật đang hiện, explicit owner và original source. Không lấy binding đầu tiên, miễn kiểm cho cả diễn viên, hoặc dùng prop cục bộ thay nguồn gốc.
2. `ownershipBindingContext` tìm đầy đủ các camera thuộc original runs, tiếp tục khi gặp người mới ở camera sau. Trước khi bỏ các alias canonical khỏi quy tắc origin của vật riêng, validator kiểm toàn bộ ownership/world/coverage trong closure; sau đó chạy đầy đủ native/art/action/clock/cue/grip/world checks của từng vật riêng. Canonical-only shots cũng đi qua kiểm đầy đủ này. Quyền sở hữu canonical/local không được đổi loại giữa một original run. Hiện có kiểm lặp trên cùng run; chưa benchmark hoặc tối ưu cache.
3. Renderer giữ canonical map chỉ chứa vật chung; vật riêng lấy đúng compiler của người sở hữu. `mergeModelMotionFrames` gộp union keyframes và các center channel đã được vẽ, mỗi entity một key. Không resample cơ thể, đoán pose, kẹp clock hoặc ghi đè vật khác. Relation/flow đọc cả hai loại vật trên clock chung; report không gọi vật riêng là canonical alias.
4. Bàn tay gốc của compiler vẫn tồn tại. Một wrapper riêng cho mỗi actual hand chỉ che prop-palm slot trong các phase mà tay đó đang được canonical painter vẽ; hết phase thì trả slot cho vật riêng. Gom mọi canonical entity trước khi tạo lịch rời rạc bằng `tl.set`, tránh entity sau bật lại tay trong khi entity trước vẫn giữ. Giữ nguyên inner-slot animation và `<use>` tới chính hand definition; không thêm palm transform hoặc kéo tay cho khớp vật.
5. Prompt đạo diễn giữ hành động mà câu chuyện yêu cầu. Thiếu hợp đồng chuyển động/artwork phải báo điều kiện chặn; không khuyên thay cảnh trao/cầm qua cut bằng cảnh đứng yên để né thiếu khả năng.

Version: topic=`forest-tribe-0.81-mixed-ownership`, producer=`story-direction-2.2.44`, ownership renderer=`canonical-ownership-render-5`, actor ownership=`actor-prop-ownership-3`, original prop binding=`source-prop-binding-5`, bound model=`bound-model-motion-2.2.6`. Schema/manifest/cache cập nhật theo source mới; artifact cũ cần migration/rebuild hợp lệ, không đổi nhãn để dùng lại receipt.

## Rà soát và giới hạn bằng chứng

GPT‑6.1 Sol qua 9router đề xuất phân alias, complete-run closure và kiểm nguồn trước exemption. Parent tích hợp union centers, hand masks, renderer/report và test declarations. Combo `tester` thực sự gọi được: HTTP200 trong ca kết nối, model `gpt-6-luna`, phản hồi `TESTER_OK`, khoảng1.38s. Một lượt static review tiếp theo của `tester` đọc sáu file đã đóng băng và excerpt renderer, không chạy code.

Góp ý duy nhất của `tester` về `operate` bị parent bác: `descriptor` lấy gesture qua `originalPropGesture`, vốn loại `operate` trước đoạn thu witness; trigger đề xuất không đi tới đoạn đó với một attachment hợp lệ. Không sửa code chỉ theo kết luận của agent. Agent không review toàn diff, generated manifest/schema, test callbacks, native rig hoặc phim. Đề xuất tách dependency leaf của Sol chưa cần áp dụng sau khi đọc import graph hiện tại; đây là nhận xét source, không chứng minh runtime import graph. Final integration do parent rà.

- [Frozen source inputs, proposal và parent assessment](reviews/mixed-ownership-agent-record-v1.json).
- [Build/typecheck/schema và source record](reviews/mixed-ownership-source-record-v1.json).
- [Raw bytes/metadata/code hashes và production flags](reviews/mixed-ownership-static-record-v1.json).

Chín callbacks mới trong `tests/mixed-ownership.test.ts` là **DECLARED / NOT RUN**. Chúng dùng synthetic metadata để kiểm partition, closure, center channels và masks; không tạo native registration, kiểm anatomy hay chứng minh tiếp xúc. Callback suppression hiện có được sửa để kỳ vọng original palm slot được giữ bên trong mask. Build/typecheck không thực thi các callbacks.

## Lệnh dành cho model/người test — implementation chưa chạy

Môi trường: C worktree dưới đây, Node24.19.0 (tối thiểu22.13), dependencies đã có. D checkout và server8850 giữ nguyên. Cổng8861 cùng thư mục project riêng tránh ảnh hưởng phiên Studio đang dùng.

```powershell
Set-Location -LiteralPath 'C:/Users/Duongvh-pc/.codex/worktrees/stickman-acting-v22/Story-2-video-factory2.1'
git rev-parse HEAD
node --experimental-test-module-mocks --import tsx --test --test-concurrency=1 tests/mixed-ownership.test.ts tests/ownership-render.test.ts tests/ownership-observation.test.ts tests/source-ownership.test.ts tests/model-motion.test.ts tests/source-prop-binding.test.ts
$env:STUDIO_PORT='8861'
$env:STUDIO_PROJECTS_ROOT='C:/Users/Duongvh-pc/.codex/tmp/story-factory-source081-test-projects'
npm run studio
```

Sau khi server test sẵn sàng, mở `http://127.0.0.1:8861/`. Chat combo `tester` tự nó không có terminal/browser của máy; cần model/người có công cụ thực thi chạy lệnh và ghi full SHA, raw results, ảnh/MP4, lỗi còn thiếu vào MD. TEST-RESULTS V1 không chứng minh source0.81.

1. Thử canonical basket và independently carried bowl trên đầy đủ original runs, hai người cùng dùng local propId, người thứ ba chỉ xuất hiện ở camera sau. Thiếu explicit owner/source/native/art/action/cue/target/world, stole alias, đổi entity hoặc đổi canonical/local giữa run phải fail.
2. Kiểm thế giới → giữ → cùng giữ → đổi authority → giữ → đặt; camera cuts và primary/supporting swaps không reset contact/clock. Canonical-only compiler cũng phải bắt invalid independent prop xuất hiện ở camera sau trong closure. Dùng own native contact/gesture registrations thật; synthetic cases không đủ.
3. Kiểm bát/giỏ/label/foreground/shadow/relation/flow giữa keyframes trên actual SVG/GSAP; union không bỏ vật riêng, không tạo glyph/transform/tay thứ hai. Sau nhả giỏ, prop-palm slot phải trở lại cho bát; hai canonical entities kế tiếp cùng tay không bật mask sai tại boundary. Kiểm normal/random/reverse seeks, first frame ở giữa active phase và thời điểm cuối nguồn.
4. Đối chiếu preflight envelope với renderer có actual actor breakpoints, đo palm/center/offset/contact cùng bố cục. Sampled0.2px không là bằng chứng liên tục. Kiểm thời gian xử lý closure với nhiều camera; việc kiểm lặp hiện chưa đo.
5. Nghiệm thu Lila/Karo và quần chúng đúng mẫu, nam trọc không râu, nữ giữ nguyên, mặt/tóc/viền costume/màu sống động, tay chân mềm hợp lý, nhìn bạn diễn và camera có động cơ. Nghiệm thu story/script/WAV, EN chính/VI/JA/KO, external/local TTS, resume/rebuild/locks, final MP4/audio/subtitle/thumbnail/QC bằng source hiện hành.

## Còn thiếu để dùng production

`needs-source-prop-binding`, `productionReady=false`, `productionRig=null`, mọi `availableBanks=[]` và art/motion/production approval=false giữ nguyên. Chưa mở nhánh source production. Rotating spear, canonical airborne ownership, depth đổi trong action và own native tool/contact art vẫn cần contract và nghiệm thu thật. Source0.81 giải quyết candidate mixed-binding contract, không chứng minh phim đã mượt hoặc toàn sản phẩm đã xong. Runtime/test/geometry/browser/server/TTS/ASR/audio/MP4 và full-factory acceptance vẫn **NOT RUN / chưa nghiệm thu**.
