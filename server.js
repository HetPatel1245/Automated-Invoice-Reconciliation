const dotenv = require('dotenv');
dotenv.config({ override: true }); // ? Give more priority to .env variables rather than those who exists by default

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const authRoute = require('./routes/authRoute');
const settingsRoute = require('./routes/settingsRoute');
const invoiceRoute = require('./routes/invoiceRoute');
const bankStatementRoute = require('./routes/bankStatementRoute');
const statsRoute = require('./routes/statsRoute');
const initSchema = require('./config/initSchema');

const ledgerRoute = require('./routes/ledgerRoute');
const reconciliationRoute = require('./routes/reconciliationRoute');


const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Basic health check route
app.get('/lol', (req, res) => {
    res.status(200).json({ message: 'API is running cleanly' });
});
// Routes
app.use('/api/v1/auth', authRoute);
app.use('/api/v1/settings', settingsRoute);
app.use('/api/v1/invoice', invoiceRoute);
app.use('/api/v1/ledger', ledgerRoute);
app.use('/api/v1/bank-statement', bankStatementRoute);
app.use('/api/v1/stats', statsRoute);
app.use('/api/v1/reconciliation', reconciliationRoute);

// Initialize database and start server
const PORT = process.env.PORT || 8085;

const startServer = async () => {
    try {
        await initSchema();
        console.log('Database initialized successfully.');
    } catch (error) {
        // DB unavailable (e.g. remote server unreachable) — log but keep going.
        // Individual API routes will return 503 until the DB is reachable.
        console.error('DB init warning (server will still start):', error.message);
    }

    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
};

startServer();
