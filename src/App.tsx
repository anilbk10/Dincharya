import React, { useState } from 'react';
import { format, subDays, addDays } from 'date-fns';
import { Check, Plus, ChevronLeft, ChevronRight, Activity, CalendarDays, CheckCircle2, TrendingUp, Info } from 'lucide-react';
import { useHabits } from './hooks/useHabits';
import { calculateDailyProductivity } from './utils/productivity';
import type { HabitType, Habit } from './models/types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';

function App() {
  const { habits, entries, addHabit, toggleHabitEntry, getEntriesForDate } = useHabits();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedHabit, setSelectedHabit] = useState<Habit | null>(null);

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

  const pieData = [
    { name: 'Completed', value: completedCount, color: '#4CAF50' },
    { name: 'Pending', value: habits.length > 0 ? habits.length - completedCount : 1, color: 'rgba(0,0,0,0.1)' }
  ];

  const weeklyTrendData = Array.from({ length: 7 }).map((_, i) => {
    const d = subDays(currentDate, 6 - i);
    const dStr = format(d, 'yyyy-MM-dd');
    const p = calculateDailyProductivity(habits, entries, dStr);
    let scoreNum = 0;
    if (p === 'Productive') scoreNum = 3;
    else if (p === 'Mid') scoreNum = 2;
    else if (p === 'Unproductive') scoreNum = 1;
    return { name: format(d, 'eee'), score: scoreNum };
  });

  const calculateDayScore = (dStr: string) => {
    if (habits.length === 0) return 0;
    let score = 0;
    habits.forEach(h => {
      const e = entries.find(x => x.habitId === h.id && x.date === dStr);
      if (h.type === 'YES_NO') {
        if (e?.completed) score += 1;
      } else {
        if (e?.value && h.target) score += Math.min(1, e.value / h.target);
      }
    });
    return score / habits.length;
  };

  const todayWeekday = currentDate.getDay(); // 0-6
  const totalDays = (52 * 7) + (todayWeekday + 1); // Exact days to start on 52 weeks ago Sunday

  const activityData = Array.from({ length: totalDays }).map((_, i) => {
    const d = subDays(currentDate, totalDays - 1 - i);
    const dStr = format(d, 'yyyy-MM-dd');
    const ratio = calculateDayScore(dStr);
    let level = 0;
    if (ratio > 0 && ratio < 0.4) level = 1;
    else if (ratio >= 0.4 && ratio < 0.75) level = 2;
    else if (ratio >= 0.75) level = 3;
    return { date: dStr, level, ratio, isPadding: false };
  });

  for(let i = todayWeekday + 1; i < 7; i++) {
    activityData.push({ date: '', level: 0, ratio: 0, isPadding: true });
  }

  const getColorForLevel = (level: number) => {
    if (level === 1) return 'rgba(76, 175, 80, 0.3)';
    if (level === 2) return 'rgba(76, 175, 80, 0.6)';
    if (level === 3) return 'rgba(76, 175, 80, 1)';
    return 'var(--border-color)';
  };

  return (
    <div className="app-container">
      <header>
        <h1>Dincharya Dashboard</h1>
      </header>

      <div className="dashboard-grid">
        <div className="dashboard-sidebar">
          <div className="date-nav glass-panel" style={{ padding: '1rem', marginBottom: '0' }}>
            <button className="btn-icon" onClick={handlePrevDay}><ChevronLeft /></button>
            <div style={{ fontSize: '1.25rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CalendarDays size={20} /> {displayDate}
            </div>
            <button className="btn-icon" onClick={handleNextDay}><ChevronRight /></button>
          </div>

          <div className="glass-panel" style={{ display: 'flex', gap: '1rem' }}>
            <div style={{ flex: 1, textAlign: 'center' }}>
              <Activity size={24} style={{ color: 'var(--secondary)' }} />
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>Productivity</div>
              <div className={`productivity-score score-${productivity.split(' ')[0]}`}>{productivity}</div>
            </div>
            <div style={{ flex: 1, textAlign: 'center' }}>
              <TrendingUp size={24} style={{ color: 'var(--primary)' }} />
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>Score</div>
              <div className="productivity-score">{habits.length > 0 ? Math.round((completedCount/habits.length)*100) : 0}%</div>
            </div>
          </div>
          
          <div className="glass-panel">
            <h3 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1rem', textAlign: 'center' }}>Weekly Trend</h3>
            <div className="chart-container" style={{ margin: 0 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={weeklyTrendData}>
                  <XAxis dataKey="name" stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip cursor={{fill: 'rgba(0,0,0,0.05)'}} contentStyle={{ borderRadius: '12px', background: 'var(--surface-color)', border: 'none' }} />
                  <Line type="monotone" dataKey="score" stroke="var(--primary)" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="dashboard-main">
          <div style={{ display: 'flex', gap: '1rem', height: '160px', marginBottom: '1rem' }}>
             <div className="glass-panel" style={{ flex: 1, margin: 0, padding: '1rem', display: 'flex', flexDirection: 'column' }}>
                <h3 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', margin: 0 }}>Completion Distribution</h3>
                <div style={{ flex: 1 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieData} dataKey="value" innerRadius="60%" outerRadius="90%" stroke="none">
                        {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
             </div>
             <div className="glass-panel" style={{ flex: 1, margin: 0, padding: '1rem', display: 'flex', flexDirection: 'column' }}>
                <h3 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', margin: 0 }}>Progress Bar</h3>
                <div style={{ flex: 1, marginTop: '1rem' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} layout="vertical">
                      <XAxis type="number" hide />
                      <YAxis dataKey="name" type="category" width={80} stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} />
                      <Tooltip cursor={{fill: 'transparent'}} contentStyle={{ borderRadius: '8px', background: 'var(--surface-color)' }} />
                      <Bar dataKey="value" fill="var(--primary)" radius={[4, 4, 4, 4]} barSize={20} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
             </div>
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
              <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
                <TrendingUp size={64} style={{ color: 'var(--border-color)', marginBottom: '1rem' }} />
                <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>No habits created yet. Start building your routine!</p>
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
                          {habit.type === 'MEASUREMENT' ? `Target: ${habit.target} ${habit.unit || ''}` : 'Daily Completion'}
                        </div>
                      </div>
                    </div>

                    <div className="habit-actions">
                      <button 
                        className="btn-icon" 
                        title="View Details" 
                        onClick={() => setSelectedHabit(habit)}
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        <Info size={20} />
                      </button>
                      
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

          <div className="glass-panel" style={{ marginTop: '1rem', padding: '1rem' }}>
            <div className="header-flex" style={{ marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', margin: 0 }}>Activity History (Last Year)</h3>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', opacity: 0.8 }}>365 Days • {format(new Date(), 'yyyy')}</span>
            </div>
            <div style={{ display: 'flex' }}>
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', paddingRight: '8px', fontSize: '0.65rem', color: 'var(--text-secondary)', paddingTop: '18px', paddingBottom: '8px' }}>
                <span style={{ opacity: 0 }}>S</span>
                <span>Mon</span>
                <span style={{ opacity: 0 }}>T</span>
                <span>Wed</span>
                <span style={{ opacity: 0 }}>T</span>
                <span>Fri</span>
                <span style={{ opacity: 0 }}>S</span>
              </div>
              <div style={{ position: 'relative', overflowX: 'auto', paddingBottom: '0.5rem', flex: 1 }}>
                <div style={{ display: 'flex', gap: '3px', marginBottom: '4px' }}>
                  {Array.from({ length: 53 }).map((_, c) => {
                    const firstDayOfCol = activityData[c * 7];
                    const monthName = firstDayOfCol && !firstDayOfCol.isPadding ? format(new Date(firstDayOfCol.date), 'MMM') : '';
                    const prevFirstDayOfCol = c > 0 ? activityData[(c - 1) * 7] : null;
                    const prevMonthName = prevFirstDayOfCol && !prevFirstDayOfCol.isPadding ? format(new Date(prevFirstDayOfCol.date), 'MMM') : '';
                    
                    return (
                      <div 
                        key={c} 
                        style={{ 
                          width: '11px', 
                          flexShrink: 0,
                          fontSize: '0.65rem', 
                          color: 'var(--text-secondary)',
                          overflow: 'visible',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {c === 0 || monthName !== prevMonthName ? monthName : ''}
                      </div>
                    );
                  })}
                </div>
                <div style={{ display: 'grid', gridTemplateRows: 'repeat(7, 11px)', gridAutoFlow: 'column', gap: '3px' }}>
                  {activityData.map((d, i) => (
                    <div 
                      key={i} 
                      title={d.isPadding ? '' : `${d.date}: ${Math.round(d.ratio * 100)}% completed`}
                      style={{ 
                        width: '11px', 
                        height: '11px', 
                        borderRadius: '2px', 
                        background: d.isPadding ? 'transparent' : getColorForLevel(d.level),
                        border: d.isPadding ? 'none' : '' 
                      }} 
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
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

      {selectedHabit && (
        <div className="modal-overlay" onClick={() => setSelectedHabit(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="header-flex" style={{ marginBottom: '1.5rem' }}>
              <h2>Habit Details</h2>
              <button className="btn-icon" onClick={() => setSelectedHabit(null)}><Plus size={24} style={{ transform: 'rotate(45deg)' }} /></button>
            </div>
            <div className="form-group">
              <label>Name</label>
              <div className="form-input" style={{ background: 'var(--bg-color)' }}>{selectedHabit.name}</div>
            </div>
            
            <div className="form-group">
              <label>Type</label>
              <div className="form-input" style={{ background: 'var(--bg-color)' }}>{selectedHabit.type === 'YES_NO' ? 'Yes/No (Completion)' : 'Measurement'}</div>
            </div>

            {selectedHabit.type === 'MEASUREMENT' && (
              <div className="form-group">
                <label>Target</label>
                <div className="form-input" style={{ background: 'var(--bg-color)' }}>{selectedHabit.target} {selectedHabit.unit || ''}</div>
              </div>
            )}

            <div className="form-group">
              <label>Created On</label>
              <div className="form-input" style={{ background: 'var(--bg-color)' }}>{format(new Date(selectedHabit.createdAt), 'MMM dd, yyyy')}</div>
            </div>

            <div style={{ marginTop: '2rem', textAlign: 'center' }}>
              <button 
                type="button" 
                className="btn-primary" 
                style={{ width: '100%' }}
                onClick={() => setSelectedHabit(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
