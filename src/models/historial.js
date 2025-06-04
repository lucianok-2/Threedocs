// Example structure for src/models/historial.js
const { admin, db } = require('../firebase');

const historialCollection = db.collection('historial');

/**
 * Adds an entry to the history log.
 * @param {object} entryData - The data for the history entry.
 * @param {string} entryData.userId - The ID of the user performing the action.
 * @param {string} entryData.actionType - Type of action (e.g., 'UPLOAD_DOCUMENT').
 * @param {string} entryData.entityType - Type of entity (e.g., 'document', 'property').
 * @param {string} entryData.entityId - ID of the entity.
 * @param {object} [entryData.details] - Optional additional details about the event.
 * @returns {Promise<string|null>} The ID of the new history entry, or null on error.
 */
const addHistoryEntry = async (entryData) => {
  try {
    const { userId, actionType, entityType, entityId, details = {} } = entryData;

    if (!userId || !actionType || !entityType || !entityId) {
      console.error('Missing required fields for history entry:', entryData);
      throw new Error('Missing required fields for history entry.');
    }

    const historyDoc = {
      userId,
      actionType,
      entityType,
      entityId,
      details,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    };

    const docRef = await historialCollection.add(historyDoc);
    console.log('History entry added with ID:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('Error adding history entry:', error);
    // Depending on desired error handling, you might re-throw or return null/error indicator
    return null; 
  }
};

module.exports = { addHistoryEntry };
