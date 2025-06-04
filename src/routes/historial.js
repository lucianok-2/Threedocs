const express = require('express');
const router = express.Router();
const { db } = require('../firebase');
const jwt = require('jsonwebtoken'); // For verificarToken
require('dotenv').config(); // For process.env.JWT_SECRET in verificarToken

// Middleware para verificar token (copied from properties.js/documentos.js for consistency)
function verificarToken(req, res, next) {
  const token = req.cookies.token || req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Token requerido' });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.usuario = decoded; // Attach user info to request
    next();
  } catch (error) {
    console.error('Error al verificar token:', error);
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
}

router.use(verificarToken); // Apply auth to all history routes

// GET /api/historial - Fetch enriched history entries
router.get('/', async (req, res) => {
  try {
    // Basic pagination: limit, and lastVisible for cursor-based
    const limit = parseInt(req.query.limit) || 10;
    let query = db.collection('historial')
                  .where('userId', '==', req.usuario.uid) // Filter by current user's ID
                  .orderBy('timestamp', 'desc')
                  .limit(limit);

    if (req.query.lastVisible) {
      // For cursor-based pagination, client needs to send the timestamp of the last visible item
      // This requires storing the actual timestamp value, not just the ServerTimestamp placeholder
      // For simplicity in this step, we'll stick to basic limit,
      // or acknowledge this requires history entries to have resolved timestamps.
      // A simpler approach for now: use offset if Firestore supported it well,
      // but it doesn't for performance. So, we'll just use limit for now.
      // True cursor pagination would involve getting a doc snapshot for `startAfter`.
      // Example: const lastDocSnapshot = await db.collection('historial').doc(req.query.lastVisible).get();
      // if (lastDocSnapshot.exists) query = query.startAfter(lastDocSnapshot);
      // This is a placeholder for true cursor pagination.
      // For now, we'll use a simplified lastVisible based on timestamp if provided as a number
      // This assumes 'timestamp' field holds a queryable value.
      // Firestore server timestamps are objects, so they need to be converted or handled differently for cursors.
      // A practical approach would be to pass the ID of the last seen document and fetch it to use as a cursor.
      // However, the provided code snippet focuses on limit, so we will keep it simple.
    }

    const snapshot = await query.get();
    if (snapshot.empty) {
      return res.status(200).json([]);
    }

    const enrichedHistory = [];
    for (const doc of snapshot.docs) {
      const historyEntry = { id: doc.id, ...doc.data() };
      const enrichedEntry = { ...historyEntry };

      // Enrich with User Details (though it's current user, this structure is for completeness)
      // For history, the userId in the entry is the one who performed the action.
      // We are already filtering by req.usuario.uid, so userDetails might seem redundant
      // if we only show history for the logged-in user about their own actions.
      // However, if an admin could see other users' history, this would be useful.
      // For now, let's assume we are fetching the logged-in user's own history.
      if (historyEntry.userId) {
        try {
          // If we are strictly showing the current user's history, we can use req.usuario
          // or fetch from 'usuarios' collection if more details are needed than in the token.
          const userDoc = await db.collection('usuarios').doc(historyEntry.userId).get();
          if (userDoc.exists) {
            enrichedEntry.userDetails = { 
              email: userDoc.data().email, 
              // name: userDoc.data().nombre // Example if 'nombre' exists
            };
          } else {
            // If the user is the one making the request, and their own userDoc isn't found, it's odd.
            // But if viewing others' history, this makes sense.
            enrichedEntry.userDetails = { email: 'Usuario no encontrado en colección usuarios' };
          }
        } catch (userError) {
          console.error(`Error fetching user ${historyEntry.userId}:`, userError);
          enrichedEntry.userDetails = { email: 'Error al cargar usuario' };
        }
      }

      // Enrich with Entity Details
      if (historyEntry.entityId && historyEntry.entityType) {
        const collectionName = historyEntry.entityType === 'document' ? 'documentos' : 
                               (historyEntry.entityType === 'property' ? 'predios' : null);
        if (collectionName) {
          try {
            const entityDoc = await db.collection(collectionName).doc(historyEntry.entityId).get();
            if (entityDoc.exists) {
              if (historyEntry.entityType === 'document') {
                enrichedEntry.documentDetails = { 
                  originalName: entityDoc.data().originalName,
                  idPredio: entityDoc.data().idPredio, // This is the Firestore ID of the property
                  documentTitle: entityDoc.data().documentTitle 
                };
              } else if (historyEntry.entityType === 'property') {
                enrichedEntry.propertyDetails = { 
                  nombre: entityDoc.data().nombre, // Property name
                  idPredio: entityDoc.data().idPredio // User-defined folio/ID for the property
                };
              }
            } else {
              enrichedEntry[`${historyEntry.entityType}Details`] = { name: `${historyEntry.entityType} no encontrado/a` };
            }
          } catch (entityError) {
              console.error(`Error fetching ${historyEntry.entityType} ${historyEntry.entityId}:`, entityError);
              enrichedEntry[`${historyEntry.entityType}Details`] = { name: `Error al cargar ${historyEntry.entityType}` };
          }
        } else {
            enrichedEntry[`${historyEntry.entityType}Details`] = { name: `Tipo de entidad '${historyEntry.entityType}' no reconocido para enriquecimiento.` };
        }
      }
      enrichedHistory.push(enrichedEntry);
    }
    res.status(200).json(enrichedHistory);
  } catch (error) {
    console.error('Error fetching history:', error);
    res.status(500).json({ error: 'Error al obtener historial', details: error.message });
  }
});

module.exports = router;
