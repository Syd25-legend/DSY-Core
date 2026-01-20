/**
 * Service for syncing and retrieving DSY sessions from the backend
 */

const API_BASE = '/api';

/**
 * Syncs the current session to the cloud
 * @param {string} sessionId - The DSY ID (e.g. DSY-XXXXXX)
 * @param {object} sessionData - The full session object (project, assets, history)
 */
export async function syncSessionToCloud(sessionId, sessionData) {
  try {
    const response = await fetch(`${API_BASE}/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: sessionId,
        ...sessionData
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || error.error || 'Failed to sync session');
    }

    return await response.json();
  } catch (error) {
    console.error('Session Sync Error:', error);
    throw error;
  }
}

/**
 * Retrieves a session from the cloud
 * @param {string} sessionId - The DSY ID to retrieve
 */
export async function retrieveSessionFromCloud(sessionId) {
  try {
    const response = await fetch(`${API_BASE}/get-session?id=${sessionId}`);

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Session not found. Please check the ID.');
      }
      const error = await response.json();
      throw new Error(error.message || error.error || 'Failed to retrieve session');
    }

    const data = await response.json();
    return data.session;
  } catch (error) {
    console.error('Session Retrieve Error:', error);
    throw error;
  }
}
