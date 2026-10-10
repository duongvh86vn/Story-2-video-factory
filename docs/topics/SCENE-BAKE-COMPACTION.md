# Đóng gói cảnh GSAP và bàn giao kiểm chứng — lượt source115

11/10/2026. Goal đầy đủ vẫn là story/script/WAV → hai diễn viên đóng câu chuyện → video đạt QC. Lượt này gỡ chặn cảnh HTML5/GSAP, chưa sửa anatomy, diễn xuất hoặc mỹ thuật; không có final mới. Tiến độ **40%, +0 điểm phần trăm**.

## Thay đổi

`packages/scenes/packed-timeline.ts` lưu tween theo từng target và giữ riêng thứ tự gọi nguyên gốc. Chuỗi số được lưu bằng chênh lệch số nguyên chỉ khi khôi phục được nguyên văn; chuỗi khác giữ nguyên. Payload gzip và decoder inflate cố định được nhúng vào `scene.js`, không eval/callback do model viết hoặc tải decoder qua mạng. Pako inflate-only0.2.9 được giữ kèm MIT license, không thay npm dependencies.

`secureSceneFiles()` đóng gói khối lớn khi tiết kiệm ít nhất10%. `validateSceneScript()` chỉ nhận đúng byte của decoder cố định, giải nén có giới hạn64 MiB, kiểm độ sâu/vector/count/order và kiểm lại toàn bộ lệnh bằng contract GSAP hiện có. Target/resource/thuộc tính/callback vẫn bị chặn như trước. Cap cảnh ở ca này vẫn2 MB. Giảm kích thước artifact **chưa giảm số tween hoặc bảo đảm tốc độ khởi tạo/RAM cho phim dài**.

Security version6 nhận thêm miệng `M...C...C...Z` compact, giữ giới hạn2–9 cubic,4096 ký tự và số hữu hạn/bounded. Alpha filter chỉ nhận `feComponentTransfer` không thuộc tính và `feFuncA type="discrete" tableValues="0 1"`.

Exporter ghi byte từng file, giữ ba file bị từ chối ở `work/rejected-scenes/<shot>/`, chỉ lưu tên file trong allowlist. Không đưa cảnh lỗi vào scenes/master. Output vẫn unapproved, không final/DONE. Artwork/registration/body compiler/topic giữ nguyên.

## Evidence

| Kiểm tra | Kết quả | Giới hạn |
| --- | --- | --- |
| Hai file unit trên source cuối | 6 PASS / 0 FAIL | Không phải nghiệm thu phim |
| Build; app/Studio/test typecheck; CLI help | exit0 | Receipts riêng |
| Cảnh Lila-left đầu tiên | 16.481.788 → 1.803.343 byte | Chỉ0–900 ms, tái dùng storyboard đã lưu |
| 61.739 lệnh trước/sau | Cùng hash | Giữ target, vars, timing, method, interleaving |
| Chrome tua tiến/lùi7 lần | DOM/PNG bằng nhau7/7 | Không chứng minh nguyên bản có anatomy tốt |
| HyperFrames lint/check,4 snapshot,draft,probe/decode | PASS | Im lặng0,9s/54frames, chưa final |
| Ca native-head resource/cap hiện có | FAIL sau kiểm cảnh đầu | Assertion gộp body-view vào head resources; chưa đi hết các shot |
| Regression56 ca; ba input đến final/QC; giọng | NOT RUN lại | Không lấy V1/source114 thay nghiệm thu mới |

Chạy tại worktree C, nền `7c1347142e3a082988941149ff4ffce23b94c176` với source đang sửa; receipts gắn hash file, không gán cho checkout nền sạch. [Index receipts](../validation/2026-10-11-prehistoric-source115/results.json). Clip/raw HTML/JS lớn được giữ ở runtime bị git-ignore; không ghi đè artifact cũ. Harness browser thử đầu timeout chờ timeline; giữ cả receipt đó và lượt kiểm lại thành công.

## Môi trường và lệnh

Windows/PowerShell, Node24.19.0, HyperFrames0.8.96, FFmpeg/FFprobe `C:/ffmpeg/bin/`. Dùng dependency hiện có; node_modules worktree là junction về D, **không npm ci tại worktree đó**. Các lệnh dưới không cần key hoặc gọi model/TTS.

```powershell
Set-Location 'C:/Users/Duongvh-pc/.codex/worktrees/stickman-acting-v22/Story-2-video-factory2.1'
node --import tsx --test tests/packed-timeline.test.ts tests/scene-baked-path.test.ts
npm run typecheck
npm run test:typecheck
npm run build
node --import tsx --test --test-name-pattern='factory renderer owns each native head resource' tests/native-head-seat-tracer.test.ts
```

Xuất lại toàn tracer (nặng hơn clip0,9s; có thể còn chặn ở shot/pose khác):

```powershell
npm run tracer:native-seat -- --native-heads --staging lila-left --acting emotional-reactions --face source-motion --validate --frames --render
npm run tracer:native-seat -- --native-heads --staging lila-right --acting emotional-reactions --face source-motion --validate --frames --render
```

Không `--wav` thì là nháp im lặng. Chỉ thêm WAV khi đúng clock tracer7,2s; không cắt/fit hoặc tạo giọng thay thế. Đây không phải ingest WAV tổng quát. Ba input đầy đủ phải kiểm bằng factory riêng và giữ các guard giọng/nguồn/đồng bộ.

Studio C riêng, dùng terminal riêng sau build:

```powershell
$env:STUDIO_PORT='8860'
npm run studio
```

Mở `http://127.0.0.1:8860/`. Cổng8850 thuộc D, không tự tải code C. Lượt này không khởi động/dừng server người dùng.

## Việc còn thiếu

1. Phân biệt body-view asset hợp lệ với native-head metadata trong test, giữ identity/namespace/nguồn đầu riêng. Chạy toàn vòng shot và cả hai bố trí; đo cap từng shot.
2. Sửa pose chống cằm từng tay bằng clock body/head/gesture nguyên gốc. Các lỗi fold151–158° source114 chưa được sửa bằng đóng gói. Kiểm cuff/elbow/wrist/palm/contact/hồi phục qua cut và reverse seek.
3. Review chuyển động, mặt, listener, góc nhìn, màu và bối cảnh trên câu chuyện đủ dài so với mẫu người dùng. Nền chẩn đoán đơn giản hiện tại chưa đại diện chất lượng cần đạt. Kiểm thêm quần chúng nam trọc không râu và nữ có tóc.
4. Đo biên dịch, khởi tạo và RAM cảnh dài. Nếu đổi sang player theo clock để giảm tween, phải giữ nguồn/giới hạn nội suy và chứng minh tương đương; không cắt frame hoặc tăng cap để báo đạt.
5. Chạy story→script, script nguyên văn, WAV gốc đến video; giữ SRT tương thích. Kiểm EN chính, VI/JA/KO, TTS local/external, thiếu giọng/fit lỗi và WAV+SRT mismatch. Lượt này không gọi dịch vụ trả phí.
6. Kiểm Studio/resume/cache/lock/rebuild, đổi nội dung/giọng/cast, audio/subtitle/clock và final/QC. Chỉ đóng goal khi đầy đủ MD có evidence hiện hành; không dùng source115 hoặc test V1 để báo DONE.
