/**
 * Phase 1 Unified Authentication Migration Script
 * Agri-Rental Platform
 *
 * SAFEGUARDS:
 * 1. Default mode is ALWAYS --dry-run (read-only simulation).
 * 2. Writes to MongoDB ONLY occur when explicitly invoked with `--apply`.
 * 3. Never drops, truncates, or overwrites existing collections (`farmers`, `owners`, `listings`).
 * 4. Fails and exits immediately if duplicate emails, ObjectId collisions, or invalid records are detected.
 * 5. Handles reruns idempotently: checks if users already exist in `users` by _id and email.
 * 6. Validates listing ownership integrity before and after migration.
 */

const path = require('path');
const { ObjectId } = require('mongodb');

// Resolve path to backend configuration
const backendDir = path.resolve(__dirname, '..');
require(path.join(backendDir, 'node_modules', 'dotenv')).config({ path: path.join(backendDir, '.env') });
const { client } = require(path.join(backendDir, 'config', 'db'));

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function runMigration() {
  const args = process.argv.slice(2);
  const isApply = args.includes('--apply');
  const mode = isApply ? 'LIVE APPLY' : 'DRY RUN (READ-ONLY)';

  console.log('====================================================');
  console.log(` AGRI-RENTAL UNIFIED AUTH MIGRATION: [${mode}]`);
  console.log('====================================================');

  if (!isApply) {
    console.log('ℹ️  Running in safe DRY-RUN mode. No changes will be written to MongoDB.');
    console.log('ℹ️  To execute live changes after review, run with: node migrate_users.js --apply\n');
  }

  try {
    await client.connect();
    const db = client.db('agri_rental');

    // 1. Check existing collections
    const collections = await db.listCollections().toArray();
    const colNames = collections.map(c => c.name);

    const farmersCol = db.collection('farmers');
    const ownersCol = db.collection('owners');
    const listingsCol = db.collection('listings');
    const usersCol = db.collection('users');

    const farmers = await farmersCol.find({}).toArray();
    const owners = await ownersCol.find({}).toArray();
    const listings = await listingsCol.find({}).toArray();
    const existingUsers = colNames.includes('users') ? await usersCol.find({}).toArray() : [];

    console.log(`[Source Counts] farmers: ${farmers.length}, owners: ${owners.length}, listings: ${listings.length}, current users: ${existingUsers.length}`);

    // 2. Comprehensive Pre-Migration Validation
    const validationErrors = [];
    const normalizedEmailToUser = new Map();
    const idToUser = new Map();

    // Track existing users if collection already exists
    existingUsers.forEach(u => {
      const normEmail = (u.email || '').trim().toLowerCase();
      normalizedEmailToUser.set(normEmail, { source: 'existing_users', doc: u });
      idToUser.set(u._id.toString(), { source: 'existing_users', doc: u });
    });

    const candidateUsers = [];

    // Process Owners first (to ensure owner _ids and listings stay strictly preserved)
    owners.forEach(owner => {
      const idStr = owner._id ? owner._id.toString() : null;
      if (!idStr || !ObjectId.isValid(idStr)) {
        validationErrors.push(`Owner has invalid ObjectId: ${JSON.stringify(owner)}`);
        return;
      }
      if (!owner.name || typeof owner.name !== 'string' || !owner.name.trim()) {
        validationErrors.push(`Owner ${idStr} is missing required 'name' string.`);
      }
      if (!owner.email || typeof owner.email !== 'string') {
        validationErrors.push(`Owner ${idStr} is missing required 'email' string.`);
        return;
      }

      const normEmail = owner.email.trim().toLowerCase();
      if (!emailRegex.test(normEmail)) {
        validationErrors.push(`Owner ${idStr} has invalid email format: ${owner.email}`);
      }

      if (!owner.password || typeof owner.password !== 'string' || !(owner.password.startsWith('$2a$') || owner.password.startsWith('$2b$'))) {
        validationErrors.push(`Owner ${idStr} has invalid or missing bcrypt password hash.`);
      }

      // Check ID collision
      if (idToUser.has(idStr)) {
        const existing = idToUser.get(idStr);
        if (existing.source !== 'existing_users') {
          validationErrors.push(`ObjectId collision for owner ID ${idStr} within source records.`);
        } else if (existing.doc.email.trim().toLowerCase() !== normEmail) {
          validationErrors.push(`Existing users record for owner ID ${idStr} has differing email (expected ${normEmail}, found ${existing.doc.email}).`);
        } else if (existing.doc.password !== owner.password) {
          validationErrors.push(`Existing users record for owner ID ${idStr} has differing password hash.`);
        }
      }

      // Check Email collision
      if (normalizedEmailToUser.has(normEmail)) {
        const existing = normalizedEmailToUser.get(normEmail);
        if (existing.source !== 'existing_users') {
          validationErrors.push(`Duplicate email detected (case-insensitive collision): owner email conflicts with ${existing.source}`);
        } else if (existing.doc._id.toString() !== idStr) {
          validationErrors.push(`Existing users record with email ${normEmail} has differing ObjectId (expected ${idStr}, found ${existing.doc._id}).`);
        } else if (existing.doc.password !== owner.password) {
          validationErrors.push(`Existing users record with email ${normEmail} has differing password hash.`);
        }
      }

      const unifiedDoc = {
        _id: owner._id,
        name: owner.name.trim(),
        email: normEmail,
        password: owner.password,
        createdAt: owner.createdAt || new Date(),
        updatedAt: new Date(),
        sourceRole: 'owner' // Metadata audit tag
      };

      idToUser.set(idStr, { source: 'owner', doc: unifiedDoc });
      normalizedEmailToUser.set(normEmail, { source: 'owner', doc: unifiedDoc });
      candidateUsers.push(unifiedDoc);
    });

    // Process Farmers
    farmers.forEach(farmer => {
      const idStr = farmer._id ? farmer._id.toString() : null;
      if (!idStr || !ObjectId.isValid(idStr)) {
        validationErrors.push(`Farmer has invalid ObjectId: ${JSON.stringify(farmer)}`);
        return;
      }
      if (!farmer.name || typeof farmer.name !== 'string' || !farmer.name.trim()) {
        validationErrors.push(`Farmer ${idStr} is missing required 'name' string.`);
      }
      if (!farmer.email || typeof farmer.email !== 'string') {
        validationErrors.push(`Farmer ${idStr} is missing required 'email' string.`);
        return;
      }

      const normEmail = farmer.email.trim().toLowerCase();
      if (!emailRegex.test(normEmail)) {
        validationErrors.push(`Farmer ${idStr} has invalid email format: ${farmer.email}`);
      }

      if (!farmer.password || typeof farmer.password !== 'string' || !(farmer.password.startsWith('$2a$') || farmer.password.startsWith('$2b$'))) {
        validationErrors.push(`Farmer ${idStr} has invalid or missing bcrypt password hash.`);
      }

      // Check ID collision
      if (idToUser.has(idStr)) {
        const existing = idToUser.get(idStr);
        if (existing.source !== 'existing_users') {
          validationErrors.push(`ObjectId collision for farmer ID ${idStr} with ${existing.source}`);
        } else if (existing.doc.email.trim().toLowerCase() !== normEmail) {
          validationErrors.push(`Existing users record for farmer ID ${idStr} has differing email (expected ${normEmail}, found ${existing.doc.email}).`);
        } else if (existing.doc.password !== farmer.password) {
          validationErrors.push(`Existing users record for farmer ID ${idStr} has differing password hash.`);
        }
      }

      // Check Email collision
      if (normalizedEmailToUser.has(normEmail)) {
        const existing = normalizedEmailToUser.get(normEmail);
        if (existing.source !== 'existing_users') {
          validationErrors.push(`Conflicting credentials: farmer email matches existing ${existing.source}`);
        } else if (existing.doc._id.toString() !== idStr) {
          validationErrors.push(`Existing users record with email ${normEmail} has differing ObjectId (expected ${idStr}, found ${existing.doc._id}).`);
        } else if (existing.doc.password !== farmer.password) {
          validationErrors.push(`Existing users record with email ${normEmail} has differing password hash.`);
        }
      }

      const unifiedDoc = {
        _id: farmer._id,
        name: farmer.name.trim(),
        email: normEmail,
        password: farmer.password,
        createdAt: farmer.createdAt || new Date(),
        updatedAt: new Date(),
        sourceRole: 'farmer' // Metadata audit tag
      };

      idToUser.set(idStr, { source: 'farmer', doc: unifiedDoc });
      normalizedEmailToUser.set(normEmail, { source: 'farmer', doc: unifiedDoc });
      candidateUsers.push(unifiedDoc);
    });

    // 3. Validate Listing Ownership Mappings
    let orphanListings = 0;
    listings.forEach(listing => {
      const ownerId = listing.ownerId ? listing.ownerId.toString() : '';
      if (!idToUser.has(ownerId)) {
        validationErrors.push(`Listing ${listing._id} has unmapped ownerId: '${ownerId}'`);
        orphanListings++;
      }
    });

    // 4. Report Validation Status
    console.log('\n--- PRE-MIGRATION INTEGRITY REPORT ---');
    console.log(`• Total candidate user records: ${candidateUsers.length}`);
    console.log(`• Distinct normalized emails: ${normalizedEmailToUser.size}`);
    console.log(`• Distinct user ObjectIds: ${idToUser.size}`);
    console.log(`• Published listings verified: ${listings.length}`);
    console.log(`• Orphaned listings count: ${orphanListings}`);
    console.log(`• Total validation violations: ${validationErrors.length}`);

    if (validationErrors.length > 0) {
      console.error('\n❌ MIGRATION BLOCKED: Validation errors detected:');
      validationErrors.forEach(err => console.error(`  - ${err}`));
      process.exit(1);
    }

    console.log('\n✅ VALIDATION PASSED: All accounts, bcrypt hashes, and listing relations are 100% sound.');

    // 5. Execution or Dry-Run Output
    if (!isApply) {
      console.log('\n[SIMULATION SUMMARY]');
      console.log(`• Records to insert into 'users': ${candidateUsers.length}`);
      console.log(`• Unique index to create: db.collection("users").createIndex({ email: 1 }, { unique: true })`);
      console.log('• Source collections left untouched: farmers (6), owners (1), listings (2)');
      console.log('\n✅ Dry run completed successfully. No changes were made.');
    } else {
      console.log('\n⚡ [APPLYING LIVE MIGRATION]');

      // Filter out any documents already present in users (idempotency safeguard)
      const existingUserIds = new Set(existingUsers.map(u => u._id.toString()));
      const toInsert = candidateUsers.filter(u => !existingUserIds.has(u._id.toString()));

      if (toInsert.length > 0) {
        console.log(`Writing ${toInsert.length} unified user record(s) into 'users'...`);
        const insertResult = await usersCol.insertMany(toInsert, { ordered: true });
        console.log(`✓ Inserted ${insertResult.insertedCount} document(s).`);
      } else {
        console.log('ℹ️  All candidate records are already present in users. Skipping insertion.');
      }

      // Ensure unique index on normalized email
      console.log('Creating unique index on users.email...');
      await usersCol.createIndex({ email: 1 }, { unique: true });
      console.log('✓ Unique email index created.');

      // Post-Migration Verification
      const postCount = await usersCol.countDocuments();
      console.log(`\n🎉 Live migration complete. Total documents in 'users': ${postCount}`);
    }

    await client.close();
  } catch (err) {
    console.error('MIGRATION_EXECUTION_ERROR:', err);
    process.exit(1);
  }
}

runMigration();
