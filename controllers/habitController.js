const supabase = require('../config/supabase');

// Get all habits for the user
const getHabits = async (req, res) => {
  try {
    const { data: habits, error } = await supabase
      .from('habits')
      .select('*, habit_logs(*)')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: true });

    if (error) throw error;
    res.json({ habits });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch habits' });
  }
};

// Create a new habit
const createHabit = async (req, res) => {
  try {
    const { name, description, frequency, target_count, color, icon } = req.body;
    if (!name) return res.status(400).json({ error: 'Name required' });

    const { data, error } = await supabase
      .from('habits')
      .insert([{
        user_id: req.user.id,
        name,
        description,
        frequency: frequency || 'daily',
        target_count: target_count || 1,
        current_streak: 0,
        longest_streak: 0,
        color: color || '#8B5CF6',
        icon: icon || '⭐'
      }])
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ habit: data });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create habit' });
  }
};

// Log or toggle a habit
const logHabit = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const today = new Date().toISOString().split('T')[0];

    // Check if habit is already logged today
    const { data: existing } = await supabase
      .from('habit_logs')
      .select('id, completed')
      .eq('habit_id', id)
      .eq('user_id', userId)
      .eq('log_date', today)
      .maybeSingle();

    if (existing) {
      // Toggle completed status
      const { data, error } = await supabase
        .from('habit_logs')
        .update({ completed: !existing.completed })
        .eq('id', existing.id)
        .select()
        .single();
      if (error) throw error;

      // Update streaks after toggle
      await updateStreak(id);

      return res.json({ success: true, data, toggled: true });
    }

    // Create new log entry
    const { data, error } = await supabase
      .from('habit_logs')
      .insert([{ habit_id: id, user_id: userId, log_date: today, completed: true }])
      .select()
      .single();

    if (error) throw error;

    // Update streaks
    await updateStreak(id);

    res.status(201).json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Update streak for a habit
const updateStreak = async (habitId) => {
  try {
    const { data: logs } = await supabase
      .from('habit_logs')
      .select('log_date')
      .eq('habit_id', habitId)
      .eq('completed', true)
      .order('log_date', { ascending: false });

    if (!logs || logs.length === 0) return;

    let streak = 0;
    const today = new Date();
    let checkDate = new Date(today);

    for (const log of logs) {
      const logDate = new Date(log.log_date);
      const diff = Math.floor((checkDate - logDate) / (1000 * 60 * 60 * 24));
      if (diff <= 1) {
        streak++;
        checkDate = logDate;
      } else break;
    }

    const { data: habit } = await supabase.from('habits').select('longest_streak').eq('id', habitId).single();
    await supabase.from('habits').update({
      current_streak: streak,
      longest_streak: Math.max(streak, habit?.longest_streak || 0)
    }).eq('id', habitId);
  } catch (e) {
    console.error('Error updating streak:', e);
  }
};

// Update habit details
const updateHabit = async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('habits')
      .update(req.body)
      .eq('id', id)
      .eq('user_id', req.user.id)
      .select()
      .single();

    if (error) throw error;
    res.json({ habit: data });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update habit' });
  }
};

// Delete habit and its logs
const deleteHabit = async (req, res) => {
  try {
    const { id } = req.params;
    await supabase.from('habit_logs').delete().eq('habit_id', id);
    const { error } = await supabase.from('habits').delete().eq('id', id).eq('user_id', req.user.id);
    if (error) throw error;
    res.json({ message: 'Habit deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete habit' });
  }
};

module.exports = { getHabits, createHabit, logHabit, updateHabit, deleteHabit };