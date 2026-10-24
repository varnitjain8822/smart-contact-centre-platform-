/**
 * Voice utilities for speech-to-text audio and text-to-speech cleaning.
 */

/** Strip markdown, code blocks, links, and tokens so speech synthesis sounds natural. */
export function cleanForSpeech(text: string): string {
  if (!text) return '';
  return text
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
    // remove bullet points and list numbers
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/^\s*\d+\.\s+/gm, '')
    // collapse multiple spaces and newlines
    .replace(/\s+/g, ' ')
    .trim();
}

/** Select the best available browser voice for the given language. */
export function pickVoice(voices: SpeechSynthesisVoice[], lang: string): SpeechSynthesisVoice | null {
  if (!voices || voices.length === 0) return null;
  const isHindi = lang.toLowerCase().startsWith('hi');

  if (isHindi) {
    const hiVoice = voices.find((v) =>
      v.lang.toLowerCase().replace('_', '-').startsWith('hi') ||
      /hindi|lekha|kavya|madhur|swara|neerja|हिन्दी/i.test(v.name)
    );
    if (hiVoice) return hiVoice;
  } else {
    // English priority: Indian English (en-IN), then any English (en-US, en-GB)
    const enInVoice = voices.find((v) =>
      v.lang.toLowerCase().replace('_', '-').startsWith('en-in') ||
      /india|rishi|veena|prabhat|sangeeta/i.test(v.name)
    );
    if (enInVoice) return enInVoice;
    const enVoice = voices.find((v) => v.lang.toLowerCase().startsWith('en'));
    if (enVoice) return enVoice;
  }

  // Fallback to default voice or first available
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
