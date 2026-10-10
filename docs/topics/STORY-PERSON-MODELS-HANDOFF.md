# Nhân vật câu chuyện và mẫu tạo hình — source0.107

Source `forest-tribe-0.107-story-person-models` sửa lỗi dùng ID mẫu tạo hình làm điều kiện bắt buộc cho diễn viên chính. Tool phải phục vụ câu chuyện/kịch bản/WAV của người dùng: người trong truyện giữ ID, tên, vai và lời thoại riêng; Lila/Karo là hai mẫu hình ảnh để họ đóng vai. Đây là thay đổi code, chưa có báo cáo test runtime Lila/Karo mới và chưa nghiệm thu video.

## Contract đã triển khai

| Loại dữ liệu | Ví dụ | Ý nghĩa |
|---|---|---|
| `actorScene.primary.id` hoặc `supporting[].character.id` | `mina-source`, `toma-source` | Người trong câu chuyện, giữ ổn định qua các cảnh và đổi camera primary/supporting |
| `character.name`, `role`, `identity`, `sourceRefs` | Tên và vai từ nội dung gốc | Không thay bằng tên mẫu Lila/Karo; không tự thêm nhân vật lịch sử, quan hệ hay lời thoại |
| `appearance.characterVariant` khi không có `supportingModel` | `lila`, `karo` | Mẫu tạo hình chính được chọn rõ ràng |
| `appearance.supportingModel` | `prehistoric-male-bald`, `prehistoric-female-haired` | Mẫu phụ riêng, nam không tóc/râu, nữ có tóc; dùng cùng trang phục nguồn tương ứng |
| `speakingSegmentIds`, `performance.leadCharacterId`, original source owner | ID cue/người gốc | Giữ người nói, timeline và ownership; model ID không thay cue hoặc source person |

`topicActorModel` và `topicCastModels` resolve toàn cast trước mọi cập nhật. Hai người có thể dùng cùng artwork với hai person ID riêng. Một người không được chiếm cả hai slot trong một cảnh hoặc đổi visual model giữa các cảnh. Không đoán mẫu bị thiếu từ tên/giới tính/vị trí camera. Trong luồng tự động, agent đạo diễn phải chọn rõ mẫu khi thiết kế cast; người dùng vẫn chỉ đưa nội dung và chọn chủ đề, không cần viết lại MD cho mỗi truyện.

Project cũ có ID `lila`/`karo` giữ nghĩa tạo hình cũ và không migrate/rename. Custom source IDs dùng `characterVariant` explicit. Legacy reserved IDs vẫn từ chối đổi principal thành mẫu phụ hoặc đổi sang artwork của principal còn lại; project cũ không âm thầm đổi diện mạo.

`applyTopicCast` dùng mapping này để chọn canonical/default hoặc explicit own source. Nó chỉ cập nhật phần visual như trước; ID/tên/role/identity/source/cue/sourceClock không đổi. All-source selections/QA phải hợp lệ trước khi commit cả cast. `validateCertifiedTopicCast` dùng cùng mapping cho **toàn cast gồm cảnh khóa**, kiểm exact own artwork trong ledger đã xác minh, không normalize hay sửa actor khóa. Không có hồ sơ QA thật thì không có approval.

Prompt `topicContext` gắn `scope=visual-model-only` và `modelId` cho catalogue hai mẫu; field `id` cũ giữ tương thích nhưng không là lệnh đặt lại person ID. Quy tắc buộc hai source roles có ID `lila`/`karo` được thay bằng việc giữ identity nguồn. Narration-authoring context không đổi; sửa visual mapping không viết lại lời kể hay tạo lại voice cache chỉ vì tên mẫu. Toàn story/script/WAV và ngôn ngữ EN/VI/JA/KO/local-external TTS vẫn là mục tiêu chung.

## Kiểm chứng source và phần chưa nghiệm thu

Tám callbacks mới ở `tests/topic-person-models.test.ts` **DECLARED / NOT RUN**:

1. Custom person IDs/names/cue owners/sourceHead clocks giữ nguyên qua đổi primary/supporting.
2. Hai người dùng chung artwork vẫn có person IDs và cue ownership riêng.
3. Mẫu phụ nam/nữ vẫn giữ own face/body khi đổi camera role.
4. Missing/foreign model không được đoán hoặc fallback; reject trước mutation.
5. Sibling đổi mẫu cho cùng person bị chặn trước cập nhật cả cast.
6. Một person ID chiếm hai visible slots bị chặn.
7. Legacy IDs giữ contract cũ; prompt catalogue ghi rõ visual-only.
8. Khi có **actual current** `STORY_FACTORY_QA_LEDGER`, custom principal IDs được kiểm exact tested appearances cả cảnh khóa. Không có ledger → **SKIP**, không là PASS hoặc acceptance.

Các fixtures chỉ là cast-normalization contracts; không là narration/physical/storyboard phim hoàn chỉnh. Build/typecheck/schema definition export và raw header/hash/AST inventory chỉ kiểm source. Giữ ảnh, head metadata, palette/proportions, own-source normalizer, rig/physics/voice/director/camera/review/production guards. Không vẽ thêm turn frame, sửa viền/tay/mặt hay tuyên bố motion đạt trong lần này.

9router `tester` trả HTTP200/`gpt-6-luna` sau20.884s cho snapshot20279 ký tự, chỉ review source. Không có finding cụ thể; reviewer ghi thiếu `HostProfileSchema` refinements, full intake và actual QA ledger, nên không nghiệm thu các phần đó. Parent sau đó thêm reject unknown supporting model và dùng deep equality cho test ledger để không nhầm key-order JSON với thay đổi nhân vật. Snapshot trước hai sửa cuối; không là review/acceptance final source. Code returned/advice không được execute. Các lượt GPT/debugger/planner timeout trước vẫn không có job handle và không được retry.

Bằng chứng kiểm source/handles/snapshot và phần còn thiếu nằm trong `reviews/story-person-models-source-record-v1.json`; inventory trong `reviews/story-person-models-static-record-v1.json`. `TEST-RESULTS.md` V1 không nghiệm thu source0.107. Người dùng đã trả lời **chưa** có báo cáo Lila/Karo mới.

## Lệnh cho model test của người dùng

Implementation không chạy lệnh runtime dưới. D checkout/server8850 giữ nguyên. Môi trường Windows/PowerShell, Node>=22.13 (build bằng24.19), deps hiện có; Hyperframes/Chromium/FFmpeg/FFprobe và TTS/ASR chỉ cần khi kiểm video/ba luồng thật.

```powershell
Set-Location -LiteralPath 'C:/Users/Duongvh-pc/.codex/worktrees/stickman-acting-v22/Story-2-video-factory2.1'
git rev-parse HEAD
node --experimental-test-module-mocks --import tsx --test --test-concurrency=1 tests/topic-person-models.test.ts tests/topic-cast-source.test.ts tests/topic-production-release.test.ts
```

Ghi full SHA, command, exit, raw failures và riêng PASS/FAIL/SKIP/NOT RUN. Ledger case chỉ chạy khi có hồ sơ QA thật đúng **source0.107 và code fingerprint mới**; không tạo accepted fixture để ép case này đạt. Nếu assertion/factory lỗi, báo lại để sửa source, không bỏ assertion.

Đối với project thật, kiểm cùng các tên/IDs từ input kịch bản hoặc WAV trước/sau story authoring → cast → storyboard → rig/performance → thoại. Script phải giữ nguyên lời; WAV giữ audio; story-to-script giữ nội dung. Thêm shot đảo primary/supporting và actor khóa: tên/vai/narrationRefs/speakerIds/timestamps/source owner không đổi, chỉ visual model được dùng. Agent đạo diễn phải dùng người trong truyện, không tạo presenter Lila/Karo ngoài truyện. Mẫu phụ không được mượn mặt/râu principal; sai visual/voice/source bindings phải chặn final.

Test Studio riêng nếu cần:

```powershell
$env:STUDIO_PORT='8861'
$env:STUDIO_PROJECTS_ROOT='C:/Users/Duongvh-pc/.codex/tmp/story-factory-source107-test-projects'
npm run studio
```

Chọn port trống nếu8861 đang dùng; không dừng service của người dùng. Khởi động từ C worktree đúng source; D/server8850 không tự cập nhật. Dùng project test riêng, không ghi đè project thật.

## Công việc còn lại

Quay đầu/thân thật vẫn thiếu artwork/correspondence và normal-speed kiểm chứng; pupil movement hoặc swap ảnh rời không thay một sourced turn. Cần đủ acting/partner gaze/face/soft arms/feet/contact/cloth/hair/quần chúng, world ngày/chiều/đêm đậm màu, camera/director và full original-source production integration sau QA thật. Toàn arbitrary story→screenplay, exact script, original WAV, voice/timeline, review/repair, resume/cache/locks/rebuild và final MP4/audio/SRT/thumbnail/storyboard/host-profile/timeline/manifest/QC chưa được chứng minh hoàn thành. Mục tiêu tổng vẫn hoạt động.
