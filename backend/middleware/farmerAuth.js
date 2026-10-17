const { verifyAuth } = require('./authMiddleware');

// Backward compatibility re-export so existing imports of verifyFarmer resolve cleanly to verifyAuth
module.exports = {
    verifyFarmer: verifyAuth,
    verifyAuth
};
