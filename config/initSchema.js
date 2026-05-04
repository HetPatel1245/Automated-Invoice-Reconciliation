const db = require('./db');
const fs = require('fs');
const path = require('path');


const initSchema = async () => {
    const pool = await db.getPool();

    const sqlFilePath = path.join(__dirname, 'schema.sql');
    const schemaSql = fs.readFileSync(sqlFilePath, 'utf8');

    // Split into individual queries and remove empty strings
    const queries = schemaSql
        .split(';')
        .map(query => query.trim())
        .filter(query => query.length > 0);

    // Execute each query sequentially
    for (const query of queries) {
        try {
            await pool.query(query);
        } catch (err) {
            // Ignore errors from repeated runs of one-time schema changes
            if (err.code === 'ER_DUP_FIELDNAME' || err.code === 'ER_CANT_DROP_FIELD_OR_KEY' || err.code === 'ER_DUP_KEYNAME') {
                console.log(`Skipping query due to existing schema: ${err.message}`);
            } else {
                throw err;
            }
        }
    }

};

module.exports = initSchema;