# Giáo của diễn viên trong cảnh — source0.84

Source `forest-tribe-0.84-original-spear-model`, producer `story-direction-2.2.47`, binding `source-spear-binding-1`, source props `source-prop-binding-6`, bound model `bound-model-motion-2.2.7`. Phần này bổ sung entity/model và renderer vào [clock giáo source0.83](ORIGINAL-SPEAR-CLOCK-HANDOFF.md). Đây là code chưa được nghiệm thu chuyển động/video.

## Đã triển khai trong source

- `cinematic.sourceSpearBindings` đăng ký rõ người diễn, source run, track, prop, entity, bằng chứng và artwork `forest-spear-grips-4`. Model mô tả đúng tâm nguồn, chiều dài cán đã nhân scale của chính diễn viên và chiều cao logic 14 đơn vị. Không thay giáo bằng model cơ chế, SVG khác, foreground hoặc lớp nhiệt chưa đăng ký.
- Validator kiểm toàn bộ storyboard/narration và các camera slice của run, đủ clock, actual actor/body/tool, một prop/entity, source refs, model và kích thước không đổi khi vai chính/phụ đổi chỗ. Alias, registration dư hoặc mất, nguồn vô hình và world transform thứ hai đều bị từ chối. Câu narration được đối chiếu nguyên văn; phần này chưa xác nhận hành động/thrust có đúng câu chuyện.
- Renderer dùng đúng glyph gỗ, mũi đá, dây buộc hiện có của rig. Diễn viên phụ có glyph riêng trong namespace của mình; bản chính giữ glyph gốc. Không gắn một hình giáo thứ hai lên model minh họa hoặc tạo clock chuyển động mới. Nhãn vẫn là billboard theo tâm; chúng không được xem là artwork của shaft đã duyệt.
- Center và góc xoay của model rigid lấy từ `FrameState.transforms` mà compiler thực sự xuất: translate/rotate/scale làm tròn bốn chữ số, góc đã unwrap. Raw physics chỉ kiểm đối chiếu sai khác do serialization, không thay transform vẽ bằng góc đã wrap. Relations nhận center và angle trên union keyframes của đúng các owner, kể cả khi ghép với canonical ownership; không tự thêm góc xoay cho basket hoặc entity khác.
- Relation radius đưa hướng tia về hệ trục local của shaft. Kích thước đã ở world scale; không nhân scale lần thứ hai. Camera tách envelope trọn shaft/tip/butt với envelope tâm dùng cho nhãn; không nới cả chiều dài giáo quanh một envelope vốn đã chứa cả cán.
- Mixed ownership kiểm full source spear trước khi phân loại alias độc lập. Tool không thay canonical shared grip. Source context bao gồm run của giáo và các owner xuất hiện trong camera sau. Generic companion vẫn theo validator manipulation riêng, không dùng thrust làm generic attachment.
- Cache fingerprint có source spear, registration, model/art/owner/cue của các slice liên quan. Audit thêm kết quả riêng `original-spear-model-binding`, để lỗi binding không bị che bởi production gate. Export `source-spear-binding.schema.json`; manifest giữ toàn bộ approvals false.

## Còn phải làm

1. Hoàn chỉnh **original action/cue/tip-contact/world-reaction**: action thể hiện hold/thrust có nguồn, target thực tế, mũi giáo tiếp xúc đúng trước phản ứng của đối tượng, action và cue giữ nguyên qua cut. Không giả pickup, reset clock hoặc đổi thành pointing để bỏ nghĩa hành động.
2. Kiểm actual emitted SVG/GSAP bằng random/fractional/reverse seek, hai bàn tay/cán/mũi, bone length, cuff, face/gaze, tóc/râu/vạt áo, thứ tự lớp và crop camera. Relation curve được dựng theo keyframe; chưa chứng minh sai số giữa keyframe trong runtime. Highlight/effect billboard chưa được nghiệm thu như rigid contact geometry.
3. Native pose/art/motion đúng nét mẫu, hướng đối diện, chuyển hướng đầu/thân liên tục và canonical airborne/depth khi câu chuyện yêu cầu. Không mirror, warp mặt, vay ROI của người khác hoặc auto approve.
4. Nghiệm thu toàn sản phẩm: **câu chuyện/chủ đề → kịch bản**, kịch bản nguyên văn, WAV giữ giọng, legacy SRT; EN/VI/JA/KO; TTS ngoài/local; resume/sửa nội dung/đổi giọng/đổi nhân vật/rebuild/locks; MP4 có audio/subtitles/thumbnail/review/final QC. Cảnh giáo là một ca diễn xuất, không giới hạn tool vào săn bắn hoặc máy móc.

`needs-source-prop-binding` vẫn chặn production/final. `productionReady=false`, `productionRig=null`, mọi `availableBanks=[]`, art/motion/production approval false. Không bỏ riêng gate để biến source candidate thành video đã đạt. Kết quả test V1 và lượt đọc code của tester không nghiệm thu bản này.

## Môi trường và lệnh cho model test của người dùng

Implementation chỉ build/typecheck, export schema definitions, raw hash/header/JSON inventory. **Không chạy** tám callbacks mới, fixture/schema instance, geometry/sampler/compiler/render, browser/API/server, TTS/ASR hay video. D checkout/server8850 được giữ nguyên.

Node >=22.13; build cục bộ dùng Node24.19.0. Chạy test source geometry không cần TTS. Studio/video thật cần Chromium/Hyperframes, FFmpeg/FFprobe và provider voice/ASR đúng ngôn ngữ. Không đưa API key vào Git hoặc kết quả test.

```powershell
Set-Location -LiteralPath 'C:/Users/Duongvh-pc/.codex/worktrees/stickman-acting-v22/Story-2-video-factory2.1'
git rev-parse HEAD
npm run build
npm run test:typecheck
node --experimental-test-module-mocks --import tsx --test --test-concurrency=1 tests/source-spear-model.test.ts tests/native-source-spear.test.ts tests/model-motion.test.ts tests/mixed-ownership.test.ts tests/actor-owned-props.test.ts tests/original-source-audit.test.ts
```

Các lệnh sau **dành cho model test**, chưa được implementation chạy. Chỉ khởi động một Studio riêng nếu cổng8851 trống; xác nhận địa chỉ bằng output thực tế:

```powershell
$env:STUDIO_PORT='8851'
npm run studio
```

Tám callback mới kiểm emitted transform/fractional phase, thiếu transform hoặc scale sai, hợp nhất rotation với canonical channels, ray theo góc shaft, complete binding hai người/ba camera đổi vai, mutations của sibling/model/art/owner/cue, cache và retained production gate. Model test ghi SHA đầy đủ, commands/exit/stdout, failures/NOT RUN và các frame/video thật. Không hạ constraint khi fixture hoặc native geometry chưa đạt.

Một lượt source-only qua combo `tester` trả HTTP200, `gpt-6-luna`, 2.763 giây, 7.674 tokens, không báo issue trong ba file gửi. Snapshot trước lần siết dangling metadata và cập nhật tài liệu; không phải review integration cuối cùng, không chạy test hoặc tạo bằng chứng film. Record source/static/advice nằm trong `reviews/original-spear-model-*-record-v1.json`.
