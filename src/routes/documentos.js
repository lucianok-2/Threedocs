const express = require('express');
const router = express.Router();
const documentController = require('../controllers/documentController');
const authMiddleware = require('../middleware/auth');
const { storage, db } = require('../firebase'); // Added db
const path = require('path'); // Added
const fs = require('fs'); // Added
const { spawn } = require('child_process'); // Added
const bucket = storage.bucket();

// Aplicar middleware de autenticación a todas las rutas
router.use(authMiddleware);


// Nueva ruta para procesar OCR
router.post('/process-ocr', async (req, res) => {
    try {
        if (!req.files || !req.files.documentFile) {
            return res.status(400).json({ message: 'No document file provided.' });
        }

        const documentFile = req.files.documentFile;
        const tempFilePath = documentFile.tempFilePath;

        const { documentTypeName, propertyId } = req.body;

        if (!documentTypeName) {
            if (tempFilePath && fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
            return res.status(400).json({ message: 'Document type name is required.' });
        }

        let fieldsToCollect = [];
        try {
            const docTypesRef = db.collection('document_types');
            const querySnapshot = await docTypesRef.where('name', '==', documentTypeName).limit(1).get();

            if (querySnapshot.empty) {
                if (tempFilePath && fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
                return res.status(404).json({ message: `Document type "${documentTypeName}" not found.` });
            }
            const docTypeData = querySnapshot.docs[0].data();
            fieldsToCollect = docTypeData.fieldsToCollect || [];
        } catch (error) {
            console.error('Error fetching document type from Firestore:', error);
            if (tempFilePath && fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
            return res.status(500).json({ message: 'Error fetching document type details.' });
        }

        const pythonExecutable = 'python3'; // Or 'python', depending on environment
        // Path from src/routes/documentos.js to ocr_model/main.py
        const scriptPath = path.join(__dirname, '..', '..', 'ocr_model', 'main.py'); 
        const fieldsToCollectJsonString = JSON.stringify(fieldsToCollect);

        console.log(`Executing Python script: ${pythonExecutable} ${scriptPath} ${tempFilePath} "${documentTypeName}" "${fieldsToCollectJsonString}"`);

        const pythonProcess = spawn(pythonExecutable, [
            scriptPath,
            tempFilePath,
            documentTypeName,
            fieldsToCollectJsonString
        ]);

        let scriptOutput = '';
        let scriptError = '';

        pythonProcess.stdout.on('data', (data) => {
            scriptOutput += data.toString();
        });

        pythonProcess.stderr.on('data', (data) => {
            scriptError += data.toString();
        });

        pythonProcess.on('close', (code) => {
            if (tempFilePath && fs.existsSync(tempFilePath)) {
                try {
                    fs.unlinkSync(tempFilePath);
                    console.log(`Temporary file ${tempFilePath} deleted successfully.`);
                } catch (unlinkError) {
                    console.error(`Error deleting temp file ${tempFilePath}:`, unlinkError);
                }
            }

            if (code === 0) {
                try {
                    const extractedData = JSON.parse(scriptOutput);
                    if (extractedData.error) {
                        console.error(`Python script execution error (reported by script): ${extractedData.error}`);
                        res.status(500).json({ message: 'OCR processing failed: ' + extractedData.error });
                    } else {
                        res.status(200).json(extractedData);
                    }
                } catch (parseError) {
                    console.error('Error parsing Python script output:', parseError);
                    console.error('Python script raw output:', scriptOutput);
                    console.error('Python script raw error (if any):', scriptError);
                    res.status(500).json({ message: 'Error parsing OCR results.', details: scriptOutput, errorDetails: scriptError });
                }
            } else {
                console.error(`Python script exited with code ${code}`);
                console.error('Python script stderr:', scriptError);
                console.error('Python script stdout (if any):', scriptOutput);
                res.status(500).json({
                    message: `OCR script execution failed with code ${code}.`,
                    error: scriptError,
                    output: scriptOutput
                });
            }
        });

        pythonProcess.on('error', (err) => {
            console.error('Failed to start Python script:', err);
            if (tempFilePath && fs.existsSync(tempFilePath)) {
                try {
                    fs.unlinkSync(tempFilePath);
                } catch (unlinkError) {
                    console.error('Error deleting temp file (on pythonProcess error):', unlinkError);
                }
            }
            res.status(500).json({ message: 'Failed to start OCR processing script.', error: err.message });
        });

    } catch (error) {
        console.error('Error processing OCR request (outer try-catch):', error);
        // Fallback cleanup for temp file if an error occurred before pythonProcess was defined or event handlers were set up
        if (req.files && req.files.documentFile && req.files.documentFile.tempFilePath && fs.existsSync(req.files.documentFile.tempFilePath)) {
            try {
                fs.unlinkSync(req.files.documentFile.tempFilePath);
                 console.log(`Temporary file ${req.files.documentFile.tempFilePath} deleted due to outer error.`);
            } catch (cleanupError) {
                console.error('Error during final cleanup of temp file (outer try-catch):', cleanupError);
            }
        }
        res.status(500).json({ message: 'Error processing OCR request.', error: error.message });
    }
});


// Ruta para subir un documento
const { documentModel } = require('../models/document'); // Ensure this is imported

router.post('/upload', authMiddleware, async (req, res) => {
    try {
        // Data comes from client-side FormData after client uploads to Firebase
        const {
            documentTypeNameForUpload,
            propertyId,
            responsiblePerson,
            documentDescription,
            fileHash,
            userId,
            uploadDate, // ISO string from client
            fileUrl,    // URL from Firebase after client-side upload
            originalFileName, // Send originalFileName from client for completeness
            contentType,      // Send contentType from client
            size,             // Send size from client
            // Dynamic fields will also be in req.body
            ...dynamicFields
        } = req.body;

        // Validate required fields
        if (!documentTypeNameForUpload || !propertyId || !responsiblePerson || !fileHash || !userId || !uploadDate || !fileUrl || !originalFileName) {
            return res.status(400).json({ message: 'Missing required document metadata including fileUrl and originalFileName.' });
        }
        
        // Prepare data for Firestore
        const documentData = {
            documentTypeName: documentTypeNameForUpload,
            propertyId,
            responsiblePerson,
            documentDescription: documentDescription || '',
            fileHash,
            userId,
            originalFileName,
            fileUrl,
            // storagePath: could be derived from fileUrl if needed, or sent by client
            contentType: contentType || 'application/octet-stream', // Get from client if possible
            size: size || 0, // Get from client if possible
            uploadDate: new Date(uploadDate), // Convert client string date to Date object
            status: 'uploaded', 
            extractedData: {}, // For any data that might have been extracted (e.g. by OCR) and filled in form
            additionalMetadata: {} 
        };

        // Add dynamic fields (which could include OCR extracted data filled into form)
        for (const key in dynamicFields) {
            if (dynamicFields.hasOwnProperty(key)) {
                // Filter out known, explicitly handled fields
                const knownFields = ['documentTypeNameForUpload', 'propertyId', 'responsiblePerson', 
                                     'documentDescription', 'fileHash', 'userId', 'uploadDate', 
                                     'fileUrl', 'originalFileName', 'contentType', 'size'];
                if (!knownFields.includes(key)) {
                     documentData.additionalMetadata[key] = dynamicFields[key];
                }
            }
        }
        
        const savedDocument = await documentModel.addProcessedDocument(documentData);

        res.status(200).json({ 
            message: 'Document metadata saved successfully.',
            documentId: savedDocument.id,
            fileUrl: savedDocument.fileUrl
        });

    } catch (error) {
        console.error('Error during document metadata saving:', error);
        // Important: req.body might contain sensitive info, selectively log or process.
        // console.log('Request body on error:', req.body); 
        res.status(500).json({ message: 'Error saving document metadata.', error: error.message });
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