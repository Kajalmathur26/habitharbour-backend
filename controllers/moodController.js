const supabase = require('../config/supabase');

// GET /api/mood
const getMoods = async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    let query = supabase
      .from('mood_logs')
      .select('*')
      .eq('user_id', req.user.id)
      .order('log_date', { ascending: false });

    if (start_date) query = query.gte('log_date', start_date);
    if (end_date) query = query.lte('log_date', end_date);

    const { data, error } = await query;
    if (error) throw error;
    res.json({ moods: data });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch moods' });
  }
};

// POST /api/mood
const logMood = async (req, res) => {
  try {
    const { mood_score, mood_label, notes, emotions, log_date } = req.body;
    if (!mood_score) return res.status(400).json({ error: 'Mood score required' });

    const date = log_date || new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('mood_logs')
      .upsert([{
        user_id: req.user.id,
        mood_score,
        mood_label,
        notes,
        emotions: emotions || [],
        log_date: date
      }], { onConflict: 'user_id,log_date' })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ mood: data });
  } catch (error) {
    res.status(500).json({ error: 'Failed to log mood' });
  }
};

// GET /api/mood/stats
const getMoodStats = async (req, res) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data, error } = await supabase
      .from('mood_logs')
      .select('mood_score, mood_label, log_date')
      .eq('user_id', req.user.id)
      .gte('log_date', thirtyDaysAgo.toISOString().split('T')[0])
      .order('log_date');

    if (error) throw error;

    const avg = data.length ? data.reduce((s, m) => s + m.mood_score, 0) / data.length : 0;
    const distribution = data.reduce((acc, m) => {
      acc[m.mood_label] = (acc[m.mood_label] || 0) + 1;
      return acc;
    }, {});

    res.json({ moods: data, average: Math.round(avg * 10) / 10, distribution, total: data.length });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get mood stats' });
  }
};

// PUT /api/mood/:id  → Update a mood log
const updateMood = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const updates = { ...req.body };
    delete updates.user_id; // prevent updating user_id

    const { data, error } = await supabase
      .from('mood_logs')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/mood/trend?days=7|30 → Get mood trend for past N days
const getMoodTrend = async (req, res) => {
  try {
    const userId = req.user.id;
    const days = parseInt(req.query.days) || 7;

    const since = new Date();
    since.setDate(since.getDate() - days + 1);
    const sinceStr = since.toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('mood_logs')
      .select('mood_score, emotions, log_date, notes')
      .eq('user_id', userId)
      .gte('log_date', sinceStr)
      .order('log_date');

    if (error) throw error;

    // Fill missing dates with null entries
    const trend = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const entry = data.find(m => m.log_date === dateStr);
      trend.push({
        date: dateStr,
        label: d.toLocaleDateString('default', { month: 'short', day: 'numeric' }),
        score: entry?.mood_score ?? null,
        emotions: entry?.emotions ?? [],
        notes: entry?.notes ?? ''
      });
    }

    res.json({ success: true, data: trend });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { getMoods, logMood, getMoodStats, updateMood, getMoodTrend };