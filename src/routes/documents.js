const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { admin, db } = require('../firebase');
const { documentModel, DOCUMENT_TYPES } = require('../models/document');

// Configuración de multer para almacenamiento temporal
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // Límite de 10MB
  fileFilter: (req, file, cb) => {
    // Verificar tipos de archivo permitidos
    const filetypes = /jpeg|jpg|png|gif|pdf|doc|docx|xls|xlsx|dwg|dxf/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error("Error: Archivo no válido. Solo se permiten archivos de imagen, PDF, Office y CAD."));
  }
});

// Middleware para verificar token
function verificarToken(req, res, next) {
  const token = req.cookies.token || req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Token requerido' });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.usuario = decoded;
    next();
  } catch (error) {
    console.error('Error al verificar token:', error);
    return res.status(401).json({ error: 'Token inválido' });
  }
}

// Obtener todos los documentos
router.get('/', verificarToken, async (req, res) => {
  try {
    const documents = await documentModel.getAllDocuments();
    res.json(documents);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Obtener documentos por predio
router.get('/property/:propertyId', verificarToken, async (req, res) => {
  try {
    const { propertyId } = req.params;
    const documents = await documentModel.getDocumentsByProperty(propertyId);
    res.json(documents);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Obtener tipos de documentos
router.get('/types', verificarToken, (req, res) => {
  res.json(DOCUMENT_TYPES);
});

// Subir un nuevo documento
router.post('/upload', verificarToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No se ha subido ningún archivo' });
    }

    // Crear una referencia al bucket de Firebase Storage
    const bucket = admin.storage().bucket();
    
    // Ruta del archivo local
    const filePath = req.file.path;
    
    // Nombre del archivo en Firebase Storage
    const storageFileName = `documents/${Date.now()}_${req.file.originalname}`;
    
    // Subir archivo a Firebase Storage
    await bucket.upload(filePath, {
      destination: storageFileName,
      metadata: {
        contentType: req.file.mimetype,
      }
    });
    
    // Obtener URL pública del archivo
    const file = bucket.file(storageFileName);
    const [url] = await file.getSignedUrl({
      action: 'read',
      expires: '03-01-2500', // Fecha lejana para URL casi permanente
    });
    
    // Crear documento en Firestore
    const documentData = {
      fileName: req.file.originalname,
      fileType: req.file.mimetype,
      fileSize: req.file.size,
      fileUrl: url,
      storageFileName: storageFileName,
      documentType: req.body.documentType,
      propertyId: req.body.propertyId,
      description: req.body.description || '',
      uploadedBy: req.usuario.email,
    };
    
    const newDocument = await documentModel.addDocument(documentData);
    
    // Eliminar archivo temporal
    require('fs').unlinkSync(filePath);
    
    res.status(201).json(newDocument);
  } catch (error) {
    console.error('Error al subir documento:', error);
    res.status(500).json({ error: error.message });
  }
});

// Eliminar un documento
router.delete('/:documentId', verificarToken, async (req, res) => {
  try {
    const { documentId } = req.params;
    
    // Obtener documento para conocer su ruta en Storage
    const docRef = db.collection('documents').doc(documentId);
    const doc = await docRef.get();
    
    if (!doc.exists) {
      return res.status(404).json({ error: 'Documento no encontrado' });
    }
    
    const documentData = doc.data();
    
    // Eliminar archivo de Storage si existe la ruta
    if (documentData.storageFileName) {
      const bucket = admin.storage().bucket();
      await bucket.file(documentData.storageFileName).delete();
    }
    
    // Eliminar documento de Firestore
    await documentModel.deleteDocument(documentId);
    
    res.json({ id: documentId, deleted: true });
  } catch (error) {
    console.error('Error al eliminar documento:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;