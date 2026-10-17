const { verifyAuth } = require('./authMiddleware');

// Backward compatibility re-export so existing imports of verifyOwner resolve cleanly to verifyAuth
module.exports = {
    verifyOwner: verifyAuth,
    verifyAuth
};
