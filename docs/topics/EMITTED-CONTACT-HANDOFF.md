# Điểm chạm theo SVG được vẽ — source0.86

**Tiếp nối hiện hành:** [source0.87 — projected relations](PROJECTED-RELATIONS-HANDOFF.md). Phạm vi dưới đây giữ nguyên snapshot0.86; các phần còn thiếu không phải nghiệm thu mới.

Source `forest-tribe-0.86-emitted-contact`, producer `story-direction-2.2.49`. Tiếp nối [hành động giáo source0.85](ORIGINAL-SPEAR-ACTIONS-HANDOFF.md). Đây là source candidate; **chưa nghiệm thu runtime, video hoặc toàn sản phẩm**.

## Phần code đã bổ sung

- Artwork tùy chọn `artDirection.models[].contactFrame` khai báo pivot, center, handle tùy chọn và drawable bounds do tác giả đo trên chính hình đó. Tất cả là tỷ lệ viewport **sau** SVG/viewBox/preserveAspectRatio, có tính khoảng trống. Không suy luận điểm chạm từ nhãn hoặc artwork của người khác. Không tự duyệt nét vẽ từ metadata.
- Renderer bọc toàn glyph đã chiếu vào đúng một `.contact-model-root`, bên ngoài nested SVG. Base và foreground dùng chung ma trận AttrPlugin; các nhóm `.motion` bên trong giữ transform tĩnh của tác giả. Không đồng thời thêm `motionOrigin`. Nếu giữ `handleAnchor` cũ thì phải bằng handle mới. `controlMode=none` giữ điều khiển thật trong artwork, tránh một núm renderer đứng ngoài model đang xoay.
- Original world có grid bắt đầu ở `sourceWorld.startMs` và các breakpoint thực của event. Camera lấy giao với clock gốc, không chạy lại event ở đầu cut; validator giữ cùng fps ở các cut có contactFrame. Điểm truy vấn đọc chính các hệ số ma trận đã phát ra, có tính quy tắc làm tròn số trung gian của GSAP complex strings. Endpoint giữ giá trị serialized. Cut entry nội suy grid gốc; **không tuyên bố byte-exact browser equivalence qua lượng tử hóa ở biên cut**.
- Fixed target có thể xoay/dịch theo clock gốc và điểm chạm đi theo hình. Với bàn tay đang giữ một điểm cố định, kiểm tra toàn khoảng contact–recovery trên các camera và breakpoint: anchor phải đứng yên và hiện hình. Không cấp khả năng hand-following cho gesture vốn có target cố định. Phép truy vấn fixed không được dùng thay owner hoặc canonical bake.
- Model owned/canonical giữ một authority vật lý duy nhất; world không được dịch/xoay độc lập cùng entity. Foreground owned dùng đúng kích thước local và **sao chép kênh transform JS thực** của owner, kể cả unwrapped angle, rounded scale và clock; không chỉ lấy tâm để dịch hình. Canonical foreground theo bake thật đang dùng trong renderer.
- Camera fixed dùng bốn góc drawable bounds qua các ma trận thực, có padding lượng tử hóa. Canonical dùng center envelope của bake; owned dùng vòng bao bảo thủ cho mọi góc xoay và scale đã serialize. Bounds là khai báo của tác giả, chưa chứng minh contour hoặc occlusion thật.
- `emittedTransformTrack` nhận compilation **đang dùng trong renderer**, đối chiếu original plan/profile/compiler/clock/namespace và các JS transform channel tương ứng. Đọc translate/rotate/scale đã serialize; không wrap góc về đường ngắn, đoán scale hoặc dùng physical center thay kênh vẽ. Đây là đối chiếu source và artifact nội bộ, không phải chứng minh provenance bằng mật mã.
- `inspectEmittedSpearActions` nhận compilations của đúng từng người và canonical bake do renderer cung cấp. Kiểm cả hai grip trên shaft ở các keyframe/midpoint; chỉ camera half-open chứa contact gốc kiểm tip với target độc lập đang được vẽ. Các cut trước/sau ghi contact **NOT INSPECTED**, không tạo contact mới hoặc mượn compilation camera khác. Canonical target không tự compile lại, tránh vòng world→tip→ownership→world. Report giữ `continuousGeometryVerified=false`, `contactVerified=false`, `motionVerified=false`, `productionApproval=false`.
- Cache, schema definitions, acting brief, prompt và raw manifest nhận contract mới. Các dữ liệu hình/mặt/tóc/trang phục gốc không chỉnh sửa trong lần này.

Khai báo tối thiểu, chỉ dùng sau khi đo đúng trên artwork của chính model:

```json
{
  "contactFrame": {
    "version": "model-contact-frame-1",
    "pivot": {"x": 0.5, "y": 0.5},
    "anchors": {"center": {"x": 0.5, "y": 0.5}, "handle": {"x": 0.75, "y": 0.5}},
    "bounds": {"left": 0, "right": 1, "top": 0, "bottom": 1}
  },
  "controlMode": "none"
}
```

Giá trị ví dụ không phải registration đã duyệt cho bất kỳ model sản xuất nào.

## Phần còn thiếu để dùng sản xuất

1. Model test chạy 12 callbacks mới và regression source0.84/0.85, fixed operation, ownership, world, camera, cache/review/resume. Hiện tất cả callbacks mới **DECLARED / NOT RUN**. Fixture mới chỉ có target authored xoay quanh center, hai người cầm giáo, đổi lead và cut. Cần thêm fixture target dịch tại contact, owned target chuyển động, canonical target shared/handoff, hướng đối diện, foreground/depth và thiếu/mâu thuẫn nguồn; chưa có bằng chứng các ca đó pass.
2. Đối chiếu DOM/SVG/GSAP thật với tọa độ report ở contact, giữa frame, fractional/reverse/random seek và biên camera; kiểm actual AttrPlugin rounding/time precision. Probe hữu hạn không chứng minh mọi thời điểm, contour, draw order hoặc visibility. Kiểm khớp tay/chân, cả hai palm, shaft/tip, mắt/mũi/miệng/tóc, viền và nền qua **video 60fps thực**.

   Source còn phải nối endpoint của relation/flow và các overlay nhãn/focus/thermal vào declared projected model geometry khi chúng cần đi theo hình. Renderer hiện giữ các kênh overlay theo contract cũ; chúng không được dùng làm physical contact authority. Phần mới chưa có nghiệm thu cảnh target vừa di chuyển vừa có relation/flow hoặc occlusion thay đổi.
3. Hoàn thiện và duyệt native art/acting đúng ảnh mẫu: Lila/Karo da ấm, nét mặt không méo, trang phục có viền, chuyển hướng và nhìn bạn diễn; nét tay chân mềm nhưng giữ giải phẫu hợp lý; màu môi trường day/sunset/night đậm, có chiều sâu. Nam phụ trọc **không tóc, không râu**; nữ phụ giữ mẫu. Không mirror/warp mặt, vay ROI hoặc dùng slideshow thay diễn xuất.
4. Nghiệm thu tool tổng quát: **câu chuyện/chủ đề → kịch bản**, kịch bản nguyên văn, WAV giữ giọng/ASR và legacy SRT; EN chính/VI/JA/KO + TTS HTTP/command/local ngoài; narration clock từ audio thật, review/repair; resume/locks/rebuild; final MP4 có tiếng, SRT, thumbnail, storyboard, profile/timeline, asset manifest và QC. Giáo là một khả năng diễn xuất, không giới hạn chủ đề hoặc cốt truyện.
5. Production gate `needs-source-prop-binding` còn nguyên. Phải tích hợp và nghiệm thu đầy đủ trước khi mở final; không xóa riêng gate để làm một fixture pass. Topic giữ `productionReady=false`, `productionRig=null`, mọi `availableBanks=[]`; không có art/motion/production approval. `TEST-RESULTS.md` V1 không nghiệm thu source0.86. **Chưa thể coi đây là tool đã sẵn sàng sử dụng hoàn chỉnh.**

## Môi trường và lệnh cho model test

Node >=22.13, PowerShell, `npm ci` nếu chưa có dependencies. Source build cục bộ dùng Node24.19.0. Studio/video cần Chromium/Hyperframes, FFmpeg/FFprobe; voice/ASR hỗ trợ đúng ngôn ngữ. Gateway/TTS key cấu hình môi trường hoặc `.env`, không đưa vào Git, chat hoặc báo cáo.

Implementation chỉ đọc/sửa source, build/typecheck, export schema **definitions**, raw hash/header/JSON inventory và source-only advice qua 9router. Không gọi callback/fixture/schema instance/geometry/sampler/compiler/render/browser/server/API pipeline/TTS/ASR/audio/video. D checkout và server8850 được giữ nguyên.

**Dành cho model test, chưa được implementation chạy:**

```powershell
Set-Location -LiteralPath 'C:/Users/Duongvh-pc/.codex/worktrees/stickman-acting-v22/Story-2-video-factory2.1'
git rev-parse HEAD
npm run build
npm run test:typecheck
node --experimental-test-module-mocks --import tsx --test --test-concurrency=1 tests/model-contact-frame.test.ts tests/source-spear-emitted.test.ts tests/source-spear-actions.test.ts tests/source-spear-model.test.ts tests/native-source-spear.test.ts tests/source-world.test.ts tests/source-fixed-operation.test.ts tests/source-interactions.test.ts tests/ownership-render.test.ts tests/original-source-audit.test.ts
```

Chỉ khởi động Studio riêng sau khi xác nhận cổng8851 trống; giữ nguyên Studio8850. Đọc địa chỉ thật từ output:

```powershell
$env:STUDIO_PORT='8851'
npm run studio
```

Schema/source candidate đang bị chặn production không thể được coi là video pass; không nới gate hoặc sửa lời kể để che lỗi. Model test ghi full SHA, commands/exit/stdout, failures, NOT RUN và ảnh/video thực, rồi chuyển lỗi cụ thể cho công việc triển khai.

## Bằng chứng source

Kiểm build/typecheck/schema/raw bytes được ghi ở `reviews/emitted-contact-source-record-v1.json`; không phải runtime acceptance. Một lượt source-only combo `tester` trả HTTP200 / `gpt-6-luna`, 2.858 giây, 20.181 tokens; trả `issues:[]` với giới hạn không chạy runtime/render/media. Sau snapshot đó, parent sửa lỗi cú pháp, test typing/assertion và siết fixed-query scope. Không tuyên bố final integration đã được model khác review độc lập.
