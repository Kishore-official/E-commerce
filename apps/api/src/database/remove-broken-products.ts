import 'reflect-metadata';
import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const mongoUri = process.env.MONGODB_URI || 'mongodb+srv://edwinswanith006:Edwin006@e-commerce.civeh16.mongodb.net/?appName=E-commerce';
const mongoDbName = process.env.MONGODB_DB_NAME || 'E-commerce';

const BROKEN_SLUGS = ['amazon-basics-aa-alkaline-4pk', 'amazon-basics-4slot-charger'];

async function removeBrokenProducts() {
  console.log('Removing 2 broken products...\n');

  const client = new MongoClient(mongoUri);

  try {
    await client.connect();
    const db = client.db(mongoDbName);

    const broken = await db.collection('products').find({ slug: { $in: BROKEN_SLUGS } }).toArray();
    console.log(`Found ${broken.length} broken products\n`);

    for (const p of broken) {
      const pid = p.id;
      console.log(`Product: ${pid} | name: "${p.name}" | slug: ${p.slug}`);

      // Delete offers
      const oRes = await db.collection('offers').deleteMany({ productId: pid });
      console.log(`  Deleted ${oRes.deletedCount} offers`);

      // Delete variants
      const vRes = await db.collection('variants').deleteMany({ productId: pid });
      console.log(`  Deleted ${vRes.deletedCount} variants`);

      // Delete images (both UUID and ObjectId)
      const iRes = await db.collection('product_images').deleteMany({
        $or: [{ productId: pid }, { productId: p._id }],
      });
      console.log(`  Deleted ${iRes.deletedCount} images`);

      // Delete product
      const pRes = await db.collection('products').deleteOne({ id: pid });
      console.log(`  Deleted ${pRes.deletedCount} product\n`);
    }

    console.log('Done! Both broken products removed completely.');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('Connection closed');
  }
}

removeBrokenProducts().catch(console.error);
