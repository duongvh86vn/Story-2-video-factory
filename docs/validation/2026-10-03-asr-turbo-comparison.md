# So sánh ASR trên các WAV đã giữ nguyên

Model độc lập chạy diagnostic sau khi lượt trước bị usage limit ngắt trước inference. Đã kiểm tra owned handles/receipts/process identities và xác nhận lượt cũ chưa chạy; dùng lại đúng hai WAV Việt của matrix và WAV English David trước đó. Không tái tạo WAV, sửa nguồn/lexicon/transcript, đổi provider/default hoặc nới điều kiện từ.

Candidate `faster-whisper-large-v3-turbo`, repository upstream theo [registry faster-whisper](https://github.com/SYSTRAN/faster-whisper/blob/master/faster_whisper/utils.py), [model card](https://huggingface.co/dropbox-dash/faster-whisper-large-v3-turbo); revision `0a363e9161cbc7ed1431c9597a8ceaf0c4f78fcf`. Parent provision weights riêng trong temp, model.bin SHA256 `e76620f83d5f5b69efd3d87e3dc180c1bd21df9fbebacfd4335e5e1efcc018da`. Verifier không download/install. Runtime CPU/int8, cached local path, beam5/word timestamps/VAD như bridge hiện tại, explicit vi/en, downloadsAllowed=false; mỗi ca đúng một lần.

| Ca | Small đã lưu | Turbo | Word fidelity |
|---|---|---|---|
| Việt / WAV người que |5/13 word edits|4/13 (30.77%)|FAIL|
| Việt / WAV robot |5/13 word edits|5/13 (38.46%)|FAIL|
| English David |NOT RUN baseline small|0/11|PASS|

Reference Việt giữ nguyên `Hơi nước được dẫn đến bình ngưng riêng. Xi-lanh được giữ nóng.` Turbo trả người que ` Hơi nước được dẫn đến bình ngừng riêng, xin anh được sự nóng.`; robot ` Hơ nước được dẫn đến bình luận riêng, riêng được sự nóng.` NFKC/case/punctuation normalization giữ dấu Việt; không bỏ dấu để làm PASS.

Reference English giữ nguyên `Steam carries heat to a separate condenser. The cylinder stays hot.` Turbo nhận đúng normalized11words; hai segment/raw spacing giữ trong evidence. Một sample này không chứng minh độ chính xác tiếng Anh nói chung hoặc full-video narration.

Ba command exit0 và timestamp/PCM-clock checks3/3PASS; thời gian gồm model load20.19s/15.776s/16.332s. Word mismatch vẫn FAIL dù bridge chạy thành công. Hai WAV Việt khoảng2.5s, English5.323s; không phải benchmark toàn bài. ASR text không tự phân biệt lỗi nhận dạng với phát âm của audio Piper đã có. Rail samples không chứng minh audible clipping. Chưa có human listening mới; cả hai giả thuyết còn mở. Candidate không giải quyết yêu cầu Việt, mặc định hệ thống giữ nguyên; matrix14/16 cũ không được nâng thành PASS.

Report `independent-asr-turbo-comparison.md`, evidence `asr-turbo-evidence-20261002-183509` ngoài repo. Source a292794 before/after,177TS và runtime/config không drift; input/model/interpreter hashes giữ.12 observed owned identities và tất cả tool/watchdog handles terminal, không kill/duplicate; report18:48:46.702UTC trongbound18:55:09, freeze release18:49:55. Raw text/word probabilities/clock/PCM/argv và lịch sử FAIL giữ đầy đủ. Không render video, forced-align, fullsuite, cài đặt hoặc đổi default trong diagnostic.
