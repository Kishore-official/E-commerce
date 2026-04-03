/**
 * Convert all prices from SAR to INR
 * Exchange rate: 1 SAR = 22.20 INR
 */

import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://edwinswanith006:Edwin006@e-commerce.civeh16.mongodb.net/E-commerce?appName=E-commerce';
const DB_NAME = process.env.MONGODB_DB_NAME || 'E-commerce';
const EXCHANGE_RATE = 22.2; // 1 SAR = 22.20 INR

interface Offer {
  _id: mongoose.Types.ObjectId;
  id: string;
  priceAmount: number;
  priceCurrency: string;
  compareAtPrice?: number | null;
}

async function convertPricesToINR() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const db = mongoose.connection.db;
    const offersCollection = db.collection('offers');

    // Find all offers with SAR currency
    const sarOffers = await offersCollection
      .find<Offer>({ priceCurrency: 'SAR' })
      .toArray();

    console.log(`📊 Found ${sarOffers.length} offers with SAR currency\n`);

    if (sarOffers.length === 0) {
      console.log('ℹ️  No offers to convert.');
      await mongoose.disconnect();
      return;
    }

    // Show sample conversions
    console.log('📋 Sample Conversions:');
    console.log('─'.repeat(80));
    sarOffers.slice(0, 5).forEach((offer) => {
      const oldPrice = (offer.priceAmount / 100).toFixed(2);
      const newPrice = ((offer.priceAmount * EXCHANGE_RATE) / 100).toFixed(2);
      console.log(
        `  ${oldPrice} SAR → ${newPrice} INR (${offer.priceAmount} → ${Math.round(offer.priceAmount * EXCHANGE_RATE)})`,
      );
    });
    console.log('─'.repeat(80));
    console.log('');

    // Update all offers
    console.log('🔄 Converting prices...');
    let updatedCount = 0;
    let errorCount = 0;

    for (const offer of sarOffers) {
      try {
        const newPriceAmount = Math.round(offer.priceAmount * EXCHANGE_RATE);
        const newCompareAtPrice = offer.compareAtPrice
          ? Math.round(offer.compareAtPrice * EXCHANGE_RATE)
          : null;

        await offersCollection.updateOne(
          { _id: offer._id },
          {
            $set: {
              priceAmount: newPriceAmount,
              priceCurrency: 'INR',
              ...(newCompareAtPrice !== null && { compareAtPrice: newCompareAtPrice }),
            },
          },
        );

        updatedCount++;
      } catch (error) {
        console.error(`❌ Error updating offer ${offer.id}:`, error);
        errorCount++;
      }
    }

    console.log('');
    console.log('✅ Conversion Complete!');
    console.log(`   Updated: ${updatedCount} offers`);
    if (errorCount > 0) {
      console.log(`   Errors: ${errorCount} offers`);
    }

    // Verify the conversion
    console.log('');
    console.log('🔍 Verifying conversion...');
    const inrOffers = await offersCollection.countDocuments({ priceCurrency: 'INR' });
    const remainingSarOffers = await offersCollection.countDocuments({ priceCurrency: 'SAR' });

    console.log(`   INR offers: ${inrOffers}`);
    console.log(`   Remaining SAR offers: ${remainingSarOffers}`);

    // Show price statistics
    const priceStats = await offersCollection
      .aggregate([
        { $match: { priceCurrency: 'INR' } },
        {
          $group: {
            _id: null,
            minPrice: { $min: '$priceAmount' },
            maxPrice: { $max: '$priceAmount' },
            avgPrice: { $avg: '$priceAmount' },
            count: { $sum: 1 },
          },
        },
      ])
      .toArray();

    if (priceStats.length > 0) {
      const stats = priceStats[0];
      console.log('');
      console.log('📊 Price Statistics (INR):');
      console.log(`   Min: ₹${(stats.minPrice / 100).toFixed(2)}`);
      console.log(`   Max: ₹${(stats.maxPrice / 100).toFixed(2)}`);
      console.log(`   Avg: ₹${(stats.avgPrice / 100).toFixed(2)}`);
    }

    await mongoose.disconnect();
    console.log('');
    console.log('✅ Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

convertPricesToINR();

