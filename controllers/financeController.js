const { supabase } = require('../config/supabase');

// Helper: get user_id from JWT
const getUserId = (req) => req.user.id;

// GET /api/finance
// Query params: month (YYYY-MM), type (income|expense), limit, offset
exports.getEntries = async (req, res) => {
  try {
    const userId = getUserId(req);
    const { month, type, limit = 100, offset = 0 } = req.query;

    let query = supabase
      .from('finance_entries')
      .select('*')
      .eq('user_id', userId)
      .order('entry_date', { ascending: false })
      .range(offset, offset + limit - 1);

    if (month) {
      const start = `${month}-01`;
      const end = new Date(month.split('-')[0], month.split('-')[1], 0)
        .toISOString().split('T')[0];
      query = query.gte('entry_date', start).lte('entry_date', end);
    }

    if (type) query = query.eq('type', type);

    const { data, error } = await query;
    if (error) throw error;

    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/finance/summary
// Returns: monthly summary for last 6 months + current month totals
exports.getSummary = async (req, res) => {
  try {
    const userId = getUserId(req);
    const { month } = req.query; // YYYY-MM

    const targetMonth = month || new Date().toISOString().slice(0, 7);
    const start = `${targetMonth}-01`;
    const end = new Date(
      targetMonth.split('-')[0],
      targetMonth.split('-')[1],
      0
    ).toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('finance_entries')
      .select('type, amount, entry_date, category')
      .eq('user_id', userId)
      .gte('entry_date', start)
      .lte('entry_date', end);

    if (error) throw error;

    const summary = data.reduce(
      (acc, entry) => {
        if (entry.type === 'income') acc.totalIncome += parseFloat(entry.amount);
        else acc.totalExpense += parseFloat(entry.amount);
        
        // category breakdown
        if (!acc.byCategory[entry.category]) acc.byCategory[entry.category] = 0;
        if (entry.type === 'expense') acc.byCategory[entry.category] += parseFloat(entry.amount);
        
        return acc;
      },
      { totalIncome: 0, totalExpense: 0, byCategory: {} }
    );

    summary.netBalance = summary.totalIncome - summary.totalExpense;
    summary.month = targetMonth;

    res.json({ success: true, data: summary });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/finance/monthly-trend
// Returns last 6 months income vs expense for chart
exports.getMonthlyTrend = async (req, res) => {
  try {
    const userId = getUserId(req);
    const months = [];
    
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setDate(1);
      d.setMonth(d.getMonth() - i);
      const key = d.toISOString().slice(0, 7);
      months.push(key);
    }

    const start = `${months[0]}-01`;
    const { data, error } = await supabase
      .from('finance_entries')
      .select('type, amount, entry_date')
      .eq('user_id', userId)
      .gte('entry_date', start)
      .order('entry_date');

    if (error) throw error;

    const trend = months.map(month => {
      const monthEntries = data.filter(e => e.entry_date.startsWith(month));
      const income = monthEntries
        .filter(e => e.type === 'income')
        .reduce((s, e) => s + parseFloat(e.amount), 0);
      const expense = monthEntries
        .filter(e => e.type === 'expense')
        .reduce((s, e) => s + parseFloat(e.amount), 0);
      const d = new Date(month + '-01');
      return {
        month: d.toLocaleString('default', { month: 'short', year: '2-digit' }),
        income: Math.round(income * 100) / 100,
        expense: Math.round(expense * 100) / 100,
      };
    });

    res.json({ success: true, data: trend });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/finance
exports.createEntry = async (req, res) => {
  try {
    const userId = getUserId(req);
    const { type, description, amount, category, entry_date, notes } = req.body;

    if (!type || !description || !amount || !category) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const { data, error } = await supabase
      .from('finance_entries')
      .insert([{ user_id: userId, type, description, amount, category, entry_date: entry_date || new Date().toISOString().split('T')[0], notes }])
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/finance/:id
exports.updateEntry = async (req, res) => {
  try {
    const userId = getUserId(req);
    const { id } = req.params;
    const updates = req.body;
    delete updates.user_id; // prevent user_id hijacking

    const { data, error } = await supabase
      .from('finance_entries')
      .update(updates)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE /api/finance/:id
exports.deleteEntry = async (req, res) => {
  try {
    const userId = getUserId(req);
    const { id } = req.params;

    const { error } = await supabase
      .from('finance_entries')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) throw error;
    res.json({ success: true, message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};