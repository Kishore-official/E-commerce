const { MongoClient } = require('mongodb');
const uri = process.env.MONGODB_URI || 'mongodb+srv://edwinswanith006:Edwin006@e-commerce.civeh16.mongodb.net/E-commerce?appName=E-commerce';

async function main() {
  console.log('Connecting...');
  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 15000 });
  try {
    await client.connect();
    console.log('Connected!');
    const db = client.db('E-commerce');
    const users = await db.collection('users').find({}, {
      projection: { email: 1, role: 1, firstName: 1, isActive: 1, passwordHash: 1 }
    }).toArray();
    console.log(`\nFound ${users.length} users:\n`);
    users.forEach(u => {
      const hasPw = u.passwordHash ? 'YES' : 'NO';
      console.log(`  ${u.email} | role: ${u.role} | active: ${u.isActive} | hasPassword: ${hasPw}`);
    });
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await client.close();
  }
}
main();
