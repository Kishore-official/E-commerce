/**
 * Migration script: Move product images from local filesystem to MongoDB (imageData field).
 * Updates the URL in each ProductImage document to use relative /api/v1/images/:id endpoint.
 *
 * Usage: npx ts-node -r tsconfig-paths/register src/database/migrate-images-to-mongodb.ts
 */
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import mongoose from 'mongoose';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

const MONGODB_URI = process.env.MONGODB_URI;
const UPLOADS_DIR = path.resolve(__dirname, '../../uploads/products');
const BATCH_SIZE = 100;

async function migrate() {
  if (!MONGODB_URI) {
    console.error('MONGODB_URI not set');
    process.exit(1);
  }

  console.log('Connecting to MongoDB...');
  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.db;
  const collection = db!.collection('product_images');

  // Find all images that do NOT already use the /api/v1/images/ endpoint
  const images = await collection
    .find({
      $or: [
        { url: { $regex: '/uploads/' } },
        { url: { $regex: 'localhost' } },
        { url: { $not: { $regex: '/api/v1/images/' } } },
      ],
    })
    .project({ _id: 1, id: 1, url: 1, mimeType: 1 })
    .toArray();

  console.log(`Found ${images.length} images to migrate`);
  console.log(`Uploads directory: ${UPLOADS_DIR}`);

  let migrated = 0;
  let alreadyHasData = 0;
  let failed = 0;
  let skipped = 0;

  for (let i = 0; i < images.length; i += BATCH_SIZE) {
    const batch = images.slice(i, i + BATCH_SIZE);
    const ops: any[] = [];

    for (const img of batch) {
      const imageId = img.id || img._id;

      // Check if this image already has imageData stored
      const hasData = await collection.findOne(
        { _id: img._id, imageData: { $exists: true, $ne: null } },
        { projection: { _id: 1 } },
      );

      if (hasData) {
        // Already has binary data, just update the URL to relative format
        ops.push({
          updateOne: {
            filter: { _id: img._id },
            update: { $set: { url: `/api/v1/images/${imageId}` } },
          },
        });
        alreadyHasData++;
        continue;
      }

      // Try to extract filename from URL
      let filename: string | null = null;

      // Match /uploads/products/filename or full URL with uploads path
      const urlMatch = img.url?.match(/\/uploads\/products\/(.+)$/);
      if (urlMatch) {
        filename = urlMatch[1];
      }

      if (!filename) {
        // Try to match just UUID.ext pattern in the URL
        const uuidMatch = img.url?.match(/([0-9a-f-]{36}\.[a-z]+)$/i);
        if (uuidMatch) {
          filename = uuidMatch[1];
        }
      }

      if (!filename) {
        console.warn(`  Cannot extract filename from URL: ${img.url}`);
        skipped++;
        continue;
      }

      const filePath = path.join(UPLOADS_DIR, filename);

      if (!fs.existsSync(filePath)) {
        console.warn(`  File not found: ${filename}`);
        failed++;
        continue;
      }

      const imageData = fs.readFileSync(filePath);
      const ext = path.extname(filename).toLowerCase();
      const mimeType =
        ext === '.png' ? 'image/png' :
        ext === '.webp' ? 'image/webp' :
        ext === '.gif' ? 'image/gif' :
        ext === '.avif' ? 'image/avif' :
        'image/jpeg';

      ops.push({
        updateOne: {
          filter: { _id: img._id },
          update: {
            $set: {
              imageData: new mongoose.mongo.Binary(imageData),
              mimeType,
              url: `/api/v1/images/${imageId}`,
            },
          },
        },
      });
    }

    if (ops.length > 0) {
      await collection.bulkWrite(ops);
      migrated += ops.filter(op => op.updateOne.update.$set.imageData).length;
      alreadyHasData += ops.filter(op => !op.updateOne.update.$set.imageData).length - alreadyHasData;
    }

    const progress = Math.min(i + BATCH_SIZE, images.length);
    console.log(`Progress: ${progress}/${images.length} (migrated: ${migrated}, url-fixed: ${alreadyHasData}, failed: ${failed}, skipped: ${skipped})`);
  }

  console.log('\n--- Migration Complete ---');
  console.log(`Total images found: ${images.length}`);
  console.log(`Migrated (file → MongoDB): ${migrated}`);
  console.log(`URL-only fix (had data): ${alreadyHasData}`);
  console.log(`Failed (file missing): ${failed}`);
  console.log(`Skipped (bad URL): ${skipped}`);

  // Verify: count images now using the API endpoint
  const apiImages = await collection.countDocuments({ url: { $regex: '^/api/v1/images/' } });
  const totalImages = await collection.countDocuments();
  console.log(`\nVerification: ${apiImages}/${totalImages} images now use /api/v1/images/ URLs`);

  await mongoose.disconnect();
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
