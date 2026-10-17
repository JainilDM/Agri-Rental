const { MongoClient } = require("mongodb");

const client = new MongoClient(process.env.MONGODB_URI);

async function connectToDatabase() {
    await client.connect();
    console.log("Connected to MongoDB Atlas!");

    const db = client.db("agri_rental");

    // Unified users unique email index (safely creates or verifies existing)
    await db.collection("users").createIndex(
        { email: 1 },
        { unique: true }
    );

    // Keep legacy indexes untouched for existing collections
    await db.collection("farmers").createIndex(
        { email: 1 },
        { unique: true }
    );
    await db.collection("owners").createIndex(
        { email: 1 },
        { unique: true }
    );
    console.log("Database indexes verified.");
}

module.exports = { client, connectToDatabase };
