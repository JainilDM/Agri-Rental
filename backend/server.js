const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });
const express = require("express");
const cors = require("cors");
const { connectToDatabase } = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const listingRoutes = require("./routes/listingRoutes");
const cartRoutes = require("./routes/cartRoutes");
const rentalRoutes = require("./routes/rentalRoutes");

const app = express();

// Middleware
const PORT = process.env.PORT || 5000;

// CORS setup for production readiness
const allowedOrigins = process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : ['http://localhost:5500', 'http://127.0.0.1:5500', 'http://localhost:3000'];
app.use(cors({
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
}));
app.use(express.json());

// Root route
app.get("/", (req, res) => {
    res.json({
        message: "Agri-Rental backend is running!"
    });
});

// Authentication routes
app.use("/api/auth", authRoutes);

// Machine listing routes
app.use("/api/listings", listingRoutes);

// Rental cart routes
app.use("/api/cart", cartRoutes);

// Rental request / booking routes
app.use("/api/rentals", rentalRoutes);

// Connect to MongoDB Atlas and start server
connectToDatabase()
    .then(() => {
        app.listen(PORT, () => {
            console.log(`Agri-Rental backend running on port ${PORT}`);
        });
    })
    .catch((error) => {
        console.error("Failed to start server due to MongoDB connection error:", error);
        process.exit(1);
    });