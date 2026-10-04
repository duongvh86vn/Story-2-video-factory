# Artwork projection — source và kiểm tra độc lập 04/10/2026

Review source/phim native chỉ ra font bị ép dẹt bởi viewport100×100 trung gian rồi scale độc lập hai trục. Source mới có `projection: model-viewport` cho complete SVG: đặt viewport bằng bounds của part và giữ viewBox/aspect policy. Omitted/`normalized-stretch` giữ behavior cũ. [Contract](../ARTWORK-PROJECTION.md) tách rõ geometry, typography và contact; không tự đổi các phim cũ hoặc miễn gate.

Passive SVG/source/motion validation vẫn áp dụng. Root mới yêu cầu một complete SVG, đúng4 signed decimal/exponent values, extents finite dương và dimensions hợp lệ. Renderer `passive-svg-2.2.5` tham gia scene/cinematic input identity; narration fingerprint không đổi. Creative context/prompt hướng artist tới sourced stage-pixel labels hoặc viewport được chọn rõ. Shot/storyboard JSON schemas đã tạo lại.

Parent build qua sau thay đổi cuối, không chạy runtime tests. Independent checks giữ nguyên các raw FAIL:

| Lượt | Kết quả thực tế |
|---|---|
| First public renderer + existing art-direction |22/29 PASS; existing9/9 PASS.7 failures gồm browser parent và6 leaves, đa số camera fixture, chưa chứng minh projection lỗi |
| Corrected camera/composed CTM + hex negative |4/8 PASS; square/tall/explicit-none/explicit-meet qua browser. Hex origin được chấp nhận sai;2 fractional bounds failures chưa rõ nguyên nhân |
| Sau sửa grammar, thêm preassert metrics | Hex/decimal-exponent-comma checks PASS; date/qualifier bounds còn FAIL, giữ assertion cũ và samples |
| Sau xác định sai số browser | Named5/5 PASS: hex reject, decimal/exponent/comma/repeated-comma contract,2 browser leaves và parent. Final-file whole `test:typecheck` exit0 |

Bounds nguyên mẫu sai khoảng0.00001486px (date viewport) và0.00001068px (qualifier legacy), trong khi integer400×100 control đúng. Sau đo thật, chỉ bbox comparison đổi tolerance1e-5→1e-4 stage pixel và ghi lý do; giữ công thức, axis ratio/em, pivot, reverse exact, source/security/identity assertions. Đây là độ chính xác số của SVG trong browser; không thay production QC threshold hay bỏ lỗi layout. Bản test trước sửa và logs FAIL vẫn giữ.

Public scenes trước sửa grammar đã giữ byte-identical cho default/normalized với complete baseline1d2f915, gồm anchors; passive executable/resource/source/missing-motion/AttrPlugin negatives qua. Bốn browser cases trước grammar và hai browser cases sau grammar có aspect/bounds/local pivot/seek0→2→3→2→0 evidence riêng. Không cộng các lượt thành một full-suite PASS hoặc retag bằng chứng trước sửa thành source cuối.

Evidence outside repo:

- `C:/Users/Duongvh-pc/.codex/task-state/story-video-v22/font-layout-source-review-1d2f915-20261004/REPORT.md`:900 hashes giữ nguyên; source report persist trễ35s.
- `C:/Users/Duongvh-pc/.codex/task-state/story-video-v22/artwork-projection-runtime-20261004/REPORT.md`: raw first/corrected failures,8 source hashes giữ; report trễ6s.
- `C:/Users/Duongvh-pc/.codex/task-state/story-video-v22/artwork-projection-grammar-followup-20261004/REPORT.md`: grammar fix, preassert/integer controls, tolerance-fix named5/5, final-file typecheck và terminal receipts.17 owned process terminal; freeze released. Deadline gốc02:05:46UTC giữ nguyên, report persist02:05:56UTC trễ10s; không khởi động thêm runtime sau deadline.

**NOT RUN:** genuine renderer-version resume/audio/cache preservation trên source cuối, source cuối full-suite, full films với mode mới, full30fps playback/listening, native acting/quality acceptance. Original native5b5c FAIL và authored V2PARTIAL vẫn giữ cho artifact gốc. Tính năng typography này không hoàn thành toàn dự án.
