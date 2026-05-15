import type { Habit, HabitEntry } from '../models/types';

export type ProductivityScore = 'Productive' | 'Mid' | 'Unproductive' | 'No Data';

const isHabitDoneForDate = (habit: Habit, entries: HabitEntry[], date: string): boolean => {
  const entry = entries.find((e) => e.habitId === habit.id && e.date === date);
  if (!entry) return false;

  if (habit.type === 'YES_NO') {
    return Boolean(entry.completed);
  }

  if (habit.type === 'MEASUREMENT' && habit.target && habit.target > 0) {
    return entry.value !== undefined && entry.value >= habit.target;
  }

  return false;
};

export const calculateDailyProductivity = (
  habits: Habit[],
  entries: HabitEntry[],
  date: string
): ProductivityScore => {
  if (habits.length === 0) return 'No Data';

  const completedCount = habits.filter((habit) =>
    isHabitDoneForDate(habit, entries, date)
  ).length;

  if (completedCount === habits.length) {
    return 'Productive';
  }
  if (completedCount > 0) {
    return 'Mid';
  }
  return 'Unproductive';
};
