# Chạy ca hai diễn viên ngồi–đứng–đi

Source0.57 mở rộng native-head opt-in: `--staging lila-left|lila-right`, `--acting rest|listening-think`, cùng source-owned hand clocks qua camera. [Lệnh và nghiệm thu0.57](NATIVE-DIALOGUE-ACTING.md). Legacy tracer2/default giữ nguyên; runtime chưa chạy.

Source0.56 thêm flag opt-in `--native-heads` cho bank3 Lila phải/Karo trái, cùng body/cast/camera/exporter bên dưới. Mặc định tracer2 giữ nguyên. [Phạm vi, môi trường, lệnh model test và giới hạn](NATIVE-HEAD-DIALOGUE.md). Runtime/video mới chưa chạy.

Hiện hành0.44/tracer2: cùng canonical bên dưới có **mutual actor gaze** theo original physical eye source; không dùng static root hoặc gaze feedback. [Contract, source guards và nghiệm thu gaze](NATIVE-ACTOR-GAZE-HANDOFF.md). Clock4/body compiler32, target/body/expression thay đổi phải invalidate publication. Chưa chạy builder/test/tracer/media. Phần mô tả0.43 bên dưới là lịch sử exporter, các lệnh vẫn dùng cho tracer2.

Mốc source0.43: tool xuất ca canonical dùng chung với `tests/native-source-seat.test.ts`, không bootstrap project máy móc hoặc gọi model. Implementation **chưa chạy** builder, tracer, test, trình duyệt, frame, FFmpeg hoặc render video. Source/typecheck thành công không chứng minh chuyển động đẹp, đúng giải phẫu hoặc giống video mẫu. Cả chủ đề vẫn `productionReady=false`, `productionRig=null`.

Ca7.2 giây dùng Lila ở góc3/4 hướng phải, Karo ở góc3/4 hướng trái, hai ghế riêng trong cùng world,5 camera slice và thay primary/supporting. Ngồi300–1800ms, giữ đến3000ms, đứng3000–4500ms, đi4600–6600ms; phần cuối giữ pose. Mọi shot lặp nguyên source run. Các nhân vật diễn trong câu chuyện, không có presenter hoặc mô hình giải thích máy móc. Đây là ca đo cơ thể/trang phục/camera, chưa là một câu chuyện hoàn chỉnh hay mẫu mặc định cho tool tổng quát.

## Môi trường

Windows, Node>=22.13 (source build dùng24.19), `npm ci` nếu checkout chưa có dependencies. Repo khóa HyperFrames0.8.96; GSAP được lấy từ dependency local. `--frames`/`--validate`/`--render` cần môi trường Chromium của HyperFrames; `--render` cần FFmpeg/FFprobe trong PATH hoặc biến `FFMPEG_PATH`, `FFPROBE_PATH`. Tool không tự cài, tải model, dùng9router, gọi TTS/ASR hoặc cần API tạo chuyển động từ ảnh.

Chạy trong worktree được triển khai; không chép vào checkout `D:/github/Story-2-video-factory2.1` khi có thay đổi chưa commit. Không cần khởi động server để xuất tracer. Lệnh này tạo thư mục mới dưới `runtime/prehistoric-life/native-seat-tracers/tracer-<time>-<uuid>`; không nhận `--output`, không ghi đè project8850 và không dừng server nào.

## Model test thực hiện

Các lệnh dưới là hướng dẫn **NOT RUN**, dành cho model test của người dùng:

```powershell
Set-Location -LiteralPath 'C:/Users/Duongvh-pc/.codex/worktrees/stickman-acting-v22/Story-2-video-factory2.1'
git rev-parse HEAD
git status --short
node --experimental-test-module-mocks --import tsx --test --test-concurrency=1 tests/actor-gaze.test.ts tests/scene-baked-path.test.ts tests/native-seat-tracer.test.ts tests/native-source-seat.test.ts
npm run tracer:native-seat -- --validate --frames --render
```

Lệnh cuối compile native scene, áp dụng security/cap2MB, stage tài nguyên đúng hash, tạo master/phụ đề, chạy HyperFrames lint/check trước ảnh/video, chụp mốc support/camera/cuff, render **draft60fps1280×720** và kiểm probe/decode. Mỗi lần chạy xuất một root khác. Bản mặc định **im lặng**, mouth activity rỗng; title/master ghi SILENT DRAFT / UNAPPROVED. Clock là cue SRT diagnostic, không giả làm timing từ TTS kịch bản. Không sinh `final.mp4`, không ghi `DONE`, không duyệt art hoặc thay gate sản xuất.

Nếu chỉ cần nguồn scene/master, `npm run tracer:native-seat` bỏ browser/media; lệnh này **vẫn gọi builder/camera/compiler**, implementation không được chạy trong phạm vi test đã giao model khác. `--frames` và `--render` tự yêu cầu lint/check, không cần thêm `--validate`.

WAV tùy chọn dành cho kiểm activity/audio của ca này:

```powershell
npm run tracer:native-seat -- --validate --frames --render --wav 'C:/input/native-seat-diagnostic.wav'
```

WAV phải là một audio stream, không có video, dài7200ms trong sai số một frame60fps. Tool giữ nguyên bytes, từ chối mismatch, không fit/cắt/sinh giọng hoặc viết lại cue. Speech activity dùng RMS audio thật, không phoneme lip-sync. Sự khớp **nội dung và speaker** WAV với hai cue vẫn phải kiểm riêng; WAV bất kỳ cùng thời lượng không đủ để nghiệm thu. Lệnh này không thay bộ nghiệm thu ba input hoặc việc tự sinh narration clock thật.

## Artifact và cách đọc kết quả

Root được in dưới dạng JSON khi thành công; khi lỗi root đã tạo được giữ lại và in ở stderr. Xem:

- `tracer-report.json`: scope/sourceSHA/trackedSourceDirty, phase và lỗi, từng check PASS/FAIL/NOT RUN, byte cap, compile time, camera endpoints và clock mỗi actor. Status `exported` chỉ có nghĩa công cụ xuất xong các bước được yêu cầu. `productionAcceptance`, `motionAccepted`, `finalExportAllowed`, `phonemeLipSync` luôn false. Nếu source bẩn, SHA của commit không bao trùm thay đổi hiện có; phải ghi lại diff/source trước khi coi kết quả tái lập được.
- `work/storyboard.json`, `beats.json`, `narration.json`, `speech-activity.json`, `host-profile.json`, `host-rig.json`: contract dùng để dựng ca; hai cue và source supports/tracks phải giữ nguyên qua mọi slice.
- `work/scene-reports/*.json`: performance report, publication binding, camera, scene byte count và errors. Nếu vượt2MB phải sửa representation, không nâng cap.
- `scenes/index.html`: master và sub-compositions; GSAP/native PNG được copy nguyên bytes. `work/rig-resource-manifest.json` ghi file/path/hash. Không mở master bằng double click rồi suy ra đồng bộ đạt; dùng snapshot/render pipeline.
- `previews/index.html`, `previews/manifest.json`, `previews/at-*.png`: ảnh thật từ master; không thay PNG reference, không chỉnh màu/crop ảnh để giấu lỗi. Capture hiện sắp tăng thời gian; chưa chứng minh seek ngược/ngẫu nhiên.
- `output/native-seat-draft.mp4`, `native-seat-draft.srt`, `work/hyperframes-validation.json`, `video-probe.json`, `work/logs`: video nháp, phụ đề và diagnostics thực tế. Có ảnh/MP4 không chứng minh toàn sản phẩm đạt.

Ghi raw stdout/stderr, exit code, SHA/diff, root, version môi trường và PASS/FAIL/NOT RUN cho từng hạng mục. Mở **video ở tốc độ thật** và so với primary reference của người dùng: warm skin, tóc/râu, một váy Lila/hai ống Karo có viền, soft slim limbs, mặt/eyes/mouth/neck không trôi, chân trụ không trượt, hip contact không bật/teleport, tay/gối đúng chiều, layer/seat/camera không che phụ đề. So compiler whole-run/slices với normal/reverse/random seek, đo seek cost, memory và scene cap. Những check này vẫn NOT RUN cho đến khi model test cung cấp bằng chứng.

## Studio riêng khi cần xem pose

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/start-studio.ps1 -Port 8851 -ProjectsRoot 'C:/Users/Duongvh-pc/.codex/worktrees/stickman-acting-v22/Story-2-video-factory2.1/projects-native-seat-test'
```

Giữ terminal mở; Ctrl+C dừng server vừa chạy. Mở [pose hai actor](http://127.0.0.1:8851/api/topics/prehistoric-life/body?action=sit-walk-right&timeMs=2500&mood=happy&view=three-quarter-right&motion=registered-locomotion-v1&seat=registered-seated-v1). Workbench là diagnostic một pose, không là chứng cứ video mượt. Đổi action/view đúng hướng để xem góc trái; chuyển góc liên tục/new grip chưa được tool này chứng minh.

## Công việc sản phẩm còn lại

Chạy test/media thật và sửa lỗi được báo; nghiệm thu identity/gaze/expressions/anatomy/motion với ảnh/video gốc; đăng ký và kiểm các view/turns/tools/grasp/handoff cần cho câu chuyện; dựng world ngày/hoàng hôn/đêm có màu đúng. Sau đó mới đủ điều kiện nối production rig cho chủ đề, full script nguyên văn/WAV giữ giọng/story→script, EN chính/VI/JA/KO/external TTS, resume/locks/rebuild, review/repair và final audio/subtitle/QC. Tracer không thu hẹp mục tiêu này và không thay cho kịch bản người dùng đưa sau.
