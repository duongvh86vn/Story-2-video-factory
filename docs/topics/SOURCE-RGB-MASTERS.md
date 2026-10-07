# Giữ màu và nét vẽ gốc của Lila/Karo

Ngày 08/10/2026. Đây là mẫu authoring SVG tĩnh để giữ phần màu của đúng hai ảnh cận người dùng gửi. Chưa phải model đã đăng ký, animation hoặc video đã duyệt. Yêu cầu vẫn là Lila/Karo đóng vai trong câu chuyện, với màu da ấm, tóc/râu nâu, áo lông một vai và tay chân nét đen mềm.

## Đã làm

**Cập nhật source `31070cc` ngày 08/10/2026:** đã nối lựa chọn `appearance.sourceColour=original-rgb-v2` vào các lớp đầu/cổ/áo/vạt áo/mitten/foot của source-body rig ứng viên. Hai nguồn RGB/matte được stage theo hash riêng; renderer body/head12 và colour descriptor tham gia fingerprint/cache. Geometry/anchor nguồn và clock dùng đường hiện có, chưa được đăng ký hoặc nghiệm thu lại vì đổi màu. Default vẫn là cutout hiện có; view 3/4 là artwork riêng, không cho ghép màu mặt nguồn vào view đó. [Bàn giao test/lệnh server](SOURCE-COLOUR-RIG-HANDOFF.md), [plan](../plans/2026-10-08-source-colour-rig.md), [source review](reviews/source-colour-rig-review-v1.md).

**Mẫu hiện hành v3:** [inventory-v3.json](../../library/topics/prehistoric-life/source-rgb-masters/inventory-v3.json), [Lila SVG](../../library/topics/prehistoric-life/source-rgb-masters/lila-source-rgb-master-v3.svg), [Karo SVG](../../library/topics/prehistoric-life/source-rgb-masters/karo-source-rgb-master-v3.svg). SVG dùng đúng helper source-colour-art.ts: matte AI ánh xạ canvas nguồn, thêm lọc nền giấy theo green-channel và vùng interior mặt giữ màu sáng/răng. Filter gồm hai matrix hệ số tuyệt đối≤8 để giữ giới hạn renderer≤10; không mở rộng bộ SVG passive. Phép lọc là heuristic dành riêng ảnh nguồn, không segmentation được duyệt và không sửa RGB PNG.

![Lila: matte v1, v3 trên nền sáng và tối](reviews/source-rgb-lila-v3.png)

![Karo: matte v1, v3 trên nền sáng và tối](reviews/source-rgb-karo-v3.png)

Đã author/raster/xem hai figure SVG tĩnh trên nền kem và xanh đậm. Quan sát thấy giảm nhiều viền nền rộng quanh vai/tay/chân của Karo; nét mặt, răng và màu ấm còn nguyên trong vùng hiển thị. Vẫn có viền sáng mảnh ở tóc/outline/sole, matte alignment và vùng bị che chưa đạt. Figure này không dùng body evaluator hoặc pose/timeline renderer. Master và figure vẫn `approved=false`, `productionReady=false`, `registeredRigId=null`. Code có candidate layer selection không có nghĩa whole-body SVG master đã trở thành registered motion asset.

v2 là bản nháp tĩnh dùng matrix đơn có hệ số vượt contract renderer; đã bỏ đường đó trong source trước commit `31070cc`, thay bằng v3 bounded. Không dùng v2 để nghiệm thu canonical scene. Các mục v1 bên dưới là lịch sử authoring ban đầu.

Hai SVG nhúng nguyên bytes PNG tham chiếu cho lớp RGB. Alpha của bản tách AI hiện có chỉ được dùng làm matte, ánh xạ về canvas nguồn. Không dùng RGB đã được AI vẽ lại để thay mặt/mắt/mũi/miệng, texture áo hoặc màu nguồn. Filter làm trắng RGB của matte nhưng giữ alpha trước khi dùng luminance mask; không dựa vào thuộc tính SVG alpha-mask có mức hỗ trợ khác nhau giữa các renderer.

| Diễn viên | RGB nguồn và kích thước thật | Matte hiện có và kích thước thật | Mẫu SVG |
|---|---|---|---|
| Lila | [reference-lila-full.png](assets/reference-lila-full.png), 430×766, không alpha | [lila-cutout-v1.png](../../library/topics/prehistoric-life/lila-cutout-v1.png), 939×1675, có alpha | [lila-source-rgb-master-v1.svg](../../library/topics/prehistoric-life/source-rgb-masters/lila-source-rgb-master-v1.svg) |
| Karo | [reference-karo-full.png](assets/reference-karo-full.png), 377×716, không alpha | [karo-cutout-v1.png](../../library/topics/prehistoric-life/karo-cutout-v1.png), 910×1728, có alpha | [karo-source-rgb-master-v1.svg](../../library/topics/prehistoric-life/source-rgb-masters/karo-source-rgb-master-v1.svg) |

[Inventory](../../library/topics/prehistoric-life/source-rgb-masters/inventory-v1.json) ghi exact SHA-256 của từng nguồn/matte/master/figure, kích thước, phương pháp ánh xạ và giới hạn. `approved=false`, `productionReady=false`, `registeredRigId=null`. Kích thước PNG matte độ phân giải cao khác tọa độ source-unit của rig; không thay giá trị 430×766 hoặc 377×716 trong rig bằng kích thước pixel của matte.

Đã raster hai tài liệu so sánh bằng Sharp từ SVG tĩnh và xem ảnh. Ba cột lần lượt là ảnh gốc, cutout AI hiện có và RGB gốc dưới matte ứng viên:

![So sánh màu Lila](reviews/source-rgb-lila-v1.png)

![So sánh màu Karo](reviews/source-rgb-karo-v1.png)

Mặt, màu da, nét cười và texture gốc được giữ trong vùng matte cho phép. Quan sát cũng thấy viền nền sáng, phần tóc/áo bị cắt và chỗ biên tay/chân chưa trùng. Karo thấy rõ viền ở tóc, vai và bàn chân; Lila còn chênh ở tóc và chân. Hai cột bên phải không được coi là pixel-identical cutout hoặc artwork đã đạt.

## Phần cần hoàn thiện trước khi dùng sản xuất

1. Căn silhouette/matte riêng từng model theo ảnh gốc; xử lý viền nền và các khe tóc/tay/chân, giữ viền áo đen. Không co dài thân hoặc đổi mặt để vừa matte AI.
2. Tách lớp đầu, tóc trước/sau, cổ, thân áo, hai phần vạt áo, tay/cuff/palm và chân/sole trong tọa độ nguồn. Vùng bị che cần authoring có provenance riêng; crop từ ảnh đứng không tự có phần che khuất.
3. Đo và đăng ký anchor/neck/shoulder/hip/cuff/palm/sole theo từng lớp; giữ ảnh màu gốc của các phần thấy được. Mẫu whole-body SVG này không cung cấp các registration đó.
4. Làm các góc nhìn bạn diễn, biểu cảm và miệng phù hợp từng góc. Không kéo glyph trên mặt gốc hoặc lật whole-body để giả near/far limbs.
5. Nối candidate rig theo version/hash mới để cache hình hết hiệu lực; giữ narration/audio hợp lệ. Preview phải cho thấy tạo hình, viền áo và màu trên nền rừng/ngày/hoàng hôn/đêm trước khi có art receipt.
6. Model test kiểm các pose/chuyển tiếp, môi trường dựng và ba luồng script/WAV/story. Chỉ có receipt đúng artifact/version và đủ kiểm tra mới xét điều kiện final.

## Phạm vi và môi trường

Mẫu này dùng SVG `<image>`/filter/mask và Sharp trong dependency dự án; không cần API tạo video từ ảnh, Grok/Veo/Kling hoặc RIFE. Khi authoring lại, lưu version mới, giữ cả ảnh nguồn/matte cũ và ghi hash mới. Không chạy bộ import/production chỉ để kiểm màu một tài liệu tĩnh.

Controller không gọi body evaluator, test callback/fixture/assertion, GSAP, browser, API/CLI sản xuất, model/TTS/ASR/audio hoặc render MP4 trong bước này. Đây là authoring và xem tài liệu tĩnh, không phải test runtime hoặc xác nhận đã mượt như video tham chiếu. Code mới có lựa chọn màu gốc rõ ràng cho source-body inspection/profile; không tự chọn hai whole-body masters, không đổi default production hoặc mở final.

Các thay đổi góc khớp là công việc khác, xem [SOURCE-ARM-TRAJECTORIES.md](SOURCE-ARM-TRAJECTORIES.md). Matte sạch không chứng minh motion đúng; FK giữ chiều dài cũng không sửa artwork. Cần hoàn thiện cả hai trước khi giao tool ba input để sử dụng.
