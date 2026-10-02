#!/usr/bin/env python3
"""Local Piper implementation of the command TTS request contract (no shell/SSML)."""
import argparse
import json
from pathlib import Path
import wave


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--request', type=Path, required=True)
    parser.add_argument('--model', type=Path, required=True)
    args = parser.parse_args()
    request = json.loads(args.request.read_text(encoding='utf-8-sig'))
    config = json.loads(Path(str(args.model) + '.json').read_text(encoding='utf-8'))
    language = str(request['language']).replace('-', '_').split('_')[0].lower()
    supported = str(config.get('language', {}).get('code') or config.get('espeak', {}).get('voice', '')).split('_')[0].lower()
    if not language or language != supported:
        raise ValueError(f'Voice language {supported} does not support narration language {language}')
    if request.get('voiceId') and request['voiceId'] != args.model.stem:
        raise ValueError('Configured voice ID does not match the loaded Piper model')
    text = request['text']
    if not isinstance(text, str) or not text.strip() or '\0' in text:
        raise ValueError('Speech request must contain nonempty plain text')
    from piper import PiperVoice
    voice = PiperVoice.load(str(args.model))
    output = Path(request['output'])
    output.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(output), 'wb') as audio:
        voice.synthesize_wav(text, audio)


if __name__ == '__main__':
    main()
