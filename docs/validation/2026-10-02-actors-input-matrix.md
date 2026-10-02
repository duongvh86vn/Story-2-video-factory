# Matrix đầu vào trong chế độ diễn viên

Audit độc lập ngày02/10/2026, 15:02–15:19 UTC, snapshot HEAD031325f với diff ingest/acceptance được ghi hash trước chạy. Không dùng kết quả matrix presenter trước đó để chứng nhận actors. Mỗi kiểu tạo hình chạy đúng một lượt tám ca với Piper thật `vi_VN-vais1000-medium`, ASR cached `small`, alignment cached `nguyenvulebinh/wav2vec2-base-vi-vlsp2020`; không download, mock ASR, đổi input/provider/threshold hoặc sửa production trong audit. Creative roles dùng mock/offline, không phải model tự đạo diễn.

| Ca | Người que | Robot | Bằng chứng / giới hạn |
|---|---|---|---|
| Script | PASS | PASS | DONE, audio đo thật, cast đúng kiểu, narration nguyên văn |
| SRT | PASS | PASS | DONE, cue text/clock nguyên vẹn |
| WAV | **FAIL** | **FAIL** | Audio input giữ nguyên, nhưng ASR sai từ; DONE/QC không chứng minh lời đúng |
| WAV+SRT aligned | PASS | PASS | WAV và cue giữ nguyên; alignment thật |
| Mismatch | PASS | PASS | Chặn đúng; không final |
| Script thiếu TTS | PASS | PASS | needs-voice trước TIMED; không final |
| SRT thiếu TTS | PASS | PASS | Nháp có diễn viên; không final/DONE |
| Cue fit thất bại | PASS | PASS | fit-failed; không final/DONE |

Tổng **14/16**, hai command exit1. PASS ca âm tính nghĩa là gate hoạt động. Tám final có cast/actorScene/HTML/rig/profile/performance/export thật, H2641280×720/30fps, AAC, decode và QC kỹ thuật qua; không suy ra đủ chất lượng hình ảnh hoặc nội dung. Primary cast là vai minh họa; voiceover không tự thành thoại.

Nguồn kiểm tra giữ nguyên: `Hơi nước được dẫn đến bình ngưng riêng. Xi-lanh được giữ nóng.` So sánh NFKC/case/punctuation nhưng giữ dấu Việt. Kết quả người que: ` Hơ nước được dẫn đến bình gương riêng xin anh được sự nóng.` Robot: ` Thôi nước được dẫn đến bình cường riêng, riêng được sự nóng.` Cả hai có5 word edits/13 reference words, WER chẩn đoán38.46%. Không thay transcript bằng fixture hoặc nới điều kiện để qua.

Stored MP4 UTF-8 samples/ms clock và SRT xuất riêng giữ nguyên text, được audit bằng offsets/time base độc lập. FFmpeg extracted SRT WAV vẫn biến đổi whitespace đầu; không gọi extracted-SRT PASS. Audio hash/PCM không im lặng cũng không chứng minh ASR đúng.

Lượt metadata cùng snapshot: chín test mới **3PASS/6FAIL**, bốn ingest/script/legacy/recovery contracts cũ **4/4PASS**, test:typecheck0. Sáu lỗi do source.md không khai phong cách vẫn bị parser gán `technical-clean`. Những assertions đứng sau điểm lỗi chưa được chứng nhận. Command filter có dấu nháy Windows đầu tiên chỉ chọn một test thật và hai wrapper rỗng; đã giữ log và chạy direct argv đúng13 tests. Không gọi ba displayed passes ban đầu là bộ nghiệm thu.

Parent sau audit tách `MarkdownDocument.authoredStyle` khỏi legacy renderer fallback, dùng metadata chung cho ba luồng và thêm `narrated-story-2.2.1` vào fingerprint hình; fingerprint narration giữ nguyên. Build qua. Follow-up15:31–15:35UTC **14/14PASS**, test:typecheck0: giữ nguyên13 tests/assertions cũ và thêm một ca resume. Chín metadata tests ban đầu là prefix byte-identical; sáu lỗi style đã qua. Resume refresh ANALYZED story/roles/style, không gọi TTS lại, giữ bytes narration/voiced-narration/audio/script/source và narration fingerprint; INGESTED/TIMED chỉ chạy một lần, ANALYZED hai lần. Một selected invocation, không retry/fullsuite. Không thay lịch sử FAIL hoặc tuyên bố hai matrix cũ đã chạy lại trên bản sửa này.

Follow-up report `independent-actor-metadata-followup.md`, evidence `actor-metadata-followup-evidence-20261002-152825`: runtime cutoff15:33:25, report15:35:53.593 trongbound15:36:25. Production TS/config/PS không drift; sáu MD drift được phép ghi riêng.27 observed owned identities terminal/no kills. SHA tests `68e8efb774f1cb206d95d12ad6c10df3fef08590b81c0822966aab6bb055627b`, markdown parser `e39e236252d24ea12a7b14d9955b4d6ed80da43b3c76a9da0532e61fdcb7cc3c`, narrated-story `1038d88c7ecfebc1acb731d55c4610ecd0fba691e5d66eece8501034d58cb7a0`, pipeline `9b29fd444cab3ad45451495ef29a7354a71c71f05e35c6c8464e5b358fe59d77`.

Các thư mục chạy: `temp/acceptance-v22/run-1790953355554` (người que), `run-1790953618394` (robot). Report gốc `independent-actors-input-matrix-current.md`; evidence `actors-input-current-evidence-20261002-145725` ở task-state ngoài repo. Source before/after293files/177TS không drift;717+18+8 observed owned process identities terminal, không kill; report trong25phút. D runtime/cache chỉ được mượn đọc, không ghi project người dùng.

Chưa chạy: suite đầy đủ mới, cài đặt sạch, native/autonomous creative generation, hai bài đầy đủ/hai kiểu tạo hình, nghe/xem toàn phim và nghiệm thu thẩm mỹ. Chất lượng ASR Việt còn mở.
