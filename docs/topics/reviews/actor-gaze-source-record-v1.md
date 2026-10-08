# Source0.44 — actor gaze và publication

Scope: chỉ worktree `codex/prehistoric-life`, parent source `6b061551653994eb4218ef3ef2738bb8f9deb512`. Không sửa checkout `D:/github/Story-2-video-factory2.1`, không chạy builder/test/callback/sampler/browser/renderer/9router/TTS/ASR/audio/video. User xác nhận máy không có API image-to-video. Native art bytes giữ nguyên, productionReady=false/productionRig=null. Full goal còn active.

## Thay đổi source

Strict fixed-point/actor eye union; full original visible native target descriptor/fingerprint; mutually referenced raw source clocks, no recursive gaze; shared actual head/eye projection, full body/expression/breath/seat clock and owned physical lunge clock; event seeds/compiler/camera/reports/schema/cache/context/manifest/tracer2. Original face art và fixed view giữ nguyên; không tạo head/body turns hoặc optical-gaze acceptance.

Normal/cache/manual scene và repair giữ render snapshot binding, canonical disk source được kiểm trước staging/writes và sau writes. Transaction phục hồi scene/report khi nguồn đổi; chỉ rollback bytes đã ghi mà vẫn thuộc transaction, giữ separate edit và chặn resume nếu journal có rollback-conflict. Optimistic check, không global file lock/concurrency acceptance.

13 callback mới (11 trong `tests/actor-gaze.test.ts`,2 trong `tests/artwork-repair.test.ts`) và chỉnh narrowing fixed-point ở hai regression; **NOT RUN**. [Handoff, lệnh, môi trường và phần sản phẩm còn lại](../NATIVE-ACTOR-GAZE-HANDOFF.md).

## Review source độc lập

Euclid `01a119fb-0f57-75d2-9037-40c27417563c`, giới hạn đọc source; không sửa/import/execution.

- Review đầu:3 findings. P1 target lunge mất thrust clock sau khi clear spears; sửa descriptor owned timing/schema và body-only shared evaluator. P2 target fingerprint lấy metadata từ current slice; sửa canonical run entry/fixed diagnostic fps60. P2 prefixed ID vượt96; sửa giữ ID đã validate. Follow-up xác nhận cả3 đã khép ở mức source, không thấy lỗi mới do các sửa.
- Follow-up publication: P2 nhánh normal publish không kiểm source target trên đĩa, repair binding cũng cần giữ snapshot đã render. Sửa normal/cache/manual/repair snapshot binding và transaction source guard. Rollback bảo toàn separate edit được bổ sung trước re-review cuối.
- Re-review publication/11 declarations:3 P2 mới. After-guard so board schema-parse với repaired shot raw có key order khác; sửa responseCandidate và persist canonical `ShotSchema.parse` trước render/binding/pending/hash. Outer catch có thể xóa separate edit của attempt receipt; sửa failure receipt riêng UUID trong stagedRoot, không cập nhật protected attempt. Lunge setup silent mouth bị workbench chặn; sửa registered-rest-mouth. Thêm2 regression declaration cho repair hash/receipt.
- Re-review cuối qua bounded source scope: cả3 findings cuối đã khép, guard normal/cache đối chiếu canonical board/narration với render snapshot; rollback giữ conflict, recover từ chối restore; hai declarations mới đúng tình huống lỗi. Không thấy source-proven finding mới trong phạm vi đọc. Agent đã đóng, không thực thi bất kỳ callback/compiler/test/media nào. Đây không là nghiệm thu toàn sản phẩm.

## Source checks thực tế

- `npm run schemas; npm run test:typecheck`:27ea2f/429418 exit0 cho contract đầu. Initial96506/c0e566 exit1 do legacy `.target` chưa narrow union;6fff19 exit1 do3 nested replacements; sửa explicit rồi check qua. Không thực thi test.
- Sau11 declarations:2b8898/a20bfe exit1 do missing-sibling assignment, minimal clock-only Shot cast và compile argument slot; sửa source.25e355/e3d536 schemas/typecheck exit0 sau8 callbacks đầu.46e940/24ab09 typecheck exit0 sau publication guard. Ba callback publication chưa chạy.
- Build3b2c09/b6062d exit0 (Vite32 modules,480ms); static pack4e78d3 exit0 (6 refs/12 candidates/6 heads/2 garments/7 rejected/productionReady false).
- Build a6c215/fa3ce0 exit0 (32 modules,473ms); typecheck1fade4/4d7a75 exit0 sau10 callbacks, trước rollback bảo toàn separate edit.
- Final build160da8/adfc50 exit0 (Vite32 modules,561ms), typecheck905956/ccb693 exit0 sau11 declarations và rollback preservation. Schema/static pack5695a9 exit0;17dfb/017dfb kiểm5 native gaze/publication code hashes khớp manifest, clock/source/tracer metadata đúng và whitespace exit0. Không gọi sampler hay callback.
- Fresh build71c2eb/4aa3a5 exit0 (Vite32 modules,472ms), typecheck9f3eda/d3452b exit0 sau3 sửa cuối/13 declarations; static pack466dae exit0, productionReady false. Bounded re-review source đã khép; owned publication và exact remote SHA được ghi ở checkpoint tiếp theo.

Runtime test/fixture/pose/tracer/browser/API/audio/media: **NOT RUN**, không có phim mới, không motion/identity/optical/audio/video/ba-input/resume/final-QC PASS. Source0.44 không phải DONE của mục tiêu sản phẩm.
