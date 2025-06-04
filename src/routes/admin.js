const express = require('express');
const router =express.Router();
const { db } = require('../firebase'); // Assuming firebase.js exports db

// POST /api/admin/document-types/initialize-batch
router.post('/document-types/initialize-batch', async (req, res) => {
  try {
    // Placeholder for actual logic to initialize document types
    console.log('Attempting to initialize document types...');
    
    // Example: Define a list of default document types
    const defaultDocumentTypes = [
        {
            name: "CONSULTA ANTECEDENTE BIEN RAÍZ (SII)",
            description: "Consulta de antecedentes de un bien raíz obtenida del SII.",
            fieldsToCollect: [
                "Rol del predio",
                "direccion",
                "comuna",
                "Destino (Agricola o forestal)",
                "Nombre del propietario",
                "Fecha de emisión"
            ],
            // category: "Legal" // Optional: if you use categories
        },
        {
            name: "RESOLUCIÓN PLAN DE MANEJO",
            description: "Resolución de aprobación de un plan de manejo forestal emitida por CONAF.",
            fieldsToCollect: [
                "Rol de avalúo",
                "comuna",
                "Resolución N°",
                "Superficie aprobada", // Assuming this refers to "SUPERFICIE PREDIAL A MANEJAR (HA)" or similar
                "Fecha" // General date, might be "Fecha de Resolución"
            ],
            // category: "Forestal"
        },
        {
            name: "AVISO EJECUCIÓN DE FAENA",
            description: "Aviso de ejecución de faena forestal presentado a CONAF.",
            fieldsToCollect: [
                "Fecha de aviso",
                "Aviso N°",
                "predio",
                "comuna"
            ],
            // category: "Forestal"
        },
        {
            name: "ESCRITURA O TÍTULOS DE DOMINIO",
            description: "Escritura pública o títulos de dominio de una propiedad.",
            fieldsToCollect: [
                "N° Certificado", // Or "Número de Inscripción" / "Número de Repertorio"
                "Fojas (numero)", // Or "Fojas"
                "Conservador de bienes raices" // Or "CBR"
            ],
            // category: "Legal"
        }
    ];

    const batch = db.batch();
    const documentTypesRef = db.collection('document_types'); // Changed collection name

    defaultDocumentTypes.forEach(docTypeData => {
      // Create a new object excluding 'id' (though 'id' is already removed from defaultDocumentTypes)
      // This is more of a conceptual step now, as docTypeData doesn't have 'id'
      // If 'id' could potentially exist, proper exclusion would be:
      // const { id, ...dataToStore } = docTypeData; 
      const dataToStore = { ...docTypeData }; // Simple copy as 'id' is already removed

      const docRef = documentTypesRef.doc(); // Auto-generate ID
      batch.set(docRef, dataToStore); // Use the data without the original 'id'
    });

    await batch.commit();
    
    console.log('Document types initialized successfully.');
    res.status(200).json({ message: 'Document types initialized successfully.' });
  } catch (error) {
    console.error('Error initializing document types:', error);
    res.status(500).json({ message: 'Error initializing document types', error: error.message });
  }
});

// GET /api/admin/document-types
router.get('/document-types', async (req, res) => {
  try {
    const documentTypesRef = db.collection('document_types');
    const snapshot = await documentTypesRef.get();

    if (snapshot.empty) {
      // Return 200 with an empty array if no types found, 
      // as client might expect an array. Or 404, but empty array is often friendlier.
      return res.status(200).json([]); 
    }

    const documentTypes = [];
    snapshot.forEach(doc => {
      documentTypes.push({ id: doc.id, ...doc.data() });
    });

    res.status(200).json(documentTypes);
  } catch (error) {
    console.error('Error fetching document types:', error);
    res.status(500).json({ message: 'Error fetching document types', error: error.message });
  }
});

module.exports = router;
