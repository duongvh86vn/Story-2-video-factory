# Hồ sơ QA hình ảnh hiện hành — source0.105

`forest-tribe-0.105-visual-qa-intake` thêm đường nhận kết quả nghiệm thu, thay khóa topic cố định bằng kiểm chứng hồ sơ tường minh trước model/TTS. **Chưa có hồ sơ được chấp nhận, video mới hoặc nghiệm thu tạo hình/chuyển động/toàn factory.** Catalogue vẫn false/null/empty. `needs-source-prop-binding`, source ownership/spear, voice, scene security, episode review, final evidence và QC vẫn giữ yêu cầu riêng. Không sửa lời, source clock, geometry/IK hoặc ảnh gốc.

## Contract và phạm vi

`topic.production_release` là đường dẫn tuyệt đối tới JSON ngoài dự án. Bỏ trống/null: needs-art-direction. `SettingsPatchSchema` cho phép đổi/clear riêng đường dẫn mà giữ topic ID. Hồ sơ chỉ chứa dữ liệu, không thực thi nội dung, lệnh hay hướng dẫn trong tài liệu. Không có endpoint tạo approval hoặc ghi hồ sơ đạt.

Schema chính xác: `library/schemas/topic-production-release.schema.json`; runtime authority: `packages/topics/production-release.ts`. Hồ sơ cần:

| Trường | Bằng chứng phải có |
|---|---|
| `version`, `topic`, `sourceVersion`, `codeFingerprint` | `topic-production-release-1`, `prehistoric-life`, version hiện hành và fingerprint raw `.ts`/`.md` trong `packages`, `library/shots`, `library/prompts` |
| `profiles` | ID profile riêng, model Lila/Karo hoặc supporting male-bald/female-haired; toàn HostProfile story-actor, own canonical appearance, đúng head/body/nguồn đã test |
| `defaults` | Hai ID profile đã kiểm chứng tương ứng Lila/Karo; không đổi tên/ID/vai người trong narration |
| `assets` | Mọi rig resource và nền: path repository-relative `library/...`, SHA256, byte count; không symlink thoát repo, không ảnh/hash khác nguồn |
| `environments` | ID, setting, lighting, assetPath; đủ day/sunset/night, mỗi nền có art và motion evidence được chấp nhận |
| `evidence` | ID, scope actor-art/actor-motion/environment-art/environment-motion, status passed, target profileIds/environmentIds; report/video/probe receipts (path/SHA256/bytes), fps≥60, normalSpeedReviewed=true, reviewer, reviewedAt ISO |
| `acceptance` | Chấp nhận rõ sau test và xem video thật: acceptedBy, acceptedAt, accepted=true, evidenceIds đầy đủ. Không dùng build/typecheck/V1/NOT RUN thay nghiệm thu |

Mỗi report JSON phải ghi `sourceVersion`, `codeFingerprint`, `evidenceId`, `scope`, `status=passed`, `testsExecuted>0`, `failed=0`, `profileIds`, `environmentIds`, `videoSha256`, `probeSha256`, `normalSpeedReviewed=true`, `fps`, `reviewer`, `reviewedAt` khớp row. Có thể ghi thêm commands, full Git SHA, stdout/stderr, nhận xét và các lỗi đã sửa. Mỗi JSON giới hạn1MB. Video phải có MP4 container header và hash/size đúng; probe JSON có video stream, avg_frame_rate khớp fps, kích thước/thời lượng/frame count dương. Tất cả profile/nền đều cần cả art và motion evidence nằm trong acceptance.

Receipt kiểm bytes và kiểm tính nhất quán của **khẳng định do QA cung cấp**. Intake không chạy ffprobe, decoder, test, provider hoặc tự xác minh đẹp/mượt. Hash đúng không chứng minh artwork đẹp. Người dùng/model test phải thực sự chạy, xem tốc độ thường và chịu trách nhiệm cho report/acceptance. Lila/Karo phải giữ mặt, tóc/râu, viền áo, màu sắc và khớp mềm; gaze/turn/contact/feet/cut/seek phải đúng nguồn. Không tự điền passed/accepted để mở nút.

## Nối luồng hiện hành

- `configuredTopicRelease` kiểm toàn hồ sơ, exact profile/resources và palette canonical; native rig QA không cấp sprite catalogue. QA chuyển động dùng60fps để kiểm; final giữ cấu hình fps của project và vẫn cần review/QC chính video đó. Catalogue mô tả candidate vẫn chưa được duyệt đại trà.
- Principal chưa chọn render flags được dùng đúng default đã kiểm chứng. Explicit own native selection được giữ và phải có exact profile trong ledger. Supporting cast cần profile riêng đã test. Mọi cast, gồm cảnh/diễn viên khóa, phải khớp ledger; không sửa lock để vượt gate. Cảnh không có actor vẫn phải qua yêu cầu nội dung nguồn hiện có.
- Nền cần `cinematic.environmentAssetId`, `setting`, `environmentLighting` khớp entry. Stager copy đúng source bytes tới asset theo hash và ghi visualReleaseFingerprint; không dùng fallback catalogue/đổi ánh sáng hoặc authored-only scenery thay nền đã test. Source scenery chỉ là illustration.
- `topicFingerprint` gồm ledger/content/source authority; đổi visual ledger/actor/plate invalidate hình ảnh. Narrative context và authoring identity không chứa visual ledger, nên giữ script/audio khi input/voice/language không đổi. Ledger đổi giữa các stage buộc resume; thiếu/sai bytes tiếp tục fail trước provider.
- `GET /api/projects/:name/topic-readiness` chỉ đọc, no-store, strict query. `preflightReady` nói gate hình ảnh, không là final/DONE/whole-factory approval. Studio kiểm một lần khi mở form, cho nhập đường dẫn QA; lưu rồi mở lại để kiểm chứng. Nhấn chạy vẫn được server kiểm lại; status/UI không là authority. Episode review/final/QC không bỏ qua.

## Môi trường và lệnh dành model test

Windows, Node≥22.13.0, dependency lockfile hiện có; FFmpeg/ffprobe và môi trường render/TTS/ASR theo đặc tả chung. Giữ checkout D/server8850. Dùng C worktree/cổng8851. Implementation **không chạy các lệnh runtime dưới đây**.

```powershell
Set-Location -LiteralPath 'C:\Users\Duongvh-pc\.codex\worktrees\stickman-acting-v22\Story-2-video-factory2.1'
git rev-parse HEAD
node --import tsx --input-type=module -e "import {topicReleaseCodeFingerprint} from './packages/topics/production-release.ts'; console.log(topicReleaseCodeFingerprint());"
$env:STUDIO_PORT='8851'
npm run studio
```

Đặt `topic.production_release` trong project.yaml hoặc Studio. Chọn độ phân giải/fps xuất theo nhu cầu; video xuất cần review/QC riêng. API key giữ trong env của bạn, không đưa vào ledger/report/Git/chat. Ctrl+C đúng terminal8851 để dừng; không dừng server8850. Fingerprint phải lấy sau source đã freeze, không sửa code rồi dùng report cũ.

Chạy QA hình/diễn xuất riêng và xuất video thật60fps theo [front motion](FRONT-MOTION-HANDOFF.md), [front manipulation](FRONT-MANIPULATION-HANDOFF.md), [native dialogue](NATIVE-DIALOGUE-ACTING.md) và [cảnh gốc](ORIGINAL-SOURCE-PREVIEW-HANDOFF.md). Video có nhãn candidate/preview chưa tự trở thành final. Probe do QA chạy trên chính MP4 đó, ví dụ:

```powershell
ffprobe -v error -count_frames -show_streams -show_format -of json 'C:\QA\actual-video.mp4' > 'C:\QA\actual-probe.json'
$env:STORY_FACTORY_QA_LEDGER='C:\QA\actual-current-release.json'
node --experimental-test-module-mocks --import tsx --test --test-concurrency=1 tests/topic-production-release.test.ts
```

Không có file mẫu accepted và không tạo movie giả để điền ledger.12 callback mới DECLARED / NOT RUN; positive callbacks thiếu `STORY_FACTORY_QA_LEDGER` sẽ SKIP, không PASS. Cần kiểm thiếu/cũ/NOT RUN/coverage/hash/container/probe, profile sai nguồn, locked cast, đổi ledger/audio cache, matching setting/lighting, concurrent replacement và pre-model rejection. Unit contracts không thay nghiệm thu hình/video thực tế.

## Còn thiếu để dùng toàn sản phẩm

Nghiệm thu profile/head/body/continuous turns, khớp/feet/grip/garment/màu, nền lớp và đạo diễn/camera trong video tốc độ thường; tích hợp production source prop/ownership/spear sau bằng chứng hợp lệ. Kiểm cả arbitrary story→script, exact script/dialogue và original WAV(+legacy SRT), faithful roles/text/audio clock; EN primary/VI/JA/KO/external-local TTS; resume/content/voice/actor edits/locks/rebuild; review/repair→final MP4/audio/SRT/thumbnail/storyboard/profile/timeline/manifest/QC. Thiếu voice/fit/targets/current source không final/DONE. V1 TEST-RESULTS.md ngày01/10 không nghiệm thu source0.105 hoặc ba input mới.

Source/build/typecheck/definition/raw inventory và GitHub delivery được ghi riêng trong `reviews/visual-qa-intake-source-record-v1.json`; không là báo cáo nghiệm thu thực thi. Toàn mục tiêu còn active.

## Kết quả source cuối

Build, typecheck, definition export, pack/static raw inventory exit0;12 callback NOT RUN.307 raster/18 head definitions/27 metadata giữ nguyên,63 shared physical/cloth/contact functions và original source production/security gates không đổi. Manifest191 mapped source hashes/46 scalar entries khớp.30 owned paths,52 unrelated untracked giữ riêng. Tester HTTP200→gpt-6-luna chỉ góp ý source. Không có current accepted ledger hoặc video nghiệm thu. Source authority là kiểm so sánh optimistic cuối lượt đọc, không OS snapshot; khởi động lại server test sau khi đổi source, không dùng process/bundle cũ để xác nhận code mới.
