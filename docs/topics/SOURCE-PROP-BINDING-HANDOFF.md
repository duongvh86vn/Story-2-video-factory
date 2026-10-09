# Đồ vật gốc theo diễn viên qua các cảnh — source0.68

Mục tiêu đầy đủ vẫn là câu chuyện → kịch bản, kịch bản nguyên văn hoặc WAV gốc → giọng/timeline → diễn viên trong truyện → video có audio/subtitle/QC. Lila/Karo và quần chúng đóng vai theo nội dung người dùng đưa. Không chuyển công cụ thành bộ dựng riêng cho máy móc, món ăn hoặc một kịch bản mẫu.

Bản source này nối đồ vật với đúng người, mẫu vật, nguồn nội dung và động tác gốc qua các cảnh. Đây là phần triển khai code, **chưa có kiểm chứng chuyển động hoặc video**. Luồng world/event/effect/interaction/acting coverage cho source manipulation còn thiếu; `needs-source-prop-binding` tiếp tục chặn production. Không bỏ guard riêng lẻ để xuất final.

## Phần đã viết

- `source-prop-binding.ts` kiểm toàn storyboard và narration gốc: một owner ID rõ ràng, một model/entity/art/size/origin/source identity ổn định cho mỗi vật; có đủ toàn bộ cảnh của lượt diễn gốc. Quyền sở hữu không đổi khi người diễn chuyển giữa primary và supporting.
- Mỗi action slice giữ source ID, gesture ID, tay, target model/part và clock thật. Thời điểm tiếp xúc chỉ xuất hiện tại cảnh chứa tiếp xúc gốc. Bằng chứng narration phải chứa nguyên câu xác nhận hành động và clock tiếp xúc/release/landing; không thêm cue hoặc viết lại lời kể để vượt kiểm tra.
- Model origin là tọa độ chuẩn của vật gốc, không phải vị trí bàn tay sau khi nhấc vật. Grip offset và scale phải khớp target/destination thật. Thay art hoặc mẫu vật ở giữa lượt diễn bị từ chối.
- `sourceBoundPropFrame`, `modelEntryParts` và `modelExitParts` truy vấn frame vật lý gốc tại thời điểm vào/ra cảnh. Vật còn đang cầm hoặc bay khi rơi không bị đặt ngay vào destination cuối. Truy vấn hình học không tính audio/miệng hoặc kéo dài speech clock.
- API sửa cinematic, canonical validator và storyboard normalization nhận cùng complete board/narration. Offline seed từ chối thay source manipulation đã có thành local placement.
- Shared ownership helper chuyển sang `prop-owner.ts`. Renderer placeholder/report lấy đúng props/gesture của source và ghi source span/contact/release với `motionVerified=false`; chưa có source action group/event renderer được nghiệm thu.
- Cache visual/publication identity chứa các cảnh cùng source span và narration gốc. Sửa art, model, role, cue, action hoặc clock ở một cảnh làm đổi identity của các cảnh liên quan. Thay đồ vật không tự viết lại audio; kiểm resume thực tế vẫn chờ model test.

Phiên bản: `forest-tribe-0.68-source-prop-binding`, `story-direction-2.2.36`, `bound-model-motion-2.2.4`, `source-prop-binding-1`. Body/compiler source0.67 và dữ liệu ảnh giữ nguyên. Source chính trước sửa: `75f156e6a81a61f17d054038999a80c4858f5170`.

## Tạo hình giữ nguyên

Nam phụ đang dùng `male-bald-v2.png`: **đầu trọc, không tóc/râu/ria/mai**, da ấm và lông mày giữ lại; body/costume dùng nguồn Karo. Nữ phụ `female-haired-v1.png` và costume nguồn Lila giữ nguyên. PNG toàn thân không chứng minh rig hay motion đã đẹp. Không mượn mặt/ROI của nhân vật chính, mirror góc thiếu hoặc warp toàn mặt.

`productionReady=false`, `productionRig=null`, tất cả `availableBanks=[]`, art/motion approval vẫn false. Các nét, màu sắc, hướng nhìn bạn diễn, khớp mềm và seam cần so với nguồn và video ở tốc độ thật.

## Còn thiếu để vào production

1. Source-aware model/world timelines: event/reaction, control, thermal, effects, labels/shadows/camera phải theo chuyển động gốc và tiếp xúc thật.
2. Action group, interaction renderer và acting coverage phải hiểu source action; không tìm gesture từ danh sách local rỗng, không giả lập re-contact tại cut.
3. Operation chỉ có contact nhưng không mang prop cần contract world/target/evidence riêng; validator prop hiện tại không chứng nhận trường hợp này.
4. Chuyền vật giữa nhiều người hoặc nhiều lần pickup tuần tự chưa được hỗ trợ. Không gộp owner, chia lại source hay dùng shared prop để tránh giới hạn.
5. Canonical continuous scene/API có các kiểm lead continuity cũ cần nối với role swap thực tế; candidate binding theo người đã có, chưa chứng minh cả renderer/world qua swap.
6. Đủ góc nhìn/continuous head turns, pose công cụ, tay cầm thật, bối cảnh màu đậm, cả hai quần chúng và principal cần nghiệm thu riêng.
7. Full ba input, legacy SRT, EN chính/VI/JA/KO/external-local TTS, missing-voice/final gates, resume/locks và final MP4/audio/subtitle/QC vẫn là yêu cầu chung, chưa đạt chỉ bằng bước source này.

## Kiểm source và review

Implementation agent chỉ build/typecheck/export schema và kiểm byte/hash tĩnh; **không chạy callback, fixture, schema-instance geometry, pose sampler, renderer, browser, server, pipeline API, TTS/ASR hay audio/video**. Test runtime thuộc model người dùng. Kết quả test V1 không chứng nhận bản này.

`tests/source-prop-binding.test.ts` khai báo bảy callback, **NOT RUN**: hai người/hai vật với primary swap; entry/exit theo clock gốc; drop flight/landing sau cut; owner/model/art/source/target mâu thuẫn bị chặn; narration/clock gốc bắt buộc; sibling cache invalidation; guard production/offline seed còn hiệu lực. Fixture là dữ liệu engineering, không phải cảnh phim được duyệt. Kết quả source cuối, phạm vi review9router và raw-byte inspection ghi tại `reviews/source-prop-binding-source-record-v1.json` và `reviews/source-prop-binding-static-record-v1.json`.

Một lượt Gemini review source giới hạn 2.200 output token; không gửi ảnh, credentials hoặc toàn repository; không auto-apply/retry. Packet và file SHA được đóng băng trước lượt gọi. `reviews/source-prop-binding-source-review-v1.json` lưu phản hồi và quyết định đối chiếu source; review code không chứng minh chất lượng hình/video.

## Môi trường và lệnh giao model test

Source mới ở worktree C; checkout `D:/github/Story-2-video-factory2.1` được giữ read-only và Studio8850 không tự nhận source mới. Không reset/copy/merge vào D. Dùng Node ≥22.13 (máy hiện có24.19), dependencies hiện có; FFmpeg/FFprobe, TTS/ASR/provider theo cấu hình dự án khi chạy full flow. Không đưa API key vào chat/log/commit.

Các lệnh sau **chưa được implementation agent chạy**:

~~~powershell
Set-Location -LiteralPath 'C:/Users/Duongvh-pc/.codex/worktrees/stickman-acting-v22/Story-2-video-factory2.1'
git rev-parse HEAD
node --experimental-test-module-mocks --import tsx --test --test-concurrency=1 tests/source-prop-binding.test.ts tests/source-manipulation-actions.test.ts tests/physical-performance.test.ts tests/actor-owned-props.test.ts tests/native-source-manipulation.test.ts tests/native-manipulation.test.ts
$env:STUDIO_PORT='8861'
$env:STUDIO_PROJECTS_ROOT='C:/Users/Duongvh-pc/.codex/worktrees/stickman-acting-v22/Story-2-video-factory2.1/runtime/source-prop-binding-studio-projects'
npm run studio
~~~

Mở `http://127.0.0.1:8861/`; Ctrl+C dừng server. Sau khi world contract hoàn tất, model test cần dựng canonical nhiều người/hai vật với cut khi đang cầm, đang di chuyển và đang rơi; đổi primary, random/reverse seek và video60fps. So frame gốc, không dùng shortcut destination. Sửa sibling model/art/cue/clock phải mất hiệu lực scene cache; audio gốc giữ khi chỉ sửa hình. Ghi exactSHA, PASS/FAIL/NOT RUN, lỗi và bằng chứng ảnh/video; chưa chạy hoặc gặp guard phải báo đúng trạng thái, không DONE/final.

Đây là source progress trong sản phẩm đang làm; toàn luồng chưa hoàn thành hoặc nghiệm thu.
