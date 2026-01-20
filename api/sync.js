import clientPromise from './lib/db.js';

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id, project, assets, chatHistory } = req.body;

  if (!id) {
    return res.status(400).json({ error: 'Missing Session ID' });
  }

  // Check if MONGODB_URI is set
  if (!process.env.MONGODB_URI) {
    console.error('MONGODB_URI is not set');
    return res.status(500).json({ error: 'Database not configured', details: 'MONGODB_URI missing' });
  }

  try {
    console.log('Connecting to MongoDB for session:', id);
    const client = await clientPromise;
    const db = client.db('dsy-core');
    const collection = db.collection('sessions');

    const updateDoc = {
      $set: {
        lastActive: new Date(),
        project: project || {},
        assets: assets || [],
        chatHistory: chatHistory || [],
      },
    };

    // Upsert: Create if not exists, update if exists
    await collection.updateOne({ _id: id }, updateDoc, { upsert: true });
    console.log('Session synced successfully:', id);

    return res.status(200).json({ success: true, message: 'Session synced' });
  } catch (error) {
    console.error('Sync Error:', error.message);
    console.error('Full error:', error);
    return res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
}

