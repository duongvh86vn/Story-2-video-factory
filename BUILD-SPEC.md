# STORY-TO-VIDEO FACTORY
## Model-agnostic system for MD + SRT/WAV → storyboard → code-built scenes → final MP4

**Version:** 1.0  
**Primary target:** Windows / local workstation  
**Primary renderer:** HyperFrames  
**Alternative renderer:** Remotion  
**LLM strategy:** model-agnostic; DeepSeek / Gemini / OpenAI-compatible / local models can be swapped without changing the video engine.

---

# 0. Mục tiêu

Xây dựng một hệ thống tự động nhận:

```text
1. source.md
   - chủ đề
   - nội dung/câu chuyện
   - yêu cầu phong cách
   - mô tả nhân vật
   - quy tắc cố định nhân vật
   - dữ kiện quan trọng

2. narration.srt
   hoặc
   narration.wav
   hoặc tốt nhất: cả hai

3. optional assets/
   - reference character images
   - logo
   - historical photos
   - product images
   - diagrams
   - music
   - SFX
```

và tự động tạo:

```text
source.md
   +
narration.srt / narration.wav
   ↓
INGEST
   ↓
TIMELINE
   ↓
STORY ANALYSIS
   ↓
CHARACTER BIBLE
   ↓
CHAPTERS
   ↓
BEATS
   ↓
STORYBOARD
   ↓
SHOT PLAN
   ↓
ASSET PLAN
   ↓
SCENE CODE
   ↓
PREVIEW
   ↓
CONTACT SHEETS
   ↓
VISION REVIEW
   ↓
AUTO REPAIR
   ↓
RENDER
   ↓
AUDIO MIX
   ↓
CAPTIONS
   ↓
QUALITY CONTROL
   ↓
FINAL VIDEO
```

Output cuối:

```text
output/
├─ final.mp4
├─ final.srt
├─ thumbnail.png
├─ storyboard.json
├─ storyboard.md
├─ character-bible.json
├─ timeline.json
├─ asset-manifest.json
├─ qc-report.json
└─ production-report.md
```

---

# 1. Câu trả lời cho câu hỏi về model

## Có thể dùng DeepSeek / Gemini Flash thay Claude Code hoặc Codex không?

**Có.**

Điểm quan trọng:

> Model không phải là renderer video.

Model chỉ cần thực hiện tốt các nhiệm vụ:

```text
đọc nội dung
phân tích narration
chia chapter
chia beat
tạo storyboard
viết scene spec
viết HTML/CSS/JS/React
sửa code khi validator báo lỗi
đánh giá screenshot nếu model có vision
```

Video thực tế được tạo bởi:

```text
HyperFrames
Chromium
HTML/CSS/JS
GSAP
Three.js
Remotion
FFmpeg
```

Do đó kiến trúc phải:

```text
MODEL ≠ VIDEO ENGINE
```

mà là:

```text
MODEL
   ↓
STRUCTURED PLAN / CODE
   ↓
VIDEO ENGINE
   ↓
MP4
```

---

# 2. Không phụ thuộc vào Claude Code

Không thiết kế:

```text
Claude Code
   ↓
everything
```

Thiết kế:

```text
             ┌─────────────────────┐
             │ MODEL ADAPTER       │
             ├─────────────────────┤
             │ DeepSeek            │
             │ Gemini              │
             │ OpenAI-compatible   │
             │ Ollama              │
             │ local model         │
             └──────────┬──────────┘
                        │
                        ▼
              ┌──────────────────┐
              │ ORCHESTRATOR     │
              │ STATE MACHINE    │
              └─────────┬────────┘
                        │
         ┌──────────────┼───────────────┐
         ▼              ▼               ▼
      STORY          SCENES          REVIEW
         │              │               │
         └──────────────┼───────────────┘
                        ▼
              ┌──────────────────┐
              │ VIDEO ENGINE     │
              └─────────┬────────┘
                        ▼
                     MP4
```

---

# 3. Vì sao State Machine tốt hơn autonomous agent

Các coding agent mạnh thường có:

```text
filesystem
shell
terminal
browser
error recovery
tool calling
context management
```

Nhưng không phải model nào bạn add vào gateway cũng có môi trường agent tốt như vậy.

Do đó hệ thống này KHÔNG yêu cầu model phải tự:

```text
npm install
cd folder
ffmpeg
run renderer
inspect filesystem
```

Thay vào đó:

```text
MODEL:
trả JSON hoặc source code

ORCHESTRATOR:
ghi file
validate
chạy command
đọc error
gửi error cho model
retry
```

Ví dụ:

```text
DeepSeek
   ↓
scene.json
   ↓
our application
   ↓
generate files
   ↓
HyperFrames check
   ↓
ERROR
   ↓
our application
   ↓
send ERROR + code back to DeepSeek
   ↓
patch
```

Ưu điểm:

- model nhỏ hơn vẫn dùng được;
- không phụ thuộc tool-use implementation;
- dễ debug;
- dễ retry;
- rẻ hơn;
- dễ đổi model;
- an toàn hơn;
- reproducible.

---

# 4. Model Router

Tạo:

```text
config/models.yaml
```

Ví dụ:

```yaml
models:

  planner:
    provider: gateway
    model: gemini-3.8-flash
    temperature: 0.3

  storyboard:
    provider: gateway
    model: gemini-3.8-flash
    temperature: 0.5

  coder:
    provider: gateway
    model: deepseek-4.1-flash
    temperature: 0.2

  repair:
    provider: gateway
    model: deepseek-4.1-flash
    temperature: 0.1

  visual_review:
    provider: gateway
    model: gemini-3.8-flash
    temperature: 0.1

  fallback:
    provider: gateway
    model: gemini-3.8-flash
    temperature: 0.2
```

Tên model chỉ là ví dụ.

Hãy sử dụng đúng model ID mà gateway/tool của bạn expose.

---

# 5. Model interface

Tất cả provider phải implement:

```typescript
interface ModelAdapter {
  generateText(input: ModelRequest): Promise<ModelResponse>;

  generateStructured<T>(
    input: ModelRequest,
    schema: JsonSchema
  ): Promise<T>;

  analyzeImages?(
    input: VisionRequest
  ): Promise<ModelResponse>;

  analyzeAudio?(
    input: AudioRequest
  ): Promise<ModelResponse>;
}
```

Không để business logic phụ thuộc model name.

---

# 6. Provider adapters

Cấu trúc:

```text
packages/models/
├─ adapter.ts
├─ registry.ts
├─ openai-compatible.ts
├─ gemini.ts
├─ deepseek.ts
├─ ollama.ts
├─ litellm.ts
└─ mock.ts
```

Nếu API DeepSeek đang dùng OpenAI-compatible:

```text
OpenAICompatibleAdapter
```

có thể dùng luôn.

---

# 7. Structured Output First

Model phải trả JSON.

Không cho model trả một đoạn prose dài rồi parser đoán.

Ví dụ:

```json
{
  "chapterId": "ch01",
  "title": "The problem",
  "startMs": 0,
  "endMs": 22400,
  "purpose": "Introduce the original engineering problem",
  "beats": []
}
```

Mọi response phải:

```text
JSON Schema
    ↓
Zod validate
    ↓
PASS / FAIL
```

FAIL:

```text
schema error
   ↓
repair prompt
```

---

# 8. GitHub / open-source projects nên tận dụng

Mục tiêu là KHÔNG viết lại những gì cộng đồng đã làm tốt.

---

## 8.1 HyperFrames — renderer chính

Repository:

https://github.com/heygen-com/hyperframes

Documentation/examples:

https://github.com/heygen-com/hyperframes-launch-video

HyperFrames phù hợp nhất với kiến trúc này vì:

```text
HTML
CSS
JS
SVG
Canvas
GSAP
Lottie
Three.js
media
      ↓
seekable animation
      ↓
deterministic frames
      ↓
MP4
```

Agent có thể viết web code dễ hơn việc viết một video engine.

### Chiến lược

**Không tự viết renderer từ đầu ở V1.**

Dùng:

```bash
npx hyperframes lint
npx hyperframes check
npx hyperframes render
```

hoặc Node API:

```text
@hyperframes/producer
```

Hệ thống của chúng ta tập trung vào:

```text
story intelligence
storyboard
continuity
shot design
asset plan
automatic repair
```

---

# 9. HyperFrames Producer

Production backend có thể gọi trực tiếp:

```typescript
import {
  createRenderJob,
  executeRenderJob,
} from "@hyperframes/producer";
```

Flow:

```text
our orchestrator
      ↓
@hyperframes/producer
      ↓
compile
capture frame
encode
audio
      ↓
MP4
```

Như vậy không cần spawn CLI cho mọi thứ.

MVP vẫn có thể spawn CLI cho đơn giản.

---

# 10. Remotion — renderer thứ hai

Repository:

https://github.com/remotion-dev/remotion

Agent skills:

https://github.com/remotion-dev/skills

Remotion rất mạnh khi:

```text
React
data-driven layouts
captions
audio
charts
UI animations
template videos
```

Kiến trúc nên có:

```text
RenderEngine
```

để sau này hỗ trợ:

```text
HyperFramesEngine
RemotionEngine
MotionCanvasEngine
ManimEngine
```

Nhưng:

> V1 chỉ implement HyperFramesEngine.

Không xây hai engine cùng lúc.

---

# 11. prompt2video — học orchestration

Repository:

https://github.com/jeromeetienne/prompt2video

Điểm nên học:

```text
prompt
 ↓
agent
 ↓
project scaffold
 ↓
narration
 ↓
scene
 ↓
Remotion
 ↓
render
```

Không clone nguyên architecture.

Chỉ học:

- cách chuyển prompt → project;
- cách agent nhận skill;
- cách narration ảnh hưởng duration;
- cách đóng gói output.

---

# 12. MoneyPrinterTurbo — học pipeline video factory

Repository:

https://github.com/harry0703/MoneyPrinterTurbo

Đây là repository rất đáng nghiên cứu về:

```text
script
voice
stock footage
subtitles
BGM
model provider
WebUI
API
CLI
batch generation
```

Đặc biệt học:

```text
provider abstraction
asset sourcing
task/service architecture
configuration
Web UI workflow
```

Nhưng hệ thống của chúng ta khác ở chỗ:

```text
MoneyPrinterTurbo:
script → footage matching → edit

Our system:
narration → storyboard → programmatic scene → render
```

Có thể kết hợp cả hai:

```text
code scene
+
stock footage
+
generated image
+
real historical image
```

---

# 13. video-shotcraft — shot recipe library

Repository:

https://github.com/karekin/video-shotcraft

Nên học:

```text
shot recipe
camera language
style library
motion patterns
sound design patterns
```

Mục tiêu dài hạn:

```text
our shot library
```

không bắt model nghĩ camera từ số 0 ở mọi video.

---

# 14. remotion-ai-video — continuity pattern

Repository:

https://github.com/zhaosenlin12-creator/remotion-ai-video

Đây là một reference rất gần use case của chúng ta:

```text
narration
 ↓
chapters
 ↓
beats
 ↓
fixed character
 ↓
Remotion
 ↓
contact sheet
 ↓
review
```

Đặc biệt học:

```text
fixed character assets
chapter / beat schema
contact sheet
ffprobe validation
black frame detection
```

---

# 15. WhisperX — audio alignment

Main project family:

https://github.com/m-bain/whisperX

Useful agent wrapper example:

https://github.com/ThePlasmak/whisperx

WhisperX hữu ích nếu input là:

```text
narration.wav
```

và cần:

```text
word timestamps
segment timestamps
speaker diarization
forced alignment
```

---

# 16. faster-whisper

Repository:

https://github.com/SYSTRAN/faster-whisper

Dùng khi:

```text
cần transcription nhanh
không nhất thiết cần alignment cực chính xác
```

Có thể làm:

```text
default ASR = faster-whisper

precision mode = WhisperX
```

---

# 17. Motion Canvas

Repository:

https://github.com/motion-canvas/motion-canvas

Rất hợp với:

```text
explainers
technical diagrams
how-it-works
animated vector scenes
```

Nhưng không cần trong V1.

Có thể thêm adapter sau.

---

# 18. Manim

Repositories:

https://github.com/ManimCommunity/manim

https://github.com/3b1b/manim

Dùng cho:

```text
math
physics
engineering diagrams
geometry
technical explanation
```

Không dùng làm general renderer.

Chỉ gọi như một specialized scene generator.

---

# 19. FFmpeg

FFmpeg là lớp cuối:

```text
mux
audio mix
normalize
subtitle
concat
transcode
thumbnail
QC
```

Không cố viết media processing bằng Node nếu FFmpeg đã giải quyết tốt.

---

# 20. Kiến trúc tổng thể

```text
┌────────────────────────────────────────────┐
│ INPUT                                      │
│                                            │
│ source.md                                  │
│ narration.srt / narration.wav              │
│ assets/*                                   │
└─────────────────────┬──────────────────────┘
                      │
                      ▼
┌────────────────────────────────────────────┐
│ INGEST                                     │
│                                            │
│ Markdown parser                            │
│ SRT parser                                 │
│ FFprobe                                    │
│ Whisper / WhisperX                         │
└─────────────────────┬──────────────────────┘
                      │
                      ▼
┌────────────────────────────────────────────┐
│ CANONICAL PROJECT MODEL                    │
│                                            │
│ story.json                                 │
│ narration.json                             │
│ character-bible.json                       │
│ timeline.json                              │
└─────────────────────┬──────────────────────┘
                      │
                      ▼
┌────────────────────────────────────────────┐
│ AI PRE-PRODUCTION                          │
│                                            │
│ Story Analyst                              │
│ Beat Planner                               │
│ Storyboard Director                        │
│ Asset Planner                              │
└─────────────────────┬──────────────────────┘
                      │
                      ▼
┌────────────────────────────────────────────┐
│ STORYBOARD                                 │
│                                            │
│ chapters                                   │
│ beats                                      │
│ shots                                      │
│ visual intent                              │
│ camera                                     │
│ characters                                 │
│ asset requirements                         │
└─────────────────────┬──────────────────────┘
                      │
                      ▼
┌────────────────────────────────────────────┐
│ SCENE FACTORY                              │
│                                            │
│ template selector                          │
│ scene spec                                 │
│ scene coder                                │
│ asset resolver                             │
└─────────────────────┬──────────────────────┘
                      │
                      ▼
┌────────────────────────────────────────────┐
│ HYPERFRAMES                                │
│                                            │
│ HTML/CSS/JS                                │
│ SVG                                        │
│ Canvas                                     │
│ GSAP                                       │
│ Three.js                                   │
└─────────────────────┬──────────────────────┘
                      │
                      ▼
┌────────────────────────────────────────────┐
│ REVIEW LOOP                                │
│                                            │
│ snapshots                                  │
│ contact sheet                              │
│ visual reviewer                            │
│ continuity reviewer                        │
│ code repair                                │
└─────────────────────┬──────────────────────┘
                      │
                      ▼
┌────────────────────────────────────────────┐
│ FINAL RENDER                               │
│                                            │
│ HyperFrames                                │
│ FFmpeg                                     │
│ captions                                   │
│ BGM                                        │
│ SFX                                        │
└─────────────────────┬──────────────────────┘
                      │
                      ▼
┌────────────────────────────────────────────┐
│ QC                                         │
│                                            │
│ ffprobe                                    │
│ blackdetect                                │
│ freezedetect                               │
│ audio levels                               │
│ duration                                   │
└─────────────────────┬──────────────────────┘
                      │
                      ▼
                  FINAL.MP4
```

---

# 21. Input folder

Mỗi video là một project:

```text
projects/
└─ tesla-history/
   ├─ input/
   │  ├─ source.md
   │  ├─ narration.wav
   │  ├─ narration.srt
   │  │
   │  └─ assets/
   │     ├─ references/
   │     ├─ images/
   │     ├─ video/
   │     ├─ music/
   │     └─ sfx/
   │
   ├─ work/
   ├─ scenes/
   ├─ previews/
   └─ output/
```

---

# 22. source.md format

Không bắt buộc người dùng phải viết schema phức tạp.

Parser chấp nhận Markdown tự nhiên.

Khuyến nghị template:

```markdown
# TITLE

The Story of ...

# PURPOSE

Kể lại câu chuyện ...

# STORY

...

# CHARACTER

## Nikola Tesla

- male
- age around ...
- tall
- narrow face
- dark hair
- dark suit
- serious expression

Immutable:
- face structure
- hairstyle
- body proportions

Can change:
- pose
- expression
- lighting

# VISUAL STYLE

Cinematic historical documentary.
2.5D illustrations.
Warm practical lighting.
No modern objects.

# RULES

- Do not invent named historical people.
- Keep Tesla visually consistent.
- Narration controls timing.
```

---

# 23. Canonical source parsing

Model không đọc raw Markdown ở mọi stage.

Stage đầu tiên chuyển:

```text
source.md
```

thành:

```text
story.json
```

Ví dụ:

```json
{
  "title": "The Story of Tesla",
  "genre": "history",
  "language": "vi",
  "story": "...",

  "style": {
    "visual": "cinematic historical documentary",
    "era": "late 19th century"
  },

  "rules": [
    "Do not invent named historical people",
    "Narration controls timing"
  ],

  "characters": [
    {
      "id": "tesla",
      "name": "Nikola Tesla",
      "description": "...",
      "immutableTraits": [],
      "mutableTraits": []
    }
  ]
}
```

---

# 24. Narration is the master clock

Đây là nguyên tắc số 1.

Không để model tự quyết:

```text
scene 1 = 5 seconds
scene 2 = 8 seconds
```

nếu narration đã có timing.

Luôn:

```text
NARRATION
   ↓
TIMELINE
   ↓
SCENES
```

Không:

```text
SCENES
   ↓
try to fit narration
```

---

# 25. Input mode A — SRT only

Nếu có:

```text
narration.srt
```

parse thành:

```json
{
  "cues": [
    {
      "id": 1,
      "startMs": 0,
      "endMs": 3420,
      "text": "..."
    }
  ]
}
```

Timeline video = timestamp SRT.

### Audio

Nếu không có WAV:

Options:

```text
A. render video không narration
B. generate TTS
C. user supplies audio later
```

Nếu generate TTS:

**Không được làm timeline trôi tự do.**

TTS phải:

```text
generate per cue/per paragraph
measure duration
fit or adjust within safe tolerance
```

Nếu TTS quá dài:

```text
regenerate delivery
or
slightly time-stretch
or
extend beat if project allows
```

---

# 26. Input mode B — WAV only

Nếu có:

```text
narration.wav
```

Pipeline:

```text
WAV
 ↓
ffprobe
 ↓
ASR
 ↓
word timestamps
 ↓
segments
 ↓
narration.json
 ↓
SRT
```

Recommended:

```text
Fast:
faster-whisper

Precise:
WhisperX
```

---

# 27. Input mode C — SRT + WAV

Đây là mode tốt nhất.

```text
SRT text
+
WAV timing
    ↓
alignment
```

Rule:

```text
SRT = authoritative text
WAV = authoritative audio
alignment = word/phrase timing
```

Output:

```text
narration.aligned.json
```

---

# 28. narration.json

Canonical format:

```json
{
  "durationMs": 183240,

  "segments": [
    {
      "id": "seg001",
      "startMs": 0,
      "endMs": 4860,
      "text": "..."
    }
  ],

  "words": [
    {
      "text": "Năm",
      "startMs": 220,
      "endMs": 410
    }
  ]
}
```

Story planner chỉ dùng canonical format này.

---

# 29. Chapter detection

Không cắt video tùy ý 5 giây.

Model phải hiểu semantic narrative.

Ví dụ:

```text
0:00–0:28   The problem
0:28–1:02   The inventor
1:02–1:48   First prototype
1:48–2:31   Failure
2:31–3:15   Breakthrough
```

Chapter schema:

```json
{
  "id": "ch03",
  "startMs": 62000,
  "endMs": 108000,
  "title": "The first prototype",
  "summary": "...",
  "narrativePurpose": "show first physical attempt"
}
```

---

# 30. Beat detection

Chapter được chia thành beat.

Beat khoảng:

```text
2–8 sec
```

nhưng semantic boundary quan trọng hơn số giây.

Ví dụ:

```text
Narration:
"Ông dùng một rotor bằng đồng..."

Beat:
show rotor construction

Narration:
"nhưng nguyên mẫu đầu tiên nhanh chóng quá nhiệt..."

Beat:
show heat build-up and failure
```

---

# 31. Beat schema

```json
{
  "id": "b012",
  "chapterId": "ch03",

  "startMs": 68320,
  "endMs": 72820,

  "narrationText": "...",

  "meaning": "First prototype overheats",

  "visualGoal": "Show the prototype heating beyond safe limits",

  "importance": 0.85
}
```

---

# 32. Shot planning

Beat không đồng nghĩa một shot.

Một beat có thể:

```text
1 shot
2 shots
3 micro-shots
```

Storyboard Director quyết định.

---

# 33. Shot schema

```json
{
  "id": "shot_0012",

  "startMs": 68320,
  "endMs": 70500,

  "sceneType": "technical-cutaway",

  "subject": "early electric motor prototype",

  "characters": [],

  "visualDescription":
    "Copper rotor turning inside a cutaway motor assembly",

  "camera": {
    "shotSize": "macro",
    "movement": "slow push-in",
    "angle": "three-quarter"
  },

  "motion": [
    "rotor spins",
    "heat glow gradually appears"
  ],

  "transitionIn": "match-cut",
  "transitionOut": "hard-cut",

  "assetNeeds": [],

  "textOnScreen": null,

  "renderer": "hyperframes"
}
```

---

# 34. Scene types

Tạo vocabulary cố định.

```text
historical-reconstruction
character-scene
archival-photo
photo-parallax
map
timeline
technical-cutaway
exploded-view
process-diagram
factory-process
macro-detail
data-chart
document-highlight
newspaper
quote
kinetic-typography
ui-demo
schematic
comparison
before-after
object-hero
abstract-transition
```

Model chọn từ vocabulary trước.

Chỉ tạo custom scene type nếu thật sự cần.

---

# 35. Mapping theo thể loại

## HISTORY

Ưu tiên:

```text
historical reconstruction
map
timeline
document
portrait
archive
newspaper
diagram
2.5D parallax
```

---

# 36. TRUE INVENTION STORY

Ưu tiên:

```text
problem visualization
inventor
prototype
failure
iteration
breakthrough
patent/document
mechanism
impact
```

---

# 37. HOW IT'S MADE

Ưu tiên:

```text
raw material
machine
process step
cutaway
macro
flow diagram
temperature/pressure indicator
quality control
packaging
finished product
```

---

# 38. Visual Rule Engine

Không để một đoạn narration 20 giây chỉ có một ảnh đứng yên.

Rules:

```yaml
visual_rules:

  max_static_seconds: 4.0

  max_same_camera_seconds: 7.0

  preferred_shot_seconds:
    min: 2.0
    max: 6.0

  allow_long_shot_if:
    - complex animation
    - process demonstration
    - emotional character scene

  visual_change:
    minimum_per_10_seconds: 2
```

Không áp dụng cứng nếu story cần nhịp chậm.

---

# 39. Character Bible

Character consistency là subsystem riêng.

Không nhét toàn bộ character prompt vào từng prompt rồi hy vọng model nhớ.

Tạo:

```text
character-bible.json
```

---

# 40. Character schema

```json
{
  "id": "tesla",

  "name": "Nikola Tesla",

  "identity": {
    "genderPresentation": "male",
    "apparentAge": "30s-40s",
    "body": "tall and slender",
    "face": "long narrow face",
    "hair": "dark hair, side-parted",
    "facialHair": "thin mustache"
  },

  "wardrobe": {
    "default": "dark late-19th-century formal suit",
    "eraRules": []
  },

  "immutable": [
    "face proportions",
    "hair style",
    "body proportions",
    "mustache"
  ],

  "mutable": [
    "pose",
    "expression",
    "camera angle",
    "lighting"
  ],

  "negativeRules": [
    "no modern clothing",
    "no beard",
    "no blond hair"
  ],

  "referenceAssets": []
}
```

---

# 41. Character asset strategy

Nếu có image generator:

Không generate character lại từ đầu ở mỗi scene.

Flow:

```text
character bible
 ↓
master reference
 ↓
approved
 ↓
pose library
 ↓
reuse
```

Assets:

```text
assets/characters/tesla/
├─ master-front.png
├─ master-3q.png
├─ profile.png
├─ standing.png
├─ working.png
├─ thinking.png
└─ writing.png
```

---

# 42. Character lock

Sau khi master character được approve:

```text
LOCKED
```

Model không được thay:

```text
face
hair
body
wardrobe baseline
```

Trừ khi story yêu cầu:

```text
young Tesla
old Tesla
specific outfit
```

thì tạo version:

```text
tesla.age_28
tesla.age_42
tesla.age_70
```

---

# 43. Nếu không dùng image generation

Character vẫn có thể được giữ consistency bằng:

```text
SVG illustration
vector puppet
cutout character
fixed PNG poses
2.5D layers
silhouette
archive portrait
```

Đây thậm chí ổn định hơn image generation.

---

# 44. Asset Resolver

Mỗi shot tạo:

```text
asset request
```

Ví dụ:

```json
{
  "shotId": "shot_012",

  "requests": [
    {
      "type": "character",
      "characterId": "tesla",
      "pose": "working"
    },
    {
      "type": "diagram",
      "description": "AC induction motor cutaway"
    }
  ]
}
```

---

# 45. Asset priority

Thứ tự:

```text
1. existing local approved asset
2. reusable template
3. code-generated SVG/Canvas/Three.js
4. archive / stock source
5. image generation
6. video generation
```

Lý do:

```text
cost
consistency
control
speed
copyright/provenance
```

---

# 46. Code-first visuals

Đặc biệt với:

```text
history map
timeline
patent diagram
factory process
schematic
flow
machine cutaway
data
text
document
UI
```

nên code thay vì generate video.

---

# 47. Asset manifest

```json
{
  "assets": [
    {
      "id": "asset_001",
      "type": "image",
      "path": "assets/characters/tesla/working.png",
      "source": "local",
      "status": "approved",
      "hash": "..."
    }
  ]
}
```

---

# 48. Provenance

Nếu dùng internet asset:

ghi:

```text
source URL
author
license
retrieval date
local file
```

Không để model chèn URL remote thẳng vào scene.

Download asset trước.

Render offline nếu có thể.

---

# 49. Storyboard output

Tạo cả:

```text
storyboard.json
storyboard.md
```

JSON cho machine.

MD cho người đọc.

---

# 50. storyboard.md format

Ví dụ:

```markdown
## Shot 12 — 01:08.320 → 01:10.500

Narration:
> Chiếc rotor bằng đồng quay ngày càng nhanh...

Visual:
Cutaway illustration of an early induction motor.

Character:
None.

Camera:
Macro 3/4 push-in.

Animation:
- rotor rotation
- magnetic field arcs
- subtle heat rise

Assets:
- motor schematic SVG

Renderer:
HyperFrames / SVG + GSAP
```

---

# 51. Storyboard approval

Config:

```yaml
workflow:
  require_storyboard_approval: false
```

Nếu false:

```text
automatic production
```

Nếu true:

```text
stop after storyboard
```

cho user chỉnh trước.

---

# 52. Shot Recipe Library

Tạo:

```text
library/shots/
```

Ví dụ:

```text
historical-map/
patent-reveal/
newspaper-headline/
portrait-parallax/
factory-conveyor/
exploded-machine/
technical-cutaway/
timeline-zoom/
document-highlight/
macro-material/
before-after/
```

---

# 53. Shot Recipe manifest

```yaml
id: patent-reveal
renderer: hyperframes

works_for:
  - history
  - invention

duration:
  min: 2.5
  max: 7

inputs:
  - patent_image
  - highlight_regions
  - title

camera:
  default: slow_push

animation:
  - paper_enter
  - line_draw
  - highlight
```

---

# 54. Template-first generation

Scene coder prompt:

```text
FIRST:
search available shot recipes.

IF matching recipe exists:
reuse it.

ONLY if no suitable recipe:
create new scene implementation.
```

Điều này rất quan trọng.

Sau 100 video:

```text
library
```

sẽ tốt hơn việc model mạnh hơn.

---

# 55. Style Library

```text
library/styles/
├─ historical-cinematic.json
├─ technical-clean.json
├─ industrial-documentary.json
├─ watercolor-story.json
├─ dark-tech.json
└─ educational-flat.json
```

---

# 56. Global style

Ví dụ:

```json
{
  "id": "historical-cinematic",

  "palette": [
    "#171310",
    "#D4B483",
    "#E8DFCF"
  ],

  "typography": {
    "title": "Cormorant Garamond",
    "body": "Inter"
  },

  "motion": {
    "ease": "power2.inOut",
    "cameraSpeed": "slow"
  },

  "texture": {
    "filmGrain": 0.08
  }
}
```

---

# 57. Scene Project Structure

```text
scenes/
├─ shot_0001/
│  ├─ index.html
│  ├─ scene.js
│  ├─ style.css
│  └─ scene.json
│
├─ shot_0002/
└─ ...
```

Hoặc:

```text
compositions/
```

theo cấu trúc HyperFrames.

---

# 58. Scene Coder input

Scene Coder KHÔNG được nhận toàn bộ project không cần thiết.

Chỉ gửi:

```text
global style
character bible subset
shot spec
assets
runtime rules
available components
```

Giảm context → model Flash hoạt động tốt hơn.

---

# 59. Scene Coder contract

Output:

```json
{
  "files": [
    {
      "path": "scene.js",
      "content": "..."
    }
  ],

  "dependencies": [],

  "notes": []
}
```

Orchestrator tự ghi file.

Model không cần filesystem tool.

---

# 60. Deterministic animation

Không dùng wall clock.

Cấm:

```javascript
Date.now()
performance.now()
Math.random()
setInterval()
uncontrolled requestAnimationFrame()
```

Nếu dùng random:

```text
seeded random
```

---

# 61. Seekable timeline

Ví dụ GSAP:

```javascript
const tl = gsap.timeline({
  paused: true
});

tl.from(".title", {
  opacity: 0,
  y: 60,
  duration: 0.8
});

function seek(time) {
  tl.time(time, false);
}
```

Renderer quyết định time.

---

# 62. Scene timing

Mỗi shot:

```text
startGlobal
endGlobal
duration
```

Scene local time:

```text
globalTime - shotStart
```

---

# 63. Caption timing

Không dựa vào `setTimeout`.

Caption hiển thị theo:

```text
current composition time
```

Input:

```text
narration.json
```

---

# 64. HyperFrames check loop

Sau khi scene được generate:

```text
hyperframes lint
 ↓
hyperframes check
```

Nếu fail:

```text
capture:
error
file
line
browser console
snapshot
```

Gửi model Repair.

---

# 65. Repair prompt

Không gửi:

```text
"it doesn't work, fix it"
```

Gửi:

```text
SHOT SPEC
CURRENT FILE
EXACT ERROR
RUNTIME RULE
EXPECTED RESULT
```

Model chỉ trả patch/file replacement.

---

# 66. Max repair

```yaml
repair:
  max_attempts_per_scene: 3
```

Nếu quá:

```text
fallback to simpler recipe
```

Không loop vô hạn.

---

# 67. Graceful degradation

Nếu complex scene fail:

```text
Three.js complex scene
 ↓ fail
SVG scene
 ↓ fail
static illustration + parallax
```

Video phải hoàn thành.

Không để một scene giết toàn pipeline.

---

# 68. Preview snapshots

Mỗi shot capture:

```text
0%
25%
50%
75%
100%
```

Ví dụ:

```text
previews/shot_0012/
├─ f000.png
├─ f025.png
├─ f050.png
├─ f075.png
└─ f100.png
```

---

# 69. Contact sheet

Ghép snapshots thành:

```text
contact-sheet-shot-12.jpg
```

và toàn video:

```text
contact-sheet-global.jpg
```

---

# 70. Visual Reviewer

Nếu model có vision:

Input:

```text
contact sheet
storyboard
style
character bible
```

Output JSON:

```json
{
  "pass": false,

  "issues": [
    {
      "shotId": "shot_12",
      "type": "character-continuity",
      "severity": "high",
      "description": "Hair shape differs from reference",
      "repair": "Use approved working pose asset"
    }
  ]
}
```

---

# 71. Reviewer categories

```text
story accuracy
visual relevance
character continuity
era continuity
composition
readability
text overflow
blank frames
bad crop
camera jump
visual repetition
artifact
subtitle overlap
```

---

# 72. Character Reviewer

Tách riêng rule-based + vision.

Checks:

```text
correct character asset
correct version
correct costume era
no conflicting generated identity
```

---

# 73. Story Reviewer

Compare:

```text
narration
vs
storyboard visual
```

Question:

```text
Does the visual contradict narration?
```

Không hỏi:

```text
Is this beautiful?
```

chỉ.

---

# 74. Factual content

Đối với:

```text
history
true stories
invention
```

source.md nên được coi là:

```text
CANONICAL SOURCE
```

Model không tự thêm factual claims nếu không có.

Option:

```yaml
research:
  enabled: false
```

Nếu bật research:

```text
factual additions
```

phải ghi nguồn trong production report.

---

# 75. "How It's Made" correctness

Khi mô tả process:

```text
raw material
machine
step
temperature
pressure
sequence
```

không được model tự invent nếu source không nói.

Visual có thể stylize.

Process facts không được tự tạo.

---

# 76. Music

Input optional:

```text
assets/music/*
```

Nếu không:

```text
no music
```

hoặc music provider optional.

BGM không được thay narration.

---

# 77. Audio mixing

FFmpeg layer:

```text
voice.wav
music.wav
sfx.wav
    ↓
mix
    ↓
master.wav
```

Rules:

```text
voice = primary
music duck under speech
limit peak
avoid clipping
```

---

# 78. Loudness

Không hard-code một loudness standard cho mọi nền tảng.

Config:

```yaml
audio:
  target_lufs: -16
  true_peak: -1.5
```

Cho phép override.

---

# 79. SFX

Storyboard có thể request:

```json
{
  "sfx": [
    {
      "timeMs": 72000,
      "type": "machine-start",
      "intensity": 0.3
    }
  ]
}
```

Asset resolver tìm local SFX trước.

---

# 80. Subtitle modes

```text
none
burned
soft
both
```

Default:

```text
both
```

nếu user muốn YouTube.

---

# 81. Caption rendering

Nếu cần animated captions:

```text
render as composition element
```

Nếu chỉ subtitle chuẩn:

```text
SRT sidecar
```

---

# 82. Final render

Không render final ngay sau khi code compile.

Flow:

```text
draft render
 ↓
review
 ↓
repair
 ↓
draft render
 ↓
PASS
 ↓
production render
```

---

# 83. Draft profile

```yaml
draft:
  width: 960
  height: 540
  fps: 15
  quality: draft
```

---

# 84. Final profile

```yaml
final:
  width: 1920
  height: 1080
  fps: 30
```

Video 60fps chỉ khi thực sự cần.

---

# 85. Master composition

Không nhất thiết render từng shot thành MP4 rồi concat.

HyperFrames có thể dùng một root composition:

```text
index.html
```

gọi sub-compositions.

V1 có thể:

```text
one master composition
```

cho transition mượt.

---

# 86. Scene cache

Hash:

```text
shot spec
scene source
asset hashes
renderer version
```

Nếu không đổi:

```text
reuse
```

---

# 87. Incremental rebuild

Sửa shot 37:

Không regenerate:

```text
shot 1–36
shot 38–50
```

chỉ:

```text
shot 37
```

và rebuild master.

---

# 88. Project state machine

```text
NEW
 ↓
INGESTED
 ↓
TIMED
 ↓
ANALYZED
 ↓
STORYBOARDED
 ↓
ASSETS_READY
 ↓
SCENES_READY
 ↓
DRAFT_RENDERED
 ↓
REVIEWED
 ↓
REPAIRED
 ↓
FINAL_RENDERED
 ↓
QC_PASSED
 ↓
DONE
```

Persist:

```text
project-state.json
```

---

# 89. Resume

Nếu app crash ở:

```text
SCENES_READY
```

restart:

```text
resume from SCENES_READY
```

Không chạy lại từ đầu.

---

# 90. Production log

```text
logs/
├─ orchestrator.log
├─ model-calls.jsonl
├─ renderer.log
├─ ffmpeg.log
└─ errors/
```

Không log API key.

---

# 91. Model call log

Store:

```json
{
  "role": "storyboard",
  "model": "gemini-...",
  "promptHash": "...",
  "responseHash": "...",
  "tokens": {},
  "durationMs": 0,
  "status": "success"
}
```

Có thể debug model nào hay fail.

---

# 92. Cost tracking

```text
LLM
image generation
video generation
TTS
stock API
```

ghi vào:

```text
cost-report.json
```

---

# 93. Token efficiency

Không gửi toàn bộ source.md cho scene coder.

Pipeline:

```text
source.md
 ↓
canonical story
 ↓
chapter summary
 ↓
beat
 ↓
shot
```

Scene coder chỉ cần shot.

---

# 94. Context packages

Planner:

```text
full story
narration
characters
```

Storyboard:

```text
chapter
beats
global style
```

Coder:

```text
shot
assets
component docs
```

Reviewer:

```text
screenshot
shot
rules
```

Repair:

```text
source file
error
shot
```

---

# 95. Model escalation

Flash model trước.

Ví dụ:

```text
attempt 1:
cheap model

attempt 2:
same model + exact feedback

attempt 3:
fallback model
```

Không dùng expensive model mọi call.

---

# 96. Recommended role split

Nếu có DeepSeek + Gemini:

```text
Story Analyst        → Gemini
Storyboard Director  → Gemini
Scene Coder          → DeepSeek
Repair Coder         → DeepSeek
Visual Reviewer      → Gemini
Continuity Reviewer  → Gemini
```

Nhưng đây chỉ là default.

Benchmark trên dữ liệu thật rồi đổi.

---

# 97. Important: vision fallback

Nếu coder model không có vision:

Không sao.

```text
coder
   ↓
scene
   ↓
snapshot
   ↓
vision reviewer model
   ↓
structured issue
   ↓
coder
```

Model coder không cần nhìn hình.

---

# 98. Important: audio fallback

Model không cần native audio input.

WAV được preprocess:

```text
WhisperX
 ↓
JSON text + timing
```

rồi gửi JSON cho model.

Do đó model text-only vẫn tạo video được.

---

# 99. Main technology stack

```text
Node.js 22+
TypeScript
Zod
Commander
Fastify
SQLite
Vite
HyperFrames
GSAP
Three.js
FFmpeg
Python 3.11+
faster-whisper / WhisperX
```

Optional:

```text
React
Remotion
Motion Canvas
Manim
Docker
Redis
BullMQ
```

---

# 100. Repository structure

```text
story-video-factory/
│
├─ README.md
├─ BUILD-SPEC.md
├─ package.json
├─ tsconfig.json
│
├─ config/
│  ├─ models.yaml
│  ├─ rendering.yaml
│  ├─ audio.yaml
│  └─ workflow.yaml
│
├─ apps/
│  ├─ cli/
│  ├─ server/
│  └─ studio/
│
├─ packages/
│  │
│  ├─ orchestrator/
│  │  ├─ state-machine.ts
│  │  ├─ pipeline.ts
│  │  └─ jobs/
│  │
│  ├─ models/
│  │  ├─ adapter.ts
│  │  ├─ registry.ts
│  │  ├─ openai-compatible.ts
│  │  ├─ gemini.ts
│  │  └─ mock.ts
│  │
│  ├─ ingest/
│  │  ├─ markdown.ts
│  │  ├─ srt.ts
│  │  ├─ audio.ts
│  │  └─ ffprobe.ts
│  │
│  ├─ story/
│  │  ├─ analyze.ts
│  │  ├─ chapters.ts
│  │  ├─ beats.ts
│  │  └─ characters.ts
│  │
│  ├─ storyboard/
│  │  ├─ director.ts
│  │  ├─ schemas.ts
│  │  └─ validate.ts
│  │
│  ├─ assets/
│  │  ├─ resolver.ts
│  │  ├─ manifest.ts
│  │  └─ providers/
│  │
│  ├─ scenes/
│  │  ├─ generator.ts
│  │  ├─ repair.ts
│  │  ├─ recipes.ts
│  │  └─ validator.ts
│  │
│  ├─ render/
│  │  ├─ engine.ts
│  │  ├─ hyperframes.ts
│  │  └─ ffmpeg.ts
│  │
│  ├─ review/
│  │  ├─ contact-sheet.ts
│  │  ├─ visual.ts
│  │  ├─ continuity.ts
│  │  └─ story.ts
│  │
│  ├─ audio/
│  │  ├─ mix.ts
│  │  └─ normalize.ts
│  │
│  ├─ captions/
│  │  ├─ parser.ts
│  │  └─ renderer.ts
│  │
│  └─ qc/
│     ├─ ffprobe.ts
│     ├─ video.ts
│     └─ audio.ts
│
├─ library/
│  ├─ shots/
│  ├─ components/
│  ├─ transitions/
│  ├─ styles/
│  ├─ prompts/
│  └─ schemas/
│
├─ projects/
│
├─ temp/
└─ output/
```

---

# 101. SQLite

Dùng SQLite cho V1.

Tables:

```text
projects
jobs
model_calls
assets
shots
renders
reviews
errors
```

Không cần Redis/Postgres ngay.

---

# 102. CLI

```bash
video-factory new my-project
```

```bash
video-factory ingest projects/my-project
```

```bash
video-factory storyboard projects/my-project
```

```bash
video-factory build-scenes projects/my-project
```

```bash
video-factory preview projects/my-project
```

```bash
video-factory render projects/my-project --draft
```

```bash
video-factory review projects/my-project
```

```bash
video-factory produce projects/my-project
```

Một lệnh full:

```bash
video-factory make projects/my-project
```

---

# 103. Full `make` command

```text
make
 ↓
validate input
 ↓
ingest
 ↓
timeline
 ↓
story
 ↓
storyboard
 ↓
assets
 ↓
scenes
 ↓
lint
 ↓
check
 ↓
draft
 ↓
contact sheets
 ↓
review
 ↓
repair
 ↓
final render
 ↓
audio
 ↓
QC
 ↓
DONE
```

---

# 104. Status UI

```text
[01] INGEST            ✓
[02] TRANSCRIBE        ✓
[03] STORY             ✓
[04] STORYBOARD        ✓
[05] ASSETS            23/27
[06] SCENES            18/24
[07] REVIEW            -
[08] FINAL             -
```

---

# 105. Web Studio

Không cần làm đầu tiên.

Sau khi CLI ổn định mới làm.

Layout:

```text
┌──────────────┬────────────────────────────┐
│ Chapters     │ Preview                    │
│              │                            │
│ Shot list    │                            │
│              │                            │
├──────────────┴────────────────────────────┤
│ Timeline                                  │
├───────────────────────────────────────────┤
│ Narration / Storyboard / Agent            │
└───────────────────────────────────────────┘
```

---

# 106. Manual override

User phải có quyền sửa:

```text
storyboard
shot duration
asset
character pose
camera
caption
scene implementation
```

Không biến hệ thống thành black box.

---

# 107. Lock system

Cho phép:

```json
{
  "locked": {
    "storyboard": false,
    "characterBible": true,
    "shot_0012": true
  }
}
```

Agent không được overwrite locked item.

---

# 108. Prompt architecture

Không dùng một system prompt 20,000 chữ cho tất cả role.

Tạo:

```text
library/prompts/
├─ story-analyst.md
├─ chapter-planner.md
├─ storyboard-director.md
├─ asset-planner.md
├─ scene-coder.md
├─ visual-reviewer.md
├─ continuity-reviewer.md
└─ scene-repair.md
```

---

# 109. Story Analyst prompt — responsibilities

Model phải:

```text
understand story
extract entities
identify chronology
identify causal chain
identify factual constraints
identify visualizable events
identify character references
```

Không tạo shot.

---

# 110. Beat Planner prompt

Model phải:

```text
use narration timestamps
group sentences semantically
preserve chronology
avoid cutting mid-idea
produce beats
```

---

# 111. Storyboard Director prompt

Model phải:

```text
map each beat to visuals
select scene types
choose camera
choose motion
decide character presence
avoid repetition
request assets
```

Không viết code.

---

# 112. Scene Coder prompt

Model phải:

```text
implement exactly one shot
reuse existing recipe/components
follow deterministic runtime
use only approved assets
avoid arbitrary web access
```

---

# 113. Visual Reviewer prompt

Model phải:

```text
compare contact sheet with storyboard
find objective visual problems
check continuity
return structured issues
```

Không rewrite scene code.

---

# 114. Repair prompt

Model nhận:

```text
one issue
one shot
relevant files
```

và sửa tối thiểu.

---

# 115. JSON Schema enforcement

Ví dụ Zod:

```typescript
const Shot = z.object({
  id: z.string(),
  startMs: z.number().int().nonnegative(),
  endMs: z.number().int().positive(),
  sceneType: z.string(),
  visualDescription: z.string(),
  camera: z.object({
    shotSize: z.string(),
    movement: z.string(),
    angle: z.string(),
  }),
});
```

Nếu:

```text
endMs <= startMs
```

reject.

---

# 116. Timeline validation

Rules:

```text
no negative time
no overlap unless intentional
no gap unless intentional
final end <= narration duration
```

---

# 117. Storyboard validation

Rules:

```text
every important narration beat covered
every shot references beat
character ID exists
asset references exist
scene type valid
```

---

# 118. Renderer validation

Before final:

```text
lint
check
draft render
```

---

# 119. QC — ffprobe

Verify:

```text
codec
width
height
fps
duration
audio stream
sample rate
```

---

# 120. QC — black frames

Use FFmpeg:

```text
blackdetect
```

Flag unexpected black periods.

Opening fade allowed via whitelist.

---

# 121. QC — frozen frames

Use:

```text
freezedetect
```

But:

```text
long static historical photo
```

may be intentional.

Compare with storyboard before failing.

---

# 122. QC — audio

Check:

```text
no missing narration
no clipping
no unexpected silence
duration matches
```

---

# 123. QC result

```json
{
  "pass": true,

  "video": {
    "duration": 183.24,
    "width": 1920,
    "height": 1080,
    "fps": 30
  },

  "issues": []
}
```

---

# 124. Retry policy

```yaml
retry:

  structured_output:
    max: 2

  scene_generation:
    max: 2

  scene_repair:
    max: 3

  render:
    max: 1

  visual_review_iterations:
    max: 2
```

---

# 125. Avoid agent runaway

Set:

```text
max model calls/project
max repair calls/shot
max generated assets/shot
max scene complexity
```

---

# 126. Security

Generated code = untrusted code.

Scene code không được:

```text
read arbitrary filesystem
execute shell
read environment secrets
access API keys
call arbitrary remote endpoints
```

Run render:

```text
sandbox/container
```

ở production.

---

# 127. Secrets

```text
.env
```

never passed to scene.

Model gateway key chỉ orchestration service được đọc.

---

# 128. Network

During render:

```text
prefer no internet
```

All assets local.

---

# 129. Windows requirements

Install:

```text
Git
Node.js 22+
Python 3.11+
FFmpeg
```

Optional:

```text
CUDA
```

cho WhisperX nhanh hơn.

---

# 130. MVP: reuse > build

V1 không viết:

```text
custom Chromium renderer
custom video encoder
custom ASR
custom timeline engine
```

Dùng:

```text
HyperFrames
FFmpeg
Whisper/faster-whisper/WhisperX
```

Ta chỉ build orchestration.

---

# 131. MVP scope

MVP cần chạy:

```text
source.md
+
narration.srt
      ↓
storyboard
      ↓
HyperFrames scenes
      ↓
draft
      ↓
contact sheet
      ↓
review
      ↓
final.mp4
```

WAV transcription có thể Phase 2.

---

# 132. MVP video limits

```text
max 5 minutes
1920x1080
30 fps
max 100 shots
```

Cho phép config sau.

---

# 133. MVP visual types

Chỉ cần 8:

```text
character-scene
photo-parallax
timeline
map
document-highlight
technical-diagram
kinetic-text
process-diagram
```

Không cố support mọi loại.

---

# 134. MVP Character

Support:

```text
fixed PNG/SVG character assets
```

trước.

Image generation integration sau.

Đây là cách nhanh nhất để character ổn định.

---

# 135. Phase plan

## PHASE 0 — Foundation

Build:

```text
TypeScript monorepo
CLI
config
SQLite
logging
model adapter
```

Acceptance:

```text
call DeepSeek/Gemini
structured JSON passes Zod
```

---

# 136. PHASE 1 — Ingest

Build:

```text
source.md parser
SRT parser
timeline.json
story.json
```

Acceptance:

```text
sample source + SRT
```

chuyển thành canonical JSON.

---

# 137. PHASE 2 — WAV

Build:

```text
ffprobe
faster-whisper
WhisperX adapter
```

Acceptance:

```text
WAV
 ↓
narration.json
 ↓
SRT
```

---

# 138. PHASE 3 — Story Planner

Build:

```text
character bible
chapters
beats
```

Acceptance:

Every narration segment mapped to a beat.

---

# 139. PHASE 4 — Storyboard

Build:

```text
shot planner
scene type vocabulary
storyboard.json
storyboard.md
```

Acceptance:

```text
all beats covered
timestamps valid
```

---

# 140. PHASE 5 — HyperFrames

Integrate upstream.

Do NOT build renderer.

Acceptance:

```text
one generated shot
 ↓
hyperframes check
 ↓
MP4
```

---

# 141. PHASE 6 — Scene Recipes

Build first recipes:

```text
timeline
map
document
portrait-parallax
technical-diagram
process-flow
title
quote
```

Acceptance:

Each recipe renders deterministic demo.

---

# 142. PHASE 7 — Scene Coder

Model selects recipe and customizes.

Fallback:

```text
custom HyperFrames composition
```

Acceptance:

20 random shots → >= 90% compile without manual code edit.

---

# 143. PHASE 8 — Master Composition

Combine scenes.

Add:

```text
narration
captions
transitions
```

Acceptance:

Full 1-minute test video.

---

# 144. PHASE 9 — Review

Build:

```text
snapshots
contact sheets
vision review
continuity review
repair
```

Acceptance:

Inject known visual errors and verify reviewer catches most.

---

# 145. PHASE 10 — Character System

Build:

```text
character-bible
fixed assets
pose registry
version registry
lock
```

Acceptance:

Same character across 20 shots.

---

# 146. PHASE 11 — Audio

Build:

```text
music
SFX
ducking
normalization
```

---

# 147. PHASE 12 — QC

Build:

```text
ffprobe
blackdetect
freezedetect
audio tests
production report
```

---

# 148. PHASE 13 — Web Studio

Only now.

---

# 149. PHASE 14 — Image generation

Provider abstraction:

```text
ImageProvider
```

Không hard-code one vendor.

---

# 150. PHASE 15 — AI video assets

Optional:

```text
VideoAssetProvider
```

Sora/Veo/Kling/etc chỉ là asset source.

Không thay core.

---

# 151. Phase 16 — Specialized engines

Add:

```text
Remotion
Motion Canvas
Manim
Blender
```

as optional engine adapters.

---

# 152. Video Engine interface

```typescript
interface VideoEngine {

  validate(
    project: RenderProject
  ): Promise<ValidationResult>;

  snapshot(
    request: SnapshotRequest
  ): Promise<string>;

  renderDraft(
    project: RenderProject
  ): Promise<RenderResult>;

  renderFinal(
    project: RenderProject
  ): Promise<RenderResult>;
}
```

---

# 153. Model benchmark suite

Không chọn model vì quảng cáo.

Tạo:

```text
benchmarks/
```

Tasks:

```text
chapter split
beat split
storyboard
scene code
repair
visual review
```

Run same 20 samples.

Measure:

```text
schema pass
code compile
repair success
continuity errors
cost
latency
```

---

# 154. Model scorecard

```json
{
  "model": "example-model",

  "chapter": 0.95,
  "storyboard": 0.83,
  "sceneCompile": 0.91,
  "repair": 0.88,
  "visionReview": 0.86,

  "costPerMinuteVideo": 0,
  "latency": 0
}
```

Model router có thể dựa benchmark.

---

# 155. Dynamic routing

Ví dụ:

```text
simple diagram
   → cheapest coder

complex Three.js
   → stronger coder

visual review
   → vision model

JSON repair
   → cheapest model
```

---

# 156. Do not make every step AI

Rule-based code tốt hơn model cho:

```text
SRT parsing
timestamp math
duration
asset hash
file copy
ffprobe
FFmpeg
schema validation
QC
state management
```

AI chỉ dùng nơi cần judgment.

---

# 157. Best architecture philosophy

```text
DETERMINISTIC CODE
where possible

AI
where judgment is useful
```

Không ngược lại.

---

# 158. Production artifacts

Mỗi project giữ:

```text
input/
work/story.json
work/narration.json
work/characters.json
work/chapters.json
work/beats.json
work/storyboard.json
work/assets.json
scenes/
previews/
output/
```

Video có thể reproduce.

---

# 159. Git compatibility

Commit:

```text
source
storyboard
scene source
recipes
config
```

Ignore:

```text
node_modules
temp
render cache
large final video
```

---

# 160. Production Report

`production-report.md`:

```markdown
# Production Report

## Input
...

## Models
...

## Storyboard
42 shots

## Assets
...

## Repairs
7 automatic scene repairs

## Render
1920x1080
30fps
03:03.240

## QC
PASS
```

---

# 161. Suggested implementation decision

**Fastest path:**

```text
DO NOT fork HyperFrames renderer.

CREATE your own orchestration repository.

ADD HyperFrames as a dependency / external renderer.

USE:
HyperFrames
+
FFmpeg
+
WhisperX/faster-whisper
+
your model gateway
```

---

# 162. Suggested V1 architecture

```text
                ┌───────────────────┐
                │ source.md         │
                │ narration.srt     │
                └────────┬──────────┘
                         ▼
                ┌───────────────────┐
                │ StoryVideo CLI    │
                └────────┬──────────┘
                         ▼
                ┌───────────────────┐
                │ Model Gateway     │
                │ DeepSeek/Gemini   │
                └────────┬──────────┘
                         ▼
                ┌───────────────────┐
                │ Storyboard JSON   │
                └────────┬──────────┘
                         ▼
                ┌───────────────────┐
                │ Recipe Selector   │
                └────────┬──────────┘
                         ▼
                ┌───────────────────┐
                │ HyperFrames       │
                └────────┬──────────┘
                         ▼
                ┌───────────────────┐
                │ Contact Sheet     │
                └────────┬──────────┘
                         ▼
                ┌───────────────────┐
                │ Gemini Review     │
                └────────┬──────────┘
                         ▼
                ┌───────────────────┐
                │ Repair            │
                └────────┬──────────┘
                         ▼
                ┌───────────────────┐
                │ HyperFrames Final │
                └────────┬──────────┘
                         ▼
                ┌───────────────────┐
                │ FFmpeg + QC       │
                └────────┬──────────┘
                         ▼
                     final.mp4
```

---

# 163. Do not start with multi-agent framework

Không cần LangGraph/CrewAI ngay.

Một TypeScript state machine đơn giản dễ debug hơn.

Ví dụ:

```typescript
switch (project.state) {

  case "INGESTED":
    await analyzeStory();
    break;

  case "ANALYZED":
    await makeStoryboard();
    break;

  case "STORYBOARDED":
    await buildScenes();
    break;
}
```

Sau này có thể migrate nếu thật sự cần.

---

# 164. Do not use agent-to-agent chat

Không cần:

```text
Director talks to Coder
Coder talks to Reviewer
Reviewer talks to Director
```

Dùng shared artifacts:

```text
storyboard.json
scene.json
review.json
```

Dễ audit hơn.

---

# 165. Example `project.yaml`

```yaml
project:
  name: tesla-story
  language: vi

input:
  source: input/source.md
  narration: input/narration.wav
  subtitles: input/narration.srt

video:
  width: 1920
  height: 1080
  fps: 30

style:
  preset: historical-cinematic

workflow:
  automatic: true
  require_storyboard_approval: false
  max_review_iterations: 2

models:
  planner: gemini-3.8-flash
  storyboard: gemini-3.8-flash
  coder: deepseek-4.1-flash
  repair: deepseek-4.1-flash
  reviewer: gemini-3.8-flash

renderer:
  engine: hyperframes

audio:
  target_lufs: -16

captions:
  mode: both
```

---

# 166. Example storyboard generation instruction

```text
You are the Storyboard Director.

INPUT:
- canonical story
- character bible
- timestamped narration beats
- global style
- available shot recipes

TASK:
Create shots covering every beat.

IMPORTANT:
- Narration timestamps are immutable.
- Do not invent factual events.
- Reuse character IDs exactly.
- Prefer existing shot recipes.
- Avoid visual repetition.
- Use code-generatable visuals where appropriate.
- Return valid JSON only.

Each shot must contain:
- id
- startMs
- endMs
- beatIds
- sceneType
- visualDescription
- characters
- camera
- motion
- assetNeeds
- recipeId
```

---

# 167. Example scene generation instruction

```text
You are the Scene Coder.

Implement ONE storyboard shot for HyperFrames.

You receive:
- one shot
- global style
- approved assets
- character data
- runtime rules
- one selected recipe

Rules:
- deterministic animation only
- no wall-clock timing
- no arbitrary network access
- do not modify character identity
- use approved assets
- keep all text inside safe area
- implementation must be seek-safe
- return files only in structured JSON
```

---

# 168. Example repair instruction

```text
You are repairing one generated scene.

Do not redesign the scene.

Fix only the reported issue.

SHOT:
...

ERROR:
...

CURRENT FILES:
...

Return complete replacement files.
```

---

# 169. Example visual review instruction

```text
Compare the attached contact sheet with:

1. storyboard shot specifications
2. character bible
3. style rules

Report objective defects.

Focus on:
- wrong character
- visual contradiction
- unreadable text
- crop
- blank areas
- era inconsistency
- continuity
- obvious animation/layout defects

Return JSON only.
```

---

# 170. First test project

Do not test first with a 20-minute video.

Use:

```text
45–60 seconds
8–15 shots
1 recurring character
1 map
1 diagram
1 character shot
1 document shot
```

This tests whole architecture.

---

# 171. First acceptance test

Input:

```text
source.md
narration.srt
3 approved character PNGs
```

Output must:

```text
parse SRT
create chapters
create beats
create storyboard
render all shots
preserve character
render captions
produce final.mp4
pass ffprobe
```

---

# 172. Success criteria

A project is successful when:

```text
100% narration is covered
0 invalid timestamps
0 missing assets
0 compile errors
0 unexpected black frames
character continuity passes
video duration matches narration
audio exists
final MP4 opens
```

---

# 173. Performance target

Optimization comes after correctness.

First target:

```text
one 60-second video
fully automatic
```

Then optimize:

```text
parallel scene build
cache
batch model calls
frame rendering workers
```

---

# 174. Batch production later

```text
project001/
project002/
project003/
...
```

Queue:

```text
ingest
plan
scene
render
QC
```

---

# 175. Reuse across series

For YouTube series:

```text
series/
├─ series-bible.md
├─ style.json
├─ characters/
├─ intro/
├─ outro/
├─ music/
└─ shot-library/
```

Each episode inherits it.

---

# 176. Series Bible

Important for user use case.

Example:

```markdown
# SERIES

True Stories of Invention

# VISUAL IDENTITY

...

# RECURRING HOST CHARACTER

...

# CAMERA LANGUAGE

...

# FORBIDDEN

...

# INTRO

...

# OUTRO

...
```

---

# 177. Project hierarchy

```text
GLOBAL
 ↓
SERIES
 ↓
EPISODE
 ↓
CHAPTER
 ↓
BEAT
 ↓
SHOT
```

Rules cascade downward.

---

# 178. Character hierarchy

```text
character master
 ↓
era version
 ↓
costume version
 ↓
pose
```

Identity never changes accidentally.

---

# 179. Style hierarchy

```text
global style
 ↓
series style
 ↓
episode overrides
 ↓
shot overrides
```

---

# 180. Content safety / factual controls

Store distinction:

```text
FACT
INTERPRETATION
VISUALIZATION
```

Example:

```json
{
  "claim": "...",
  "type": "fact",
  "source": "source.md"
}
```

Historical visual reconstruction should be tagged:

```text
visualization
```

not presented internally as documentary evidence.

---

# 181. Asset copyright controls

Do not automatically scrape arbitrary copyrighted material.

Asset providers should expose:

```text
license
usage status
source
```

User-provided assets:

```text
source=user
```

---

# 182. Optional web research

Implement behind flag:

```yaml
research:
  enabled: false
```

When true:

```text
Research Agent
 ↓
research.json
 ↓
source citations
```

Storyboard should not directly browse.

---

# 183. Why HyperFrames as primary

Because our target is:

```text
AI agent
+
code-based visuals
+
deterministic render
```

and HyperFrames is designed close to that goal.

Reuse its:

```text
rendering
preview
lint/check
seek-safe animations
HTML technology
audio/media infrastructure
```

Do not reinvent.

---

# 184. Why keep Remotion available

Because ecosystem mạnh cho:

```text
React
captions
template videos
data UI
audio
```

Some templates may already exist.

But avoid dual complexity in MVP.

---

# 185. Why use FFmpeg anyway

Even if renderer exports MP4:

FFmpeg remains useful for:

```text
probe
mix
normalize
mux
thumbnail
subtitles
QC
transcode
```

---

# 186. Why use WhisperX/faster-whisper outside model

Do not waste expensive model context processing every millisecond of audio.

Convert:

```text
audio
 ↓
precise timeline JSON
```

first.

---

# 187. Why Flash models can work

The architecture intentionally breaks work into small deterministic tasks:

```text
one chapter
one set of beats
one storyboard batch
one scene
one repair
```

Model never needs to understand the entire repository at once.

This is the key design decision that makes cheaper/faster models practical.

---

# 188. Anti-patterns

Do NOT:

```text
send 30-minute SRT + whole repo + all assets to one model call
```

Do NOT:

```text
ask model "make the whole video"
```

Do NOT:

```text
let model rewrite renderer core
```

Do NOT:

```text
regenerate fixed character every shot
```

Do NOT:

```text
use LLM for timestamp arithmetic
```

Do NOT:

```text
render final before draft review
```

---

# 189. Suggested first coding task

Give your coding model this:

```text
Read BUILD-SPEC.md.

Implement PHASE 0 and PHASE 1 only.

Requirements:

1. Node.js 22 + TypeScript.
2. Create CLI named video-factory.
3. Create project folder format.
4. Parse input/source.md.
5. Parse input/narration.srt.
6. Write:
   work/story.json
   work/narration.json
   work/timeline.json
7. Add Zod schemas.
8. Add unit tests for SRT timing.
9. Add model adapter interface but do not integrate a real model yet.
10. Add a mock model adapter for tests.
11. Do not add a web UI.
12. Do not build a video renderer yet.

Commands:

video-factory new demo
video-factory ingest projects/demo

Run:
npm test
npm run typecheck

Do not continue to Phase 2 until tests pass.
```

---

# 190. Second coding task

After Phase 1 passes:

```text
Implement the Story Planner.

Input:
work/story.json
work/narration.json

Output:
work/character-bible.json
work/chapters.json
work/beats.json

Use ModelAdapter.generateStructured().
All model output must be validated with Zod.

Narration timestamps are immutable.

Add mock fixtures and tests.

Do not integrate rendering yet.
```

---

# 191. Third coding task

```text
Implement Storyboard Director.

Input:
story
characters
beats
style
shot recipes

Output:
storyboard.json
storyboard.md

Every beat must map to >= 1 shot.

Validate:
- timestamps
- coverage
- character IDs
- scene types

Use batched model calls per chapter.
```

---

# 192. Fourth coding task

```text
Integrate HyperFrames.

Do not implement a custom renderer.

Create HyperFramesEngine with:

validate()
snapshot()
renderDraft()
renderFinal()

First test:
one hand-written deterministic demo composition.

Then:
one generated scene using a storyboard shot.

Run:
hyperframes lint
hyperframes check
render draft.
```

---

# 193. Fifth coding task

```text
Implement automatic scene generation.

For each shot:

1. choose recipe
2. prepare minimal context
3. call coder model
4. validate files
5. run HyperFrames check
6. repair up to 3 times
7. fallback to simple recipe on failure

Persist all attempts.
```

---

# 194. Sixth coding task

```text
Implement contact-sheet review.

For every shot:
capture 5 snapshots.

Build:
global contact sheet.

Send to vision model.

Return:
review.json.

Repair only HIGH severity issues automatically.
```

---

# 195. Seventh coding task

```text
Implement final audio + QC.

Use FFmpeg.

Validate:
resolution
fps
duration
audio
unexpected black frames

Output:
final.mp4
qc-report.json
production-report.md
```

---

# 196. Minimum viable model capability

A model can be used as **planner** if it can:

```text
read text
return reliable JSON
follow timestamp constraints
```

A model can be used as **coder** if it can:

```text
write HTML/CSS/JS
follow API examples
repair compiler/runtime errors
```

A model can be used as **reviewer** if it can:

```text
accept image input
return structured visual analysis
```

One model does not need to satisfy all three.

---

# 197. Final architecture principle

Do not build:

```text
"Claude Code clone that happens to create videos"
```

Build:

```text
VIDEO PRODUCTION COMPILER
```

where models are interchangeable plugins.

---

# 198. The compiler analogy

```text
SOURCE:
source.md
narration.srt/wav
character definitions

FRONTEND:
story parser
timeline
story planner

INTERMEDIATE REPRESENTATION:
story.json
beats.json
storyboard.json
scene.json

CODEGEN:
DeepSeek / Gemini

RUNTIME:
HyperFrames

LINKER / MEDIA:
FFmpeg

TESTS:
visual review
QC

BINARY:
final.mp4
```

This is the correct mental model.

---

# 199. Recommended starting stack

Start with exactly:

```text
TypeScript
Node 22
Zod
Commander
SQLite
HyperFrames
GSAP
FFmpeg
Gemini/DeepSeek model adapter
```

Add Python only when WAV transcription is needed.

---

# 200. Recommended first milestone

**One 60-second history video**

Input:

```text
source.md
narration.srt
fixed character PNGs
```

Must automatically produce:

```text
storyboard.md
storyboard.json
draft.mp4
contact-sheet.jpg
review.json
final.mp4
qc-report.json
```

Once this works reliably, the foundation is correct.

---

# 201. Recommended second milestone

Add:

```text
narration.wav
 ↓
WhisperX
 ↓
word timing
```

Then test:

```text
How It's Made
```

with:

```text
process diagrams
technical cutaways
factory flow
```

---

# 202. Recommended third milestone

Add:

```text
image provider
stock provider
archive provider
```

without changing storyboard/renderer architecture.

---

# 203. Recommended fourth milestone

Build series-level character continuity.

```text
series bible
character assets
style presets
shot recipes
```

Then produce 10 episodes.

Measure consistency.

---

# 204. Core philosophy

The winning system is not the one with the smartest single model.

It is the one with:

```text
good intermediate representations
good reusable shot recipes
strong validators
good asset library
deterministic renderer
automatic review
repair loops
```

A fast model inside a disciplined pipeline can outperform a stronger model given an uncontrolled "make a video" task.

---

# 205. Final recommended pipeline

```text
                         INPUT
                           │
          ┌────────────────┴────────────────┐
          │                                 │
      source.md                       SRT / WAV
          │                                 │
          ▼                                 ▼
      STORY PARSER                    AUDIO ALIGN
          │                                 │
          └────────────────┬────────────────┘
                           ▼
                    CANONICAL STORY
                           │
                           ▼
                   CHARACTER BIBLE
                           │
                           ▼
                      CHAPTERS
                           │
                           ▼
                        BEATS
                           │
                           ▼
                    STORYBOARD
                           │
                           ▼
                      SHOT PLAN
                           │
                           ▼
               ┌──── ASSET RESOLVER ────┐
               │                         │
               ▼                         ▼
        EXISTING ASSET              CODE VISUAL
               │                         │
               └────────────┬────────────┘
                            ▼
                       SCENE CODER
                            │
                            ▼
                       HYPERFRAMES
                            │
                            ▼
                     DRAFT SNAPSHOTS
                            │
                            ▼
                     CONTACT SHEET
                            │
                            ▼
                     VISION REVIEW
                            │
                    ┌───────┴───────┐
                    │               │
                   PASS            FAIL
                    │               │
                    │               ▼
                    │            REPAIR
                    │               │
                    │        ───────┘
                    ▼
                     FINAL RENDER
                            │
                            ▼
                         FFMPEG
                            │
                            ▼
                            QC
                            │
                            ▼
                       FINAL.MP4
```

---

# 206. Source references / repositories

Primary references:

```text
HyperFrames
https://github.com/heygen-com/hyperframes

HyperFrames launch project
https://github.com/heygen-com/hyperframes-launch-video

Remotion
https://github.com/remotion-dev/remotion

Remotion agent skills
https://github.com/remotion-dev/skills

prompt2video
https://github.com/jeromeetienne/prompt2video

MoneyPrinterTurbo
https://github.com/harry0703/MoneyPrinterTurbo

video-shotcraft
https://github.com/karekin/video-shotcraft

remotion-ai-video
https://github.com/zhaosenlin12-creator/remotion-ai-video

faster-whisper
https://github.com/SYSTRAN/faster-whisper

WhisperX
https://github.com/m-bain/whisperX

WhisperX agent wrapper example
https://github.com/ThePlasmak/whisperx

Motion Canvas
https://github.com/motion-canvas/motion-canvas

Manim Community
https://github.com/ManimCommunity/manim
```

Before copying implementation code from any repository:

```text
read LICENSE
check version
check dependencies
```

Prefer dependency/integration over copying renderer internals.

---

# 207. Final instruction to the coding agent

Use this as the root execution policy:

```text
This project is a deterministic story-to-video compiler.

Models are replaceable.

Narration controls time.

Storyboards are structured data.

Characters have immutable identity.

Scenes are generated one at a time.

Existing recipes are preferred over custom code.

HyperFrames is the primary renderer.

FFmpeg owns media post-processing and QC.

No generated scene may access secrets or arbitrary filesystem paths.

Every AI output is validated.

Every render is reviewed before final production.

A failed complex scene must degrade to a simpler visual instead of blocking the full video.

Never rewrite the renderer core merely to fix generated content.

The project must be resumable from persisted artifacts.

The final goal is not to produce one impressive demo.
The goal is to produce many repeatable videos from:
source.md + narration.srt/wav.
```
