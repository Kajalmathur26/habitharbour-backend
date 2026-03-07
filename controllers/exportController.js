const supabase = require('../config/supabase');

const exportFinanceCSV = async (req, res) => {
    try {
        const { data: transactions, error } = await supabase
            .from('finance')
            .select('*')
            .eq('user_id', req.user.id)
            .order('date', { ascending: false });

        if (error) throw error;

        if (!transactions || transactions.length === 0) {
            return res.status(404).send('No finance records found.');
        }

        const headers = 'Date,Type,Category,Amount,Description\n';
        const rows = transactions.map(t =>
            `"${t.date}","${t.type}","${t.category}","${t.amount}","${t.description || ''}"`
        ).join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="finance_export.csv"');
        res.send(headers + rows);
    } catch (error) {
        console.error('Export Finance Error:', error);
        res.status(500).json({ error: 'Failed to export finance data' });
    }
};

const exportJournalText = async (req, res) => {
    try {
        const { data: entries, error } = await supabase
            .from('journal_entries')
            .select('*')
            .eq('user_id', req.user.id)
            .order('entry_date', { ascending: false });

        if (error) throw error;

        if (!entries || entries.length === 0) {
            return res.status(404).send('No journal entries found.');
        }

        let content = 'My Journal Export\n\n';
        entries.forEach(entry => {
            content += `Date: ${entry.entry_date}\nTitle: ${entry.title}\nMood: ${entry.mood || 'N/A'}\n`;
            // Strip HTML tags for simple text export
            const cleanText = entry.content.replace(/<[^>]+>/g, '');
            content += `Content:\n${cleanText}\n\n`;
            content += '-'.repeat(40) + '\n\n';
        });

        res.setHeader('Content-Type', 'text/plain');
        res.setHeader('Content-Disposition', 'attachment; filename="journal_export.txt"');
        res.send(content);
    } catch (error) {
        console.error('Export Journal Error:', error);
        res.status(500).json({ error: 'Failed to export journal data' });
    }
};

const exportProductivityJSON = async (req, res) => {
    try {
        const { data: tasks, error: taskError } = await supabase
            .from('tasks')
            .select('title, status, due_date')
            .eq('user_id', req.user.id);

        const { data: habits, error: habitError } = await supabase
            .from('habits')
            .select('title, current_streak, completed_dates')
            .eq('user_id', req.user.id);

        if (taskError || habitError) throw new Error('Failed to fetch productivity data');

        const exportData = {
            exportDate: new Date().toISOString(),
            tasksStats: {
                total: tasks.length,
                completed: tasks.filter(t => t.status === 'completed').length,
            },
            habits: habits.map(h => ({
                name: h.title,
                currentStreak: h.current_streak,
                totalCompletedDays: h.completed_dates?.length || 0
            }))
        };

        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', 'attachment; filename="productivity_report.json"');
        res.send(JSON.stringify(exportData, null, 2));
    } catch (error) {
        console.error('Export Productivity Error:', error);
        res.status(500).json({ error: 'Failed to export productivity data' });
    }
};

module.exports = {
    exportFinanceCSV,
    exportJournalText,
    exportProductivityJSON
};
