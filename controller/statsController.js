const StatsModel = require('../model/statsModel');
const BusinessModel = require('../model/businessModel');

const MONTHS = [
    '', 'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

const getUserId = (req) => req.user?.userId || req.user?.id;

const getDashboardStats = async (req, res) => {
    try {
        const userId = getUserId(req);
        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const businesses = await BusinessModel.findByUserId(userId);
        if (!businesses || businesses.length === 0) {
            return res.status(200).json(getDefaultStats());
        }

        let activeBusinessId = req.query.businessId;
        if (!activeBusinessId || activeBusinessId === 'null' || activeBusinessId === 'undefined') {
            activeBusinessId = businesses[0].id;
        }
        console.log("Fetching stats for businessId:", activeBusinessId);

        const overallStatsRaw = await StatsModel.getOverallStats(activeBusinessId);
        const monthlyStatsRaw = await StatsModel.getMonthlyStats(activeBusinessId);
        const recentMatchesRaw = await StatsModel.getRecentMatches(activeBusinessId);

        console.log("overallStatsRaw:", overallStatsRaw);
        console.log("monthlyStatsRaw:", monthlyStatsRaw);
        console.log("recentMatchesRaw:", recentMatchesRaw);

        const latestMonthRaw = monthlyStatsRaw[0] || null;
        const prevMonthRaw = monthlyStatsRaw[1] || null;

        const stats = {
            latestMonthStats: formatMonth(latestMonthRaw) || getEmptyMonth(),
            previousMonthStats: formatMonth(prevMonthRaw) || getEmptyMonth(),
            overallStats: {
                total_records_processed: Number(overallStatsRaw?.total_records_processed) || 0,
                all_time_exact: Number(overallStatsRaw?.all_time_exact) || 0,
                all_time_partial: Number(overallStatsRaw?.all_time_partial) || 0,
                all_time_manual: 0, // Manual matching not implemented yet
                all_time_unmatched: Number(overallStatsRaw?.all_time_unmatched) || 0
            },
            recentMatches: recentMatchesRaw.map(match => ({
                id: match.id,
                transaction_id: match.transaction_id || 'Unknown',
                transaction_type: (match.transaction_type || 'Unknown').charAt(0).toUpperCase() + (match.transaction_type || 'unknown').slice(1),
                amount: Number(match.amount) || 0,
                match_type: match.result === 100 ? 'exact' : (match.result > 0 ? 'partial' : 'unmatched'),
                match_date: new Date(match.match_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit' })
            }))
        };

        res.status(200).json(stats);
    } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

function formatMonth(row) {
    if (!row) return null;
    return {
        month: `${MONTHS[row.target_month]} ${row.target_year}`,
        total_records: Number(row.total_records) || 0,
        exact_matches: Number(row.exact_matches) || 0,
        partial_matches: Number(row.partial_matches) || 0,
        manual_matches: 0,
        unmatched: Number(row.unmatched) || 0
    };
}

function getEmptyMonth() {
    return {
        month: "N/A",
        total_records: 0,
        exact_matches: 0,
        partial_matches: 0,
        manual_matches: 0,
        unmatched: 0
    };
}

function getDefaultStats() {
    return {
        latestMonthStats: getEmptyMonth(),
        previousMonthStats: getEmptyMonth(),
        overallStats: {
            total_records_processed: 0,
            all_time_exact: 0,
            all_time_partial: 0,
            all_time_manual: 0,
            all_time_unmatched: 0
        },
        recentMatches: []
    };
}

module.exports = {
    getDashboardStats
};
