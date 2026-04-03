import 'reflect-metadata';
import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const mongoUri = process.env.MONGODB_URI || 'mongodb+srv://edwinswanith006:Edwin006@e-commerce.civeh16.mongodb.net/?appName=E-commerce';
const mongoDbName = process.env.MONGODB_DB_NAME || 'E-commerce';

async function fixFeaturedProducts() {
  console.log('Starting featured products fix...\n');

  const client = new MongoClient(mongoUri);

  try {
    await client.connect();
    const db = client.db(mongoDbName);
    console.log('Connected to MongoDB\n');

    // Step 1: Unmark all currently featured offers
    const unmarkResult = await db.collection('offers').updateMany(
      { isFeatured: true },
      { $set: { isFeatured: false, updatedAt: new Date() } },
    );
    console.log(`Unmarked ${unmarkResult.modifiedCount} previously featured offers\n`);

    // Step 2: Find approved products that have images and active offers with price > 0
    const activeOffers = await db.collection('offers')
      .find({ status: 'active', priceAmount: { $gt: 0 } })
      .toArray();

    console.log(`Found ${activeOffers.length} active offers with price > 0`);

    // Get product IDs from these offers
    const offerProductIds = [...new Set(activeOffers.map((o) => o.productId))];

    // Find products that are approved and have names
    const products = await db.collection('products')
      .find({
        $or: [
          { id: { $in: offerProductIds } },
        ],
        status: 'approved',
        name: { $ne: '', $exists: true },
      })
      .toArray();

    console.log(`Found ${products.length} approved products with names\n`);

    // For each product, check if it has images
    const productsWithImages: Array<{ product: any; offer: any; imageCount: number }> = [];

    for (const product of products) {
      const productId = product.id;
      const productObjectId = product._id;

      // Check images (both UUID and ObjectId formats)
      const imageCount = await db.collection('product_images').countDocuments({
        $or: [
          { productId: productId },
          { productId: productObjectId },
        ],
      });

      if (imageCount > 0) {
        // Find the best offer for this product
        const bestOffer = activeOffers
          .filter((o) => o.productId === productId)
          .sort((a, b) => a.priceAmount - b.priceAmount)[0];

        if (bestOffer) {
          productsWithImages.push({ product, offer: bestOffer, imageCount });
        }
      }
    }

    console.log(`Found ${productsWithImages.length} products with images and active offers\n`);

    // Step 3: Pick 8 featured products - try to get a mix of categories
    // Group by category
    const byCategory = new Map<string, typeof productsWithImages>();
    for (const item of productsWithImages) {
      const cat = item.product.categoryId || 'none';
      if (!byCategory.has(cat)) byCategory.set(cat, []);
      byCategory.get(cat)!.push(item);
    }

    // Round-robin pick from each category
    const featured: typeof productsWithImages = [];
    const maxFeatured = 8;
    const categories = Array.from(byCategory.keys());

    let round = 0;
    while (featured.length < maxFeatured) {
      let addedAny = false;
      for (const cat of categories) {
        if (featured.length >= maxFeatured) break;
        const items = byCategory.get(cat)!;
        if (round < items.length) {
          featured.push(items[round]);
          addedAny = true;
        }
      }
      if (!addedAny) break;
      round++;
    }

    // Step 4: Mark selected offers as featured
    console.log('Setting featured offers:\n');
    for (const item of featured) {
      const offerId = item.offer.id || item.offer._id;
      await db.collection('offers').updateOne(
        { $or: [{ id: offerId }, { _id: item.offer._id }] },
        { $set: { isFeatured: true, updatedAt: new Date() } },
      );
      const priceDisplay = (item.offer.priceAmount / 100).toFixed(2);
      console.log(`  [${item.product.categoryId ? 'cat' : 'none'}] ${item.product.name} - INR ${priceDisplay} (${item.imageCount} images)`);
    }

    console.log(`\nMarked ${featured.length} offers as featured`);
    console.log('\nDone! Featured products should now show with images and prices.\n');

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('Connection closed');
  }
}

fixFeaturedProducts().catch(console.error);
