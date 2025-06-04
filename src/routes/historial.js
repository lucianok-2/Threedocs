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
    // Basic pagination limit
    const limit = parseInt(req.query.limit) || 10;
    const baseQuery = db.collection('historial')
                        .where('userId', '==', req.usuario.uid);
    let snapshot;
    let ordered = true;

    try {
      // Attempt ordered fetch (requires composite index)
      snapshot = await baseQuery.orderBy('timestamp', 'desc').limit(limit).get();
    } catch (err) {
      if (err.code === 9 && /index/i.test(err.message)) {
        console.warn('Composite index missing for historial query, falling back without order');
        ordered = false;
        snapshot = await baseQuery.limit(limit).get();
      } else {
        throw err;
      }
    }

    // Basic cursor pagination could be implemented here using startAfter if needed

    let docs = snapshot.docs;
    if (!ordered) {
      docs = docs.slice().sort((a, b) => {
        const ta = a.data().timestamp?.toMillis?.() || 0;
        const tb = b.data().timestamp?.toMillis?.() || 0;
        return tb - ta;
      });
    }

    if (docs.length === 0) {
      return res.status(200).json([]);
    }


    const enrichedHistory = [];
    for (const doc of snapshot.docs) {
      const historyEntry = { id: doc.id, ...doc.data() };
      const enrichedEntry = { ...historyEntry };

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
