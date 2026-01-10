import { useState, useCallback, useRef, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { AnimatedBackground } from '@/components/AnimatedBackground';
import { Header } from '@/components/Header';
import { WebcamPreview } from '@/components/WebcamPreview';
import { GestureDisplay } from '@/components/GestureDisplay';
import { SpeechWaveform } from '@/components/SpeechWaveform';
import { GestureHistory } from '@/components/GestureHistory';
import { ControlPanel } from '@/components/ControlPanel';
import { QuickPhrases } from '@/components/QuickPhrases';
import { HowToUse } from '@/components/HowToUse';
import { useMediaPipeHands } from '@/hooks/useMediaPipeHands';
import { useSpeechSynthesis } from '@/hooks/useSpeechSynthesis';
import { GestureDefinition, DetectedGesture, GestureClassificationResult, Language } from '@/types/gesture';

const MAX_HISTORY = 10;

const Index = () => {
  // State
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [language, setLanguage] = useState<Language>('en');
  const [speechRate, setSpeechRate] = useState(1);
  const [currentGesture, setCurrentGesture] = useState<GestureDefinition | null>(null);
  const [confidence, setConfidence] = useState(0);
  const [history, setHistory] = useState<DetectedGesture[]>([]);
  
  const lastGestureRef = useRef<string | null>(null);
  const gestureStableCountRef = useRef(0);
  const STABILITY_THRESHOLD = 5; // Frames needed to confirm gesture

  // Speech synthesis
  const { speak, isSpeaking } = useSpeechSynthesis({
    language,
    rate: speechRate,
    isMuted
  });

  // Handle gesture detection
  const handleGestureDetected = useCallback((result: GestureClassificationResult) => {
    if (!result.gesture) {
      setCurrentGesture(null);
      setConfidence(0);
      gestureStableCountRef.current = 0;
      lastGestureRef.current = null;
      return;
    }

    // Update display
    setCurrentGesture(result.gesture);
    setConfidence(result.confidence);

    // Check for stable gesture detection
    if (result.gesture.name === lastGestureRef.current) {
      gestureStableCountRef.current++;
    } else {
      gestureStableCountRef.current = 1;
      lastGestureRef.current = result.gesture.name;
    }

    // Only trigger speech and history after stable detection
    if (gestureStableCountRef.current === STABILITY_THRESHOLD) {
      // Speak the gesture
      speak(result.gesture.englishText, result.gesture.hindiText);

      // Add to history
      const newEntry: DetectedGesture = {
        id: uuidv4(),
        gesture: result.gesture,
        confidence: result.confidence,
        timestamp: new Date()
      };

      setHistory(prev => {
        const updated = [newEntry, ...prev];
        return updated.slice(0, MAX_HISTORY);
      });
    }
  }, [speak]);

  // MediaPipe hands hook
  const { videoRef, canvasRef, isLoading, error } = useMediaPipeHands({
    onGestureDetected: handleGestureDetected,
    isActive: isCameraActive
  });

  // Handle quick phrase speak
  const handleQuickPhrase = useCallback((text: string, hindiText: string) => {
    speak(text, hindiText);
  }, [speak]);

  // Handle clear history
  const handleClearHistory = useCallback(() => {
    setHistory([]);
  }, []);

  // Handle theme toggle
  useEffect(() => {
    document.documentElement.classList.toggle('light', !isDarkMode);
  }, [isDarkMode]);

  return (
    <div className="min-h-screen relative">
      <AnimatedBackground />
      
      <div className="relative z-10 container mx-auto px-4 pb-20">
        <Header />

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main content - Webcam & Gesture Display */}
          <div className="lg:col-span-2 space-y-6">
            <WebcamPreview
              videoRef={videoRef}
              canvasRef={canvasRef}
              isActive={isCameraActive}
              isLoading={isLoading}
              error={error}
            />

            <GestureDisplay
              gesture={currentGesture}
              confidence={confidence}
              language={language}
            />

            <ControlPanel
              isCameraActive={isCameraActive}
              isMuted={isMuted}
              isDarkMode={isDarkMode}
              language={language}
              speechRate={speechRate}
              onToggleCamera={() => setIsCameraActive(prev => !prev)}
              onToggleMute={() => setIsMuted(prev => !prev)}
              onToggleDarkMode={() => setIsDarkMode(prev => !prev)}
              onToggleLanguage={() => setLanguage(prev => prev === 'en' ? 'hi' : 'en')}
              onSpeechRateChange={setSpeechRate}
              onClearHistory={handleClearHistory}
            />

            <QuickPhrases
              language={language}
              onSpeak={handleQuickPhrase}
            />
          </div>

          {/* Sidebar - Waveform & History */}
          <div className="space-y-6">
            <SpeechWaveform
              isSpeaking={isSpeaking}
              isMuted={isMuted}
            />

            <div className="h-[400px]">
              <GestureHistory
                history={history}
                language={language}
                onClear={handleClearHistory}
              />
            </div>
          </div>
        </div>
      </div>

      <HowToUse />
    </div>
  );
};

export default Index;
