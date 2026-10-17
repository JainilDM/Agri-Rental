const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { client } = require('../config/db');
const { verifyAuth } = require('../middleware/authMiddleware');

// Basic email validation regex
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Shared Helper: Validate, Hash & Create Unified Account in `users`
 */
async function handleUnifiedSignup(req, res) {
    try {
        let { name, email, password } = req.body;

        // 1. Check for missing fields and types
        if (!name || typeof name !== 'string' || name.length > 100) {
            return res.status(400).json({ message: "Valid name is required (max 100 chars)." });
        }
        if (!email || typeof email !== 'string' || email.length > 255) {
            return res.status(400).json({ message: "Valid email is required (max 255 chars)." });
        }
        if (!password || typeof password !== 'string' || password.length < 8 || password.length > 128) {
            return res.status(400).json({ message: "Password must be between 8 and 128 characters." });
        }

        // 2. Trim and normalize inputs consistently
        name = name.trim();
        email = email.trim().toLowerCase();

        // 3. Validate email format
        if (!emailRegex.test(email)) {
            return res.status(400).json({ message: "Please provide a valid email address." });
        }

        // 4. Connect to database and users collection
        const db = client.db("agri_rental");
        const usersCollection = db.collection("users");

        // 5. Check if email already exists
        const existingUser = await usersCollection.findOne({ email });
        if (existingUser) {
            return res.status(409).json({ message: "An account with this email is already registered." });
        }

        // 6. Hash password securely
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // 7. Insert unified user document
        const newUser = {
            name,
            email,
            password: hashedPassword,
            createdAt: new Date(),
            updatedAt: new Date()
        };

        const result = await usersCollection.insertOne(newUser);

        const safeUser = {
            id: result.insertedId.toString(),
            name: newUser.name,
            email: newUser.email
        };

        // 8. Return unified response, with farmer and owner shapes for frontend compatibility
        return res.status(201).json({
            message: "Account created successfully!",
            user: safeUser,
            farmer: safeUser,
            owner: safeUser
        });

    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({ message: "An account with this email is already registered." });
        }
        console.error("Unified Signup Error:", error);
        return res.status(500).json({ message: "An unexpected error occurred during signup. Please try again." });
    }
}

/**
 * Shared Helper: Validate & Authenticate against `users`, issuing Unified JWT
 */
async function handleUnifiedLogin(req, res) {
    try {
        let { email, password } = req.body;

        // 1. Validate presence of fields
        if (!email || !password) {
            return res.status(400).json({ message: "Email and password are required." });
        }

        // 2. Normalize email consistently
        email = email.trim().toLowerCase();

        // 3. Connect to database and users collection
        const db = client.db("agri_rental");
        const usersCollection = db.collection("users");

        // 4. Find user by normalized email
        const user = await usersCollection.findOne({ email });
        if (!user) {
            return res.status(401).json({ message: "Invalid email or password." });
        }

        // 5. Compare password hash securely
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: "Invalid email or password." });
        }

        // 6. Ensure JWT Secret exists before signing
        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
            console.error("Missing JWT_SECRET environment variable.");
            return res.status(500).json({ message: "Internal server error. Please contact the administrator." });
        }

        const userIdStr = user._id.toString();

        // 7. Unified JWT Payload with identity and compatibility claims
        const payload = {
            userId: userIdStr,
            ownerId: userIdStr,
            farmerId: userIdStr,
            email: user.email,
            name: user.name
        };
        const token = jwt.sign(payload, jwtSecret, { expiresIn: '1h' });

        const safeUser = {
            id: userIdStr,
            name: user.name,
            email: user.email
        };

        // 8. Return response containing unified user plus backward-compatible farmer and owner shapes
        return res.status(200).json({
            message: "Login successful!",
            token,
            user: safeUser,
            farmer: safeUser,
            owner: safeUser
        });

    } catch (error) {
        console.error("Unified Login Error:", error);
        return res.status(500).json({ message: "An unexpected error occurred during login. Please try again." });
    }
}

// ==========================================
// UNIFIED AUTHENTICATION ROUTES
// ==========================================

// Standard Signup (used by farmer.html)
router.post('/signup', handleUnifiedSignup);

// Standard Login (used by farmer.html)
router.post('/login', handleUnifiedLogin);

// Owner Signup (used by owner.html)
router.post('/owner/signup', handleUnifiedSignup);

// Owner Login (used by owner.html)
router.post('/owner/login', handleUnifiedLogin);

// Session Verification - Unified Renter Route (used by farmer.html)
router.get('/verify', verifyAuth, (req, res) => {
    return res.status(200).json({
        message: "Session is valid",
        userId: req.user.id,
        farmerId: req.user.id,
        user: req.user
    });
});

// Session Verification - Unified Owner Route (used by owner.html)
router.get('/owner/verify', verifyAuth, (req, res) => {
    return res.status(200).json({
        message: "Owner session is valid",
        userId: req.user.id,
        ownerId: req.user.id,
        user: req.user
    });
});

module.exports = router;
