import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAnonymousAuth } from './useAnonymousAuth';
import { LEARNING_LEVELS } from '@/lib/learningData';

interface GestureProgress {
  gestureId: string;
  levelId: number;
  completed: boolean;
  bestAccuracy: number;
  attempts: number;
}

interface LevelProgress {
  levelId: number;
  gesturesCompleted: number;
  totalGestures: number;
  isUnlocked: boolean;
  completedAt: Date | null;
}

export function useLearningProgress() {
  const { user, isAuthenticated } = useAnonymousAuth();
  const [gestureProgress, setGestureProgress] = useState<Map<string, GestureProgress>>(new Map());
  const [levelProgress, setLevelProgress] = useState<Map<number, LevelProgress>>(new Map());
  const [isLoading, setIsLoading] = useState(true);

  // Load progress from database
  const loadProgress = useCallback(async () => {
    if (!user?.id) return;

    try {
      setIsLoading(true);

      // Load gesture progress
      const { data: gestureData, error: gestureError } = await supabase
        .from('user_learning_progress')
        .select('*')
        .eq('user_id', user.id);

      if (gestureError) throw gestureError;

      const gestureMap = new Map<string, GestureProgress>();
      gestureData?.forEach(item => {
        gestureMap.set(`${item.level_id}_${item.gesture_id}`, {
          gestureId: item.gesture_id,
          levelId: item.level_id,
          completed: item.completed,
          bestAccuracy: Number(item.best_accuracy) || 0,
          attempts: item.attempts,
        });
      });
      setGestureProgress(gestureMap);

      // Load level progress
      const { data: levelData, error: levelError } = await supabase
        .from('user_level_progress')
        .select('*')
        .eq('user_id', user.id);

      if (levelError) throw levelError;

      const levelMap = new Map<number, LevelProgress>();
      
      // Initialize all levels
      LEARNING_LEVELS.forEach((level, index) => {
        const existingProgress = levelData?.find(p => p.level_id === level.id);
        levelMap.set(level.id, {
          levelId: level.id,
          gesturesCompleted: existingProgress?.gestures_completed || 0,
          totalGestures: level.gestures.length,
          isUnlocked: index === 0 ? true : (existingProgress?.is_unlocked || false),
          completedAt: existingProgress?.completed_at ? new Date(existingProgress.completed_at) : null,
        });
      });

      // Check if level 1 needs initialization
      if (!levelData?.find(p => p.level_id === 1)) {
        await supabase.from('user_level_progress').insert({
          user_id: user.id,
          level_id: 1,
          gestures_completed: 0,
          total_gestures: LEARNING_LEVELS[0].gestures.length,
          is_unlocked: true,
        });
      }

      setLevelProgress(levelMap);
    } catch (error) {
      console.error('Error loading learning progress:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (isAuthenticated && user?.id) {
      loadProgress();
    }
  }, [isAuthenticated, user?.id, loadProgress]);

  // Update gesture progress after practice
  const updateGestureProgress = useCallback(async (
    levelId: number,
    gestureId: string,
    accuracy: number,
    completed: boolean
  ) => {
    if (!user?.id) return;

    const key = `${levelId}_${gestureId}`;
    const existing = gestureProgress.get(key);

    try {
      const newBestAccuracy = Math.max(existing?.bestAccuracy || 0, accuracy);
      const newAttempts = (existing?.attempts || 0) + 1;

      // Check if record exists first
      const { data: existingRecord } = await supabase
        .from('user_learning_progress')
        .select('id')
        .eq('user_id', user.id)
        .eq('level_id', levelId)
        .eq('gesture_id', gestureId)
        .maybeSingle();

      if (existingRecord) {
        // Update existing record
        const { error } = await supabase
          .from('user_learning_progress')
          .update({
            completed: completed || (existing?.completed || false),
            accuracy_score: accuracy,
            best_accuracy: newBestAccuracy,
            attempts: newAttempts,
            last_practiced_at: new Date().toISOString(),
          })
          .eq('id', existingRecord.id);

        if (error) throw error;
      } else {
        // Insert new record
        const { error } = await supabase
          .from('user_learning_progress')
          .insert({
            user_id: user.id,
            level_id: levelId,
            gesture_id: gestureId,
            completed: completed || false,
            accuracy_score: accuracy,
            best_accuracy: newBestAccuracy,
            attempts: newAttempts,
            last_practiced_at: new Date().toISOString(),
          });

        if (error) throw error;
      }

      // Update local state
      setGestureProgress(prev => {
        const updated = new Map(prev);
        updated.set(key, {
          gestureId,
          levelId,
          completed: completed || (existing?.completed || false),
          bestAccuracy: newBestAccuracy,
          attempts: newAttempts,
        });
        return updated;
      });

      // Update level progress if gesture was completed
      if (completed && !existing?.completed) {
        await updateLevelProgress(levelId);
      }
    } catch (error) {
      console.error('Error updating gesture progress:', error);
    }
  }, [user?.id, gestureProgress]);

  // Update level progress
  const updateLevelProgress = useCallback(async (levelId: number) => {
    if (!user?.id) return;

    const level = LEARNING_LEVELS.find(l => l.id === levelId);
    if (!level) return;

    // Count completed gestures for this level
    let completedCount = 0;
    level.gestures.forEach(gesture => {
      const key = `${levelId}_${gesture.id}`;
      if (gestureProgress.get(key)?.completed) {
        completedCount++;
      }
    });
    completedCount++; // Add the one we just completed

    const isLevelComplete = completedCount >= level.gestures.length;

    try {
      // Check if level progress exists
      const { data: existingLevel } = await supabase
        .from('user_level_progress')
        .select('id')
        .eq('user_id', user.id)
        .eq('level_id', levelId)
        .maybeSingle();

      if (existingLevel) {
        // Update current level
        await supabase
          .from('user_level_progress')
          .update({
            gestures_completed: completedCount,
            total_gestures: level.gestures.length,
            is_unlocked: true,
            completed_at: isLevelComplete ? new Date().toISOString() : null,
          })
          .eq('id', existingLevel.id);
      } else {
        // Insert new level progress
        await supabase
          .from('user_level_progress')
          .insert({
            user_id: user.id,
            level_id: levelId,
            gestures_completed: completedCount,
            total_gestures: level.gestures.length,
            is_unlocked: true,
            completed_at: isLevelComplete ? new Date().toISOString() : null,
          });
      }

      // Unlock next level if current is complete
      if (isLevelComplete && levelId < LEARNING_LEVELS.length) {
        const nextLevel = LEARNING_LEVELS.find(l => l.id === levelId + 1);
        if (nextLevel) {
          const { data: existingNextLevel } = await supabase
            .from('user_level_progress')
            .select('id')
            .eq('user_id', user.id)
            .eq('level_id', nextLevel.id)
            .maybeSingle();

          if (existingNextLevel) {
            await supabase
              .from('user_level_progress')
              .update({ is_unlocked: true })
              .eq('id', existingNextLevel.id);
          } else {
            await supabase
              .from('user_level_progress')
              .insert({
                user_id: user.id,
                level_id: nextLevel.id,
                gestures_completed: 0,
                total_gestures: nextLevel.gestures.length,
                is_unlocked: true,
              });
          }
        }
      }

      // Reload progress
      await loadProgress();
    } catch (error) {
      console.error('Error updating level progress:', error);
    }
  }, [user?.id, gestureProgress, loadProgress]);

  const getGestureProgress = useCallback((levelId: number, gestureId: string): GestureProgress | undefined => {
    return gestureProgress.get(`${levelId}_${gestureId}`);
  }, [gestureProgress]);

  const getLevelProgress = useCallback((levelId: number): LevelProgress | undefined => {
    return levelProgress.get(levelId);
  }, [levelProgress]);

  const getTotalProgress = useCallback(() => {
    let totalCompleted = 0;
    let totalGestures = 0;

    LEARNING_LEVELS.forEach(level => {
      totalGestures += level.gestures.length;
      level.gestures.forEach(gesture => {
        if (gestureProgress.get(`${level.id}_${gesture.id}`)?.completed) {
          totalCompleted++;
        }
      });
    });

    return {
      completed: totalCompleted,
      total: totalGestures,
      percentage: totalGestures > 0 ? Math.round((totalCompleted / totalGestures) * 100) : 0,
    };
  }, [gestureProgress]);

  return {
    gestureProgress,
    levelProgress,
    isLoading,
    updateGestureProgress,
    getGestureProgress,
    getLevelProgress,
    getTotalProgress,
    loadProgress,
  };
}
