import React, { useState, useRef, useEffect } from 'react';
import { format, subDays, addDays } from 'date-fns';
import { Check, Plus, ChevronLeft, ChevronRight, Activity, CalendarDays, CheckCircle2, TrendingUp, Info, Timer, Play, Pause, Square, Maximize2, Minimize2 } from 'lucide-react';
import { useHabits } from './hooks/useHabits';
import { calculateDailyProductivity } from './utils/productivity';
import type { HabitType, Habit } from './models/types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';

function App() {
  const { habits, entries, addHabit, toggleHabitEntry, getEntriesForDate, deleteHabit } = useHabits();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedHabit, setSelectedHabit] = useState<Habit | null>(null);
  const systemTodayDate = new Date();
  const currentYearNumber = systemTodayDate.getFullYear();
  const [selectedActivityYear, setSelectedActivityYear] = useState<number>(currentYearNumber);

  // Timer state
  const [timerHabitId, setTimerHabitId] = useState<string | null>(null);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Refs always hold the LATEST values — prevents stale closure in stopAndSaveTimer
  const timerSecondsRef = useRef(0);
  const timerHabitIdRef = useRef<string | null>(null);
  const timerDateRef = useRef<string>('');

  const activityScrollRef = useRef<HTMLDivElement>(null);

  // Draggable timer
  const [timerPos, setTimerPos] = useState({ right: 32, bottom: 32 });
  const [isTimerExpanded, setIsTimerExpanded] = useState(false);
  const dragStartRef = useRef<{ mouseX: number; mouseY: number; right: number; bottom: number } | null>(null);

  const onTimerDragStart = (e: React.MouseEvent) => {
    e.preventDefault();
    dragStartRef.current = { mouseX: e.clientX, mouseY: e.clientY, right: timerPos.right, bottom: timerPos.bottom };
    const onMove = (ev: MouseEvent) => {
      if (!dragStartRef.current) return;
      const dx = ev.clientX - dragStartRef.current.mouseX;
      const dy = ev.clientY - dragStartRef.current.mouseY;
      setTimerPos({
        right: Math.max(0, dragStartRef.current.right - dx),
        bottom: Math.max(0, dragStartRef.current.bottom - dy),
      });
    };
    const onUp = () => {
      dragStartRef.current = null;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  useEffect(() => {
    if (activityScrollRef.current) {
      activityScrollRef.current.scrollLeft = activityScrollRef.current.scrollWidth;
    }
  });

  // Timer interval
  useEffect(() => {
    if (timerRunning) {
      timerRef.current = setInterval(() => {
        timerSecondsRef.current += 1;
        setTimerSeconds(timerSecondsRef.current);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [timerRunning]);

  const startTimer = (habitId: string) => {
    // Always start fresh from 0 for each new session
    timerSecondsRef.current = 0;
    setTimerSeconds(0);
    timerHabitIdRef.current = habitId;
    timerDateRef.current = format(currentDate, 'yyyy-MM-dd');
    setTimerHabitId(habitId);
    setTimerRunning(true);
  };

  const stopAndSaveTimer = () => {
    setTimerRunning(false);
    if (timerRef.current) clearInterval(timerRef.current);

    const savedHabitId = timerHabitIdRef.current;
    const savedSeconds = timerSecondsRef.current;
    const savedDate = timerDateRef.current;

    if (savedHabitId && savedSeconds > 0) {
      const habit = habits.find(h => h.id === savedHabitId);
      // Read existing entry synchronously from entries state
      const existingEntry = entries.find(e => e.habitId === savedHabitId && e.date === savedDate);
      const prevValue = existingEntry?.value || 0;
      const addedHours = savedSeconds / 3600;
      const newValue = Math.round((prevValue + addedHours) * 100) / 100;
      toggleHabitEntry(savedHabitId, savedDate, undefined, newValue);
      if (habit) window.alert(`✅ Added ${(savedSeconds / 60).toFixed(1)} min to "${habit.name}" → Total: ${newValue.toFixed(2)} hrs`);
    }

    // Reset refs and state
    timerHabitIdRef.current = null;
    timerSecondsRef.current = 0;
    timerDateRef.current = '';
    setTimerHabitId(null);
    setTimerSeconds(0);
  };

  const formatTimer = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  };

  const formatHoursMinutes = (decimalHours: number) => {
    const totalMins = Math.round(decimalHours * 60);
    const h = Math.floor(totalMins / 60);
    const m = totalMins % 60;
    if (h > 0 && m > 0) return `${h}h ${m}m`;
    if (h > 0) return `${h}h`;
    return `${m}m`;
  };

  const timerHabit = habits.find(h => h.id === timerHabitId);


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

  // Monthly consistency: last 12 months, average daily completion %
  const monthlyReviewData = Array.from({ length: 12 }).map((_, i) => {
    const monthDate = new Date(systemTodayDate.getFullYear(), systemTodayDate.getMonth() - (11 - i), 1);
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    let totalScore = 0;
    let countedDays = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      const dStr = format(new Date(year, month, d), 'yyyy-MM-dd');
      if (dStr > format(systemTodayDate, 'yyyy-MM-dd')) break;
      if (habits.length > 0) {
        totalScore += calculateDayScore(dStr);
        countedDays++;
      }
    }
    const avg = countedDays > 0 ? Math.round((totalScore / countedDays) * 100) : 0;
    return { name: format(monthDate, 'MMM'), pct: avg };
  });


  const systemToday = new Date();
  
  let activityEndDate = systemToday;
  if (selectedActivityYear !== currentYearNumber) {
    activityEndDate = new Date(selectedActivityYear, 11, 31); // Dec 31
  }

  const endWeekday = activityEndDate.getDay(); // 0-6
  const totalDays = (52 * 7) + (endWeekday + 1); // Exact days to start on 52 weeks ago Sunday

  const activityData = Array.from({ length: totalDays }).map((_, i) => {
    const d = subDays(activityEndDate, totalDays - 1 - i);
    const dStr = format(d, 'yyyy-MM-dd');
    const ratio = calculateDayScore(dStr);
    let level = 0;
    if (ratio > 0 && ratio < 0.4) level = 1;
    else if (ratio >= 0.4 && ratio < 0.75) level = 2;
    else if (ratio >= 0.75) level = 3;
    return { date: dStr, level, ratio, isPadding: false };
  });

  for(let i = endWeekday + 1; i < 7; i++) {
    activityData.push({ date: '', level: 0, ratio: 0, isPadding: true });
  }

  const getColorForLevel = (level: number) => {
    if (level === 1) return 'rgba(76, 175, 80, 0.3)';
    if (level === 2) return 'rgba(76, 175, 80, 0.6)';
    if (level === 3) return 'rgba(76, 175, 80, 1)';
    return 'var(--border-color)';
  };

  const calculateStreak = (habitId: string) => {
    let streak = 0;
    for (let i = 0; i < 365; i++) {
       const dStr = format(subDays(systemToday, i), 'yyyy-MM-dd');
       const entry = entries.find(e => e.habitId === habitId && e.date === dStr);
       const h = habits.find(h => h.id === habitId);
       if (!h) break;

       let isCompleted = false;
       if (h.type === 'YES_NO') {
         isCompleted = entry?.completed || false;
       } else {
         isCompleted = (entry?.value && h.target) ? entry.value >= h.target : false;
       }

       if (isCompleted) {
         streak++;
       } else {
         // If it's today, we don't break the active streak if it's incomplete (user might do it later today)
         if (i === 0) continue; 
         break;
       }
    }
    return streak;
  };

  return (
    <div className="app-container">
      <header>
        <h1>Dincharya</h1>
      </header>

      <div className="dashboard-grid">
        <div className="dashboard-main">
          <div style={{ display: 'flex', gap: '0.75rem', height: '140px', marginBottom: '0.5rem', flexShrink: 0 }}>
             <div className="glass-panel" style={{ flex: 1, margin: 0, padding: '0.75rem', display: 'flex', flexDirection: 'column' }}>
                <h3 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', margin: 0 }}>Completion Distribution</h3>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: '0.5rem' }}>
                  <PieChart width={90} height={90}>
                    <Pie data={pieData} dataKey="value" cx="50%" cy="50%" innerRadius={30} outerRadius={45} stroke="none">
                      {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </div>
             </div>
             <div className="glass-panel" style={{ flex: 1, margin: 0, padding: '0.75rem', display: 'flex', flexDirection: 'column' }}>
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

          <div className="header-flex" style={{ marginBottom: '0.5rem', flexShrink: 0 }}>
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
                      {habit.type === 'YES_NO' ? (
                        <button
                          className={`toggle-btn ${entry?.completed ? 'completed' : ''}`}
                          onClick={() => toggleHabitEntry(habit.id, dateString)}
                        >
                          <Check size={18} />
                        </button>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{
                              fontSize: '0.85rem', fontWeight: 700,
                              color: entry?.value ? 'var(--primary)' : 'var(--text-secondary)',
                              minWidth: '52px', textAlign: 'right',
                            }}>
                              {formatHoursMinutes(entry?.value || 0)}
                            </span>
                          <button
                            title="Start Timer"
                            onClick={() => {
                              if (timerHabitId === habit.id && timerRunning) {
                                setTimerRunning(false);
                              } else {
                                startTimer(habit.id);
                              }
                            }}
                            style={{
                              width: '32px', height: '32px', borderRadius: '50%',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              background: timerHabitId === habit.id && timerRunning
                                ? 'rgba(255,152,0,0.2)' : 'rgba(76,175,80,0.15)',
                              color: timerHabitId === habit.id && timerRunning
                                ? '#FF9800' : 'var(--primary)',
                              border: '1px solid currentColor',
                              cursor: 'pointer',
                              flexShrink: 0,
                            }}
                          >
                            {timerHabitId === habit.id && timerRunning
                              ? <Pause size={14} />
                              : <Timer size={14} />}
                          </button>
                        </div>
                      )}
                      <button
                        className="btn-icon"
                        title="View Details"
                        onClick={() => setSelectedHabit(habit)}
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        <Info size={20} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="glass-panel" style={{ marginTop: 'auto', marginBottom: 0, padding: '0.75rem', flexShrink: 0 }}>
            <div className="header-flex" style={{ marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <h3 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', margin: 0 }}>Activity</h3>
                <select 
                  value={selectedActivityYear} 
                  onChange={e => setSelectedActivityYear(parseInt(e.target.value))}
                  style={{ background: 'var(--bg-color)', color: 'var(--primary)', border: '1px solid var(--border-color)', borderRadius: '4px', fontSize: '0.8rem', outline: 'none', cursor: 'pointer', padding: '2px 4px' }}
                >
                  <option value={currentYearNumber}>{currentYearNumber}</option>
                  <option value={currentYearNumber - 1}>{currentYearNumber - 1}</option>
                  <option value={currentYearNumber - 2}>{currentYearNumber - 2}</option>
                  <option value={currentYearNumber - 3}>{currentYearNumber - 3}</option>
                </select>
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', opacity: 0.8 }}>365 Days</span>
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
              <div ref={activityScrollRef} style={{ position: 'relative', overflowX: 'auto', paddingBottom: '0.5rem', flex: 1, scrollBehavior: 'smooth' }}>
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
                  <XAxis dataKey="name" stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} interval={0} />
                  <Tooltip cursor={{fill: 'rgba(0,0,0,0.05)'}} contentStyle={{ borderRadius: '12px', background: 'var(--surface-color)', border: 'none' }} />
                  <Line type="monotone" dataKey="score" stroke="var(--primary)" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="glass-panel">
            <h3 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.2rem', textAlign: 'center' }}>Monthly Review</h3>
            <p style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', opacity: 0.55, textAlign: 'center', marginBottom: '0.75rem', margin: '0 0 0.75rem' }}>Avg daily completion % — last 12 months</p>
            <div style={{ height: '140px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyReviewData} barSize={12}>
                  <XAxis dataKey="name" stroke="var(--text-secondary)" fontSize={9} tickLine={false} axisLine={false} interval={0} />
                  <YAxis domain={[0, 100]} hide />
                  <Tooltip
                    cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                    contentStyle={{ borderRadius: '8px', background: 'var(--surface-color)', border: 'none', fontSize: '0.75rem' }}
                    formatter={(val: unknown) => [`${val}%`, 'Completion']}
                  />
                  <Bar dataKey="pct" radius={[4, 4, 0, 0]}>
                    {monthlyReviewData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={
                          entry.pct >= 70 ? 'var(--primary)' :
                          entry.pct >= 40 ? '#FF9800' :
                          entry.pct > 0  ? '#F44336' :
                          'rgba(255,255,255,0.08)'
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div style={{ display: 'flex', gap: '0.6rem', justifyContent: 'center', marginTop: '0.5rem', fontSize: '0.62rem', color: 'var(--text-secondary)', flexWrap: 'wrap' }}>
              <span>🟢 ≥70% Consistent</span>
              <span>🟠 40–69% Mid</span>
              <span>🔴 &lt;40% Low</span>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Timer Panel */}
      {timerHabitId && (
        <div style={{
          position: 'fixed',
          bottom: timerPos.bottom,
          right: timerPos.right,
          background: 'var(--surface-color)', backdropFilter: 'blur(20px)',
          border: '1px solid var(--border-color)', borderRadius: '16px',
          padding: '1.25rem 1.5rem', boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          minWidth: '260px', zIndex: 999,
          display: 'flex', flexDirection: 'column', gap: '0.75rem',
          userSelect: 'none',
        }}>
          <div
            onMouseDown={onTimerDragStart}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem', cursor: 'grab' }}
          >
            <Timer size={16} style={{ color: 'var(--primary)' }} />
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>TIMER</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', opacity: 0.7, marginLeft: 'auto', maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {timerHabit?.name}
            </span>
            <button
              onMouseDown={e => e.stopPropagation()}
              onClick={() => setIsTimerExpanded(v => !v)}
              title="Focus Mode"
              style={{ marginLeft: '4px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary)', display: 'flex', padding: '2px' }}
            >
              <Maximize2 size={14} />
            </button>
          </div>

          <div style={{ fontFamily: 'monospace', fontSize: '2rem', fontWeight: 700, textAlign: 'center',
            color: timerRunning ? 'var(--primary)' : 'var(--text-secondary)',
            letterSpacing: '0.1em',
          }}>
            {formatTimer(timerSeconds)}
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={() => setTimerRunning(r => !r)}
              style={{
                flex: 1, padding: '0.6rem', borderRadius: '10px', border: 'none', cursor: 'pointer',
                background: timerRunning ? 'rgba(255,152,0,0.15)' : 'rgba(76,175,80,0.15)',
                color: timerRunning ? '#FF9800' : 'var(--primary)',
                fontWeight: 600, fontSize: '0.85rem',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
              }}
            >
              {timerRunning ? <><Pause size={14}/> Pause</> : <><Play size={14}/> Resume</>}
            </button>
            <button
              onClick={stopAndSaveTimer}
              style={{
                flex: 1, padding: '0.6rem', borderRadius: '10px', border: 'none', cursor: 'pointer',
                background: 'rgba(244,67,54,0.12)', color: '#F44336',
                fontWeight: 600, fontSize: '0.85rem',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
              }}
            >
              <Square size={14}/> Save
            </button>
          </div>

          <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', opacity: 0.6, textAlign: 'center' }}>
            {(timerSeconds / 3600).toFixed(3)} hrs will be added on Save
          </div>
        </div>
      )}

      {/* Full-screen Focus Mode */}
      {timerHabitId && isTimerExpanded && (
        <div className="focus-overlay">
          <div className="focus-waves">
            <div className="wave wave1" />
            <div className="wave wave2" />
            <div className="wave wave3" />
          </div>
          <div style={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2rem' }}>
            <div style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.6)', letterSpacing: '0.3em', textTransform: 'uppercase', fontWeight: 600 }}>
              {timerHabit?.name}
            </div>
            <div style={{ fontFamily: 'monospace', fontSize: 'clamp(4rem, 12vw, 8rem)', fontWeight: 800, color: '#fff', letterSpacing: '0.05em' }}>
              {formatTimer(timerSeconds)}
            </div>
            <div style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.5)' }}>
              {(timerSeconds / 3600).toFixed(3)} hrs this session
            </div>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
              <button
                onClick={() => setTimerRunning(r => !r)}
                style={{
                  padding: '1rem 2.5rem', borderRadius: '50px', border: '2px solid rgba(255,255,255,0.3)',
                  background: timerRunning ? 'rgba(255,152,0,0.2)' : 'rgba(76,175,80,0.2)',
                  color: '#fff', fontWeight: 700, fontSize: '1.1rem', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: '0.5rem', backdropFilter: 'blur(10px)',
                }}
              >
                {timerRunning ? <><Pause size={20}/> Pause</> : <><Play size={20}/> Resume</>}
              </button>
              <button
                onClick={() => { stopAndSaveTimer(); setIsTimerExpanded(false); }}
                style={{
                  padding: '1rem 2.5rem', borderRadius: '50px', border: '2px solid rgba(244,67,54,0.5)',
                  background: 'rgba(244,67,54,0.2)', color: '#fff', fontWeight: 700, fontSize: '1.1rem', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: '0.5rem', backdropFilter: 'blur(10px)',
                }}
              >
                <Square size={20}/> Save & Exit
              </button>
            </div>
            <button
              onClick={() => setIsTimerExpanded(false)}
              style={{ marginTop: '1rem', background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.9rem' }}
            >
              <Minimize2 size={16} /> Collapse
            </button>
          </div>
        </div>
      )}

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
              <label>Current Streak</label>
              <div className="form-input" style={{ background: 'var(--bg-color)', color: 'var(--primary)', fontWeight: 'bold' }}>
                🔥 {calculateStreak(selectedHabit.id)} Days
              </div>
            </div>

            <div className="form-group">
              <label>Created On</label>
              <div className="form-input" style={{ background: 'var(--bg-color)' }}>{format(new Date(selectedHabit.createdAt), 'MMM dd, yyyy')}</div>
            </div>

            <div className="header-flex" style={{ marginTop: '2rem' }}>
              <button 
                type="button" 
                className="btn-secondary" 
                style={{ width: '100%', background: 'rgba(244, 67, 54, 0.1)', color: '#F44336', border: '1px solid rgba(244, 67, 54, 0.3)', marginRight: '1rem' }}
                onClick={() => {
                  if (window.confirm('Are you certain you want to delete this habit and all its history?')) {
                    deleteHabit(selectedHabit.id);
                    setSelectedHabit(null);
                  }
                }}
              >
                Delete Habit
              </button>
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
