const supabase = require('../config/supabase');

// -------------------- Entries -------------------- //

// GET /api/journal
const getEntries = async (req, res) => {
  try {
    const { start_date, end_date, search } = req.query;
    let query = supabase
      .from('journal_entries')
      .select('*')
      .eq('user_id', req.user.id)
      .order('entry_date', { ascending: false });

    if (start_date) query = query.gte('entry_date', start_date);
    if (end_date) query = query.lte('entry_date', end_date);
    if (search) query = query.ilike('title', `%${search}%`);

    const { data, error } = await query;
    if (error) throw error;
    res.json({ entries: data });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch entries' });
  }
};

// GET /api/journal/:id
const getEntry = async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('journal_entries')
      .select('*')
      .eq('id', id)
      .eq('user_id', req.user.id)
      .single();

    if (error || !data) return res.status(404).json({ error: 'Entry not found' });
    res.json({ entry: data });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch entry' });
  }
};

// POST /api/journal
const createEntry = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      title = 'Untitled Entry',
      content = '',
      entry_date,
      mood,
      tags = [],
      is_private = true,
      images = [],
      stickers = [],
      font_family = 'Inter',
      font_color = '#1f2937',
      font_size = 16
    } = req.body;

    const { data, error } = await supabase
      .from('journal_entries')
      .insert([{
        user_id: userId,
        title,
        content,
        entry_date: entry_date || new Date().toISOString().split('T')[0],
        mood,
        tags,
        is_private,
        images,
        stickers,
        font_family,
        font_color,
        font_size
      }])
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ entry: data });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create entry' });
  }
};

// PUT /api/journal/:id
const updateEntry = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = { ...req.body, updated_at: new Date().toISOString() };
    delete updates.user_id; // prevent updating user_id

    const { data, error } = await supabase
      .from('journal_entries')
      .update(updates)
      .eq('id', id)
      .eq('user_id', req.user.id)
      .select()
      .single();

    if (error) throw error;
    res.json({ entry: data });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update entry' });
  }
};

// DELETE /api/journal/:id
const deleteEntry = async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabase
      .from('journal_entries')
      .delete()
      .eq('id', id)
      .eq('user_id', req.user.id);

    if (error) throw error;
    res.json({ message: 'Entry deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete entry' });
  }
};

// -------------------- Upload Images -------------------- //

// POST /api/journal/upload-image
const uploadImage = async (req, res) => {
  try {
    const userId = req.user.id;
    const file = req.file;
    if (!file) return res.status(400).json({ success: false, message: 'No file provided' });

    const ext = file.mimetype.split('/')[1];
    const path = `journal/${userId}-${Date.now()}.${ext}`;

    const { error: upErr } = await supabase.storage
      .from('planora-media')
      .upload(path, file.buffer, { contentType: file.mimetype, upsert: false });
    if (upErr) throw upErr;

    const { data: { publicUrl } } = supabase.storage.from('planora-media').getPublicUrl(path);
    res.json({ success: true, data: { url: publicUrl } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// -------------------- Exports -------------------- //

module.exports = {
  getEntries,
  getEntry,
  createEntry,
  updateEntry,
  deleteEntry,
  uploadImage
};