import { useState, useCallback, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, GraduationCap, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AnimatedBackground } from '@/components/AnimatedBackground';
import { LevelCard } from '@/components/learning/LevelCard';
import { LevelDetail } from '@/components/learning/LevelDetail';
import { PracticeMode } from '@/components/learning/PracticeMode';
import { ProgressOverview } from '@/components/learning/ProgressOverview';
import { LEARNING_LEVELS } from '@/lib/learningData';
import { useLearningProgress } from '@/hooks/useLearningProgress';
import { useMediaPipeHands } from '@/hooks/useMediaPipeHands';
import { LearningLevel, LessonGesture } from '@/types/learning';
import { GestureClassificationResult } from '@/types/gesture';
import { useAnonymousAuth } from '@/hooks/useAnonymousAuth';
import { toast } from 'sonner';

const Learn = () => {
  const [selectedLevel, setSelectedLevel] = useState<LearningLevel | null>(null);
  const [selectedGesture, setSelectedGesture] = useState<LessonGesture | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [detectedGesture, setDetectedGesture] = useState<GestureClassificationResult | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  const { isAuthenticated, isLoading: authLoading } = useAnonymousAuth();

  const { 
    getLevelProgress, 
    getGestureProgress, 
    getTotalProgress, 
    updateGestureProgress,
    loadProgress,
    isLoading: progressLoading 
  } = useLearningProgress();

  const handleGestureDetected = useCallback((result: GestureClassificationResult) => {
    setDetectedGesture(result);
  }, []);

  const { videoRef, canvasRef, isLoading: cameraLoading } = useMediaPipeHands({
    onGestureDetected: handleGestureDetected,
    isActive: isCameraActive,
  });

  const totalProgress = getTotalProgress();
  const levelsCompleted = LEARNING_LEVELS.filter(level => {
    const progress = getLevelProgress(level.id);
    return progress?.gesturesCompleted === progress?.totalGestures && progress?.totalGestures > 0;
  }).length;

  const handlePracticeComplete = useCallback(async (accuracy: number, passed: boolean) => {
    if (selectedLevel && selectedGesture) {
      setIsUpdating(true);
      try {
        await updateGestureProgress(selectedLevel.id, selectedGesture.id, accuracy, passed);
        if (passed) {
          toast.success('Great job! Progress saved 🎉');
        }
      } catch (error) {
        console.error('Failed to save progress:', error);
        toast.error('Could not save progress. Please try again.');
      } finally {
        setIsUpdating(false);
      }
    }
  }, [selectedLevel, selectedGesture, updateGestureProgress]);

  const handleClosePractice = useCallback(() => {
    setSelectedGesture(null);
    setIsCameraActive(false);
  }, []);

  const handleRefresh = useCallback(async () => {
    try {
      await loadProgress();
      toast.success('Progress refreshed');
    } catch {
      toast.error('Failed to refresh progress');
    }
  }, [loadProgress]);

  // Show loading state
  if (authLoading || progressLoading) {
    return (
      <div className="min-h-screen relative">
        <AnimatedBackground />
        <div className="relative z-10 flex items-center justify-center min-h-screen">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center"
          >
            <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Loading your learning journey...</p>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative">
      <AnimatedBackground />
      
      <div className="relative z-10 container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link to="/">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-gradient-to-br from-primary to-secondary">
                <GraduationCap className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">Learn Sign Language</h1>
                <p className="text-muted-foreground">AI-powered interactive lessons</p>
              </div>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={handleRefresh}
            disabled={progressLoading}
          >
            <RefreshCw className={`w-5 h-5 ${progressLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {/* Progress Overview */}
        <ProgressOverview
          totalCompleted={totalProgress.completed}
          totalGestures={totalProgress.total}
          percentage={totalProgress.percentage}
          levelsCompleted={levelsCompleted}
          totalLevels={LEARNING_LEVELS.length}
        />

        {/* Content */}
        <AnimatePresence mode="wait">
          {!selectedLevel ? (
            <motion.div
              key="levels"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid md:grid-cols-2 gap-6"
            >
              {LEARNING_LEVELS.map((level) => {
                const progress = getLevelProgress(level.id);
                return (
                  <LevelCard
                    key={level.id}
                    level={level}
                    isUnlocked={progress?.isUnlocked ?? level.id === 1}
                    gesturesCompleted={progress?.gesturesCompleted ?? 0}
                    totalGestures={level.gestures.length}
                    isCompleted={progress?.completedAt !== null}
                    onClick={() => setSelectedLevel(level)}
                  />
                );
              })}
            </motion.div>
          ) : (
            <LevelDetail
              key="detail"
              level={selectedLevel}
              getGestureProgress={(levelId, gestureId) => {
                const progress = getGestureProgress(levelId, gestureId);
                return progress ? {
                  completed: progress.completed,
                  bestAccuracy: progress.bestAccuracy,
                  attempts: progress.attempts,
                } : undefined;
              }}
              onSelectGesture={setSelectedGesture}
              onBack={() => setSelectedLevel(null)}
            />
          )}
        </AnimatePresence>

        {/* Practice Mode */}
        <AnimatePresence>
          {selectedGesture && selectedLevel && (
            <PracticeMode
              gesture={selectedGesture}
              videoRef={videoRef}
              canvasRef={canvasRef}
              isActive={isCameraActive}
              isLoading={cameraLoading}
              detectedGesture={detectedGesture}
              onClose={handleClosePractice}
              onComplete={handlePracticeComplete}
              onToggleCamera={() => setIsCameraActive(true)}
              requiredAccuracy={selectedLevel.requiredAccuracy}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Learn;
