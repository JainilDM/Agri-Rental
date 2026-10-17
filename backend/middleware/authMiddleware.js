const jwt = require('jsonwebtoken');
const { ObjectId } = require('mongodb');
const { client } = require('../config/db');

/**
 * Shared Unified Authentication Middleware
 *
 * Verifies JWT signature and expiry.
 * Resolves the token identity against the `users` collection.
 * Supports both new unified tokens and legacy farmer/owner tokens.
 * Attaches consistent identity to req.user (plus req.owner and req.farmer polyfills).
 */
const verifyAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ message: "Access denied. No valid token provided." });
        }

        const token = authHeader.split(' ')[1];
        if (!token) {
            return res.status(401).json({ message: "Access denied. Token is missing." });
        }

        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
            console.error("Missing JWT_SECRET environment variable.");
            return res.status(500).json({ message: "Internal server error." });
        }

        let decoded;
        try {
            decoded = jwt.verify(token, jwtSecret);
        } catch (error) {
            return res.status(401).json({ message: "Invalid or expired token." });
        }

        // Support unified userId, legacy ownerId, or legacy farmerId claims
        const claimedId = decoded.userId || decoded.ownerId || decoded.farmerId;
        if (!claimedId || typeof claimedId !== 'string' || !ObjectId.isValid(claimedId)) {
            return res.status(401).json({ message: "Access denied. Invalid token identity." });
        }

        // Security requirement: Resolve identity against the `users` collection
        // Do not trust an ID merely because it appears in a decoded token
        const db = client.db("agri_rental");
        const usersCollection = db.collection("users");
        const user = await usersCollection.findOne({ _id: new ObjectId(claimedId) });

        if (!user) {
            return res.status(401).json({ message: "Access denied. User account not found." });
        }

        // Attach safe, verified unified identity
        req.user = {
            id: user._id.toString(),
            name: user.name,
            email: user.email
        };

        // Polyfill legacy attachment properties for zero-breaking backward compatibility
        req.owner = req.user;
        req.farmer = req.user;

        next();
    } catch (error) {
        console.error("Authentication Middleware Error:", error);
        return res.status(500).json({ message: "An unexpected error occurred during authentication." });
    }
};

module.exports = { verifyAuth };
