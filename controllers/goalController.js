const supabase = require('../config/supabase');

// Get all goals for the user
const getGoals = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('goals')
      .select('*, goal_milestones(*)')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json({ goals: data });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch goals' });
  }
};

// Create a new goal
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
        target_date,
        target_value: target_value || 100,
        current_value: 0,
        unit: unit || '%',
        status: 'active'
      }])
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ goal: data });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create goal' });
  }
};

// Update a goal
const updateGoal = async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('goals')
      .update({ ...req.body, updated_at: new Date().toISOString() })
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

// Delete a goal and its milestones
const deleteGoal = async (req, res) => {
  try {
    const { id } = req.params;
    // Delete all milestones first
    await supabase.from('goal_milestones').delete().eq('goal_id', id);
    // Delete the goal
    const { error } = await supabase
      .from('goals')
      .delete()
      .eq('id', id)
      .eq('user_id', req.user.id);

    if (error) throw error;
    res.json({ message: 'Goal deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete goal' });
  }
};

// Add a milestone to a goal
const addMilestone = async (req, res) => {
  try {
    const { id } = req.params; // goal ID
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

// Update intermediate targets (PUT /api/goals/:id/targets)
const updateTargets = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { targets } = req.body; // array of { id, label, done }

    if (!Array.isArray(targets)) {
      return res.status(400).json({ success: false, message: 'targets must be an array' });
    }

    const { data, error } = await supabase
      .from('goals')
      .update({ targets, updated_at: new Date().toISOString() })
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

module.exports = {
  getGoals,
  createGoal,
  updateGoal,
  deleteGoal,
  addMilestone,
  updateTargets,
};