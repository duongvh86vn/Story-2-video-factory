# Lila/Karo: bộ pose AI và sửa rig theo ảnh

**Hiện hành 0.19:** hai view 3/4 phải có registration kỹ thuật và ứng viên lunge qua rig/evaluator chung; giữ source bones, cổ/mặt nguyên lớp, near/far arms, sole trụ và clock giáo. Áo view mới vẫn rigid, wrist/palm/grasp và độ đọc joint còn thiếu; hai model review qua 9router chưa chấp nhận anatomy hoàn thiện. Chỉ build/typecheck và inspection clock tĩnh; runtime/MP4/ba input giao model test khác. `productionReady=false`, `productionRig=null`. [Source, ảnh, việc thiếu và lệnh server/test](VIEW-LUNGE-IMPLEMENTATION.md). Các mốc 0.18 trở về trước bên dưới là lịch sử, không phải trạng thái mới.

**Lịch sử 0.18:** kiểm silhouette cả cặp tay giáo ngoài reach/flexion: span 100*bodyScale, rear elbow ở sau vai theo trục cán, nhánh cố định suốt shot và cán gỗ còn sau grip. Cặp mới bỏ coils cũ nhưng vẫn là low frontal hold; lunge theo mẫu chưa dựng. Có chín output artwork góc đầu/thân qua 9router, chưa đăng ký/duyệt; profile phải và lưng còn thiếu. Source 0.18 có 138 ô inspection tĩnh happy, sáu head-turn bị chặn. Tổng 23 image calls thành công và 10 advice calls; không phải PASS motion/video. [Sửa tay](ARM-POSE-REPAIR.md), [góc thân/đầu và tool](AUTHORED-VIEWS.md). Giữ guard và ba luồng kịch bản / WAV / câu chuyện → kịch bản → video.

Các mục 0.17 và trước đó bên dưới là lịch sử; preset 70/20/45 không còn hiện hành.
Mốc 0.17, 07/10/2026. Người dùng tiếp tục chỉ ra tay bị gập sai ở hunt-aim và mặt bị lệch, đồng thời yêu cầu AI khác qua 9router hỗ trợ. **Chưa nghiệm thu rig hoặc video.** Bản sửa và danh sách còn thiếu hiện hành tại [ARM-POSE-REPAIR.md](ARM-POSE-REPAIR.md).

## Kết quả đã tạo thật

- 9router local đã nhận `MODEL_GATEWAY_KEY`; discovery `/v1/models/image` có Gemini và các model ảnh khác. Đã gọi Gemini `ag/gemini-3.1-flash-image` tạo ảnh, Gemini `ag/gemini-3.8-flash` review ảnh; sau đó gọi `cx/gpt-image-2` qua cùng router để cải thiện fidelity.
- 14 lượt tạo ảnh thành công: hai sheet Gemini v1, hai pose giáo Gemini v2, và **10 pose rời v3** — mỗi actor có `point`, `think`, `run-left`, `jump`, `spear-lunge-left`. Có sáu lượt tư vấn: hai review artwork Gemini, ba review source/ảnh Gemini và một review source/ảnh `cx/gpt-6.1-sol`. Đây là artwork/tư vấn được người dùng yêu cầu, không phải pipeline tập phim hoặc nghiệm thu runtime.
- Hai sheet v1 bị loại: tay chân màu da, ngón tay/ngón chân và tạo hình khác mẫu. Pose Gemini v2 đã có nét đen nhưng đổi tóc/mặt/dây lưng; chỉ giữ để đối chiếu cơ học, không thay identity. V3 gần nguồn hơn nhưng vẫn cần hiệu chỉnh tỷ lệ, vai áo, tay nắm, biểu cảm, hướng nhìn và registration.
- Mỗi ảnh có JSON chứa prompt, model, hash ảnh tham chiếu, hash output và trạng thái; tất cả `approved=false`, `productionReady=false`. Ảnh gốc là chuẩn, không lấy lời nhận xét AI làm lệnh hoặc nghiệm thu.
- Gallery: `http://127.0.0.1:8850/api/topics/prehistoric-life/pose-art`. Ảnh được đọc theo tên/hashes trong inventory cố định, không lấy đường dẫn tùy ý từ query.

Thư mục: `library/topics/prehistoric-life/pose-studies/`. Báo cáo: [review sheet v1](reviews/gemini-pose-advice-v1.json), [review pose v3](reviews/gemini-pose-advice-v3.json). [Pose giáo người dùng](assets/reference-spear-pose.png) là chuẩn cơ học: chân trước chùng, chân sau duỗi, người dồn trước, tay trước thấp và tay sau cao trên cùng cán.

## Sửa trong code hiện hành 0.17

- `forest-cutout-head.ts`: body dùng nguyên lớp đầu từ cutout cùng tỷ lệ/điểm cổ với thân; happy không ghép mắt/miệng phóng to lên một đầu mới rồi bóp qua mesh. Cutout đã tạo bằng AI, nên giữ pixel của cutout **không đồng nghĩa** đúng từng pixel ảnh người dùng. Blink/miệng nói/frown/round hiện chỉ là overlay ứng viên, không phải bộ biểu cảm hoàn chỉnh.
- Bỏ mesh yaw trên body; không giả nhận đã có góc nhìn bạn diễn. Explicit head angle thiếu artwork bị chặn `needs-head-view`. Trang head-only cũ là study lịch sử. Đầu hiện chỉ có hướng nguồn, nghiêng/gật theo cả lớp; còn phải dựng các góc mới đúng identity.
- Chin target của `think` theo vị trí cằm trong cutout. Camera đo cả biên đầu/tóc đã đăng ký, không dùng vòng tròn bán kính 40 quanh cổ để quyết định crop.
- Tay chạy có bắp tay dao động ±35° quanh hướng xuống trong tọa độ torso; cẳng tay gập 45–75° cùng nhịp, suy ra cổ tay theo chiều dài thật. Nội suy góc từ rest branch hiện tại; chỉ dùng khi run đang hoạt động. Hai tay ngược nhau, thân nghiêng 10° theo hướng chạy. Run/giáo chính diện dùng toàn chiều dài trên mặt phẳng; không dùng plane weight 0.85 cũ để thu nét tay. Đây vẫn là torso hướng nguồn, chưa phải chạy profile được duyệt.
- `source-arm.ts` giữ XYZ lengths, kiểm flexion theo vai trò và chặn segment chiếu nhỏ hơn 70% chiều dài gốc. `think` có target cằm riêng từng tay; nét ink và mitten cùng chọn foreground slot, mỗi phần chỉ có một definition vật lý. Preset grip giáo đổi từ `(±24,50)/30` thành `(±70,20)/45*bodyScale`; wrist xoay theo cán. Pose lunge tay sau nâng vẫn phải dựng từ artwork đúng hướng.
- Point dùng reach theo chain từng tay; không dùng một khoảng cách cho hai tay bất đối xứng. Khi vào/ra ngồi, pelvis chưa chạm support được hạ vừa đủ giữ chân trên đất; khi contact đã khóa không dời support, chân hay nới tolerance. Cần model test kiểm velocity/contact ở biên support.
- Nét tay/chân vẫn là các cubic liên tục qua khớp ẩn; không nới reach/contact tolerance. Cần kiểm cả tốc độ/gia tốc/nhánh khuỷu chứ không chỉ chiều dài xương.

Body compiler `forest-source-body-motion-13`, renderer `forest-source-body-svg-9`; face compiler `forest-face-motion-9`, head renderer `forest-head-svg-10`. Fingerprint chứa arm-role limits và motion version. Đổi artwork không viết lại narration đã chấp nhận; narrative contract vẫn phiên bản 1.

## Công việc tiếp theo theo thứ tự

1. **Đăng ký pose**: đo cổ, vai, hông, khuỷu, cổ tay, gối, cổ chân, bàn tay và grip trên từng ảnh; đưa về tỷ lệ thống nhất với hai model gốc. Không lấy kích thước canvas/đầu của từng ảnh AI làm xương mới. Giữ tóc, râu, màu, áo một vai, váy/quần hai ống và viền; sửa các biến thể AI trước khi chọn chuẩn.
2. **Thân và đầu đúng hướng**: dựng 3/4 trái/phải, profile và lưng từ chuẩn chính. Không mirror nguyên áo để giả góc quay; không giữ mặt nhìn khán giả khi đang giao tiếp. Đầu và torso phải cùng góc, eye-line nhìn bạn diễn/đạo cụ. Dựng expression happy/thinking/surprise/effort/angry/laughing cho mỗi hướng; happy phải giữ nét gốc.
3. **Pose hành động có vai trò rõ**: point khuỷu hơi xuống/sau; think khuỷu dưới bàn tay, tay ở mép cằm, không che miệng/mắt; run tay/chân đối nhau, có contact/down/passing/up ở cả chân; jump có lấy đà/toe-off/apex/contact/absorption. Không áp quy tắc “mọi khuỷu đều phải thấp hơn vai”: tay sau khi cầm giáo có thể đưa khuỷu lên/sau theo mẫu người dùng.
4. **Lunge cả người**: chỉnh chân trước chùng với cẳng chân gần đứng, chân sau duỗi, hông và vai dồn về trước; hai grip có khoảng cách đo từ pose, không cố định 30 cho mọi dáng. Cán dài phù hợp khoảng 1.2 chiều cao diễn viên, nằm chéo xuống target. Một shaft frame quản lý cả hai tay và mũi, giữ liên tục từ chuẩn bị → đưa → contact → thu. Cấm xuyên mặt/áo, lơ lửng tay hoặc phản ứng trước contact.
5. **Rig liên tục**: pose làm chuẩn cho trajectory/pole/bounds và lớp gần/xa. Nội suy hand/foot targets, weight shift và torso trên cùng clock; IK giữ constraint, đường ink giữ tangent, vải/tóc theo sau có giới hạn. Không ghép 10 bitmap full-body thành slideshow/crossfade để gọi là diễn hoạt. Động tác đối thoại nghe/nói/phản ứng phải có nhịp riêng.
6. **Tích hợp câu chuyện**: sourced actor/entity/target/prop binding, agency/interaction và shot continuity; động tác săn chỉ dùng khi nội dung yêu cầu. Con thú và phản ứng phải có rig/nguồn/clock thật. Vẫn là tool ba input: kịch bản nguyên văn, WAV giữ lời và clock giọng, câu chuyện → kịch bản trung thành → narration → video; không biến thành demo săn cố định.
7. **Nghiệm thu**: model test khác kiểm chuyển động cả chu kỳ/seek/resume, audio/subtitle, bố cục, nguồn và ba input; review ảnh đẹp hoặc build không mở production guard. `productionReady=false`, `productionRig=null` giữ nguyên.

Gemini v1 còn khuyên articulation góc cứng. Đây là tư vấn được lưu để đánh giá, **không** thay yêu cầu người dùng về nét mềm; không áp lời khuyên đó máy móc.

Review v3 chỉ ra hand pointer/mitten chưa thống nhất, tay Karo think bị lẫn vào râu, bàn chân Lila run thay silhouette, vai Karo jump gắn cao, và grip/khuỷu ở cả hai pose giáo cần chỉnh. Có nhận xét “mọi khuỷu giáo nâng lên đều sai” mâu thuẫn với chính quy tắc tay sau nâng lên/sau trong báo cáo và pose người dùng. Vì vậy báo cáo là tư vấn để đối chiếu; không dùng điểm số hoặc nhận xét đơn lẻ thay việc kiểm hình/rig. Cả 10 pose vẫn chưa được duyệt.

## Chạy tool artwork và Studio

Môi trường hiện tại: Windows, Node ≥22.13, dependencies repo (`npm ci` nếu chưa có), 9router đang chạy cổng 20128. Env tại `D:/github/Story-2-video-factory2.1/.env`; không đưa key vào chat hoặc commit. Worktree triển khai có source mới, checkout D có WIP riêng.

```powershell
Set-Location -LiteralPath 'C:/Users/Duongvh-pc/.codex/worktrees/stickman-acting-v22/Story-2-video-factory2.1'
# Giữ terminal mở; Ctrl+C để dừng. Không chạy thêm nếu cổng 8850 đang được dùng.
./scripts/start-studio.ps1 -Port 8850 -SkipBuild -Watch -EnvFile 'D:/github/Story-2-video-factory2.1/.env' -ProjectsRoot './runtime/prehistoric-life/projects'

# Discovery không chứng minh quota hoặc hỗ trợ ảnh tham chiếu:
node --import tsx scripts/prehistoric-pose-art.ts --discover --env 'D:/github/Story-2-video-factory2.1/.env'

# Tạo phiên bản mới, không ghi đè v3. Lệnh này gọi dịch vụ model thật:
node --import tsx scripts/prehistoric-pose-art.ts --actor karo --action spear-lunge-left --version v4 --model ag/gemini-3.1-flash-image --env 'D:/github/Story-2-video-factory2.1/.env' --pose-reference docs/topics/assets/reference-spear-pose.png
# Có thể chọn cx/gpt-image-2 như v3. Các action khác: point, think, run-left, jump.

# Build/typecheck; không phải runtime test:
npm run build
npm run test:typecheck
```

Adapter `ag` được kiểm từ source router: chỉ chuyển một ảnh inline nên tool ghép bảng tham chiếu có nhãn, thay vì gửi nhiều ảnh rồi âm thầm mất các ảnh sau. Endpoint ảnh `gemini/...` trong adapter đã đọc chỉ chuyển prompt; tool không dùng nó cho tác vụ phải giữ ảnh tham chiếu. Endpoint/model có thể thay đổi theo phiên bản 9router; discovery, lỗi HTTP/empty output phải báo rõ. Không tự chuyển sang model khác trong một lệnh đã chọn.

Runtime test vẫn bàn giao model khác. Không chạy npm test, fixture HTML/MP4, tập phim hoặc TTS/ASR trong mốc này. Các lệnh nghiệm thu cũ nằm tại [POSES-CHAY-NHAY-SAN.md](POSES-CHAY-NHAY-SAN.md); phải bổ sung kiểm pose mới và các góc còn thiếu, không dùng kết quả V1 để tuyên bố bộ mới đạt.
