# Story actors implementation plan

**Goal:** Biến người que thành diễn viên đóng vai trong câu chuyện, tạo phim sinh động và giải thích trực quan, giữ ba luồng narration nguyên văn.

**Architecture:** Cast có nguồn và identity riêng → actorScene/choreography → compiler phân khớp và trang phục thụ động → HTML5/CSS/SVG/JavaScript chung một clock → HyperFrames/FFmpeg. Giọng ngoài hình không làm mọi diễn viên nói. Presenter chỉ là chế độ tương thích của project cũ.

**Tech stack:** TypeScript/Zod, SVG, GSAP, HTML5/CSS, HyperFrames, FFmpeg, Studio/Fastify. Runtime test giao model độc lập theo yêu cầu người dùng.

**Contract:** [STORY-ACTOR-DIRECTION.md](../../STORY-ACTOR-DIRECTION.md). Plan này thay vai trò người dẫn cố định của kế hoạch trước; không thay lời kể/clock hoặc xóa lịch sử evidence. Checked nghĩa source đã viết, không phải nghiệm thu.

## Task 1 — thống nhất sản phẩm và tài liệu

- [x] Bỏ người dẫn bắt buộc, quota xuất hiện và kích thước cơ thể trong các MD hiện hành.
- [x] Giữ script/WAV/SRT và WAV+SRT, nguyên văn, actual audio clock, failure gates.
- [x] Phân biệt đặc tả, code đã viết và evidence còn chờ trong README, BUILD-SPEC, trạng thái, kế hoạch, handoff.

Files: STORY-ACTOR-DIRECTION.md, STICKMAN-STORY-DIRECTION.md, OPEN-ART-DIRECTION.md, BUILD-SPEC.md, README.md, V2-IMPLEMENTATION-PLAN.md, TEST-HANDOFF.md, library/characters/*.md.

## Task 2 — cast, identity và trang phục

- [x] ActorDefinition: ID/tên/vai/kind/identity/sourceRefs/appearance/costume.
- [x] Nguồn tên người lịch sử; identity riêng giữ nguyên xuyên shot; không bịa tên hay claim.
- [x] Costume SVG thụ động gắn head/chest/pelvis/hands; preview dùng cùng skeleton/pose evaluator.
- [x] Sinh actor-cast/timeline và SVG/preview từng vai.
- [x] Cast editor/lock từng vai và output bundle chứa tạo hình đầy đủ đã viết.
- [x] Audit độc lập source21:89/89 ca cast/Studio/story actors và test:typecheck qua; resume giữ audio, locks và cast export được kiểm tra trong phạm vi ghi rõ.
- [ ] Nghiệm thu tổ hợp cache/resume/locks ngoài regression, model thật và video cuối.

Files: packages/actors/{schemas,model}.ts; packages/host/{schemas,profile,rig}.ts; packages/animation/rig.ts; packages/director/index.ts.

## Task 3 — nhiều diễn viên, voiceover và cắt cảnh

- [x] actorScene.primary nullable; supporting có performance/actions riêng.
- [x] speakingSegmentIds=[] để voiceover; phân speech activity theo cue được gán, không thêm lời.
- [x] Actor actions có source/clock/target/contact; phản ứng cơ cấu có thể do supporting actor thao tác.
- [x] Cut cho phép staging/cast mới; continuous kiểm tra cast/root/facing/scale.
- [x] Primary actor đặt mô hình có nguồn và contact thực; thao tác được ghi là minh họa. Handoff giữa actor/shot chưa hỗ trợ và báo lỗi rõ.
- [ ] Xem render thực: không khớp rời, trượt chân, ID collision, miệng nói theo voiceover hay crop hành động.

Files: packages/director/{creative,index,camera,schemas}.ts; library/shots/cinematic.ts; packages/explainer/storyboard.ts; packages/scenes/index.ts; packages/review/index.ts.

## Task 4 — trải nghiệm chung

- [x] createProject mới chọn stick-man/story-cinematic/actors; project cũ giữ tương thích.
- [x] Studio chọn actors/presenter, API presentation.character_mode; CLI configure --characters.
- [x] API đọc và download actor-cast/timeline qua contract chung.
- [x] Studio hiển thị cast/preview/role/source, mở editor và khóa vai; editor hiện là JSON, còn nghiệm thu trải nghiệm.
- [x] Đổi cast invalidates hình, giữ hash narration/audio; API lock/stale/busy được audit độc lập. HyperFrames mock trong regression resume.
- [ ] Nghiệm thu editor bằng trình duyệt và toàn bộ render sau edit.

Files: packages/orchestrator/{index,settings,pipeline}.ts; apps/server/{contracts,artifacts,index,cinematic}.ts; apps/studio/src/{main,cinematic}.ts; apps/cli/index.ts.

## Task 5 — phim thực tế và nghiệm thu độc lập

- [ ] Bài hơi nước: người nghiên cứu/thợ/nhà phát minh có nguồn, quan sát vấn đề nhiệt, tách nơi nóng/lạnh; không thành slideshow giáo viên.
- [ ] Bài ô tô: những người chế tạo/sử dụng trong tình huống có nguồn; nguyên lý và tiến trình rõ.
- [ ] Ví dụ Tesla chỉ khi input có Tesla; tạo vai riêng, hoàn cảnh/thử nghiệm/nguyên lý đúng nội dung.
- [ ] Dựng và xem phim đủ giọng, chuyển động, biểu cảm và nhịp; ghi authored/model/offline đúng nguồn.
- [x] Regression độc lập:145/145 tay/actors/API; full npm suite403/403 và test:typecheck0, exact fingerprints và lịch sử đỏ được giữ.
- [ ] Media matrix TEST-HANDOFF trên snapshot actors hiện tại, nguồn/clock/audio và lỗi được nghiệm thu riêng.

Commands: npm run build; npm run typecheck. Model độc lập: node --import tsx --test tests/story-actors.test.ts; npm run test:typecheck; npm run test:cinematic-inputs. Chỉ mở rộng suite khi failure hoặc source mới cần xác minh.

## Bổ sung narration đa ngôn ngữ và TTS local

- [x] EN/VI/JA/KO trong Studio/API/CLI; catalog Windows theo culture; preset theo ngôn ngữ, Japanese segmentation và font fallback.
- [x] Local OmniVoice Studio/VoiceStudio, compatible speech API và custom HTTP field mapping/model/options; cùng pipeline script/SRT, giữ WAV đầu vào.
- [x] Build/typecheck và contract/hướng dẫn cấu hình API local.
- [x] Model độc lập: vòng đầu437/442 FAIL5 giữ lịch sử; sau sửa40/40 TTS +33/33 regression liên quan PASS, test:typecheck0. EN Windows audio thật5323ms có clock/text/cache, không đồng nghĩa nghiệm thu toàn phim.
- [ ] Live backend OmniVoice/JA/KO/Azure khi được cấu hình; nghe phát âm và kiểm tra toàn video.

## Task 6 — bàn giao

- [ ] Build/typecheck cuối, đủ evidence thực tế và danh sách giới hạn.
- [ ] Studio dùng được trên phiên bản mới, project người dùng được giữ.
- [x] Runtime snapshotb7f94e6 trên codex/stickman-acting-v22 đã cập nhật GitHub; remote SHA khớp local. Đây là nhánh review, không phải chứng nhận release.

Không đóng plan bằng một demo, một MP4 DONE hoặc suite presenter cũ. Chất lượng cần xem/nghe video, gồm diễn biến, cảm xúc, contact/cut, nguyên lý và phụ đề.
