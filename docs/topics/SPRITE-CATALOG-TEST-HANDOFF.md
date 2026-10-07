# Bàn giao test — thư viện chuyển động cho Director và Studio

## Source và trạng thái

Implementation `d974dbd44e4cae43bfb68d21041ab9eb02b3bff6`, fixes `d8954d7`, `8401278ddfe4064c28b924ca53916b7fb8a21943`, base `3561c5c`. Native reviewer hết quota; một review tổng và hai review slice qua 9router timeout, không có verdict. **Chưa qua review độc lập.** Fresh build/typecheck/schema export exit 0 tại source `8401278`, diff check clean; [accumulator](reviews/sprite-catalog-source-review-v1.md) giữ findings và phạm vi. Không suy diễn PASS từ các request thất bại. Runtime/assertions/fixtures/GSAP/browser/API/CLI/model/TTS/ASR/render/MP4 **NOT RUN**; API agent source review là hoạt động riêng, không phải test model/pipeline.

Thêm 13 ca catalog, 6 ca API và 1 ca canonical renderer: **20 declarations mới**, chưa chạy. Hai ca sau `d974dbd` kiểm danh sách form không đầy đủ và invalidation phần hình giữ narration/locks. Chúng kiểm source contract và cache/revision; ảnh vuông trong fixture không chứng minh anatomy hoặc độ mượt. Topic vẫn `productionReady=false`, `productionRig=null`. Mọi motion vẫn candidate, final/speech/rig-props/continuous-handoff gates còn giữ.

## Môi trường và lệnh dành cho model test

Source tại `C:/Users/Duongvh-pc/.codex/worktrees/stickman-acting-v22/Story-2-video-factory2.1`, nhánh `codex/prehistoric-life`. Dùng Node >=22.13/npm lockfile hiện có. Các ca dưới đây dùng fixture tạm, mock các thao tác production coordinator; chỉ invalidation bookkeeping dùng hàm thật trong callback để kiểm state/audio/locks. Không gọi provider/model/audio/video; không dùng project người dùng đang mở ở Studio làm fixture.

```powershell
node --experimental-test-module-mocks --import tsx --test --test-concurrency=1 tests/sprite-motion-catalog.test.ts tests/sprite-motion-catalog-api.test.ts
node --experimental-test-module-mocks --import tsx --test --test-concurrency=1 tests/cinematic-sprites.test.ts tests/async-planning-normalize.test.ts
node --experimental-test-module-mocks --import tsx --test --test-concurrency=1 tests/creative-director.test.ts tests/sprite-motion-api.test.ts
```

Lệnh chỉ được ghi để bàn giao; controller chưa thực chạy. Regression có canonical renderer 15 ca hiện tại, gồm 1 ca mới explicit renderer, và async normalize 2 ca đã có.

## Contract cần xác nhận

- `input/motion-catalog.json`: version `actor-motion-catalog-1`, mỗi entry gồm `motionId`, `fingerprint`, `label`, `capabilities`. State/actor/view/reference/native clock được lấy từ descriptor bất biến; không đoán từ label hoặc tên state.
- Capabilities là kind/movement/operation của acting, không chứa câu thoại hoặc claim mới. Không cho speech/unsupported, movement ngoài locomotion hoặc operation ngoài manipulation. Khai đúng capability vẫn chưa duyệt motion bằng mắt/video.
- Catalog missing: revision null, entries empty. JSON malformed, >2 MiB, duplicate version/capability, unknown version hoặc corrupt PNG phải lỗi; không bỏ qua entry để có partial success. PUT stale revision trả 409 và giữ edit mới.
- Director nhận compact native timing/playback, anchor-relative frame bounds và common landmarks. Explicit `presentation.actor_renderer: sprite` cần actor shots dùng spriteStage/catalog đúng actor/version/state/capability; không silently dùng rig. Không có field và catalog giữ behavior trước; explicit rig từ chối sprite. Object-only cutaway vẫn được phép.
- Catalog fingerprint tham gia visual planning/resume; narration fingerprint riêng. Thay annotation/asset version phải bỏ cache thiết kế cũ, giữ audio hợp lệ và locks. Scene validation kiểm lại annotation của các descriptor thực sự được dùng, source PNG và input identity.
- API GET/PUT `/api/projects/:name/motions/catalog` có idle/mutation guard; PUT `{catalog,revision}` strict, không nhận path/provider/account. Lưu thay đổi thực sự invalidate đến TIMED ngay, giữ narration input hash/audio và locks, không chạy production. Lưu cùng canonical bytes không invalidate; stale/corrupt/busy không invalidate. CLI `motion-catalog <project>` trả JSON verified; `configure --actor-renderer rig|sprite` dùng chung settings.
- Studio “Thư viện chuyển động” cho preview và đánh dấu nhiều capability; không giảm entry nhiều capability thành một, không tự approve asset. Form bị chặn nếu một annotation không có phiên bản tương ứng trong danh sách GET, tránh save xóa entry vô hình khi hai GET đi qua một edit. Chọn “Chuyển động từ ảnh” trong form nội dung. Hash/ID ở details; tên/mô tả phải được escape.

## Nghiệm thu bổ sung bằng UI/pipeline thật

Sau các ca trên, model test dùng project riêng với motion ứng viên đã nhập, catalog và authored/story direction hợp lệ. Xác nhận load/save nhiều capability, preview đúng phiên bản, stale save, project switch và production busy. API hoặc CLI dùng để nhập/check vẫn là runtime cần giao model test, không là proof từ build.

Kiểm model-context/cache/locked shot qua pipeline: kịch bản/WAV/câu chuyện → storyboard chọn asset đúng → scenes/draft. Sửa catalog, đổi fingerprint, xóa entry đang dùng rồi resume/rebuild; state đã invalidate nên bản xuất hình cũ phải stale ngay. Giữ narration/audio và locks đã có, báo lỗi rõ với locked selection thiếu. Ghi nguồn frame/asset thực được phát. Kiểm cache hash theo đúng effective system prompt, gồm rule sprite và movement đã thêm, không chỉ template ban đầu.

Speech/props/continuous handoff/final acceptance cho sprite **chưa triển khai**; test phải báo thiếu hoặc blocker tương ứng, không nới gate để có PASS. Art motion Lila/Karo đủ góc nhìn/poses/biểu cảm, acceptance receipts và các video ba input đạt mẫu vẫn cần hoàn thành. Catalog không thay thế những phần đó.

Ghi MD kết quả với commit, lệnh, exit code, từng assertion thất bại/NOT RUN và bằng chứng UI/video khi có. Chuyển findings cho model triển khai; không tự sửa source trong ca test được người dùng giao chỉ kiểm và báo thiếu.
