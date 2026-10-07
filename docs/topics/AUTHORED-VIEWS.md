# Lila/Karo — góc thân và đầu để dựng rig

**Hiện hành 0.33 — 08/10/2026:** explicit pupil gaze và nhịp thở native nhận clock của run liên tục; gaze cùng target sát nhau không restart tại camera cut, breath dùng envelope đầu/cuối run. Primary/supporting/arm reference/interaction sampling và cache/repair binding dùng cùng context; continuous lệch clock/cast/view/root/stage/scale/profile bị chặn. Body compiler23, PNG/màu/proportion không đổi; **9 callbacks mới NOT RUN**, chưa nghiệm thu chuyển động/video. [Phạm vi, source, test và server](CONTINUOUS-VIEW-ATTENTION-HANDOFF.md), [review](reviews/continuous-view-attention-source-review-v1.md). Gesture/expression/locomotion/posture/cloth/hair/head-turn và toàn diễn xuất vẫn cần tiếp tục; không gọi đây là whole-body continuity. Giữ productionReady=false/productionRig=null/final gates, ba input script nguyên văn / WAV giữ audio-clock / story→script→video, SRT, EN chính/VI/JA/KO và TTS ngoài/local. Lila/Karo tiếp tục là diễn viên trong truyện bất kỳ. Mốc0.32 và dưới là lịch sử.

**Lịch sử 0.32 — 08/10/2026:** bổ sung explicit `bodyEyes=registered-eyes-v1` cho hai góc native Lila/Karo: glyph mắt từ PNG, vùng da nhỏ và mí khép; không scale/shear cả mặt. Direction lấy từ tâm mắt native/head-local, explicit target sau facing hemisphere bị chặn. Blink giữ source offset cả actor eye-only im lặng; canonical context/cache/repair và resources dùng cùng contract. Body compiler22, lớp miệng0.31 giữ nguyên; default artwork mắt vẫn intact. Có figure/đo PNG tĩnh, **10 callbacks mới NOT RUN**, source/build/types/review riêng; chưa art/acting/audio/video approval. [Source, hình tĩnh, test và server8851](NATIVE-VIEW-EYES-HANDOFF.md), [review](reviews/native-view-eyes-source-review-v1.md). Gaze vẫn ramp theo local clip, whole-body/head/breath/cloth phase và neutral/full expressions/turns/locomotion/props/environments/ba input còn phải tiếp tục. Giữ `productionReady=false`, `productionRig=null` và final gates. Tool vẫn phục vụ câu chuyện bất kỳ: script nguyên văn / WAV giữ audio-clock / story→script→video, legacy SRT, EN chính/VI/JA/KO và TTS ngoài/local; Lila/Karo là diễn viên trong truyện. Không cần API image-to-video để tiếp tục SVG/HTML5/GSAP. Các mốc dưới là lịch sử.

**Lịch sử 0.31 — 08/10/2026:** đã triển khai context clock nguồn cho mouth candidate để câu đang nói không tự khép/mở lại theo ranh giới shot. Primary/supporting dùng cue owner của complete storyboard; source windows giữ timestamp/centers/gap/zero và projection local phải khớp. Cache, source comparison, reports, locks và repair dùng cùng ownership identity; acceptance chặn khi sibling owner hoặc narration đổi trước publication. Mouth protocol2/body compiler21, PNG/ROI/mắt/mũi/màu/trang phục không đổi. **14 ca mới NOT RUN**, source/build/types và bounded review được ghi riêng; chưa nghiệm thu animation/audio/video. [Code, phạm vi, lệnh test và server8851](SOURCE-SPEECH-PHASE-HANDOFF.md), [review và P2 đã sửa](reviews/source-speech-phase-source-review-v1.md). Giữ `productionReady=false`, `productionRig=null`. Tiếp tục native identity/limbs/face/expression/gaze/acting, props/cloth/environment và ba input kịch bản nguyên văn / WAV giữ audio-clock / câu chuyện→kịch bản→video; legacy SRT, EN chính/VI/JA/KO, TTS ngoài/local. Lila/Karo là diễn viên trong truyện người dùng đưa; không cần API image-to-video để tiếp tục. Các mốc dưới là lịch sử.

**Lịch sử 0.30 — 08/10/2026:** bổ sung lựa chọn `appearance.bodySpeech='registered-mouth-v1'` cho Lila/Karo ở hai góc 3/4 đã đăng ký. Lớp miệng SVG có clip riêng theo exact PNG hash/native coordinates; mắt/mũi/tóc và phần ngoài vùng miệng giữ artwork view. Lila dùng aperture; Karo giữ viền môi/râu và animate phần răng/lưỡi trong nụ cười. Compiler dùng activity theo clock thật của nguồn, attack/release nằm trong cửa sổ có lời, không nối qua khoảng im lặng hoặc level0. Renderer chung đã lọc cue riêng của primary/supporting; đây là ứng viên speech activity, **không là phoneme lip-sync hoặc audio/video nghiệm thu**. Chọn mặc định silent tiếp tục chặn activity. Gaze/turn/locomotion/expression/tool chưa đăng ký vẫn chặn; artwork/identity/cloth còn chờ. [Source, hình artwork tĩnh, các ca NOT RUN và lệnh server](FIXED-VIEW-SPEECH-HANDOFF.md), [review source](reviews/fixed-view-speech-source-review-v1.md). `productionReady=false`, `productionRig=null`. Mục tiêu tiếp tục là hai diễn viên trong bất kỳ câu chuyện được đưa, ba input kịch bản nguyên văn / WAV giữ audio-clock / câu chuyện→kịch bản→video; legacy SRT, EN chính/VI/JA/KO và TTS ngoài/local giữ nguyên. Người dùng không có API image-to-video; vẫn triển khai HTML5/SVG/GSAP. Mốc 0.29 và bên dưới là lịch sử.

**Lịch sử 0.29:** `a63259c`/`f88ae6e`/`004cd8b`/`674ac04`/`cb13bcb` đăng ký góc trái độc lập, lớp tay gần/xa, guard gaze/anchor và think target cùng góc đầu. Mười ca **NOT RUN**; [bằng chứng/lệnh test](PARTNER-FACING-VIEWS-HANDOFF.md). Chỉ source/build review, chưa art/motion/voice approval.


**Lịch sử 0.20:** cuff/palm tách riêng theo ảnh nguồn; chain migrate độc lập target, contact vẫn ở palm, mitten theo tiếp tuyến cẳng tay. Preset frontal đã re-author, slot think discrete và shaft interpolation có kiểm riêng. Grasp/anatomy/motion/video chưa nghiệm thu, `productionReady=false`; ba input và diễn viên trong truyện giữ nguyên. [Chi tiết, bằng chứng và lệnh bàn giao](WRIST-PALM-IMPLEMENTATION.md). Các đoạn 0.19 trở về trước dưới đây là lịch sử.

**Lịch sử 0.19:** hai view 3/4 phải có registration kỹ thuật và ứng viên lunge qua rig/evaluator chung; giữ source bones, cổ/mặt nguyên lớp, near/far arms, sole trụ và clock giáo. Áo view mới vẫn rigid, wrist/palm/grasp và độ đọc joint còn thiếu; hai model review qua 9router chưa chấp nhận anatomy hoàn thiện. Chỉ build/typecheck và inspection clock tĩnh; runtime/MP4/ba input giao model test khác. `productionReady=false`, `productionRig=null`. [Source, ảnh, việc thiếu và lệnh server/test](VIEW-LUNGE-IMPLEMENTATION.md). Các mốc 0.18 trở về trước bên dưới là lịch sử, không phải trạng thái mới.

Mốc 0.18, 07/10/2026. Artwork ứng viên; **chưa đăng ký vào rig và chưa duyệt sản xuất**. Không dùng ảnh toàn thân thay nhau làm slideshow để gọi là chuyển động.

## Đã tạo và đã kiểm tra

Qua 9router đã tạo **chín output ảnh thành công**: Lila/Karo mỗi người có 3/4 trái, 3/4 phải và profile trái v1; thêm ba bản sửa cánh tay Lila v2. Mỗi output giữ nguyên byte, hash, prompt, model, ảnh tham chiếu và trạng thái trong `library/topics/prehistoric-life/body-views/`. Có alpha thật ở cả chín output. Profile phải và lưng chưa có.

Gallery: [góc thân/đầu](http://127.0.0.1:8850/api/topics/prehistoric-life/view-art). Gallery dùng nền CSS sáng để thấy nét đen trên PNG trong suốt, không sửa bitmap. Đường ảnh chỉ nhận tên allowlist và kiểm hash. Ảnh gốc được đặt riêng để đối chiếu; bản mới không tự trở thành chuẩn.

| Phần | Đánh giá hiện tại | Điều kiện còn thiếu |
|---|---|---|
| Lila v1 | AI thêm phần da ở bắp tay, khác tay nét đen nguồn | Không dùng v1 làm rig |
| Lila v2 | Nét đen rõ hơn ở cả ba góc; có head/torso hướng trái/phải thật | Kiểm attachment đuôi tóc, áo một vai, mắt/mũi/miệng, tỷ lệ đầu/thân và shoulder emergence |
| Karo v1 | Có head/torso 3/4 hai hướng và profile trái; nét đen, màu ấm | Profile có cổ/mũi/râu dài hơn nguồn; tỷ lệ và costume continuity cần hiệu chỉnh |
| Bản sửa canvas | Lila 3/4 phải và profile trái v2 đổi kích thước canvas so với v1 | Không tái dùng tọa độ khớp cũ; tool nay ghi `editFrameChanged` cho lượt sửa tiếp theo |
| Registration | Chưa có landmark/mask/occlusion được đo và duyệt | Không dùng tọa độ ước lượng của AI làm xương |

Hai review Gemini: [v1](reviews/gemini-authored-views-advice-v1.json), [v2](reviews/gemini-authored-views-advice-v2.json). V2 nêu rủi ro đuôi tóc Lila ở góc trái và cổ profile dài. Nhưng v1/v2 đánh giá khác nhau về chính cùng ảnh Karo 3/4 phải; nhận xét “mirror” phải kiểm bằng anatomical side, không chỉ screen side. Ước lượng pelvis/hip của reviewer có điểm gần gấu áo, không phải vị trí khớp hông. Không áp các tọa độ hay đánh giá đó tự động. Đây là tư vấn tĩnh, không phải PASS identity/anatomy/motion.

Ảnh developer trên nền sáng: [3/4 trái](reviews/authored-views-three-quarter-left-v2.png), [3/4 phải](reviews/authored-views-three-quarter-right-v2.png), [profile trái](reviews/authored-views-profile-left-v2.png). Screenshot viewport không chứa toàn bộ caption; inventory/JSON là nơi ghi đủ phiên bản và hash.

## Registration và tích hợp còn phải làm

1. Chốt tỷ lệ đầu/thân và attachment tóc/áo đúng nguồn qua các góc, rồi dựng profile phải/lưng. Không flip costume một vai để giả hướng.
2. Đo cổ, vai gần/xa, pelvis ở belt, hông thật, emergence của tay/chân, wrist/ankle/sole trên từng canvas. Ghi nhãn anatomical side riêng với rig-left/right; không đo hip từ gấu quần/váy.
3. Ghi mask head/hair/neck/garment/mitten/foot và vùng occlusion. Mask là vector code; ảnh nguồn/output bất biến. Cần phục hồi phần áo/tóc bị che, không kéo nguyên full-body bitmap.
4. Giữ canonical physical bone lengths từ nhân vật. Canvas hoặc view mới không được tự đổi độ dài xương. Góc profile cần projection và layer gần/xa thực; không chỉ bóp X của front cutout.
5. Dùng cùng asset manifest, `rigMetrics`, evaluator, cache/hash và scene compiler với Studio. Góc artwork chỉ được bật khi registration hợp lệ; không fallback âm thầm sang mặt front.
6. Dựng lunge theo pose người dùng: hai sole có trụ, chân trước chùng/chân sau duỗi, pelvis/vai dồn lực, cán chéo, rear elbow nâng ra sau, hai grip cùng shaft frame. Cặp tay thấp 0.18 hiện tại chỉ là cải thiện frontal hold.
7. Model test kiểm liên tục clock/seek/resume, biểu cảm, anatomy/occlusion, garment/hair và video thật. Giữ `productionReady=false`, `productionRig=null` đến khi đạt.

## Tool và môi trường

Windows, Node ≥22.13, dependencies của repo; 9router `http://127.0.0.1:20128/v1`. Key trong `.env` riêng, không gửi vào chat hoặc commit. Tool dùng API ảnh có reference qua `cx/` hoặc `ag/`; không fallback sang endpoint bỏ ảnh tham chiếu.

```powershell
Set-Location -LiteralPath 'C:/Users/Duongvh-pc/.codex/worktrees/stickman-acting-v22/Story-2-video-factory2.1'

# Dựng view mới — chọn version chưa tồn tại, không ghi đè output:
node --import tsx scripts/prehistoric-view-art.ts --actor karo --view right --version v1 --env 'D:/github/Story-2-video-factory2.1/.env'

# Sửa đúng phần da cánh tay trên một target đã có. Chưa chạy ví dụ v3 này:
node --import tsx scripts/prehistoric-view-art.ts --actor lila --view left --version v3 --edit lila-left-v2.png --env 'D:/github/Story-2-video-factory2.1/.env'

# Chỉ tạo inventory từ file có sẵn, không gọi model và không nghiệm thu:
node --import tsx scripts/prehistoric-pack.ts

npm run build
npm run test:typecheck
```

`--edit` tạo reference board có nhãn ORIGINAL / EDIT TARGET vì adapter chỉ nhận một ảnh inline. Board chỉ là input hướng dẫn, không phải output hoặc asset production. Bản tool sau v2 đã tách prompt chỉnh cục bộ khỏi prompt dựng lại góc, ghi canvas target và báo thay đổi canvas; chưa có output mới từ prompt sửa này để đánh giá hiệu quả.

Các view phục vụ **hai diễn viên trong câu chuyện bất kỳ**, không tạo người dẫn cố định. Ba input vẫn là kịch bản nguyên văn, WAV giữ giọng/clock và câu chuyện → kịch bản trung thành → video. Artwork đẹp hoặc build thành công không thay việc nghiệm thu ba luồng.
