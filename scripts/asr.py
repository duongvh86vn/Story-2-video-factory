#!/usr/bin/env python3
"""Offline-first ASR/forced-alignment bridge. Output is canonical narration JSON.

Supplying --cues-json selects alignment only: no Whisper transcription is loaded.
Original cue IDs, text, startMs and endMs are immutable. WhisperX words are accepted
only when their endpoints are supported by scored CTC character alignments.
"""
from __future__ import annotations

import argparse
import contextlib
import importlib
import json
import math
import os
from pathlib import Path
import re
import subprocess
import sys
import time
import traceback
from typing import Any
import uuid


class AsrError(Exception):
    def __init__(self, message: str, exit_code: int = 4):
        super().__init__(message)
        self.exit_code = exit_code


def module(name: str) -> Any:
    try:
        return importlib.import_module(name)
    except ImportError as error:
        raise AsrError(f"Missing or incompatible dependency {name}: {error}. Provision the matching requirements file separately.", 3) from error


def positive_number(value: Any) -> float | None:
    try:
        number = float(value)
    except (ValueError, TypeError):
        return None
    return number if math.isfinite(number) and number > 0 else None


def milliseconds(value: Any) -> int | None:
    if isinstance(value, bool):
        return None
    try:
        seconds = float(value)
    except (ValueError, TypeError):
        return None
    return round(seconds * 1000) if math.isfinite(seconds) and seconds >= 0 else None


def atomic_json(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_name(path.name + "." + uuid.uuid4().hex + ".tmp")
    try:
        temporary.write_text(json.dumps(value, ensure_ascii=False, indent=2, allow_nan=False) + "\n", encoding="utf-8")
        os.replace(temporary, path)
    finally:
        if temporary.exists():
            temporary.unlink()


def probe_duration(audio: Path, diagnostics: dict[str, Any]) -> int:
    command = [os.environ.get("VIDEO_FACTORY_FFPROBE") or os.environ.get("FFPROBE_PATH") or "ffprobe", "-v", "error", "-select_streams", "a:0", "-show_entries", "format=duration:stream=codec_type,duration,duration_ts,time_base", "-of", "json", str(audio)]
    started = time.monotonic()
    try:
        process = subprocess.run(command, capture_output=True, text=True, encoding="utf-8", timeout=60, check=False)
    except (OSError, subprocess.TimeoutExpired) as error:
        diagnostics["commands"].append({"argv": command, "exitCode": None, "error": str(error)})
        raise AsrError(f"ffprobe failed: {error}", 5) from error
    diagnostics["commands"].append({"argv": command, "exitCode": process.returncode, "stderr": process.stderr, "durationMs": round((time.monotonic() - started) * 1000)})
    if process.returncode:
        raise AsrError(f"ffprobe exited {process.returncode}: {process.stderr.strip()}", 5)
    try:
        result = json.loads(process.stdout)
        stream = next(s for s in result["streams"] if s.get("codec_type") == "audio")
        numerator, denominator = map(float, stream.get("time_base", "0/1").split("/"))
        ticks = positive_number(stream.get("duration_ts"))
        seconds = positive_number(ticks * numerator / denominator) if ticks and denominator > 0 else None
        seconds = seconds or positive_number(stream.get("duration")) or positive_number(result.get("format", {}).get("duration"))
        if seconds is None:
            raise ValueError("no positive audio duration")
        duration = round(seconds * 1000)
        if duration <= 0 or duration > 2**53 - 1:
            raise ValueError("duration outside supported range")
        return duration
    except (ValueError, KeyError, TypeError, StopIteration, ZeroDivisionError) as error:
        raise AsrError(f"ffprobe returned invalid audio metadata: {error}", 5) from error


def validate_segments(segments: Any, duration: int, tolerance: float) -> list[dict[str, Any]]:
    if not isinstance(segments, list) or not segments:
        raise AsrError("Narration must contain at least one nonempty segment", 2)
    previous_end = 0
    used: set[str] = set()
    output = []
    for i, segment in enumerate(segments):
        if not isinstance(segment, dict):
            raise AsrError(f"Segment {i + 1} must be an object", 2)
        identifier, text = segment.get("id"), segment.get("text")
        start, end = segment.get("startMs"), segment.get("endMs")
        if not isinstance(identifier, str) or not re.fullmatch(r"[a-zA-Z0-9][a-zA-Z0-9_.-]*", identifier) or identifier in used:
            raise AsrError(f"Invalid or duplicate segment ID at segment {i + 1}", 2)
        if type(start) is not int or type(end) is not int or start < previous_end or end <= start or end > 2**53 - 1:
            raise AsrError(f"Invalid or overlapping timing in {identifier}", 2)
        if end > duration + tolerance:
            raise AsrError(f"Segment {identifier} ends at {end} ms, beyond audio {duration} ms + tolerance {tolerance} ms", 2)
        if not isinstance(text, str) or not text.strip():
            raise AsrError(f"Segment {identifier} has no text", 2)
        output.append({"id": identifier, "startMs": start, "endMs": end, "text": text})
        used.add(identifier)
        previous_end = end
    return output


def load_cues(path: Path, duration: int, tolerance: float) -> list[dict[str, Any]]:
    try:
        value = json.loads(path.read_text(encoding="utf-8-sig"))
    except (OSError, ValueError) as error:
        raise AsrError(f"Cannot read --cues-json: {error}", 2) from error
    return validate_segments(value.get("segments") if isinstance(value, dict) else value, duration, tolerance)


def transcribe_faster(args: argparse.Namespace, diagnostics: dict[str, Any]) -> tuple[list[dict[str, Any]], list[dict[str, Any]], str]:
    faster = module("faster_whisper")
    model = faster.WhisperModel(args.model, device=args.device, compute_type=args.compute_type, local_files_only=not args.allow_downloads)
    # The unbatched backend's VAD uses packaged assets and keeps absolute audio offsets.
    iterator, info = model.transcribe(str(args.audio), language=args.language, beam_size=5, word_timestamps=True, vad_filter=True)
    segments: list[dict[str, Any]] = []
    words: list[dict[str, Any]] = []
    evidence: list[dict[str, Any]] = []
    previous_word_end = 0
    for item in iterator:  # faster-whisper is lazy: exhaust it before writing output.
        start, end = milliseconds(item.start), milliseconds(item.end)
        text = item.text
        if not text.strip():
            continue
        if start is None or end is None or end <= start:
            raise AsrError("faster-whisper returned an invalid segment interval")
        segment = {"id": f"seg{len(segments) + 1:03d}", "startMs": start, "endMs": end, "text": text}
        segments.append(segment)
        for item_word in item.words or []:
            word_start, word_end = milliseconds(item_word.start), milliseconds(item_word.end)
            probability = positive_number(item_word.probability)
            word_text = item_word.word.strip()
            if word_start is None or word_end is None or word_end <= word_start or word_start < start or word_end > end or word_start < previous_word_end or not word_text or probability is None:
                diagnostics["skippedWords"].append({"cueId": segment["id"], "text": word_text, "reason": "missing confidence, invalid interval, overlap, or outside segment"})
                continue
            word = {"text": word_text, "startMs": word_start, "endMs": word_end}
            words.append(word)
            evidence.append({"cueId": segment["id"], **word, "method": "faster-whisper-attention", "probability": probability})
            previous_word_end = word_end
    diagnostics["wordEvidence"] = evidence
    diagnostics["languageProbability"] = getattr(info, "language_probability", None)
    return segments, words, info.language


def local_vad(args: argparse.Namespace) -> Any:
    """Use WhisperX's public VAD subclass contract with packaged faster-whisper Silero.

    WhisperX's built-in Silero loader uses torch.hub; this avoids an implicit
    repository download by using the ONNX model already shipped in faster-whisper.
    """
    numpy = module("numpy")
    vad_api = module("faster_whisper.vad")
    vad_base = module("whisperx.vads.vad").Vad

    class PackagedSilero(vad_base):
        def __init__(self) -> None:
            super().__init__(0.5)

        def __call__(self, audio: dict[str, Any], **kwargs: Any) -> list[dict[str, Any]]:
            timestamps = vad_api.get_speech_timestamps(numpy.asarray(audio["waveform"], dtype=numpy.float32), vad_api.VadOptions(max_speech_duration_s=30))
            return [{"start": t["start"] / 16000, "end": t["end"] / 16000} for t in timestamps]

        @staticmethod
        def preprocess_audio(audio: Any) -> Any:
            return audio

        @staticmethod
        def merge_chunks(segments_list: list[dict[str, Any]], chunk_size: float, onset: float = 0.5, offset: float | None = None) -> list[dict[str, Any]]:
            # Each packaged VAD interval is <= chunk_size and uses original offsets.
            return [{"start": s["start"], "end": s["end"], "segments": [(s["start"], s["end"])]} for s in segments_list]

    return PackagedSilero()


def load_alignment(whisperx: Any, args: argparse.Namespace, language: str) -> tuple[Any, dict[str, Any]]:
    nltk = module("nltk")
    if not args.allow_downloads:
        try:
            nltk.data.load("tokenizers/punkt/english.pickle")
        except LookupError as error:
            raise AsrError("WhisperX needs pre-provisioned NLTK punkt_tab data. Offline ingest never downloads it; provision it separately or explicitly use --allow-downloads.", 3) from error
        align_api = module("whisperx.alignment")
        name = args.align_model or align_api.DEFAULT_ALIGN_MODELS_TORCH.get(language) or align_api.DEFAULT_ALIGN_MODELS_HF.get(language)
        torch = module("torch")
        torchaudio = module("torchaudio")
        if name and name in torchaudio.pipelines.__all__:
            bundle = getattr(torchaudio.pipelines, name)
            checkpoint = Path(torch.hub.get_dir()) / "checkpoints" / Path(bundle._path).name
            if not checkpoint.is_file():
                raise AsrError(f"Alignment model {name} is not cached at {checkpoint}. Provision it separately or pass --align-model with a local Hugging Face Wav2Vec2 directory.", 3)
    return whisperx.load_align_model(language_code=language, device=args.device, model_name=args.align_model)


def align_cues(whisperx: Any, model: Any, metadata: dict[str, Any], audio: Any, segments: list[dict[str, Any]], args: argparse.Namespace, diagnostics: dict[str, Any]) -> list[dict[str, Any]]:
    words: list[dict[str, Any]] = []
    evidence: list[dict[str, Any]] = []
    diagnostics["wordEvidence"] = evidence
    previous_end = 0
    for cue in segments:
        # Only normalize whitespace for the aligner's tokenization. Canonical text
        # remains byte-for-byte identical to the parsed SRT text.
        text = re.sub(r"\s", " ", cue["text"])
        left = cue["startMs"] * 16000 // 1000
        right = min(cue["endMs"] * 16000 // 1000, len(audio))
        window = audio[left:right]
        cue_diagnostic: dict[str, Any] = {"cueId": cue["id"], "startMs": cue["startMs"], "endMs": cue["endMs"], "text": cue["text"], "acceptedWords": 0}
        diagnostics["cues"].append(cue_diagnostic)
        if len(window) == 0:
            raise AsrError(f"Cue {cue['id']} has no audio samples for alignment")
        result = whisperx.align([{"start": 0.0, "end": len(window) / 16000, "text": text}], model, metadata, window, args.device, return_char_alignments=True)
        # Character rows are pre-interpolation CTC evidence; ignore sentence times.
        chars: list[dict[str, Any]] = []
        backend_words: list[dict[str, Any]] = []
        seen_chars: set[tuple[Any, ...]] = set()
        for aligned in result.get("segments", []):
            backend_words.extend(aligned.get("words", []))
            for char in aligned.get("chars", []):
                key = (char.get("char"), char.get("start"), char.get("end"), char.get("score"))
                # Sentence boundaries can duplicate the same character record.
                if key not in seen_chars:
                    chars.append(char)
                    seen_chars.add(key)
        # Persist the raw alignment so a separate reviewer can audit every word.
        cue_diagnostic["alignment"] = result
        for candidate in backend_words:
            candidate_text = candidate.get("word", "")
            start, end = milliseconds(candidate.get("start")), milliseconds(candidate.get("end"))
            score = positive_number(candidate.get("score"))
            supported = []
            if start is not None and end is not None:
                for char in chars:
                    char_start, char_end = milliseconds(char.get("start")), milliseconds(char.get("end"))
                    char_score = positive_number(char.get("score"))
                    # Wildcard punctuation is not linguistic evidence. A word needs
                    # at least one real dictionary letter/number with CTC confidence.
                    char_text = char.get("char", "")
                    if char_start is not None and char_end is not None and char_score is not None and any(c.isalnum() for c in char_text) and char_text.lower() in metadata["dictionary"] and start <= char_start < char_end <= end:
                        supported.append(char)
            # Require endpoints derived from scored characters (including aligned
            # punctuation). This excludes interpolated/fallback word timestamps.
            scored = [c for c in chars if positive_number(c.get("score")) is not None and milliseconds(c.get("start")) is not None and milliseconds(c.get("end")) is not None and start is not None and end is not None and start <= milliseconds(c["start"]) < milliseconds(c["end"]) <= end]
            backed = bool(supported and scored and min(milliseconds(c["start"]) for c in scored) == start and max(milliseconds(c["end"]) for c in scored) == end)
            absolute_start = cue["startMs"] + start if start is not None else None
            absolute_end = cue["startMs"] + end if end is not None else None
            valid = isinstance(candidate_text, str) and bool(candidate_text.strip()) and candidate_text in text and score is not None and backed and absolute_start is not None and absolute_end is not None and cue["startMs"] <= absolute_start < absolute_end <= cue["endMs"] and absolute_start >= previous_end
            if not valid:
                diagnostics["skippedWords"].append({"cueId": cue["id"], "text": candidate_text, "reason": "no scored CTC endpoint evidence, invalid interval, overlap, or outside original cue"})
                continue
            word = {"text": candidate_text, "startMs": absolute_start, "endMs": absolute_end}
            words.append(word)
            evidence.append({"cueId": cue["id"], **word, "method": "whisperx-ctc", "score": score, "characters": scored})
            previous_end = absolute_end
            cue_diagnostic["acceptedWords"] += 1
        if cue_diagnostic["acceptedWords"] == 0:
            raise AsrError(f"WhisperX produced no backed word alignment for cue {cue['id']}; original text/timing preserved in diagnostics")
    diagnostics["wordEvidence"] = evidence
    return words


def decode_audio(args: argparse.Namespace, diagnostics: dict[str, Any]) -> Any:
    numpy = module("numpy")
    command = [os.environ.get("VIDEO_FACTORY_FFMPEG") or os.environ.get("FFMPEG_PATH") or "ffmpeg", "-nostdin", "-v", "error", "-i", str(args.audio), "-map", "0:a:0", "-f", "s16le", "-ac", "1", "-acodec", "pcm_s16le", "-ar", "16000", "-"]
    try:
        process = subprocess.run(command, capture_output=True, timeout=120, check=False)
    except (OSError, subprocess.TimeoutExpired) as error:
        diagnostics["commands"].append({"argv": command, "exitCode": None, "error": str(error)})
        raise AsrError(f"Audio decoding failed: {error}", 5) from error
    stderr = process.stderr.decode("utf-8", errors="replace")
    diagnostics["commands"].append({"argv": command, "exitCode": process.returncode, "stderr": stderr})
    if process.returncode or not process.stdout or len(process.stdout) % 2:
        raise AsrError(f"FFmpeg audio decode failed (exit {process.returncode}): {stderr}", 5)
    return numpy.frombuffer(process.stdout, dtype="<i2").astype(numpy.float32) / 32768.0


def transcribe_whisperx(args: argparse.Namespace, duration: int, diagnostics: dict[str, Any], original: list[dict[str, Any]] | None) -> tuple[list[dict[str, Any]], list[dict[str, Any]], str]:
    whisperx = module("whisperx")
    audio = decode_audio(args, diagnostics)
    decoded_ms = round(len(audio) * 1000 / 16000)
    diagnostics["decodedDurationMs"] = decoded_ms
    if abs(decoded_ms - duration) > args.tolerance_ms:
        raise AsrError(f"Decoded audio duration {decoded_ms} ms differs from probed duration {duration} ms beyond tolerance", 5)
    language = args.language
    if original is not None:
        if not language:
            raise AsrError("--language is required for alignment of supplied cues; alignment never transcribes to guess the language", 2)
        segments = original
        diagnostics["operation"] = "forced-alignment"
    else:
        vad = local_vad(args)
        pipeline = whisperx.load_model(args.model, args.device, compute_type=args.compute_type, language=language, local_files_only=not args.allow_downloads, vad_model=vad)
        result = pipeline.transcribe(audio, batch_size=args.batch_size, language=language)
        language = result.get("language") or language
        segments = []
        for candidate in result.get("segments", []):
            text = candidate.get("text", "")
            if not text.strip():
                continue
            start, end = milliseconds(candidate.get("start")), milliseconds(candidate.get("end"))
            if start is None or end is None:
                raise AsrError("WhisperX transcription returned an invalid segment")
            segments.append({"id": f"seg{len(segments) + 1:03d}", "startMs": start, "endMs": end, "text": text})
        segments = validate_segments(segments, duration, args.tolerance_ms)
        diagnostics["operation"] = "whisperx-transcription-and-alignment"
        del pipeline
    if not language:
        raise AsrError("WhisperX did not determine a language")
    model, metadata = load_alignment(whisperx, args, language)
    words = align_cues(whisperx, model, metadata, audio, segments, args, diagnostics)
    return segments, words, language


def arguments() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--audio", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--diagnostics", type=Path)
    parser.add_argument("--cues-json", type=Path, help="JSON {segments:[{id,startMs,endMs,text}]} from the TypeScript SRT parser; forces WhisperX alignment only")
    parser.add_argument("--engine", choices=["faster-whisper", "whisperx"], default="faster-whisper")
    parser.add_argument("--model", default="small")
    parser.add_argument("--device", default="cpu")
    parser.add_argument("--compute-type", default="int8")
    parser.add_argument("--language")
    parser.add_argument("--align-model", help="Local Hugging Face Wav2Vec2 model directory, model ID, or torchaudio bundle name")
    parser.add_argument("--duration-ms", type=int, help="Already probed duration from TypeScript; otherwise ffprobe is called here")
    parser.add_argument("--tolerance-ms", type=float, default=500)
    parser.add_argument("--batch-size", type=int, default=8)
    parser.add_argument("--allow-downloads", action="store_true", help="Explicitly permit library model/resource downloads at runtime")
    return parser.parse_args()


def main() -> int:
    args = arguments()
    args.audio = args.audio.resolve()
    args.output = args.output.resolve()
    diagnostic_path = (args.diagnostics or args.output.with_suffix(".diagnostics.json")).resolve()
    inputs = {args.audio}
    if args.cues_json:
        inputs.add(args.cues_json.resolve())
    # Reject collisions before entering the diagnostics writer's finally block.
    if args.output in inputs or diagnostic_path in inputs or diagnostic_path == args.output:
        print("Output and diagnostics must not overwrite input files or each other", file=sys.stderr)
        return 2
    started = time.monotonic()
    diagnostics: dict[str, Any] = {"version": 1, "startedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()), "engine": "whisperx" if args.cues_json else args.engine, "operation": "transcription", "audioPath": str(args.audio), "downloadsAllowed": args.allow_downloads, "commands": [], "cues": [], "skippedWords": [], "wordEvidence": []}
    code = 0
    try:
        if not args.audio.is_file():
            raise AsrError(f"Audio input does not exist: {args.audio}", 2)
        if not math.isfinite(args.tolerance_ms) or args.tolerance_ms < 0 or args.batch_size <= 0:
            raise AsrError("Tolerance must be finite/nonnegative and batch size positive", 2)
        if not args.allow_downloads:
            # Set before importing Hugging Face/WhisperX. Missing models fail clearly.
            os.environ["HF_HUB_OFFLINE"] = "1"
            os.environ["TRANSFORMERS_OFFLINE"] = "1"
        duration = args.duration_ms if args.duration_ms is not None else probe_duration(args.audio, diagnostics)
        if duration <= 0 or duration > 2**53 - 1:
            raise AsrError("--duration-ms must be a positive safe integer", 2)
        diagnostics["audioDurationMs"] = duration
        original = load_cues(args.cues_json, duration, args.tolerance_ms) if args.cues_json else None
        # Third-party libraries may print progress; keep stdout a machine-readable summary.
        with contextlib.redirect_stdout(sys.stderr):
            if original is not None or args.engine == "whisperx":
                segments, words, language = transcribe_whisperx(args, duration, diagnostics, original)
            else:
                segments, words, language = transcribe_faster(args, diagnostics)
        segments = validate_segments(segments, duration, args.tolerance_ms)
        canonical = {"durationMs": max(duration, segments[-1]["endMs"]), "segments": segments, "words": words, "audioPath": str(args.audio), "mode": "aligned" if original is not None else "wav"}
        if original is not None and canonical["segments"] != original:
            raise AsrError("Alignment attempted to change immutable source cues")
        atomic_json(args.output, canonical)
        diagnostics["status"] = "completed"
        diagnostics["language"] = language
        print(json.dumps({"output": str(args.output), "durationMs": canonical["durationMs"], "segments": len(segments), "words": len(words)}, ensure_ascii=False))
    except AsrError as error:
        code = error.exit_code
        diagnostics.update(status="failed", error=str(error), exitCode=code)
        print(str(error), file=sys.stderr)
    except Exception as error:
        code = 4
        diagnostics.update(status="failed", error=str(error), traceback=traceback.format_exc(), exitCode=code)
        print(f"ASR/alignment failed: {error}", file=sys.stderr)
    finally:
        diagnostics["elapsedMs"] = round((time.monotonic() - started) * 1000)
        diagnostics["exitCode"] = code
        try:
            atomic_json(diagnostic_path, diagnostics)
        except (OSError, ValueError) as error:
            print(f"Cannot persist diagnostics: {error}", file=sys.stderr)
            code = 6
    return code


if __name__ == "__main__":
    sys.exit(main())
