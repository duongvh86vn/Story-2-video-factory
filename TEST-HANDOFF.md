# Bàn giao test — ba luồng và diễn viên trong câu chuyện

Hai bản ô tô được dàn cảnh lại đã terminal0/DONE/QC kỹ thuật, giữ script/narration/WAV bytes; [provenance, các iteration lỗi và bản cuối](docs/validation/2026-10-03-car-workshop-production.md). Kiểm tra toàn phim về walk/lean/contact/model-response/recovery, biểu cảm, nhãn/qualifier, chuyển cảnh và lời kể với cả người que và robot. Parent chỉ xem khung hình để sửa artwork; không dùng kết quả này làm PASS cho native creative, input matrix hoặc live local TTS.

Diagnostics CLI thêm sau audit đã qua: [scope mới NOT RUN](docs/validation/2026-10-03-cli-diagnostics.md). Test fake captures cho phân loại lỗi, timeout progress, secrecy, stop auto fallback/resume/explicit recovery và local journal failure; giữ regression Codex/Claude/model/retry. Worker readiness native bị quota trước khi chạy, chưa có small-call result. Không dùng92/92 trước đó làm PASS cho sửa diagnostics mới.

Cập nhật03/10: [audit hiện tại](docs/validation/2026-10-03-current-runtime.md) đã chạy acting64/64, regression135/135 và pristine migration17/17. Retry FAIL thiếu completion marker đã sửa; independent rerun36/36 targeted,92/92 broad, whole test:typecheck và compiled proof qua với assertions giữ nguyên. Các đoạn NOT RUN phía dưới là checkpoint lịch sử. Bộ test mới vẫn cần browser SVG và xem/nghe phim; mock HTTP PCM không chứng minh live local TTS/OmniVoice hoặc phát âm EN/VI/JA/KO.

Ưu tiên mới03/10: [follow-up renderer migration thật](docs/validation/2026-10-03-renderer-language.md) trên d882 **FAIL** ở host approval và đã thay hai rig artifacts; giữ raw evidence và fixture lỗi. Source mới tách rig identity khỏi animation. Audit lại bằng bản sao baseline xác thực, giữ input/config/voice/locks, tách việc giữ host approval, rebuild unlocked scene và conflict locked-plan; không force approval hoặc retag artifact cũ để báo PASS. Current-source runtime của sửa rig/body/hai tay/carry/seated vẫn NOT RUN; 275 test scoped trước đó không thay nghiệm thu mới. [Review phim](docs/validation/2026-10-03-film-quality.md) có finding thật về chú thích và độ rõ hành động; finding Benz7sreset đã rút lại bằng khung hình PTS/GSAP. Xem/nghe hai bài với cả người que và robot ở bản dàn cảnh mới trước nghiệm thu; không dùng DONE/QC làm bằng chứng thẩm mỹ.

Contract hiện tại03/10/2026: [STORY-ACTOR-DIRECTION.md](STORY-ACTOR-DIRECTION.md), director2.2.22, animation2.2.10, physical-seat2.2.1, bound-model-motion2.2.1, host-rig-identity2.2.1; artwork2.2.4 và host compiler2.2.7. Runtime test giao model độc lập theo yêu cầu người dùng. Ghi commit/diff fingerprint thực tế, command/exit, PASS/FAIL/NOT RUN, input tối thiểu và evidence; không lấy V1/presenter source18 làm nghiệm thu mới.

## Tiếp tục sau lỗi dịch vụ model — runtime NOT RUN

[Explicit model retry](docs/validation/2026-10-03-explicit-model-retry.md): Studio/CLI/API cho phép thử lại request đã kết thúc lỗi bằng cycle mới có `retryOf`, giữ journal/cost/call totals và global limits. Normal resume không reset budget; pending không được coi như lỗi; mỗi hash chỉ restart một lần trong invocation. Kiểm fatal/fallback/attempt exhaustion, journal marker integrity, legacy/redaction, API boolean/busy, CLI/UI, lock/approval và narration cache. Không dùng quota/account khác để bypass hạn mức. Feature này không reset review/scene repair budgets hoặc chứng nhận TTS backend thật.

## Nhấc–mang–đặt trong production — test NOT RUN

Fingerprint `bound-model-motion-2.2.1`; [chi tiết](docs/validation/2026-10-03-bound-model-motion.md). Kiểm cả người que/robot, cả tay, nonzero gripOffset, source/binding/action owner và clock. Gesture destination là grip, prop destination là tâm: sai center hoặc nhầm tay phải lỗi. Carry đi trong cửa sổ sau250ms lift/trước250ms lowering, về stand trước khi đi; final có release/recovery và support đúng đáy vật. Target cố định vào vật sau pickup, supporting attachment, joint moving prop, sequential pickup và entering/unreleased/cross-cut carry phải bị chặn rõ.

Kiểm nhãn/thermal/emphasis/energy/shadow và relation endpoints trong Scene JS thật cùng prop, kể cả flow event trong lúc vật đang đi, reverse/random seek và close camera với actions hai tay xen kẽ. Không mở whitelist attr/d hoặc thực thi code của model để làm test qua. Static relations và standalone preview support cũ giữ behavior. Fingerprint chỉ dựng lại hình; resume corrected migration fixture giữ nguyên giọng/audio/cache/request count/locks. Producer measurements/DONE/QC của artist film không phải independent PASS; xem/nghe toàn phim riêng.

## Hai tay — source9, runtime NOT RUN

- Cả hai rig: left point/think/operate/pick-place/carry/react, đồng thời right gesture khác; overlap cùng tay và duplicate gesture ID lỗi. Bỏ hand giữ behavior rig-right cũ; version7/8 không nhận hand data version9.
- Held point qua nhiều cue không reset dù action tay khác chen giữa; compare giữ thứ tự target; Studio và geometry ghi đúng tay/target. Actual GSAP seek/reverse/random giữ xương và contact, không chỉ sample thuần.
- `idle` không hand chặn mọi arm gesture; idle có hand cho phép tay kia diễn. Body/feet/gaze một kênh không chồng do hai action đồng thời; seed bilateral dùng attention ưu tiên right rồi left khi không có gaze riêng.
- ContactRequired + contactActorId/contactHands: đủ hai tay của cùng một diễn viên, đúng part/clock trước event. Thiếu một tay, sai actor/target, contact sau event, duplicate hands, metadata trên event không contact đều lỗi. Control turn không xảy ra trước gate; controlMode none không sinh tay quay máy.
- Prop: entry grip đúng hand, một prop không có hai owner đồng thời, hai prop không cùng một model; origin/grip/destination đúng. Một primary placement bằng left được dựng thực. Sequential placement/handoff/supporting attachment/cross-cut hoặc tay khác contact moving bound model phải chặn rõ.
- Exact migration corrected fixture và audio/cache/locks vẫn pending; không dùng build hay artist DONE/QC chứng nhận. Xem/nghe bản hai tay và cả hai bài/hai kiểu tạo hình; [phạm vi](docs/validation/2026-10-03-bilateral-acting.md).

## Tư thế và đi lại tự nhiên — source mới, test NOT RUN

Build source animation2.2.8 qua; đây không phải runtime acceptance. Model test đang hết hạn mức, không dùng 275 scoped test của source trước để chứng nhận body track/idle. Kế hoạch kiểm tra:

- Cả hai rig: crouch/lean → giữ qua cue → stand; điểm chân giữ, xương không đổi chiều dài, không tách khớp; xem chuyển động thật và public samples/GSAP seek/reverse/random.
- Clip ngắn hơn280ms, overlapping, NaN/Infinity, intensity ngoài0–1 hoặc lean ngoài±25 phải bị từ chối. Đi trong lúc đang cúi/nghiêng hoặc transition phải bị từ chối; đi sau khi đứng xong phải chạy.
- `idle` trong cinematic không có gesture/target/contact. Đi với idle không bị đổi thành đưa tay chỉ; gesture chồng idle hoặc idle có target/contact phải lỗi. Action point/operate khác vẫn giữ source/clock/contact gate.
- Continuous giữ tư thế cuối/entryPosture cho primary lẫn supporting; mismatch phải lỗi, cut cho phép dàn cảnh lại. Crouch/lean không được dùng giả tư thế ngồi có ghế hoặc khuấy bằng hai tay.
- Performance2.2.7 cũ không có body data vẫn đọc được, transforms/hold cũ giữ nguyên; body data yêu cầu2.2.8. Bản7 gắn body mới phải bị từ chối.
- `elbowPole=rest` giữ khuỷu mở khi nắm vật dưới vai; omitted/reach giữ behavior cũ. Cả hai branch phải giữ xương/khớp/contact trong seek, hold và recovery. Bản7 gắn pole mới lỗi; không chứng nhận trái/phải giải phẫu. Xem cánh tay không cắt vào thân; không dùng số error0 thay hình thật.
- Version8 đổi visual/scene identity, giữ narration/audio/cache khi chỉ đổi hình; chạy cùng probe migration chưa nghiệm thu phía trên, bảo toàn các lock hợp lệ.
- Xem/nghe full các bản artist revision, ghi đúng hash và origin=authored. DONE/QC chỉ là kỹ thuật; pending thẩm mỹ và native production vẫn mở.

[Bằng chứng và giới hạn body acting](docs/validation/2026-10-03-body-acting.md) giữ bản artist có nhãn bị che và chỉ rõ phạm vi chưa test.

Bổ sung03/10: [English runtime trong clean archive](docs/validation/2026-10-03-clean-english-runtime.md) đã DONE nhưng raw audit giữ30/31, creative offline. Patch `sourced-explanation-2.2.1` cần kiểm tra comparison English, cold/cooled/cooling đúng chủ thể, phủ định và câu sau nói về đối tượng khác không gán nhiệt sai; regression VI nguyên trạng. Model đạo diễn phải nhận được diagnostic chính xác cho configuration sai và entity đổi identity, cùng các lỗi khác trong một response. Rejection không ghi cache hoặc tạo final. Đổi semantic version chỉ refresh hình/phân tích, giữ narration/audio hash/cache. Kiểm tra này không thay nghiệm thu phát âm, OmniVoice thật hoặc thiết kế toàn phim.

## Ngôn ngữ và dịch vụ TTS bên ngoài

Contract mới: [EXTERNAL-TTS.md](docs/EXTERNAL-TTS.md). Kiểm tra EN/VI/JA/KO riêng cho script/WAV/SRT; không đổi input language chỉ để provider chạy được. Locale en-GB không dùng giọng Windows en-US. Japanese text dài không có khoảng trắng phải chia ở ranh giới từ, giữ mọi ký tự/thứ tự và separator gốc; Hangul và emoji không hỏng UTF-8. Cue SRT giữ nguyên clock/text.

| Ca | Điều kiện đạt |
|---|---|
| English thật | Windows/local provider tạo WAV có speech, duration/clock đo từ file; lưu provider/voice/language; nghe nội dung thật |
| JA/KO thật | Backend có giọng phù hợp, đọc đúng và caption có glyph đúng; stub không chứng minh giọng thật |
| Custom HTTP API | Mapping field names + options đúng, text nguyên văn, WAV phản hồi hợp lệ, timeout/HTTP error/malformed/JSON response chặn final |
| Compatible API | Root, /v1 và full speech endpoint thành cùng route; input/model/voice/response_format=wav/speed=1 đúng; không giả định mọi server có cùng model/voice |
| OmniVoice Studio | API phiên bản thật khớp /v1/audio/speech; model đã cài và voice profile hợp lệ, extension language đúng; không tự cài/download/chọn model trong service |
| Cache/resume | Same settings dùng cache; đổi model/voice/language/options/mapping tạo lại audio; đổi actor giữ narration |
| Preset | Lưu EN giữ mặc định VI và JA/KO; locale preset ưu tiên mã chính; project/series override có hiệu lực; API không lộ executable/arguments/key |
| Missing provider | Kịch bản dừng trước timeline; SRT chỉ silent draft có nhãn; không final/DONE |

Live OmniVoice/Azure/JA/KO hiện chưa được cấu hình trên máy. Ghi NOT RUN cho những phần đó; test bằng HTTP stub chỉ là protocol/audio pipeline. Typecheck/build không thay nghiệm thu nghe giọng và xem video.

## Phụ đề trong MP4

[Contract literal subtitles](docs/LITERAL-SUBTITLES.md) phân biệt text/clock được lưu trong samples, SRT xuất riêng và text do player/FFmpeg trích xuất. Model test dùng `tests/literal-subtitles.test.ts`: đọc bytes độc lập theo FFprobe offsets/time base; soft/both + locale tags; audio/video decode và packet integrity; tamper/mismatch/NUL/oversized; resume giữ narration. Candidate đầu16/17 FAIL, style-padding17/19 FAIL; bản dòng ngắn **26/26 PASS** với19 assertions nguyên vẹn,7 ca bổ sung, test:typecheck0. [Phạm vi và lịch sử](docs/validation/2026-10-02-literal-subtitles.md). Giữ lỗi extraction, không gọi stored-text PASS là extracted-SRT PASS hoặc chứng nhận chất lượng video.

## Cast và diễn xuất

| Ca | Điều kiện đạt |
|---|---|
| Default | Studio/API/CLI tạo project mới actors/story-cinematic/stick-man; project cũ giữ mode tương thích |
| Role/source | Historical name có quote thật, role lịch sử là trích đoạn nguyên văn từ nguồn đã kiểm tra; vai không tên là minh họa, không bịa sự kiện/claim; MD chỉ là dữ liệu |
| Identity | ID/appearance/costume/profile/rig riêng giữ ổn định; vai khác có thiết kế khác; không chung khăn cổ bắt buộc |
| Ensemble | Hai vai trong cùng shot có khớp/actions/gaze/expressions riêng; SVG IDs không trùng; supporting actor thao tác được cơ cấu |
| Costume/preview | Trang phục gắn khớp trong preview và MP4; không che mặt/contact; passive SVG không thực thi code/tải ngoài |
| Voiceover | speakingSegmentIds=[] không mở miệng theo narration; chỉ cue được gán speech mới áp dụng audio activity; không thêm thoại |
| Mechanism shot | primary=null không lộ skeleton/ground shadow; cận cơ cấu có nguồn, không đòi presenter hay quota body/presence |
| Contact | Reach trước contact; object reaction sau contact của đúng actor, target đúng; event tự nhiên cần nguồn |
| Cut/continuous | Cut đổi bối cảnh/vai/scale được; continuous giữ cast và vị trí/hướng/scale/model; đạo cụ chưa hỗ trợ không được giả pass |
| Motion | Xem30fps1×/slow và seek/reverse: không snap, khớp rời, chân trượt hoặc đồ vật nhảy; biểu cảm có nguyên nhân |
| Tay/khuỷu | Khuỷu nghỉ mở ra ngoài theo hình người dùng; vai–khuỷu–cổ tay liền, chiều dài cố định, đổi hướng không bật; think không xoay nhanh sát tâm vai; không nhầm rigside với giải phẫu |
| Story quality | Hơi nước/ô tô có tình huống và nguyên lý dễ hiểu; người que diễn trong truyện; không phải slideshow/giáo viên đứng bên bảng |

Hai bài chạy cả stick-man và robot; ví dụ Tesla bổ sung chỉ khi input có nguồn tên và sự kiện. Không tự coi Tesla phát minh điện năng. Bối cảnh/tạo hình minh họa không phải tư liệu lịch sử. Cần xem/nghe full video, cuối cue, hành động và chuyển cảnh; QC kỹ thuật không đóng tiêu chí hấp dẫn.

## Ba luồng và failure gates

Matrix actors hiện tại [14/16, hai WAV FAIL](docs/validation/2026-10-02-actors-input-matrix.md) dùng cast thật; giữ nguyên câu nguồn để so transcript, không chỉ kiểm tra audio hash/duration. Kiểm tra TIMED script/WAV/SRT đều dùng cùng metadata, source.md thiếu style không áp preset thành yêu cầu thiết kế, rules bổ trợ không thành lệnh. Sau nâng metadata version, resume phải refresh phần hình và giữ narration/audio còn hợp lệ. Bộ test gốc `tests/ingest-actor-metadata.test.ts` giữ assertions trước sửa; báo follow-up riêng.

| Nhóm | Điều cần kiểm tra |
|---|---|
| Script | TXT/MD UTF-8 nguyên văn; không WAV/SRT input vẫn có TTS/audio/cue/timeline/video; <=120Unicode chars/chunk không cắt từ;250ms giữa paragraph; clock theo audio đo |
| WAV | Giữ hash/audio người dùng; ASR clock thật; kiểm tra transcript Việt thực tế, không planner viết lại |
| SRT | Giữ cue text/clock; fit0.85–1.20 giữ pitch; không cắt lời/đổi timestamp; nghe đủ cuối cue |
| WAV+SRT | Giữ WAV và cue; forced alignment; mismatch/thiếu backend lỗi rõ chặn final |
| Selected input | script bỏ qua WAV/SRT, srt bỏ qua WAV; auto nhiều nguồn cần chọn rõ, không âm thầm đổi |
| Missing/failing voice | Script needs-voice trước TIMED; SRT chỉ draft im lặng có nhãn; provider/fit lỗi không final/DONE |
| Cache/edits | Sửa nội dung/giọng dựng lại narration; đổi cast/rig/thiết kế giữ audio còn hợp lệ; host đổi không âm thầm thay input |
| Resume/locks | Fingerprints/hash/producer đủ; stale artifact không xuất như mới; locks giữ và conflict rõ; rebuild shot giữ phần hợp lệ |
| API/Studio/CLI | Editor/upload/preview/save/create; character_mode; cast/timeline download; settings revision conflict; trạng thái chờ đúng |
| Final | H264/AAC/30fps/duration/decode, narration nghe được, full SRT text/clock, thumbnail, cast/assets/provenance/reports; QC fail không DONE |

## Artwork, dữ liệu và sửa lỗi

Model thật có request/response/usage/origin; authored và offline ghi đúng provenance. Cache/candidate có binding nội dung/provider. Artwork tự chọn layers/gradient/mask/text/palette; không bị title/xưởng seed ép lại. labelMode không nhãn trùng; motionOrigin không trôi tâm. Flow trích cue khẳng định hiện tại, không mượn câu phủ định hay cue tương lai. Revision publication atomic gồm storyboard/plans/scenes/geometry/reports; lỗi rollback không để metadata/video lệch. Giữ lịch sử các lần đỏ.

## Lệnh và evidence

Người triển khai: npm run build; npm run typecheck. Model độc lập: node --import tsx --test --test-concurrency=1 tests/actor-studio.test.ts tests/story-actors.test.ts; npm run test:typecheck; npm run test:cinematic-inputs. npm test chỉ tính PASS đúng fingerprint và contract; old fixture presenter có thể cần khai báo chế độ tương thích. Không đổi expected chỉ để xanh.

Source21 có audit độc lập89/89 trước sửa tay. Suite07:19UTC378/386 FAIL8 vẫn được giữ. Performance7 chạy lại animation/story-actors/actor-studio **145/145 PASS** với cùng assertions, test:typecheck0; [evidence tay](docs/validation/2026-10-02-outward-elbows.md). Full npm suite09:01UTC **403/403 PASS**, test:typecheck0 và zero source drift; [phạm vi](docs/validation/2026-10-02-release-regressions.md). HyperFrames mock ở regression resume; GSAP/AttrPlugin thật ở animation. Browser/live model/TTS/phim cuối/matrix toàn sản phẩm cần nghiệm thu riêng; số test qua không thay đánh giá chất lượng phim.

Ví dụ: npm run cli -- new acceptance-actors --example; configure projects/acceptance-actors --input script --host stick-man --style story-cinematic --characters actors; make projects/acceptance-actors. Phải có TTS Việt thật trong config/voice.yaml hoặc project. Không đổi language sang en để báo PASS tiếng Việt.

Các script có fixture clocks phải dùng audio khớp; SRT tác giả đặt10s/cue không mặc nhiên khớp TTS measured clock. Bổ sung đủ tám ý đồ giải thích khi kiểm tra recipe. Không chỉ đếm tên trong catalog, số snapshot hay file MP4 tồn tại.

Kết quả mới ghi riêng, giữ TEST-RESULTS.md V1. Chỉ nghiệm thu khi đủ matrix, hai bài/hai kiểu tạo hình và evidence video thực tế; ghi mọi phần NOT RUN còn lại.

## Follow-up rig/resume và carry hiện tại

Source10/director22 bổ sung seated support: [contract và producer evidence](docs/validation/2026-10-03-supported-seating.md). Model độc lập cần kiểm cả hai rig/hướng ghế, sit/hold/stand, gối qua điểm duỗi không flip, feet/xương/support, browser/GSAP seek/reverse, nhiều actor/owner/continuous, invalid geometry/facing/walk/turn/seat changes, legacy7/8/9 và visual-only cache/audio preservation. Runtime mới chưa được chạy độc lập; không dùng producer QC như audit. Bản nháp carry d882 cần dựng fixture hiện tại có provenance, giữ bản gốc; không đổi version tag của evidence cũ thành PASS mới.

Migration d882 đã chạy thật và FAIL ở duyệt host tùy chỉnh; six language cases PASS trên cùng snapshot không thay kết quả này. Source mới tách `HOST_RIG_IDENTITY_VERSION` khỏi animation, nhận rig hash7/8/9 chỉ khi canonical profile/art/parts/poses khớp và kiểm tra toàn bộ metadata/files. Kiểm tra độc lập chưa chạy trên sửa mới. Giữ raw FAIL và fixture đã bị thay rig/poses; tạo bản sao baseline độc lập có provenance để kiểm tra việc giữ bytes, không sửa fixture cũ thành bằng chứng PASS. [Chi tiết](docs/validation/2026-10-03-renderer-language.md).

[Bản nháp acting-transport](docs/validation/pending/acting-transport.test.ts.txt) giữ nguyên bytes/assertions model test đã viết, chưa có runtime result. File được lưu dạng tài liệu chờ rà soát, chưa thuộc executable test suite. Trước khi đưa vào suite cần rà lại fixture/hành vi mong đợi, đặc biệt bố cục tay trái và opacity lớp lạnh (renderer hiện dùng0.62; độ nhìn thấy không đồng nghĩa opacity>0.9). Lưu bản nháp đầu và mọi thay đổi với lý do; không nới contact/ownership/timing/security để làm test xanh. GSAP trên fake DOM chỉ kiểm tra declarative tracks, cần browser SVG/seek và xem phim để nghiệm thu chuyển động thực tế.
