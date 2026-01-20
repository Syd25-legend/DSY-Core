import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;

let client = null;
let clientPromise = null;

async function getClient() {
  if (clientPromise) {
    return clientPromise;
  }
  
  if (!uri) {
    throw new Error('MONGODB_URI environment variable is not set');
  }
  
  client = new MongoClient(uri);
  clientPromise = client.connect();
  
  return clientPromise;
}

export default getClient();

