# Lila/Karo: chạy, nhảy và diễn hành động săn

**Hiện hành 0.19:** hai view 3/4 phải có registration kỹ thuật và ứng viên lunge qua rig/evaluator chung; giữ source bones, cổ/mặt nguyên lớp, near/far arms, sole trụ và clock giáo. Áo view mới vẫn rigid, wrist/palm/grasp và độ đọc joint còn thiếu; hai model review qua 9router chưa chấp nhận anatomy hoàn thiện. Chỉ build/typecheck và inspection clock tĩnh; runtime/MP4/ba input giao model test khác. `productionReady=false`, `productionRig=null`. [Source, ảnh, việc thiếu và lệnh server/test](VIEW-LUNGE-IMPLEMENTATION.md). Các mốc 0.18 trở về trước bên dưới là lịch sử, không phải trạng thái mới.

**Lịch sử 0.18:** kiểm silhouette cả cặp tay giáo ngoài reach/flexion: span 100*bodyScale, rear elbow ở sau vai theo trục cán, nhánh cố định suốt shot và cán gỗ còn sau grip. Cặp mới bỏ coils cũ nhưng vẫn là low frontal hold; lunge theo mẫu chưa dựng. Có chín output artwork góc đầu/thân qua 9router, chưa đăng ký/duyệt; profile phải và lưng còn thiếu. Source 0.18 có 138 ô inspection tĩnh happy, sáu head-turn bị chặn. Tổng 23 image calls thành công và 10 advice calls; không phải PASS motion/video. [Sửa tay](ARM-POSE-REPAIR.md), [góc thân/đầu và tool](AUTHORED-VIEWS.md). Giữ guard và ba luồng kịch bản / WAV / câu chuyện → kịch bản → video.

Các mục 0.17 và trước đó bên dưới là lịch sử; preset 70/20/45 không còn hiện hành.
**Hiện hành 0.17:** tay hunt-aim tiếp tục bị người dùng loại. Preset mới tách hai grip, giữ chain lengths, có role flexion guard, target cằm từng tay và foreground slot; run không áp pole theo clip tương lai. Bảng inspection có 138 ô tĩnh, sáu ô head-turn chờ artwork. Source và ảnh đã được Gemini cùng model code khác tư vấn qua 9router; không phải runtime test hoặc PASS video. [ARM-POSE-REPAIR.md](ARM-POSE-REPAIR.md) ghi code, bằng chứng cuối, giới hạn còn lại và lệnh chạy. Lunge cả người theo mẫu chưa được dựng.

**Lịch sử 0.16:** tay ở 0.15 tiếp tục bị người dùng loại; các snapshot cũ không phải pose đã duyệt. Đã tạo 10 pose riêng v3 (point/think/run-left/jump/spear-lunge-left cho mỗi actor), giữ cả Gemini v1/v2 bị loại để đối chiếu. Có hai lượt review ảnh Gemini thật qua 9router; review v3 vẫn chỉ ra lỗi bàn tay, silhouette và giáo, không cho phép mở production guard. Tool artwork, prompt, gallery, công việc còn thiếu và môi trường ở [AI-POSE-WORKFLOW.md](AI-POSE-WORKFLOW.md).

Code body 0.16 dùng mặt happy nguyên lớp cutout, không bóp qua mesh yaw; góc nhìn bạn diễn chưa có. Tay chạy được dựng từ góc bắp tay trước/sau và góc gập cẳng tay, rồi mới suy ra hand target; không ép hai cổ tay đối xứng làm khuỷu tay sau chĩa lên. Thân và đầu profile, lunge toàn thân theo pose người dùng, shaft/grip binding và nghiệm thu liên tục vẫn thiếu. Các mục 0.15 bên dưới là lịch sử kỹ thuật; bản mới vẫn `productionReady=false`, không phải video đã đạt.

Mốc hiện tại 0.15, ngày 07/10/2026; sửa tay/giáo sau góp ý của người dùng về 0.14. Đây là bộ điều khiển chuyển động ứng viên cho đúng hai model da ấm, tóc nâu, áo một vai và nét tay/chân đen từ ảnh đã gửi. Không đổi thành người dẫn hoặc gán một câu chuyện săn cố định. Ba input vẫn là kịch bản nguyên văn, WAV giữ lời/clock giọng gốc, và câu chuyện → kịch bản trung thành → narration → video.

## Sửa pose đâm giáo 0.15

Người dùng đã chỉ ra tay gập bất hợp lý và giáo quá ngắn ở ảnh 0.14. Không coi snapshot cũ là pose đã duyệt. Nguyên nhân trong source: ảnh không có điểm khuỷu nhưng chain đã chia thành bắp tay rất ngắn/cẳng tay dài; phép chiếu với plane weight 0.2 lại thu bắp tay sát vai. Bản sửa giữ **tổng chiều dài từng tay theo nguồn**, suy luận tỷ lệ bắp tay/cẳng tay 52/48 và dùng plane weight 0.85 cho giáo để đọc rõ khuỷu xuống/sau; run vẫn dùng phép chiếu front riêng. Đây là giải phẫu suy luận, chưa có artwork profile hoặc bằng chứng biomechanics.

Workbench đổi giáo từ 120 lên `rigMetrics.height * 1.2` (381.6 đơn vị với bodyScale=1). Tay chính tại phần sau cán (`gripOffset.x=-length/4`), tay phụ lùi thêm 30 đơn vị; không chỉ kéo dài phần mũi. Grip từ vai là `(±24,50)`; đầu đâm dịch khoảng 30 đơn vị từ pose giữ, cùng clock lấy đà/đưa/giữ/thu. World rộng 820 thay vì 430 để không cắt cán hoặc mũi. Thêm `spear-hold-left` và `spear-thrust-left` với ownership tay đúng rig; không mirror áo một vai. Bố cục trang so sánh cho pose giáo nhiều chỗ hơn. Những số trên là preset hiệu chỉnh; câu chuyện sản xuất phải đặt target/reach theo layout thật.

Schema cho phép chiều dài 50–600 chỉ với `kind=spear`; prop generic vẫn tối đa 200. Không nới reach, ownership, contact clock hoặc giới hạn scene 2 MB. Khi xem biểu cảm angry, Lila bị lỗi chân không tới nền do hông xoay nhưng chiều cao pelvis của người đứng chưa bù reach. Compiler nay hạ pelvis chỉ phần cần thiết sau khi xoay hông, giữ đế chân và chiều dài xương; seat vẫn dùng solver support riêng. Bản sửa này ảnh hưởng hình của những pose source khác, cần giao model test kiểm hồi quy đi/chạy/ngồi/nhảy/biểu cảm.

Body compiler hiện `forest-source-body-motion-10`, spear geometry `forest-spear-grips-2`, topic `forest-tribe-0.15-spear-anatomy-candidate`. Fingerprint hình đã đổi; không tạo lại lời kể đã chốt.

Ảnh developer mới: [lấy đà](reviews/karo-spear-thrust-windup-v3.png), [đâm phải](reviews/karo-spear-thrust-contact-v3.png), [đâm trái](reviews/karo-spear-thrust-left-contact-v3.png), [biểu cảm căng](reviews/karo-spear-thrust-contact-angry-v3.png), [cả hai actor](reviews/source-spear-thrust-angry-both-v2.png). Hash/phạm vi ở [inspection v2](reviews/source-spear-pose-self-inspection-v2.json). Chỉ inspection tĩnh và build/typecheck; chưa chạy runtime tests, fixture hoặc video, không có PASS chuyển động mới. Profile body, đổi trọng lượng/lunge thật, con thú và sourced story bindings vẫn còn thiếu.

## Các action đã thêm trong source

| Action workbench | Nội dung hiện có | Phần còn thiếu |
|---|---|---|
| `run`, `run-left` | Trụ → nén → đẩy → bay → đặt chân; root liên tục, chân trụ giữ tọa độ nền, tay gập đánh trước/sau; dừng về hai chân | Artwork thân nghiêng, stride/heel/toe, động lực và nghiệm thu chu kỳ |
| `jump` | Lấy đà → bật → thu chân trong pha bay → tiếp đất → hấp thụ; tay cùng clock | Jump nhiều hướng, nhảy tiến/qua vật, toe roll và thứ tự lớp gần/xa |
| `hunt-stalk` | Quan sát/cúi → đứng lại → bước ngắn → cúi/quan sát tiếp | Đi khom liên tục và chạm cây/bụi, dấu vết thật trong cảnh |
| `spear-hold`, `spear-hold-left` | Hai tay giữ chung cán dài bằng IK; giáo ở trên áo và dưới bàn tay | Pose giữ giáo dọc, tiếp cận/nhặt/chuyền, artwork thân theo hướng |
| `spear-thrust`, `spear-thrust-left` | Giữ → lấy đà → đưa giáo → chạm world target → giữ ngắn → thu giáo; khuỷu rõ hơn | Gắn target với entity con thú/vật và source/action contract trong storyboard; lunge/chuyển trọng lượng thật |
| `hunt-aim` | Cúi ngắm, nhìn target và giữ hai điểm trên cán | Bộ view ngắm nghiêng, gần/xa và phối hợp hai diễn viên |
| `hunt-chase` | Chạy giữ giáo bằng cùng evaluator; mắt hướng mục tiêu | Rig con thú, vị trí/đường chạy/thời điểm phản ứng, cảnh rượt đuổi có nguồn |

Các dòng săn là **pose của diễn viên**, chưa phải cảnh săn thú hoàn chỉnh. Vòng tròn trên workbench chỉ là target hiệu chỉnh; không thay con thú bằng marker rồi báo DONE. Hiện không có loài thú hoặc câu chuyện do người dùng chốt. Tool phải chọn/dựng con thú theo nội dung nguồn, không tự thêm một cuộc săn vào kịch bản/WAV không kể điều đó.

## Contract và code

- `packages/animation/schemas.ts`: compiler `performance-2.2.15`, `walks[].gait=run`, jump `tuck` và `spears`. Mặc định bỏ `gait` vẫn là đi thường. Tuck là phần chiều dài đùi dùng để thu chân, `0–0.5`; chỉ nâng thêm bàn chân trong pha bay, không nâng thêm toàn thân.
- `packages/animation/running.ts`: lịch chân chạm đất theo từng bước; một chân trụ rời đất trước chân kia chạm ở cuối pha. Shadow ở nền. Những placement cuối trả cả hai đế về stance đứng, không tạo frame bay giả tại scene exit. Tốc độ/quãng đường và tối thiểu 240 ms/bước được kiểm.
- `packages/animation/spear.ts`: một hệ tọa độ cho cán/mũi và hai bàn tay. `grip` là offset **rig units từ vai tay chính**, xoay theo body lean; `aim` là stage/world pixels. `prop.gripOffset.x` nằm trên cán, `y=0`; tay phụ tại `secondaryOffset` dọc cán. Giáo có chiều dài `length` trong rig units. Không tween độc lập giáo và tay.
- `spears[].startMs=0`, `endMs=durationMs`: v1 có quyền nắm ngay từ đầu shot đến hết shot. `prop.attachedTo` khớp tay chính; origin bằng center giáo được evaluator đo ở frame đầu. `action=hold` không có clock đâm. `action=thrust` có `readyMs`, `contactMs`, `recoverMs` với khoảng lấy đà ≥280 ms, đưa ≥200 ms, giữ contact ≥80 ms và thu ≥280 ms. Mũi đến aim ở contact. Đâm phải cần dịch tới trước trong giới hạn reach; không dịch ngược để gọi là đâm.
- Không có ném giáo, handoff, nhặt giáo giữa shot hoặc cross-cut transfer ở v1. Hai tay sở hữu cùng tool không được trùng gesture/cầm tool khác. Không bước/nhảy/chuyển posture trong khoảng đưa–giữ contact. Không kéo dài xương để chạm target xa hoặc bỏ kiểm giới hạn sân khấu.
- `packages/animation/compiler.ts`: IK/clock/ownership/reach/bake chung; thêm knots liftoff/landing/settle và clocks giáo. Với source front, gối và khuỷu dùng độ sâu suy luận: chiều dài XYZ giữ, chiều dài chiếu 2D rút theo scale Y. Đây không phải rig 3D hoặc giải phẫu đã đo. Các tests phải tính depth và scale Y khi kiểm xương.
- `packages/animation/rig.ts`, `scene.ts`, `packages/topics/body-workbench.ts`: cùng rig, cùng lớp giáo trên torso/dưới tay, cùng `samplePerformance` và fixture; không có renderer pose riêng để che lỗi production evaluator.
- Director/explainer biết `movement=run`; coverage yêu cầu `gait=run`, không lấy đi nhanh hoặc pan thay cho chạy. Hint EN/VI/JA/KO dùng chung `motion-vocabulary.ts`; hint chỉ mở capability/cache, không chứng minh hành động có nguồn. Bộ gesture giáo hiện chưa được quảng bá là production binding. Story action phải có full source statement, entity và contact/response trước khi mở production.

Body compiler hiện `forest-source-body-motion-10`. Fingerprint visual mới invalidates hình cũ; narrative contract vẫn `prehistoric-story-contract-1` để không tự viết lại lời kể đã chốt. `productionReady=false`, `productionRig=null` giữ nguyên.

## Preview và chứng cứ

Mở [workbench](http://127.0.0.1:8850/api/topics/prehistoric-life/body?action=spear-thrust&timeMs=1800&mood=happy), chọn action và clock. Có link các mốc pose cho chạy/nhảy/đâm; input thời gian dùng bước 1 ms để nhập được 665/1175 ms. Mốc chạy trong link tính theo metrics Karo; actor khác cần clock theo lịch riêng.

Ảnh developer lịch sử **0.14**, không áp dụng cho anatomy mới và không phải nghiệm thu chuyển động: [chạy phải](reviews/karo-run-flight-v2.png), [chạy trái](reviews/karo-run-left-flight-v1.png), [nhảy thu chân](reviews/karo-jump-apex-v2.png), [rình quan sát](reviews/karo-hunt-stalk-v1.png), [giữ giáo](reviews/karo-spear-hold-v1.png), [đâm chạm target bị góp ý](reviews/karo-spear-thrust-contact-v2.png), [ngắm giáo](reviews/karo-hunt-aim-v2.png), [chạy giữ giáo](reviews/karo-hunt-chase-v1.png). Hash/phạm vi ở `reviews/source-action-pose-self-inspection-v1.json`. Các ảnh này giữ để đối chiếu, không ghi đè bằng bản sửa hoặc dùng để báo PASS.

## Công việc tiếp theo để săn thú thành một cảnh diễn thật

1. Dựng thân ba phần tư/profile/lưng đúng primary model. Một vai áo, tóc/râu và hai miệng ống quần phải giữ identity/viền/màu. Không mirror nguyên nhân vật khiến áo đổi vai; không gọi xoay mặt trên torso front là full-body turn.
2. Mỗi hướng chạy: contact trái/down/passing/up/contact phải/down/passing/up, cùng pivot và tỷ lệ, kiểm arm drive và chân xa/gần. Jump thêm squat, toe-off, tuck, contact, absorption; hunt thêm thấp người, quan sát dấu vết, ngắm, lấy đà, lunge, contact, recovery. Pose art làm chuẩn cho một rig liên tục; không crossfade nhiều ảnh toàn thân.
3. Rig con thú do câu chuyện yêu cầu, gồm head/ears/tail/torso và bốn chân, stance/swing/flight, xoay đầu, chuyển hướng và phản ứng. Dựng artwork/source provenance trước khi duyệt; không dùng một bitmap rung lên xuống để thay chạy. Đường chạy và sightline dùng cùng world/camera với diễn viên.
4. Mở rộng sourced `propBindings`, manipulation/action và story coverage cho giữ/đâm giáo; target có entity ID và world anchor từ model. Kiểm mũi/shaft/đầu tay trong camera ở mọi frame. Animal response phải có động cơ và clock phù hợp: phát hiện tiếng động có thể tránh trước khi đâm; phản ứng do tiếp xúc chỉ sau contact thật. Không buộc mọi cuộc săn phải trúng hoặc có cùng kết quả.
5. Đặt interaction gần/xa đúng lớp, lực dồn chân trụ, quay hông/vai, mắt nhìn thú hoặc bạn diễn, tóc/vạt theo sau. Không để cán xuyên tay/áo, mũi xuyên thú trước contact, foot slide, flip gối/khuỷu, smear/mất viền hoặc màu nhợt.
6. Kiểm đủ ba luồng với câu chuyện người dùng và narration có clock; continuity/resume/rebuild, nguồn/entity/identity/voice/subtitle/QC vẫn chặn final nếu thiếu. Chỉ mở guard sau review thật và test video, không từ screenshot hoặc build.

## Lệnh và môi trường bàn giao model test

Worktree triển khai: `C:/Users/Duongvh-pc/.codex/worktrees/stickman-acting-v22/Story-2-video-factory2.1`. Node ≥22.13, dependencies repo, HyperFrames/FFmpeg/Chromium theo cấu hình hiện có. Env dịch vụ thực tế ở `D:/github/Story-2-video-factory2.1/.env`; fixture dưới đây im lặng, không cần gọi model/TTS/ASR/9router.

```powershell
Set-Location -LiteralPath 'C:/Users/Duongvh-pc/.codex/worktrees/stickman-acting-v22/Story-2-video-factory2.1'
# Nếu Studio 8850 chưa chạy; giữ terminal mở, Ctrl+C để dừng:
./scripts/start-studio.ps1 -Port 8850 -SkipBuild -Watch -EnvFile 'D:/github/Story-2-video-factory2.1/.env' -ProjectsRoot './runtime/prehistoric-life/projects'

# Kiểm build/typecheck, không phải test chuyển động:
npm run build
npm run test:typecheck

# Model test thực hiện, model triển khai chưa chạy các lệnh này:
node --experimental-test-module-mocks --import tsx --test tests/forest-action-poses.test.ts tests/forest-walk.test.ts tests/forest-body.test.ts

# Fixture compiler → security allowlist/2MB → hash-check PNG gốc → HyperFrames validator → MP460fps:
foreach ($actor in @('lila','karo')) {
  foreach ($action in @('run','run-left','jump','hunt-stalk','spear-hold','spear-hold-left','spear-thrust','spear-thrust-left','hunt-aim','hunt-chase')) {
    node --import tsx scripts/forest-motion-fixture.ts --actor $actor --action $action --mood happy --render
    if ($LASTEXITCODE -ne 0) { throw "Fixture failed: $actor/$action" }
  }
}
```

Bỏ `--render` nếu chỉ cần stage HTML; tool vẫn biên dịch và kiểm scene, không phải ảnh pose đã xem. Output: `runtime/prehistoric-life/motion-fixtures/<actor>/<action>/<mood>/`, video `work/rendered.mp4`. Không sửa `max_scene_bytes` hoặc guard để chạy qua lỗi.

Model test kiểm full clock, random/reverse seek và evaluator/bake/render ở mỗi boundary ±1 ms, nhiều scale/duration/quãng đường/mood. Chạy phải có flight thật và stance không trượt; jump tuck chỉ thay chân, đặt lại đúng đế và hấp thụ. Với giáo kiểm hai grip/shaft/mũi, tip-aim tại contact, XYZ xương, thứ tự lớp, ownership, unreachable/bad-clock/legacy-version rejection. Kiểm warm texture, nét áo/quần, mặt/gaze, subtitle/camera vùng an toàn. Ghi riêng những FAIL và chưa có coverage. Có MP4 fixture không đồng nghĩa có cảnh săn hoặc ba luồng sản xuất đạt nghiệm thu.

Chỉ build/typecheck và ảnh tĩnh được model triển khai kiểm ở mốc này. Runtime tests, chạy fixture, render video, TTS/ASR và full story acceptance tiếp tục giao model khác theo yêu cầu.
