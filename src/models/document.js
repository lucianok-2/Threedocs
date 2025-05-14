const { db } = require('../firebase');

// Tipos de documentos
const DOCUMENT_TYPES = {
  CONSULTA_ANTECEDENTE: '1. CONSULTA ANTECEDENTE BIEN RAIZ (SII)',
  RESOLUCION_PLAN_MANEJO: '2. RESOLUCIÓN PLAN DE MANEJO',
  AVISO_EJECUCION_FAENA: '3. AVISO EJECUCION DE FAENA',
  ESCRITURA_TITULOS: '4. ESCRITURA O TITULOS DE DOMINIO',
  CONTRATO_COMPRA_VENTA: '6. CONTRATO COMPRA Y VENTA',
  PLANO_PREDIO: '7. PLANO DEL PREDIO',
  CONTRATO_TRABAJO: '8. CONTRATO DE TRABAJO',
  DERECHO_SABER: '9. DERECHO A SABER',
  ENTREGA_EPP: '10. ENTREGA EPP',
  VARIOS: '11. VARIOS',
  REGLAMENTO_INTERNO: '12. REGLAMENTO INTERNO SALUD, HIGIENE Y SEGURIDAD',
  REGISTRO_CAPACITACION: '13. REGISTRO DE CAPACITACIÓN',
  DOCTO_ADICIONAL: '14. DOCTO. ADICIONAL'
};

// Colección de documentos
const documentsCollection = db.collection('documents');

// Funciones para manejar documentos
const documentModel = {
  // Obtener todos los documentos
  getAllDocuments: async () => {
    try {
      const snapshot = await documentsCollection.get();
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error al obtener documentos:', error);
      throw error;
    }
  },

  // Obtener documentos por predio
  getDocumentsByProperty: async (propertyId) => {
    try {
      const snapshot = await documentsCollection
        .where('propertyId', '==', propertyId)
        .get();
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error al obtener documentos por predio:', error);
      throw error;
    }
  },

  // Agregar un nuevo documento
  addDocument: async (documentData) => {
    try {
      // Agregar timestamp de creación
      const docWithTimestamp = {
        ...documentData,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const docRef = await documentsCollection.add(docWithTimestamp);
      return {
        id: docRef.id,
        ...docWithTimestamp
      };
    } catch (error) {
      console.error('Error al agregar documento:', error);
      throw error;
    }
  },

  // Actualizar un documento existente
  updateDocument: async (documentId, documentData) => {
    try {
      const docRef = documentsCollection.doc(documentId);
      
      // Agregar timestamp de actualización
      const docWithTimestamp = {
        ...documentData,
        updatedAt: new Date()
      };
      
      await docRef.update(docWithTimestamp);
      return {
        id: documentId,
        ...docWithTimestamp
      };
    } catch (error) {
      console.error('Error al actualizar documento:', error);
      throw error;
    }
  },

  // Eliminar un documento
  deleteDocument: async (documentId) => {
    try {
      await documentsCollection.doc(documentId).delete();
      return { id: documentId, deleted: true };
    } catch (error) {
      console.error('Error al eliminar documento:', error);
      throw error;
    }
  },

  // Obtener tipos de documentos
  getDocumentTypes: () => {
    return DOCUMENT_TYPES;
  }
};

module.exports = {
  documentModel,
  DOCUMENT_TYPES
};