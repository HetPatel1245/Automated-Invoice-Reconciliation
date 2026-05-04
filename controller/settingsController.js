const UserModel = require('../model/userModel');
const BusinessModel = require('../model/businessModel');
const AccountModel = require('../model/accountModel');

const getUserId = (req) => req.user.userId || req.user.id;

const updateActiveBusiness = async (req, res) => {
    try {
        const { businessId } = req.body;
        const userId = getUserId(req);

        await UserModel.updateLastActiveBusiness(userId, businessId);
        res.status(200).json({ message: 'Business ID updated successfully' });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

const getSettingsData = async (req, res) => {
    try {
        const userId = getUserId(req);
        const businesses = await BusinessModel.findByUserId(userId);
        const bankAccounts = await AccountModel.findByUserId(userId);
        res.status(200).json({ businesses, bankAccounts });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

const updateUsername = async (req, res) => {
    try {
        const { username } = req.body;
        const userId = getUserId(req);
        if (!username) return res.status(400).json({ message: 'Username is required' });

        await UserModel.updateUsername(userId, username);
        res.status(200).json({ message: 'Username updated successfully', username });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

const deleteAccount = async (req, res) => {
    try {
        const userId = getUserId(req);
        await UserModel.delete(userId);
        res.status(200).json({ message: 'Account deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

const addBusiness = async (req, res) => {
    try {
        const { business_name } = req.body;
        const userId = getUserId(req);
        if (!business_name) return res.status(400).json({ message: 'Business name is required' });

        const id = await BusinessModel.create(userId, business_name);
        res.status(201).json({ id, business_name, user_id: userId });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

const deleteBusiness = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = getUserId(req);
        
        await BusinessModel.delete(id, userId);
        res.status(200).json({ message: 'Business deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

const addBankAccount = async (req, res) => {
    try {
        const { business_id, bank_name, account_nickname, account_last_four } = req.body;
        if (!business_id || !bank_name) return res.status(400).json({ message: 'Business ID and Bank name are required' });

        const id = await AccountModel.create(business_id, bank_name, account_nickname, account_last_four);
        res.status(201).json({ id, business_id, bank_name, account_nickname, account_last_four });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

const deleteBankAccount = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = getUserId(req);

        await AccountModel.delete(id, userId);
        res.status(200).json({ message: 'Bank account deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = { 
    updateActiveBusiness, 
    getSettingsData, 
    updateUsername, 
    deleteAccount,
    addBusiness,
    deleteBusiness,
    addBankAccount,
    deleteBankAccount
};