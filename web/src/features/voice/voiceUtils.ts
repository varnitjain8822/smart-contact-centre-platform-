/**
 * Voice utilities for speech-to-text audio and text-to-speech cleaning and prosody.
 */

/** Strip markdown, code blocks, links, and tokens; normalize prosody and abbreviations for natural human-like speech. */
export function cleanForSpeech(text: string): string {
  if (!text) return '';
  const isHindi = /[\u0900-\u097F]/.test(text);

  let s = text
    // remove markdown code blocks
    .replace(/```[\s\S]*?```/g, '')
    // remove inline code
    .replace(/`([^`]+)`/g, '$1')
    // convert markdown links [label](url) -> label
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // remove markdown images
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '')
    // remove markdown headers
    .replace(/^#{1,6}\s+/gm, '')
    // remove bold/italic formatting
    .replace(/(\*\*|__)(.*?)\1/g, '$2')
    .replace(/(\*|_)(.*?)\1/g, '$2')
    // remove citation markers like [1], [2]
    .replace(/\[\d+\]/g, '')
    // remove internal metadata tags <<...>>
    .replace(/<<[^>]+>>/g, '')
    // remove bullet points and list numbers at start of lines
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/^\s*\d+\.\s+/gm, '');

  if (isHindi) {
    // Hindi phonetic and currency enhancements
    s = s
      // Replace currency symbol ₹ or Rs with रुपये
      .replace(/₹\s*(\d[\d,]*)/g, '$1 रुपये')
      .replace(/\bRs\.?\s*(\d[\d,]*)/gi, '$1 रुपये')
      // Remove commas inside numbers so Hindi TTS reads the full value rather than pausing awkwardly
      .replace(/(\d+),(\d+)/g, '$1$2')
      // Common abbreviations in Hindi
      .replace(/\bOTP\b/g, 'ओ टी पी')
      .replace(/\bKYC\b/g, 'के वाई सी')
      .replace(/\bPIN\b/g, 'पिन')
      .replace(/\bATM\b/g, 'ए टी एम')
      .replace(/\bSBI\b/g, 'एस बी आई')
      .replace(/\bGST\b/g, 'जी एस टी')
      .replace(/\bSMS\b/g, 'एस एम एस')
      .replace(/\b24\/7\b/g, 'चौबीसों घंटे')
      // Devanagari full stop (poorna viraam) ensure pause
      .replace(/।\s*/g, '। ');
  } else {
    // English currency enhancements
    s = s
      .replace(/₹\s*(\d[\d,]*)/g, '$1 Rupees')
      .replace(/\b24\/7\b/g, '24 hours 7 days a week')
      // Space out key acronyms so TTS does not read them as garbled single words
      .replace(/\bOTP\b/g, 'O T P')
      .replace(/\bKYC\b/g, 'K Y C')
      .replace(/\bGST\b/g, 'G S T')
      .replace(/\bSBI\b/g, 'S B I')
      .replace(/\bDEL\b/g, 'D E L')
      .replace(/\bPSP\b/g, 'P S P')
      .replace(/\bMTC\b/g, 'M T C');
  }

  return s
    // Convert semicolons to commas for natural breathing pauses
    .replace(/;\s*/g, ', ')
    // collapse multiple spaces and newlines
    .replace(/\s+/g, ' ')
    .trim();
}

/** Split long responses into natural sentences for continuous, human-paced playback without browser cutoffs. */
export function splitIntoSentences(text: string): string[] {
  if (!text) return [];
  // Split on sentence boundaries: period, question mark, exclamation, or Devanagari danda followed by space
  const raw = text.split(/(?<=[.?!।])\s+/);
  return raw.map((s) => s.trim()).filter((s) => s.length > 0);
}

/** Score voices to prioritize natural/neural/enhanced voices and penalize robotic or gag voices. */
export function scoreVoice(v: SpeechSynthesisVoice, isHindi: boolean): number {
  let score = 0;
  const name = v.name.toLowerCase();
  const vLang = v.lang.toLowerCase().replace('_', '-');

  // Heavy penalty for mechanical / gag voices present in OSes
  if (
    /bad news|bahh|bells|boing|bubbles|cellos|deranged|fred|good news|hysterical|organ|pipe|trinoids|whisper|zarvox|albert|junior|ralph|kathy|princess/i.test(
      name
    )
  ) {
    return -1000;
  }

  // Bonus for modern natural, neural, or enhanced cloud/local synthesis models
  if (/natural|neural|enhanced|premium|online|siri|google/i.test(name)) {
    score += 60;
  }

  if (isHindi) {
    if (vLang.startsWith('hi')) score += 100;
    // Microsoft Natural Hindi voices (Swara / Madhur)
    if (/swara/i.test(name)) score += 95;
    if (/madhur/i.test(name)) score += 90;
    // Apple / Google Hindi voices
    if (/google हिन्दी|google hi/i.test(name)) score += 85;
    if (/lekha/i.test(name)) score += 80;
    if (/kavya|neerja|swara/i.test(name)) score += 50;
  } else {
    // English priority: Indian English first for regional Indian portals
    if (vLang === 'en-in') score += 100;
    // Microsoft Natural Indian English (Neerja / Prabhat)
    if (/neerja/i.test(name)) score += 95;
    if (/prabhat/i.test(name)) score += 90;
    if (/rishi/i.test(name)) score += 85;
    if (/veena/i.test(name)) score += 80;
    // High-quality global English (Google, Samantha, Serena, Oliver, Daniel)
    if (/google uk english female|google us english/i.test(name)) score += 75;
    if (/samantha|serena|karen|oliver|daniel/i.test(name)) score += 70;
    if (vLang.startsWith('en')) score += 40;
  }

  if (v.default) score += 5;
  return score;
}

/** Select the best available browser voice for the given language with optional user preference. */
export function pickVoice(
  voices: SpeechSynthesisVoice[],
  lang: string,
  preferredVoiceName?: string
): SpeechSynthesisVoice | null {
  if (!voices || voices.length === 0) return null;

  // 1. If preferred voice exists in available voices, return it immediately
  if (preferredVoiceName) {
    const match = voices.find((v) => v.name.toLowerCase() === preferredVoiceName.toLowerCase());
    if (match) return match;
  }

  const isHindi = lang.toLowerCase().startsWith('hi');

  // 2. Rank all voices by quality score
  const scored = voices
    .map((v) => ({ voice: v, score: scoreVoice(v, isHindi) }))
    .filter((entry) => entry.score > -500)
    .sort((a, b) => b.score - a.score);

  if (scored.length > 0 && scored[0]!.score > 0) {
    return scored[0]!.voice;
  }

  // 3. Fallback to default voice or first available
  return voices.find((v) => v.default) || voices[0] || null;
}

/** Determine the best supported audio container MIME type for MediaRecorder. */
export function getSupportedAudioMime(): string {
  if (typeof window === 'undefined' || typeof MediaRecorder === 'undefined') {
    return 'audio/webm';
  }
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg;codecs=opus',
    'audio/mp4',
  ];
  for (const c of candidates) {
    if (MediaRecorder.isTypeSupported?.(c)) return c;
  }
  return '';
}
