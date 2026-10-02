# Bộ công cụ video và hai plugin

Plugin HyperFrames và Remotion cung cấp skills hướng dẫn authoring, preview và render. Cài plugin không tự thêm renderer hoặc nâng chất lượng diễn xuất của app; code và dependency của app được quản lý riêng.

| Công cụ | Hiện có trong dự án | Vai trò plugin |
|---|---|---|
| Narration clock | Script/WAV/SRT, WAV+SRT, cache voice, measured timeline | Dùng clock này cho mọi renderer; không thay lời kể |
| Actor rig/choreography | Cast/profile/costume, fixed bones, performance samples, biểu cảm/gaze/contact/props | HyperFrames GSAP để author; Remotion có thể dùng frame samples trong React |
| Scene composer | HTML/CSS/SVG/GSAP với artwork/camera/caption và security gates | HyperFrames composition/CLI/GSAP hướng dẫn bố cục, timing và preview |
| Render tools | `VideoEngine`: validate, snapshot, renderDraft, renderFinal, preview; `HyperFramesEngine` đã triển khai | HyperFrames0.8.96 đang chạy thật; Remotion adapter chưa triển khai |
| Review/export | Draft/review/repair/final/QC, cast/timeline/manifests | Cùng gates/provenance nếu thêm renderer khác |

Ưu tiên renderer HyperFrames hiện có để cải thiện diễn xuất, key poses, đường tay, chuẩn bị/tiếp xúc/thu tay, nhịp camera và bố cục. Bố cục được kiểm tra ở hero frames; keyframes theo clock có thể seek/reverse. Palette và kiểu tạo hình theo truyện, không ép một preset hoặc vai người dẫn cố định.

Remotion phù hợp cho thành phần React tái sử dụng và preview theo frame. Nếu tích hợp: adapter phải dùng cùng actor/narration contracts, clock/hash/lock/cache, source/contact/security gates và output QC; cần evidence renderer thực. Không tuyên bố Remotion đã tích hợp hoặc chất lượng đã đạt chỉ vì plugin được cài.
