# Hai người đưa, nhận và cùng cầm đồ vật — source0.75

Mục tiêu vẫn là tool nhận câu chuyện, kịch bản nguyên văn hoặc WAV rồi dựng các diễn viên trong câu chuyện đó. Một vật được đưa từ người này sang người kia phải giữ identity, vị trí và kích thước. Đây là phần nền của diễn xuất chung, không phải một kịch bản mẫu cố định.

**Trạng thái:** contract, projection, kiểm nguồn và hàm đo hình học đã được viết; runtime chưa chạy. Renderer một entity, lớp tay, camera/coverage/interaction dùng chung ownership và nghiệm thu video còn thiếu. Không khẳng định hai nhân vật đã diễn mượt hoặc handoff đã dùng được trong production. `needs-source-prop-binding`, `productionReady=false`, `productionRig=null`, các `availableBanks=[]` và mọi duyệt hình/chuyển động vẫn giữ.

## Source đã viết

| Source | Nhiệm vụ |
|---|---|
| `packages/director/source-ownership-schemas.ts` | Contract `source-ownership-1`: một `partId` canonical, alias grip chỉ rõ người/source/gesture/prop/tay, offset theo pixel stage, phase world/held/shared và transition có nguồn narration. |
| `packages/director/source-ownership-projection.ts` | Seek theo clock gốc; camera chỉ cắt cửa sổ, giữ phase/index/authority gốc. Boundary dùng khoảng nửa mở, terminal chọn phase cuối; không clamp hoặc tạo contact mới. |
| `packages/director/source-ownership.ts` | Kiểm complete storyboard, own native registration/body/head/manipulation clock, danh tính, model/art/stage/scale, action/tay/cue và các câu chứng minh transition. Hàm frame/boundary so actual original palm/prop, world anchor và cả hai grip; chưa thực thi ở phía triển khai. |
| `packages/director/props.ts` | Candidate được kiểm context rồi chặn production rõ ràng, không âm thầm bị bỏ qua và không cho renderer cũ vẽ nhiều alias thành nhiều vật. Guard gốc của source manipulation vẫn giữ. |
| `packages/director/source-prop-identity.ts` | Ownership và tất cả camera sibling trong toàn interval tham gia fingerprint nguồn. Đây chỉ là cache metadata, không là duyệt chuyển động. |
| `library/schemas/index.ts` | Xuất schema ownership và contract shot/storyboard có field tùy chọn `cinematic.sourceOwnership`. |
| `packages/director/acting-brief.ts`, `scripts/prehistoric-pack.ts` | Mô tả capability candidate và hash source; model không được chọn candidate làm đường vòng để sản xuất. |

Một grip tương ứng đúng một attachment gốc. Không tái sử dụng grip sau khi đã thả; attachment mới cần alias/source thật riêng. Cùng một tay không được đồng thời cầm hai canonical entity. Shared cần hai người khác nhau và một authority cụ thể; đổi người cầm bắt buộc có khoảng shared dương, không exclusive-owner swap tức thì.

Candidate hiện giới hạn generic pick-place/carry, không xoay, world placement có anchor cụ thể. Giáo quay, drop có quỹ đạo bay, nhiều hơn hai người cùng cầm và nhiều điểm cầm của cùng một người cần contract vật lý tiếp theo. Không dùng giới hạn này để đổi nội dung người dùng sang cảnh khác hoặc động tác chỉ tay.

JSON Schema xuất ra mô tả shape; các ràng buộc liên phase/grip/transition do Zod và validator context thực thi. Không coi kiểm JSON shape riêng là đã kiểm clock, contact hoặc production semantics.

Hàm `sourceOwnershipFrame(shot, sourceId, globalTimeMs, board, narration)` và `sourceOwnershipBoundary(shot, sourceId, transitionId, board, narration)` là entry source cho người test. Chúng không là API production hoặc exporter. Record luôn có `contactVerified=false`, `motionVerified=false`, `productionApproval=false`; đo một thời điểm không chứng minh toàn khoảng mượt.

Contact đầu được so với prop origin/grip target độc lập đã khai báo, không chỉ một center được tính ngược từ chính bàn tay. Shared so hai center và grip thật; sai khác hơn 1 px bị chặn. Boundary so hai phía tại cùng clock; không dịch người/tay, nhân bản vật hoặc làm mềm một lỗi hình học để che discontinuity. Ngưỡng này là ràng buộc kỹ thuật của candidate, không là kết luận chất lượng phim.

## Agent 9router đã làm thật

Task `ownership-contract-v1` đã được gửi một lần tới endpoint local 9router, model request `cx/gpt-6.1-sol`, reasoning request `xhigh`, deadline 600 giây. Backend response ghi `gpt-6.1-sol`. Agent trả hai file TypeScript schema/projection; không có quyền sửa repo, thực thi code hoặc chạy test. Parent đã kiểm ba source input hashes, lưu nguyên proposal rồi tích hợp.

Parent sửa import SourceRef về module thực, dùng Id cho narration anchor, yêu cầu có grip, chặn alias vật lý trùng và tái sử dụng grip đã thả. Parent tự viết nối context/hình học/cache/guard, test declarations và tài liệu. Agent chưa review các phần parent viết hoặc sửa cuối cùng.

Usage trả về: 6.061 prompt + 12.199 completion = 18.260 token. `maxOutputTokens=7000` chỉ là giá trị gửi; backend trả completion lớn hơn nên không coi đây là trần quota đã cưỡng chế. `xhigh` là yêu cầu, không có bằng chứng riêng xác nhận mức reasoning backend thực dùng. Packet, source gốc, hash và proposal nằm ở [ownership-agent-record-v1.json](reviews/ownership-agent-record-v1.json); không chứa key/env.

## Việc triển khai tiếp theo

1. Nối compiler và renderer với một geometry authority của canonical entity. Alias chỉ là ràng buộc grip; không vẽ thêm prop copy. Giữ kích thước/world identity qua cut và primary/supporting swap, không dùng actor scale để làm vật phình/thu khi đổi chủ.
2. Giữ đúng chiều sâu: tay nào ở trước/sau vật, quần áo, body và foreground phải dựa vào own registered pose. Renderer cũ đặt prop trong từng actor slot; không thể chỉ bật candidate trên cơ chế ấy. Cùng cầm cần hai bàn tay thật với một vật, không hai artwork chồng nhau.
3. Cho model glyph, label, shadow, foreground, relations, world event/effect, interaction record, coverage và camera envelope đọc cùng ownership frame. Không giữ một target cố định khi vật đã chuyển chỗ. World không thêm transform khác lên entity đang bị ràng buộc bởi tay.
4. Hoàn tất production semantic audit của binding/action/contact/witness/continuity và cache/publication/repair/review/final/QC. Camera-only repair phải giữ toàn ownership nguyên vẹn. Không bỏ guard riêng lẻ để xuất MP4; thiếu pose/registration thật phải báo khả năng còn thiếu.
5. Model test dựng complete canonical board với own source body/head/manipulation registrations, cả hai người có grip targets thật reachable. Kiểm pickup → shared join → authority transfer → release → place; cả primary swaps và camera cut nằm giữa held/shared. Kiểm forward/reverse/random seek, contact errors, bone lengths, feet, face/gaze, màu/costume và video thật 60 fps ở tốc độ thường.
6. Kiểm ba input, voice EN chính/VI/JA/KO/external-local TTS, original WAV, legacy SRT, resume/locks/voice/actor/shot rebuild và final QC bằng pipeline thật. Source0.74 receipt/current review vẫn bắt buộc. Test V1 cũ không là nghiệm thu source0.75.

## Môi trường và lệnh bàn giao

Checkout triển khai: `C:/Users/Duongvh-pc/.codex/worktrees/stickman-acting-v22/Story-2-video-factory2.1`. D checkout/server 8850 không tự nhận source này. Node đang dùng 24.19.0; tối thiểu 22.13 cho module mocks của bộ test. Cần dependencies đã cài; chạy `npm ci` nếu checkout thiếu. Runtime full factory cần FFmpeg/FFprobe, model gateway, ASR và TTS đúng ngôn ngữ. Chỉ source test schema/projection không cần gọi model/TTS.

Các lệnh dưới đây **giao người/model test chạy**, implementation không chạy callback, builder, sampler, renderer, browser/server, pipeline, TTS/ASR hoặc media:

```powershell
Set-Location -LiteralPath 'C:/Users/Duongvh-pc/.codex/worktrees/stickman-acting-v22/Story-2-video-factory2.1'
git rev-parse HEAD
node --experimental-test-module-mocks --import tsx --test --test-concurrency=1 tests/source-ownership.test.ts
```

File này có 10 callback declarations, chưa thực thi. Chúng kiểm contract/clock/projection/alias/source fingerprint và guard thiếu context; chúng **không** kiểm actual geometry, pose, video hoặc full pipeline. Người test phải bổ sung ca complete original board ở bước 5, gọi cả frame và boundary; context thiếu hoặc không reachable không được chữa bằng mock approvals.

Để mở Studio từ checkout C bằng project root riêng, người test chạy:

```powershell
$env:STUDIO_PORT='8861'
$env:STUDIO_PROJECTS_ROOT='C:/Users/Duongvh-pc/.codex/tmp/story-factory-source075-test-projects'
npm run studio
```

Mở `http://127.0.0.1:8861/`. Không cần dừng server 8850 hoặc ghi đè các project ở D. Topic vẫn bị chặn production do chưa nghiệm thu; Studio khởi động được không đồng nghĩa tạo final được. Chưa có workbench/API riêng để vẽ shared ownership; đó thuộc công việc renderer tiếp theo.

Build/typecheck/schema export/static pack là kiểm source được phép phía triển khai. Kết quả chính xác nằm ở [ownership-source-record-v1.json](reviews/ownership-source-record-v1.json), gồm parent SHA và phạm vi NOT RUN. Mọi lỗi, video thật, SHA đang test, lời kể/audio, camera, ảnh/frame và log cần ghi thành MD để giao lại mục tiêu chính; không tự tăng cờ approval.
