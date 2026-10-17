const express = require('express');
const router = express.Router();
const { ObjectId } = require('mongodb');
const { client } = require('../config/db');
const { verifyAuth } = require('../middleware/authMiddleware');

/**
 * GET /api/cart - Get the authenticated user's cart
 */
router.get('/', verifyAuth, async (req, res) => {
    try {
        const db = client.db('agri_rental');
        const cartCollection = db.collection('carts');
        const userId = req.user.id.toString();

        const userCart = await cartCollection.findOne({ userId });
        const items = (userCart && Array.isArray(userCart.items)) ? userCart.items : [];

        return res.status(200).json({
            message: 'Cart retrieved successfully.',
            items
        });
    } catch (error) {
        console.error('Cart Get Error:', error);
        return res.status(500).json({ message: 'Failed to retrieve cart.' });
    }
});

/**
 * PUT /api/cart - Synchronize/save the authenticated user's full cart
 */
router.put('/', verifyAuth, async (req, res) => {
    try {
        const db = client.db('agri_rental');
        const cartCollection = db.collection('carts');
        const listingsCollection = db.collection('listings');
        const userId = req.user.id.toString();

        const rawItems = req.body.items;
        if (!Array.isArray(rawItems)) {
            return res.status(400).json({ message: 'Cart items must be an array.' });
        }

        // Validate and sanitize each item
        const validatedItems = [];
        for (const item of rawItems) {
            if (!item || typeof item !== 'object') continue;

            const sanitized = {
                id: String(item.id || ('cart_' + Date.now() + '_' + Math.floor(Math.random() * 10000))),
                listingId: item.listingId ? String(item.listingId) : null,
                name: String(item.name || 'Machinery Item').trim().slice(0, 100),
                category: String(item.category || 'Agricultural Machinery').trim().slice(0, 50),
                price: Number(item.price) >= 0 ? Number(item.price) : 0,
                priceUnit: String(item.priceUnit || 'Day').trim().slice(0, 20),
                duration: String(item.duration || '1 Day').trim().slice(0, 50),
                date: String(item.date || new Date().toISOString().split('T')[0]).slice(0, 20),
                location: String(item.location || 'Local').trim().slice(0, 100),
                notes: String(item.notes || '').trim().slice(0, 500),
                farmerName: String(item.farmerName || '').trim().slice(0, 100),
                farmerPhone: String(item.farmerPhone || '').trim().slice(0, 20),
                quantity: Math.max(1, parseInt(item.quantity, 10) || 1),
                addedAt: item.addedAt || new Date().toISOString()
            };

            // If listingId is present and valid ObjectId, verify it exists
            if (sanitized.listingId && ObjectId.isValid(sanitized.listingId)) {
                const listingExists = await listingsCollection.findOne({ _id: new ObjectId(sanitized.listingId) });
                if (listingExists) {
                    sanitized.listingExists = true;
                    // Ensure machineName stays canonical
                    if (listingExists.machineName) {
                        sanitized.name = listingExists.machineName;
                    }
                }
            }

            validatedItems.push(sanitized);
        }

        await cartCollection.updateOne(
            { userId },
            {
                $set: {
                    userId,
                    items: validatedItems,
                    updatedAt: new Date()
                },
                $setOnInsert: {
                    createdAt: new Date()
                }
            },
            { upsert: true }
        );

        return res.status(200).json({
            message: 'Cart synchronized successfully.',
            items: validatedItems
        });
    } catch (error) {
        console.error('Cart Save Error:', error);
        return res.status(500).json({ message: 'Failed to update cart.' });
    }
});

/**
 * POST /api/cart/items - Add a single item to the authenticated user's cart
 */
router.post('/items', verifyAuth, async (req, res) => {
    try {
        const db = client.db('agri_rental');
        const cartCollection = db.collection('carts');
        const listingsCollection = db.collection('listings');
        const userId = req.user.id.toString();

        const item = req.body;
        if (!item || typeof item !== 'object') {
            return res.status(400).json({ message: 'Valid cart item is required.' });
        }

        const sanitized = {
            id: String(item.id || ('cart_' + Date.now() + '_' + Math.floor(Math.random() * 10000))),
            listingId: item.listingId ? String(item.listingId) : null,
            name: String(item.name || 'Machinery Item').trim().slice(0, 100),
            category: String(item.category || 'Agricultural Machinery').trim().slice(0, 50),
            price: Number(item.price) >= 0 ? Number(item.price) : 0,
            priceUnit: String(item.priceUnit || 'Day').trim().slice(0, 20),
            duration: String(item.duration || '1 Day').trim().slice(0, 50),
            date: String(item.date || new Date().toISOString().split('T')[0]).slice(0, 20),
            location: String(item.location || 'Local').trim().slice(0, 100),
            notes: String(item.notes || '').trim().slice(0, 500),
            farmerName: String(item.farmerName || '').trim().slice(0, 100),
            farmerPhone: String(item.farmerPhone || '').trim().slice(0, 20),
            quantity: Math.max(1, parseInt(item.quantity, 10) || 1),
            addedAt: new Date().toISOString()
        };

        if (sanitized.listingId && ObjectId.isValid(sanitized.listingId)) {
            const listing = await listingsCollection.findOne({ _id: new ObjectId(sanitized.listingId) });
            if (listing) {
                sanitized.listingExists = true;
                if (listing.machineName) sanitized.name = listing.machineName;
            }
        }

        const userCart = await cartCollection.findOne({ userId });
        let items = (userCart && Array.isArray(userCart.items)) ? [...userCart.items] : [];

        // Check if item already exists (by listingId or matching name + date)
        const existingIndex = items.findIndex(i => {
            if (sanitized.listingId && i.listingId) {
                return String(i.listingId) === String(sanitized.listingId) && i.date === sanitized.date;
            }
            return i.name.trim().toLowerCase() === sanitized.name.trim().toLowerCase() && i.date === sanitized.date;
        });

        if (existingIndex > -1) {
            items[existingIndex].quantity = (parseInt(items[existingIndex].quantity, 10) || 1) + sanitized.quantity;
        } else {
            items.push(sanitized);
        }

        await cartCollection.updateOne(
            { userId },
            {
                $set: { userId, items, updatedAt: new Date() },
                $setOnInsert: { createdAt: new Date() }
            },
            { upsert: true }
        );

        return res.status(200).json({
            message: 'Item added to cart.',
            items
        });
    } catch (error) {
        console.error('Add Cart Item Error:', error);
        return res.status(500).json({ message: 'Failed to add item to cart.' });
    }
});

/**
 * DELETE /api/cart/items/:id - Remove an item from the authenticated user's cart
 */
router.delete('/items/:id', verifyAuth, async (req, res) => {
    try {
        const db = client.db('agri_rental');
        const cartCollection = db.collection('carts');
        const userId = req.user.id.toString();
        const itemId = String(req.params.id);

        const userCart = await cartCollection.findOne({ userId });
        if (!userCart || !Array.isArray(userCart.items)) {
            return res.status(200).json({ message: 'Item removed.', items: [] });
        }

        const items = userCart.items.filter(i => String(i.id) !== itemId);

        await cartCollection.updateOne(
            { userId },
            { $set: { items, updatedAt: new Date() } }
        );

        return res.status(200).json({
            message: 'Item removed from cart.',
            items
        });
    } catch (error) {
        console.error('Delete Cart Item Error:', error);
        return res.status(500).json({ message: 'Failed to remove item.' });
    }
});

/**
 * DELETE /api/cart - Clear the authenticated user's cart
 */
router.delete('/', verifyAuth, async (req, res) => {
    try {
        const db = client.db('agri_rental');
        const cartCollection = db.collection('carts');
        const userId = req.user.id.toString();

        await cartCollection.updateOne(
            { userId },
            { $set: { items: [], updatedAt: new Date() } },
            { upsert: true }
        );

        return res.status(200).json({
            message: 'Cart cleared successfully.',
            items: []
        });
    } catch (error) {
        console.error('Clear Cart Error:', error);
        return res.status(500).json({ message: 'Failed to clear cart.' });
    }
});

module.exports = router;
