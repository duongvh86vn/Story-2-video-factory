# Matrix hai rig trên snapshot performance-2.2.7

Model độc lập Descartes chạy đúng `npm.cmd run test:cinematic-inputs --` và biến thể `--robot`, một lần mỗi host, 09:19:22–09:33:05 UTC ngày 02/10/2026. Snapshot runtime `b7f94e6`, MD-only delivery `523b38d`. Piper Việt, ASR small CPU/int8 và alignment cache thật, creative offline/mock, HyperFrames 0.8.96. Không đổi runtime hoặc assertions khi chạy.

Hai lệnh exit0; 16/16 kiểm tra kỹ thuật và tám final decode/30fps/audio/QC qua. Các ca mismatch, no-TTS và fit-failed PASS có nghĩa là chặn final đúng. Nghiệm thu yêu cầu vẫn **FAIL**:

- Script acceptance gán presentation chỉ có mode, làm mất `character_mode: actors`; config mặc định legacy presenter. Tất cả positive casts rỗng, không có actorScene. Actors matrix **NOT RUN**.
- WAV transcript của cả hai rig sai nhiều từ so với fixture Việt; ASR wording **FAIL**.
- SRT trong final WAV mất khoảng trắng đầu cue; strict embedded text **FAIL**. Nội dung SRT gốc/cue clock vẫn là các kiểm tra riêng, không được nhập chung để giấu lỗi.

276 source/config files không đổi ở capture 09:33:42 UTC. 664 owned process instances được đối chiếu PID + creation time đều terminal; không kill process không sở hữu. Đây là lời kể Việt rất ngắn, không phải bài hoàn chỉnh hoặc chất lượng hình ảnh/đạo diễn được duyệt. Không kiểm tra EN/JA/KO, live native model, hai bài đầy đủ, cài đặt sạch hoặc trải nghiệm người dùng.

Evidence máy phát triển: `C:/Users/Duongvh-pc/.codex/task-state/story-video-v22/independent-actors-input-matrix-v227.md`; raw logs/manifests/process identities trong `actors-input-matrix-evidence-20261002-091621-v227`. File này giữ kết luận và phạm vi portable, không biến đường dẫn máy thành chứng nhận người đọc có thể tái hiện mọi output.
