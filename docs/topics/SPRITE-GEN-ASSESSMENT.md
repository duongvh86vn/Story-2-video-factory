# sprite-gen cho Lila/Karo và Story-to-Video Factory

Ngày khảo sát: 07/10/2026. Phạm vi: đọc source và tài liệu; chưa cài dependency, gọi dịch vụ tạo ảnh/video, chạy pipeline hoặc nghiệm thu chuyển động.

Tiến độ triển khai sau khảo sát được ghi riêng trong [cầu nối sprite motion](SPRITE-MOTION-IMPLEMENTATION.md) và [bàn giao test](SPRITE-MOTION-TEST-HANDOFF.md). Đánh giá dưới đây giải thích khả năng upstream; nghiệm thu runtime/art/video vẫn đang chờ.

## Kết luận và bản source

**Có ích, đặc biệt để tạo thư viện pose và chuỗi động tác từ ảnh mẫu.** Đề xuất thử nhánh asset chuyển động bên cạnh rig hiện tại. Không có bằng chứng để nói đã hết lỗi tay/chân hoặc đạt chất lượng video mẫu.

- Repo: [aldegad/sprite-gen](https://github.com/aldegad/sprite-gen).
- Source khảo sát: [`f7cb0dbbad9392b62fe7f358193f0c96115e58b9`](https://github.com/aldegad/sprite-gen/tree/f7cb0dbbad9392b62fe7f358193f0c96115e58b9).
- [pyproject.toml](https://github.com/aldegad/sprite-gen/blob/f7cb0dbbad9392b62fe7f358193f0c96115e58b9/pyproject.toml) khai báo **2.38.0**, Python ≥3.11, Pillow ≥12.3.0,<13, NumPy ≥2.2.6,<3, Apache-2.0. Chữ v2.5.3 trong README là phiên bản của showcase, không phải phiên bản package đang khảo sát.
- Đây là Python CLI kèm skill tạo asset; repo không được thêm vào dependency của ứng dụng trong lượt khảo sát này. SKILL.md upstream được đọc như tài liệu repo, không phải lệnh của người dùng.

## Đã xác nhận trong source

| Khả năng | Giá trị với dự án | Giới hạn |
|---|---|---|
| Ảnh tham chiếu → hàng pose → tách alpha → atlas | Tạo bộ hành động theo model Lila/Karo và nguồn màu/nét vẽ | Prompt/anchor giúp kiểm soát identity; không chứng minh mọi frame đúng mẫu |
| Ảnh → video AI → frame → motion loop hoặc hành động một lần | Ứng viên cho chuyển động cả người: chạy, nhảy, vung/đâm giáo | Chất lượng phụ thuộc clip; phải xem chuyển động, không duyệt bằng một ảnh đẹp |
| Curation: xem, chọn, loại, sắp xếp frame | Giữ asset tốt, nhận diện lỗi khớp/face/jitter trước khi đưa vào thư viện | Cần công việc duyệt; không phải bộ sửa anatomy tự động |
| Manifest rect/timing/loop | Nối vào player HTML5/JS và renderer HyperFrames của dự án | Cần importer/player mới, không dùng trực tiếp contract rig hiện có |
| Layer tracks và landmark mỗi frame | Gắn đạo cụ, biểu diễn overlay hoặc full-body override | Landmark được khai báo; compose-layers dịch chuyển nguyên lớp, không giải toàn bộ xương hoặc ngón tay |
| QA/contact sheet, GIF, motion inspection | Hỗ trợ model test và review độc lập | Pixel không tự chứng minh chân đã đặt đất hay bàn tay đã nắm đúng |

Nguồn chính: [README](https://github.com/aldegad/sprite-gen/blob/f7cb0dbbad9392b62fe7f358193f0c96115e58b9/README.md), [architecture](https://github.com/aldegad/sprite-gen/blob/f7cb0dbbad9392b62fe7f358193f0c96115e58b9/docs/architecture.md), [layer tracks](https://github.com/aldegad/sprite-gen/blob/f7cb0dbbad9392b62fe7f358193f0c96115e58b9/docs/layer-tracks.md), [compose_atlas.py](https://github.com/aldegad/sprite-gen/blob/f7cb0dbbad9392b62fe7f358193f0c96115e58b9/sprite_gen/compose/compose_atlas.py).

Tài liệu [QA motion](https://github.com/aldegad/sprite-gen/blob/f7cb0dbbad9392b62fe7f358193f0c96115e58b9/docs/qa-motion.md) yêu cầu kiểm mọi frame humanoid vì khuỷu, gối, tay và chiều dài chi dễ bị biến dạng. Walk/run chỉ được công nhận sau review chuyển động. `effects/anatomy.py` phục vụ vùng bảo vệ khi tạo chuyển động thở; không phải solver sửa tay/chân người. Vì vậy không thay lỗi IK hiện tại bằng một chuỗi frame AI chưa duyệt.

## Hướng tích hợp và các bước sản phẩm còn cần

### 1. Giữ model và tạo anchor theo hướng nhìn

Lấy ảnh gốc đã được người dùng chọn làm chuẩn Lila/Karo: mặt, tóc, râu, viền trang phục, tay đen, tỷ lệ và màu ấm. Duyệt anchor cho chính diện, nghiêng, 3/4 và phía sau trước khi làm động tác tương ứng. Dùng phong cách minh họa của nguồn; không ép nhân vật thành pixel art.

Không mirror toàn bộ nhân vật để giả góc đối diện: tóc buộc lệch và áo một vai sẽ đổi bên. Upstream có `--handed` và `handed-check` cho phụ kiện bất đối xứng, nhưng giới hạn detector theo màu/độ lộ vật thể vẫn cần review. Tạo tham chiếu trái/phải riêng khi bất đối xứng có ý nghĩa.

### 2. Làm thư viện acting được duyệt

Mỗi diễn viên có nhóm động tác: đứng/nghe/phản ứng, nói/nhìn bạn diễn, đi/chạy/nhảy, ngồi/cúi/nhặt/cầm, cầm/nhắm/đâm giáo. Chạy nhảy dùng chu kỳ; đâm giáo và phản ứng có điểm vào, cao trào và hồi phục. Không lặp hành động một lần như loop chạy.

Động tác phức tạp bằng hai tay nên thử **full-body action** có pose, thân và đạo cụ đồng bộ. Khi tách giáo ra lớp riêng, phải đăng ký hai điểm grip và tip ở từng frame; không chỉ gắn một điểm rồi mặc định tay còn lại đúng. Đây là lựa chọn thiết kế, chưa phải kết quả đã được kiểm chứng.

Layer composer upstream chỉ căn lớp qua một cặp pivot bằng phép dịch. Nó không tự giải hai điểm nắm hoặc hướng mũi giáo: hình học của frame phải được tác giả đăng ký phù hợp, rồi Factory kiểm cả hai contact và tip. Landmark tay/chân của humanoid không tự sinh hoặc bắt buộc trong mọi row upstream.

Asset được cache và dùng lại giữa nhiều câu chuyện; bổ sung động tác theo nhu cầu cảnh. Thư viện săn/giáo không giới hạn chủ đề của tool vào săn hoặc máy móc.

### 3. Import contract, không đoán grid hoặc landmark

Adapter atlas phải đọc:

- `frame_layout.rows.<state>[i]`: rect trong atlas và thứ tự phát, kể cả rect được dùng lại.
- `animation.rows.<state>.durations_ms[i]`: thời gian frame nếu có; `fps` và `loop` theo manifest.
- `rig.landmarks` nếu asset có đăng ký; manifest atlas dùng tọa độ tuyệt đối trong atlas. Chuyển về tọa độ frame bằng rect trước khi đặt tay/chân/đạo cụ trong cảnh.
- Tên diễn viên/state/view, hash source/asset, provenance model/provider và trạng thái review trong manifest của Factory. Đây là metadata tích hợp đề xuất, không phải tất cả đều sẵn trong upstream.

Motion strip của pipeline video có descriptor khác atlas: cần adapter riêng, không ép cả hai vào `frame_layout`. Asset thiếu timing/anchor cần chặn hoặc đưa về công việc đăng ký có chủ đích.

Timing atlas hiện được xuất đều theo state; strip có `delay_ms` và anchor riêng. Sau khi lấy landmark về tọa độ frame, áp anchor đã đăng ký và transform actor/stage để đặt đúng trong cảnh. Không coi đáy giữa canvas là bàn chân thật nếu chưa có phép đo.

Player dùng clock chính của cảnh để chọn frame theo tổng duration. Seek tới cùng clock phải cho cùng frame; không dùng timer phụ tự chạy lệch narration. Loop chỉ áp dụng đúng state; action một lần có chính sách kết thúc rõ. Chuyển state cần pose vào/ra phù hợp, không crossfade hai cơ thể để che sai tư thế.

**Ràng buộc code hiện tại:** `packages/scenes/security.ts` chỉ cho scene.js khai báo timeline GSAP tạm dừng và các lệnh `tl.set/to/from/fromTo` với dữ liệu literal; không nhận callback, loop hoặc JavaScript tùy ý. Adapter phải biên dịch frame thành các lệnh timeline trong contract này, dùng asset đã đăng ký. Nếu cần primitive mới, sửa có phạm vi trong compiler/renderer/validator tin cậy; không chèn sampler do model tự viết hoặc nới validator toàn cục.

**Ngữ nghĩa hành động tách khỏi loop flag:** `video-set` có thể xuất `attack` theo pinned cycle; exporter strip gán `loop=true` cho mọi kind khác `one-shot`. Factory cần metadata phát một lần/lặp theo hành động của câu chuyện và policy kết thúc (giữ pose cuối/trở về rest). Không đọc `loop=true` rồi lặp cú đâm giáo mãi. Giữ flag nguồn trong provenance để sự khác biệt được nhìn thấy.

### 4. Tiếp tục pipeline truyện/giọng chung

Ba nguồn vẫn là **kịch bản nguyên văn / WAV giữ giọng và clock / câu chuyện → kịch bản trung thành**. Director quyết định diễn viên, mục tiêu hành động, bạn diễn, biểu cảm, camera và đạo cụ; asset engine chỉ cung cấp hình/chuyển động. Player/GSAP/HyperFrames dựng cảnh theo timeline chung.

Sprite cả người đã bake mặt không tự có miệng riêng. Muốn nói/đổi biểu cảm đúng nguồn phải có asset hoặc head/face track tương ứng, đăng ký đúng view; lớp miệng không được chồng lệch trên khuôn mặt. Không gọi motion loop là phoneme lip-sync. Đồng bộ audio EN/VI/JA/KO và TTS ngoài vẫn thuộc pipeline narration hiện có.

## Provider và môi trường

Source có image provider `codex`, `grok`, `openai`; `gen-set` hiện chỉ nhận `codex|grok`. Video adapter gọi Grok Imagine qua xAI. Endpoint của provider nằm trong code, chưa có adapter Gemini/9router hoặc CLI gateway URL trong phần generation đã kiểm.

Hai hướng nối 9router: viết provider riêng theo khả năng image/video thực tế của router; hoặc để Factory tạo/nhận asset bên ngoài rồi dùng các bước extract/compose của sprite-gen. Chưa kiểm tra router có endpoint tạo video/ảnh tương thích; chat model hoặc review ảnh không đồng nghĩa với model sinh video.

| Thành phần | Kiểm tra tại máy trong lượt khảo sát | Nếu triển khai |
|---|---|---|
| Python | Có Python 3.11 trong PATH; chưa cài sprite-gen | Venv riêng, pin commit/version và dependencies |
| ffmpeg | Có `C:/ffmpeg/bin/ffmpeg.exe` | Xác minh runtime khi model test được giao |
| img2webp | Không thấy trong PATH đã kiểm | Bổ sung nếu dùng nhánh video/WebP |
| RIFE | Không thấy `rife-ncnn-vulkan` trong PATH đã kiểm | Tùy chọn cho nội suy/repair video; không chứng minh đã mượt |
| Node/render | Manifest yêu cầu Node ≥22.13; HyperFrames 0.8.96 | Tái dùng renderer hiện tại, thêm sprite player/importer |
| Credentials | Chưa gọi generation provider | Cấu hình riêng theo provider thực sự dùng; không tự chuyển tài khoản/dịch vụ |

Không thấy trong PATH không chứng minh phần mềm không có ở thư mục khác. Không chạy cài đặt, download model, tạo ảnh/video hay acceptance test trong lượt này.

## Công việc và nghiệm thu còn lại

1. Thử một động tác khó của Karo và một động tác Lila theo đúng ảnh mẫu; so sánh cả clip, identity, viền áo và màu với source. Quyết định dùng atlas row hay video-derived action dựa vào evidence.
2. Xây importer, manifest Factory và player seek theo clock; fingerprint/cache và ràng buộc actor/view/asset review.
3. Đăng ký grasp/foot contact và chuyển động vào–ra; kiểm mọi frame, không chỉ keypose.
4. Bổ sung head-view/expression/speech phù hợp, nhìn và phản ứng bạn diễn, tóc/râu/áo chuyển động phụ nếu asset hỗ trợ.
5. Model test kiểm runtime, seek, alpha, frame timing, seam, đổi state, đạo cụ và video có lời; chạy nhiều câu chuyện cho cả ba input. Review ảnh/code hiện tại không thay nghiệm thu này.

`productionReady=false`, `productionRig=null` vẫn giữ. Đánh giá source chỉ xác nhận hướng công cụ có ích; chưa xác nhận chất lượng hình/chuyển động, tích hợp đã chạy hoặc sản phẩm đã hoàn thành.

Review source độc lập: **partially-confirmed**. Reviewer đối chiếu source/fingerprints và chỉ ra hai điểm tích hợp cần bổ sung: contract GSAP/validator hiện có và attack pinned-loop không đồng nghĩa với hành động phải lặp trong truyện. Tài liệu đã bổ sung hai giới hạn đó; verdict không phải nghiệm thu runtime hoặc chứng minh chất lượng hình.
