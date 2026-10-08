# Biểu cảm trên đầu nguồn riêng — source0.61

Mục tiêu nguyên vẹn: câu chuyện bất kỳ → kịch bản; hoặc kịch bản nguyên văn; hoặc WAV giữ giọng → hai diễn viên trong câu chuyện, quần chúng khi có nguồn → video sinh động có giọng, phụ đề và QC. EN chính, VI/JA/KO, TTS local/HTTP/command, resume, lock và rebuild vẫn phải nghiệm thu. Phần dưới triển khai biểu cảm cho đầu riêng; **chưa phải toàn factory dùng được**.

## Thay đổi sản phẩm

Trước đây đầu riêng bank3/4 có audio mouth/target eyes nhưng không có biểu cảm khác mặt nghỉ. Storyboard angry/sad/surprised bị chặn. Không thể chữa bằng cách thêm `bodyExpressions`: tọa độ đó thuộc một ảnh đầu khác.

Source0.61 thêm **bank5 + face2, chọn tường minh**. Hai Lila/Karo, mỗi người cả góc trái và phải, có definition riêng trên **PNG hiện có, giữ nguyên byte**. Bank1–4/face1 và sáu definition cũ không được nâng capability hay sửa tọa độ. Mẫu nữ phụ và nam phụ sạch tóc/râu không thay. Quần chúng **chưa có definition biểu cảm mới**; chọn mode đó phải báo thiếu, không mượn mặt chính. Contract bank5 cho phép nguồn quần chúng riêng khi có đủ registration, không suy ra từ trang phục.

- Mặt nghỉ happy giữ nét nguồn: miệng/mắt/brow overlay phản ứng không che lại mặt khi không có phản ứng/audio/gaze/blink. Karo dùng đúng closed-mouth plate riêng vốn đã đăng ký; Lila giữ nụ cười kín nguyên bản.
- Miệng có curve flat/frown riêng theo tọa độ nguồn, phối với nụ cười nguồn; aperture chỉ do speech activity. Silence có thể có nét miệng buồn nhưng không sinh cửa miệng nói. Round chỉ thu hình miệng khi audio đang mở. Không gọi RMS/segment activity là phoneme lip-sync.
- Brow lấy nét raster từ chính cell, có pivot/erase/skin-strip/region riêng; chỉ xoay và dịch local glyph. Mũi, đầu, tóc và toàn mặt không warp. Kiểm toàn khoảng góc bằng extrema analytic, không chỉ hai endpoint. Eye closure đi cùng blink/target eyes hiện có; không phóng to glyph để giả vờ có mắt mới.
- Face đọc **complete original actor-expression clock**, blend theo nhịp hiện có và trở về mặt nghỉ của cell. Đổi camera, primary actor, seek hoặc restart shot không được reset biểu cảm. Physical head/body/eye target vẫn dùng clock và nguồn hiện hành.
- Compiler refine cả mouth paths, eye/lid matrices và **brow matrices** theo source pixels và scale vật lý. Selector/resource/fingerprint ổn định, thay nguồn/definition/mood làm đổi binding.
- Painter của face2 xóa nét cũ rồi mới vẽ nét local chuyển động; không fade hai mắt/brow/miệng chồng nhau. Compiler set các nhóm repair/paint theo frame, còn glyph matrices và paths chuyển liên tục. Happy rest vẫn giữ native paint. Nét/sự chuyển painter thật vẫn cần kiểm video.
- Nối vào renderer factory hiện có qua `body-head-bank.ts`/`compiler.ts`, không chỉ gallery. Tracer hội thoại hai người giữ năm cut, cả hai cách bố trí, original seat/walk/gaze và reaction histories. Mode mới phải chọn `--face expressions`; không tự promote bank3.

## Source và môi trường

| Phần | File |
|---|---|
| Contract/geometry/local paint | `packages/animation/native-head-face.ts`, `native-head-bank.ts`, `native-head-identity.ts` |
| Bank → SVG/state → factory compiler | `packages/animation/body-head-bank.ts`, `compiler.ts` |
| Chọn đúng actor/view/mode | `packages/topics/head-face-candidates.ts`, `head-face-source.ts` |
| Studio preview cùng scene compiler | `packages/topics/head-face-workbench.ts`, `apps/server/index.ts` |
| Hai diễn viên/camera cuts | `packages/topics/native-dialogue-candidates.ts`, `benchmarks/native-seat-tracer.ts`, `scripts/native-seat-tracer.ts` |
| Definition mới | `library/topics/prehistoric-life/head-face-registrations/{lila,karo}-{left,right}-emotions-v1.json` |
| Ca test khai báo | `tests/native-source-emotions.test.ts` |

Node >=22.13; máy triển khai đọc được Node24.19.0, npm từ `C:/Program Files/nodejs/npm.ps1`, ffmpeg/ffprobe ở `C:/ffmpeg/bin`. GSAP/Sharp/tsx theo lockfile dự án. PNG tham chiếu và local resources phải còn nguyên hash. Không cần gọi 9router/TTS để kiểm source-face geometry hoặc tracer im lặng. Render cần HyperFrames/browser/ffmpeg của dự án. Kiểm audio thật cần WAV khớp kịch bản và các clock thật; không dùng một WAV bất kỳ để tuyên bố đồng bộ nội dung.

**Lệnh runtime dưới đây chỉ dành cho model test của người dùng. Model triển khai không chạy chúng, kể cả tracer `--help`.** Server8850 ở checkout D không tự nhận source C. Không reset/copy đè D hoặc projects của người dùng.

```powershell
Set-Location -LiteralPath 'C:/Users/Duongvh-pc/.codex/worktrees/stickman-acting-v22/Story-2-video-factory2.1'
git rev-parse HEAD
$env:STUDIO_PORT='8861'
$env:STUDIO_PROJECTS_ROOT='C:/Users/Duongvh-pc/.codex/worktrees/stickman-acting-v22/Story-2-video-factory2.1/runtime/source-emotions-test-projects'
npm run studio
```

Mở `http://127.0.0.1:8861/api/topics/prehistoric-life/head-faces?actor=lila&view=three-quarter-left&face=expressions&mood=sad&action=think&look=ahead`. Chọn cả bốn actor/view pair, mọi mood của UI, full/second-half. Scene biểu cảm có path riêng chứa `/expressions/<mood>/` và revision riêng. Bank mặc định `speech-eyes` giữ definition cũ. Quần chúng/mood chưa có nguồn phải lỗi rõ. Ctrl+C dừng server trong terminal đó.

```powershell
node --experimental-test-module-mocks --import tsx --test --test-concurrency=1 tests/native-source-emotions.test.ts tests/native-head-face.test.ts tests/head-face-workbench.test.ts tests/native-head-bank.test.ts tests/native-head-bank-sources.test.ts tests/native-seat-tracer.test.ts tests/supporting-native-head.test.ts tests/topic-cast-source.test.ts
npm run tracer:native-seat -- --native-heads --face expressions --acting emotional-reactions --staging lila-left --validate --frames --render
npm run tracer:native-seat -- --native-heads --face expressions --acting emotional-reactions --staging lila-right --validate --frames --render
```

Tracer tạo thư mục runtime mới, vẫn diagnostic silent SRT nếu không có WAV. Không TTS giả, không final/DONE. Đừng bỏ `--validate`, bỏ actor/acting/source/gaze hoặc tăng giới hạn scene2MB để làm ca pass. Nếu compilation/geometry/art lỗi, ghi FAIL đúng nguyên nhân và giữ bằng chứng; không đổi câu chuyện để hợp capability.

## Bằng chứng hiện có và giới hạn

Model triển khai chỉ đọc/sửa source, build/typecheck, export schemas và kiểm bytes/manifest/raw RGBA. **Không chạy test callback, geometry validator, builder, compiler/sampler, server/browser, pipeline, TTS/ASR hoặc video.** Build/typecheck không chứng minh hình ảnh hoặc độ mượt.

Các vùng glyph/erase/brow travel/curve mới là **tọa độ engineering được tác giả khai báo, chưa validate**. Hai vùng lấy màu Karo ban đầu có điểm tối đã đổi sang ROI riêng mới. [Raw strips v1](reviews/native-source-emotions-raw-strips-v1.json) giữ lịch sử; [v2](reviews/native-source-emotions-raw-strips-v2.json) đọc 12 ROI đúng nguồn, không pixel transparent hoặc RGB sum<160. Karo sampling màu nâu của chính closed-mouth plate, Lila sampling da của chính cell. Số đếm **không chứng minh** màu patch khớp, mask tách đúng tóc/brow/da hoặc hình ghép đẹp.

[Review 9router và disposition](reviews/native-source-emotions-source-review-v1.json): một request source-only GPT Luna, cap2.200, không retry/auto-apply. Review không là test hoặc duyệt art. Frozen input giữ nguyên byte khi source được chỉnh sau review. [Record kiểm source](reviews/native-source-emotions-source-record-v1.json) ghi command/exit/byte evidence; mọi runtime/geometry/video status vẫn NOT RUN.

## Nghiệm thu bắt buộc

11 callbacks mới chỉ **khai báo, NOT RUN**: bốn definition real-source và legacy; gates nguồn/version/capability; hull/strip/protected paint; native happy rest/silent closed mouth; mixed smile/frown/round/aperture; SVG exact IDs; whole/slice/seek cùng mouth/look/hand; compiler brow interpolation; hai actor qua canonical camera cuts; mode/mood/revision/missing extras; Studio routes thực. Typecheck không thực thi callback nào.

Model test cần ghi exact Git SHA, command/exit, PASS/FAIL/NOT RUN, source hashes, stills trên thân và video ở tốc độ thật:

1. Chạy geometry của bốn definition. Kiểm glyph/erase/strip/travel/source/crop/skin/protected paint bằng **ảnh ghép thật**. Không chứng nhận tọa độ chỉ từ model advice hoặc static RGB.
2. Happy giữ mắt/mũi/miệng ảnh nguồn. Sad/angry/surprised/afraid/tired/relieved khác nhau rõ nhưng không nghiêng/vẹo toàn mặt, cắt tóc hoặc xóa râu. Kiểm mọi mood UI, không chỉ happy. Không double ink khi overlay blend in/out. Mouth patch của Karo không thành một mảng nâu lộ seam.
3. Miệng khép khi im lặng, opens theo đúng speaker activity; mắt hướng đúng bạn diễn. Cả actor đang nghe và đang nói giữ nhịp biểu cảm; image gallery không chứng minh điều này.
4. Across cut/primary change, original expressions, head/body/hand/speech/gaze không reset. Random/reverse seek cho kết quả tương ứng. Tracer phải qua **cùng** `renderCinematic`/master renderer, còn dưới scene limits, cả hai staging. Không dùng standalone face scene thay nghiệm thu canonical film.
5. Regression banks1–4/fixed-body face, source cast normalization, actor locks và old URL/resource strictness. Invalid sources, stale revisions, foreign actor, missing capabilities phải chặn rõ.
6. Sau phần mặt, vẫn cần full head/body turns/profile/rear art, neck painter masks, mềm tay/chân, hair/cloth, tool/prop/handoff/contact, world day/sunset/night, supporting own emotions và **toàn story/script/WAV → voices EN/VI/JA/KO → final/audio/subtitle/QC/resume**. Chưa thay bất cứ yêu cầu nào bằng tracer, fixed happy cast hoặc kể về máy móc/món ăn bắt buộc.

`productionReady=false`, `productionRig=null`, `availableBanks=[]` giữ nguyên. Chỉ được mở production sau nghiệm thu đầy đủ nguồn tạo hình/chuyển động và luồng sản phẩm; không mở để chạy một ca hẹp.
