import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act, renderHook } from '@testing-library/react';
import { cleanForSpeech, pickVoice, getSupportedAudioMime } from '../src/features/voice/voiceUtils';
import { VoiceButton } from '../src/features/voice/VoiceButton';
import { HandsFreeToggle } from '../src/features/voice/HandsFreeToggle';
import { useVoice } from '../src/features/voice/useVoice';
import { api } from '../src/lib/api';

describe('Voice Utilities', () => {
  it('cleanForSpeech strips markdown, code blocks, links, bullets, and citations', () => {
    const markdown = [
      '# Welcome to SmartCC',
      'Here is some **bold text** and *italic words*.',
      'Check out [this link](https://example.com) for details.',
      '```js\nconsole.log("hello");\n```',
      'Use inline `code snippet` here.',
      '- Item 1\n- Item 2\n1. Numbered',
      'Citations [1] and [2] are removed.',
      '<<META:company:sbi>> internal tokens gone.',
    ].join('\n');

    const cleaned = cleanForSpeech(markdown);
    expect(cleaned).not.toContain('#');
    expect(cleaned).not.toContain('**');
    expect(cleaned).not.toContain('```');
    expect(cleaned).not.toContain('https://example.com');
    expect(cleaned).not.toContain('[1]');
    expect(cleaned).not.toContain('<<META');
    expect(cleaned).toContain('Welcome to SmartCC');
    expect(cleaned).toContain('Here is some bold text and italic words.');
    expect(cleaned).toContain('Check out this link for details.');
    expect(cleaned).toContain('Use inline code snippet here.');
  });

  it('pickVoice picks Hindi voice when language starts with hi', () => {
    const mockVoices = [
      { name: 'Alex', lang: 'en-US', default: true } as SpeechSynthesisVoice,
      { name: 'Lekha', lang: 'hi-IN', default: false } as SpeechSynthesisVoice,
      { name: 'Rishi', lang: 'en-IN', default: false } as SpeechSynthesisVoice,
    ];

    const voice = pickVoice(mockVoices, 'hi');
    expect(voice?.name).toBe('Lekha');
    expect(voice?.lang).toBe('hi-IN');
  });

  it('pickVoice picks en-IN voice when available for English', () => {
    const mockVoices = [
      { name: 'Alex', lang: 'en-US', default: false } as SpeechSynthesisVoice,
      { name: 'Rishi', lang: 'en-IN', default: false } as SpeechSynthesisVoice,
    ];

    const voice = pickVoice(mockVoices, 'en');
    expect(voice?.name).toBe('Rishi');
  });

  it('getSupportedAudioMime returns supported mime type or fallback', () => {
    const mime = getSupportedAudioMime();
    expect(typeof mime).toBe('string');
  });
});

describe('VoiceButton Component', () => {
  it('renders idle mic button and triggers onStart on click', () => {
    const onStart = vi.fn();
    const onStop = vi.fn();
    render(<VoiceButton state="idle" onStart={onStart} onStop={onStop} />);

    const button = screen.getByRole('button', { name: /voice input|आवाज़ से बोलें/i });
    expect(button).toBeTruthy();
    fireEvent.click(button);
    expect(onStart).toHaveBeenCalledTimes(1);
    expect(onStop).not.toHaveBeenCalled();
  });

  it('renders listening stop button and triggers onStop on click', () => {
    const onStart = vi.fn();
    const onStop = vi.fn();
    render(<VoiceButton state="listening" onStart={onStart} onStop={onStop} />);

    const button = screen.getByRole('button', { name: /stop recording|रिकॉर्डिंग रोकें/i });
    expect(button).toBeTruthy();
    expect(button.getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(button);
    expect(onStop).toHaveBeenCalledTimes(1);
    expect(onStart).not.toHaveBeenCalled();
  });

  it('renders speaking stop button and triggers onStop on click', () => {
    const onStart = vi.fn();
    const onStop = vi.fn();
    render(<VoiceButton state="speaking" onStart={onStart} onStop={onStop} />);

    const button = screen.getByRole('button', { name: /stop reading|पढ़ना रोकें/i });
    expect(button).toBeTruthy();
    fireEvent.click(button);
    expect(onStop).toHaveBeenCalledTimes(1);
  });

  it('is disabled when transcribing', () => {
    const onStart = vi.fn();
    const onStop = vi.fn();
    render(<VoiceButton state="transcribing" onStart={onStart} onStop={onStop} />);

    const button = screen.getByRole('button', { name: /transcribing audio|ऑडियो को टेक्स्ट में बदला जा रहा है/i });
    expect((button as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(button);
    expect(onStart).not.toHaveBeenCalled();
    expect(onStop).not.toHaveBeenCalled();
  });
});

describe('HandsFreeToggle Component', () => {
  it('renders toggle and handles toggle click', () => {
    const onToggle = vi.fn();
    const { rerender } = render(<HandsFreeToggle enabled={false} onToggle={onToggle} />);

    const button = screen.getByRole('button', { name: /hands-free|हैंड्स-फ्री/i });
    expect(button.getAttribute('aria-pressed')).toBe('false');

    fireEvent.click(button);
    expect(onToggle).toHaveBeenCalledWith(true);

    rerender(<HandsFreeToggle enabled={true} onToggle={onToggle} />);
    expect(button.getAttribute('aria-pressed')).toBe('true');
  });
});

describe('useVoice Hook', () => {
  let originalMediaDevices: typeof navigator.mediaDevices;
  let originalSpeechSynthesis: typeof window.speechSynthesis;
  let originalUtterance: typeof window.SpeechSynthesisUtterance;

  beforeEach(() => {
    originalMediaDevices = navigator.mediaDevices;
    originalSpeechSynthesis = window.speechSynthesis;
    originalUtterance = window.SpeechSynthesisUtterance;

    Object.defineProperty(window, 'speechSynthesis', {
      value: {
        speak: vi.fn(),
        cancel: vi.fn(),
        getVoices: () => [],
        onvoiceschanged: null,
      },
      configurable: true,
      writable: true,
    });

    class MockSpeechSynthesisUtterance {
      text: string;
      lang = '';
      voice: SpeechSynthesisVoice | null = null;
      onstart: ((e: unknown) => void) | null = null;
      onend: ((e: unknown) => void) | null = null;
      onerror: ((e: unknown) => void) | null = null;
      constructor(text: string) {
        this.text = text;
      }
    }
    // @ts-expect-error mock SpeechSynthesisUtterance
    window.SpeechSynthesisUtterance = MockSpeechSynthesisUtterance;
  });

  afterEach(() => {
    Object.defineProperty(navigator, 'mediaDevices', { value: originalMediaDevices, configurable: true });
    Object.defineProperty(window, 'speechSynthesis', { value: originalSpeechSynthesis, configurable: true });
    window.SpeechSynthesisUtterance = originalUtterance;
    vi.restoreAllMocks();
  });

  it('initializes in idle state with handsFree matching initialHandsFree', () => {
    const { result } = renderHook(() => useVoice({ initialHandsFree: true }));
    expect(result.current.state).toBe('idle');
    expect(result.current.handsFree).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it('handles permission denied error gracefully', async () => {
    const mockGetUserMedia = vi.fn().mockRejectedValue(new DOMException('Permission denied', 'NotAllowedError'));
    Object.defineProperty(navigator, 'mediaDevices', {
      value: { getUserMedia: mockGetUserMedia },
      configurable: true,
    });

    const { result } = renderHook(() => useVoice());

    await act(async () => {
      await result.current.startListening();
    });

    expect(result.current.state).toBe('idle');
    expect(result.current.error).toBeTruthy();
  });

  it('records audio and transcribes via api.transcribeVoice', async () => {
    const mockStopTrack = vi.fn();
    const mockStream = {
      getTracks: () => [{ stop: mockStopTrack }],
    };
    const mockGetUserMedia = vi.fn().mockResolvedValue(mockStream);
    Object.defineProperty(navigator, 'mediaDevices', {
      value: { getUserMedia: mockGetUserMedia },
      configurable: true,
    });

    // Mock MediaRecorder
    class MockMediaRecorder {
      state = 'inactive';
      mimeType = 'audio/webm';
      ondataavailable: ((e: { data: Blob }) => void) | null = null;
      onstop: (() => void) | null = null;

      start() {
        this.state = 'recording';
      }

      stop() {
        this.state = 'inactive';
        if (this.ondataavailable) {
          const mockData = new Blob(['x'.repeat(1000)], { type: 'audio/webm' });
          this.ondataavailable({ data: mockData });
        }
        if (this.onstop) {
          this.onstop();
        }
      }
    }
    // @ts-expect-error mock MediaRecorder
    window.MediaRecorder = MockMediaRecorder;

    const transcribeSpy = vi.spyOn(api, 'transcribeVoice').mockResolvedValue({ text: 'Hello from voice' });
    const onTranscribed = vi.fn();

    const { result } = renderHook(() => useVoice({ onTranscribed, language: 'en' }));

    await act(async () => {
      await result.current.startListening();
    });

    expect(result.current.state).toBe('listening');

    await act(async () => {
      result.current.stopListening();
    });

    expect(transcribeSpy).toHaveBeenCalled();
    expect(onTranscribed).toHaveBeenCalledWith('Hello from voice');
    expect(result.current.state).toBe('idle');
  });

  it('speaks text using speechSynthesis and triggers onEnd', () => {
    let utteranceHandler: ((() => void) | null) = null;
    const mockSpeak = vi.fn((utterance: SpeechSynthesisUtterance) => {
      utterance.onstart?.(new Event('start') as SpeechSynthesisEvent);
      utteranceHandler = () => utterance.onend?.(new Event('end') as SpeechSynthesisEvent);
    });
    const mockCancel = vi.fn();

    Object.defineProperty(window, 'speechSynthesis', {
      value: {
        speak: mockSpeak,
        cancel: mockCancel,
        getVoices: () => [],
        onvoiceschanged: null,
      },
      configurable: true,
    });

    const onEnd = vi.fn();
    const { result } = renderHook(() => useVoice());

    act(() => {
      result.current.speak('Hello **world**', { onEnd });
    });

    expect(mockSpeak).toHaveBeenCalled();
    expect(result.current.state).toBe('speaking');

    act(() => {
      utteranceHandler?.();
    });

    expect(result.current.state).toBe('idle');
    expect(onEnd).toHaveBeenCalledTimes(1);
  });
});
