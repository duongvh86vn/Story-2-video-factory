# Lila/Karo 0.19 — đăng ký góc thân và lunge

**Hiện hành 0.20:** cuff/palm tách riêng theo ảnh nguồn; chain migrate độc lập target, contact vẫn ở palm, mitten theo tiếp tuyến cẳng tay. Preset frontal đã re-author, slot think discrete và shaft interpolation có kiểm riêng. Grasp/anatomy/motion/video chưa nghiệm thu, `productionReady=false`; ba input và diễn viên trong truyện giữ nguyên. [Chi tiết, bằng chứng và lệnh bàn giao](WRIST-PALM-IMPLEMENTATION.md). Các đoạn 0.19 trở về trước dưới đây là lịch sử.

Ngày 07/10/2026. Source ứng viên, `productionReady=false`, `productionRig=null`. Chưa nghiệm thu video; phần runtime giao model test khác. Giữ sản phẩm tổng quát: **kịch bản nguyên văn / WAV giữ giọng và clock / câu chuyện → kịch bản trung thành → video**. Người que là diễn viên trong truyện; giáo và săn chỉ là bộ hành động.

## Đã triển khai

- `body-view-art.ts`: đăng ký kỹ thuật **3/4 phải** cho Lila v2 và Karo v1. Đo cổ, belt/pelvis, vai, hông trên canvas thật; gắn anatomical ownership, tay gần/xa và mask. Canvas mới không sinh chiều dài xương mới. Head/body dùng scale đồng đều riêng, không bóp mặt hoặc mirror áo. Đây vẫn là landmark ứng viên cần review, không phải skeleton anatomy đã duyệt.
- `body-view-contours.ts` và `garment-contours-v1.json`: contour áo/quần đo từ màu trong ROI riêng, giữ nét viền bằng band 7px. Không sửa byte PNG. ROI Lila loại phần đuôi tóc; hem đo theo cột để giữ hai ống/ragged edge, tránh mask hình tứ giác làm mất viền.
- `forest-body-art.ts`, `forest-cutout-head.ts`, `forest-head-art.ts`, `rig.ts`: đầu và thân góc mới dùng chung rig/evaluator/asset manifest với scene compiler. Tay xa trước áo, tay gần sau áo; ink/mitten có một definition mỗi phần và slot đúng role. Mitten/sole và các chain giữ từ rig nguồn. Mặt happy giữ nguyên cả cutout, không dịch mắt/mũi/miệng riêng. Không tự dùng front khi view sai.
- `schemas.ts`, `lunge.ts`, `compiler.ts`: một stance trụ được sở hữu từ đầu shot; hai sole world giữ nguyên. Pelvis advance/drop và lean chạy theo ready/contact/recover của giáo, với tham số quintic C2. Vẫn hạ pelvis tự do tối thiểu theo reach; không dời sole, rút xương hoặc nới contact tolerance. **Quintic không chứng nhận toàn pose C2**: chuyển nhánh minimum-reach còn cần kiểm velocity/acceleration.
- `body-workbench.ts`: `spear-lunge`, view selector và closeup cơ thể/tay. Giáo dài `1.2*height`, shaft chéo, grip span `170*bodyScale`, primary offset `-0.04*length`; hai tay cùng shaft frame, rear elbow mở sau vai. Đây là ứng viên dựng từ pose guide; chưa có chuyển từ đứng thường sang stance hoặc tương tác con thú.
- `camera.ts`: bounds dùng registration của head/view thực. Fingerprint chứa view/contour/lunge; source renderer/compiler tăng phiên bản. Sửa phép kiểm interpolation neck–head cho cutout (bottom=0), không dùng offset của head study cũ.
- `host/profile.ts`: MD/planner không được promote `forest-body-view-1` sang production. Developer profile tạo trực tiếp chỉ để hiệu chỉnh. View mới chặn head/body turn, opposite facing, walk/run/jump/seat, mood khác happy và speech activity chưa đăng ký; trả lỗi rõ, không fallback.

`forest-source-body-motion-15`, `forest-source-body-svg-10`, `forest-face-motion-10`, `forest-head-svg-11`; animation contract vẫn `performance-2.2.15`, thêm optional `lunge` có version riêng `forest-planted-lunge-1`. Schema/test declarations phải typecheck; regression runtime chưa chạy.

## Xem tại Studio

- [Lunge tại contact 1800ms](http://127.0.0.1:8850/api/topics/prehistoric-life/body?action=spear-lunge&view=three-quarter-right&timeMs=1800&mood=happy).
- [Landmark/mask trên canvas](http://127.0.0.1:8850/api/topics/prehistoric-life/view-registration).
- [Toàn nhóm tay](http://127.0.0.1:8850/api/topics/prehistoric-life/arm-audit): có thêm hai actor lunge, ba phase; không tự đổi số inspection cũ 0.18 thành kết quả 0.19.

Hai ảnh closeup: [Lila](reviews/source-view-lunge-lila-contact-v1.png), [Karo](reviews/source-view-lunge-karo-contact-v1.png). [Ảnh cả trang](reviews/source-view-lunge-contact-v2.png) có cả mũi giáo và vùng detail chủ ý cắt phần cán xa. Ảnh contact v1 là bản trước khi thêm closeup; không thay bằng chứng motion.

[Inspection có source/ảnh hashes](reviews/source-view-lunge-self-inspection-v1.json) và [DOM clock](reviews/source-view-lunge-dom-v1.json): 0, 1200, 1500, 1800, 3000ms cho cả hai actor, mười tổ hợp actor–clock, không có error card tại các mốc đó. Full/detail là hai kích thước của cùng pose, không tính thành hai case độc lập. Chưa kiểm thời điểm khác hoặc chuyển động liên tục. Build, test declaration typecheck, schema export và diff check đã exit 0. Schema export cũng đồng bộ các field story/topic/run đã có trong source với JSON library; không coi đó là implementation mới hoặc nghiệm thu ba luồng.

## Chưa đạt / cần tiếp tục

1. Review identity, tỷ lệ, cổ/neck aperture, áo một vai, tóc và mask qua các clock; hai registration 3/4 phải không có nghĩa chín artwork đã duyệt. 3/4 trái/profile phải/lưng chưa đăng ký; không flip view phải.
2. **Wrist/palm/grasp phải tách rõ**. Rig cũ dùng anchor giữa mitten cho tay/contact, chưa có grasp pose riêng. Cần đo điểm cổ tay nơi nét arm vào mitten và điểm grip, đăng ký offset theo role; không sửa chain chỉ để một target cũ reachable. Kiểm lại canonical chain/neutral source và kế hoạch migration trước khi đổi bone lengths. Shaft hiện ở một lớp, mitten ở lớp tay; chưa có chia palm/finger để ôm cán thật.
3. Kiểm elbow silhouette theo anatomical view và role, không chỉ flexion/reach. Thêm clearance so với vùng áo/râu/tóc, trajectory khi đổi pole; C1 ink không chứng minh elbow tự nhiên. Rest/walk/lap/react chưa có art limit được hiệu chỉnh đầy đủ.
4. Áo view mới đang rigid; cần shared garment surface/hem follow có UV đúng view. Không tái dùng UV front trên canvas mới. Tóc/râu chưa có secondary motion riêng.
5. Dựng stance preparation, walk/run/jump ở view, lunge hai hướng, biểu cảm và voice overlays đúng góc. Sau đó mới bind actor/prop/quarry/contact/reaction vào story shots; không dùng ảnh keypose thay nhau làm slideshow.
6. Model test kiểm seek/resume/all clock, tốc độ/gia tốc, fixed bones/sole/shaft/contact, interpolation, cảnh có lời và ba input với nhiều nội dung. Giữ topic guard đến khi identity/motion/video đạt; build hoặc review ảnh không mở guard.

## Tư vấn qua 9router

[Gemini với ảnh mới](reviews/gemini-view-lunge-advice-v1.json) vẫn nêu rear/lead elbow và grip depth chưa tự nhiên. Đề xuất 1:1 segments không được áp vì phải đo neutral source và phân biệt wrist/palm; nhận xét “stretch/static torso” không chứng minh bằng một ảnh. Pose đã có chuyển pelvis/lean theo code, nhưng anatomy, grasp và silhouette vẫn cần xử lý. [Model code với cùng ảnh](reviews/coder-view-lunge-advice-v1.json) nói rear elbow Karo có thể hợp lý, chưa thấy bằng chứng reverse elbow; vấn đề mạnh hơn là joint construction mơ hồ, gối bow, grip hòa vào shaft và tóc che tay Lila. Hai ý kiến đều chưa chấp nhận pose như bản tham chiếu anatomy hoàn thiện. Không dùng chúng làm PASS production.

## Môi trường và lệnh

Source thực ở worktree dưới đây, branch `codex/prehistoric-life`. Checkout D có WIP riêng, không phải source 0.19; chỉ dùng `.env` của D theo đường dẫn đã cấu hình. Windows, Node >=22.13, dependencies của repo; 9router ở `http://127.0.0.1:20128/v1`. Không gửi hoặc commit key.

```powershell
Set-Location -LiteralPath 'C:/Users/Duongvh-pc/.codex/worktrees/stickman-acting-v22/Story-2-video-factory2.1'

# Server developer; nếu 8850 đã chạy thì không mở thêm instance:
./scripts/start-studio.ps1 -Port 8850 -SkipBuild -Watch `
  -EnvFile 'D:/github/Story-2-video-factory2.1/.env' `
  -ProjectsRoot './runtime/prehistoric-life/projects'

npm run build
npm run test:typecheck
node --import tsx scripts/prehistoric-pack.ts
```

`scripts/prehistoric-view-contours.ts` chỉ đo PNG rồi ghi contour code/JSON bằng `wx`; không ghi đè bản v1, không phải runtime test. Tạo version mới và review nếu sửa ROI/mask. Bộ test chỉ model được giao nghiệm thu chạy:

```powershell
# Lệnh bàn giao, CHƯA chạy trong lượt triển khai:
npm test
node --import tsx scripts/forest-motion-fixture.ts --actor karo --action spear-lunge --view three-quarter-right --mood happy
node --import tsx scripts/forest-motion-fixture.ts --actor lila --action spear-lunge --view three-quarter-right --mood happy
# Thêm --render mới chạy exporter/MP4 thật; model test kiểm trước contract và dùng
# thư mục output riêng có suffix view. Fixture chỉ im lặng, không phải tập truyện.
```

Fixture đã nhận view, resource staging và kích thước từ `plan.stage` thay vì ép world giáo 820 vào canvas 430. Đây là source chuẩn bị, **chưa chạy fixture, validator runtime hoặc render**. Model test phải kiểm cả compile/interpolation lunge, asset/hash, nguyên chiều dài giáo trong khung, contact, seek và giới hạn byte; không suy PASS từ source.

Kết quả V1, ca bus stop/sinh nhật hay 138 ô source 0.18 chỉ áp dụng source/phạm vi được ghi của chúng. Không dùng để tuyên bố 0.19 hoặc toàn sản phẩm đã nghiệm thu.
