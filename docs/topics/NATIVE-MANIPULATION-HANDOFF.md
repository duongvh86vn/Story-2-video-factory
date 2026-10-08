# Source0.65 — diễn viên tiền sử thao tác đồ vật

09/10/2026. Source thêm ứng viên thao tác vật cho native Lila/Karo và costume tương ứng của quần chúng. Nam phụ giữ đầu trọc/không râu, nữ phụ giữ PNG cũ. Đây là phần của tool tổng quát: nội dung/đồ vật/thao tác lấy từ câu chuyện, không bắt mỗi tập thành bài món ăn, giỏ/bát hoặc máy móc.

## Đã viết

- Explicit appearance.bodyManipulation=registered-manipulation-v1 trên forest-body-view-1 với đúng characterVariant/bodyView. Không tự chọn, không đổi head bank hoặc face overlays. Topic normalizer source3 giữ lựa chọn này cùng9 field render trước; canonical costume/palette/person/speaker/source vẫn giữ.
- Engineering registration của4 own body PNG, vai đã đăng ký, per-side wrist chains và cuff/palm từ chính hai cutout. PNG dimensions thật và virtual SVG canvas ghi tách biệt. Giữ toàn bộ PNG/face JSON/paint/seat art; không có ảnh AI mới hoặc whole-face warp/mirror.
- inspect dùng expressive FK có target; operate/pick-place/carry/drop dùng native-contact-angle-1. Mỗi contact bắt buộc elbowPole=rest. Reference lấy từ entry thật; moving shoulder phải ở corridor90°. Tiếp cận/thu tay bằng góc khớp quintic C2, giữ chiều dài xương. Trong giai đoạn sở hữu, IK đúng target world/body-relative rồi FK cùng góc trả đúng palm; không tự dời/clamp target hoặc kéo xương. SourceArmRole manipulate kiểm flexion<=125° và projected length>=0.7, không chứng nhận sinh học.
- Contact/release/landing/prop center/gripOffset, source evidence, per-person owner, clock/stage/scale và camera vẫn dùng contract chung0.64. Carry walking cần explicit registered-locomotion-v1 và đường đi đúng chiều, sau250ms lift/trước250ms lowering. Seating giữ selection riêng. Đối chiếu lịch đi/nhảy thực trong sourceBody qua global run/shot offset, không kiểm chỉ arrays local rỗng; lịch carry sai lift/lower hoặc fixed contact đang đi/nhảy vẫn chặn. Source body/head history gốc vẫn là cơ sở vai/cổ/áo/mặt; contact này chỉ là shot-local, không giả làm original hand clock qua cut.
- Source mitten nối cứng theo tiếp tuyến forearm, physical bone/ink dừng ở cuff, transform origin là palm. Không vẽ thêm ngón/pinch/wrist flexion hoặc pose giáo trái. Khớp và nguồn thiếu vẫn chặn.
- Khi đang giữ vật thật, một slot palm riêng nằm sau glyph đạo cụ dùng lại đúng definition của bàn tay đó; hai slot tay trước/sau đều tắt. Ownership theo chính khoảng contact/release của tay đang giữ, không lấy gesture cũ hoặc operate làm tay cầm. Khi thả vật, palm về depth cũ. Compiler chuyển slot theo bước, không crossfade hai hình bàn tay. Áp dụng cùng contract cho primary, supporting và diagnostic; SVG IDs/references vẫn thuộc từng actor. Layer/grasp nhìn thật vẫn cần test.
- Compiler báo bodyManipulation selection/fingerprint/actor/view/contact windows và motionVerified=false. forest-source-body-motion-37 và appearance/registration fingerprint làm cảnh/cache hình cũ cần rebuild; không viết lại giọng/lời kể/cue clock hoặc narrative contract để né action.
- Producer story-direction-2.2.33 và cinematic-models-2.2.3 ghi revision scene/painter mới; manifest lưu hash17 file source liên quan. Không coi review source trước các sửa body clock/painter này là đã review bản cuối.
- Trang body/API thêm manipulation=unregistered|registered-manipulation-v1, hand=left|right và inspect/operate/pick-place/carry/drop. Default unregistered giữ guard. Markers tròn chỉ để kiểm geometry; canonical story renderer dùng model SVG/evidence thực. Không dùng trang pose tĩnh thay cho phim.

## Môi trường và lệnh cho model TEST

Source C:/Users/Duongvh-pc/.codex/worktrees/stickman-acting-v22/Story-2-video-factory2.1, branch codex/prehistoric-life. D checkout được giữ nguyên. Node>=22.13, package-lock/dependencies hiện có. FFmpeg/ffprobe/Chromium/HyperFrames dành cho nghiệm thu media; các callback geometry không tự gọi9router/TTS/ASR/audio/video. Parent chỉ chạy build/typecheck/schema export/static inventory/source-only review.

~~~powershell
Set-Location -LiteralPath 'C:/Users/Duongvh-pc/.codex/worktrees/stickman-acting-v22/Story-2-video-factory2.1'
git rev-parse HEAD
npm run build
npm run test:typecheck
# Chỉ model TEST chạy các lệnh sau:
node --import tsx --test --test-concurrency=1 tests/native-manipulation.test.ts tests/actor-owned-props.test.ts tests/native-locomotion.test.ts tests/native-source-body.test.ts tests/forest-arm-trajectory.test.ts
./scripts/start-studio.ps1 -Port 8862 -ProjectsRoot 'C:/Users/Duongvh-pc/.codex/tmp/native-manipulation-test-projects'
~~~

Parent không khởi động server hay chạy các lệnh runtime này.

Đường dẫn kiểm pose trên server riêng:

~~~text
http://127.0.0.1:8862/api/topics/prehistoric-life/body?action=pick-place&view=three-quarter-right&manipulation=registered-manipulation-v1&hand=left&timeMs=1500&mood=happy
http://127.0.0.1:8862/api/topics/prehistoric-life/body?action=carry&view=three-quarter-left&manipulation=registered-manipulation-v1&motion=registered-locomotion-v1&hand=right&timeMs=1900&mood=happy
~~~

11 callback mới **DECLARED/NOT RUN**, không gọi fixture tại module load: explicit schema/normalizer/source; cả4 body ×2 hand inspect/operate; pick-place; forward carry/lift/lower; drop/flight; C2/pole/entry/exit; impossible/fold/clock/selection rejection; canonical two-native-actor separate props/scene security; bank6 principal và bank4 quần chúng giữ own head; diagnostic choices/old guards; original body locomotion/jump/contact clock projection. Đây không phải test mới đã PASS hoặc full-film proof.

Model test cần kiểm không gấp tay/ngắn xương/kink/tách mitten/grip drift, actor/prop/camera depth và cover/clipping thật, ground/support/contact/painter, random/reverse seek và normal-speed60fps video. Kiểm cả hai tay/góc/staging/scale, chuyện mới không phải fixture, narration/speaker/subtitle/audio/source/resume/locks. Ghi full SHA, command/exit/artifacts/hashes và PASS/FAIL/NOT RUN; report V1/ảnh tĩnh/green build không đóng mốc mới.

## Còn thiếu để dùng sản xuất

- Native anatomy/pose/grasp/painter/silhouette/clearance/interpolation/costume/head identity và độ mượt vẫn chưa được model test/human nghiệm thu. C2 angular controls hoặc reachable palm chưa chứng minh video giống mẫu.
- Chuyền tuần tự/cùng giữ một vật, handoff người/người, vật qua cut và source hand-contact history toàn run vẫn còn thiếu. Left spear/tool/lunge, authored finger/wrist variants, measured continuous turns/profile/rear views và cell transitions vẫn thiếu; không mượn PNG/ROI/mirror để điền.
- Production giữ **productionReady=false, productionRig=null, availableBanks=[]**. Existing needs-art-direction trước model/TTS vẫn giữ; không báo DONE/final từ candidate rig.
- Toàn mục tiêu: arbitrary story→script / exact script / original WAV (+legacy SRT) → narration → sourced actors/acting/world → review/repair → final MP4 có giọng/subtitle/QC, EN chính + VI/JA/KO/external-local TTS và resume/rebuild/locks. Phần này không thay nghiệm thu full3 input/ngôn ngữ/audio/bối cảnh/câu chuyện mới.

Bằng chứng source/giới hạn cuối: reviews/native-manipulation-source-record-v1.json. Review source9router và input đóng băng: reviews/native-manipulation-source-review-v1.json / reviews/native-manipulation-review-inputs-v1.md. Không là motion/art approval.
