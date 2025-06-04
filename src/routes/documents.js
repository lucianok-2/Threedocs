const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { db, admin, storage } = require('../firebase');
const jwt = require('jsonwebtoken');

// Middleware para verificar token
function verificarToken(req, res, next) {
  // Obtener token del header Authorization, query params o cookies
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1] || 
                req.query.token || 
                req.cookies.token;
  
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

// Aplicar middleware de verificación de token a todas las rutas
router.use(verificarToken);

// Configurar multer para almacenar archivos temporalmente
const upload = multer({
  storage: multer.diskStorage({
    destination: function (req, file, cb) {
      const tempDir = path.join(__dirname, '../temp');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      cb(null, tempDir);
    },
    filename: function (req, file, cb) {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, uniqueSuffix + path.extname(file.originalname));
    }
  }),
  limits: {
    fileSize: 10 * 1024 * 1024 // Límite de 10MB
  },
  fileFilter: function (req, file, cb) {
    // Permitir PDF, JPG, JPEG y otros formatos comunes
    const allowedMimes = [
      'application/pdf',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];
    
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de archivo no permitido. Solo se permiten PDF, imágenes y documentos de Office.'));
    }
  }
});

// Ruta para obtener los tipos de documentos
router.get('/types', async (req, res) => {
  try {
    const documentTypesSnapshot = await db.collection('document_types').get();
    const documentTypes = [];
    documentTypesSnapshot.forEach(doc => {
      documentTypes.push({
        id: doc.id,
        ...doc.data()
      });
    });
    res.json(documentTypes);
  } catch (error) {
    console.error('Error al obtener tipos de documento:', error);
    res.status(500).json({ error: 'Error al obtener tipos de documento' });
  }
});

// Ruta para subir un documento
router.post('/upload', upload.single('documentFile'), async (req, res) => {
  try {
    // Verificar que se haya subido un archivo
    if (!req.file) {
      return res.status(400).json({ error: 'No se ha subido ningún archivo' });
    }
    
    // Verificar que se hayan enviado todos los datos necesarios
    if (!req.body.documentTypeNameForUpload || !req.body.propertyId) {
      // Eliminar el archivo temporal
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'Faltan datos requeridos: documentTypeNameForUpload o propertyId' });
    }
    
    const receivedDocumentTypeName = req.body.documentTypeNameForUpload;

    // Verificar que el predio exista y pertenezca al usuario
    const predioRef = db.collection('predios').doc(req.body.propertyId);
    const predioDoc = await predioRef.get();
    
    if (!predioDoc.exists) {
      // Eliminar el archivo temporal
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ error: 'Predio no encontrado' });
    }
    
    const predioData = predioDoc.data();
    
    // Verificar que el predio pertenezca al usuario actual
    if (predioData.id_user !== req.usuario.uid) {
      // Eliminar el archivo temporal
      fs.unlinkSync(req.file.path);
      return res.status(403).json({ error: 'No tienes permiso para subir documentos a este predio' });
    }
    
    // Leer el archivo
    const fileBuffer = fs.readFileSync(req.file.path);
    
    // Generar hash SHA-256 del archivo
    const fileHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
    
    // Generar nombre único para el archivo
    const fileName = `${Date.now()}_${path.basename(req.file.originalname)}`;
    const filePath = `documentos/${req.usuario.uid}/${req.body.propertyId}/${fileName}`;
    
    // Subir archivo a Firebase Storage
    const bucket = admin.storage().bucket();
    const file = bucket.file(filePath);
    
    await file.save(fileBuffer, {
      metadata: {
        contentType: req.file.mimetype,
        metadata: {
          originalName: req.file.originalname,
          uploadedBy: req.usuario.uid,
          propertyId: req.body.propertyId,
          documentType: receivedDocumentTypeName // Store name here too
        }
      }
    });
    
    // Generar URL de descarga
    const [downloadURL] = await file.getSignedUrl({
      action: 'read',
      expires: '03-09-2491' // Fecha muy lejana para URL permanente
    });
    
    // Crear el documento en la base de datos
    const documentData = {
      nombre: receivedDocumentTypeName, // Document's own name is the type name
      id_predio: req.body.propertyId,
      id_user: req.usuario.uid, // from token middleware
      tipo_documento: receivedDocumentTypeName, // Store the NAME here
      fecha_subida: new Date(),
      // fecha_creacion is set by Firestore server timestamp or should be new Date()
      fecha_creacion: admin.firestore.FieldValue.serverTimestamp(),
      ruta_archivo: filePath,
      url_archivo: downloadURL,
      hash: req.body.fileHash || fileHash, // Prefer client-side hash if available
      tipo_archivo: req.file.mimetype,
      tamano: req.file.size,
      nombre_original: req.file.originalname,
      estado: 'completo', // Default state
      responsiblePerson: req.body.responsiblePerson || '', // Static field
      documentDescription: req.body.documentDescription || '' // Static field
    };

    // Populate additional_data with dynamic fields
    const additional_data = {};
    const knownFields = [
      'documentTypeNameForUpload', 'propertyId', 'documentFile', // Updated documentTypeId to documentTypeNameForUpload
      'responsiblePerson', 'documentDescription', 'fileHash', 
      'userId', 'uploadDate',
      'id_predio', 'tipo_documento' 
    ];
    
    // Add safety check for req.body
    if (req.body && typeof req.body === 'object') {
      for (const key in req.body) {
        if (Object.prototype.hasOwnProperty.call(req.body, key) && !knownFields.includes(key)) {
          if (!documentData.hasOwnProperty(key)) {
            additional_data[key] = req.body[key];
          }
        }
      }
    }
    documentData.additional_data = additional_data;
    
    const docRef = await db.collection('documentos').add(documentData);
    
    // Eliminar el archivo temporal
    fs.unlinkSync(req.file.path);
    
    res.status(201).json({
      _id: docRef.id,
      ...documentData
    });
  } catch (error) {
    console.error('Error al subir documento:', error);
    
    // Eliminar el archivo temporal si existe
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({ error: 'Error al subir el documento' });
  }
});

// Ruta para buscar documentos por filtros
router.get('/buscar', async (req, res) => {
  try {
    const { tipo_documento, id_predio } = req.query;
    
    let query = db.collection('documentos')
      .where('id_user', '==', req.usuario.uid);
    
    if (tipo_documento) {
      query = query.where('tipo_documento', '==', tipo_documento); // Removed parseInt
    }
    
    if (id_predio) {
      query = query.where('id_predio', '==', id_predio);
    }
    
    const snapshot = await query.get();
    const documentos = [];
    
    snapshot.forEach(doc => {
      documentos.push({
        _id: doc.id,
        ...doc.data()
      });
    });
    
    // Ordenar por fecha de subida (más recientes primero)
    documentos.sort((a, b) => {
      const dateA = a.fecha_subida ? a.fecha_subida.toDate() : new Date(0);
      const dateB = b.fecha_subida ? b.fecha_subida.toDate() : new Date(0);
      return dateB - dateA;
    });
    
    res.json(documentos);
  } catch (error) {
    console.error('Error al buscar documentos:', error);
    res.status(500).json({ error: 'Error al buscar documentos' });
  }
});

// Ruta para obtener un documento específico
router.get('/:id', async (req, res) => {
  try {
    const docRef = db.collection('documentos').doc(req.params.id);
    const doc = await docRef.get();
    
    if (!doc.exists) {
      return res.status(404).json({ error: 'Documento no encontrado' });
    }
    
    const documentData = doc.data();
    
    // Verificar que el documento pertenezca al usuario
    if (documentData.id_user !== req.usuario.uid) {
      return res.status(403).json({ error: 'No tienes permiso para acceder a este documento' });
    }
    
    // Si no tiene URL, generarla
    if (!documentData.url_archivo && documentData.ruta_archivo) {
      try {
        const bucket = admin.storage().bucket();
        const file = bucket.file(documentData.ruta_archivo);
        
        const [downloadURL] = await file.getSignedUrl({
          action: 'read',
          expires: '03-09-2491'
        });
        
        // Actualizar el documento con la URL
        await docRef.update({ url_archivo: downloadURL });
        documentData.url_archivo = downloadURL;
      } catch (urlError) {
        console.error('Error al generar URL:', urlError);
      }
    }
    
    res.json({
      _id: doc.id,
      ...documentData
    });
  } catch (error) {
    console.error('Error al obtener documento:', error);
    res.status(500).json({ error: 'Error al obtener el documento' });
  }
});

// Ruta para descargar un documento
router.get('/:id/download', async (req, res) => {
  try {
    const docRef = db.collection('documentos').doc(req.params.id);
    const doc = await docRef.get();
    
    if (!doc.exists) {
      return res.status(404).json({ error: 'Documento no encontrado' });
    }
    
    const documentData = doc.data();
    
    // Verificar que el documento pertenezca al usuario
    if (documentData.id_user !== req.usuario.uid) {
      return res.status(403).json({ error: 'No tienes permiso para descargar este documento' });
    }
    
    if (!documentData.ruta_archivo) {
      return res.status(404).json({ error: 'Archivo no encontrado' });
    }
    
    // Obtener el archivo desde Firebase Storage
    const bucket = admin.storage().bucket();
    const file = bucket.file(documentData.ruta_archivo);
    
    // Verificar que el archivo existe
    const [exists] = await file.exists();
    if (!exists) {
      return res.status(404).json({ error: 'Archivo no encontrado en el almacenamiento' });
    }
    
    // Configurar headers para descarga
    res.setHeader('Content-Disposition', `attachment; filename="${documentData.nombre_original || 'documento'}"`);
    res.setHeader('Content-Type', documentData.tipo_archivo || 'application/octet-stream');
    
    // Stream del archivo
    const stream = file.createReadStream();
    stream.pipe(res);
    
    stream.on('error', (error) => {
      console.error('Error al descargar archivo:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Error al descargar el archivo' });
      }
    });
    
  } catch (error) {
    console.error('Error al descargar documento:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Error al descargar el documento' });
    }
  }
});

// Ruta para eliminar un documento
router.delete('/:id', async (req, res) => {
  try {
    const docRef = db.collection('documentos').doc(req.params.id);
    const doc = await docRef.get();
    
    if (!doc.exists) {
      return res.status(404).json({ error: 'Documento no encontrado' });
    }
    
    const documentData = doc.data();
    
    // Verificar que el documento pertenezca al usuario
    if (documentData.id_user !== req.usuario.uid) {
      return res.status(403).json({ error: 'No tienes permiso para eliminar este documento' });
    }
    
    // Eliminar archivo de Firebase Storage
    if (documentData.ruta_archivo) {
      try {
        const bucket = admin.storage().bucket();
        const file = bucket.file(documentData.ruta_archivo);
        await file.delete();
      } catch (storageError) {
        console.error('Error al eliminar archivo de storage:', storageError);
        // Continuar con la eliminación del documento aunque falle el storage
      }
    }
    
    // Eliminar documento de Firestore
    await docRef.delete();
    
    res.json({ message: 'Documento eliminado exitosamente' });
  } catch (error) {
    console.error('Error al eliminar documento:', error);
    res.status(500).json({ error: 'Error al eliminar el documento' });
  }
});

// Ruta para obtener documentos de un predio específico
router.get('/predio/:predioId', async (req, res) => {
  try {
    const { predioId } = req.params;
    
    // Verificar que el predio pertenezca al usuario
    const predioRef = db.collection('predios').doc(predioId);
    const predioDoc = await predioRef.get();
    
    if (!predioDoc.exists) {
      return res.status(404).json({ error: 'Predio no encontrado' });
    }
    
    const predioData = predioDoc.data();
    if (predioData.id_user !== req.usuario.uid) {
      return res.status(403).json({ error: 'No tienes permiso para acceder a los documentos de este predio' });
    }
    
    // Obtener documentos del predio
    const snapshot = await db.collection('documentos')
      .where('id_predio', '==', predioId)
      .where('id_user', '==', req.usuario.uid)
      .get();
    
    const documentos = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      documentos.push({
        _id: doc.id,
        ...data,
        fecha_subida: data.fecha_subida ? data.fecha_subida.toDate() : null,
        fecha_creacion: data.fecha_creacion ? data.fecha_creacion.toDate() : null
      });
    });
    
    // Ordenar por fecha de subida (más recientes primero)
    documentos.sort((a, b) => {
      const dateA = a.fecha_subida || new Date(0);
      const dateB = b.fecha_subida || new Date(0);
      return dateB - dateA;
    });
    
    res.json(documentos);
  } catch (error) {
    console.error('Error al obtener documentos del predio:', error);
    res.status(500).json({ error: 'Error al obtener los documentos del predio' });
  }
});

// Ruta para actualizar un documento
router.put('/:id', async (req, res) => {
  try {
    const { nombre, estado } = req.body;
    const docRef = db.collection('documentos').doc(req.params.id);
    const doc = await docRef.get();
    
    if (!doc.exists) {
      return res.status(404).json({ error: 'Documento no encontrado' });
    }
    
    const documentData = doc.data();
    
    // Verificar que el documento pertenezca al usuario
    if (documentData.id_user !== req.usuario.uid) {
      return res.status(403).json({ error: 'No tienes permiso para modificar este documento' });
    }
    
    const updateData = {
      fecha_modificacion: new Date()
    };
    
    if (nombre) updateData.nombre = nombre;
    if (estado) updateData.estado = estado;
    
    await docRef.update(updateData);
    
    res.json({ message: 'Documento actualizado exitosamente' });
  } catch (error) {
    console.error('Error al actualizar documento:', error);
    res.status(500).json({ error: 'Error al actualizar el documento' });
  }
});

module.exports = router;