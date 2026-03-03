const supabase = require('../config/supabase');

const getTransactions = async (req, res) => {
  try {
    const { type, start_date, end_date, period } = req.query;

    let start, end;
    const today = new Date();

    if (period === 'daily') {
      start = today.toISOString().split('T')[0];
      end = start;
    } else if (period === 'weekly') {
      const day = today.getDay();
      const startD = new Date(today);
      startD.setDate(today.getDate() - day);
      start = startD.toISOString().split('T')[0];
      end = today.toISOString().split('T')[0];
    } else if (period === 'monthly') {
      const startD = new Date(today.getFullYear(), today.getMonth(), 1);
      start = startD.toISOString().split('T')[0];
      end = today.toISOString().split('T')[0];
    }

    let query = supabase
      .from('finance_transactions')
      .select('*')
      .eq('user_id', req.user.id)
      .order('date', { ascending: false });

    if (type) query = query.eq('type', type);
    if (start_date || start) query = query.gte('date', start_date || start);
    if (end_date || end) query = query.lte('date', end_date || end);

    const { data, error } = await query;
    if (error) throw error;
    res.json({ transactions: data });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
};

const createTransaction = async (req, res) => {
  try {
    const { item, amount, type, date, category, notes } = req.body;
    if (!item || !amount || !type) {
      return res.status(400).json({ error: 'Item, amount, and type are required' });
    }

    const { data, error } = await supabase
      .from('finance_transactions')
      .insert([{
        user_id: req.user.id,
        item,
        amount: parseFloat(amount),
        type,
        date: date || new Date().toISOString().split('T')[0],
        category: category || 'general',
        notes: notes || ''
      }])
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ transaction: data });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create transaction' });
  }
};

const deleteTransaction = async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabase
      .from('finance_transactions')
      .delete()
      .eq('id', id)
      .eq('user_id', req.user.id);

    if (error) throw error;
    res.json({ message: 'Transaction deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete transaction' });
  }
};

const getSummary = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('finance_transactions')
      .select('amount, type, date, category')
      .eq('user_id', req.user.id)
      .order('date', { ascending: true });

    if (error) throw error;

    const totalIncome = data.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const totalExpense = data.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const netBalance = totalIncome - totalExpense;

    // Monthly breakdown
    const monthly = {};
    data.forEach(t => {
      const month = t.date.substring(0, 7); // yyyy-mm
      if (!monthly[month]) monthly[month] = { income: 0, expense: 0 };
      monthly[month][t.type] += t.amount;
    });

    const monthlyBreakdown = Object.entries(monthly).map(([month, vals]) => ({
      month,
      income: Math.round(vals.income * 100) / 100,
      expense: Math.round(vals.expense * 100) / 100
    }));

    res.json({
      totalIncome: Math.round(totalIncome * 100) / 100,
      totalExpense: Math.round(totalExpense * 100) / 100,
      netBalance: Math.round(netBalance * 100) / 100,
      monthlyBreakdown
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to get summary' });
  }
};

module.exports = { getTransactions, createTransaction, deleteTransaction, getSummary };
