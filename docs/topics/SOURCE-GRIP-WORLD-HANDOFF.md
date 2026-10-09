# Grip gốc và world geometry — source0.72

Mục tiêu đầy đủ vẫn là tool câu chuyện/kịch bản/WAV → diễn viên trong câu chuyện → video có giọng, phụ đề và QC, EN chính cùng VI/JA/KO, external/local TTS và resume/locks. Hai nhân vật trong fixture là dữ liệu kỹ thuật, không giới hạn chủ đề người dùng.

## Source đã sửa

- Vật được cầm có thể dùng handle **khai báo riêng trong artwork**; world anchor phải bằng origin/gripOffset vật lý gốc của đúng người và tay. Không ép target về center, đoán handle hoặc kéo xương/tay để hợp target.
- Người và model chung stage/floor thực. Primary/supporting thay đổi không tạo scale/tay/floor khác.
- Helper `source-grip-world-1` dùng chung fixed contact và bound prop: giữ complete original reveal/transform/flow history, camera projection phải đúng. Fixed contact sở hữu hold interval; bound entity sở hữu toàn source physical run, kể cả release/flight/landing.
- World không thêm translate/rotate hoặc implicit flow rotation lên entity đã có physical geometry authority. Rotation ở camera trước vẫn có ảnh hưởng và được kiểm. Passive highlight/pulse/thermal hoặc flow không dịch/xoay cả entity vẫn có thể dùng; control nội bộ không đổi grip world.
- Camera validation trong creative và review có `worldShot` và complete `board`, để đo diễn viên phụ theo actual owner/source run qua primary swaps.
- Source/cache/brief/manifest nhận `source-prop-binding-2`, `forest-tribe-0.72-source-grip-world` và `story-direction-2.2.40`.

Bảy callback mới đã khai báo, **NOT RUN**. Không sửa raw ảnh, khuôn mặt/tóc, viền, màu hoặc costume; nam phụ v2 trọc/không râu, nữ giữ nguyên. Không có renderer/fixture/pose sampler/browser/server/ASR/TTS/audio/video được chạy bởi implementation agent. Source review không phê duyệt hình học hoặc chuyển động.

## Phần vẫn thiếu

Guard `needs-source-prop-binding` chưa gỡ: cần audit toàn integrated source production contract trước khi cân nhắc thay guard. Shared/sequential handoff cùng entity chưa có contract. Own art/pose/head/body turns/garment/environment và toàn script/WAV/story, EN/VI/JA/KO/TTS, resume/rebuild/locks/final/audio/subtitle/QC chưa nghiệm thu. Root `productionReady=false`, `productionRig=null`, `availableBanks=[]` giữ nguyên; không suy từ source pass sang video đạt yêu cầu.

Vai trò đạo diễn và camera riêng được mô tả tại [DIRECTOR-CAMERA-AGENTS.md](DIRECTOR-CAMERA-AGENTS.md), cùng môi trường C worktree, cổng8861, projects root riêng và lệnh giao model test. Các callback hiện hành ở `tests/source-grip-world.test.ts`, `tests/camera-direction.test.ts`; trước đó `tests/source-fixed-operation.test.ts` có11 callbacks cũng chưa chạy. Model test cần kiểm handle sai/mất, foreign grip, stage/floor lệch, hidden/reveal/prior rotation/implicit flow, source span không hợp lệ, camera thiếu complete context và cache/publication invalidation.

Kết quả source/static hiện hành: `reviews/grip-camera-source-record-v1.json`, `reviews/grip-camera-static-record-v1.json`. Source-only agent input/output và phạm vi tại `reviews/grip-camera-review-inputs-v1.json`, `reviews/grip-camera-source-review-v1.json`. SHA publication ở external delivery record tránh self-hash commit.

Sau phần source này tiếp tục integrated source production audit, shared ownership, own actor art/motion/world và nghiệm thu đủ input/voice/resume/finalQC. Toàn mục tiêu còn active, chưa có full-film acceptance mới.
