# Timeline gốc của đồ vật và hiệu ứng — source0.69

Mục tiêu vẫn là công cụ nhận câu chuyện → kịch bản, kịch bản nguyên văn hoặc WAV gốc → narration/timeline → diễn viên đóng vai trong truyện → video có audio/subtitle/QC. Đây là phần tiếp theo của source0.68, không phải một video mẫu được nghiệm thu hoặc một bộ dựng riêng cho máy móc/món ăn.

Bản này thêm timeline gốc của các sự kiện đồ vật và hiệu ứng vào canonical schema, validator, renderer và cache/publication/repair. **Native source manipulation vẫn bị `needs-source-prop-binding` chặn production** vì source action groups, interaction geometry, fixed-operate target và acting coverage chưa hoàn tất. Không bỏ guard riêng lẻ để xuất final. Các điều kiện art/identity/voice/final tiếp tục áp dụng.

## Contract và phần đã viết

- `cinematic.sourceWorld` là lựa chọn explicit: version `source-world-timeline-1`, ID, global start/end và danh sách original events có ID ổn định. Không tự suy luận lịch sử từ một cảnh đang mở.
- `visualization.events[].sourceWorld` chứa `sourceId/eventId`. Local event là đúng giao của original event với cửa sổ camera, giữ target/state/motion/cue/source refs. Không thêm local event, fake contact hoặc đặt lại thời điểm bắt đầu sau cut.
- Complete board phải phủ kín original world clock, giữ model/entity/art/relation/palette/environment/stage identity. Camera có thể thay đổi; mẫu vật và clock gốc không được thay. Sửa model giữa lượt diễn cần replan toàn source, không sửa một local binding để né kiểm.
- Contact-driven original event khai báo actual actor ID và từng source ID/gesture ID; required hands phải khớp. Phản ứng xảy ra sau contact thật, không vượt original action hoặc narration cue; complete original statement vẫn bắt buộc. Geometry của native palm và fixed operate vẫn cần phần production tiếp theo.
- `sampleSourceWorldPhase` tính reveal, focus, rotate/translate/pulse, thermal coat/icons, directed flow/energy và control bằng global time gốc. Trạng thái nhiệt giữ đến state được dẫn nguồn tiếp theo; reveal là xuất hiện và tiếp tục tồn tại. Highlight/particle chỉ có cửa sổ hoạt động đã khai báo. Không reset hot/cold hoặc vật vừa xuất hiện khi cue kết thúc.
- Renderer có pose trạng thái đầu cảnh tại local0. Original breakpoints và fps grid giữ pha thật qua cut; channel thay đổi dạng bước không tween trước contact. Không có negative local timeline time hoặc local event restart.
- Luồng transfer/cause đi trên relation đã có nguồn, dùng physical compiled prop clock của từng owner để cập nhật hai đầu. Particle giữ progress gốc; khi tới endpoint thì tắt, không quay về điểm đầu khi còn đang thấy. Energy/motion response dùng cùng original phase.
- Bound prop, model label/focus/effect/shadow/foreground tiếp tục theo actual owner compilation từ source0.68; hiệu ứng không thay chuyển động vật lý của vật hoặc cơ thể bằng một CSS dịch toàn cảnh. Internal `.motion` giữ convention tọa độ glyph hiện có; chưa chứng minh biên độ hiển thị trong mọi SVG/projection bằng runtime.
- Scene cache và publication binding chứa toàn original world, các sibling shots và narration. Source world không phụ thuộc việc native speech clock có được chọn hay không. Repair đọc complete board và recheck snapshot lúc publish; không dùng fallback một shot hoặc tự sửa narration/audio.
- Performance report ghi source hash, original span và entry/exit phase với `motionVerified=false`; không gọi báo cáo này là nghiệm thu optical continuity hoặc video.

Phiên bản hiện hành: `forest-tribe-0.69-source-world-timeline`, `story-direction-2.2.37`, `cinematic-models-2.2.5`. Source trước sửa: `7f26a6cd1b373ffd4fe976ae42246ddacacf1614`. Body/compiler và PNG principal/supporting không đổi; nam phụ v2 **trọc, không tóc/râu/ria/mai**, nữ v1 giữ nguyên, costumes dùng nguồn Karo/Lila.

## Còn thiếu để hoàn thành luồng

1. Source-aware action groups và interaction geometry/QC phải hiểu contact đã xảy ra trước cảnh hiện tại, tay đang cầm hoặc đã thả; không tìm gesture trong local array rỗng và không fake contact tại cut.
2. Fixed operate original target/geometry, action/event evidence và acting coverage cần nối vào complete original contract; generic storyboard operation guard và API lead continuity hiện chưa hỗ trợ đầy đủ source action/role swap.
3. Chuyền vật giữa nhiều người/sequential pickup, các pose công cụ, continuous views/head turns và đủ bank own-model cần nghiệm thu riêng. Không thay obligation bằng pointing hoặc lấy ROI/góc nhìn từ model khác.
4. Random/reverse seek, source camera boundaries, effect/property ownership, pixel displacement trên authored SVG, foreground seams, scene2MB cap, cache/resume/repair và normal-speed multi-actor film cần test thực tế.
5. Full câu chuyện/kịch bản/WAV, legacy SRT, EN chính/VI/JA/KO và external/local TTS, voice/final gates, locks/resume và final MP4/audio/subtitle/thumbnail/storyboard/reports/QC vẫn chưa được chứng nhận bởi bước source này.

`productionReady=false`, `productionRig=null`, tất cả `availableBanks=[]`, approval/motion false. Màu sắc và tạo hình gốc giữ nguyên; code timeline hoặc vài ảnh tĩnh không chứng minh video đã mượt như mẫu.

## Kiểm source và review

Implementation agent chỉ build/typecheck/export schema và kiểm byte/hash tĩnh; **không chạy callback, fixture, schema-instance geometry, pose sampler, renderer, browser, server, production pipeline API, TTS/ASR/audio/video**. Test runtime vẫn giao model của người dùng. Test V1 không chứng nhận ba luồng mới hoặc timeline này.

`tests/source-world.test.ts` khai báo tám callback **NOT RUN**: exact projection/source identity; phase continuity tại cut; flow và energy gốc; timeline initialization/nonnegative times; nguồn/model/art/cue bị sửa bị chặn; original contact/hands; sibling cache/publication invalidation và audio bất biến; guard production và overlapping channel ownership. Fixture là dữ liệu engineering, không phải cảnh phim đã được duyệt.

Một request source-only Gemini qua9router, cap2.200 output token, không ảnh/toàn repository/credentials, không auto-apply. Một packet trước đó bị local tool từ chối đường dẫn direct `library/` trước request reservation/HTTP; packet hợp lệ dùng exact library source đóng băng trong MD, không đổi tool allowlist. Không retry model request. Phản hồi/đối chiếu và post-freeze changes ở `reviews/source-world-source-review-v1.json`; review một phần source không là runtime hoặc whole-patch acceptance. Kiểm source cuối và static inspection ở `reviews/source-world-source-record-v1.json`, `reviews/source-world-static-record-v1.json`.

## Môi trường và lệnh cho model test

Source mới ở C worktree; checkout D giữ read-only, Studio8850 không tự nhận source. Dùng Node ≥22.13 (máy hiện24.19) và dependencies dự án. Khi kiểm full flow cần FFmpeg/FFprobe, TTS/ASR/model theo config; API key cấu hình qua env/file riêng, không đưa vào chat/log/commit. Các lệnh sau **chưa chạy bởi implementation agent**:

~~~powershell
Set-Location -LiteralPath 'C:/Users/Duongvh-pc/.codex/worktrees/stickman-acting-v22/Story-2-video-factory2.1'
git rev-parse HEAD
node --experimental-test-module-mocks --import tsx --test --test-concurrency=1 tests/source-world.test.ts tests/source-prop-binding.test.ts tests/source-manipulation-actions.test.ts tests/physical-performance.test.ts
$env:STUDIO_PORT='8861'
$env:STUDIO_PROJECTS_ROOT='C:/Users/Duongvh-pc/.codex/worktrees/stickman-acting-v22/Story-2-video-factory2.1/runtime/source-world-studio-projects'
npm run studio
~~~

Mở `http://127.0.0.1:8861/`, Ctrl+C dừng server. Không copy/reset/merge checkout D. Sau khi source manipulation production contract hoàn tất, dựng canonical nhiều người/vật với cut trước/trong/sau contact, carry, release/flight/landing, thermal transition và relation flow; đổi camera/primary, random/reverse seek và video60fps. So đúng global phase và actual prop center; kiểm audio/speaker/subtitles và full flow riêng. Sửa sibling model/art/world/cue phải invalidate visual cache và giữ audio khi chỉ sửa hình. Ghi exactSHA, PASS/FAIL/NOT RUN, log/ảnh/video; gặp guard hoặc chưa test phải báo đúng trạng thái, không DONE/final.

Toàn luồng vẫn chưa hoàn thành hoặc nghiệm thu; bước tiếp theo là source action groups/interaction/coverage với chính timeline gốc này.
