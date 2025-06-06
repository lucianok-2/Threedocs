const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { db, admin, storage } = require('../firebase');
const jwt = require('jsonwebtoken');
const { addHistoryEntry } = require('../models/historial.js');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const os = require('os');

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

// Ruta para procesar documentos con IA (Gemini)
router.post('/process-ai', upload.single('documentFile'), async (req, res) => {
  const tempFilePath = req.file ? req.file.path : null;

  try {
    // 1. Validar inputs
    if (!req.file) {
      return res.status(400).json({ error: 'No se ha subido ningún archivo (documentFile es requerido).' });
    }

    if (req.file.mimetype !== 'application/pdf') {
      return res.status(400).json({ error: 'El archivo debe ser un PDF.' });
    }

    const { fieldsToCollect: fieldsToCollectJSON, documentTypeName } = req.body;

    if (!fieldsToCollectJSON || !documentTypeName) {
      return res.status(400).json({ error: 'Los campos fieldsToCollect (JSON string array) y documentTypeName son requeridos.' });
    }

    let fieldsToCollect;
    try {
      fieldsToCollect = JSON.parse(fieldsToCollectJSON);
      if (!Array.isArray(fieldsToCollect) || !fieldsToCollect.every(item => typeof item === 'string')) {
        throw new Error('fieldsToCollect debe ser un array de strings.');
      }
    } catch (parseError) {
      return res.status(400).json({ error: 'fieldsToCollect no es un JSON string array válido.' });
    }

    // 2. Verificar API Key de Gemini
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error('GEMINI_API_KEY no está configurada en las variables de entorno.');
      return res.status(500).json({ error: 'Error de configuración del servidor: API Key no disponible.' });
    }

    // 3. Inicializar GoogleGenerativeAI
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });

    // 4. Preparar la parte del archivo para Gemini
    let pdfFilePart;
    try {
      const dataBuffer = fs.readFileSync(tempFilePath);
      pdfFilePart = {
        inlineData: {
          data: dataBuffer.toString('base64'),
          mimeType: 'application/pdf'
        }
      };
    } catch (fileReadError) {
      console.error('Error al leer el archivo PDF temporal:', fileReadError);
      return res.status(500).json({ error: 'Error al procesar el archivo PDF.' });
    }

    // 5. Construir el prompt para Gemini
    let prompt = `Eres un asistente experto en extracción de datos de documentos PDF.\n`;
    prompt += `Analiza el siguiente documento PDF (tipo de documento: ${documentTypeName || 'No especificado'}). \n`;
    prompt += `Tu tarea es extraer la información correspondiente a los siguientes campos: ${fieldsToCollect.map(f => `"${f}"`).join(', ')}.\n`;
    prompt += `Responde ÚNICAMENTE con un objeto JSON. Las claves del JSON deben ser exactamente los nombres de los campos solicitados. \n`;
    prompt += `Si un campo no se encuentra en el documento o no aplica, el valor para esa clave en el JSON debe ser null.\n`;
    prompt += `No incluyas explicaciones adicionales ni texto introductorio, solo el objeto JSON puro.\n`;
    prompt += `Objeto JSON resultante:
`;

    // 6. Llamar a la API de Gemini
    let geminiResponseText;
    const generationConfig = {
      temperature: 0.2,
      topK: 1,
      topP: 1,
      maxOutputTokens: 2048,
      // responseMimeType: "application/json", // Esto se puede habilitar si el modelo lo soporta y queremos forzar JSON
    };

    try {
      const result = await model.generateContent({
        contents: [{ role: "user", parts: [{text: prompt}, pdfFilePart] }],
        generationConfig
      });
      
      if (result && result.response && typeof result.response.text === 'function') {
        geminiResponseText = result.response.text();
      } else {
        console.error('Respuesta inesperada de la API de Gemini:', result);
        throw new Error('Formato de respuesta no válido de la API de IA.');
      }

    } catch (apiError) {
      console.error('Error en la API de Gemini:', apiError.message);
      return res.status(500).json({ error: `Error al comunicarse con el servicio de IA: ${apiError.message}` });
    }

    // 7. Limpiar y parsear la respuesta JSON de Gemini
    let extractedData;
    let cleanedJsonString = geminiResponseText;

    try {
      // 1. Try to extract content from ```json ... ``` markdown block
      const markdownJsonMatch = geminiResponseText.match(/```json\s*([\s\S]*?)\s*```/);
      if (markdownJsonMatch && markdownJsonMatch[1]) {
        cleanedJsonString = markdownJsonMatch[1];
      } else {
        // 2. If no markdown block, try to find the main JSON object
        const curlyBraceMatch = geminiResponseText.match(/\{([\s\S]*)\}/);
        if (curlyBraceMatch && curlyBraceMatch[0]) {
          cleanedJsonString = curlyBraceMatch[0];
        } else {
          // 3. If neither pattern works, it might be a plain JSON string already or an unexpected format
          // console.warn("Could not find typical JSON markers, attempting to parse as is after trimming.");
        }
      }

      cleanedJsonString = cleanedJsonString.trim();
      extractedData = JSON.parse(cleanedJsonString);

    } catch (jsonParseError) {
      console.error("Error al parsear JSON de Gemini después de la limpieza:", jsonParseError, "String intentado:", cleanedJsonString, "Respuesta original:", geminiResponseText);
      // Lanza un nuevo error para ser capturado por el catch externo y registrado,
      // pero con un mensaje más específico para el cliente.
      throw new Error("La IA devolvió una respuesta que no pudo ser interpretada como JSON válido después de la limpieza.");
    }

    // 8. Asegurar que todos los campos solicitados estén presentes
    const finalResult = {};
    for (const field of fieldsToCollect) {
      finalResult[field] = extractedData.hasOwnProperty(field) ? extractedData[field] : null;
    }
    
    res.status(200).json(finalResult);

  } catch (error) {
    // Captura tanto errores generales como el error específico de parseo de JSON lanzado arriba.
    console.error('Error en /process-ai:', error.message); // Usar error.message para el log si es el error customizado
    res.status(500).json({ error: 'Error interno del servidor durante el procesamiento con IA.' });
  } finally {
    // 9. Eliminar el archivo temporal
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      try {
        fs.unlinkSync(tempFilePath);
      } catch (unlinkError) {
        console.error('Error al eliminar el archivo temporal:', unlinkError);
      }
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
    try {
      await addHistoryEntry({
        userId: req.usuario.uid,
        actionType: 'UPLOAD_DOCUMENT',
        entityType: 'document',
        entityId: docRef.id,
        details: {
          fileName: documentData.nombre_original,
          idPredio: documentData.id_predio
        }
      });
    } catch (historyError) {
      console.error('Error adding history entry for upload document:', historyError);
    }
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
// Ruta para obtener documentos recientes del usuario
router.get('/recientes', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 5;
    const snapshot = await db.collection('documentos')
      .where('id_user', '==', req.usuario.uid)
      .orderBy('fecha_subida', 'desc')
      .limit(limit)
      .get();

    const documentos = [];
    snapshot.forEach(doc => {
      documentos.push({
        _id: doc.id,
        ...doc.data()
      });
    });

    res.json(documentos);
  } catch (error) {
    console.error('Error al obtener documentos recientes:', error);
    res.status(500).json({ error: 'Error al obtener documentos recientes' });
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
    
    try {
      await addHistoryEntry({
        userId: req.usuario.uid,
        actionType: 'DELETE_DOCUMENT',
        entityType: 'document',
        entityId: req.params.id,
        details: {
          fileName: documentData.nombre_original,
          idPredio: documentData.id_predio
        }
      });
    } catch (historyError) {
      console.error('Error adding history entry for delete document:', historyError);
    }
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