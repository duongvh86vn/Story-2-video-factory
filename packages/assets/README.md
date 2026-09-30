# Asset resolution

`resolveAssets(projectRoot, config, storyboard, characters)` is exported from
`packages/assets/index.ts`. It uses shared core types and utilities. It does not
invoke a renderer, FFmpeg, an image generator, or a shell.

Resolution order:

1. Verify and reuse approved hashes from the canonical
   `work/asset-manifest.json`. Only when it is missing, use the first existing
   fallback: `work/assets.json`, `output/asset-manifest.json`,
   `input/assets/asset-manifest.json`, or `assets/asset-manifest.json`.
   An empty canonical manifest is authoritative. Mirrors are never merged back
   into canonical manual edits, and all mirrors receive the final canonical data.
2. Resolve explicit project-relative `localPath`, character pose/reference/version
   asset pointers, or uniquely matching files in `input/assets/` and `assets/`.
   Canonical input files take precedence over matching root asset files.
   A pointer can name an
   approved manifest asset ID or a project-relative file. Character poses can use
   `<asset-root>/characters/<characterId>/<pose>.<extension>`; versions add a
   directory between the character ID and pose. Approved `poses.json` registries
   are discovered in both character directories. They accept a `poses` map of
   names to paths or entries, or an array of entries with `pose`/`name` and `path`.
   Approval must be explicit at registry or entry level; entry approval overrides
   the registry default. Paths can be project-relative or registry-relative.
   Declared versions and optional hash, author, license, and retrieval date are
   respected. Supplied poses resolve before synthetic fallbacks. Owner-supplied
   files use `source=user`.
3. Reuse project templates in `input/assets/templates/` or `assets/templates/` named for the asset request ID
   or `template-<first 16 hex characters of SHA-256(description)>`. Generate
   deterministic character SVGs or labeled conceptual diagram SVGs when needed.
   Character geometry derives from identity; pose and version bindings are
   persisted. Existing identical generated assets are reused across request IDs.
4. Download only an explicit request `sourceUrl` with a supplied license, when
   research is enabled and the URL is approved by `config.research.sources`.
   A configured source ending in `/` approves that directory's descendants on
   the same origin; a page/file source approves only the exact URL. No pages are
   scraped or searched for asset links. Downloads use HTTPS, pinned public DNS
   addresses, no redirects, a 30-second timeout, and bounded sizes.

Output manifests are identical in `work/assets.json`, `work/asset-manifest.json`,
and `output/asset-manifest.json`. `work/asset-continuity.json` stores character
identity fingerprints and pose/version hashes. Structured events are appended
to `work/logs/assets.jsonl`; URLs, descriptions, provider errors, secrets, and
arbitrary paths are excluded from logs. Downloaded files use content-addressed
paths in `assets/resolved/`; generated SVGs use `assets/generated/`.

Approved hashes are checked before reuse. Changed, unsafe, or unavailable
approved files fail explicitly. State locks recognize `assets`, `assetManifest`,
`characters`, `characterBible`, raw asset/character IDs, `asset:<id>`,
`character:<id>`, `assets.<id>`, and `characters.<id>`. Locked assets must already
have a valid approval. A state-locked character cannot acquire a new generated
pose. `Character.locked` preserves recorded identity and existing pose hashes,
while allowing new deterministic poses for the same identity. New explicit
versions retain separate identity/pose bindings. Missing locked character
references fail rather than silently generating a replacement.

The resolver retains verified approved assets that are unused by the current
storyboard, with empty `shotIds`. Required unresolved needs fail; optional
unresolved needs have `status=missing`, an empty path, and an empty hash.
Characters mentioned in a shot without a character asset request receive a
required standing reference request. Conflicting requests sharing an ID fail.
Generation respects `workflow.max_generated_assets_per_shot`.

Optional background music is inferred even without a storyboard asset request:
an explicit music request wins, otherwise an existing approved music choice is
retained, otherwise the first safe local audio candidate in
`input/assets/music/` (then `assets/music/`) is selected deterministically.
Music is associated with every shot. SFX events infer optional requests using
their explicit `assetId` or matching `type`/asset ID against safe audio basenames
in `input/assets/sfx/` (then `assets/sfx/`). Existing explicit requests and
approvals are reused. Inferred IDs are `music_<basename>` and `sfx_<type>` unless
an existing or explicit ID applies, with every consuming shot in `shotIds`.
Invalid optional candidates are skipped; inferred files receive the same size,
signature, hash, provenance, approval, and state-lock checks as explicit assets.
The resolver does not modify the storyboard's SFX events.

`registerAssetProvider(provider)` accepts `image`, `stock`, `archive`, and `video`
providers and returns an unregister function. The exported provider interfaces
accept an explicit request and return source URL, source category, author,
license, and usage approval. Providers must return metadata only and honor the
provided abort signal. The resolver downloads the original requested URL and
rejects substitutions or unapproved usage. Registration does not widen the
source allowlist. The built-in direct URL provider records the supplied license
as the owner's assertion and explicitly records an unspecified author; register
a metadata provider when verified attribution is available.

Limits: SVG input uses a conservative static element/attribute subset, without
CSS, animation, embedded images, scripts, external references, or DTDs. Raster,
audio, video, PDF, and text inputs receive extension, size, and signature checks,
not decoder/playback inspection. Signed or credential-bearing source URLs are
rejected. Character fallbacks are stylized illustrations, and diagrams are
labeled conceptual schematics. No stock accounts, generative APIs, video/audio
generation, licensing inference, or automatic archival image substitution are
enabled. Provider implementation, source attribution, and owner-asserted rights
remain the project owner's responsibility. Calls are serialized per project
within a process; separate processes must coordinate asset-stage execution.
