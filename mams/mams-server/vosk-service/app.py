"""FastAPI microservice for offline Vosk transcription."""

from __future__ import annotations

import os
import tempfile
from pathlib import Path

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.responses import JSONResponse

from transcribe import load_models, models_loaded, transcribe_all_languages

app = FastAPI(title='MAMS Vosk Transcription', version='1.0.0')


@app.on_event('startup')
def startup() -> None:
    load_models()


@app.get('/health')
def health() -> JSONResponse:
    if not models_loaded():
        return JSONResponse({'status': 'starting', 'modelsLoaded': False}, status_code=503)
    return JSONResponse({'status': 'ok', 'modelsLoaded': True})


@app.post('/transcribe')
async def transcribe(
    audio: UploadFile = File(...),
    language: str | None = Form(None),
) -> dict:
    if not models_loaded():
        raise HTTPException(status_code=503, detail='Models not loaded yet')

    hint = language.strip().lower() if language else None
    if hint and hint not in ('en', 'hi', 'gu', 'auto'):
        raise HTTPException(status_code=400, detail='language must be en, hi, gu, or auto')

    suffix = '.wav'
    if audio.filename and audio.filename.lower().endswith('.wav'):
        suffix = '.wav'

    tmp_path: Path | None = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp_path = Path(tmp.name)
            content = await audio.read()
            if not content:
                raise HTTPException(status_code=400, detail='Empty audio file')
            tmp.write(content)

        language_hint = None if hint in (None, 'auto') else hint
        return transcribe_all_languages(tmp_path, language_hint=language_hint)
    except HTTPException:
        raise
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f'Transcription failed: {exc}') from exc
    finally:
        if tmp_path and tmp_path.exists():
            try:
                tmp_path.unlink()
            except OSError:
                pass


def main() -> None:
    import uvicorn

    host = os.environ.get('VOSK_HOST', '127.0.0.1')
    port = int(os.environ.get('VOSK_PORT', '8765'))
    uvicorn.run('app:app', host=host, port=port, log_level='info')


if __name__ == '__main__':
    main()
