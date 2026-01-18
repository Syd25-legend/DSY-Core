import { openDB } from 'idb';

const DB_NAME = 'dsy-studio-db';
const DB_VERSION = 1;
const STORE_NAME = 'sessions';

// Initialize the database
async function getDB() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    },
  });
}

/**
 * Generate a unique session ID
 * Format: DSY-XXXXXX
 */
export function generateSessionId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let id = 'DSY-';
  for (let i = 0; i < 6; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}

/**
 * Save session data to IndexedDB
 */
export async function saveSession(sessionId, data) {
  try {
    const db = await getDB();
    await db.put(STORE_NAME, {
      id: sessionId,
      ...data,
      updatedAt: new Date().toISOString(),
    });
    return true;
  } catch (error) {
    console.error('Error saving session:', error);
    return false;
  }
}

/**
 * Load session data from IndexedDB
 */
export async function loadSession(sessionId) {
  try {
    const db = await getDB();
    const session = await db.get(STORE_NAME, sessionId);
    return session || null;
  } catch (error) {
    console.error('Error loading session:', error);
    return null;
  }
}

/**
 * Delete a session from IndexedDB
 */
export async function deleteSession(sessionId) {
  try {
    const db = await getDB();
    await db.delete(STORE_NAME, sessionId);
    return true;
  } catch (error) {
    console.error('Error deleting session:', error);
    return false;
  }
}

/**
 * Get all sessions from IndexedDB
 */
export async function getAllSessions() {
  try {
    const db = await getDB();
    return await db.getAll(STORE_NAME);
  } catch (error) {
    console.error('Error getting all sessions:', error);
    return [];
  }
}
