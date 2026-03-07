const supabase = require('../config/supabase');

// ─── GET All Transactions ─────────────────────────────────────────────────── //
const getTransactions = async (req, res) => {
    try {
        const { type, category, days = 30, limit = 100 } = req.query;

        const cutoff = new Date(Date.now() - parseInt(days) * 86400000).toISOString().split('T')[0];

        let query = supabase
            .from('finance_transactions')
            .select('*')
            .eq('user_id', req.user.id)
            .gte('date', cutoff)
            .order('date', { ascending: false })
            .limit(parseInt(limit));

        if (type) query = query.eq('type', type);
        if (category) query = query.eq('category', category);

        const { data, error } = await query;
        if (error) throw error;

        const totalIncome = data.filter(t => t.type === 'income').reduce((s, t) => s + parseFloat(t.amount), 0);
        const totalExpense = data.filter(t => t.type === 'expense').reduce((s, t) => s + parseFloat(t.amount), 0);

        const today = new Date().toISOString().split('T')[0];
        const todayData = data.filter(t => t.date === today);
        const todayIncome = todayData.filter(t => t.type === 'income').reduce((s, t) => s + parseFloat(t.amount), 0);
        const todayExpense = todayData.filter(t => t.type === 'expense').reduce((s, t) => s + parseFloat(t.amount), 0);

        res.json({
            transactions: data,
            summary: {
                totalIncome,
                totalExpense,
                balance: totalIncome - totalExpense,
                todayIncome,
                todayExpense,
            }
        });
    } catch (error) {
        console.error('Get transactions error:', error);
        res.status(500).json({ error: 'Failed to fetch transactions' });
    }
};

// ─── CREATE Transaction ──────────────────────────────────────────────────── //
const createTransaction = async (req, res) => {
    try {
        const { type, amount, category, description, date } = req.body;

        if (!type || !amount || !date) {
            return res.status(400).json({ error: 'Type, amount, and date are required' });
        }
        if (!['income', 'expense'].includes(type)) {
            return res.status(400).json({ error: 'Type must be income or expense' });
        }
        if (parseFloat(amount) <= 0) {
            return res.status(400).json({ error: 'Amount must be positive' });
        }

        const { data, error } = await supabase
            .from('finance_transactions')
            .insert([{
                user_id: req.user.id,
                type,
                amount: parseFloat(amount),
                category: category || 'Other',
                description: description || '',
                date: date || new Date().toISOString().split('T')[0],
            }])
            .select()
            .single();

        if (error) throw error;
        res.status(201).json({ transaction: data });
    } catch (error) {
        console.error('Create transaction error:', error);
        res.status(500).json({ error: 'Failed to create transaction' });
    }
};

// ─── UPDATE Transaction ──────────────────────────────────────────────────── //
const updateTransaction = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = { ...req.body, updated_at: new Date().toISOString() };
        if (updates.amount) updates.amount = parseFloat(updates.amount);
        if (updates.date === '') updates.date = new Date().toISOString().split('T')[0];

        const { data, error } = await supabase
            .from('finance_transactions')
            .update(updates)
            .eq('id', id)
            .eq('user_id', req.user.id)
            .select()
            .single();

        if (error) throw error;
        if (!data) return res.status(404).json({ error: 'Transaction not found' });
        res.json({ transaction: data });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update transaction' });
    }
};

// ─── DELETE Transaction ──────────────────────────────────────────────────── //
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

// ─── GET Analytics ───────────────────────────────────────────────────────── //
const getAnalytics = async (req, res) => {
    try {
        const { days = 30 } = req.query;
        const cutoff = new Date(Date.now() - parseInt(days) * 86400000).toISOString().split('T')[0];

        const { data, error } = await supabase
            .from('finance_transactions')
            .select('*')
            .eq('user_id', req.user.id)
            .gte('date', cutoff)
            .order('date', { ascending: true });

        if (error) throw error;

        // Group by category (expenses)
        const categoryMap = {};
        data.filter(t => t.type === 'expense').forEach(t => {
            categoryMap[t.category] = (categoryMap[t.category] || 0) + parseFloat(t.amount);
        });
        const categoryBreakdown = Object.entries(categoryMap).map(([name, value]) => ({ name, value }));

        // Daily trend (last N days)
        const trendMap = {};
        data.forEach(t => {
            if (!trendMap[t.date]) trendMap[t.date] = { date: t.date, income: 0, expense: 0 };
            trendMap[t.date][t.type] += parseFloat(t.amount);
        });
        const dailyTrend = Object.values(trendMap).sort((a, b) => a.date.localeCompare(b.date));

        // Weekly summary (last 4 weeks)
        const weeklyMap = {};
        data.forEach(t => {
            const d = new Date(t.date);
            const weekStart = new Date(d);
            weekStart.setDate(d.getDate() - d.getDay());
            const key = weekStart.toISOString().split('T')[0];
            if (!weeklyMap[key]) weeklyMap[key] = { week: key, income: 0, expense: 0 };
            weeklyMap[key][t.type] += parseFloat(t.amount);
        });
        const weeklySummary = Object.values(weeklyMap).sort((a, b) => a.week.localeCompare(b.week));

        res.json({ categoryBreakdown, dailyTrend, weeklySummary });
    } catch (error) {
        console.error('Analytics error:', error);
        res.status(500).json({ error: 'Failed to fetch analytics' });
    }
};

module.exports = { getTransactions, createTransaction, updateTransaction, deleteTransaction, getAnalytics };
