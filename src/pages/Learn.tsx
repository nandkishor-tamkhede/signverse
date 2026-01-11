import { useState, useCallback, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, GraduationCap, Loader2, RefreshCw, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AnimatedBackground } from '@/components/AnimatedBackground';
import { CategoryCard } from '@/components/learning/CategoryCard';
import { CategoryBrowser } from '@/components/learning/CategoryBrowser';
import { SignViewer } from '@/components/learning/SignViewer';
import { BeginnerPracticeMode } from '@/components/learning/BeginnerPracticeMode';
import { LearningProgressOverview } from '@/components/learning/LearningProgressOverview';
import { LEARNING_CATEGORIES, LearningCategory } from '@/lib/learningCategories';
import { useMediaPipeHands } from '@/hooks/useMediaPipeHands';
import { GestureClassificationResult } from '@/types/gesture';
import { useAnonymousAuth } from '@/hooks/useAnonymousAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type ViewState = 'categories' | 'browse' | 'learn' | 'practice';

const Learn = () => {
  const [viewState, setViewState] = useState<ViewState>('categories');
  const [selectedCategory, setSelectedCategory] = useState<LearningCategory | null>(null);
  const [currentGestureIndex, setCurrentGestureIndex] = useState(0);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [detectedGesture, setDetectedGesture] = useState<GestureClassificationResult | null>(null);
  const [completedGestures, setCompletedGestures] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  const { user, isAuthenticated, isLoading: authLoading } = useAnonymousAuth();

  // Load completed gestures from database
  useEffect(() => {
    const loadProgress = async () => {
      if (!user?.id) {
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('user_learning_progress')
          .select('gesture_id')
          .eq('user_id', user.id)
          .eq('completed', true);

        if (error) throw error;

        const completed = new Set(data?.map(d => d.gesture_id) || []);
        setCompletedGestures(completed);
      } catch (error) {
        console.error('Failed to load progress:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (isAuthenticated) {
      loadProgress();
    }
  }, [user?.id, isAuthenticated]);

  const handleGestureDetected = useCallback((result: GestureClassificationResult) => {
    setDetectedGesture(result);
  }, []);

  const { videoRef, canvasRef, isLoading: cameraLoading } = useMediaPipeHands({
    onGestureDetected: handleGestureDetected,
    isActive: isCameraActive,
  });

  // Handlers
  const handleSelectCategory = (category: LearningCategory) => {
    setSelectedCategory(category);
    setViewState('browse');
  };

  const handleSelectGesture = (index: number) => {
    setCurrentGestureIndex(index);
    setViewState('learn');
  };

  const handleStartPractice = () => {
    setViewState('practice');
    setIsCameraActive(true);
  };

  const handleClosePractice = () => {
    setViewState('learn');
    setIsCameraActive(false);
  };

  const handlePracticeComplete = async (accuracy: number, passed: boolean) => {
    if (!selectedCategory || !user?.id) return;

    const gesture = selectedCategory.gestures[currentGestureIndex];
    
    try {
      // Upsert progress to database
      const { error } = await supabase
        .from('user_learning_progress')
        .upsert({
          user_id: user.id,
          level_id: LEARNING_CATEGORIES.findIndex(c => c.id === selectedCategory.id) + 1,
          gesture_id: gesture.name,
          accuracy_score: accuracy,
          best_accuracy: accuracy,
          completed: passed,
          attempts: 1,
          last_practiced_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id,level_id,gesture_id'
        });

      if (error) throw error;

      if (passed) {
        setCompletedGestures(prev => new Set([...prev, gesture.name]));
        toast.success('Great job! Progress saved 🎉');
      }
    } catch (error) {
      console.error('Failed to save progress:', error);
    }
  };

  const handleNextGesture = () => {
    if (selectedCategory && currentGestureIndex < selectedCategory.gestures.length - 1) {
      setCurrentGestureIndex(prev => prev + 1);
    }
  };

  const handlePreviousGesture = () => {
    if (currentGestureIndex > 0) {
      setCurrentGestureIndex(prev => prev - 1);
    }
  };

  const handleBackFromLearn = () => {
    setViewState('browse');
  };

  const handleBackFromBrowse = () => {
    setSelectedCategory(null);
    setViewState('categories');
  };

  const getCompletionStatus = (gestureName: string) => {
    return completedGestures.has(gestureName);
  };

  const getCategoryCompletedCount = (category: LearningCategory) => {
    return category.gestures.filter(g => completedGestures.has(g.name)).length;
  };

  const handleRefresh = async () => {
    if (!user?.id) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_learning_progress')
        .select('gesture_id')
        .eq('user_id', user.id)
        .eq('completed', true);

      if (error) throw error;

      const completed = new Set(data?.map(d => d.gesture_id) || []);
      setCompletedGestures(completed);
      toast.success('Progress refreshed');
    } catch {
      toast.error('Failed to refresh');
    } finally {
      setIsLoading(false);
    }
  };

  // Loading state
  if (authLoading || isLoading) {
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
        {/* Header - only show on main views */}
        {viewState === 'categories' && (
          <>
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <Link to="/">
                  <Button variant="ghost" size="icon">
                    <ArrowLeft className="w-5 h-5" />
                  </Button>
                </Link>
                <div className="flex items-center gap-4">
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-primary via-purple-500 to-pink-500">
                    <GraduationCap className="w-10 h-10 text-white" />
                  </div>
                  <div>
                    <h1 className="text-3xl sm:text-4xl font-bold">Learn Sign Language</h1>
                    <p className="text-muted-foreground flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-yellow-500" />
                      Easy, visual, and beginner-friendly
                    </p>
                  </div>
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={handleRefresh}
                disabled={isLoading}
              >
                <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
            </div>

            {/* Progress Overview */}
            <LearningProgressOverview completedGestures={completedGestures} />
          </>
        )}

        {/* Content */}
        <AnimatePresence mode="wait">
          {viewState === 'categories' && (
            <motion.div
              key="categories"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {/* Welcome message for beginners */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center mb-10"
              >
                <h2 className="text-2xl font-semibold mb-2">Choose a category to start learning</h2>
                <p className="text-muted-foreground">
                  Each category contains visual signs with step-by-step guidance
                </p>
              </motion.div>

              {/* Category grid */}
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {LEARNING_CATEGORIES.map((category, index) => (
                  <CategoryCard
                    key={category.id}
                    category={category}
                    completedCount={getCategoryCompletedCount(category)}
                    onClick={() => handleSelectCategory(category)}
                    index={index}
                  />
                ))}
              </div>
            </motion.div>
          )}

          {viewState === 'browse' && selectedCategory && (
            <CategoryBrowser
              key="browse"
              category={selectedCategory}
              onBack={handleBackFromBrowse}
              onSelectGesture={handleSelectGesture}
              getCompletionStatus={getCompletionStatus}
            />
          )}
        </AnimatePresence>

        {/* Sign Viewer */}
        <AnimatePresence>
          {viewState === 'learn' && selectedCategory && (
            <SignViewer
              category={selectedCategory}
              currentIndex={currentGestureIndex}
              isCompleted={getCompletionStatus(selectedCategory.gestures[currentGestureIndex]?.name)}
              onNext={handleNextGesture}
              onPrevious={handlePreviousGesture}
              onClose={handleBackFromLearn}
              onPractice={handleStartPractice}
              totalGestures={selectedCategory.gestures.length}
              getCompletionStatus={(index) => 
                getCompletionStatus(selectedCategory.gestures[index]?.name)
              }
            />
          )}
        </AnimatePresence>

        {/* Practice Mode */}
        <AnimatePresence>
          {viewState === 'practice' && selectedCategory && (
            <BeginnerPracticeMode
              gesture={selectedCategory.gestures[currentGestureIndex]}
              category={selectedCategory}
              videoRef={videoRef}
              canvasRef={canvasRef}
              isActive={isCameraActive}
              isLoading={cameraLoading}
              detectedGesture={detectedGesture}
              onClose={handleClosePractice}
              onComplete={handlePracticeComplete}
              onToggleCamera={() => setIsCameraActive(true)}
              requiredAccuracy={50}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Learn;
