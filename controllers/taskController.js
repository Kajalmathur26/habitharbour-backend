const supabase = require('../config/supabase');

// GET /api/tasks — support filters: status, priority, category
const getTasks = async (req, res) => {
  try {
    const userId = req.user.id;
    const { status, priority, category } = req.query;

    let query = supabase
      .from('tasks')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (status) query = query.eq('status', status);
    if (priority) query = query.eq('priority', priority);
    if (category) query = query.eq('category', category);

    const { data, error } = await query;
    if (error) throw error;

    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/tasks — support extra fields: is_priority, things_to_do
const createTask = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      title,
      description,
      priority = 'medium',
      category = 'personal',
      due_date,
      status = 'todo',
      is_priority = false,
      things_to_do = []
    } = req.body;

    if (!title) {
      return res.status(400).json({ success: false, message: 'Title required' });
    }

    const { data, error } = await supabase
      .from('tasks')
      .insert([{
        user_id: userId,
        title,
        description,
        priority,
        category,
        due_date,
        status,
        is_priority,
        things_to_do,
        position: 0
      }])
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/tasks/:id — update task with extended fields
const updateTask = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const updates = { ...req.body, updated_at: new Date().toISOString() };
    delete updates.user_id; // prevent changing owner

    const { data, error } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ success: false, message: 'Task not found' });

    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE /api/tasks/:id
const deleteTask = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) throw error;

    res.json({ success: true, message: 'Task deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/tasks/reorder — reorder tasks
const reorderTasks = async (req, res) => {
  try {
    const userId = req.user.id;
    const { tasks } = req.body; // [{id, position}]

    const updates = tasks.map(({ id, position }) =>
      supabase.from('tasks').update({ position }).eq('id', id).eq('user_id', userId)
    );

    await Promise.all(updates);
    res.json({ success: true, message: 'Tasks reordered' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  getTasks,
  createTask,
  updateTask,
  deleteTask,
  reorderTasks
};