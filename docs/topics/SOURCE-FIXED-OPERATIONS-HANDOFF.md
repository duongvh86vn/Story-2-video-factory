# Thao tác vật cố định và continuity theo người — source0.71

Mục tiêu vẫn là một tool dùng cho câu chuyện bất kỳ: câu chuyện → kịch bản, kịch bản nguyên văn hoặc WAV gốc → narration/timeline → diễn viên trong câu chuyện → video có giọng, phụ đề và QC. EN là ngôn ngữ chính, cùng VI/JA/KO và TTS ngoài/local. Hai người trong fixture là dữ liệu kiểm thử kỹ thuật, không giới hạn nội dung thành máy móc hoặc món ăn.

## Phần source đã viết

- Original `operate` không mang prop có contract riêng. Phải giữ đúng người, gesture, tay, model/entity/art, cue và toàn câu mô tả thao tác. Target là center hoặc handle được khai báo rõ trong artwork; không dùng label hay suy đoán handle mặc định.
- Điểm bám là world anchor của vật được khai báo độc lập với bàn tay. Compiler vẫn kiểm reach/bone/contact; báo cáo geometry đo actual own palm và constraint ở contact gốc, các slice đang giữ và giai đoạn thu tay. Không kéo tay trở lại vật sau recovery.
- Contact và recovery dùng clock gốc; recovery lấy cùng lịch từ compiler. Một camera cut không tạo contact mới. Evidence contact/recovery ± một frame chỉ thuộc camera thực sự chứa timestamp đó.
- Kiểm lịch sử của vật: reveal phải có trước contact; translation không được dịch grip lúc giữ; rotation đã bắt đầu trước contact vẫn được coi là có ảnh hưởng, kể cả khi event đã kết thúc ở camera trước. Implicit rotation từ flow cũng phải được kiểm. Các event của vật qua cut phải có complete original world và phép chiếu chính xác.
- Reaction do fixed contact phải bắt đầu sau contact thật và kết thúc trước recovery. Chuyển động nội bộ của control không thay thế world grip hoặc tự tạo quyền di chuyển vật.
- API và pipeline dùng chung continuity theo person ID. Người đổi vai primary/supporting vẫn giữ identity, stage, scale, root và source clock của chính họ. Continuous scene phải có camera trước liền kề và cùng cast.
- API và pipeline dùng chung kiểm tra entry/exit/facing với actual primary body path; không chấp nhận metadata khác với path chỉ vì cast continuity đã qua. Legacy presenter tiếp tục có kiểm tra continuity riêng.
- Brief, manifest/code hashes và schema phiên bản mới nhận contract này. `story-direction-2.2.39` làm artifact cũ đi qua migration/locks hiện có; không tự phê duyệt artwork, đổi khóa đã duyệt hoặc tạo lại giọng khi chỉ sửa hình.

Phiên bản: `forest-tribe-0.71-fixed-source-operations`, `story-direction-2.2.39`, `source-interaction-2`, `source-fixed-operation-1`. SHA nguồn trước sửa: `c669bdd89bbf60a4e428eeb24c792ba8d504d5e6`. SHA đã bàn giao nằm trong delivery record ngoài repository, tránh self-hash của commit. Compiler chỉ xuất thêm recovery helper dùng chung; không thay công thức chuyển động. PNG, khuôn mặt, tóc, viền và trang phục không sửa; nam phụ vẫn trọc/không râu, nữ phụ giữ nguyên.

## Chưa đạt nghiệm thu

| Hạng mục | Trạng thái và bằng chứng còn cần |
|---|---|
| Fixed operation / API role swaps | Source candidate; 11 callbacks mới đã khai báo, **NOT RUN**. Cần model test chạy geometry và API, xác nhận các assertion không fail/skip. |
| Source production integration | `needs-source-prop-binding` vẫn chặn. Cần audit tích hợp world/action/interaction/coverage/QC/cache/API, không mở guard riêng để vượt lỗi. |
| Shared/sequential handoff | Chưa có contract cho hai người cùng giữ hoặc lần lượt bàn giao một vật. Không suy ra ownership từ vị trí tay. |
| Rig, pose và nét vẽ | Chưa chứng minh anatomy/chuyển động mượt, continuous body/head turns hoặc own supporting face/hair đạt yêu cầu video mẫu. `productionReady=false`, `productionRig=null`, `availableBanks=[]`; art/motion approval vẫn false. |
| Film hoàn chỉnh | Story/script/WAV, legacy SRT, giọng EN/VI/JA/KO, TTS ngoài/local, môi trường màu đậm, resume/rebuild/locks, MP4/audio/subtitle/QC vẫn cần nghiệm thu toàn luồng bằng SHA hiện hành. |

Build/typecheck/schema export chỉ là kiểm tra source. Không có renderer, browser, server, fixture, pose sampler, ASR, TTS, audio hay video nào được chạy bởi implementation agent. Kết quả V1 ngày 01/10 không chứng nhận các luồng mới. Không gọi speech activity hoặc segment animation là phoneme lip-sync.

## Agent hỗ trợ và bản ghi

Hai model đã có trong danh sách 9router. DeepSeek `ds/deepseek-v4.1-flash` nhận một request đề xuất ca test source-only, trả HTTP400; không có proposal áp dụng, không retry. Opus `ag/claude-opus-4-6-thinking` được giao một request review 8 complete source files, không ảnh, cap2.200 output token. Kết quả, fingerprint và phạm vi được ghi tại `reviews/fixed-source-source-review-v1.json`; đó không phải runtime hoặc chứng nhận toàn patch.

Kết quả mới: `npm run build`, `npm run test:typecheck`, `npm run schemas` và static manifest đều exit0. Kiểm raw bytes giữ nguyên294 ảnh tracked, 37 JSON metadata đầu, 126 mapped code hashes cùng8 scalar code hashes; 8 availableBanks vẫn rỗng. Fixture dùng bản sao độc lập của character/performance tại từng camera để ca sửa sibling không sửa luôn toàn chuỗi. Đây vẫn là source/static, chưa chạy11 callbacks.

Các kết quả lệnh source/static và byte inventory nằm tại `reviews/fixed-source-source-record-v1.json`, `reviews/fixed-source-static-record-v1.json`. Chỉ kết quả terminal exit0 mới được ghi là qua. Những lượt build/typecheck trước đó bị mất output không được dùng làm bằng chứng.

## Môi trường và lệnh giao model test

Source mới ở **C worktree** dưới đây; D checkout được giữ read-only. Studio đang mở ở8850 không tự chuyển sang code mới. Dùng Node≥22.13, dependencies của lockfile; full factory cần FFmpeg/FFprobe, cấu hình model/ASR/voice và giọng đúng ngôn ngữ. API key đặt riêng trong env/file cấu hình, không đưa vào chat, log hoặc commit. Cổng8861 và projects root riêng dùng để không ghi đè project đang có. Nếu cổng đã được dùng, model test chọn cổng khác, không dừng server của người dùng.

**Chỉ giao lệnh, implementation agent chưa chạy các lệnh runtime dưới đây:**

~~~powershell
Set-Location -LiteralPath 'C:/Users/Duongvh-pc/.codex/worktrees/stickman-acting-v22/Story-2-video-factory2.1'
git rev-parse HEAD
node --experimental-test-module-mocks --import tsx --test --test-concurrency=1 tests/source-fixed-operation.test.ts tests/source-interactions.test.ts tests/source-prop-binding.test.ts tests/source-world.test.ts tests/source-manipulation-actions.test.ts tests/story-acting-coverage.test.ts tests/physical-performance.test.ts tests/story-actors.test.ts tests/cinematic-studio.test.ts
$env:STUDIO_PORT='8861'
$env:STUDIO_PROJECTS_ROOT='C:/Users/Duongvh-pc/.codex/tmp/story-factory-source071-test-projects'
npm run studio
~~~

Mở `http://127.0.0.1:8861/` sau khi terminal xác nhận server đã lắng nghe. Dependencies thiếu thì cài bằng `npm ci` tại chính C worktree trước khi chạy. Các biến model/voice cần được cấu hình theo tài liệu dự án trước full pipeline; không lấy test im lặng làm final đạt.

Model test ghi full SHA, lệnh/exit/output, số pass/fail/skip và artifact đường dẫn thật. Kiểm contact/recovery trên camera chứa timestamp, hai người đổi primary, handle thật, target không thể với, missing/changed source/cue/model/art, prior rotation/flow/reveal, forged reports/metadata, cache invalidation và production gate. Sau đó kiểm real video normal speed/60fps, forward/reverse/random seek, anatomy, partner gaze, màu/viền và subtitle-safe area; ảnh tĩnh hoặc báo cáo geometry không thay thế bằng chứng video.

## Công việc tiếp theo

1. Audit tích hợp canonical source production contract và API/QC/cache; giữ guard cho đến khi đủ contract và nghiệm thu cần thiết.
2. Viết ownership timeline cho shared/sequential handoff, với nguồn, grip của từng người, release/receiver-contact và continuity của cùng entity.
3. Hoàn thiện own pose/view/head/hair/garment/environment đúng mẫu và màu sắc, rồi nhận nghiệm thu thật từ model test.
4. Kiểm đủ ba input, giọng, resume/rebuild/locks và final exports bằng current SHA. Mục tiêu đầy đủ vẫn active; source0.71 không phải tuyên bố tool đã sẵn sàng sử dụng.
