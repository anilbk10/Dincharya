import type { Habit, HabitEntry } from '../models/types';

export type ProductivityScore = 'Productive' | 'Mid' | 'Unproductive' | 'No Data';

export const calculateDailyProductivity = (
  habits: Habit[],
  entries: HabitEntry[],
  date: string
): ProductivityScore => {
  if (habits.length === 0) return 'No Data';

  let totalScore = 0;
  let maxPossibleScore = habits.length;

  habits.forEach((habit) => {
    const entry = entries.find((e) => e.habitId === habit.id && e.date === date);

    if (habit.type === 'YES_NO') {
      if (entry?.completed) {
        totalScore += 1;
      }
    } else if (habit.type === 'MEASUREMENT' && habit.target && habit.target > 0) {
      if (entry && entry.value !== undefined) {
        // Cap the score for a single habit at 1.0 (so someone can't get 500% productive by walking 50k steps)
        const completionRatio = Math.min(1.0, entry.value / habit.target);
        totalScore += completionRatio;
      }
    }
  });

  const percentage = maxPossibleScore > 0 ? (totalScore / maxPossibleScore) * 100 : 0;

  if (percentage >= 75) {
    return 'Productive';
  } else if (percentage >= 40) {
    return 'Mid';
  } else {
    return 'Unproductive';
  }
};
