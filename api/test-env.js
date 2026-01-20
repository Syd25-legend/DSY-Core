import { MongoClient } from 'mongodb';

// Test endpoint to check MongoDB connection
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  
  const uri = process.env.MONGODB_URI;
  
  if (!uri) {
    return res.status(500).json({ error: 'MONGODB_URI not set' });
  }
  
  try {
    const client = new MongoClient(uri);
    await client.connect();
    await client.db('dsy-core').command({ ping: 1 });
    await client.close();
    
    return res.status(200).json({
      success: true,
      message: 'MongoDB connection successful!'
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message,
      name: error.name
    });
  }
}
