import type { BugReportDetectedLanguage } from '@mams/types';

export type VoskTranscriptCandidate = {
  language: string;
  text: string;
  confidence: number;
};

export type VoskTranscribeResponse = {
  best: VoskTranscriptCandidate;
  candidates: VoskTranscriptCandidate[];
};

const VALID_LANGUAGES = new Set<BugReportDetectedLanguage>(['en', 'hi', 'gu']);
const DEVANAGARI = /[\u0900-\u097F]/g;
const GUJARATI = /[\u0A80-\u0AFF]/g;
const LATIN = /[A-Za-z]/g;

export function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/** Fraction of letters in the script expected for this language label. */
export function scriptFraction(text: string, language: BugReportDetectedLanguage): number {
  const dev = (text.match(DEVANAGARI) ?? []).length;
  const guj = (text.match(GUJARATI) ?? []).length;
  const lat = (text.match(LATIN) ?? []).length;
  const total = dev + guj + lat;
  if (total === 0) return 0;
  if (language === 'hi') return dev / total;
  if (language === 'gu') return guj / total;
  return lat / total;
}

export function scoreTranscriptCandidate(candidate: {
  text: string;
  confidence: number;
  language: string;
}): number {
  const wc = wordCount(candidate.text);
  if (wc === 0) return -1;

  const lang = candidate.language as BugReportDetectedLanguage;
  if (!VALID_LANGUAGES.has(lang)) return -1;

  const script = scriptFraction(candidate.text, lang);
  if ((lang === 'hi' || lang === 'gu') && script < 0.2) return -1;

  const lengthFactor = Math.sqrt(wc);
  return candidate.confidence * lengthFactor * (0.35 + 0.65 * script);
}

function isStrongIndicCandidate(candidate: VoskTranscriptCandidate): boolean {
  if (candidate.language !== 'hi' && candidate.language !== 'gu') return false;
  const lang = candidate.language as BugReportDetectedLanguage;
  const wc = wordCount(candidate.text);
  const script = scriptFraction(candidate.text, lang);
  return wc >= 3 && script >= 0.55 && candidate.confidence >= 0.35;
}

/** When both Indic models respond, pick by native script match — not raw score. */
export function pickBestIndicCandidate(candidates: VoskTranscriptCandidate[]): VoskTranscriptCandidate {
  const hi = candidates.find((c) => c.language === 'hi');
  const gu = candidates.find((c) => c.language === 'gu');

  if (hi && gu) {
    const hiScript = scriptFraction(hi.text, 'hi');
    const guScript = scriptFraction(gu.text, 'gu');
    const hiWords = wordCount(hi.text);
    const guWords = wordCount(gu.text);

    if (guScript >= 0.6 && guScript >= hiScript + 0.12 && guWords >= 3) return gu;
    if (hiScript >= 0.6 && hiScript >= guScript + 0.12 && hiWords >= 3) return hi;

    if (guScript > hiScript + 0.05) return gu;
    if (hiScript > guScript + 0.05) return hi;
  }

  return candidates.reduce((best, c) =>
    scoreTranscriptCandidate(c) > scoreTranscriptCandidate(best) ? c : best
  );
}

function shouldPreferIndicOverEnglish(
  en: VoskTranscriptCandidate,
  indic: VoskTranscriptCandidate
): boolean {
  const enWords = wordCount(en.text);
  const indicWords = wordCount(indic.text);
  const indicScript = scriptFraction(indic.text, indic.language as BugReportDetectedLanguage);

  if (indicWords < 3 || indicScript < 0.55 || indic.confidence < 0.35) return false;

  // English has much more content — a tiny Indic snippet is usually false detection.
  if (enWords >= indicWords * 2 && indicWords < Math.max(10, Math.floor(enWords * 0.2))) {
    return false;
  }

  const enIsLatinHeavy = scriptFraction(en.text, 'en') >= 0.85;

  if (
    enIsLatinHeavy &&
    indicScript >= 0.7 &&
    indicWords >= 5 &&
    enWords >= indicWords * 2
  ) {
    if (en.confidence >= indic.confidence + 0.12 && scriptFraction(en.text, 'en') >= 0.9) {
      return false;
    }
    return true;
  }

  const indicHasSubstance = indicWords >= Math.max(6, Math.floor(enWords * 0.15));
  if (!enIsLatinHeavy || !indicHasSubstance) return false;

  const enScore = scoreTranscriptCandidate(en);
  const indicScore = scoreTranscriptCandidate(indic);
  return indicScore >= enScore * 0.45;
}

export function pickBestTranscript(response: VoskTranscribeResponse): {
  language: BugReportDetectedLanguage;
  text: string;
  confidence: number;
} {
  const pool = (response.candidates?.length ? response.candidates : [response.best]).filter(Boolean);
  if (pool.length === 0) {
    return { language: 'en', text: '', confidence: 0 };
  }

  const en = pool.find((c) => c.language === 'en');
  const indicPool = pool.filter((c) => c.language === 'hi' || c.language === 'gu');

  if (en && indicPool.length > 0) {
    const strongIndic = indicPool.filter(isStrongIndicCandidate);
    if (strongIndic.length > 0) {
      const bestIndic = pickBestIndicCandidate(strongIndic);
      if (shouldPreferIndicOverEnglish(en, bestIndic)) {
        return {
          language: bestIndic.language as BugReportDetectedLanguage,
          text: bestIndic.text.trim(),
          confidence: bestIndic.confidence,
        };
      }
    }
  }

  // No English override — prefer best Indic by script when both hi/gu present.
  if (indicPool.length > 0) {
    const viableIndic = indicPool.filter((c) => {
      const lang = c.language as BugReportDetectedLanguage;
      return wordCount(c.text) >= 3 && scriptFraction(c.text, lang) >= 0.45;
    });
    if (viableIndic.length > 0) {
      const bestIndic = pickBestIndicCandidate(viableIndic);
      const bestIndicScore = scoreTranscriptCandidate(bestIndic);
      const enScore = en ? scoreTranscriptCandidate(en) : -1;
      if (bestIndicScore >= enScore * 0.5) {
        return {
          language: bestIndic.language as BugReportDetectedLanguage,
          text: bestIndic.text.trim(),
          confidence: bestIndic.confidence,
        };
      }
    }
  }

  let winner = pool[0]!;
  let bestScore = scoreTranscriptCandidate(winner);
  for (const candidate of pool.slice(1)) {
    const score = scoreTranscriptCandidate(candidate);
    if (score > bestScore) {
      bestScore = score;
      winner = candidate;
    }
  }

  const language = VALID_LANGUAGES.has(winner.language as BugReportDetectedLanguage)
    ? (winner.language as BugReportDetectedLanguage)
    : 'en';

  return {
    language,
    text: winner.text.trim(),
    confidence: winner.confidence,
  };
}

export function canStartTranscription(status: string | null | undefined): boolean {
  return status == null || status === 'failed';
}

export function shouldReturnCachedTranscription(status: string | null | undefined): boolean {
  return status === 'completed';
}

export function isTranscriptionInProgress(status: string | null | undefined): boolean {
  return status === 'processing';
}

export function sanitizeTranscriptionError(message: string): string {
  const trimmed = message.trim();
  if (trimmed.length <= 240) return trimmed;
  return `${trimmed.slice(0, 237)}…`;
}
