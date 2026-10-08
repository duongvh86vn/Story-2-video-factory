# Native seat tracer — source record0.43

08/10/2026, `codex/prehistoric-life`, tiếp tục từ `f76b4e4b6995d93a8c073747541faecc0371b8b3`. Chỉ thay worktree `C:/Users/Duongvh-pc/.codex/worktrees/stickman-acting-v22/Story-2-video-factory2.1`; không thay source của checkout D:/github. Goal toàn sản phẩm còn active/unfinished.

## Source giao trong lượt này

Canonical ngồi/giữ/đứng/đi được tách vào `benchmarks/native-seat-tracer.ts`, cùng nguồn cho test và exporter, bỏ phụ thuộc creative fixture/compileHost/model/plot máy móc. Hai actor native independent views, shared world/seats và full sourceBody clock qua5 slice/primary swaps vẫn dùng các guard hiện có. Cue SRT clock7200ms là diagnostic silent draft, không tuyên bố timing kịch bản được đo từ TTS.

`scripts/native-seat-tracer.ts`/`npm run tracer:native-seat` là công cụ opt-in: output root mới trong runtime, exact asset bytes/hash, scene/clock/camera/performance/resource/subtitle reports, security/cap2MB, master; tùy chọn lint/check, snapshots và draft60fps1280×720. WAV phải khớp clock trong một frame, giữ bytes và audio activity RMS; không gọi ASR/TTS/model và chưa kiểm content/speaker alignment. No final/DONE/production approval, status exported không phải nghiệm thu. CLI/fixture/media **chưa chạy**.

Root cause từ đọc source: `nativeSeatState().edgePath()` tạo contour ngoài `M...L...` hở để bỏ đường eo; scene security trước chỉ nhận cubic hoặc polygon kết thúc Z. Native contour hợp lệ sẽ bị guard từ chối. Sửa grammar giới hạn đường hở/đóng2–95 đoạnL, vẫn4096 ký tự và mọi số finite abs<=100000; không mở href/styles/callback/code. Cache dùng `SCENE_SECURITY_VERSION=4`. Đây là source deduction, không có reproduction runtime/PASS.

5 callback bổ sung NOT RUN:2 guard open/closed contour/bounds/resource/code;3 exporter flags/strict scope, stream timing/probe và fresh output preservation.7 callback source-clock cũ vẫn NOT RUN và dùng builder chung; không có callback/fixture/sampler/compiler/tracer/browser/API/TTS/ASR/audio/video được implementation chạy. Hai PNG/geometry identity không sửa. MD/plan/handoff/topic manifest ghi rõ source candidate và công việc còn thiếu.

## Source review độc lập

Halley `01a119e8-1179-7cd1-97c1-a2d25571fac5` thực hiện bounded read-only source review exporter/builder và APIs liên quan, không edit/import/runtime. Tìm lỗi: format.duration có thể do audio7.2s giữ lại dù video chỉ6s; probe/decode có thể báo đạt thiếu đoạn hình cuối. Parent đã yêu cầu video.duration finite khớp7200ms riêng, audio.duration riêng nếu có, container.duration vẫn khớp; thêm declaration cho truncated video/missing timing/short audio. Follow-up xác nhận correction và không thấy source defect trực tiếp từ correction. Đây không là verdict visual/motion/media. Agent được đóng sau follow-up.

## Source/static evidence

- Final `npm run build`: initial6caf3d/session55976, completioncbf9ba exit0. Raw decisive output: `✓ 32 modules transformed.` / `✓ built in 469ms`. Source/Studio compilation, không render scene.
- Final `npm run test:typecheck`: initial9da020/session20366, completionf24e85 exit0. Raw initial: `> story-to-video-factory@2.1.0 test:typecheck` / `> tsc -p tsconfig.tests.json`; completion empty.5 mới/7 cũ chưa chạy callback.
- Static pack fd0346 exit0: `{"references":6,"candidates":12,"headCandidates":6,"garmentCandidates":2,"rejected":7,"productionReady":false}`. `git diff --check` trong cùng handle exit0; CRLF warnings only.
- Hash verification1d6e03 exit0: topic version `forest-tribe-0.43-native-seat-tracer-candidate`, productionReady false/productionRig null; manifest builder SHA256 `c242a51fd4e22687ed58f7bed35fa23871164e1940158fcef4e41e6e48cda914`, exporter `d47a0183fe58bb6b98040b7f23ee403300b6b87044fa5ce97f0177692f31cafc` bằng actual source bytes. PNG Lila `a8d005d62c046044466684bfe1ca59c84608aabc6bbcfa52e6ce67556828ab02`, Karo `411980eb6d11c6d2a31e3419efb4f264ea82d4095b837a90ea210eca88d5eeed` giữ nguyên.
- Node readout d80b43: v24.19.0, local HyperFrames package0.8.96. Existing schema contract không đổi nên không cần sinh schema mới trong lượt này. Không chạy npm test, tracer hoặc server.
- Observation ban đầu write_stdin74482 trả unknown handle; completion cũ không dùng làm evidence. Một read/typecheck dùng default cwd D:/github do store không còn sau continuation; **không dùng kết quả đó để chứng nhận worktree**, không thay source D:/github. Sau đó set explicit workdir; final handles trên đều tại worktree đúng. Discovery missing-file đọc source không là test failure hoặc runtime reproduction.

## Còn phải nghiệm thu

Model test của người dùng chạy [lệnh và quy trình](../NATIVE-SEAT-TRACER.md), ghi raw PASS/FAIL/NOT RUN/exit/log/source/media. Scene byte count/compile/seek cost, camera/subtitle, fixed limbs/planted sole/hip contact, cloth/cuff outline/opaque surface, face/eyes/gaze/colour/identity, whole/slice và random/reverse seek và normal-speed60fps vẫn chưa kiểm. Tracer chỉ đo ca cơ thể; full arbitrary story/ba input/EN-VI-JA-KO/external voice/views/turns/tools/grasp/handoff/world/resume/review/final QC còn mở. Không đánh dấu goal complete hoặc productionReady.

Source/artifact commit ddbad1: `cb445581aeb8847bb6cd006fd38dc7870e73e8d9`,20 owned files, staged path set verified against explicit allowlist. Push51471f exit0 to `origin/codex/prehistoric-life`; exact local/remote comparison b008ff exit0 confirmed the same full SHA and tracked/staged clean. Docs-only publication follow-up does not change source already checked. Mọi nhận định runtime vẫn giữ NOT RUN; no motion/media/production acceptance or goal completion.
