const { db } = require('../firebase');
const mongoose = require('mongoose');

// Tipos de documentos
const documentTypes = [
  { id: 1, name: "CONSULTA ANTECEDENTE BIEN RAIZ (SII)", required: true },
  { id: 2, name: "RESOLUCIÓN PLAN DE MANEJO", required: false },
  { id: 3, name: "AVISO EJECUCION DE FAENA", required: false },
  { id: 4, name: "ESCRITURA O TITULOS DE DOMINIO", required: false },
  { id: 6, name: "CONTRATO COMPRA Y VENTA", required: false },
  { id: 7, name: "PLANO DEL PREDIO", required: false },
  { id: 8, name: "CONTRATO DE TRABAJO", required: false },
  { id: 9, name: "DERECHO A SABER", required: false },
  { id: 10, name: "ENTREGA EPP", required: false },
  { id: 11, name: "VARIOS", required: false },
  { id: 12, name: "REGLAMENTO INTERNO SALUD, HIGIENE Y SEGURIDAD", required: false },
  { id: 13, name: "REGISTRO DE CAPACITACIÓN", required: false },
  { id: 14, name: "DOCTO. ADICIONAL", required: false }
];

// Constantes para tipos de documentos (para uso en código)
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

// Colección de documentos en Firebase
const documentsCollection = db.collection('documents');

// Funciones para manejar documentos en Firebase
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
    return documentTypes;
  }
};

module.exports = {
  documentModel,
  DOCUMENT_TYPES,
  documentTypes,
  Documento
};