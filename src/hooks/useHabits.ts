import { useState, useEffect } from 'react';
import type { Habit, HabitEntry } from '../models/types';
import { v4 as uuidv4 } from 'uuid';

const HABITS_KEY = 'dincharya_habits';
const ENTRIES_KEY = 'dincharya_entries';

export function useHabits() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [entries, setEntries] = useState<HabitEntry[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Load from LocalStorage
    const storedHabits = localStorage.getItem(HABITS_KEY);
    const storedEntries = localStorage.getItem(ENTRIES_KEY);

    if (storedHabits) setHabits(JSON.parse(storedHabits));
    if (storedEntries) setEntries(JSON.parse(storedEntries));
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(HABITS_KEY, JSON.stringify(habits));
      localStorage.setItem(ENTRIES_KEY, JSON.stringify(entries));
    }
  }, [habits, entries, isLoaded]);

  const addHabit = (habitData: Omit<Habit, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newHabit: Habit = {
      ...habitData,
      id: uuidv4(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setHabits((prev) => [...prev, newHabit]);
  };

  const updateHabit = (id: string, habitData: Partial<Habit>) => {
    setHabits((prev) =>
      prev.map((h) => (h.id === id ? { ...h, ...habitData, updatedAt: new Date().toISOString() } : h))
    );
  };

  const deleteHabit = (id: string) => {
    setHabits((prev) => prev.filter((h) => h.id !== id));
    // Also delete associated entries
    setEntries((prev) => prev.filter((e) => e.habitId !== id));
  };

  const toggleHabitEntry = (habitId: string, date: string, completed?: boolean, value?: number) => {
    setEntries((prev) => {
      const existingEntryIndex = prev.findIndex((e) => e.habitId === habitId && e.date === date);
      
      // Get habit from current habits state
      const habit = habits.find(h => h.id === habitId);
      const isYesNo = habit?.type === 'YES_NO';

      if (existingEntryIndex >= 0) {
        // Update existing entry
        const updatedEntries = [...prev];
        const entry = updatedEntries[existingEntryIndex];
        
        if (isYesNo && completed === undefined) {
          // Toggle if not explicitly set
          updatedEntries[existingEntryIndex] = {
            ...entry,
            completed: !entry.completed,
            updatedAt: new Date().toISOString(),
          };
        } else {
          updatedEntries[existingEntryIndex] = {
            ...entry,
            completed: completed ?? entry.completed,
            value: value ?? entry.value,
            updatedAt: new Date().toISOString(),
          };
        }
        return updatedEntries;
      } else {
        // Create new entry
        const newEntry: HabitEntry = {
          id: uuidv4(),
          habitId,
          date,
          completed: completed ?? (isYesNo ? true : false),
          value,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        return [...prev, newEntry];
      }
    });
  };

  const getEntriesForDate = (date: string) => {
    return entries.filter((e) => e.date === date);
  };

  return {
    habits,
    entries,
    addHabit,
    updateHabit,
    deleteHabit,
    toggleHabitEntry,
    getEntriesForDate,
  };
}
