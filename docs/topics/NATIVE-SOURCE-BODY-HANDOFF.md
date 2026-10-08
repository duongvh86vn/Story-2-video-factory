# Lila/Karo — chuyển động gốc xuyên các cảnh

Mốc source0.38. Phần tiếp0.39 bổ sung [tóc/râu theo original head history](NATIVE-SECONDARY-MOTION-HANDOFF.md); sourceBody và các giới hạn physical/source/final ở tài liệu này vẫn áp dụng. Cả hai mốc chưa runtime/video acceptance.

Source0.38,08/10/2026; base `1ac765e2f0e297c823cf0618dbe629eb934b9785`, branch codex/prehistoric-life. Source commit `0a7c2fb2cea20f77d0f5af67cf73b81557096976` đã push và đối chiếu khớp SHA trên GitHub. Build/typecheck/schema export qua; review mã nguồn có phạm vi đã qua sau khi sửa hai P2. Bằng chứng ở [record](reviews/native-source-body-source-review-v1.md). Đây là code ứng viên, chưa có playback/video được nghiệm thu.28 callback mới NOT RUN; test runtime tiếp tục giao model của người dùng.

## Thay đổi

Lila/Karo có thể giữ **một động tác gốc** trong nhiều shot cùng một run continuous, với cùng actor/view/stage/root/scale. Camera có thể đổi framing hoặc primary/supporting mà không chia lại đường đi, đếm bước hoặc pha nhảy. Hai view trái/phải vẫn là artwork độc lập; đổi camera không có nghĩa đã hỗ trợ nhân vật quay thân hoặc chuyển artwork giữa hai view.

Trước0.38, native walk/run/jump/posture bắt buộc ở một shot. Bây giờ có optional `performance.sourceBody`; bản đầy đủ được khai báo giống hệt trên **mọi** shot của run. Các track thường trong từng shot vẫn được hỗ trợ; chúng không tự trở thành source track vì cùng ID hoặc cùng tên động tác.

Ví dụ chỉ là phần contract để ghép vào performance đầy đủ của actor đã chọn `appearance.bodyMotion='registered-locomotion-v1'`:

```json
{
  "walks": [],
  "sourceBody": {
    "version": "native-source-body-1",
    "id": "original-approach",
    "startMs": 1000,
    "endMs": 5000,
    "walks": [{"startMs": 300, "endMs": 3600, "fromX": 380, "toX": 425}]
  }
}
```

Source start/end dùng clock narration-global; inner walks/jumps/postures dùng thời gian tương đối với source start, nên ví dụ đi từ1300 đến4600 trên clock video. Mỗi shot giữ nguyên original root.x=380, cùng ground/stage/scale/profile/native view; durationMs là độ dài shot. `continuity.entry/exit` là vị trí trên đường gốc tại đầu/cuối shot, không phải luôn380/425. `bodyRootAt(plan,shot.startMs,localTime)` cung cấp cùng cubic như evaluator. `bodyTrackOffsetMs` và `sourceBodyPlan` phục vụ consumer chung; không sinh time/voice mới.

Khi có sourceBody, local walks/jumps/postures phải rỗng và không có local entryPosture; không chồng supports/props/spears/lunge/body/head turns. Source có thể có jumps/postures/entryPosture đã hỗ trợ, nhưng full track vẫn qua validator hiện có: khoảng chuẩn bị/bay/tiếp đất, tốc độ/quãng đường, đúng chiều native view, đứng trước locomotion, độ dài xương và phạm vi hình học. Mọi shot phải phủ đúng toàn source run, liên tiếp, không gap/duplicate và cùng source definition. Thay một sibling, thiếu declaration, hidden primary, source vượt run hoặc dùng cut để cắt source đều báo lỗi.

## Consumer dùng cùng clock

- Evaluator đọc toàn root path, step/contact/run schedule, airborne và posture ở thời gian gốc; không tạo cycle mới từ hai endpoint của camera slice. Tay chạy và reference vào point/think cũng đọc original body entry. Vạt áo giữ lag90ms trước camera cut, chỉ clamp ở đầu run.
- Compiler đưa original step/keypose/takeoff/apex/landing/posture và thời điểm lag về clock shot để bake/refine; limit0.2px và scene cap giữ nguyên. Body compiler28, SVG14/head15 không đổi. Report ghi source/track hash, motionVerified=false/audioVerified=false/approved=false.
- Camera và comparison readability nhận original context của từng actor, kể cả supporting khi validate đệ quy. Bound chỉ sample trong shot nhưng giữ phase gốc; source context thiếu thì chặn. Close crop/viewport/subtitle/model/target guards giữ nguyên.
- Cast continuity kiểm đầy đủ run; primary chỉ là vai trò camera. Creative metadata ghi actual slice entry/exit. Sourced walk/run/posture đọc original track; jump vẫn yêu cầu takeoff+landing nằm trong clock nguyên văn của statement và actor xuất hiện xuyên full bound run.
- Fragment diagnostics và artwork repair dùng full sourceBoard với candidate được thay vào; không chấp nhận scene đơn lẻ bằng context cũ. sourceBody là fixedMotionField trong bounded reaction repair. Canonical source/cache/repair publication hash chứa mọi physical track, kể cả phần ngoài shot hiện tại. Narration/audio không đổi.
- Review key times gồm phần motion nằm trong slice và apex/landing thật. Schema host/Shot/Storyboard/API/CLI có cùng optional performance field; `body-source.schema.json` và view acting clock3 được export từ Zod.

Không đổi ảnh nguồn, anatomy registration, màu, rig approval hoặc TTS. Static cloth figures0.37 tiếp tục là tài liệu tác giả tại góc đặt trực tiếp, không là bằng chứng motion0.38.

## Kiểm chứng dành cho model test

Môi trường: Windows, Node>=22.13 (controller24.19), dependencies npm đã cài, TypeScript/Zod/GSAP/HyperFrames/SVG/Sharp. Mốc này không gọi 9router/model/TTS/ASR và không khởi động/restart server8850/8851. Không cần API image-to-video.

```powershell
Set-Location -LiteralPath 'C:/Users/Duongvh-pc/.codex/worktrees/stickman-acting-v22/Story-2-video-factory2.1'
git rev-parse HEAD
node --experimental-test-module-mocks --import tsx --test --test-concurrency=1 tests/view-source-body.test.ts tests/native-source-body.test.ts tests/native-locomotion.test.ts tests/view-cloth-geometry.test.ts tests/native-source-gesture.test.ts tests/continuous-view-attention.test.ts tests/native-expressions.test.ts tests/source-speech-phase.test.ts tests/artwork-repair.test.ts
```

16 declarations binding/root thuần và12 integration mới. Integration kiểm cả actor/view, scale .75/1/1.25, random/reverse seek, whole vs sliced body/face/cloth, run flight/arms, jump takeoff/apex/landing, crouch recovery, source think trên body đang chạy, missing/stale/hidden/cut/sibling source, canonical/cache/repair, camera/apex seeds, role swap, complete renderer/resources/security và actual sourced movement clock. Fixture cũ có diagram kỹ thuật chỉ để kiểm contract, không quyết định nội dung tool thành phim máy móc. Tất cả callback và helper vẫn NOT RUN bởi controller/agents.

Model test cần ghi full SHA và raw PASS/FAIL/NOT RUN; không dùng build hay phiên bản test cũ để suy PASS mới. Sau test source, kiểm ảnh thật và video60fps: stance sole không trượt, knee/elbow không lật/gãy, đúng độ dài/branch, tay chạy không restart, Karo có đủ viền hai ống, mesh/belt không hở/chồng/sáng seam, miệng đúng actor/activity và partner gaze, ảnh tại hai phía cut cùng world state. Kiểm camera push/pull/primary swaps và mọi source event boundary; đo compile time/RAM/scene bytes/FPS, không nới cap hoặc bỏ guard để nhận PASS. Đổi content/voice/host, sửa sibling, cache/resume/rebuild/repair phải invalidate đúng phần.

Studio để model test kiểm project canonical:

```powershell
Set-Location -LiteralPath 'C:/Users/Duongvh-pc/.codex/worktrees/stickman-acting-v22/Story-2-video-factory2.1'
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/start-studio.ps1 -Port 8851 -ProjectsRoot 'C:/Users/Duongvh-pc/.codex/worktrees/stickman-acting-v22/Story-2-video-factory2.1/projects-native-source-body-test'
```

Giữ terminal mở, truy cập http://127.0.0.1:8851/; Ctrl+C dừng server. Launcher không dừng server khác nếu cổng bận. Trang body calibration vẫn là một pose/shot diagnostic; kiểm sourceBody qua canonical storyboard/project có đủ mọi camera slice. Đây không phải nút bypass artwork/final gate hoặc video đã đạt mẫu.

## Phần còn phải hoàn thiện

productionReady=false/productionRig=null. Native mặt/skin/brow/miệng Karo, source identity, soft limbs/pose/cloth/ink, accepted turns/profile/rear/inbetweens, tóc/râu, native seating, grasp/carry/props/contact, bối cảnh nhiều lớp/màu sống động và quality/performance playback còn chờ sửa/duyệt/test. Tool vẫn phải hoàn tất ba input script nguyên văn/WAV giữ audio-clock/câu chuyện→kịch bản trung thành→video, legacy SRT, EN chính/VI/JA/KO và TTS local/ngoài. Hai nhân vật diễn câu chuyện người dùng đưa; không buộc một cốt truyện demo, chủ đề máy móc hoặc host đứng kể. Các check source không chứng minh video đã mượt như mẫu hoặc toàn factory đã hoàn thành.
