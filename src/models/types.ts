export type HabitType = 'YES_NO' | 'MEASUREMENT';
export type HabitFrequency = 'DAILY';

export interface Habit {
  id: string; // UUID
  name: string;
  description?: string;
  type: HabitType;
  unit?: string;
  frequency: HabitFrequency;
  target?: number; // for MEASUREMENT type
  color: string; // hex color for UI
  icon?: string; // emoji or icon name
  reminderEnabled: boolean;
  reminderTime?: string; // HH:mm format
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
}

export interface HabitEntry {
  id: string; // UUID
  habitId: string; // FK
  date: string; // YYYY-MM-DD
  completed: boolean;
  value?: number;
  note?: string; // optional user note
  createdAt: string;
  updatedAt: string;
}
