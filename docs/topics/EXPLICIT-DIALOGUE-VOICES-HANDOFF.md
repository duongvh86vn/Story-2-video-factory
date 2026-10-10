# Phân vai thoại và giọng từng diễn viên — source0.89

`forest-tribe-0.89-explicit-dialogue-voices`, producer `story-direction-2.2.52`, parser `script-3`. Source candidate; **runtime, tạo hình, diễn xuất và toàn tool chưa nghiệm thu**. Mục tiêu vẫn là câu chuyện/chủ đề bất kỳ → kịch bản → diễn viên trong truyện → video; các ví dụ máy móc/săn bắn không giới hạn sản phẩm.

## Contract đã viết

- `input.script_format` tùy chọn: narration mặc định, dialogue chỉ khi người dùng chọn. Narration đọc nguyên văn cả chuỗi giống nhãn vai. Dialogue hỗ trợ `[speaker-id] lời nói`; không tự suy vai từ dấu hai chấm hoặc tên model. Nhãn không đọc; bản gốc/hash/source line span vẫn lưu.
- Một nhãn mở một lượt; dòng liền không nhãn tiếp tục lượt đó. Dòng trống kết thúc lượt, dòng tiếp theo phải có nhãn. Markdown vẫn chỉ là văn bản/định dạng. Chunk tối đa120 code points, không cắt giữa từ, giữ thứ tự/nhân vật/paragraph. Document validation chặn speaker chunk khác nguồn lượt.
- `voice.speaker_voices: [{speaker_id,voice_id}]` khóa giọng từng vai. Tất cả dùng cùng provider/ngôn ngữ/options đã chọn; chưa có provider riêng cho từng vai. `narrator` có thể dùng giọng chung. Vai diễn thiếu mapping báo needs-voice trước mọi provider request. Không tự dùng giọng chung thay vai thiếu. Cần giọng thực sự hỗ trợ ngôn ngữ EN/VI/JA/KO; không khẳng định tên giọng ví dụ đã được cài.
- Audio từng chunk có thời lượng đo thật;250ms giữa các lượt/đoạn; narration/timing/voice report giữ speakerId và giọng thực tế từng cue. report.voiceId là giọng chung, speakerVoices/cues.voiceId là nguồn đúng khi video nhiều giọng. Speech activity là RMS/segment, không phải phoneme lip-sync.
- Cue speakerId là nguồn có thẩm quyền: actor có cùng ID đang trong shot phải nhận cue chồng thời gian, vai khác không được nhận. narrator không gán cho miệng diễn viên. Người nói ngoài khung hình có thể không có mouth owner. Qua cut giữ nguyên cue/ID; chưa đoán diarization cho WAV.
- Marker nguồn được dùng làm tên đúng ID (cho phép viết hoa hiển thị) của fictional/illustrative actor khi có sourceRef tới chính cue đó; không buộc thêm tên vào lời đọc. Không dùng marker để chứng minh historical identity/biography/vai/hành động. Role/action/objective giữ whole source statements và negation như cũ. Explanation contract2.2.7; các prompt phân tích/cast/director truyền nguyên source speaker ID.
- TTS cache theo từng cue/text/provider/voice/language/options; đổi một giọng tạo lại audio cue bị ảnh hưởng và clock phụ thuộc. Format đổi invalidate narration. Đổi voice không phát sinh yêu cầu viết lại accepted story; story cache và kết quả mới dùng chung kiểm format/kind. Đổi appearance không đổi vai nguồn. WAV/SRT gốc giữ contract cũ; không bị ép sang TTS/nhãn thoại.
- Studio có chọn spoken format, preview từng vai và nhập mapping. API preview/PUT script/upload nhận scriptFormat; settings nhận input.script_format. CLI script nhận --spoken-format dialogue. Upload script dùng query scriptFormat; sửa artifact dùng format đã lưu.

## Ví dụ cấu hình — chỉ thay tên giọng bằng ID thật của provider

`input/script.txt`:

```text
[lila] Is the soup ready?
[karo] Almost! Keep the fire small.
[narrator] They wait beside the pot.
```

Ghép vào project.yaml hiện có, giữ provider/endpoint/API key đã cấu hình:

```yaml
input:
  mode: script
  script: input/script.txt
  script_format: dialogue
project:
  language: en
voice:
  voice_id: REPLACE_WITH_NARRATOR_VOICE_ID
  speaker_voices:
    - speaker_id: lila
      voice_id: REPLACE_WITH_LILA_VOICE_ID
    - speaker_id: karo
      voice_id: REPLACE_WITH_KARO_VOICE_ID
```

Với câu chuyện→kịch bản: chọn dialogue trước khi viết; role IDs đã chấp nhận không tự đổi theo mapping mới. Xem preview rồi bổ sung giọng cho vai còn thiếu. Mỗi ID phải là diễn viên được nguồn truyện hỗ trợ; narrator không dùng làm actor ID. Plain narration/WAV không suy rằng từng câu là lời Lila/Karo.

## Review nguồn qua 9router

Combo tester gọi được: HTTP200, model trả về gpt-6-luna. Review snapshot4module mất9045ms,7613tokens; không chạy source/test/audio/video. Hai lỗi được nêu: blank line vẫn kế thừa speaker và cache-hit bỏ qua format/kind. Đã sửa reset speaker ở flush và dùng parseGeneratedScript chung. Record có hash snapshot và disposition; agent chưa review lại final integration. Gọi được combo không đồng nghĩa đã chạy bộ test.

## Môi trường và lệnh dành riêng cho model test

Windows PowerShell, Node>=22.13, dependencies từ package-lock, FFmpeg/ffprobe cho ca audio; giọng/provider/API key hỗ trợ ngôn ngữ nếu chạy thật. Chỉ ghi key qua env/.env, không ghi vào báo cáo/Git. C worktree riêng; D checkout và server8850 được bảo vệ.

Các lệnh runtime sau **DECLARED / NOT RUN bởi implementation**:

```powershell
Set-Location -LiteralPath 'C:/Users/Duongvh-pc/.codex/worktrees/stickman-acting-v22/Story-2-video-factory2.1'
git rev-parse HEAD
npm run build
npm run test:typecheck
node --experimental-test-module-mocks --import tsx --test --test-concurrency=1 tests/dialogue-input.test.ts tests/multilingual.test.ts
```

9 callbacks mới dialogue-input và1 callback HTTP TTS/cache trong multilingual: tất cả NOT RUN. Callback HTTP dùng local stub trả PCM400ms; không chứng nhận chất lượng giọng thật/diễn xuất. Model test cần thêm API/Studio/upload/CLI và pipeline integration thực. Không execute callback/fixture/compiler/renderer/browser/server/TTS/ASR/media từ agent implementation.

Model test chỉ mở server riêng khi xác nhận8851 trống, projects root là thư mục test riêng; giữ env file hợp lệ:

```powershell
$env:STUDIO_PORT='8851'
$env:STUDIO_PROJECTS_ROOT='C:/Users/Duongvh-pc/.codex/tmp/story-factory-dialogue-tests'
npm run studio
```

Đường khởi động không thay đổi server8850. Source prehistoric còn productionReady=false nên pipeline chủ đề này vẫn phải dừng tại gate, dù provider đã có giọng. Không tắt gate để lấy video DONE.

## Bộ nghiệm thu còn thiếu cho toàn sản phẩm

| Yêu cầu | Source hiện có | Cần bằng chứng thực |
|---|---|---|
| Ba input và legacy SRT | ingest/script/story/voice/adapters/Studio/API/CLI | Ba chuyện mới tới final; WAV giữ bytes/clock, SRT giữ text/clock và mismatch chặn |
| Giọng nhiều vai/EN chính/VI/JA/KO/local TTS | explicit source roles/voice mapping/cache/reports | HTTP/command/Windows/provider thật, đổi giọng/cache, lỗi thiếu giọng/fit không final |
| Lila/Karo đúng mẫu và quần chúng | source art/hash/candidates; nam phụ trọc không râu, nữ giữ nguyên | Faces/eyes/nose/mouth/neck/hair/costume/viền;7views và chuyển hướng liên tục; không warp/mirror/mượn mặt |
| Chuyển động/cảm xúc | source clocks/gestures/locomotion/seating/contact candidates | Tay chân mềm và hợp lý, chân trụ/weight/contact, partner gaze; cut/random/reverse/60fps; normal-speed film đạt mẫu |
| Đạo cụ/diễn viên phụ/camera | source world/ownership/projection/overlays/review/repair candidates | Grasp/handoff/reaction/occlusion/role swaps và góc quay thực, không slideshow hoặc cố định dẫn chuyện |
| Bối cảnh/màu | palette/reference và nguồn world candidate | Vivid day/sunset/night, depth/light/shadow/contact; không nhợt nhạt |
| Resume/locks/review/repair/final/QC | source hashes/cache/validators/lock/export WIP | Sửa nội dung/voice/actor/shot invalidate đúng; final có audio/SRT/thumbnail/storyboard/profile/timeline/manifest/QC |

Giữ productionReady=false, productionRig=null, availableBanks=[] và mọi art/motion/production approval false. **needs-source-prop-binding không được gỡ riêng lẻ.** Schema/build/static hash không nghiệm thu hình/animation/video. TEST-RESULTS.md V1 không chứng nhận nguồn này. Ghi full SHA, command/exit/stdout, failures và NOT RUN cùng ảnh/video vào báo cáo mới. Tiếp tục native art/acting/turns/environment và production audit sau khi bàn giao voice source; mục tiêu toàn tool vẫn chưa hoàn thành.
