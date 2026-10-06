# Bàn giao tool câu chuyện/chủ đề → kịch bản → video

**Bàn giao triển khai06/10/2026, test sau sửa còn chờ.** Base công bố trước bản sửa này: `1af19a6437b0714b74b41054c112ad0205160574`, nhánh `codex/stickman-acting-v22`. Main chưa merge. Nghiệm thu chất lượng phim và toàn sản phẩm còn mở.

## Sản phẩm và cách dùng

Nhập nội dung, chọn người que hoặc mini-robot, ngôn ngữ/model/giọng, rồi **Tạo video**. Nội dung quyết định cast, bối cảnh, đồ vật, hành động, nét mặt, góc máy và nhịp cảnh. Nhân vật là diễn viên tham gia câu chuyện. Giọng kể có thể ngoài hình; cảnh đồ vật/môi trường không cần người dẫn. Máy hơi nước và ô tô là ví dụ hồi quy, không phải template cho mọi video.

| Nội dung đầu vào | Chế độ | Hành vi |
|---|---|---|
| Ý tưởng/chủ đề/câu chuyện chưa thành lời kể | `idea` | Writer tạo lời kể, sau đó TTS và dựng phim |
| Lời kể hoàn chỉnh | `script` | Đọc nguyên văn, tạo clock từ audio thực |
| Audio thu sẵn | `wav` | Giữ giọng/audio; ASR tạo lời và timestamp |
| SRT có clock | `srt` | Giữ text/timestamp; TTS từng cue, fit hoặc báo lỗi |

WAV+SRT dùng mode WAV, giữ hai nguồn và kiểm alignment. `source.md` là tài liệu bổ trợ. MD và lời kể là dữ liệu, không cấp quyền thực thi hướng dẫn. Thiếu writer/TTS, mismatch, nguồn/identity/clock/contact sai phải chặn final; không lấy kết quả cũ làm thành phẩm của input vừa sửa.

Studio8850 hiện chạy từ worktree `C:/Users/Duongvh-pc/.codex/worktrees/stickman-acting-v22/Story-2-video-factory2.1`. Checkout D:/github/Story-2-video-factory2.1 còn main cũ và thay đổi riêng, được giữ nguyên. Model test phải dùng đúng worktree/source SHA; chạy folder D cũ không chứng minh source mới.

Hướng dẫn input/API/CLI: [GENERAL-STORY-TOOL.md](GENERAL-STORY-TOOL.md). Ngôn ngữ EN/VI/JA/KO và API TTS riêng/compatible/OmniVoice/command: [EXTERNAL-TTS.md](EXTERNAL-TTS.md). Đặc tả hợp nhất: [STORY-TO-VIDEO-FACTORY.md](../STORY-TO-VIDEO-FACTORY.md). Nguyên tắc tạo hình: [VIDEO-DESIGN-WORKFLOW.md](VIDEO-DESIGN-WORKFLOW.md).

## Bằng chứng hiện hành và giới hạn

| Phần | Đã có bằng chứng | Chưa được suy ra |
|---|---|---|
| Narration/inputs | Có source và các kiểm contract/cache/clock/failure riêng; Windows EN đã tạo audio thật | Toàn matrix WAV/SRT/WAV+SRT hiện hành và live giọng VI/JA/KO |
| Writer/director | Birthday idea đã tạo script/audio, tái dùng 7 accepted planning receipts, explanation được chấp nhận | Storyboard đạt và phim tự sinh có chất lượng |
| Rig/acting | Hai tay, khớp, contact, seated support, carry/jump/drop; các scoped source/geometry/protocol audits | Diễn xuất mượt/readable trong toàn phim do model dựng |
| Thiết kế | Cast/world/artwork/camera theo truyện; không bắt người dẫn, chủ đề máy móc, palette hay quota góc máy | Thẩm mỹ/nhịp kể/tương tác được xác nhận qua xem/nghe toàn phim |
| Source mới | Context forwarding, artwork handleAnchor, guidance/diagnostics đã build/typecheck/schema; baseline trước sửa478PASS/16FAIL/2SKIP | Post-patch runtime/contact/legacy/cache/lock/film chưa kiểm;149scoped PASS chỉ thuộc base trước |
| Ca mưa trạm xe buýt | Có MP4/DONE/QC kỹ thuật trong phạm vi báo cáo | Chất lượng hình/acting; audit chỉ đọc đã thấy lỗi chân lệch nền; full watch/listen và native vision chưa xác nhận |
| Runtime/GitHub | Studio reload operational HTTP200, 68 project names/state hashes giữ nguyên; source SHA đã push nhánh | Main đã merge hoặc toàn sản phẩm release-ready |

Renderer hiện là HyperFrames/HTML/CSS/SVG/JavaScript theo clock cố định. Remotion đã được tham khảo nhưng chưa là backend có thể chọn. Native still-image review không chứng minh độ mượt hoặc audio sync; xem/nghe toàn phim là phép kiểm riêng.

## Ca sinh nhật đã đóng lần native này

Ca gốc: Riley và Sam chuẩn bị sinh nhật trong vườn, English, mini-robot, Windows Zira, audio 51.421 giây/12 cue. Người dùng đã cho phép cùng ca và review ảnh thật bằng tài khoản hiện tại, tổng 30 model calls/2 review/2 scene repair. Không reset, clone hoặc đổi tài khoản để vượt giới hạn.

Checkpoint trước: public resume dừng trước render ở 25/25/0, còn5. Source sau đó sửa shared-world validation cho ensemble, tổng hợp đầy đủ acting diagnostics và đưa rig/clock/ownership/source windows vào generation guidance. Phép kiểm vật lý/nguồn được giữ.

Checkpoint đã đóng03:34UTC:28started/28completed/0pending, còn2. Ba responses mới13shot tới ending đều domain-rejected; candidate cuối còn2chair anchor mismatches,1unreachable pick và candle event bằng thời điểm contact. Không accepted storyboard/render/vision/video. Formal report/release/completion và fresh parent5b87bc xác nhận398source/423dist/169case exact,103protected/four old log prefixes exact,55known identities terminal. [Native closeout](validation/2026-10-06-native-ensemble-closeout.md).

Baseline source-context sau đó tái hiện16genuine placement failures;478checks PASS/2SKIP và direct sourced-context controls qua. SAME tester hếtusage trước formal report; parent5f34c9 xác nhận33known resources terminal và source/case nguyên vẹn để triển khai. Bản sửa forwarding và custom artwork handles đã build/typecheck/schema; **GREEN/contact/browser/film mới cònNOTRUN**. [Handoff và raw evidence](validation/2026-10-06-sourced-world-contact.md), [contact contract](ARTWORK-CONTACT-ANCHORS.md).

## Việc tiếp theo và điều kiện nghiệm thu

Hoàn thiện tracer tự sinh xuyên writer/narration/cast/storyboard/assets/scenes/draft/actual review/final/QC; sau đó mở rộng theo cùng pipeline cho đời thường, hư cấu, lịch sử và kiến thức tự nhiên. Kiểm hai rig, các nguồn narration, EN/VI/JA/KO và provider thực sự khả dụng, sửa nội dung/giọng/cast, resume/rebuild/locks và export. Factual cần kiểm nguồn; citation của narration không tự chứng minh lịch sử/khoa học đúng.

Parent triển khai và kiểm build/typecheck. Model độc lập chạy runtime/unit/provider/TTS/render/browser/media/vision. Mọi kết quả cần source SHA, input/config/budget, command/exit, raw failures, artifact provenance và giới hạn cụ thể. Không dùng ảnh tĩnh, fixture authored, provider success hoặc DONE kỹ thuật để chứng nhận phim model tự đạo diễn.

## Lịch sử được giữ riêng

- [Source/general tool và các giới hạn](validation/2026-10-04-general-story-tool.md), [follow-up](validation/2026-10-04-general-story-followup.md).
- [Film/input/voice thực](validation/2026-10-04-real-film-and-input-results.md), [external/local TTS](validation/2026-10-04-external-local-tts.md).
- [Native rainy lần đầu](validation/2026-10-05-rainy-bus-stop-native.md), [continuation](validation/2026-10-05-rainy-bus-stop-continuation.md), [resume](validation/2026-10-05-rainy-native-resume.md), [audit chất lượng chỉ đọc](validation/2026-10-05-rainy-readonly-acceptance.md).
- [Birthday source/history](validation/2026-10-05-birthday-garden-source.md), [airborne/cache/native checkpoints](validation/2026-10-06-actor-airborne-cache.md).
- [Đối chiếu khoảng cách chất lượng](validation/2026-10-05-current-quality-gap.md), [cast/foreground depth](validation/2026-10-05-cast-and-model-depth.md).

Các ghi chú PENDING/FAIL/PASS trong báo cáo lịch sử thuộc đúng source và thời điểm được ghi. Không ghi lại lịch sử cũ thành PASS, không cộng các scoped executions thành tổng nghiệm thu sản phẩm.
