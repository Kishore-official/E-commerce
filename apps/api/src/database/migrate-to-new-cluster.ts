/**
 * Migration script: Copy all collections from old MongoDB cluster to new cluster.
 * 
 * Usage: npx ts-node -r tsconfig-paths/register src/database/migrate-to-new-cluster.ts
 * 
 * Environment variables:
 *   OLD_MONGODB_URI - Source cluster (defaults to old cluster)
 *   NEW_MONGODB_URI - Destination cluster (defaults to new cluster)
 *   MONGODB_DB_NAME - Database name (defaults to 'E-commerce')
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import { MongoClient, GridFSBucket } from 'mongodb';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

const OLD_MONGODB_URI = process.env.OLD_MONGODB_URI || 
  'mongodb+srv://edwinswanith006:Edwin006@e-commerce.xwgdl7x.mongodb.net/E-commerce?appName=E-commerce';
const NEW_MONGODB_URI = process.env.NEW_MONGODB_URI || 
  'mongodb+srv://edwinswanith006:Edwin006@e-commerce.civeh16.mongodb.net/E-commerce?appName=E-commerce';
const DB_NAME = process.env.MONGODB_DB_NAME || 'E-commerce';

// Collections to migrate (excluding refresh_tokens - users will re-login)
const COLLECTIONS_TO_MIGRATE = [
  'users',
  'vendors',
  'vendor_staff',
  'products',
  'variants',
  'categories',
  'brands',
  'offers',
  'product_images',
  'product_attributes',
  'carts',
  'cart_items',
  'orders',
  'order_items',
  'order_status_history',
  'payments',
  'payment_attempts',
  'refunds',
  'shipments',
  'shipment_items',
  'shipment_tracking_events',
  'reviews',
  'review_eligibility',
  'review_media',
  'affiliate_links',
  'affiliate_clicks',
  'affiliate_commissions',
  'audit_logs',
  'platform_settings',
  'migrations',
  'sample',
];

// GridFS collections (handled separately)
const GRIDFS_COLLECTIONS = ['uploads.files', 'uploads.chunks'];

const BATCH_SIZE = 1000;

async function migrateCollection(
  oldClient: MongoClient,
  newClient: MongoClient,
  collectionName: string,
): Promise<{ source: number; target: number }> {
  const oldDb = oldClient.db(DB_NAME);
  const newDb = newClient.db(DB_NAME);
  const oldCollection = oldDb.collection(collectionName);
  const newCollection = newDb.collection(collectionName);

  // Get source count
  const sourceCount = await oldCollection.countDocuments();
  console.log(`  ${collectionName}: ${sourceCount} documents`);

  if (sourceCount === 0) {
    return { source: 0, target: 0 };
  }

  // Check if collection exists in target and has data
  const targetCount = await newCollection.countDocuments();
  if (targetCount > 0) {
    console.log(`  ⚠️  Warning: ${collectionName} already has ${targetCount} documents. Skipping.`);
    return { source: sourceCount, target: targetCount };
  }

  // Migrate in batches
  let migrated = 0;
  const cursor = oldCollection.find({});
  
  let batch: any[] = [];
  for await (const doc of cursor) {
    batch.push(doc);
    
    if (batch.length >= BATCH_SIZE) {
      await newCollection.insertMany(batch, { ordered: false });
      migrated += batch.length;
      console.log(`    Progress: ${migrated}/${sourceCount}`);
      batch = [];
    }
  }

  // Insert remaining documents
  if (batch.length > 0) {
    await newCollection.insertMany(batch, { ordered: false });
    migrated += batch.length;
  }

  const finalCount = await newCollection.countDocuments();
  console.log(`  ✅ Migrated ${migrated} documents (target now has ${finalCount})`);

  return { source: sourceCount, target: finalCount };
}

async function migrateGridFS(
  oldClient: MongoClient,
  newClient: MongoClient,
): Promise<{ source: number; target: number }> {
  const oldDb = oldClient.db(DB_NAME);
  const newDb = newClient.db(DB_NAME);
  
  const oldBucket = new GridFSBucket(oldDb, { bucketName: 'uploads' });
  const newBucket = new GridFSBucket(newDb, { bucketName: 'uploads' });

  // Get all files from source
  const files = await oldBucket.find({}).toArray();
  const sourceCount = files.length;
  console.log(`  GridFS uploads: ${sourceCount} files`);

  if (sourceCount === 0) {
    return { source: 0, target: 0 };
  }

  // Check if target has files
  const targetFiles = await newBucket.find({}).toArray();
  if (targetFiles.length > 0) {
    console.log(`  ⚠️  Warning: GridFS already has ${targetFiles.length} files. Skipping.`);
    return { source: sourceCount, target: targetFiles.length };
  }

  // Migrate each file
  let migrated = 0;
  for (const file of files) {
    try {
      // Download from source
      const downloadStream = oldBucket.openDownloadStream(file._id);
      const chunks: Buffer[] = [];
      
      await new Promise<void>((resolve, reject) => {
        downloadStream.on('data', (chunk) => chunks.push(chunk));
        downloadStream.on('end', resolve);
        downloadStream.on('error', reject);
      });

      // Upload to destination with same _id and metadata
      const opts: any = {
        metadata: file.metadata,
      };
      if ((file as any).contentType) {
        opts.contentType = (file as any).contentType;
      }
      const uploadStream = newBucket.openUploadStreamWithId(
        file._id,
        file.filename,
        opts,
      );

      await new Promise<void>((resolve, reject) => {
        uploadStream.on('finish', resolve);
        uploadStream.on('error', reject);
        uploadStream.end(Buffer.concat(chunks));
      });

      migrated++;
      if (migrated % 10 === 0) {
        console.log(`    Progress: ${migrated}/${sourceCount}`);
      }
    } catch (error) {
      console.error(`    ❌ Error migrating file ${file._id}:`, error);
    }
  }

  const finalCount = await newBucket.find({}).toArray().then(f => f.length);
  console.log(`  ✅ Migrated ${migrated} files (target now has ${finalCount})`);

  return { source: sourceCount, target: finalCount };
}

async function migrate() {
  console.log('=== MongoDB Cluster Migration ===\n');
  console.log(`Source: ${OLD_MONGODB_URI.replace(/\/\/[^@]+@/, '//***@')}`);
  console.log(`Target: ${NEW_MONGODB_URI.replace(/\/\/[^@]+@/, '//***@')}`);
  console.log(`Database: ${DB_NAME}\n`);

  let oldClient: MongoClient | null = null;
  let newClient: MongoClient | null = null;

  try {
    // Connect to both clusters
    console.log('Connecting to source cluster...');
    oldClient = new MongoClient(OLD_MONGODB_URI);
    await oldClient.connect();
    console.log('✅ Connected to source cluster\n');

    console.log('Connecting to target cluster...');
    newClient = new MongoClient(NEW_MONGODB_URI);
    await newClient.connect();
    console.log('✅ Connected to target cluster\n');

    // Get source collection counts
    const oldDb = oldClient.db(DB_NAME);
    const sourceCollections = await oldDb.listCollections().toArray();
    console.log(`Found ${sourceCollections.length} collections in source database\n`);

    // Migrate regular collections
    console.log('--- Migrating Regular Collections ---');
    const results: Record<string, { source: number; target: number }> = {};

    for (const collectionName of COLLECTIONS_TO_MIGRATE) {
      try {
        results[collectionName] = await migrateCollection(
          oldClient,
          newClient,
          collectionName,
        );
      } catch (error) {
        console.error(`  ❌ Error migrating ${collectionName}:`, error);
        results[collectionName] = { source: 0, target: 0 };
      }
    }

    // Migrate GridFS
    console.log('\n--- Migrating GridFS Collections ---');
    try {
      results['uploads'] = await migrateGridFS(oldClient, newClient);
    } catch (error) {
      console.error(`  ❌ Error migrating GridFS:`, error);
      results['uploads'] = { source: 0, target: 0 };
    }

    // Summary
    console.log('\n=== Migration Summary ===');
    let totalSource = 0;
    let totalTarget = 0;
    
    for (const [name, counts] of Object.entries(results)) {
      totalSource += counts.source;
      totalTarget += counts.target;
      const status = counts.source === counts.target ? '✅' : '⚠️';
      console.log(`${status} ${name}: ${counts.source} → ${counts.target}`);
    }

    console.log(`\nTotal documents: ${totalSource} → ${totalTarget}`);
    
    if (totalSource === totalTarget) {
      console.log('\n✅ Migration completed successfully!');
    } else {
      console.log(`\n⚠️  Migration completed with discrepancies. Please review.`);
    }

  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    if (oldClient) {
      await oldClient.close();
      console.log('\nClosed source connection');
    }
    if (newClient) {
      await newClient.close();
      console.log('Closed target connection');
    }
  }
}

migrate().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});

