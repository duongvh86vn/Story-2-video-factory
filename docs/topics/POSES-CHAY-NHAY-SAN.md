# Lila/Karo: chạy, nhảy và diễn hành động săn

Mốc 0.14, ngày 07/10/2026. Đây là bộ điều khiển chuyển động ứng viên cho đúng hai model da ấm, tóc nâu, áo một vai và nét tay/chân đen từ ảnh đã gửi. Không đổi thành người dẫn hoặc gán một câu chuyện săn cố định. Ba input vẫn là kịch bản nguyên văn, WAV giữ lời/clock giọng gốc, và câu chuyện → kịch bản trung thành → narration → video.

## Các action đã thêm trong source

| Action workbench | Nội dung hiện có | Phần còn thiếu |
|---|---|---|
| `run`, `run-left` | Trụ → nén → đẩy → bay → đặt chân; root liên tục, chân trụ giữ tọa độ nền, tay gập đánh trước/sau; dừng về hai chân | Artwork thân nghiêng, stride/heel/toe, động lực và nghiệm thu chu kỳ |
| `jump` | Lấy đà → bật → thu chân trong pha bay → tiếp đất → hấp thụ; tay cùng clock | Jump nhiều hướng, nhảy tiến/qua vật, toe roll và thứ tự lớp gần/xa |
| `hunt-stalk` | Quan sát/cúi → đứng lại → bước ngắn → cúi/quan sát tiếp | Đi khom liên tục và chạm cây/bụi, dấu vết thật trong cảnh |
| `spear-hold` | Hai tay giữ chung cán giáo bằng IK; giáo ở trên áo và dưới bàn tay | Pose giữ giáo dọc/ngang nhiều hướng, tiếp cận/nhặt/chuyền |
| `spear-thrust` | Giữ → lấy đà → đưa giáo → chạm world target → giữ ngắn → thu giáo | Gắn target với entity con thú/vật và source/action contract trong storyboard |
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

Body compiler `forest-source-body-motion-9`. Fingerprint visual mới invalidates hình cũ; narrative contract vẫn `prehistoric-story-contract-1` để không tự viết lại lời kể đã chốt. `productionReady=false`, `productionRig=null` giữ nguyên.

## Preview và chứng cứ

Mở [workbench](http://127.0.0.1:8850/api/topics/prehistoric-life/body?action=spear-thrust&timeMs=1800&mood=happy), chọn action và clock. Có link các mốc pose cho chạy/nhảy/đâm; input thời gian dùng bước 1 ms để nhập được 665/1175 ms. Mốc chạy trong link tính theo metrics Karo; actor khác cần clock theo lịch riêng.

Ảnh developer tĩnh, không phải nghiệm thu chuyển động: [chạy phải](reviews/karo-run-flight-v2.png), [chạy trái](reviews/karo-run-left-flight-v1.png), [nhảy thu chân](reviews/karo-jump-apex-v2.png), [rình quan sát](reviews/karo-hunt-stalk-v1.png), [giữ giáo](reviews/karo-spear-hold-v1.png), [đâm chạm target](reviews/karo-spear-thrust-contact-v2.png), [ngắm giáo](reviews/karo-hunt-aim-v2.png), [chạy giữ giáo](reviews/karo-hunt-chase-v1.png). Hash/phạm vi ở `reviews/source-action-pose-self-inspection-v1.json`. Không có static/model PASS hoặc video PASS mới.

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
  foreach ($action in @('run','run-left','jump','hunt-stalk','spear-hold','spear-thrust','hunt-aim','hunt-chase')) {
    node --import tsx scripts/forest-motion-fixture.ts --actor $actor --action $action --mood happy --render
    if ($LASTEXITCODE -ne 0) { throw "Fixture failed: $actor/$action" }
  }
}
```

Bỏ `--render` nếu chỉ cần stage HTML; tool vẫn biên dịch và kiểm scene, không phải ảnh pose đã xem. Output: `runtime/prehistoric-life/motion-fixtures/<actor>/<action>/<mood>/`, video `work/rendered.mp4`. Không sửa `max_scene_bytes` hoặc guard để chạy qua lỗi.

Model test kiểm full clock, random/reverse seek và evaluator/bake/render ở mỗi boundary ±1 ms, nhiều scale/duration/quãng đường/mood. Chạy phải có flight thật và stance không trượt; jump tuck chỉ thay chân, đặt lại đúng đế và hấp thụ. Với giáo kiểm hai grip/shaft/mũi, tip-aim tại contact, XYZ xương, thứ tự lớp, ownership, unreachable/bad-clock/legacy-version rejection. Kiểm warm texture, nét áo/quần, mặt/gaze, subtitle/camera vùng an toàn. Ghi riêng những FAIL và chưa có coverage. Có MP4 fixture không đồng nghĩa có cảnh săn hoặc ba luồng sản xuất đạt nghiệm thu.

Chỉ build/typecheck và ảnh tĩnh được model triển khai kiểm ở mốc này. Runtime tests, chạy fixture, render video, TTS/ASR và full story acceptance tiếp tục giao model khác theo yêu cầu.
