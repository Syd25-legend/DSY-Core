import clientPromise from './lib/db.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id, project, assets, chatHistory } = req.body;

  if (!id) {
    return res.status(400).json({ error: 'Missing Session ID' });
  }

  try {
    const client = await clientPromise;
    const db = client.db('dsy-core'); // Or your preferred DB name
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

    return res.status(200).json({ success: true, message: 'Session synced' });
  } catch (error) {
    console.error('Sync Error:', error);
    return res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
}
