# Kế hoạch ba luồng — trạng thái triển khai V2.1

Yêu cầu đã duyệt: lời kể nguyên văn, tiếng Việt mặc định, một host/video, chạy tới final khi đủ điều kiện; runtime testing do model khác.

| Giai đoạn | Công việc | Trạng thái |
|---|---|---|
| P0 | Chọn nguồn; text ingest tách clock; schema/API/CLI/editor | Code đã bổ sung, build qua |
| P1 | Voice adapters/script actual clock/SRT fit/cache/reports | Code đã bổ sung, chờ runtime |
| P2 | Hai host MD/rig/preview/approval/identity | Code đã bổ sung, chờ runtime |
| P3 | Goal/entities/relations; tám recipe; target/contact/speech | Code đã bổ sung, chờ runtime/semantic |
| P4 | Pipeline automatic/Studio/resume/rebuild/final/QC exports | Code đã nối, chờ runtime |
| P5 | Spec/status/map/examples/build/typecheck/test handoff/GitHub | Tài liệu/build hoàn tất; mã ở commit bàn giao GitHub |

Đối chiếu yêu cầu và evidence source nằm trong IMPLEMENTATION-MAP.md. Các file đầu vào mẫu ở examples/steam-explainer và car-explainer; không có video V2.1 đã nghiệm thu đi kèm. Build/typecheck không thay tiếng Việt TTS/ASR/render/vision thực tế.

Bước tiếp theo do model nghiệm thu: thực hiện matrix TEST-HANDOFF.md trên commit bàn giao, ghi V2.1 results/evidence, báo lỗi có project/config/stage/cue/shot cụ thể. Khi lỗi xuất hiện, sửa phạm vi liên quan và chạy lại ca lỗi cùng hồi quy ảnh hưởng. Không dùng V1 results để đóng P1–P4 về mặt runtime.
