const db = require('../config/db');

class BusinessModel {
    static async create(userId, businessName) {
        const [result] = await db.execute(
            'INSERT INTO businesses (user_id, business_name) VALUES (?, ?)',
            [userId, businessName]
        );
        return result.insertId;
    }

    static async findByUserId(userId) {
        const [rows] = await db.execute('SELECT * FROM businesses WHERE user_id = ?', [userId]);
        return rows;
    }

    static async delete(id, userId) {
        const [result] = await db.execute('DELETE FROM businesses WHERE id = ? AND user_id = ?', [id, userId]);
        return result.affectedRows;
    }
}

module.exports = BusinessModel;
