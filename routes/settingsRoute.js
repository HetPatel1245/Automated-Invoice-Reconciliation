const express = require('express');
const { 
    updateActiveBusiness, 
    getSettingsData, 
    updateUsername, 
    deleteAccount,
    addBusiness,
    deleteBusiness,
    addBankAccount,
    deleteBankAccount
} = require('../controller/settingsController');

const verifyToken = require('../middleware/authMiddleware');
const router = express.Router();

router.use(verifyToken); // Apply to all settings routes

router.get('/data', getSettingsData);
router.put('/active-business', updateActiveBusiness);
router.put('/username', updateUsername);
router.delete('/account', deleteAccount);

router.post('/business', addBusiness);
router.delete('/business/:id', deleteBusiness);

router.post('/bank-account', addBankAccount);
router.delete('/bank-account/:id', deleteBankAccount);

module.exports = router;