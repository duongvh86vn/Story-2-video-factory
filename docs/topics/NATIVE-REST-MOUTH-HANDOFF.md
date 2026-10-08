# Lila/Karo — miệng khép khi im lặng

Mốc source0.35, 08/10/2026; base `664137c012f24ed5b9987b6131f50abae2252d24`, branch `codex/prehistoric-life`. Mốc trước có source hand continuity và sửa creative/repair context; không có runtime/visual acceptance. Mục tiêu đầy đủ của sản phẩm vẫn chưa hoàn thành.

Source checks hiện tại: full build, test:typecheck, schema export và whitespace exit0. Independent source review ban đầu HOLD một P2 ở assertion prefix khi đổi vai actor; đã sửa và follow-up bounded source PASS. Chín callback mới NOT RUN; không có runtime/artwork/production acceptance. Source SHA sẽ ghi ở record sau push.

## Thay đổi có thể kiểm tra

Karo trong PNG góc 3/4 gốc cười hở răng. Chế độ speech cũ tắt overlay khi hết activity nên quay lại miệng đang mở. Chế độ mới **opt-in** `appearance.bodySpeech='registered-rest-mouth-v1'` đặt một plate miệng khép cố định trong đúng ROI, rồi mở contour theo cùng activity/source clock. Không mặc định thay profile hoặc duyệt rig. `registered-mouth-v1` và không chọn speech giữ hành vi hiện có.

Lila có nụ cười khép trong ảnh native: chế độ mới dùng chính artwork đó khi im lặng, không thêm tile hoặc thay mặt cô ấy. Karo có hai tile PNG riêng cho hai view; không mirror hướng phải để tạo hướng trái. Chỉ plate vùng miệng được dùng, không lấy toàn bộ ảnh nhân vật mới thay ảnh gốc.

```json
{
  "characterVariant": "karo",
  "artworkVersion": "forest-body-view-1",
  "bodyView": "three-quarter-left",
  "bodySpeech": "registered-rest-mouth-v1",
  "bodyEyes": "registered-eyes-v1"
}
```

Đây là phần appearance ghép vào đầy đủ host/cast contract; không phải một file project hoàn chỉnh. `bodyView` và `characterVariant` bắt buộc. SourceColour chỉ cho thân source, nên không trộn với view native. Profile/cast/source clocks và final gates vẫn kiểm bình thường.

## Artwork và nguồn

Built-in imagegen đã tạo bốn output, có prompt đầy đủ trong [provenance](../../library/topics/prehistoric-life/body-views/rest-mouth-generation-v1.json). Hai output toàn nhân vật bị loại: hướng phải thêm tay/chân và đổi chiều cao canvas; hướng trái dịch khuôn mặt/thân. Không output toàn thân nào được đăng ký renderer.

Hai output dùng hiện tại sinh từ reference chỉ có vùng miệng gốc: SVG document 640×448, native region 160×112. PNG output giữ nguyên 1500×1049 RGB, không sửa hoặc resample bitmap; SVG đặt bằng uniform scale160/1500, sai khác chiều cao canvas tile so với region112 được giữ và ghi rõ. ROI hữu hạn che mouth cavity/rim, không warp cả mặt. PNG/source hashes và source dimensions910×1729 ghi trong `body-view-rest-mouth.ts` và [số đo/artwork tĩnh](reviews/native-rest-mouth-art-v1.json).

- Hướng phải: tile là fill không có nét cười khép; zero-aperture SVG cung cấp contour. Hướng trái: tile có nét khép, contour SVG đặt theo nó. Chi tiết đường chồng, màu/texture/rim seam **cần nghiệm thu**, không suy identity đúng chỉ từ hash.
- Răng chế độ mới bám subcurve của actual upper Bézier, tránh răng bị clip mất ở hướng trái. Tongue/interior cũng nằm trong aperture clip. Đây là hình học artwork; không là phoneme hoặc giải phẫu môi thật.
- [Bảng đối chiếu PNG](reviews/native-rest-mouth-art-v1.png), [SVG](reviews/native-rest-mouth-art-v1.svg) so sánh original và aperture shape0/.55/1 ở mỗi view. Shape amounts được author trực tiếp, không sample activity/time/pose/frame video.
- Toàn bộ source PNG/ảnh mẫu gốc giữ bytes/hash; clip ở vùng miệng không cấp quyền thay mắt/mũi/tóc/áo. Không ảnh generated nào tự được coi là approved.

## Đường code dùng chung

- `packages/animation/body-view-rest-mouth.ts`: selection, exact source/plate registrations, bounded clip, uniform placement, strict local URL/resolver/dimensions; Lila giữ native smile.
- `body-view-mouth.ts`: legacy envelope/clock giữ nguyên; rest Karo plate luôn có và contour opacity1, zero activity trả path khép. Lila vẫn fade speech overlay về native smile. Malformed activity/ownership giữ guard hiện có.
- `body-view-art.ts`: rest resolver cùng nguồn native vào head layer; mắt/mũi ngoài ROI không transform riêng.
- `forest-head-art.ts` / `forest-body-art.ts`: exact plate paths vào resource lists. Canonical scenes/creative validation/repair và staging dùng `actorRigResourcePaths`/readReferenceHeadAsset như hiện có; bytes hash không bỏ qua. Head renderer14/body compiler25, mouth protocol3 và fingerprint có rest registration/asset hashes.
- Compiler report ghi selection thực, source activity hash/clock, `audioVerified=false`, `phonemeLipSync=false`, `approved=false`. Cache/resume/repair identity nhận selection/profile và registered-art fingerprint; cắt cảnh vẫn dùng original whole-cue ownership/source phase, không khởi động lại mouth clock.
- Host/cast/Shot/Storyboard/API/CLI schema nhận selection mới qua cùng appearance contract. Workbench query/form có selection mới; cả hai speech choices dùng tín hiệu giả lập có nhãn segment-draft. Không mở productionReady hoặc tự đổi rig đang được duyệt.

## Trạng thái và ca bàn giao

**9 callbacks mới NOT RUN**, `tests/native-rest-mouth.test.ts`:

1. Explicit host/cast/workbench selection, default/source chưa tự chọn và invalid profile bị chặn.
2. Independent left/right exact asset bytes/dimensions/resources, Lila/legacy không stage dư tile.
3. Bounded/namespaced SVG, strict resolver/URL/dimensions và legacy artwork giữ hành vi.
4. Silence/zero boundaries/random seek: contour khép, đầu/tay không bị speech di chuyển.
5. Lila giữ native closed smile và cùng activity behavior.
6. Compiler/security/report/resource limits, actual selected protocol, audio metadata và unchanged expression/locomotion/final guards.
7. Canonical hai actor đổi primary/supporting qua cut: Karo giữ whole-cue clock, Lila nghe vẫn khép, namespace/resource hợp lệ.
8. Selection làm đổi cache/repair identity; repair/replay có board hiện hành và registered rest assets, mocked provider không gọi mạng.
9. Workbench giữ selection, labelled activity và trạng thái chưa duyệt.

Fixture chỉ dùng stage kỹ thuật có sẵn để chạm renderer contract; không là episode hay giới hạn tool vào chủ đề máy móc. [Record actual checks/source review](reviews/native-rest-mouth-source-review-v1.md). Controller không chạy callback/fixture, evaluator, GSAP/browser, API/model review ảnh, TTS/ASR/audio/pipeline/MP4. Asset generation và tài liệu artwork tĩnh là authoring, không runtime/video nghiệm thu.

Model test chạy trên source SHA ghi trong record, trong checkout/worktree riêng:

```powershell
Set-Location -LiteralPath 'C:/Users/Duongvh-pc/.codex/worktrees/stickman-acting-v22/Story-2-video-factory2.1'
git rev-parse HEAD
node --experimental-test-module-mocks --import tsx --test --test-concurrency=1 tests/native-rest-mouth.test.ts tests/native-source-gesture.test.ts tests/continuous-view-attention.test.ts tests/native-view-eyes.test.ts tests/source-speech-phase.test.ts tests/fixed-view-speech.test.ts tests/artwork-repair.test.ts
```

Ghi SHA/PASS/FAIL/NOT RUN/output/ảnh/clip. Kiểm miệng Karo khép thật ở silence/gap/level0, không ló răng hoặc hai đường môi; khi nghe Lila cũng khép; activity nối qua shot cut không giật. Review đầu/identity/mắt mũi/rim/texture/màu ở tỷ lệ video, random seek + actual playback giữa các thời điểm, bytes/compile time/fps, asset staging/hash/resume/locks/repair sibling change. Kiểm audio-RMS thật trên WAV/TTS và ba input riêng; segment-draft chỉ là tín hiệu chẩn đoán.

## Server/môi trường

Node≥22.13, npm/package-lock, TypeScript/Vite/Sharp/GSAP hiện có. Mốc này không start/restart8850/8851. Model test có thể khởi động server riêng:

```powershell
Set-Location -LiteralPath 'C:/Users/Duongvh-pc/.codex/worktrees/stickman-acting-v22/Story-2-video-factory2.1'
powershell -ExecutionPolicy Bypass -File scripts/start-studio.ps1 -Port 8851 -ProjectsRoot 'projects-native-rest-mouth-test'
```

Giữ terminal, Ctrl+C dừng đúng server đó. Mở `http://127.0.0.1:8851/`. Preview pose: `/api/topics/prehistoric-life/body?action=rest&view=three-quarter-left&mouth=registered-rest-mouth-v1&timeMs=0&mood=happy`; thử phải và speaking time2300. Đây là local inspector, chưa là episode. 9router/TTS dùng config/env đã có, không gửi/in/commit key; không ghi đè project8850.

Static artwork document có thể tạo lại bằng `node --import tsx scripts/native-rest-mouth-art.ts`: chỉ native PNG metadata/hash + pure SVG shape authoring, không actor/audio clock. Không dùng nó thay runtime test.

## Việc còn phải hoàn thành

Miệng khép happy không thay thế full neutral/emotion/brow bank hoặc head turn. Còn identity/seam approval, biểu cảm tự nhiên, quay đầu/thân, walk/run/jump/seating, tóc/áo/râu và prop/spear contact, bối cảnh màu sống động, cuối cùng nghiệm thu episode bất kỳ với Lila/Karo là **diễn viên trong chuyện**. Giữ đầy đủ script nguyên văn→voice/timeline thật, WAV giữ giọng/audio-clock→ASR, câu chuyện→kịch bản bám nội dung→video và SRT; EN chính/VI/JA/KO, external/local HTTP/command TTS. productionReady=false/productionRig=null, source/identity/voice/target/sync final gates giữ nguyên. Chưa bàn giao dùng sản xuất cho đến khi các yêu cầu đầy đủ có evidence thật.
