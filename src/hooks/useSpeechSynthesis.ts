import { useCallback, useRef, useState, useEffect } from 'react';
import { Language } from '@/types/gesture';

interface UseSpeechSynthesisOptions {
  language: Language;
  rate: number;
  isMuted: boolean;
}

export function useSpeechSynthesis({ language, rate, isMuted }: UseSpeechSynthesisOptions) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const lastSpokenRef = useRef<string>('');
  const lastSpeakTimeRef = useRef<number>(0);
  const speakingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load available voices
  useEffect(() => {
    const loadVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices();
      setVoices(availableVoices);
    };

    loadVoices();
    window.speechSynthesis.addEventListener('voiceschanged', loadVoices);

    return () => {
      window.speechSynthesis.removeEventListener('voiceschanged', loadVoices);
    };
  }, []);

  const getVoiceForLanguage = useCallback((lang: Language): SpeechSynthesisVoice | null => {
    const langCode = lang === 'hi' ? 'hi' : 'en';
    
    // Try to find a voice for the language
    let voice = voices.find(v => v.lang.startsWith(langCode));
    
    // Fallback to English if Hindi not available
    if (!voice && lang === 'hi') {
      voice = voices.find(v => v.lang.startsWith('en'));
    }
    
    return voice || null;
  }, [voices]);

  const speak = useCallback((text: string, hindiText?: string) => {
    if (isMuted || !text) return;

    const now = Date.now();
    const textToSpeak = language === 'hi' && hindiText ? hindiText : text;
    
    // Prevent rapid repetition - wait at least 1.5 seconds between same gesture
    const minDelay = 1500;
    if (textToSpeak === lastSpokenRef.current && now - lastSpeakTimeRef.current < minDelay) {
      return;
    }

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();
    
    if (speakingTimeoutRef.current) {
      clearTimeout(speakingTimeoutRef.current);
    }

    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.rate = rate;
    utterance.pitch = 1;
    utterance.volume = 1;

    const voice = getVoiceForLanguage(language);
    if (voice) {
      utterance.voice = voice;
    }

    utterance.onstart = () => {
      setIsSpeaking(true);
    };

    utterance.onend = () => {
      setIsSpeaking(false);
    };

    utterance.onerror = () => {
      setIsSpeaking(false);
    };

    window.speechSynthesis.speak(utterance);
    lastSpokenRef.current = textToSpeak;
    lastSpeakTimeRef.current = now;

    // Fallback timeout in case onend doesn't fire
    const estimatedDuration = (textToSpeak.length / 10) * (1000 / rate) + 500;
    speakingTimeoutRef.current = setTimeout(() => {
      setIsSpeaking(false);
    }, estimatedDuration);
  }, [language, rate, isMuted, getVoiceForLanguage]);

  const stopSpeaking = useCallback(() => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    if (speakingTimeoutRef.current) {
      clearTimeout(speakingTimeoutRef.current);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
      if (speakingTimeoutRef.current) {
        clearTimeout(speakingTimeoutRef.current);
      }
    };
  }, []);

  return {
    speak,
    stopSpeaking,
    isSpeaking
  };
}
