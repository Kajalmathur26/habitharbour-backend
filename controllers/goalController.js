const supabase = require('../config/supabase');

const getGoals = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('goals')
      .select('*, goal_milestones(*)')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Compute sub-goal progress for each goal
    const goals = data.map(g => {
      const milestones = g.goal_milestones || [];
      const total = milestones.length;
      const completed = milestones.filter(m => m.completed).length;
      return {
        ...g,
        milestone_progress: total > 0 ? Math.round((completed / total) * 100) : null,
        milestone_count: total,
        milestone_completed: completed,
      };
    });

    res.json({ goals });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch goals' });
  }
};

const createGoal = async (req, res) => {
  try {
    const { title, description, category, target_date, target_value, unit } = req.body;
    if (!title) return res.status(400).json({ error: 'Title required' });

    const { data, error } = await supabase
      .from('goals')
      .insert([{
        user_id: req.user.id,
        title,
        description,
        category: category || 'personal',
        target_date: target_date ? target_date : null,
        target_value: target_value || 100,
        current_value: 0,
        unit: unit || '%',
        status: 'active'
      }])
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ goal: { ...data, goal_milestones: [], milestone_progress: null, milestone_count: 0, milestone_completed: 0 } });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create goal' });
  }
};

const updateGoal = async (req, res) => {
  try {
    const { id } = req.params;
    const safeUpdates = { ...req.body, updated_at: new Date().toISOString() };
    if (safeUpdates.target_date === '') safeUpdates.target_date = null;

    const { data, error } = await supabase
      .from('goals')
      .update(safeUpdates)
      .eq('id', id)
      .eq('user_id', req.user.id)
      .select()
      .single();

    if (error) throw error;
    res.json({ goal: data });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update goal' });
  }
};

const deleteGoal = async (req, res) => {
  try {
    const { id } = req.params;
    await supabase.from('goal_milestones').delete().eq('goal_id', id);
    const { error } = await supabase.from('goals').delete().eq('id', id).eq('user_id', req.user.id);
    if (error) throw error;
    res.json({ message: 'Goal deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete goal' });
  }
};

const addMilestone = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, target_value } = req.body;

    const { data, error } = await supabase
      .from('goal_milestones')
      .insert([{ goal_id: id, title, target_value, completed: false }])
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ milestone: data });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add milestone' });
  }
};

const toggleMilestone = async (req, res) => {
  try {
    const { milestoneId } = req.params;
    const { completed } = req.body;

    const { data, error } = await supabase
      .from('goal_milestones')
      .update({ completed: completed, updated_at: new Date().toISOString() })
      .eq('id', milestoneId)
      .select()
      .single();

    if (error) throw error;
    res.json({ milestone: data });
  } catch (error) {
    res.status(500).json({ error: 'Failed to toggle milestone' });
  }
};

const deleteMilestone = async (req, res) => {
  try {
    const { milestoneId } = req.params;
    const { error } = await supabase
      .from('goal_milestones')
      .delete()
      .eq('id', milestoneId);

    if (error) throw error;
    res.json({ message: 'Milestone deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete milestone' });
  }
};

module.exports = { getGoals, createGoal, updateGoal, deleteGoal, addMilestone, toggleMilestone, deleteMilestone };
