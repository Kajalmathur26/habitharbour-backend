const { supabase } = require('../config/supabase');

exports.getDashboardData = async (req, res) => {
  const userId = req.user.id;

  try {
    // Parallel fetch everything — never sequential awaits for independent queries
    const [
      tasksRes,
      habitsRes,
      habitLogsRes,
      goalsRes,
      moodRes,
      journalRes,
      eventsRes,
      financeRes,
    ] = await Promise.all([
      supabase
        .from('tasks')
        .select('id, title, status, priority, due_date, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false }),

      supabase
        .from('habits')
        .select('id, name, frequency')
        .eq('user_id', userId),

      supabase
        .from('habit_logs')
        .select('habit_id, log_date, completed')
        .eq('user_id', userId)
        .gte('log_date', getDateDaysAgo(7)),

      supabase
        .from('goals')
        .select('id, title, targets, progress, status')
        .eq('user_id', userId),

      supabase
        .from('mood_logs')
        .select('mood_score, emotions, log_date')
        .eq('user_id', userId)
        .gte('log_date', getDateDaysAgo(30))
        .order('log_date'),

      supabase
        .from('journal_entries')
        .select('id, title, content, mood, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(5),

      supabase
        .from('events')
        .select('id, title, start_date, end_date, color')
        .eq('user_id', userId)
        .gte('start_date', new Date().toISOString())
        .order('start_date')
        .limit(5),

      supabase
        .from('finance_entries')
        .select('type, amount, entry_date, category')
        .eq('user_id', userId)
        .gte('entry_date', getDateDaysAgo(30))
        .order('entry_date'),
    ]);

    // ── Task stats ──────────────────────────────────────────────────────────
    const tasks = tasksRes.data || [];
    const taskDistribution = {
      todo: tasks.filter(t => t.status === 'todo').length,
      in_progress: tasks.filter(t => t.status === 'in_progress').length,
      done: tasks.filter(t => t.status === 'done').length,
      blocked: tasks.filter(t => t.status === 'blocked').length,
    };

    // Weekly task completion (last 7 days)
    const weeklyData = getLast7Days().map(date => ({
      day: new Date(date).toLocaleDateString('default', { weekday: 'short' }),
      completed: tasks.filter(t =>
        t.status === 'done' && t.due_date?.startsWith(date)
      ).length,
      added: tasks.filter(t => t.created_at?.startsWith(date)).length,
    }));

    // ── Habit stats ─────────────────────────────────────────────────────────
    const habits = habitsRes.data || [];
    const habitLogs = habitLogsRes.data || [];
    const today = new Date().toISOString().split('T')[0];

    const habitsCompletedToday = habitLogs.filter(
      l => l.log_date === today && l.completed
    ).length;

    // ── Goal stats ──────────────────────────────────────────────────────────
    const goals = goalsRes.data || [];
    const goalsData = goals.map(g => {
      const targets = Array.isArray(g.targets) ? g.targets : [];
      const pct = targets.length > 0
        ? Math.round(targets.filter(t => t.done).length / targets.length * 100)
        : g.progress || 0;
      return { ...g, completionPct: pct };
    });
    const avgGoalProgress = goalsData.length > 0
      ? Math.round(goalsData.reduce((s, g) => s + g.completionPct, 0) / goalsData.length)
      : 0;

    // ── Mood data ───────────────────────────────────────────────────────────
    const moods = moodRes.data || [];
    const moodData = getLast7Days().map(date => {
      const entry = moods.find(m => m.log_date === date);
      return {
        day: new Date(date).toLocaleDateString('default', { weekday: 'short' }),
        score: entry?.mood_score ?? null,
      };
    });
    const avgMood = moods.length > 0
      ? Math.round(moods.reduce((s, m) => s + m.mood_score, 0) / moods.length * 10) / 10
      : null;

    // ── Finance summary ─────────────────────────────────────────────────────
    const financeEntries = financeRes.data || [];
    const currentMonth = new Date().toISOString().slice(0, 7);
    const thisMonthFinance = financeEntries.filter(e =>
      e.entry_date?.startsWith(currentMonth)
    );
    const monthlyIncome = thisMonthFinance
      .filter(e => e.type === 'income')
      .reduce((s, e) => s + parseFloat(e.amount), 0);
    const monthlyExpense = thisMonthFinance
      .filter(e => e.type === 'expense')
      .reduce((s, e) => s + parseFloat(e.amount), 0);

    // ── Recent activities feed ──────────────────────────────────────────────
    const recentActivities = buildActivityFeed({
      tasks: tasks.slice(0, 3),
      journal: journalRes.data || [],
      moods: moods.slice(-3),
    });

    res.json({
      success: true,
      data: {
        // Summary cards
        stats: {
          totalTasks: tasks.length,
          tasksCompletedToday: taskDistribution.done,
          habitsTotal: habits.length,
          habitsCompletedToday,
          goalsTotal: goals.length,
          avgGoalProgress,
          avgMood,
          netBalance: monthlyIncome - monthlyExpense,
          monthlyIncome,
          monthlyExpense,
        },
        // Chart data
        weeklyData,
        moodData,
        taskDistribution: [
          { name: 'To Do', value: taskDistribution.todo, color: '#6366f1' },
          { name: 'In Progress', value: taskDistribution.in_progress, color: '#f59e0b' },
          { name: 'Done', value: taskDistribution.done, color: '#10b981' },
          { name: 'Blocked', value: taskDistribution.blocked, color: '#ef4444' },
        ],
        // Lists
        upcomingEvents: eventsRes.data || [],
        recentJournal: journalRes.data || [],
        recentActivities,
        goals: goalsData.slice(0, 4),
        // Finance
        finance: { monthlyIncome, monthlyExpense, netBalance: monthlyIncome - monthlyExpense },
      },
    });
  } catch (err) {
    console.error('Dashboard error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Helpers ────────────────────────────────────────────────────────────────
function getDateDaysAgo(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split('T')[0];
}

function getLast7Days() {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().split('T')[0];
  });
}

function buildActivityFeed({ tasks, journal, moods }) {
  const feed = [];

  tasks.forEach(t => {
    feed.push({
      type: 'task',
      icon: '✅',
      text: `Task "${t.title}" is ${t.status.replace('_', ' ')}`,
      time: t.created_at,
    });
  });

  journal.forEach(j => {
    feed.push({
      type: 'journal',
      icon: '📓',
      text: `New journal entry: "${j.title || 'Untitled'}"`,
      time: j.created_at,
    });
  });

  moods.forEach(m => {
    feed.push({
      type: 'mood',
      icon: getMoodEmoji(m.mood_score),
      text: `Logged mood: ${m.mood_score}/10`,
      time: m.log_date,
    });
  });

  return feed
    .sort((a, b) => new Date(b.time) - new Date(a.time))
    .slice(0, 8);
}

function getMoodEmoji(score) {
  if (score >= 9) return '🌟';
  if (score >= 7) return '😊';
  if (score >= 5) return '😐';
  if (score >= 3) return '😔';
  return '😢';
}