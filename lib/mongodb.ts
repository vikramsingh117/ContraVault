import { MongoClient, Db } from 'mongodb';

const options = {};

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

function getMongoUri(): string {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('Please add your Mongo URI to .env.local or environment variables');
  }
  return uri;
}

function getClientPromise(): Promise<MongoClient> {
  if (process.env.NODE_ENV === 'development') {
    // In development mode, use a global variable so that the value
    // is preserved across module reloads caused by HMR (Hot Module Replacement).
    let globalWithMongo = global as typeof globalThis & {
      _mongoClientPromise?: Promise<MongoClient>;
    };

    if (!globalWithMongo._mongoClientPromise) {
      const uri = getMongoUri();
      client = new MongoClient(uri, options);
      globalWithMongo._mongoClientPromise = client.connect();
      console.log('[MongoDB] Created new client connection in development');
    }
    return globalWithMongo._mongoClientPromise!;
  } else {
    // In production mode, it's best to not use a global variable.
    // Lazy initialization - only connect when first needed
    if (!clientPromise) {
      const uri = getMongoUri();
      client = new MongoClient(uri, options);
      clientPromise = client.connect();
      console.log('[MongoDB] Created new client connection in production');
    }
    return clientPromise;
  }
}

export async function getDatabase(): Promise<Db> {
  const client = await getClientPromise();
  const db = client.db('todos');
  console.log('[MongoDB] Database connection established');
  return db;
}

// Export function instead of calling it immediately to avoid module-load initialization
export default function getMongoClient() {
  return getClientPromise();
}
