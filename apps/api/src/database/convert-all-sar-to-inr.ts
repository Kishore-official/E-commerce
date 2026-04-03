/**
 * Convert all SAR currency to INR across all MongoDB collections
 * Exchange rate: 1 SAR = 22.20 INR
 */

import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://edwinswanith006:Edwin006@e-commerce.civeh16.mongodb.net/E-commerce?appName=E-commerce';
const DB_NAME = process.env.MONGODB_DB_NAME || 'E-commerce';
const EXCHANGE_RATE = 22.2; // 1 SAR = 22.20 INR

async function convertAllSARToINR() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const db = mongoose.connection.db;

    // 1. Convert Orders Collection
    console.log('📦 Converting Orders Collection...');
    const ordersCollection = db.collection('orders');
    const sarOrders = await ordersCollection.find({ currency: 'SAR' }).toArray();
    console.log(`   Found ${sarOrders.length} orders with SAR currency`);

    let ordersUpdated = 0;
    for (const order of sarOrders) {
      await ordersCollection.updateOne(
        { _id: order._id },
        {
          $set: {
            currency: 'INR',
            subtotal: Math.round(order.subtotal * EXCHANGE_RATE),
            shippingTotal: Math.round(order.shippingTotal * EXCHANGE_RATE),
            taxTotal: Math.round(order.taxTotal * EXCHANGE_RATE),
            discountTotal: Math.round(order.discountTotal * EXCHANGE_RATE),
            grandTotal: Math.round(order.grandTotal * EXCHANGE_RATE),
          },
        },
      );
      ordersUpdated++;
    }
    console.log(`   ✅ Updated ${ordersUpdated} orders\n`);

    // 2. Convert Cart Items Collection
    console.log('🛒 Converting Cart Items Collection...');
    const cartItemsCollection = db.collection('cart_items');
    const sarCartItems = await cartItemsCollection.find({ currency: 'SAR' }).toArray();
    console.log(`   Found ${sarCartItems.length} cart items with SAR currency`);

    let cartItemsUpdated = 0;
    for (const item of sarCartItems) {
      await cartItemsCollection.updateOne(
        { _id: item._id },
        {
          $set: {
            currency: 'INR',
            priceSnapshot: Math.round(item.priceSnapshot * EXCHANGE_RATE),
          },
        },
      );
      cartItemsUpdated++;
    }
    console.log(`   ✅ Updated ${cartItemsUpdated} cart items\n`);

    // 3. Convert Payments Collection
    console.log('💳 Converting Payments Collection...');
    const paymentsCollection = db.collection('payments');
    const sarPayments = await paymentsCollection.find({ currency: 'SAR' }).toArray();
    console.log(`   Found ${sarPayments.length} payments with SAR currency`);

    let paymentsUpdated = 0;
    for (const payment of sarPayments) {
      await paymentsCollection.updateOne(
        { _id: payment._id },
        {
          $set: {
            currency: 'INR',
            amount: Math.round(payment.amount * EXCHANGE_RATE),
          },
        },
      );
      paymentsUpdated++;
    }
    console.log(`   ✅ Updated ${paymentsUpdated} payments\n`);

    // 4. Convert Order Items Collection
    console.log('📋 Converting Order Items Collection...');
    const orderItemsCollection = db.collection('order_items');
    const sarOrderItems = await orderItemsCollection.find({ currency: 'SAR' }).toArray();
    console.log(`   Found ${sarOrderItems.length} order items with SAR currency`);

    let orderItemsUpdated = 0;
    for (const item of sarOrderItems) {
      await orderItemsCollection.updateOne(
        { _id: item._id },
        {
          $set: {
            currency: 'INR',
            unitPrice: Math.round(item.unitPrice * EXCHANGE_RATE),
            totalPrice: Math.round(item.totalPrice * EXCHANGE_RATE),
          },
        },
      );
      orderItemsUpdated++;
    }
    console.log(`   ✅ Updated ${orderItemsUpdated} order items\n`);

    // Verification
    console.log('🔍 Verifying Conversion...');
    console.log('─'.repeat(80));
    
    const ordersINR = await ordersCollection.countDocuments({ currency: 'INR' });
    const ordersSAR = await ordersCollection.countDocuments({ currency: 'SAR' });
    console.log(`Orders: ${ordersINR} INR, ${ordersSAR} SAR`);

    const cartItemsINR = await cartItemsCollection.countDocuments({ currency: 'INR' });
    const cartItemsSAR = await cartItemsCollection.countDocuments({ currency: 'SAR' });
    console.log(`Cart Items: ${cartItemsINR} INR, ${cartItemsSAR} SAR`);

    const paymentsINR = await paymentsCollection.countDocuments({ currency: 'INR' });
    const paymentsSAR = await paymentsCollection.countDocuments({ currency: 'SAR' });
    console.log(`Payments: ${paymentsINR} INR, ${paymentsSAR} SAR`);

    const orderItemsINR = await orderItemsCollection.countDocuments({ currency: 'INR' });
    const orderItemsSAR = await orderItemsCollection.countDocuments({ currency: 'SAR' });
    console.log(`Order Items: ${orderItemsINR} INR, ${orderItemsSAR} SAR`);

    const offersCollection = db.collection('offers');
    const offersINR = await offersCollection.countDocuments({ priceCurrency: 'INR' });
    const offersSAR = await offersCollection.countDocuments({ priceCurrency: 'SAR' });
    console.log(`Offers: ${offersINR} INR, ${offersSAR} SAR`);

    console.log('─'.repeat(80));
    console.log('');

    const totalSAR = ordersSAR + cartItemsSAR + paymentsSAR + orderItemsSAR + offersSAR;
    if (totalSAR === 0) {
      console.log('✅ All collections successfully converted to INR!');
    } else {
      console.log(`⚠️  Warning: ${totalSAR} records still have SAR currency`);
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

convertAllSARToINR();

