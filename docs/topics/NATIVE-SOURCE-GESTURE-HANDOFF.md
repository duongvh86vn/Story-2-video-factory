# Lila/Karo — động tác tay gốc xuyên qua cắt cảnh

Mốc source0.34, 08/10/2026; base `8cc3a033e6ccf2b8c3691b11c1a5513bc3c1d8de`, branch `codex/prehistoric-life`. Tiếp tục native SVG/HTML5/GSAP khi không có dịch vụ image-to-video. Đây là source candidate; chưa có nghiệm thu chuyển động, anatomy, artwork hoặc video đạt mẫu.

Source checks: full build, test:typecheck, schema export retry và whitespace exit0. Independent source review ban đầu HOLD hai P2, đã sửa; follow-up bounded source PASS. **13 callbacks NOT RUN**; chưa có playback/ảnh/video acceptance. SHA xuất bản sẽ được ghi ở record sau push.

## Contract động tác

`performance.gestures[].sourceSpan` khai báo một động tác gốc, khác ID của mảnh local. Clock của lời kể/audio không đổi. Ví dụ một actor nâng tay, giữ pose rồi thu tay trong run1000–5000ms:

```json
{
  "id": "shot-2.local-point",
  "action": "point",
  "hand": "right",
  "startMs": 0,
  "endMs": 1800,
  "target": { "x": 460, "y": 310 },
  "sourceSpan": {
    "id": "actor-point-at-object",
    "startMs": 1300,
    "endMs": 4600,
    "reachMs": 2100,
    "recoverMs": 4100
  }
}
```

Mảnh trên thuộc shot2800–5000ms. Phải có mảnh trước trong shot1000–2800ms, local300–1800ms, cùng sourceSpan/tay/action/target/pole. Source ID phải riêng cho từng command của mỗi actor/hand; hai tay độc lập dùng hai command ID. ID local có thể khác giữa shot; ID gần giống hay target gần nhau **không tự tạo continuity**.

Local start/end là đúng giao của cửa sổ gốc với shot. Mỗi đoạn có giao phải khai báo mảnh; thiếu/trùng, đổi tay/action/target/elbowPole/nhịp hoặc nguồn vượt run bị chặn. Shot sau phải khai báo continuous và giữ cast/view/stage/root/scale/profile. Cut thật cần kết thúc command trước cut hoặc bắt đầu command mới; không được giữ một khai báo thiếu nửa động tác. Source reach/recover là **keypose motion**, không là physical contact. Local contactMs/releaseMs/prop/destination/drop fields phải bỏ.

Chỉ native body view đã chọn registered mouth/eyes, happy/fixed pose và point/think hỗ trợ candidate này. Missing complete board/run context báo `needs-view-gesture-phase`; không rơi về một pose gần giống. Native locomotion/posture/turn/prop/spear guard giữ nguyên. Không được làm nhẹ guard chỉ để video xuất được.

## Source thực hiện

- `animation/schemas.ts`: strict optional GestureSourceSpanSchema; giữ performance version22 và compatibility cho clip không khai báo span. Shared Shot/Storyboard/Actor/CLI/API/model schema nhận cùng field. `gesture-source-span.schema.json` và view-acting-clock v2 xuất từ Zod.
- `animation/view-source-gesture.ts`: định nghĩa command với physical RigHand, window gốc, target/pole; exact local projection và complete run coverage. Không suy tay từ screen slot hoặc view direction. Ordinary clip trùng tay nguồn bị chặn cả ở current và ở shot khác trong run.
- ViewActingClock v2 có array source gestures bắt buộc, hash/clock run cùng gaze/breath. Source collector và publication/cache identity dùng board hiện hành, thay current bằng candidate. Version1 là context derived lịch sử; rebuild renderer context, không sửa narration/audio hay input của người dùng.
- Compiler dùng source absolute time cho arm window và thời điểm đầu động tác gốc cho shoulder/elbow branch. Entry của nguồn có thể nằm trước shot hiện tại; reference time local khi đó âm **chỉ ở evaluator nội bộ của fixed native run**, không âm trong persisted gesture/action. Body/head/breath cùng run clock; FK giữ nguyên chiều dài xương, mitten/cuff/grip, nét ink cong và painter slot. Không mirror tay hoặc đổi target để che lỗi pose.
- Point/think qua cut trong approach/hold/recovery dùng cùng command, keypose, branch, hand và front/back slot. Tay không thuộc command vẫn dùng clip/rest của chính nó. Gesture attention dùng nguồn cùng window; đây là pupil look có giới hạn, không head turn hay chứng minh optical gaze.
- Frame grid có source start/reach/recover/end cùng near samples; refinement, namespacing/security và canonical primary/supporting/interaction path dùng cùng evaluator. Body compiler24; report có source gesture IDs, tay, window/target/hash, `wholeBodyActionContinuous=false`, `approved=false`.
- Interaction geometry chọn original keypose reach nếu ở trong shot, hoặc sample đã clamp vào mảnh hiện tại. Nó ghi `originalReachMs`, `originalRecoverMs`, `samplePhase=approach|hold|recovery`, `contactVerified=false`; không gọi một mảnh windup là đã chạm đối tượng. Contact/QC của operate/drop/spear không bị thay bởi source point/think.
- Prompt director mô tả khi nào có thể dùng sourceSpan; vẫn giữ nguyên narration/audio/source/identity/approval. Rebuild hoặc sửa keypose của command nhiều shot phải giữ toàn bộ mảnh thống nhất. Single-shot repair chỉ đổi artwork có thể giữ span; sửa một mảnh timing/target trái các mảnh khác phải bị chặn hoặc tạo command/cut hợp lệ.
- Creative normalization truyền complete board vào renderer. Artwork repair nhận board của lần dựng hoặc đọc board canonical trên disk, thay đúng shot bằng candidate rồi kiểm lại; cả replay rejected/completed dùng cùng đường này. Attempt binding có sourcePhase của narration/ownership/full acting run để không tái dùng receipt khi sibling khác đã đổi nguồn. Primary/supporting có thể đổi vai camera; continuity vẫn kiểm từng actor thực trong cast, không đồng nhất primary với identity.
- Hai đường kiểm artwork chỉ cho phép đúng PNG local đã đăng ký của cast qua actorRigResourcePaths, cùng sheet sprite hiện hữu. Đây là source resource allowlist; việc staging vẫn đọc/hash bytes. Không cấp phép URL tùy ý, không đồng nghĩa hình đã được duyệt. Canonical fixture tính lại model continuity từ modelExitParts sau khi đổi target.

## Giới hạn và nghiệm thu

Không có sampled frame/clip/MP4 mới được controller dựng ở mốc này. Original PNG bytes/màu/trang phục không đổi; ảnh tĩnh0.32 là tài liệu lịch sử, không chứng minh pose/skin seam hoặc motion hiện tại. Bone/shape guards chỉ là candidate art constraints; chưa chứng minh anatomy, collision clearance, C2 playback thực hoặc chất lượng ngang video tham khảo.

Còn neutral mouth/full expressions/brows/identity, head/body turns, native walk/run/jump/seating, cloth/hair/prop contact và rich environment; sourceSpan chưa hỗ trợ các motion đó. Implicit gesture target chưa là choreography nhìn/đổi hướng đầu đầy đủ. productionReady=false/productionRig=null và final source/identity/voice/target/sync gates giữ nguyên.

**13 callbacks mới NOT RUN**, `tests/native-source-gesture.test.ts`:

1. Strict original motion span, timing và ID riêng, không suy continuity.
2. Exact projection/coverage và hand/action/target/pole/window mismatch.
3. Hai actor × hai view × hai tay × point/think: cut approach/hold/recovery và whole-clip equivalence.
4. Random seek, nonowned hand/rest, painter slot và invalid source time.
5. Ordinary clips giữ riêng; cut thật không kéo source command thiếu coverage.
6. Missing/stale context, profile và contact/prop guard.
7. Hand-track overlap/nonlocal ordinary conflict; other-hand independence.
8. Cache/repair identity với full source command, current replacement và stale sibling.
9. Source event/refinement, namespace/ink/hand/resource/report.
10. Canonical hai actor đổi primary/supporting, ownership/serialization và truthful target keypose timing.
11. Creative normalization có full source board/PNG registered/primary swap, và chặn actor đổi world position tại continuous cut.
12. Artwork repair, rejected/completed replay và full source binding khi sibling đổi; mocked provider trong test, không gọi mạng/model thật.
13. Production readiness/final gate không tự được duyệt.

Fixture canonical chỉ mượn stage/objects kỹ thuật để kiểm renderer contract; không là nội dung sản phẩm, câu chuyện được nghiệm thu hoặc hạn chế chủ đề. Các ca0.33/0.32/0.31 và legacy vẫn có trạng thái runtime riêng. Controller chỉ author/read source, build/typecheck/schema export/whitespace và bounded source review; không chạy callback/evaluator/GSAP/browser/API/model/TTS/ASR/audio/pipeline/MP4. [Record actual checks/review](reviews/native-source-gesture-source-review-v1.md), [kế hoạch](../plans/2026-10-08-source-view-gestures.md).

Cho model test chạy trên SHA ghi ở record:

```powershell
Set-Location -LiteralPath 'C:/Users/Duongvh-pc/.codex/worktrees/stickman-acting-v22/Story-2-video-factory2.1'
git rev-parse HEAD
node --experimental-test-module-mocks --import tsx --test --test-concurrency=1 tests/native-source-gesture.test.ts tests/continuous-view-attention.test.ts tests/native-view-eyes.test.ts tests/source-speech-phase.test.ts tests/fixed-view-speech.test.ts tests/partner-facing-views.test.ts tests/artwork-repair.test.ts
```

Ghi SHA/PASS/FAIL/NOT RUN/output/evidence. Kiểm actual GSAP random seek/playback giữa các camera cuts, velocity/branch/clearance/hand length/front slots, face/cloth seams và target chính xác ở original keypose; đo scene bytes/compile time/fps. Test cache/resume/locks/rebuild shot và stale sibling ngay trước repair acceptance. Runtime audio-RMS thật và ba input xuất final vẫn cần kiểm riêng.

## Server và môi trường

Node≥22.13, npm/package-lock, TypeScript/Vite/Sharp/GSAP hiện có. Controller không start8851/restart8850 ở mốc này. Model test cần Studio riêng:

```powershell
Set-Location -LiteralPath 'C:/Users/Duongvh-pc/.codex/worktrees/stickman-acting-v22/Story-2-video-factory2.1'
powershell -ExecutionPolicy Bypass -File scripts/start-studio.ps1 -Port 8851 -ProjectsRoot 'projects-native-source-gesture-test'
```

Giữ terminal, Ctrl+C dừng server đó. Mở `http://127.0.0.1:8851/`. Body pose workbench vẫn là local inspector; không tự có command nhiều shot. Dùng project riêng; không ghi đè8850. 9router/TTS dùng config/env đã có; không gửi/in/commit key. Endpoint/audio runtime chưa kiểm ở mốc source này.

## Mục tiêu đầy đủ

Mục tiêu của tool vẫn là script nguyên văn→voice/clock thật, WAV giữ giọng/audio-clock→ASR, câu chuyện→kịch bản bám nội dung→video, legacy SRT; EN chính/VI/JA/KO và external/local HTTP/command TTS. Lila/Karo là diễn viên trong câu chuyện bất kỳ; không trở về người dẫn cố định hoặc tool chỉ làm máy móc/săn. Mục tiêu đầy đủ chưa hoàn thành; cần chứng minh source/artwork/runtime/visual/full input acceptance trước khi bàn giao dùng sản xuất.
