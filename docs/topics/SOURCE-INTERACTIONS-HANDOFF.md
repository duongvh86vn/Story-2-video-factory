# Tương tác và diễn xuất theo hành động gốc — source0.70

Mục tiêu đầy đủ vẫn là câu chuyện → kịch bản, kịch bản nguyên văn hoặc WAV gốc → narration/timeline → diễn viên trong câu chuyện → video có giọng/phụ đề/QC, EN chính cùng VI/JA/KO và TTS ngoài/local. Đây là source nối tiếp0.69, không phải bộ dựng riêng cho món ăn/máy móc hoặc video đã nghiệm thu.

## Phần đã viết

- `cinematicActionGroups` giữ original gesture và clock riêng khi action có `sourceManipulation`; không tìm một local gesture rỗng, sao chép thành clip mới hay phát minh tiếp xúc ở cut. Động tác legacy vẫn dùng clock local.
- `sourceInteractionDescriptor` buộc đúng person/source/gesture/hand/prop/entity/model/art/cue, complete board và original narration. Center/handle khai báo phải khớp actual original grip offset. Toàn source giữ cùng cue, entity và anchor qua primary/supporting swaps.
- Renderer ghi actual original contact ở camera sở hữu contact và actual state/center của slice đang xem: approach, held, released hoặc landed. `contactMs` local chỉ có ở slice thật sự chứa contact; `originalContact` giữ global witness ở mọi slice.
- Contact witness đo palm/model so với world grip đã khai báo độc lập và lưu compiler constraint error. Held grip có actual frame/constraint; sau release không ép tay tiếp xúc với vật đang rơi. Đây là báo cáo geometry candidate, không phải optical/film acceptance; `contactVerified=false`, `motionVerified=false`.
- Review tính lại source geometry từ canonical board/narration và so hash với report. Báo cáo thiếu/giả/inherited-contact sai không được bỏ qua QC legacy. Legacy contact check vẫn áp dụng cho local action.
- Preview/review dùng cùng lịch evidence: actual original contact/release/landing ± frame step chỉ thuộc camera chứa từng timestamp; mỗi slice có entry/exit và representative frame. Cut đúng contact không dời contact vào camera khác hoặc clamp cả triplet thành một ảnh.
- Acting coverage đọc complete original manipulation, cho phép beat nhìn thấy inherited carry/flight của cùng full statement/cue mà không bắt phải contact lại trong beat. Obligation, target, statement và release/landing gốc vẫn bắt buộc; không thay thao tác bằng pointing/hold/narration.
- Studio hiển thị hành động của cả primary và supporting, với thời gian gốc/đoạn đang xem được phân biệt. `source-action-clock.ts` chứa phép chiếu/kiểm clock thuần dùng chung cho browser và server; schema nguồn/body, ownership, geometry và cue vẫn được server kiểm đầy đủ. Source grouping không kéo Node/crypto/fs vào browser.
- Canonical action/event validation nhận source projection sau các kiểm tra target/cue/current bounds. Original world vẫn được kiểm bởi complete world validator; contact event không dùng local action để suy luận lịch sử.
- Cache/publication/repair từ0.68–0.69 đã hash complete sibling source/actions/world/narration. Version director mới2.2.38 làm source cũ phải đi qua migration/locks hiện có; không tự đổi approved locks hoặc dựng lại audio khi chỉ sửa hình.

Phiên bản: `forest-tribe-0.70-source-interactions`, `story-direction-2.2.38`, `source-interaction-1`. Source trước sửa: `edcd6f654a4f5b2ac979a7288723eb6cecdceeb5`. Body compiler/rig và ảnh principal/supporting không sửa. Nam phụ v2 trọc/không râu/ria/mai; nữ v1, nét vẽ, màu và costumes Karo/Lila giữ nguyên.

## Chưa hoàn thành

1. Fixed operate target geometry cho original action không mang prop vẫn chặn rõ; API continuity còn so lead giữa hai shot, cần continuity theo từng person khi đổi primary. `needs-source-prop-binding` production guard **còn nguyên**, không bỏ guard riêng lẻ để xuất final.
2. Shared/sequential pickup/handoff, các pose công cụ, opposite own-model views/head turns và ngân hàng art/motion cần triển khai/nghiệm thu riêng. Không dùng ảnh/góc/ROI của người khác hoặc tự mở bank chưa duyệt.
3. Tests mới/fixture refactor, geometry, optical continuity, camera contact seams, random/reverse seek, scene2MB cap, source caches/resume/repair, film60fps và các dòng cuối cần model test chạy thật.
4. Full câu chuyện/kịch bản/WAV, legacy SRT, EN/VI/JA/KO/external-local TTS, voice/source/art/final gates, locks, resume/rebuild và final MP4/audio/subtitle/thumbnail/storyboard/reports/QC chưa được chứng minh bởi source này. Test V1 không chứng nhận luồng mới.

`productionReady=false`, `productionRig=null`, tất cả `availableBanks=[]`, art/motion approval false. Không có video mới hay kết luận đã mượt như mẫu.

## Kiểm source và source review

Implementation agent chỉ build/typecheck/schema export và kiểm byte/hash/PNG header/JSON metadata tĩnh. Không chạy test callbacks/fixtures/builders/schema-instance geometry/pose sampler/renderer/browser/server/production pipeline API/TTS/ASR/audio/video/MP4. `tests/source-interactions.test.ts` khai báo8 callback NOT RUN; fixture chung chỉ là hàm author dữ liệu bên trong callback, không thực thi trên module import. Bảy callback source-prop-binding cũ dùng cùng fixture, không được coi là đã chạy lại.

Một request source-only Gemini qua9router, cap2.200 output token, không ảnh/credentials/auto-apply/auto-retry. Packet đầu bị local preparation cap55.000chars chặn trước task/request/HTTP/model call; packet hợp lệ dùng4 complete sources + partial wiring. Ba cảnh báo được đối chiếu source, không là runtime proof. Parent bổ sung independent declared grip/constraint witness và assertion tamper sau freeze; review không chứng nhận final toàn patch. Record: `reviews/source-interactions-source-review-v1.json`, `reviews/source-interactions-source-record-v1.json`, `reviews/source-interactions-static-record-v1.json`.

## Môi trường và lệnh giao model test

Source mới ở C worktree. D checkout read-only; Studio8850 không tự dùng source mới. Node≥22.13 (máy24.19), dependencies dự án; full flow cần FFmpeg/FFprobe/model/voice/ASR config. API key chỉ qua env/file riêng, không đưa vào chat/log/commit. **Các lệnh test/server sau chưa chạy bởi implementation agent:**

~~~powershell
Set-Location -LiteralPath 'C:/Users/Duongvh-pc/.codex/worktrees/stickman-acting-v22/Story-2-video-factory2.1'
git rev-parse HEAD
node --experimental-test-module-mocks --import tsx --test --test-concurrency=1 tests/source-interactions.test.ts tests/source-prop-binding.test.ts tests/source-world.test.ts tests/source-manipulation-actions.test.ts tests/story-acting-coverage.test.ts tests/physical-performance.test.ts
$env:STUDIO_PORT='8861'
$env:STUDIO_PROJECTS_ROOT='C:/Users/Duongvh-pc/.codex/worktrees/stickman-acting-v22/Story-2-video-factory2.1/runtime/source-interactions-studio-projects'
npm run studio
~~~

Mở `http://127.0.0.1:8861/`, Ctrl+C dừng. Không copy/reset/merge vào D. Ghi exactSHA và PASS/FAIL/NOT RUN, log/evidence; không fake source approvals để chạy qua guard. Khi fixed operate/API/source production contract hoàn tất, dựng canonical nhiều người/vật với camera trước/đúng/sau contact, carry/place/drop/flight/landing, phase/state/flow/world và primary swaps. So actual original contact/center với video normal-speed60fps, random/reverse seeks, actor gaze/identity/cloth/limbs/màu; sửa source sibling/cue/art làm visual cache invalidate và giữ audio khi chỉ đổi hình. Full story/script/WAV/voice/subtitles/QC chạy riêng.

Toàn goal vẫn active và chưa hoàn thành/nghiệm thu. Bước tiếp theo là fixed operate geometry + API continuity theo từng người, rồi các nghĩa vụ còn lại của toàn luồng.
