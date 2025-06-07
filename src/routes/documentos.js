const express = require('express');
const router = express.Router();
const documentController = require('../controllers/documentController');

require('dotenv').config();
const { storage, db } = require('../firebase'); // Added db here
const bucket = storage.bucket();

// Middleware para verificar token
// Middleware para verificar el Firebase ID Token
async function verificarToken(req, res, next) {
  try {
    const bearer = req.headers.authorization;
    const token = bearer?.startsWith('Bearer ')
      ? bearer.split(' ')[1]
      : req.cookies.token;

    if (!token) {
      return res.status(401).json({ error: 'Token requerido' });
    }

    const decoded = await admin.auth().verifyIdToken(token);
    req.usuario = decoded;  // uid, email, customClaims...
    next();
  } catch (err) {
    console.error('Error al verificar ID Token de Firebase:', err);
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
}

// Aplicar middleware de autenticación a todas las rutas
router.use(verificarToken);

// Ruta para subir un documento
router.post('/upload', async (req, res) => {
  try {
    const file = req.files.file;
    const fileName = `${Date.now()}_${file.name}`;
    const fileUpload = bucket.file(`documents/${fileName}`);
    
    await fileUpload.save(file.data, {
      metadata: {
        contentType: file.mimetype
      }
    });
    
    // Guardar metadatos en tu base de datos
    // ...
    
    res.status(200).send('Archivo subido correctamente');
  } catch (error) {
    console.error(error);
    res.status(500).send('Error al subir archivo');
  }
});

// Ruta para obtener documentos de un predio
router.get('/predio/:idPredio', documentController.getDocumentsByProperty);

// Ruta para eliminar un documento
router.delete('/:id', documentController.deleteDocument);

// Ruta para descargar un documento
router.get('/download/:id', documentController.downloadDocument);

// Ruta para obtener un documento específico por ID
router.get('/:id', async (req, res) => {
    try {
        const docRef = db.collection('documentos').doc(req.params.id);
        const doc = await docRef.get();
        
        if (!doc.exists) {
            return res.status(404).json({ error: 'Documento no encontrado' });
        }
        
        const docData = doc.data();
        
        // Verificar que el documento pertenezca al usuario actual
        if (docData.id_user !== req.usuario.uid) {
            return res.status(403).json({ error: 'No tienes permiso para acceder a este documento' });
        }
        
        res.json({
            _id: doc.id,
            ...docData
        });
    } catch (error) {
        console.error('Error al obtener documento:', error);
        res.status(500).json({ error: 'Error al obtener documento' });
    }
});
module.exports = router;