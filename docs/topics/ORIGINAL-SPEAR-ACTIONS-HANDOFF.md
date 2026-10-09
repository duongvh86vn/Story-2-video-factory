# Hành động cầm/đâm giáo của diễn viên — source0.85

Hiện hành source0.86 thêm explicit projected frame và renderer-supplied emitted diagnostics: [bàn giao điểm chạm](EMITTED-CONTACT-HANDOFF.md). Source0.85 bên dưới giữ lịch sử; chưa có runtime/video/full-factory acceptance.

Source `forest-tribe-0.85-original-spear-actions`, producer `story-direction-2.2.48`, tool action `source-spear-action-1`. Bản này nối hành động và lời kể vào [model giáo source0.84](ORIGINAL-SPEAR-MODEL-HANDOFF.md). Đây là source candidate, chưa nghiệm thu geometry/runtime/chất lượng phim và chưa hoàn thành toàn sản phẩm.

## Phần đã viết

- `hold-tool` / `thrust-tool` có `sourceSpear:{sourceId,trackId,shaftPartId}`, hand, target và narrationAnchor rõ ràng. Chúng dùng track vật lý gốc, không mượn gesture `operate-model`. Cầm giáo trỏ entity cán của chính người đó và không dựng một tiếp xúc mới. Đâm giáo trỏ entity khác ở center hoặc handle được artwork khai báo rõ.
- Clock là giao chính xác của track gốc với camera. Các mốc lấy đà/chạm/thu giáo không khởi động lại khi đổi góc hoặc đổi vai chính/phụ. Contact đúng biên cut thuộc camera kế tiếp; camera hồi tay chỉ kế thừa lịch sử. Browser helper kiểm safe integers, slice dương và xung đột của cả hai tay đang cầm cán, kể cả action đi kèm không có clock hợp lệ.
- Validator đối chiếu actual actor/source/shaft/entity/model/art và toàn storyboard/narration. Whole statement trong `sceneIntent.acting` phải dùng operation tương ứng và đúng target. Cue không được thay hoặc gán cho một câu chuyện khác. Physical aim phải khớp target độc lập, không kéo target về mũi giáo để tạo kết quả giả.
- Physical candidate lấy shaft/tip và cả hai palm từ cùng frame, kiểm sai số grip và tip. Target center có thể thuộc fixed model, original owned prop hoặc canonical ownership; handle fixed cần khai báo riêng. Whole-glyph movement/rotation trước contact không được dùng tọa độ cũ. Geometry trong SVG/GSAP thực tế và moving fixed artwork chưa được nghiệm thu.
- `sourceWorld.events[].spearContact:{actorId,sourceId,trackId,shaftPartId}` cùng `contactEffector:'spear-tip'` giữ clock phản ứng gốc. Reaction bắt đầu **sau** contact thực tế, cùng target/cue; khác subject cần sourced causal relation. Không ghi `contactHands`/generic `contacts` cho mũi giáo và không tự xoay núm điều khiển khi đâm. Projection giữ event/source ID và clock ở mọi cut.
- Report ghi original contact riêng. Khoảng cách preview về sau đo tới **điểm chạm gốc**, không tuyên bố đối tượng đứng yên hoặc vẫn đang bị chạm sau phản ứng. Các cờ `contactVerified`, `motionVerified`, `productionApproval` vẫn false. Review tính lại record theo source thay vì tin JSON đã sửa, và lấy frame quanh mốc thật; không tạo tiếp xúc ở đầu shot.
- Studio liệt kê tool action, target, clock gốc và slice đang xem. Legacy host pose từ chối các action này thay vì dùng pose giải thích thay thế. Contact camera có source checks cho shaft/palms/target; các kiểm tra này chưa chạy thực tế. Audit ghi riêng `original-spear-action-tip` và `original-world-contact`, để production gate không che lỗi source cụ thể.
- Source fixture hai người được tách thành factory dùng chung, có scene intent và action rõ ràng. Sửa declaration cũ có `actions:[]` và parts không có scene intent — các fixture đó sẽ bị schema từ chối. Factory và callbacks **chưa được gọi**.

## Còn phải thực hiện và nghiệm thu

1. Model test chạy callbacks và scene geometry, đối chiếu physical target/tip với **transform/SVG/GSAP thực sự vẽ**, including fractional/reverse seeks, biên camera, both hands, supporting actor namespace, bone/palm/shaft/costume/hair/eyes. Không coi build hoặc đọc code là kiểm chứng chuyển động.
2. Hoàn thiện contract anchor cho fixed artwork đang dịch/chuyển/xoay/depth tại lúc bị tác động. Candidate hiện từ chối khi chưa có geometry authority hợp lệ. Target thuộc original owned/canonical motion mới có physical candidate; emitted contact/render vẫn chờ test.
3. Native pose/art đúng nét mẫu, chuyển hướng/thể hiện biểu cảm, tay chân mềm và hợp lý, màu sắc đậm; môi trường day/sunset/night có chiều sâu. Người trọc không tóc/không râu và nữ phụ giữ nguyên mẫu. Không vay face ROI, mirror/warp mặt hoặc tự duyệt art/motion.
4. Kiểm chứng toàn tool **câu chuyện/chủ đề → kịch bản**, kịch bản nguyên văn, WAV giữ giọng và legacy SRT; EN/VI/JA/KO + external/local TTS; sửa nội dung/giọng/nhân vật, resume/rebuild/locks; MP4/audio/subtitles/thumbnail/storyboard/manifest/review/final QC. Cảnh giáo chỉ là một khả năng diễn xuất, không giới hạn câu chuyện vào săn bắn hoặc máy móc.

`needs-source-prop-binding` vẫn chặn production/final. Topic giữ `productionReady=false`, `productionRig=null`, mọi `availableBanks=[]`; không có art/motion/production approval. Phải tích hợp và nghiệm thu đầy đủ trước khi mở production; không bỏ riêng gate hoặc thay hành động kể trong nguồn để tạo một ca pass. TEST-RESULTS V1 không nghiệm thu source0.85.

## Môi trường và lệnh cho model test của người dùng

Node >=22.13; source build cục bộ dùng Node24.19.0 / PowerShell. Source geometry tests không cần voice. Studio/video cần Chromium/Hyperframes, FFmpeg/FFprobe, provider voice/ASR phù hợp ngôn ngữ và gateway key trong môi trường hoặc `.env`; không ghi key trong chat, Git hoặc báo cáo.

Implementation chỉ đọc/sửa source, build/typecheck, export schema **definitions**, raw hash/header/JSON inventory và bounded source-only advice qua 9router. Không chạy test/callback/fixture/schema instance/geometry/sampler/compiler/render/browser/server/API pipeline/TTS/ASR/audio/video. D checkout và server8850 được giữ nguyên.

Các lệnh dưới đây **dành cho model test**, chưa được implementation chạy:

```powershell
Set-Location -LiteralPath 'C:/Users/Duongvh-pc/.codex/worktrees/stickman-acting-v22/Story-2-video-factory2.1'
git rev-parse HEAD
npm run build
npm run test:typecheck
node --experimental-test-module-mocks --import tsx --test --test-concurrency=1 tests/source-spear-actions.test.ts tests/source-spear-model.test.ts tests/native-source-spear.test.ts tests/source-world.test.ts tests/source-interactions.test.ts tests/story-acting-coverage.test.ts tests/original-source-audit.test.ts
```

Chỉ khởi động Studio riêng sau khi model test xác nhận cổng8851 trống; đọc địa chỉ thực tế từ output:

```powershell
$env:STUDIO_PORT='8851'
npm run studio
```

Tám callbacks mới DECLARED/NOT RUN: hold không fabricated contact; exact half-open cut/recovery; safe clocks/both-hand conflicts; actual original target/tip/flags; sai cue/sibling/aim/handle; tip-driven reaction; recomputed review/evidence times; narration action coverage. Tám callbacks source0.84 và các bộ cũ cũng chưa được chạy trong lần này. Cần bổ sung scene fixtures cho original moving owned/canonical target, moving fixed artwork/depth, hướng đối diện và contact camera — hiện chưa có kết quả của các trường hợp đó.

Model test ghi full SHA, commands, exit/stdout, failures và NOT RUN, frame/video thực tế. Nếu fixture/geometry fail, sửa source đúng contract; không nới error, giảm clip/target, đổi lời kể hoặc đánh dấu production ready.

## Kiểm source và 9router

Build/typecheck/schema/raw inventory của lần bàn giao được ghi riêng trong `reviews/original-spear-actions-source-record-v1.json`; không phải runtime acceptance. Một lượt source-only qua combo `tester` trả HTTP200, `gpt-6-luna`, 4.137 giây, 12.112 tokens. Parent đối chiếu hai góp ý: selected action đã được bảo vệ bằng equality với slice dương và schema; original track bắt đầu ở0 nên không có tình huống track bắt đầu camera sau. Parent vẫn siết safe clocks của mọi companion action và chọn trực tiếp camera chứa contact để diễn đạt semantics rõ hơn. Các thay đổi sau advisory chưa được model khác review lại. Record advice lưu hash đúng snapshot và kết luận của parent; không tự báo independent integration approval.
