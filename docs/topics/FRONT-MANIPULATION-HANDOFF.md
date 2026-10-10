# Cầm/mang/đặt/thả ở góc chính diện riêng — source0.104

`forest-tribe-0.104-own-front-manipulation` thêm tương tác đồ vật cho Lila/Karo chính diện bằng own source registration. **Chưa nghiệm thu anatomy, tay/cổ tay, grip, viền trang phục, hình/diễn xuất/giọng/video hoặc toàn factory.** Người dùng giao runtime QA cho model khác; implementation chỉ kiểm source/build/types/definition export/raw inventory.

## Phần code đã nối

- `appearance.bodyManipulation=registered-front-manipulation-v1` chỉ dùng own `bodyView=front` của Lila/Karo. Hai binding có exact own PNG/SHA/canvas; shoulders/restDirections/depth lấy từ `bodyFrontRegistration`, vẫn là authoring thủ công chưa duyệt anatomy. Cùng nhân vật tái sử dụng canonical bones/cuffs/palms/mittens. Không dùng vai/rest/face/garment/ROI/landmark của profile/3/4, không mirror/warp hoặc suy yaw.
- Inspect target, operate, pick-place, carry và drop dùng same canonical solver/painter. Contact cần `elbowPole=rest`, target thực và contact/release/destination clocks hợp lệ. Approach/recovery dùng C2 góc khớp, fixed bone lengths; palm bám grip thật trong phase sở hữu. Không flip pole, kéo giãn xương, dời/clamp target hoặc gán vật theo một clock khác để che lỗi. Inspect là target gesture tại shot; nó không tự trở thành sourceManipulation/grip xuyên cut.
- `sourceManipulation` giữ toàn contact/prop/actual release history của operate/pick-place/carry/drop; `sourceBody` giữ toàn original physical tracks. Mỗi explicitly continuous camera slice phải lặp đúng hai source, cùng actor/view/root/stage/scale, local contact/props/body tracks trống. Cut sau release lấy actual original release palm. Đổi primary/supporting không đổi người/vật/clock; hai người cầm vật riêng có namespace riêng, không tự coi đó là chuyền chung một vật.
- Stationary own front contact xuyên camera cut không ép chọn locomotion, nhưng vẫn cần complete sourceManipulation và complete empty sourceBody. Có walk/jump/posture/support thực thì phải có motion/seat capability riêng. Carry di chuyển ngang cần `registered-front-motion-v1` và gait `sidestep`; workbench cho hướng đi theo tay rig đang cầm, giữ facing/headView=front. Walk phải nằm sau lift250ms và trước lower250ms theo body clock thật. Không gọi đây là đi/chạy hướng tiến hoặc theo chiều sâu.
- Native source selection/clock17/compiler43/schema/API/workbench/director/report/cache/manifest cùng contract. Own front eyes/mouth/expressions/hair vẫn phải chọn riêng. Không cấp spear/hunt/handoff/seat/head bank/supportingModel/continuous head/body turn hoặc ngón tay/wrist pose được vẽ mới. Production pre-model/TTS và `needs-source-prop-binding` giữ nguyên; approvals=false, productionReady=false, productionRig=null, availableBanks=[].

Các nguồn `lila-front-v1.png`939×1675 và `karo-front-v1.png`1024×1536 giữ nguyên byte. Palette/face/costume và common soft ink/physical kernels giữ nguồn; source/hash/typechecks không chứng minh tay hay trang phục đã đẹp.

Code chính: `packages/animation/body-view-front-manipulation-binding.ts`, `native-contact-arm.ts`, `body-view-basic-capabilities.ts`, `body-view-art.ts`, `body-view-front-registration.ts`; `packages/topics/body-workbench.ts`; `packages/host/schemas.ts`; `packages/director/acting-brief.ts`; clock/compiler/cache/pack. Mười callback ở `tests/native-front-manipulation.test.ts` **DECLARED / NOT RUN**.

## Môi trường, khởi động và lệnh model test

Windows, Node≥22.13.0, dependencies theo lockfile. Giữ nguyên checkout D và server8850; model test dùng C worktree/cổng riêng. Ghi exact full SHA, input/options, commands, stdout/stderr và artifacts. Không ghi key vào report/Git/chat.

```powershell
Set-Location -LiteralPath 'C:\Users\Duongvh-pc\.codex\worktrees\stickman-acting-v22\Story-2-video-factory2.1'
git rev-parse HEAD
node --experimental-test-module-mocks --import tsx --test --test-concurrency=1 tests/native-front-manipulation.test.ts tests/native-front-motion.test.ts tests/native-profile-manipulation.test.ts tests/native-manipulation.test.ts tests/original-source-preview.test.ts
$env:STUDIO_HOST='127.0.0.1'
$env:STUDIO_PORT='8851'
npm run studio
```

Mở `http://127.0.0.1:8851`; Ctrl+C đúng terminal này để dừng. Nếu8851 bận, chọn cổng khác và ghi report. Implementation chưa mở các URL:

- `/api/topics/prehistoric-life/body?view=front&action=operate&hand=left&timeMs=1500&mood=happy&manipulation=registered-front-manipulation-v1`
- `/api/topics/prehistoric-life/body?view=front&action=pick-place&hand=right&timeMs=2400&mood=happy&manipulation=registered-front-manipulation-v1`
- `/api/topics/prehistoric-life/body?view=front&action=carry&hand=left&timeMs=1800&mood=happy&manipulation=registered-front-manipulation-v1&motion=registered-front-motion-v1`
- `/api/topics/prehistoric-life/body?view=front&action=drop&hand=right&timeMs=3000&mood=happy&manipulation=registered-front-manipulation-v1`

Workbench là diagnostic pose, không là video câu chuyện hoặc giọng. Để kiểm cảnh gốc có storyboard/target/camera/clock thật, dùng [original-project preview](ORIGINAL-SOURCE-PREVIEW-HANDOFF.md). Không thay lời/kịch bản gốc bằng fixture; preview cần project/shot thật do QA cung cấp, SKIP không là PASS. Preview có nhãn chưa duyệt/không audio không thay final MP4 có giọng và QC.

## Phần model test cần kiểm

Hai diễn viên × hai tay rig × inspect/operate/pick-place/carry/drop, đứng yên và carry có bước ngang. Nhìn cả cận tay và toàn thân ở tốc độ thường/60fps. Rig-left ở phía trái màn hình trong own front drawing là tay phải cơ thể; tên rig không phải nhãn giải phẫu. Giữ phía vai, hướng gập khuỷu hợp lý, cuff/palm/wrist nối mềm, fixed lengths, không chữ Z/gập ngược/flip hoặc xuyên thân. So exact nguồn mặt/mắt/miệng/neck/hair/costume/màu và viền Karo/Lila khi mang/đặt đồ.

Palm chạm target trước khi vật phản ứng; vật không tự bay, đổi chủ, đổi kích thước/điểm cầm hoặc nhảy slot. Một palm paint slot tại mỗi phase. Lift/lower đúng clock; carry ngang không bắt chéo/trượt sole. Drop chỉ rơi sau release, landing/destination thật; frame trước/sau contact/release/landing, đoạn cắt sau release và cuối source giữ cùng vật và original state. Fixed-world operation/placement không được chồng locomotion; jumps/ownership phải qua guard hiện có.

Random/reverse seeks, original multi-shot contact/carry với camera cut/primary-supporting swap, hai actor ở vị trí riêng giữ body/feet/cloth/hair/face/hands/props/source phase. Source/sibling/grip/hand/target/time/identity/view edits mất publication/repair binding; missing/foreign/local clock phải fail, không sửa âm thầm. Camera giữ envelope actor/prop/path/landing và subtitle layout, màu cảnh rõ/ấm như reference.

Sai mode/view/actor/hash/canvas, source colour/head bank/supportingModel/seat/spear/turn, front forward gait/depth, impossible reach/wrong pole/too-early carry, shared/cross-person handoff chưa đăng ký phải fail rõ. Legacy profile/3/4 và front motion/face/secondary giữ đúng capability. Output report phải ghi actual selected mode/source và audio/motion chưa verified; production không được mở từ unit/source checks.

Ghi PASS/FAIL/NOT RUN với full SHA và artifacts. Source review9router và test đời trước không nghiệm thu source0.104.

## Mục tiêu đầy đủ còn mở

Chuyện/chủ đề bất kỳ → faithful screenplay; exact script/dialogue hoặc original WAV (+legacySRT) → narration clock thật → các diễn viên trong câu chuyện → vivid world/actions/director/camera → review/repair/final/QC. EN chính, VI/JA/KO và external/local HTTP/command TTS, cache/resume/approved locks/rebuild cùng final MP4/audio/SRT/thumbnail/storyboard/profile/timeline/manifest vẫn cần nghiệm thu toàn tuyến.

Nam phụ trọc/không râu/không tóc, nữ phụ có tóc dùng đúng costume; genuine own head/body turns, per-view tool/spear/hunt/seat/grasp/handoff và biểu cảm/tương tác vẫn cần hoàn thiện. Không thay mục tiêu bằng một cảnh cầm vật hoặc báo DONE từ source/build/typechecks.

## Kết quả source cuối

Build, test:typecheck, schema definition export, static pack và raw source inventory exit0.307 raster nguyên byte (144PNG/163JPEG,101JPEG tênPNG),18 head definitions/27 metadata và mọi callback cũ giữ nguyên.63 shared functions, fixed geometry/ink/arms/IK/swing/support/cloth/contact/body-source/ownership clocks và source-preview/security giữ nguyên; compiler chỉ đổi diagnostic wording. Hai source front bind đúng own PNG/SHA/canvas; anatomy/grip/seams chưa được duyệt. Manifest188 mapped hashes/46 scalar entries khớp source cuối. Mười callback mới DECLARED / NOT RUN;29 owned paths freeze/stage riêng,52 untracked khác giữ nguyên. Planner client timeout55s, provider work unknown/no job handle, không retry; parent viết code. Tester HTTP200→gpt-6-luna góp ý source; enum-omission được kiểm là trích dòng đã xóa trong diff, enum hiện có selection mới. Không có runtime/audio/render/video hoặc toàn factory acceptance.
