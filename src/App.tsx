import React, { useState } from 'react';
import { format, subDays, addDays } from 'date-fns';
import { Check, Plus, ChevronLeft, ChevronRight, Activity, CalendarDays, CheckCircle2, TrendingUp } from 'lucide-react';
import { useHabits } from './hooks/useHabits';
import { calculateDailyProductivity } from './utils/productivity';
import type { HabitType } from './models/types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

function App() {
  const { habits, entries, addHabit, toggleHabitEntry, getEntriesForDate } = useHabits();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);

  const dateString = format(currentDate, 'yyyy-MM-dd');
  const displayDate = format(currentDate, 'MMM dd, yyyy');
  const todayEntries = getEntriesForDate(dateString);

  const productivity = calculateDailyProductivity(habits, entries, dateString);

  const handlePrevDay = () => setCurrentDate(subDays(currentDate, 1));
  const handleNextDay = () => setCurrentDate(addDays(currentDate, 1));

  // Modal State
  const [newHabitName, setNewHabitName] = useState('');
  const [newHabitType, setNewHabitType] = useState<HabitType>('YES_NO');
  const [newHabitTarget, setNewHabitTarget] = useState(0);

  const handleAddHabit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHabitName.trim()) return;

    addHabit({
      name: newHabitName,
      type: newHabitType,
      frequency: 'DAILY',
      target: newHabitType === 'MEASUREMENT' ? newHabitTarget : undefined,
      color: '#4CAF50', // default
      reminderEnabled: false,
    });
    setNewHabitName('');
    setNewHabitTarget(0);
    setIsModalOpen(false);
  };

  const completedCount = habits.filter(h => {
    const entry = todayEntries.find(e => e.habitId === h.id);
    if (!entry) return false;
    if (h.type === 'YES_NO') return entry.completed;
    return h.target && entry.value ? entry.value >= h.target : false;
  }).length;

  const chartData = [
    { name: 'Completed', value: completedCount },
    { name: 'Pending', value: habits.length - completedCount }
  ];

  return (
    <div className="app-container">
      <header>
        <h1>Dincharya</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Master your daily habits</p>
      </header>

      <div className="date-nav glass-panel">
        <button className="btn-icon" onClick={handlePrevDay}><ChevronLeft /></button>
        <div style={{ fontSize: '1.25rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CalendarDays size={20} /> {displayDate}
        </div>
        <button className="btn-icon" onClick={handleNextDay}><ChevronRight /></button>
      </div>

      <div className="glass-panel productivity-card">
        <Activity size={32} style={{ color: 'var(--secondary)' }} />
        <h3>Daily Productivity Prediction</h3>
        <div className={`productivity-score score-${productivity.split(' ')[0]}`}>
          {productivity}
        </div>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Based on your measurements and completions.</p>
        
        {habits.length > 0 && (
          <div className="chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <XAxis dataKey="name" stroke="var(--text-secondary)" />
                <YAxis stroke="var(--text-secondary)" />
                <Tooltip cursor={{fill: 'rgba(0,0,0,0.05)'}} contentStyle={{ borderRadius: '12px', background: 'var(--surface-color)', border: 'none' }} />
                <Bar dataKey="value" fill="var(--primary)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="header-flex" style={{ marginBottom: '1rem' }}>
        <h2>Today's Habits <span style={{ fontSize: '1rem', color: 'var(--text-secondary)', fontWeight: 400 }}>({completedCount}/{habits.length})</span></h2>
        <button className="btn-primary" onClick={() => setIsModalOpen(true)}>
          <Plus size={18} style={{ marginRight: '6px', verticalAlign: 'middle' }}/> 
          Add Habit
        </button>
      </div>

      <div className="habit-list">
        {habits.length === 0 ? (
          <div className="glass-panel" style={{ textAlign: 'center', padding: '3rem' }}>
            <TrendingUp size={48} style={{ color: 'var(--border-color)', marginBottom: '1rem' }} />
            <p style={{ color: 'var(--text-secondary)' }}>No habits created yet. Start building your routine!</p>
          </div>
        ) : (
          habits.map((habit) => {
            const entry = todayEntries.find((e) => e.habitId === habit.id);
            const isCompleted = habit.type === 'YES_NO' ? entry?.completed : (habit.target && entry?.value ? entry.value >= habit.target : false);

            return (
              <div key={habit.id} className="habit-card">
                <div className="habit-info">
                  <div className="habit-icon" style={{ background: `${habit.color}20`, color: habit.color }}>
                    {isCompleted ? <CheckCircle2 /> : <Activity />}
                  </div>
                  <div>
                    <div className="habit-title">{habit.name}</div>
                    <div className="habit-desc">
                      {habit.type === 'MEASUREMENT' && `Target: ${habit.target} ${habit.unit || ''}`}
                    </div>
                  </div>
                </div>

                <div className="habit-actions">
                  {habit.type === 'YES_NO' ? (
                    <button
                      className={`toggle-btn ${entry?.completed ? 'completed' : ''}`}
                      onClick={() => toggleHabitEntry(habit.id, dateString)}
                    >
                      <Check size={18} />
                    </button>
                  ) : (
                    <input
                      type="number"
                      className="measurement-input"
                      placeholder="0"
                      value={entry?.value || ''}
                      onChange={(e) => toggleHabitEntry(habit.id, dateString, undefined, parseFloat(e.target.value) || 0)}
                    />
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2 style={{ marginBottom: '1.5rem' }}>Create New Habit</h2>
            <form onSubmit={handleAddHabit}>
              <div className="form-group">
                <label>Habit Name</label>
                <input 
                  type="text" 
                  className="form-input" 
                  autoFocus
                  required
                  placeholder="e.g., Drink Water, Read Book" 
                  value={newHabitName} 
                  onChange={e => setNewHabitName(e.target.value)} 
                />
              </div>

              <div className="form-group">
                <label>Tracking Type</label>
                <select className="form-select" value={newHabitType} onChange={e => setNewHabitType(e.target.value as HabitType)}>
                  <option value="YES_NO">Yes / No (Completion)</option>
                  <option value="MEASUREMENT">Measurement (Numeric)</option>
                </select>
              </div>

              {newHabitType === 'MEASUREMENT' && (
                <div className="form-group">
                  <label>Daily Target</label>
                  <input 
                    type="number" 
                    className="form-input" 
                    required 
                    min="1"
                    value={newHabitTarget || ''} 
                    onChange={e => setNewHabitTarget(parseInt(e.target.value))} 
                  />
                </div>
              )}

              <div className="header-flex" style={{ marginTop: '2rem' }}>
                <button type="button" className="btn-secondary" style={{ background: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--border-color)' }} onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Save Habit</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
