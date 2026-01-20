import clientPromise from './lib/db.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: 'Missing Session ID' });
  }

  try {
    const client = await clientPromise;
    const db = client.db('dsy-core');
    const collection = db.collection('sessions');

    const session = await collection.findOne({ _id: id });

    if (!session) {
      return res.status(404).json({ error: 'Session not found. Check the ID.' });
    }

    return res.status(200).json({ success: true, session });
  } catch (error) {
    console.error('Retrieve Error:', error);
    return res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
}
