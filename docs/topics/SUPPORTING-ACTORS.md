# Diễn viên phụ / quần chúng — Cuộc sống thời tiền sử
Source0.52 · 08/10/2026. Bổ sung theo yêu cầu người dùng, giữ Lila/Karo là hai mẫu chính.

| Mẫu ngoại hình | Đầu / mặt | Trang phục trong rig |
|---|---|---|
| `prehistoric-male-bald` | Nam đầu trọc hoàn toàn; da ấm, mắt đen, cười khép miệng; giữ râu nâu ngắn theo mẫu Karo | Dùng lại asset áo một vai, thắt lưng dây và quần hai ống của Karo |
| `prehistoric-female-haired` | Nữ có tóc nâu ngang vai, mái lệch; da ấm, mắt đen, cười khép miệng | Dùng lại asset váy một vai, thắt lưng dây và một tà váy liên tục của Lila |

Nét đen đậm, tay chân người que mềm, da và vải giữ sắc ấm. Không thay nhân vật chính bằng quần chúng. Màu background khi xem PNG cần sáng để nhìn rõ tay/chân đen trên nền trong suốt.

## Dùng trong câu chuyện
Một mẫu ngoại hình có thể dùng cho nhiều người. Mỗi người có `character.id` riêng và ổn định qua shot, ví dụ `villager-male-001`, `villager-male-002`, `villager-female-001`. `appearance.supportingModel` chỉ chọn ngoại hình; không phải tên nhân vật hay bằng chứng nội dung.

Tên, vai, hành động, câu thoại và `sourceRefs` phải theo input. Không tự thêm đám đông hoặc cho quần chúng nói lời không có trong câu chuyện. Một vai phụ có thể là camera primary của một shot, vẫn giữ ID/mẫu riêng; các người còn lại nằm trong actorScene.supporting. Validator identity/speech ownership hiện hành tiếp tục áp dụng; dùng trùng ID để nhập hai người làm một bị chặn. Lila/Karo IDs không được mang supportingModel.

Ví dụ trường ngoại hình (các field palette/tỷ lệ còn lại lấy từ `supportingTopicAppearance`, không tự đoán):
~~~json
{"id":"villager-male-001","appearance":{"characterVariant":"karo","artworkVersion":"forest-body-1","supportingModel":"prehistoric-male-bald"}}
~~~
Đây là đoạn minh họa, không phải ActorDefinition đầy đủ: người tạo storyboard vẫn phải có name/role/identity/sourceRefs và plan/action/clock đúng.

## Đã triển khai source
- Catalog hai mẫu trong `packages/topics/supporting-models.ts`; field strict `appearance.supportingModel` dùng chung ActorDefinition/HostProfile/storyboard/API/CLI schema.
- `applyTopicCast` nhận thêm các người có ID riêng và mẫu explicit; giữ name/role/evidence/dialogue assignments. Canonical appearance tái sử dụng đúng body template Karo/Lila.
- Renderer chọn đầu riêng qua `prehistoric-supporting-head.ts`/`forest-cutout-head.ts`. Toàn bộ quần áo/mesh/cuffs/tay/chân/độ dài xương dùng lại source body asset của mẫu chính. PNG generated toàn thân chỉ là mẫu tạo hình và nguồn đầu, **không thay texture trang phục trong rig**.
- Head resource/hash/cache/source manifest chứa PNG mới. Clip đầu có ID hash riêng theo actor/model/source; cùng mẫu không mượn mask của người khác. Shared contracts/capability/final guards hiện hành giữ nguyên.
- Gallery/API `/api/topics/prehistoric-life/supporting-actors`, `/manifest` và từng file PNG exact allowlist/hash; không fetch URL hay nhận đường dẫn tùy ý. Studio có link Diễn viên phụ.
- Chỉ source orientation hiện tại, nod/tilt toàn đầu; không gán yaw0 hay mirror để dựng góc thiếu. Gaze/turn explicit bị chặn cho quần chúng đến khi có registration riêng. Native bank3/fixed-view face/sourceColour/locomotion overlays của hai mẫu chính không được gắn vào đầu quần chúng.
- Mặt happy nguyên bản khép miệng ở silence; blink/round/frown/activity overlays là candidate chọn tọa độ thủ công trên chính PNG mới, **không dùng ROI của Lila/Karo**. Chưa là native bank3 face/verified gaze/phoneme lip-sync; seam/độ mượt chưa nghiệm thu.

## Artwork và provenance
Hai file dùng **built-in imagegen**, không dùng CLI/API fallback; giữ raw PNG nguyên bản và original generated_images. Prompt cuối đầy đủ và reference SHA lưu cạnh ảnh:

- `library/topics/prehistoric-life/supporting-actors/male-bald-v1.png` — 910×1728, SHA `f2995c6f6289f9c6e3b33b872ae40f70daef58cc312f34d641bb6dbcecce83ca`; prompt `male-bald-v1-prompt.json`.
- `library/topics/prehistoric-life/supporting-actors/female-haired-v1.png` — 939×1675, SHA `4604e94be7e2857b8dd5e2ef575196f8f623d5138da114f3b17ab06e925bfae7`; prompt `female-haired-v1-prompt.json`.

Raw copy bằng original; metadata có SHA RGBA/alpha histogram/bounds,0 pixel alpha ở rìa canvas. Có alpha rất nhỏ ở ngoài silhouette nên bounds alpha>0 không phải đường viền anatomical chính xác. Không crop/retouch/recolor PNG bằng Python/Sharp. Đây là model đề xuất; AI có vẽ lại chi tiết so với primary, không khẳng định giữ nguyên pixel/trang phục trong ảnh generated. Việc tái sử dụng trang phục chính được đảm bảo ở source asset của rig, còn hình ghép cần kiểm thực.

## Phân việc qua9router
Một request text-only cho GPT Luna:8.446 input +749 output = **9.195 token** provider báo, output cap1.500, không gửi PNG/toàn repo, không retry. Model chỉ góp ý; finding shared clip ID được parent harden, không tự chạy/ap dụng code. [Packet/binding/response/giới hạn](reviews/supporting-nine-router-review-v1.json). Không có căn cứ khẳng định tiết kiệm bao nhiêu quota hoặc video đạt chất lượng từ lượt source review.

## Kiểm source và bàn giao test
Build/typecheck/schema/static manifest được kiểm riêng; ghi kết quả cuối ở phần giao source. **4 callback mới `tests/prehistoric-supporting.test.ts` NOT RUN**: đúng body/head và từ chối overlay từ mẫu khác; nhiều người cùng mẫu giữ identity/thoại; raw hash/readiness; API ảnh từ chối path/hash sai. Toàn bộ renderer/geometry/pose/browser/server/voice/video/runtime vẫn giao model của người dùng, implementation agents không chạy.

Kiểm source cuối08/10/2026: `npm run build` PASS (41 module,554ms), `npm run test:typecheck` PASS, `npm run schemas` PASS, static pack PASS (2 supporting model; productionReadyfalse). Raw2PNG/prompt/reference/original và4 code hash mới khớp;4 raw source chính không đổi,6 code hash head bank khớp, availableBanks0/productionRignull. `git diff --check` PASS. Đây là kiểm source/bytes, không là thực thi schema geometry, head compositor hay các callback test.

Lệnh cho model test, không phải kết quả:
~~~powershell
Set-Location -LiteralPath 'C:/Users/Duongvh-pc/.codex/worktrees/stickman-acting-v22/Story-2-video-factory2.1'
git rev-parse HEAD
node --experimental-test-module-mocks --import tsx --test --test-concurrency=1 tests/prehistoric-supporting.test.ts tests/native-head-face.test.ts tests/story-actors.test.ts tests/forest-body.test.ts tests/forest-head.test.ts
$env:STUDIO_PORT='8861'
$env:STUDIO_PROJECTS_ROOT='C:/Users/Duongvh-pc/.codex/worktrees/stickman-acting-v22/Story-2-video-factory2.1/runtime/supporting-cast-studio-projects'
npm run studio
~~~
Mở `http://127.0.0.1:8861/api/topics/prehistoric-life/supporting-actors`. Ctrl+C dừng server ở terminal đó. Source mới ở C worktree; server8850 hoặc checkoutD không tự nhận bản này. Không sửa/copy/reset/merge checkoutD.

Model test cần dựng ít nhất Lila + Karo +2 nam cùng mẫu +1 nữ, kiểm ID/mask/asset/clock riêng, không ghost/đổi đầu qua camera, body/neck/face scale và màu khớp, Karo hai ống/Lila một váy, mềm khớp chân tay, không mất viền áo. Kiểm silence/speaking/blink/camera cuts/random/reverse seeks và giới hạn scene2MB. Nếu mask/tọa độ/miệng lệch thì sửa source registration trước, không tăng tolerance hoặc bỏ guard. Ghi exactSHA/PASS/FAIL/NOT RUN/log/ảnh/video. Gallery ảnh không là test chuyển động.

## Còn chờ nghiệm thu / phần tiếp theo
Hai model đã có source/raw asset và code path, **chưa có multi-actor video được duyệt**. Cần kiểm/sửa head/body seams/overlays/pose trước, đủ hướng nhìn bạn diễn và continuous views, biểu cảm/tóc/props/contact/đám đông. Full story/script/WAV, EN chính/VI/JA/KO/local externalTTS/resume/locks/finalMP4/QC vẫn thuộc mục tiêu chung. `productionReady=false`, `productionRig=null`; không xuất final hoặc báo DONE vì có thêm hai PNG.
