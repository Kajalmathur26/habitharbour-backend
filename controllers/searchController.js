const supabase = require('../config/supabase');

// ─── Search across tasks, goals, journal, moods ────────────────────── //
const globalSearch = async (req, res) => {
    try {
        const { q } = req.query;
        if (!q || q.trim().length < 2) {
            return res.json({ results: { tasks: [], goals: [], journal: [] } });
        }

        const search = q.trim();

        const [tasksRes, goalsRes, journalRes] = await Promise.all([
            supabase.from('tasks')
                .select('id, title, description, status, priority, category')
                .eq('user_id', req.user.id)
                .ilike('title', `%${search}%`)
                .limit(5),

            supabase.from('goals')
                .select('id, title, description, category, status')
                .eq('user_id', req.user.id)
                .ilike('title', `%${search}%`)
                .limit(5),

            supabase.from('journal_entries')
                .select('id, title, entry_date, mood')
                .eq('user_id', req.user.id)
                .ilike('title', `%${search}%`)
                .limit(5),
        ]);

        res.json({
            results: {
                tasks: tasksRes.data || [],
                goals: goalsRes.data || [],
                journal: journalRes.data || [],
            },
            query: search,
        });
    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({ error: 'Search failed' });
    }
};

module.exports = { globalSearch };
