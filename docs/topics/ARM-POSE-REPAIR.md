# Lila/Karo — sửa tay và rà soát pose 0.20

**Hiện hành 0.20:** cuff/palm tách riêng theo ảnh nguồn; chain migrate độc lập target, contact vẫn ở palm, mitten theo tiếp tuyến cẳng tay. Preset frontal đã re-author, slot think discrete và shaft interpolation có kiểm riêng. Grasp/anatomy/motion/video chưa nghiệm thu, `productionReady=false`; ba input và diễn viên trong truyện giữ nguyên. [Chi tiết, bằng chứng và lệnh bàn giao](WRIST-PALM-IMPLEMENTATION.md). Các đoạn 0.19 trở về trước dưới đây là lịch sử.

**Lịch sử 0.19:** hai view 3/4 phải có registration kỹ thuật và ứng viên lunge qua rig/evaluator chung; giữ source bones, cổ/mặt nguyên lớp, near/far arms, sole trụ và clock giáo. Áo view mới vẫn rigid, wrist/palm/grasp và độ đọc joint còn thiếu; hai model review qua 9router chưa chấp nhận anatomy hoàn thiện. Chỉ build/typecheck và inspection clock tĩnh; runtime/MP4/ba input giao model test khác. `productionReady=false`, `productionRig=null`. [Source, ảnh, việc thiếu và lệnh server/test](VIEW-LUNGE-IMPLEMENTATION.md). Các mốc 0.18 trở về trước bên dưới là lịch sử, không phải trạng thái mới.

Ngày 07/10/2026. Đây là bàn giao source và inspection ảnh tĩnh, **không phải video hoặc rig đã nghiệm thu**. `productionReady=false`, `productionRig=null` giữ nguyên.

## Cập nhật 0.18 — cặp tay giáo, không chỉ từng elbow

Hai tay 0.17 vẫn cuộn cạnh nhau trước ngực dù từng wrist reachable. Bản 0.18 đặt grip chính `(±65,60)*bodyScale`, grip phụ lùi `100*bodyScale` trên cùng cán; primary offset `-0.18*length` để tay sau không vượt đuôi giáo. Cán vẫn `height*1.2`; thrust tạm là `8*bodyScale`, không kéo tay hết chiều dài để giấu reach error. Profile gốc và measured chain totals giữ nguyên.

- `schemas.ts` nhận `elbowPoles.primary/secondary` cố định cho shot; nới miền secondary offset xuống -200 rig units để Karo có span 108. Vị trí hai grip vẫn bị kiểm nằm trên đoạn gỗ thật; không nới contact tolerance.
- `compiler.ts` kiểm thêm `sourceSpearPairShape`: khoảng grip ≥60% chain ngắn hơn, khuỷu drive ở sau vai của chính nó trên trục cán, wrist sau không được đưa quá 30% chain về trước vai. Guards này là quy tắc thẩm mỹ ứng viên cho source front, không phải chứng nhận anatomy.
- Cặp mới có pole cùng dấu nhưng wrist order khác nên hai elbow mở về hai phía. Đổi dấu tay sau một cách máy móc sẽ kéo elbow về phía trước áo. Giữ nhánh trọn shot, không chọn lại từ target theo từng frame. Không áp “mọi elbow phải thấp hơn shoulder”; lunge thật cần raised rear elbow.
- `FrameState.spearGeometry` và bảng developer ghi grip span, minimum span, rear elbow along-shaft. `forest-source-body-motion-14`, `forest-arm-role-shape-2`, `forest-spear-grips-4` nằm trong fingerprint; cache cũ không được dùng như kết quả mới.

[Ảnh mới](reviews/source-spear-pair-aim-v2.png) cho thấy hai tay không còn cuộn cạnh nhau trên ngực như [0.17](reviews/source-hunt-aim-after-v2.png). Đây vẫn là **frontal low hold**, chưa phải pose giáo chéo/lunge theo người dùng. Karo rear arm còn bow rộng; Lila arm chia silhouette với tóc. Wrist/grasp, ink clearance theo mask và motion cả chu kỳ còn phải dựng/kiểm.

Đã mở lại đủ 12 trang developer của source 0.18: 138 ô ở ba clock cố định với mood happy; 132 ô render, sáu head-turn bị chặn đúng vì chưa có registration. [Inspection 0.18](reviews/source-spear-pair-self-inspection-v1.json) giữ source/ảnh hashes và DOM diagnostics. Không kết luận tất cả pose đẹp hoặc video mượt từ việc render không lỗi; các mood khác, toàn clock và runtime chưa chạy.

Tư vấn bổ sung thật qua 9router: [Gemini pair](reviews/gemini-spear-pair-advice-v1.json), [model code pair](reviews/coder-spear-pair-advice-v1.json). Gemini đề xuất đổi pole và coi planar weight=1 là rút ngắn; các đề xuất này không khớp phép tính hiện hành nên không áp. Model code có tính hai branch: rear elbow hiện ở sau vai; nhánh ngược quay về áo. Reviewer cũng nêu nguy cơ cùng target cằm Lila, chuyển pole nhanh, mitten kink và thiếu body view/lunge. Những nguy cơ đó vẫn còn; advice không phải nghiệm thu.

Có thêm chín output artwork góc thân/đầu và hai review ảnh, ngoài 14 pose/6 advice cũ. Tổng hiện tại: **23 lượt tạo ảnh thành công, 10 lượt tư vấn**, gồm sáu source/art advice, hai pose advice và hai authored-view advice. [AUTHORED-VIEWS.md](AUTHORED-VIEWS.md) ghi rõ ảnh chưa đăng ký, chỉnh Lila v2 và các vấn đề identity/canvas. Không dùng gallery thay rig liên tục.

Build/typecheck source và test declarations được kiểm tra; regression runtime mới viết cho pair crowding/forward elbow và không áp universal elbow-height rule **chưa chạy**. Model test khác cần chạy đúng worktree 0.18, kiểm toàn clock và cả hai hướng trước khi báo PASS.

Các phần 0.17 bên dưới là lịch sử giải thích root cause và cách sửa trước khi kiểm thêm silhouette cả cặp tay; số grip 70/20/45 không còn là preset hiện hành.

## Lỗi người dùng chỉ ra và phần đã sửa

Ảnh [hunt-aim bị gập tay](assets/user-hunt-aim-arm-feedback.png) cho thấy cổ tay có thể chạm đúng cán nhưng khuỷu vẫn bị ép vào eo. Reach đúng không đủ để có pose đẹp. Hai vai nguồn bất đối xứng, preset grip cũ đặt quá sát thân; think còn có bàn tay bị lớp râu che.

| Phần | Code hiện hành | Giới hạn còn lại |
|---|---|---|
| Grip giáo | `body-workbench.ts`: từ `(±24,50)/30` sang `(±70,20)/45*bodyScale`; cán `height*1.2`, world 820, thrust 15*bodyScale; wrist theo shaft | Đây là preset chính diện tạm thời; chưa phải lunge hoặc chuẩn cho mọi shot |
| Hình tay | `source-arm.ts`: giữ chiều dài XYZ ở mọi role; có giới hạn flexion riêng cho point/chin/run/spear-front/spear-rear, chặn segment chiếu dưới 70% | Rest/walk/lap/react chưa có giới hạn flexion được hiệu chỉnh; crossing/occlusion toàn chu kỳ còn phải kiểm. Đây là guard thẩm mỹ ứng viên |
| Tay chạy | `compiler.ts`: góc bắp tay/cẳng tay tạo chain thật, blend từ rest hiện tại, chỉ kích hoạt trong clip run | Chưa có profile/back artwork; cần kiểm tốc độ, gia tốc, elbow branch cả chu kỳ |
| Tay chạm cằm | Target cằm từng tay trong `forest-cutout-head.ts`; nét ink và mitten cùng chọn slot trước đầu, mỗi phần có một definition, không offset clone | Lớp gần/xa theo body view còn phải dựng; chưa có hand grasp riêng hoặc góc nhìn bạn diễn |
| Chỉ tay | Reach từ chiều dài chain từng tay | Target của câu chuyện phải có nguồn/layout thật |
| Ngồi/đứng | Hạ pelvis tự do vừa đủ giữ foot reach trước khi khóa support; không dời chân/support hoặc tăng tolerance | Biên contact, velocity và seat-to-walk còn cần model test |
| Mặt | Một cutout đã đăng ký cổ/thân, giữ mặt happy có sẵn; bỏ inferred yaw và glyph phóng to | Cutout AI chưa bảo đảm pixel identity; partner/profile/back và biểu cảm riêng còn thiếu |

Nét tay/chân đã dùng cubic ink liên tục; làm đường cong mềm không tự sửa một chain sai. Không áp đề xuất của AI đổi chiều dài xương hoặc đồng loạt đảo pole để che lỗi.

## Bằng chứng và tư vấn

- Bảng developer: [hai tay theo nhóm](http://127.0.0.1:8850/api/topics/prehistoric-life/arm-audit). Có 23 hàng pose cho hai actor, ba clock cố định: tổng 138 ô, trong đó sáu ô head-turn báo `needs-head-view`. 132 ô còn lại render ở các clock đã ghi; không có nghĩa toàn chu kỳ/video đạt.
- Nhóm: rest, point trái/phải, think trái/phải, crouch, head-turn; walk/run hai hướng, jump, stalk; hold/thrust hai hướng, aim/chase; ngồi và ngồi→đi hai hướng. Chi tiết thân/tay hiển thị riêng, có flexion và tỷ lệ nét.
- [Inspection cuối](reviews/source-pose-art-self-inspection-v1.json) giữ hash source/ảnh, counts và phạm vi. Gestures v4/think v2 chụp sau sửa ink slot; các nhóm khác chụp trước thay đổi lớp ink này, geometry không đổi nhưng không gọi là chạy lại renderer cuối. Các ảnh cũ hoặc ảnh chưa tải đủ footer không phải bằng chứng cuối.
- [Trước](reviews/source-hunt-aim-before-v1.png) / [sau sửa](reviews/source-hunt-aim-after-v2.png); [think trước](reviews/source-think-occluded-before-v1.png) / [sau](reviews/source-think-after-v2.png). Silhouette giáo mới vẫn là hai tay trước thân; không gọi đó là pose lunge theo mẫu.
- 14 ảnh tạo thật qua 9router, trong đó 10 pose rời v3: [gallery](http://127.0.0.1:8850/api/topics/prehistoric-life/pose-art), [tool và prompt](AI-POSE-WORKFLOW.md). Tất cả chưa duyệt và chưa đăng ký vào rig sản xuất.
- Tư vấn source: [Gemini trước](reviews/gemini-arm-source-advice-v1.json), [model code](reviews/coder-arm-source-advice-v1.json), [Gemini sau](reviews/gemini-arm-source-advice-v2.json). Báo cáo sau vẫn nói tay là đường thẳng, foreground slot luôn 0, không có shape guard và dùng split 88/136; các nhận xét này không đúng source/frame hiện hành. Code đã dùng ink-arm, cập nhật slot, infer 52/48 và kiểm role. Các công thức góc trong tư vấn cũng phải đối chiếu hình học, không được áp nguyên văn hoặc dùng như PASS.
- [Gemini với context đủ hơn](reviews/gemini-arm-source-advice-v3.json): lượt trước chỉ được đoạn compiler tới dòng 613, thiếu block role/slot phía sau. Tool đã bổ sung `source-arm.ts`, `forest-cutout-head.ts`, block slot/role và lưu ranges/hash excerpt. V3 nhận ra ink cẳng tay còn bị đầu che; sau đó source chuyển ink và mitten cùng slot, chụp lại ba trang gestures v4 và think v2. V3 vẫn có số đo/suy luận chưa đúng và đề xuất đổi pole đơn giản hoặc hạ giới hạn lap dưới pose hiện hành. Không áp các đề xuất đó máy móc; advice không phải nghiệm thu bản cuối.

## Việc còn phải làm

1. Đo/đăng ký bộ body và head 3/4, profile trái/phải và lưng; giữ tóc/râu, áo một vai, viền váy/quần, màu da ấm, tay chân nét đen. Không flip cả trang phục để giả góc quay.
2. Hiệu chỉnh 10 pose AI chưa duyệt: thống nhất mitten, oval foot, shoulder, head scale, grip, biểu cảm; đặt joint guides theo tỷ lệ chuẩn. Không coi canvas AI là xương mới hoặc chạy slideshow thay rig.
3. Dựng lunge theo [pose người dùng](assets/reference-spear-pose.png): chân trước chùng, chân sau duỗi, hông/vai dồn trước, cán chéo, tay sau khuỷu nâng ra sau và tay trước hỗ trợ. Tạo trajectory riêng hai role, giữ một shaft frame và ownership/contact trong toàn động tác. Chỉ đổi pole khi có đường chuyển qua extension hoặc pose guide hợp lệ; không bật khuỷu bằng dấu ±1.
4. Tạo lớp near/far forearm/mitten, grasp notch đã đăng ký; kiểm không xuyên áo, mặt, râu hoặc cán. Động tác think phải chạm cằm và không che mặt quá mức.
5. Kiểm toàn clock entry/hold/recovery, run/jump/seated, nhiều mood/scale/crop, seek/resume, velocity/acceleration và contact. Ba clock tĩnh chỉ tìm được một phần lỗi; không được mở production guard từ build hoặc ảnh đẹp.
6. Tích hợp sourced actor/entity/prop/target cho câu chuyện bất kỳ; con thú và phản ứng phải có rig/clock thật. Giữ ba input: kịch bản nguyên văn, WAV giữ narration/clock, câu chuyện→kịch bản trung thành. Nhân vật là diễn viên trong câu chuyện, không cố định thành người dẫn hay demo săn/máy móc.

## Môi trường và lệnh

Windows; Node >=22.13; npm dependencies repo; 9router `http://127.0.0.1:20128/v1`; key trong `.env` checkout D, không commit hoặc in key. Source đang chạy ở worktree dưới đây. Checkout D có WIP riêng, không ghi đè source.

```powershell
Set-Location -LiteralPath 'C:/Users/Duongvh-pc/.codex/worktrees/stickman-acting-v22/Story-2-video-factory2.1'
# Nếu server 8850 đã chạy thì mở trang, không khởi động server thứ hai.
./scripts/start-studio.ps1 -Port 8850 -SkipBuild -Watch -EnvFile 'D:/github/Story-2-video-factory2.1/.env' -ProjectsRoot './runtime/prehistoric-life/projects'

# Chỉ build/typecheck, không chạy runtime test:
npm run build
npm run test:typecheck

# Đọc artwork hiện có và cập nhật manifest; không tạo ảnh/video, không nghiệm thu:
node --import tsx scripts/prehistoric-pack.ts
```

Runtime test tiếp tục giao model khác theo yêu cầu người dùng. Regression source đã bổ sung cho reachable-but-pinched elbow, một hand definition/slot foreground và future run/seat không làm đổi idle. **Chưa chạy các regression này.** Tester cần chạy bộ test, motion fixture và kiểm video thật theo [POSES-CHAY-NHAY-SAN.md](POSES-CHAY-NHAY-SAN.md), thêm cả hai tay và các góc còn thiếu. Không lấy kết quả V1 hoặc review ảnh cũ để tuyên bố ba luồng mới đã nghiệm thu.
