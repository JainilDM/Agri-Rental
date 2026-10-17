const express = require('express');
const router = express.Router();
const { ObjectId } = require('mongodb');
const { client } = require('../config/db');
const { verifyAuth } = require('../middleware/authMiddleware');

/**
 * Maximum allowed quantity for a cart line item
 */
const MAX_CART_QUANTITY = 100;

/**
 * Helper to validate MongoDB ObjectId
 */
const isValidObjectId = (id) => {
    return typeof id === 'string' && ObjectId.isValid(id) && new ObjectId(id).toString() === id;
};

/**
 * Helper to validate date strings (e.g. YYYY-MM-DD or ISO 8601) with calendar and timezone validity checks
 */
function isValidDateString(val) {
    if (typeof val !== 'string') return false;
    const trimmed = val.trim();
    const match = trimmed.match(
        /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?(?:Z|([+-])(\d{2}):?(\d{2}))?)?$/
    );
    if (!match) return false;

    const y = parseInt(match[1], 10);
    const m = parseInt(match[2], 10);
    const d = parseInt(match[3], 10);
    if (m < 1 || m > 12 || d < 1 || d > 31) return false;

    const dateObj = new Date(Date.UTC(y, m - 1, d));
    if (dateObj.getUTCFullYear() !== y || dateObj.getUTCMonth() !== m - 1 || dateObj.getUTCDate() !== d) {
        return false;
    }

    if (match[4]) {
        const hr = parseInt(match[4], 10);
        const min = parseInt(match[5], 10);
        const sec = parseInt(match[6], 10);
        if (hr > 23 || min > 59 || sec > 59) return false;
    }

    // Timezone offset validation: match[8] is sign ([+-]), match[9] is tzHr, match[10] is tzMin
    if (match[8]) {
        const tzHr = parseInt(match[9], 10);
        const tzMin = parseInt(match[10], 10);
        if (tzHr > 14 || tzMin > 59) return false;
        if (tzHr === 14 && tzMin > 0) return false;
    }

    return !Number.isNaN(Date.parse(trimmed));
}

/**
 * Helper to validate and parse a finite, non-negative number from numeric or string input
 */
function parseNonNegativeFiniteNumber(val) {
    if (typeof val === 'number') {
        return Number.isFinite(val) && val >= 0 ? val : null;
    }
    if (typeof val === 'string') {
        const trimmed = val.trim();
        if (!trimmed) return null;
        const num = Number(trimmed);
        return Number.isFinite(num) && num >= 0 ? num : null;
    }
    return null;
}

/**
 * Helper to generate a human-readable booking reference ID: RNT-XXXXXX
 */
function generateBookingRef() {
    return 'RNT-' + Math.floor(100000 + Math.random() * 900000);
}

/**
 * POST /api/rentals/request - Submit a rental / booking request
 * Persists the request in the MongoDB Atlas `rental_requests` collection.
 */
router.post('/request', verifyAuth, async (req, res) => {
    try {
        const db = client.db('agri_rental');
        const requestsCollection = db.collection('rental_requests');
        const listingsCollection = db.collection('listings');
        const cartsCollection = db.collection('carts');

        const userId = req.user.id.toString();
        const userEmail = req.user.email;
        const userName = req.user.name;

        const {
            farmerName,
            farmerPhone,
            farmerEmail,
            farmerLocation,
            machineryCategory,
            specificMachinery,
            requiredDate,
            rentalDuration,
            preferredLocation,
            maxBudget,
            additionalRequirements,
            listingId,
            items // If submitted from cart
        } = req.body;

        // Basic contact validation - safely handle non-string values to prevent .trim() TypeError
        const rawFarmerName = typeof farmerName === 'string' ? farmerName.trim() : '';
        const rawUserName = typeof userName === 'string' ? userName.trim() : '';
        const contactName = (rawFarmerName || rawUserName).slice(0, 100);

        let contactPhone = '';
        if (typeof farmerPhone === 'string') {
            contactPhone = farmerPhone.trim();
        } else if (typeof farmerPhone === 'number' && Number.isFinite(farmerPhone)) {
            contactPhone = String(farmerPhone).trim();
        }

        const rawFarmerEmail = typeof farmerEmail === 'string' ? farmerEmail.trim().toLowerCase() : '';
        const rawUserEmail = typeof userEmail === 'string' ? userEmail.trim().toLowerCase() : '';
        const contactEmail = rawFarmerEmail || rawUserEmail;

        if (!contactName) {
            return res.status(400).json({ message: 'Renter name is required.' });
        }
        if (!contactPhone || contactPhone.replace(/\D/g, '').length < 10) {
            return res.status(400).json({ message: 'A valid 10-digit mobile number is required.' });
        }
        if (contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
            return res.status(400).json({ message: 'A valid email address is required.' });
        }

        const bookingRef = generateBookingRef();
        let validatedItems = [];
        let totalEstimatedBudget = 0;

        // Check if request is submitted as Cart checkout vs direct renter request
        let isCartBooking = false;
        if (items !== undefined && items !== null) {
            if (!Array.isArray(items)) {
                return res.status(400).json({ message: 'Cart items must be provided as an array.' });
            }
            if (items.length === 0) {
                return res.status(400).json({ message: 'Cart items cannot be empty. Please include at least one item.' });
            }
            isCartBooking = true;
        }

        if (isCartBooking) {
            // Case 1: Bulk booking from Cart
            if (requiredDate !== undefined && requiredDate !== null) {
                if (!isValidDateString(requiredDate)) {
                    return res.status(400).json({ message: 'Invalid required date format.' });
                }
            }

            // Consistently validate maxBudget whenever supplied
            if (maxBudget !== undefined && maxBudget !== null) {
                const bNum = parseNonNegativeFiniteNumber(maxBudget);
                if (bNum === null) {
                    return res.status(400).json({ message: 'Rental budget must be a finite, non-negative number.' });
                }
            }

            for (const item of items) {
                if (!item || typeof item !== 'object') {
                    return res.status(400).json({ message: 'Invalid cart item entry.' });
                }

                // Price validation: must be a finite, non-negative number
                if (item.price === undefined || item.price === null) {
                    return res.status(400).json({ message: 'Item price is required.' });
                }
                const itemPrice = parseNonNegativeFiniteNumber(item.price);
                if (itemPrice === null) {
                    return res.status(400).json({ message: 'Item price must be a finite, non-negative number.' });
                }

                // Quantity validation: positive integer with reasonable upper limit
                const rawQty = item.quantity !== undefined && item.quantity !== null && (typeof item.quantity !== 'string' || item.quantity.trim() !== '')
                    ? Number(item.quantity)
                    : 1;
                if (!Number.isInteger(rawQty) || rawQty < 1 || rawQty > MAX_CART_QUANTITY) {
                    return res.status(400).json({
                        message: `Item quantity must be a positive integer between 1 and ${MAX_CART_QUANTITY}.`
                    });
                }

                // Date validation: validate item.date if supplied, otherwise fallback to requiredDate or today
                let itemDate = '';
                if (item.date !== undefined && item.date !== null && (typeof item.date !== 'string' || item.date.trim() !== '')) {
                    if (!isValidDateString(item.date)) {
                        return res.status(400).json({ message: 'Invalid rental date format for cart item.' });
                    }
                    itemDate = item.date.trim();
                } else if (requiredDate !== undefined && requiredDate !== null && typeof requiredDate === 'string' && requiredDate.trim() !== '') {
                    itemDate = requiredDate.trim();
                } else {
                    itemDate = new Date().toISOString().split('T')[0];
                }

                const itemLocation = typeof item.location === 'string' && item.location.trim()
                    ? item.location.trim().slice(0, 100)
                    : (typeof farmerLocation === 'string' && farmerLocation.trim()
                        ? farmerLocation.trim().slice(0, 100)
                        : 'Specified in request');

                const itemRef = {
                    name: String(item.name || 'Machinery Item').trim().slice(0, 100),
                    category: String(item.category || 'Agricultural Machinery').trim().slice(0, 50),
                    price: itemPrice,
                    priceUnit: typeof item.priceUnit === 'string' && item.priceUnit.trim()
                        ? item.priceUnit.trim().slice(0, 20)
                        : 'Day',
                    duration: String(item.duration || '1 Day').trim().slice(0, 50),
                    date: itemDate,
                    location: itemLocation,
                    quantity: rawQty,
                    listingId: null
                };

                // Listing ID validation if supplied
                const rawListingId = item.listingId !== undefined && item.listingId !== null
                    ? String(item.listingId).trim()
                    : '';
                if (rawListingId) {
                    if (!isValidObjectId(rawListingId)) {
                        return res.status(400).json({ message: `Invalid listing ID format for item "${itemRef.name}".` });
                    }
                    const foundListing = await listingsCollection.findOne({ _id: new ObjectId(rawListingId) });
                    if (!foundListing) {
                        return res.status(404).json({ message: `Referenced machinery listing not found for item "${itemRef.name}".` });
                    }
                    itemRef.listingId = foundListing._id.toString();
                    itemRef.verifiedListing = true;
                    itemRef.ownerId = foundListing.ownerId ? foundListing.ownerId.toString() : null;

                    // Authoritative pricing and priceUnit from verified listing
                    if (foundListing.rentalPrice === undefined || foundListing.rentalPrice === null) {
                        return res.status(400).json({ message: `Referenced machinery listing "${itemRef.name}" has no valid rental price.` });
                    }
                    const listingPrice = parseNonNegativeFiniteNumber(foundListing.rentalPrice);
                    if (listingPrice === null) {
                        return res.status(400).json({ message: `Referenced machinery listing "${itemRef.name}" has an invalid rental price.` });
                    }
                    itemRef.price = listingPrice;
                    if (foundListing.priceUnit) {
                        itemRef.priceUnit = String(foundListing.priceUnit).trim().slice(0, 20);
                    }
                }

                validatedItems.push(itemRef);
            }

            totalEstimatedBudget = validatedItems.reduce((acc, curr) => acc + (curr.price * curr.quantity), 0);
        } else {
            // Case 2: Direct single machine request from farmer.html form
            const cleanCategory = typeof machineryCategory === 'string' ? machineryCategory.trim().slice(0, 50) : '';
            const cleanMachinery = typeof specificMachinery === 'string' ? specificMachinery.trim().slice(0, 100) : '';
            const cleanDuration = typeof rentalDuration === 'string' ? rentalDuration.trim().slice(0, 50) : '';

            if (!cleanCategory || !cleanMachinery || !cleanDuration) {
                return res.status(400).json({ message: 'Missing required rental request details.' });
            }

            // Rental date validation
            if (!requiredDate || !isValidDateString(requiredDate)) {
                return res.status(400).json({ message: 'A valid required date is required.' });
            }
            const cleanDate = requiredDate.trim();

            // Budget validation: finite, non-negative number (renter's proposal)
            if (maxBudget === undefined || maxBudget === null) {
                return res.status(400).json({ message: 'Rental budget is required.' });
            }
            const budgetNum = parseNonNegativeFiniteNumber(maxBudget);
            if (budgetNum === null) {
                return res.status(400).json({ message: 'Rental budget must be a finite, non-negative number.' });
            }
            totalEstimatedBudget = budgetNum;

            const singleItem = {
                name: cleanMachinery,
                category: cleanCategory,
                price: budgetNum,
                priceUnit: 'Day',
                duration: cleanDuration,
                date: cleanDate,
                location: typeof farmerLocation === 'string' && farmerLocation.trim() ? farmerLocation.trim().slice(0, 100) : 'Local',
                quantity: 1,
                listingId: null
            };

            // Listing ID validation if supplied
            const rawListingId = listingId !== undefined && listingId !== null ? String(listingId).trim() : '';
            if (rawListingId) {
                if (!isValidObjectId(rawListingId)) {
                    return res.status(400).json({ message: 'Invalid listing ID format.' });
                }
                const foundListing = await listingsCollection.findOne({ _id: new ObjectId(rawListingId) });
                if (!foundListing) {
                    return res.status(404).json({ message: 'Referenced machinery listing not found.' });
                }
                singleItem.listingId = foundListing._id.toString();
                singleItem.verifiedListing = true;
                singleItem.ownerId = foundListing.ownerId ? foundListing.ownerId.toString() : null;
                if (foundListing.priceUnit) {
                    singleItem.priceUnit = String(foundListing.priceUnit).trim().slice(0, 20);
                }
            }

            validatedItems.push(singleItem);
        }

        const locationStr = typeof farmerLocation === 'string' && farmerLocation.trim()
            ? farmerLocation.trim().slice(0, 100)
            : (typeof preferredLocation === 'string' && preferredLocation.trim()
                ? preferredLocation.trim().slice(0, 100)
                : 'Not specified');

        const preferredRadiusStr = typeof preferredLocation === 'string' && preferredLocation.trim()
            ? preferredLocation.trim().slice(0, 100)
            : 'Anywhere';

        const requirementsStr = typeof additionalRequirements === 'string'
            ? additionalRequirements.trim().slice(0, 1000)
            : '';

        // Create the booking document
        const newRequest = {
            bookingRef,
            userId,
            renterName: contactName,
            renterPhone: contactPhone,
            renterEmail: contactEmail,
            location: locationStr,
            preferredRadius: preferredRadiusStr,
            additionalRequirements: requirementsStr,
            items: validatedItems,
            totalBudget: totalEstimatedBudget,
            status: 'pending', // initial status
            createdAt: new Date(),
            updatedAt: new Date()
        };

        const result = await requestsCollection.insertOne(newRequest);

        // If booking was from cart, clear the user's cart in backend
        if (isCartBooking) {
            await cartsCollection.updateOne(
                { userId },
                { $set: { items: [], updatedAt: new Date() } }
            );
        }

        return res.status(201).json({
            message: 'Rental request submitted and persisted successfully.',
            bookingRef,
            requestId: result.insertedId.toString(),
            request: {
                id: result.insertedId.toString(),
                bookingRef,
                renterName: contactName,
                renterPhone: contactPhone,
                items: validatedItems,
                totalBudget: totalEstimatedBudget,
                status: 'pending',
                createdAt: newRequest.createdAt
            }
        });

    } catch (error) {
        console.error('Rental Request Submission Error:', error);
        return res.status(500).json({ message: 'Failed to persist rental request.' });
    }
});

/**
 * GET /api/rentals/my-requests - Retrieve the authenticated user's submitted rental requests
 */
router.get('/my-requests', verifyAuth, async (req, res) => {
    try {
        const db = client.db('agri_rental');
        const requestsCollection = db.collection('rental_requests');
        const userId = req.user.id.toString();

        const requests = await requestsCollection
            .find({ userId })
            .sort({ createdAt: -1 })
            .toArray();

        return res.status(200).json({
            message: 'Rental requests retrieved successfully.',
            count: requests.length,
            requests: requests.map(r => ({
                id: r._id.toString(),
                bookingRef: r.bookingRef,
                renterName: r.renterName,
                renterPhone: r.renterPhone,
                location: r.location,
                items: r.items,
                totalBudget: r.totalBudget,
                status: r.status,
                createdAt: r.createdAt
            }))
        });
    } catch (error) {
        console.error('Get Rental Requests Error:', error);
        return res.status(500).json({ message: 'Failed to retrieve rental requests.' });
    }
});

/**
 * GET /api/rentals/owner-requests
 * Retrieve all incoming rental requests containing machinery owned by the authenticated owner.
 */
router.get('/owner-requests', verifyAuth, async (req, res) => {
    try {
        const db = client.db('agri_rental');
        const requestsCollection = db.collection('rental_requests');
        const listingsCollection = db.collection('listings');
        const ownerId = req.user.id.toString();

        // 1. Fetch all listing IDs belonging to this owner
        const ownerListings = await listingsCollection.find({ ownerId }).project({ _id: 1 }).toArray();
        const ownerListingIds = ownerListings.map(l => l._id.toString());

        // 2. Query rental_requests matching this owner directly via item.ownerId OR listingId in ownerListingIds
        const query = {
            $or: [
                { 'items.ownerId': ownerId },
                { 'items.listingId': { $in: ownerListingIds } }
            ]
        };

        const requests = await requestsCollection
            .find(query)
            .sort({ createdAt: -1 })
            .toArray();

        // 3. Filter items within each request to include only items belonging to this owner
        const responseData = requests.map(reqDoc => {
            const myItems = (reqDoc.items || []).filter(item => {
                const itemOwner = item.ownerId ? String(item.ownerId) : null;
                const itemListing = item.listingId ? String(item.listingId) : null;
                return itemOwner === ownerId || (itemListing && ownerListingIds.includes(itemListing));
            });

            return {
                id: reqDoc._id.toString(),
                bookingRef: reqDoc.bookingRef,
                renterName: reqDoc.renterName,
                renterPhone: reqDoc.renterPhone,
                renterEmail: reqDoc.renterEmail,
                location: reqDoc.location,
                preferredRadius: reqDoc.preferredRadius,
                additionalRequirements: reqDoc.additionalRequirements,
                totalBudget: reqDoc.totalBudget,
                status: reqDoc.status || 'pending',
                createdAt: reqDoc.createdAt,
                updatedAt: reqDoc.updatedAt,
                items: myItems
            };
        });

        return res.status(200).json({
            message: 'Incoming rental requests retrieved successfully.',
            count: responseData.length,
            requests: responseData
        });

    } catch (error) {
        console.error('Owner Rental Requests Retrieval Error:', error);
        return res.status(500).json({ message: 'Failed to retrieve incoming rental requests.' });
    }
});

/**
 * PATCH /api/rentals/requests/:id/status
 * Owner approves or rejects an incoming rental request.
 */
router.patch('/requests/:id/status', verifyAuth, async (req, res) => {
    try {
        const requestId = req.params.id;
        const { status } = req.body;
        const ownerId = req.user.id.toString();

        if (!isValidObjectId(requestId)) {
            return res.status(400).json({ message: 'Invalid rental request ID format.' });
        }

        // Only allow valid transitions: 'approved' or 'rejected'
        const VALID_STATUSES = ['approved', 'rejected'];
        if (!status || !VALID_STATUSES.includes(status)) {
            return res.status(400).json({ message: 'Invalid status. Status must be "approved" or "rejected".' });
        }

        const db = client.db('agri_rental');
        const requestsCollection = db.collection('rental_requests');
        const listingsCollection = db.collection('listings');

        const requestDoc = await requestsCollection.findOne({ _id: new ObjectId(requestId) });
        if (!requestDoc) {
            return res.status(404).json({ message: 'Rental request not found.' });
        }

        // Verify that this owner actually owns the machinery in this request
        const ownerListings = await listingsCollection.find({ ownerId }).project({ _id: 1 }).toArray();
        const ownerListingIds = ownerListings.map(l => l._id.toString());

        const isOwnerOfRequest = (requestDoc.items || []).some(item => {
            const itemOwner = item.ownerId ? String(item.ownerId) : null;
            const itemListing = item.listingId ? String(item.listingId) : null;
            return itemOwner === ownerId || (itemListing && ownerListingIds.includes(itemListing));
        });

        if (!isOwnerOfRequest) {
            return res.status(403).json({ message: 'Forbidden. You do not own the equipment referenced in this request.' });
        }

        // Prevent repeated decisions on requests that are no longer pending
        if (requestDoc.status !== 'pending') {
            return res.status(409).json({
                message: `This request has already been ${requestDoc.status}. Decisions cannot be altered.`,
                currentStatus: requestDoc.status
            });
        }

        // Persist status change
        const now = new Date();
        const updateResult = await requestsCollection.updateOne(
            { _id: new ObjectId(requestId), status: 'pending' },
            {
                $set: {
                    status,
                    updatedAt: now,
                    decisionBy: ownerId,
                    decisionAt: now
                }
            }
        );

        if (updateResult.modifiedCount === 0) {
            return res.status(409).json({ message: 'Status could not be updated. Request may have been modified concurrently.' });
        }

        return res.status(200).json({
            message: `Rental request has been ${status} successfully.`,
            requestId,
            status,
            updatedAt: now
        });

    } catch (error) {
        console.error('Rental Request Status Update Error:', error);
        return res.status(500).json({ message: 'Failed to update rental request status.' });
    }
});

module.exports = router;
