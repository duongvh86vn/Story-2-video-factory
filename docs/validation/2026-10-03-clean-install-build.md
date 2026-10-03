# Cài dependencies sạch và build từ snapshot GitHub

Thực hiện ngày03/10/2026 Asia/Saigon (02/10UTC), snapshot `a292794a9066c244210dbc4764b21faa73142834` đã push nhánh và kiểm tra remote SHA khớp local. Parent kiểm tra cài đặt/biên dịch; runtime test vẫn giao model độc lập.

`git archive HEAD` xuất source có version vào thư mục mới `temp/clean-install-a292794/source`. Không chép node_modules, config/voice.yaml, model weights, .env hoặc runtime từ checkout đang dùng. ZIP SHA256 `f65575612d121dfe7cbc13718afcb52a3e8a4b2bdae902af6d2f02493a6fdee5`; package-lock SHA256 `f1a567fc4af51ce84fe2d48d58d91cfd822362ff4dcf3311c795c701b6bd426b`, bằng bản nguồn.

| Bước | Kết quả |
|---|---|
| Node/npm | v24.19.0 /11.6.1 trên Windows hiện tại |
| npm.cmd ci --no-audit --no-fund | Exit0,328packages,17s; theo lockfile, không đổi version |
| node_modules | Thư mục thường; reparsePoint=false, không dùng junction sang D checkout |
| npm.cmd run build | Exit0, kết thúc18:41:38.636UTC; core TS, Studio TS và Vite đều qua |
| Vite output |27modules; dist/studio/index.html + CSS/JS |

Raw build.log/build-result.json và source ZIP giữ trong temp riêng. Cài đặt/build không ghi hoặc thay node_modules của checkout người dùng. Một npm deprecation warning cho dependency glob được giữ trong output; chưa thực hiện audit bảo mật hay nâng dependency trong scope này.

Đây là clean dependency build trên cùng máy, vẫn có npm cache và công cụ hệ thống hiện có. Lượt kiểm tra độc lập sau đó đã dựng một English script → actors → final trong archive này; [phạm vi runtime và raw audit 30/31](2026-10-03-clean-english-runtime.md). Chưa chứng minh cài trên máy khác, renderer/browser/FFmpeg/ASR/TTS từ đầu hoặc lần chạy Studio đầu tiên. Endpoint OmniVoice/JA/KO/Azure chưa được cung cấp; không dùng build để chứng nhận giọng thật hay chất lượng phim.
