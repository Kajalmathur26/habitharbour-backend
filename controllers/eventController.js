const supabase = require('../config/supabase');

// GET /api/events
const getEvents = async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    let query = supabase
      .from('events')
      .select('*')
      .eq('user_id', req.user.id)
      .order('start_time');

    if (start_date) query = query.gte('start_time', start_date);
    if (end_date) query = query.lte('start_time', end_date);

    const { data, error } = await query;
    if (error) throw error;
    res.json({ events: data });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch events' });
  }
};

// POST /api/events — create event with extended location info
const createEvent = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      title,
      description,
      start_time,
      end_time,
      color = '#8B5CF6',
      reminder_minutes = 30,
      is_all_day = false,
      location_name,
      location_city,
      location_lat,
      location_lng
    } = req.body;

    if (!title || !start_time) return res.status(400).json({ error: 'Title and start time required' });

    const { data, error } = await supabase
      .from('events')
      .insert([{
        user_id: userId,
        title,
        description,
        start_time,
        end_time,
        color,
        reminder_minutes,
        is_all_day,
        location_name,
        location_city,
        location_lat,
        location_lng
      }])
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ success: true, event: data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/events/:id — update event with extended location info
const updateEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = { ...req.body, updated_at: new Date().toISOString() };

    const { data, error } = await supabase
      .from('events')
      .update(updates)
      .eq('id', id)
      .eq('user_id', req.user.id)
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, event: data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// DELETE /api/events/:id
const deleteEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabase
      .from('events')
      .delete()
      .eq('id', id)
      .eq('user_id', req.user.id);

    if (error) throw error;
    res.json({ success: true, message: 'Event deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getEvents, createEvent, updateEvent, deleteEvent };