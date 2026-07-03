"""Offline Vosk transcription — English, Hindi, Gujarati in parallel."""

from __future__ import annotations

import json
import math
import os
import re
import wave
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from vosk import KaldiRecognizer, Model, SetLogLevel

SetLogLevel(-1)

LANGUAGES = ('en', 'hi', 'gu')

MODEL_DIRS: dict[str, str] = {
    'en': 'vosk-model-small-en-us-0.15',
    'hi': 'vosk-model-hi-0.22',
    'gu': 'vosk-model-gu-0.42',
}

# Short overlapping segments — Vosk drops most of long single-pass audio.
SEGMENT_SECONDS = 5
SEGMENT_OVERLAP_SECONDS = 0.5
FEED_CHUNK_BYTES = 8000


@dataclass
class TranscriptCandidate:
    language: str
    text: str
    confidence: float


_models: dict[str, Model] = {}

DEVANAGARI = re.compile(r'[\u0900-\u097F]')
GUJARATI = re.compile(r'[\u0A80-\u0AFF]')
LATIN = re.compile(r'[A-Za-z]')


def models_root() -> Path:
    env_dir = os.environ.get('VOSK_MODELS_DIR')
    if env_dir:
        return Path(env_dir).resolve()
    return Path(__file__).resolve().parent.parent / 'vosk-models'


def resolve_model_path(root: Path, lang: str, dirname: str) -> Path:
    candidates = (root / lang / dirname, root / lang, root / dirname)
    for candidate in candidates:
        if candidate.is_dir() and (candidate / 'am').is_dir():
            return candidate
    raise FileNotFoundError(
        f'Vosk model for {lang} not found under {root / lang} or {root / dirname}. '
        'Run npm run vosk:models from the mams folder.'
    )


def load_models() -> None:
    root = models_root()
    for lang, dirname in MODEL_DIRS.items():
        model_path = resolve_model_path(root, lang, dirname)
        _models[lang] = Model(str(model_path))


def models_loaded() -> bool:
    return len(_models) == len(LANGUAGES)


def _word_count(text: str) -> int:
    return len([w for w in text.split() if w.strip()])


def _script_fraction(text: str, language: str) -> float:
    dev = len(DEVANAGARI.findall(text))
    guj = len(GUJARATI.findall(text))
    lat = len(LATIN.findall(text))
    total = dev + guj + lat
    if total == 0:
        return 0.0
    if language == 'hi':
        return dev / total
    if language == 'gu':
        return guj / total
    return lat / total


def _aggregate_results(payloads: list[dict[str, Any]]) -> tuple[str, float]:
    """Merge word-level and text results from all segments (no start-time dedupe)."""
    words_out: list[str] = []
    confidences: list[float] = []

    for payload in payloads:
        if not isinstance(payload, dict):
            continue
        for word in payload.get('result') or []:
            if not isinstance(word, dict):
                continue
            token = (word.get('word') or '').strip()
            if not token:
                continue
            words_out.append(token)
            if 'conf' in word:
                confidences.append(float(word['conf']))

    if words_out:
        text = ' '.join(words_out)
        conf = sum(confidences) / len(confidences) if confidences else 0.25
        return text, conf

    texts: list[str] = []
    for payload in payloads:
        if not isinstance(payload, dict):
            continue
        part = (payload.get('text') or '').strip()
        if not part:
            continue
        if not texts or part != texts[-1]:
            texts.append(part)

    text = ' '.join(texts).strip()
    if not text:
        return '', 0.0
    return text, 0.25


def _iter_pcm_segments(pcm: bytes, sample_rate: int) -> list[bytes]:
    bytes_per_sample = 2
    min_bytes = sample_rate * bytes_per_sample
    chunk_bytes = int(SEGMENT_SECONDS * sample_rate * bytes_per_sample)
    overlap_bytes = int(SEGMENT_OVERLAP_SECONDS * sample_rate * bytes_per_sample)
    step = max(chunk_bytes - overlap_bytes, min_bytes)

    segments: list[bytes] = []
    offset = 0
    while offset < len(pcm):
        segment = pcm[offset : offset + chunk_bytes]
        if len(segment) < min_bytes:
            if segment and segments:
                segments[-1] = segments[-1] + segment
            elif segment:
                segments.append(segment)
            break
        segments.append(segment)
        if offset + chunk_bytes >= len(pcm):
            break
        offset += step
    return segments or [pcm]


def _recognize_pcm(model: Model, sample_rate: int, pcm: bytes) -> list[dict[str, Any]]:
    recognizer = KaldiRecognizer(model, sample_rate)
    recognizer.SetWords(True)
    payloads: list[dict[str, Any]] = []

    offset = 0
    while offset < len(pcm):
        block = pcm[offset : offset + FEED_CHUNK_BYTES]
        offset += FEED_CHUNK_BYTES
        if recognizer.AcceptWaveform(block):
            try:
                payloads.append(json.loads(recognizer.Result() or '{}'))
            except json.JSONDecodeError:
                pass

    try:
        payloads.append(json.loads(recognizer.FinalResult() or '{}'))
    except json.JSONDecodeError:
        payloads.append({})

    return payloads


def _score_candidate(candidate: TranscriptCandidate) -> float:
    wc = _word_count(candidate.text)
    if wc == 0:
        return -1.0
    script = _script_fraction(candidate.text, candidate.language)
    if candidate.language in ('hi', 'gu') and script < 0.2:
        return -1.0
    return candidate.confidence * math.sqrt(wc) * (0.35 + 0.65 * script)


def _indic_quality(candidate: TranscriptCandidate) -> float:
    wc = _word_count(candidate.text)
    if wc == 0:
        return -1.0
    script = _script_fraction(candidate.text, candidate.language)
    if script < 0.35:
        return -1.0
    return wc * script * candidate.confidence


def _pick_best_indic(candidates: list[TranscriptCandidate]) -> TranscriptCandidate:
    hi = next((c for c in candidates if c.language == 'hi'), None)
    gu = next((c for c in candidates if c.language == 'gu'), None)

    if hi and gu:
        hi_q = _indic_quality(hi)
        gu_q = _indic_quality(gu)
        hi_script = _script_fraction(hi.text, 'hi')
        gu_script = _script_fraction(gu.text, 'gu')

        if gu_script >= 0.55 and gu_q >= hi_q * 0.85:
            return gu
        if hi_script >= 0.55 and hi_q >= gu_q * 0.85:
            return hi
        if gu_q > hi_q:
            return gu
        if hi_q > gu_q:
            return hi

    return max(candidates, key=_indic_quality)


def _prefer_indic_over_english(en: TranscriptCandidate, indic: TranscriptCandidate) -> bool:
    indic_words = _word_count(indic.text)
    indic_script = _script_fraction(indic.text, indic.language)
    if indic_words < 3 or indic_script < 0.45 or indic.confidence < 0.3:
        return False

    en_words = _word_count(en.text)
    en_is_latin = _script_fraction(en.text, 'en') >= 0.85

    # English has far more tokens — short Indic output is usually model noise, not the real language.
    if en_words >= indic_words * 2 and indic_words < max(10, int(en_words * 0.2)):
        return False

    if en_is_latin and indic_script >= 0.55 and indic_words >= 4:
        if en.confidence >= indic.confidence + 0.15 and _script_fraction(en.text, 'en') >= 0.9:
            return False
        if en_words >= indic_words * 3 and en.confidence > indic.confidence + 0.05:
            return False
        return True

    indic_has_substance = indic_words >= max(6, int(en_words * 0.15))
    if not en_is_latin or not indic_has_substance:
        return False

    return _indic_quality(indic) >= _score_candidate(en) * 0.4


def _pick_best(candidates: list[TranscriptCandidate]) -> TranscriptCandidate:
    en = next((c for c in candidates if c.language == 'en'), None)
    indic = [c for c in candidates if c.language in ('hi', 'gu')]

    viable_indic = [
        c for c in indic if _word_count(c.text) >= 3 and _script_fraction(c.text, c.language) >= 0.4
    ]

    if en and viable_indic:
        best_indic = _pick_best_indic(viable_indic)
        if _prefer_indic_over_english(en, best_indic):
            return best_indic

    if viable_indic and not en:
        return _pick_best_indic(viable_indic)

    if viable_indic and en:
        best_indic = _pick_best_indic(viable_indic)
        if _indic_quality(best_indic) >= _score_candidate(en) * 0.45:
            return best_indic

    return max(candidates, key=_score_candidate)


def transcribe_language(language: str, wav_path: Path) -> TranscriptCandidate:
    if language not in _models:
        raise KeyError(f'Model not loaded for {language}')

    with wave.open(str(wav_path), 'rb') as wf:
        if wf.getnchannels() != 1:
            raise ValueError('WAV must be mono')
        if wf.getsampwidth() != 2:
            raise ValueError('WAV must be 16-bit PCM')
        sample_rate = wf.getframerate()
        if sample_rate != 16000:
            raise ValueError(f'WAV must be 16 kHz, got {sample_rate}')
        pcm = wf.readframes(wf.getnframes())

    all_payloads: list[dict[str, Any]] = []
    for segment in _iter_pcm_segments(pcm, sample_rate):
        all_payloads.extend(_recognize_pcm(_models[language], sample_rate, segment))

    text, confidence = _aggregate_results(all_payloads)
    return TranscriptCandidate(language=language, text=text, confidence=confidence)


def transcribe_all_languages(
    wav_path: Path, language_hint: str | None = None
) -> dict[str, Any]:
    if not models_loaded():
        load_models()

    langs = (language_hint,) if language_hint in LANGUAGES else LANGUAGES
    candidates: list[TranscriptCandidate] = []

    with ThreadPoolExecutor(max_workers=len(langs)) as pool:
        futures = {pool.submit(transcribe_language, lang, wav_path): lang for lang in langs}
        for future in as_completed(futures):
            candidates.append(future.result())

    if language_hint in LANGUAGES and candidates:
        best = candidates[0]
    else:
        candidates.sort(key=lambda c: c.language)
        if not candidates:
            raise RuntimeError('No transcription candidates produced')
        best = _pick_best(candidates)

    return {
        'best': {
            'language': best.language,
            'text': best.text,
            'confidence': round(best.confidence, 4),
        },
        'candidates': [
            {
                'language': c.language,
                'text': c.text,
                'confidence': round(c.confidence, 4),
            }
            for c in sorted(candidates, key=lambda c: c.language)
        ],
    }
