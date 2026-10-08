# Individual head sources — source0.48, chưa nghiệm thu video

08/10/2026. Không có API image-to-video trên máy. Tiếp tục raster nguồn + SVG/HTML5/GSAP; runtime do model của người dùng. Mục tiêu vẫn là câu chuyện/kịch bản/WAV bất kỳ → hai diễn viên đúng mẫu → video có thoại/phụ đề/QC, EN là chính và VI/JA/KO, TTS ngoài/local. Không có rig hoặc video mới được duyệt ở mốc này.

## Artwork nguyên bản

Hai PNG mới author bằng **built-in imagegen**, chế độ identity-preserve. PNG được copy nguyên bytes từ generated_images, không resize/crop/repaint/alpha clamp/composite bằng script. Bản generated gốc được giữ trong `C:/Users/Duongvh-pc/.codex/generated_images/01a0f194-5a26-7743-b0e6-bdc3cca6d17f/`.

| Nguồn trong `library/topics/prehistoric-life/head-cells/` | SHA256 | Prompt/yêu cầu |
|---|---|---|
| [lila-head-front-v1.png](../../../library/topics/prehistoric-life/head-cells/lila-head-front-v1.png) | `9fe7c077165da2483af272f0ec70a9e01fb3e467203e46ee8019af23a104e552` | [Full prompt](../../../library/topics/prehistoric-life/head-cells/lila-head-front-v1-prompt.json): một đầu front, tóc dài/nét/màu/identity theo primary, không thân/phụ kiện/text; requested yaw0° |
| [lila-head-near-right-v1.png](../../../library/topics/prehistoric-life/head-cells/lila-head-near-right-v1.png) | `299a47ecbb78536f314884159c7a3c2736d8b166715f74b20d41412c7d0e9c57` | [Full prompt](../../../library/topics/prehistoric-life/head-cells/lila-head-near-right-v1-prompt.json): edit front theo primary, giữ neck/skull/tie/hair frame; requested yaw8° |

Front original: `exec-2d30f27d-dd5f-44b6-ab0e-02a0af62aade.png`. Near-right original: `exec-63875ea9-f845-47ea-8e20-5c577f38117d.png`. Front dùng một primary `reference-lila-full.png`, SHA `85e1e03073171d7ba65de930e888f8abd33b946662fe8a99d13837a4fe77d7ce`. Near-right reference order: front edit target trước, primary identity sau; exact hashes có trong prompt/material. Karo chưa được author thêm ở mốc này. Requested yaw/margin/neck geometry trong prompt **không được coi là đo được hoặc đã được generator tuân thủ**.

PNG thực đều1024×1536 RGBA. Hồ sơ alpha/provenance nguyên bản lưu trong hai material JSON và [inventory-v1.json](../../../library/topics/prehistoric-life/head-cells/inventory-v1.json): front756334 pixel alpha0,793457 pixel alpha≥8,816530 alpha1–254; near-right726728/821227/846136 tương ứng. Cả hai0 pixel alpha255 và0 pixel alpha≥8 ở mép canvas. Mực chính gần đục nhưng chưa thử trên background/ánh sáng của video; không clamp alpha để làm chỉ số đẹp. Pixel hash/bounds/alpha histogram đều đo từ PNG nguyên bản, không là geometry/yaw/seam measurement.

Parent đã view primary/front/near-right ở độ phân giải gốc: giữ da ấm/nụ cười khép/tóc buộc dài ở mức nhận diện chung; nét mắt/mũi/miệng vẫn sạch/đều/đậm hơn primary, chưa chứng minh đúng identity. Cell near-right dịch mặt/cổ/skull và tóc so với front; không coi canvas bằng nhau là attachment cố định. Phải đối chiếu và đo lại, không suy eye/chin/neck masks từ ảnh full-body cũ. Trạng thái cả hai `unreviewed-source-candidate`, yawMeasured/approved/registered/productionReady/motionVerified=false.

## Source đã thay đổi

- `native-head-bank-2`: source base implicit ID `primary`, tối đa23 nguồn bổ sung; mọi nguồn explicit pixelScale0.05–2, mọi cell explicit sourceId. Cùng actor/primary/body hashes; không duplicate ID/file/SHA alias/unknown/unused nguồn. 20Mpx/ảnh,40Mpx tổng; crop/landmarks/skull thuộc đúng PNG, chỉ kiểm overlap khi cùng ảnh. Route vẫn monotonic nhỏ≤9°, skull area sau density không nhảy ngoài0.8–1.25. Đây là engineering metadata, không art approval.
- Bank1 không thêm default/field mới hoặc đổi canonical key order. Synthetic declarations so SHA với crypto độc lập; version1 không nhận multi-source fields. Không dùng5 atlas held, kể cả rename sang head-cells; held file/SHA guards giữ nguyên.
- SVG mỗi ảnh exact bytes một lần, cell crop/neck-axis/uniform density; physical eye/chin và camera bounds dùng cùng transform. Discrete sourceHead clock/half-open cell/phase qua camera không đổi. Không toàn-face warp/reflection/crossfade hoặc per-frame scale để giấu lỗi.
- Source resources/staging/allowlist giữ mọi PNG/primary/hash/dimensions; bank fingerprint giữ binding/density/geometry. Reread raw bytes/primary dù từng có embedded URL. Publication/profile/clock/schema cache giữ source identity, scene cap2MB không nâng. Body compiler34/SVG18/headSVG18 invalidate phần hình; narration/audio contract không đổi.
- Reader material riêng kiểm path/link/size/raw source/reference/prompt/measurement. API inventory và PNG chỉ đọc, no-store/nosniff; không tạo bank/landmarks/sourceHead/masks hoặc duyệt rig. Topic/manifest/schema export có contract mới. Atlas workbench cũ chưa dùng được cho những ảnh đơn này.
- **Không có bank thực nào đã đăng ký.** Speech/directionalEyes/expressions/secondary đều literalfalse. Mọi voice/observer gaze/emotion/fixed face overlay thiếu capability vẫn bị chặn; chin contact hoặc theo mắt xuyên cell change vẫn thiếu correspondence và bị chặn. Không đổi chuyện có thoại thành silent demo để qua guard.

Zeno triển khai source bank contract và15 test declarations, chỉ đọc/edit2 file; parent đọc diff và tích hợp. Lovelace review bounded source/resource/clock/publication liên quan không thấy concrete regression; final delta phát hiện assertion overflow chưa tách khỏi unused-source guard. Parent thêm cell bound và assert đúng `too_big`/`additionalSources`/maximum23, không dựa vào lỗi phụ. Các declaration/schema/helper và hai API routes còn lại không có finding cụ thể trong scope đọc. Agent không chạy callback/test/build/schema/runtime/render hoặc sửa hình; đây không là bằng chứng anatomy/art/motion.

Lovelace độc lập view primary/front/near-right: xác nhận warmth/closed smile/long hair/tie màn hình trái, nét candidate mượt/đều hơn primary, hair contour đổi và endpoint cổ có vẻ dịch lên/phải. Chưa có fixed attachment geometry hoặc yaw đo được, không suy approval hoặc anatomy/continuity từ ảnh. Đây là static-art consultation; raw material status vẫn unreviewed, không bank được chọn.

## Kiểm source đã chạy

Lovelace re-read assertion correction: overflow cell bound và đúng too_big/additionalSources/max23 đã giải quyết gap; không new concrete finding trong delta. Agent closed. Review chỉ đọc source, không có callback hoặc runtime nào được thực thi.

- `npm run build`567135/8b833d, exit0:39 Studio modules, built513ms; final recheck sau inventory nosniff caf874/8f71e7 exit0:39 modules,598ms. TypeScript core+Studio và Vite build; không chạy code video.
- `npm run test:typecheck`dc84da/ce2021, exit0; recheck sau namespace declaration6f6530/5a767d và assertion overflow3ce22a/e67bed cũng exit0. Typecheck chỉ compile declarations, không invoke callback.
- `npm run schemas`e697b3 exit0; schema views từ Zod source, không nghiệm thu runtime refinements.
- `node --import tsx scripts/head-cell-inventory.ts`0c6f84 vàa2386a exit0:2 nguồn, actual alpha/hash/provenance, tất cả yaw/registration/production/motion false. Lần sau không overwrite immutable material.
- `node --import tsx scripts/prehistoric-pack.ts`707f5d exit0; exact raw code/PNG hashes/readiness11afda exit0:5 head code hashes +head-cell module,2 individual materials,5 atlas materials, availableBanks0/productionReadyfalse/productionRignull.
- `git diff --check`a196c2/11afda exit0. Node24.19.0/npm11.6.1 ghi tại f02231. Build/typecheck/metadata qua chỉ xác nhận phần source này.
- Static exact raw source hashes9ed187 exit0:5 head code hashes,2 savedPNG byte-identical generated originals,availableBanks0/productionReadyfalse/productionRignull.5 held material JSON cũ không thay đổi. Bằng chứng này không đo góc hoặc chuyển động.

26 callback mới chỉ khai báo:15 `native-head-bank-sources`,7 `head-cell-art`,4 thêm vào `native-head-bank`. **Tất cả NOT RUN.** Các ca regression, API/browser/server, compiler/pose samplers, renderer/tracer, voice/ASR/TTS/audio/video và full factory không chạy bởi implementation. Model test dùng [handoff](../NATIVE-HEAD-TURN-HANDOFF.md), cùng C worktree/Node; giữ D checkout. Instance8850 không được coi là source mới. Dùng riêng8861 như lệnh trong handoff, implementation không khởi động/dừng server.

## Việc tiếp theo để ra sản phẩm

1. Đạt identity/nét/màu của primary ở từng góc Lila/Karo thật; đo skull/neck frame/eye/chin/nose/mouth/yaw/tie-side/occlusion, không dùng crop bbox tóc làm skull size. Hai ảnh mới chưa là bộ quay đầu dùng được.
2. Công cụ/source registration cho ảnh đơn, painter neck seams và body compatibility; face edit/mouth aperture/lids/brow/skin/protection/hair/beard layers của từng nguồn. Chỉ đăng ký nguồn phù hợp, giữ nguồn cũ để đối chiếu.
3. Thoại/blink/emotion/gaze/secondary +continuous chin/observer/contact correspondence, body/profile/rear turns, mềm tay chân và prop grasp/carry/handoff/hunt với clock/điểm tiếp xúc đúng. Runtime model test kiểm random/reverse seek/camera cuts và video60fps thường.
4. Bối cảnh màu vivid day/sunset/night và full arbitrary story/script/WAV +EN/VI/JA/KO/local-external TTS +resume/source/locks/subtitle/audio/finalQC. Mọi thiếu nguồn/voice/identity/contact/capability phải chặn final/DONE. Không thay sản phẩm bằng bảng ảnh hoặc rest-face animation.

Ước lượng tiến độ chất lượng giữ đánh giá gần nhất của người dùng25–30%, chưa có video mới để nâng con số. Nền tảng source phát triển không đồng nghĩa đã đạt nghiệm thu hình/chuyển động. Whole goal vẫn active/incomplete.
