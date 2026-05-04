
const path   = require('path');
const mysql  = require('mysql2/promise');

// Load .env from the project root (one level above this config/ directory)
require('dotenv').config({ path: path.resolve(__dirname, '../.env'), override: true });

let poolPromise;

const initializePool = async () => {
    // Read credentials here — AFTER dotenv has been loaded by server.js (or above)
    const host     = process.env.MYSQL_HOST     || '10.140.187.28';
    const port     = Number(process.env.MYSQL_PORT) || 3306;
    const user     = process.env.MYSQL_USER     || 'remoteuser';
    const password = process.env.MYSQL_PASSWORD || '1234';
    const database = process.env.MYSQL_DATABASE || 'invoice';

    // Try to auto-create the database — safe to fail on remote servers
    // where the user doesn't have CREATE DATABASE privilege.
    try {
        const boot = await mysql.createConnection({ host, port, user, password });
        await boot.query(`CREATE DATABASE IF NOT EXISTS \`${database}\``);
        await boot.end();
    } catch (_) {
        // Database already exists or user lacks CREATE privilege — proceed anyway.
    }

    return mysql.createPool({
        host,
        port,
        user,
        password,
        database,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        connectTimeout: 5000   // 5 s — fail fast if DB is unreachable
    });
};

const getPool = async () => {
    if (!poolPromise) {
        poolPromise = initializePool();
    }
    return poolPromise;
};

module.exports = {
    query: async (...args) => {
        const pool = await getPool();
        return pool.query(...args);
    },
    execute: async (...args) => {
        const pool = await getPool();
        return pool.execute(...args);
    },
    getConnection: async () => {
        const pool = await getPool();
        return pool.getConnection();
    },
    getPool
};
