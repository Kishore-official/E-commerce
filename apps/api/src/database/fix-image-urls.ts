/**
 * One-time migration script to fix image URLs in MongoDB.
 *
 * Replaces absolute localhost URLs like:
 *   http://localhost:3000/api/v1/images/xxx
 *   http://localhost:3000/api/v1/files/xxx
 *   http://localhost:3000/uploads/xxx
 *
 * With relative paths:
 *   /api/v1/images/xxx
 *   /api/v1/files/xxx
 *   /uploads/xxx
 *
 * Usage: npx ts-node -r tsconfig-paths/register src/database/fix-image-urls.ts
 */

import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI =
  process.env.MONGODB_URI ||
  'mongodb+srv://edwinswanith006:Edwin006@e-commerce.civeh16.mongodb.net/E-commerce?appName=E-commerce';
const DB_NAME = process.env.MONGODB_DB_NAME || 'E-commerce';

// Pattern: any http(s)://host:port prefix before /api/ or /uploads/
const LOCALHOST_PATTERN = /^https?:\/\/[^/]+(\/(?:api|uploads)\/.*)/;

async function fixImageUrls() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    const db = client.db(DB_NAME);
    console.log(`Connected to MongoDB: ${DB_NAME}`);

    // Fix product_images collection (url field)
    const imagesCollection = db.collection('product_images');
    const images = await imagesCollection
      .find({ url: { $regex: /^https?:\/\// } })
      .toArray();

    let fixedImages = 0;
    for (const image of images) {
      const match = image.url.match(LOCALHOST_PATTERN);
      if (match) {
        const relativePath = match[1];
        await imagesCollection.updateOne(
          { _id: image._id },
          { $set: { url: relativePath } },
        );
        fixedImages++;
      }
    }
    console.log(`Fixed ${fixedImages}/${images.length} product_images URLs`);

    // Fix categories collection (imageUrl field)
    const categoriesCollection = db.collection('categories');
    const categories = await categoriesCollection
      .find({ imageUrl: { $regex: /^https?:\/\// } })
      .toArray();

    let fixedCategories = 0;
    for (const category of categories) {
      if (!category.imageUrl) continue;
      const match = category.imageUrl.match(LOCALHOST_PATTERN);
      if (match) {
        const relativePath = match[1];
        await categoriesCollection.updateOne(
          { _id: category._id },
          { $set: { imageUrl: relativePath } },
        );
        fixedCategories++;
      }
    }
    console.log(
      `Fixed ${fixedCategories}/${categories.length} category imageUrls`,
    );

    // Summary
    const totalFixed = fixedImages + fixedCategories;
    console.log(`\nDone! Fixed ${totalFixed} total URLs.`);
    if (totalFixed > 0) {
      console.log(
        'All absolute URLs have been converted to relative paths.',
      );
      console.log(
        'Images will now work from any domain/host.',
      );
    }
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

fixImageUrls();
