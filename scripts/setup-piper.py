#!/usr/bin/env python3
"""Provision a pinned Vietnamese voice and a machine-local command TTS config."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
import urllib.request
import venv

REVISION = '320d5f7f7751a17ef6512d5c23863056c6a11c0f'
VOICE = 'vi_VN-vais1000-medium'
FILES = {
    VOICE + '.onnx': 'ec7c89e2c85f4d1edc24b6120c18aaf1bda614f06b511567eb9c7c0de15e2dab',
    VOICE + '.onnx.json': 'fafb9da1354ed4b77c31af228ed41fb41cd825c14cffa105454b25e6ae751ee0',
    'MODEL_CARD': '302db8a930ffc2b1c2181db26deaf8272116eca2b08b8f80da6375b0a994af7b',
}


def digest(path):
    with path.open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--replace-default', action='store_true', help='Replace an existing config/voice.yaml after keeping a backup')
    args = parser.parse_args()
    repo = Path(__file__).resolve().parent.parent
    runtime = repo / 'runtime/tts'
    executable = runtime / ('Scripts/python.exe' if os.name == 'nt' else 'bin/python')
    if not executable.exists():
        venv.EnvBuilder(with_pip=True).create(runtime)
    subprocess.run([str(executable), '-m', 'pip', 'install', 'piper-tts==1.8.0'], check=True)
    models = runtime / 'models'
    models.mkdir(parents=True, exist_ok=True)
    for name, checksum in FILES.items():
        target = models / name
        if target.is_file() and digest(target) == checksum:
            continue
        url = f'https://huggingface.co/rhasspy/piper-voices/resolve/{REVISION}/vi/vi_VN/vais1000/medium/{name}'
        temporary = target.with_name(name + '.download')
        with urllib.request.urlopen(url, timeout=120) as response, temporary.open('wb') as output:
            while chunk := response.read(1024 * 1024):
                output.write(chunk)
        if digest(temporary) != checksum:
            raise ValueError(f'Voice checksum mismatch: {name}; default voice was not changed')
        temporary.replace(target)
    config = repo / 'config/voice.yaml'
    settings = {'voice': {'source': 'auto', 'tts_provider': 'command', 'voice_id': VOICE, 'command': str(executable),
                'command_args': [str(repo / 'scripts/piper-tts.py'), '--request', '{request}', '--model', str(models / (VOICE + '.onnx'))]}}
    # JSON is valid YAML; escaping remains portable without an extra YAML dependency.
    contents = json.dumps(settings, ensure_ascii=False, indent=2) + '\n'
    if config.exists() and not args.replace_default:
        print(f'Voice installed. Existing default kept: {config}; use --replace-default to select Piper.')
    else:
        if config.exists():
            config.with_suffix('.yaml.backup').write_bytes(config.read_bytes())
        config.write_text(contents, encoding='utf-8')
        print(f'Vietnamese default ready: {config}')
    print(f'Model provenance and dataset attribution: {models / "MODEL_CARD"}')


if __name__ == '__main__':
    main()
