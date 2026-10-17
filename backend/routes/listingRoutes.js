const express = require('express');
const router = express.Router();
const { ObjectId } = require('mongodb');
const { client } = require('../config/db');
const { verifyOwner } = require('../middleware/ownerAuth');

// Helper to validate MongoDB ObjectId
const isValidObjectId = (id) => {
    return typeof id === 'string' && ObjectId.isValid(id) && new ObjectId(id).toString() === id;
};

// Valid options
const VALID_PRICE_UNITS = ['Hour', 'Day', 'Week', 'Month', 'Acre'];
const VALID_AVAILABILITY_STATUSES = ['immediate', 'seasonal', 'weekdays', 'weekends', 'custom'];
const VALID_MACHINERY_CATEGORIES = [
    'tractors', 'harvesters', 'cultivators', 'sowing',
    'sprayers', 'threshers', 'balers', 'earthmovers', 'other'
];

// Helper to validate common listing fields
const validateListingPayload = (body, isUpdate = false) => {
    const {
        ownerName, ownerPhone, ownerEmail, ownerLocation,
        machineName, ownerMachineryCategory, brandModel, manufacturingYear,
        machineDescription, rentalPrice, priceUnit, minRentalDuration,
        maxRentalDuration, machineLocation, availabilityStatus,
        availableFrom, availableUntil, machinePhotos
    } = body;

    // Check unsupported photo uploads
    if (machinePhotos !== undefined && (Array.isArray(machinePhotos) ? machinePhotos.length > 0 : Boolean(machinePhotos))) {
        return { error: "Photo upload is not yet supported. Please remove photos and try again." };
    }

    // Required field checks for creation or full updates
    if (!isUpdate) {
        if (!ownerName || !ownerPhone || !ownerEmail || !ownerLocation ||
            !machineName || !ownerMachineryCategory || !brandModel || manufacturingYear === undefined ||
            !machineDescription || rentalPrice === undefined || !priceUnit || !minRentalDuration ||
            !maxRentalDuration || !machineLocation || !availabilityStatus ||
            !availableFrom || !availableUntil) {
            return { error: "Missing required listing fields." };
        }
    }

    // Validate machineName
    if (machineName !== undefined) {
        if (typeof machineName !== 'string' || !machineName.trim() || machineName.trim().length > 100) {
            return { error: "Machine name must be a non-empty string under 100 characters." };
        }
    }

    // Validate brandModel
    if (brandModel !== undefined) {
        if (typeof brandModel !== 'string' || !brandModel.trim() || brandModel.trim().length > 100) {
            return { error: "Brand and model must be a non-empty string under 100 characters." };
        }
    }

    // Validate machinery category
    if (ownerMachineryCategory !== undefined) {
        if (typeof ownerMachineryCategory !== 'string' || !VALID_MACHINERY_CATEGORIES.includes(ownerMachineryCategory.trim())) {
            return { error: "Invalid machinery category." };
        }
    }

    // Validate manufacturingYear
    let parsedYear;
    if (manufacturingYear !== undefined) {
        parsedYear = Number(manufacturingYear);
        const currentYear = new Date().getFullYear();
        if (isNaN(parsedYear) || !Number.isInteger(parsedYear) || parsedYear < 1900 || parsedYear > currentYear + 1) {
            return { error: `Manufacturing year must be a valid integer between 1900 and ${currentYear + 1}.` };
        }
    }

    // Validate machineDescription
    if (machineDescription !== undefined) {
        if (typeof machineDescription !== 'string' || machineDescription.trim().length < 10 || machineDescription.trim().length > 2000) {
            return { error: "Machine description must be between 10 and 2000 characters." };
        }
    }

    // Validate rentalPrice
    let parsedPrice;
    if (rentalPrice !== undefined) {
        parsedPrice = Number(rentalPrice);
        if (isNaN(parsedPrice) || parsedPrice < 0 || parsedPrice > 1000000) {
            return { error: "Rental price must be a valid number between 0 and 1,000,000." };
        }
    }

    // Validate priceUnit
    if (priceUnit !== undefined) {
        if (typeof priceUnit !== 'string' || !VALID_PRICE_UNITS.includes(priceUnit.trim())) {
            return { error: `Price unit must be one of: ${VALID_PRICE_UNITS.join(', ')}.` };
        }
    }

    // Validate minRentalDuration & maxRentalDuration
    if (minRentalDuration !== undefined) {
        if (typeof minRentalDuration !== 'string' || !minRentalDuration.trim() || minRentalDuration.trim().length > 100) {
            return { error: "Minimum rental duration must be a non-empty string under 100 characters." };
        }
    }
    if (maxRentalDuration !== undefined) {
        if (typeof maxRentalDuration !== 'string' || !maxRentalDuration.trim() || maxRentalDuration.trim().length > 100) {
            return { error: "Maximum rental duration must be a non-empty string under 100 characters." };
        }
    }

    // Validate machineLocation
    if (machineLocation !== undefined) {
        if (typeof machineLocation !== 'string' || !machineLocation.trim() || machineLocation.trim().length > 200) {
            return { error: "Machine location must be a non-empty string under 200 characters." };
        }
    }

    // Validate availabilityStatus
    if (availabilityStatus !== undefined) {
        if (typeof availabilityStatus !== 'string' || !VALID_AVAILABILITY_STATUSES.includes(availabilityStatus.trim())) {
            return { error: `Availability status must be one of: ${VALID_AVAILABILITY_STATUSES.join(', ')}.` };
        }
    }

    // Validate date ranges
    let dateFrom;
    let dateUntil;
    if (availableFrom !== undefined) {
        dateFrom = new Date(availableFrom);
        if (isNaN(dateFrom.getTime())) {
            return { error: "Available from date must be a valid date." };
        }
    }
    if (availableUntil !== undefined) {
        dateUntil = new Date(availableUntil);
        if (isNaN(dateUntil.getTime())) {
            return { error: "Available until date must be a valid date." };
        }
    }
    if (dateFrom && dateUntil && dateFrom > dateUntil) {
        return { error: "Available from date cannot be after available until date." };
    }

    // Contact info validations (if provided)
    if (ownerName !== undefined) {
        if (typeof ownerName !== 'string' || !ownerName.trim() || ownerName.trim().length > 100) {
            return { error: "Owner name must be a non-empty string under 100 characters." };
        }
    }
    if (ownerPhone !== undefined) {
        if (typeof ownerPhone !== 'string' || !ownerPhone.trim() || ownerPhone.trim().length > 20) {
            return { error: "Owner phone must be a non-empty string under 20 characters." };
        }
    }
    if (ownerEmail !== undefined) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (typeof ownerEmail !== 'string' || !emailRegex.test(ownerEmail.trim()) || ownerEmail.trim().length > 255) {
            return { error: "Owner email must be a valid email address under 255 characters." };
        }
    }
    if (ownerLocation !== undefined) {
        if (typeof ownerLocation !== 'string' || !ownerLocation.trim() || ownerLocation.trim().length > 200) {
            return { error: "Owner location must be a non-empty string under 200 characters." };
        }
    }

    return {
        valid: true,
        cleaned: {
            ...(ownerName !== undefined && { ownerName: ownerName.trim() }),
            ...(ownerPhone !== undefined && { ownerPhone: ownerPhone.trim() }),
            ...(ownerEmail !== undefined && { ownerEmail: ownerEmail.trim().toLowerCase() }),
            ...(ownerLocation !== undefined && { ownerLocation: ownerLocation.trim() }),
            ...(machineName !== undefined && { machineName: machineName.trim() }),
            ...(ownerMachineryCategory !== undefined && { ownerMachineryCategory: ownerMachineryCategory.trim() }),
            ...(brandModel !== undefined && { brandModel: brandModel.trim() }),
            ...(parsedYear !== undefined && { manufacturingYear: parsedYear }),
            ...(machineDescription !== undefined && { machineDescription: machineDescription.trim() }),
            ...(parsedPrice !== undefined && { rentalPrice: parsedPrice }),
            ...(priceUnit !== undefined && { priceUnit: priceUnit.trim() }),
            ...(minRentalDuration !== undefined && { minRentalDuration: minRentalDuration.trim() }),
            ...(maxRentalDuration !== undefined && { maxRentalDuration: maxRentalDuration.trim() }),
            ...(machineLocation !== undefined && { machineLocation: machineLocation.trim() }),
            ...(availabilityStatus !== undefined && { availabilityStatus: availabilityStatus.trim() }),
            ...(dateFrom !== undefined && { availableFrom: dateFrom }),
            ...(dateUntil !== undefined && { availableUntil: dateUntil })
        }
    };
};

// 1. GET /api/listings/my-listings - Retrieve listings belonging to the authenticated owner
router.get('/my-listings', verifyOwner, async (req, res) => {
    try {
        const db = client.db("agri_rental");
        const listingsCollection = db.collection("listings");

        const ownerId = req.owner.id.toString();

        // Query by ownerId (supporting both string and ObjectId representation if any legacy)
        const query = {
            $or: [
                { ownerId: ownerId },
                ...(ObjectId.isValid(ownerId) ? [{ ownerId: new ObjectId(ownerId) }] : [])
            ]
        };

        const listings = await listingsCollection.find(query).sort({ createdAt: -1 }).toArray();

        return res.status(200).json({
            message: "Owner listings retrieved successfully.",
            count: listings.length,
            listings: listings.map(l => ({
                id: l._id,
                ownerId: l.ownerId,
                ownerName: l.ownerName,
                ownerPhone: l.ownerPhone,
                ownerEmail: l.ownerEmail,
                ownerLocation: l.ownerLocation,
                machineName: l.machineName,
                category: l.ownerMachineryCategory,
                brandModel: l.brandModel,
                manufacturingYear: l.manufacturingYear,
                description: l.machineDescription,
                rentalPrice: l.rentalPrice,
                priceUnit: l.priceUnit,
                minRentalDuration: l.minRentalDuration,
                maxRentalDuration: l.maxRentalDuration,
                machineLocation: l.machineLocation,
                availabilityStatus: l.availabilityStatus,
                availableFrom: l.availableFrom,
                availableUntil: l.availableUntil,
                createdAt: l.createdAt,
                updatedAt: l.updatedAt
            }))
        });

    } catch (error) {
        console.error("Owner Listings Retrieval Error:", error);
        return res.status(500).json({ message: "An unexpected error occurred while retrieving your listings." });
    }
});

// 2. POST /api/listings - Create a machine listing
router.post('/', verifyOwner, async (req, res) => {
    try {
        const validation = validateListingPayload(req.body, false);
        if (validation.error) {
            return res.status(400).json({ message: validation.error });
        }

        const db = client.db("agri_rental");
        const listingsCollection = db.collection("listings");

        const newListing = {
            ownerId: req.owner.id.toString(), // Store as normalized string
            ...validation.cleaned,
            createdAt: new Date(),
            updatedAt: new Date()
        };

        const result = await listingsCollection.insertOne(newListing);

        return res.status(201).json({
            message: "Machine listing created successfully.",
            listingId: result.insertedId
        });

    } catch (error) {
        console.error("Listing Creation Error:", error);
        return res.status(500).json({ message: "An unexpected error occurred while creating the listing." });
    }
});

// 3. PUT /api/listings/:id - Update an existing listing owned by authenticated owner
router.put('/:id', verifyOwner, async (req, res) => {
    try {
        const listingId = req.params.id;

        // Validate MongoDB ObjectId format
        if (!isValidObjectId(listingId)) {
            return res.status(400).json({ message: "Invalid listing ID format." });
        }

        const validation = validateListingPayload(req.body, true);
        if (validation.error) {
            return res.status(400).json({ message: validation.error });
        }

        // Must have at least one field to update
        if (Object.keys(validation.cleaned).length === 0) {
            return res.status(400).json({ message: "No valid fields provided for update." });
        }

        const db = client.db("agri_rental");
        const listingsCollection = db.collection("listings");

        const objectId = new ObjectId(listingId);
        const ownerId = req.owner.id.toString();

        // First find the listing
        const existingListing = await listingsCollection.findOne({ _id: objectId });

        if (!existingListing) {
            return res.status(404).json({ message: "Listing not found." });
        }

        // Check ownership - ensure listing belongs to authenticated owner
        const existingOwnerId = existingListing.ownerId ? existingListing.ownerId.toString() : null;
        if (existingOwnerId !== ownerId) {
            // Using 404 to avoid leaking existence of listings across owners, or 403
            return res.status(404).json({ message: "Listing not found." });
        }

        // Cross-field date validation if only one date is updated
        const finalAvailableFrom = validation.cleaned.availableFrom || existingListing.availableFrom;
        const finalAvailableUntil = validation.cleaned.availableUntil || existingListing.availableUntil;
        if (finalAvailableFrom && finalAvailableUntil && new Date(finalAvailableFrom) > new Date(finalAvailableUntil)) {
            return res.status(400).json({ message: "Available from date cannot be after available until date." });
        }

        // Strictly protect immutable fields: _id, ownerId, createdAt
        const updateDoc = {
            ...validation.cleaned,
            updatedAt: new Date()
        };
        delete updateDoc._id;
        delete updateDoc.ownerId;
        delete updateDoc.createdAt;

        await listingsCollection.updateOne(
            { _id: objectId },
            { $set: updateDoc }
        );

        return res.status(200).json({
            message: "Listing updated successfully.",
            listingId: listingId
        });

    } catch (error) {
        console.error("Listing Update Error:", error);
        return res.status(500).json({ message: "An unexpected error occurred while updating the listing." });
    }
});

// 4. DELETE /api/listings/:id - Delete an existing listing owned by authenticated owner
router.delete('/:id', verifyOwner, async (req, res) => {
    try {
        const listingId = req.params.id;

        // Validate MongoDB ObjectId format
        if (!isValidObjectId(listingId)) {
            return res.status(400).json({ message: "Invalid listing ID format." });
        }

        const db = client.db("agri_rental");
        const listingsCollection = db.collection("listings");

        const objectId = new ObjectId(listingId);
        const ownerId = req.owner.id.toString();

        const existingListing = await listingsCollection.findOne({ _id: objectId });

        if (!existingListing) {
            return res.status(404).json({ message: "Listing not found." });
        }

        const existingOwnerId = existingListing.ownerId ? existingListing.ownerId.toString() : null;
        if (existingOwnerId !== ownerId) {
            return res.status(404).json({ message: "Listing not found." });
        }

        const result = await listingsCollection.deleteOne({ _id: objectId });

        if (result.deletedCount === 0) {
            return res.status(404).json({ message: "Listing not found." });
        }

        return res.status(200).json({
            message: "Listing deleted successfully.",
            listingId: listingId
        });

    } catch (error) {
        console.error("Listing Deletion Error:", error);
        return res.status(500).json({ message: "An unexpected error occurred while deleting the listing." });
    }
});

// 5. GET /api/listings - Retrieve public listings (privacy-safe: no email, phone, location, or ownerId)
router.get('/', async (req, res) => {
    try {
        const db = client.db("agri_rental");
        const listingsCollection = db.collection("listings");

        // Fetch listings with a safety limit
        const listings = await listingsCollection.find({}).sort({ createdAt: -1 }).limit(50).toArray();

        // Privacy-safe mapping: excludes ownerId, ownerName, ownerEmail, ownerPhone, ownerLocation
        const publicListings = listings.map(listing => {
            return {
                id: listing._id,
                machineName: listing.machineName,
                category: listing.ownerMachineryCategory,
                brandModel: listing.brandModel,
                manufacturingYear: listing.manufacturingYear,
                description: listing.machineDescription,
                rentalPrice: listing.rentalPrice,
                priceUnit: listing.priceUnit,
                minRentalDuration: listing.minRentalDuration,
                maxRentalDuration: listing.maxRentalDuration,
                machineLocation: listing.machineLocation,
                availabilityStatus: listing.availabilityStatus,
                availableFrom: listing.availableFrom,
                availableUntil: listing.availableUntil,
                createdAt: listing.createdAt,
                updatedAt: listing.updatedAt
            };
        });

        return res.status(200).json({
            message: "Listings retrieved successfully.",
            count: publicListings.length,
            listings: publicListings
        });

    } catch (error) {
        console.error("Listing Retrieval Error:", error);
        return res.status(500).json({ message: "An unexpected error occurred while retrieving listings." });
    }
});

module.exports = router;
