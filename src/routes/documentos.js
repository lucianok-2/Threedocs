const express = require('express');
const router = express.Router();
const documentController = require('../controllers/documentController');
const authMiddleware = require('../middleware/auth');
const { storage } = require('../firebase');
const bucket = storage.bucket();

// Aplicar middleware de autenticación a todas las rutas
router.use(authMiddleware);

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
router.get('/:id', authMiddleware, async (req, res) => {
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