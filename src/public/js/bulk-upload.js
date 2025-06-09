// Configuración de Firebase y Gemini
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro-vision:generateContent';

// Variables para almacenar archivos seleccionados
let selectedFiles = [];

// Elementos del DOM
const bulkUploadButton = document.getElementById('bulk-upload-button');
const propertySelect = document.getElementById('property-select');
const bulkFileInput = document.getElementById('bulk-file-input');
const processBulkFilesButton = document.getElementById('process-bulk-files-button');
const bulkUploadFeedback = document.getElementById('bulk-upload-feedback');
const cancelBulkUpload = document.getElementById('cancel-bulk-upload');
const closeBulkUploadModal = document.getElementById('close-bulk-upload-modal');

// Mostrar/ocultar botón de carga masiva según selección de predio
propertySelect.addEventListener('change', function() {
  if (this.value) {
    bulkUploadButton.classList.remove('hidden');
  } else {
    bulkUploadButton.classList.add('hidden');
  }
});

// Abrir modal de carga masiva
bulkUploadButton.addEventListener('click', () => {
  window.modalHelpers.showBulkUploadModal();
});

// Cerrar modal
[closeBulkUploadModal, cancelBulkUpload].forEach(element => {
  if (element) {
    element.addEventListener('click', () => {
      window.modalHelpers.closeBulkUploadModal();
    });
  }
});

// Manejar selección de archivos
bulkFileInput.addEventListener('change', function(e) {
  const files = Array.from(e.target.files);
  const pdfFiles = files.filter(file => file.type === 'application/pdf');
  
  if (pdfFiles.length !== files.length) {
    showFeedback('Solo se permiten archivos PDF', 'error');
    return;
  }
  
  selectedFiles = [...selectedFiles, ...pdfFiles];
  showFeedback(`${selectedFiles.length} archivos seleccionados`, 'info');
});

// Función para convertir PDF a base64
async function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = error => reject(error);
  });
}

// Función para procesar texto con Gemini
async function processWithGemini(base64PDF) {
  const response = await fetch(GEMINI_API_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GEMINI_API_KEY}`
    },
    body: JSON.stringify({
      contents: [{
        parts: [{
          inlineData: {
            mimeType: 'application/pdf',
            data: base64PDF
          }
        }]
      }]
    })
  });

  return await response.json();
}

// Procesar archivos
processBulkFilesButton.addEventListener('click', async () => {
  if (selectedFiles.length === 0) {
    showFeedback('No hay archivos seleccionados', 'error');
    return;
  }

  showFeedback('Procesando archivos...', 'info');
  processBulkFilesButton.disabled = true;

  try {
    for (const file of selectedFiles) {
      const base64PDF = await fileToBase64(file);
      const result = await processWithGemini(base64PDF);
      console.log(`Resultado para ${file.name}:`, result);
    }

    showFeedback('Procesamiento completado', 'success');
  } catch (error) {
    console.error('Error al procesar archivos:', error);
    showFeedback('Error al procesar archivos', 'error');
  } finally {
    processBulkFilesButton.disabled = false;
  }
});

// Funciones auxiliares
function showFeedback(message, type) {
  bulkUploadFeedback.textContent = message;
  bulkUploadFeedback.className = `mb-6 p-4 border rounded-lg text-sm ${
    type === 'error' ? 'bg-red-50 text-red-700 border-red-200' :
    type === 'success' ? 'bg-green-50 text-green-700 border-green-200' :
    'bg-gray-50 text-gray-700 border-gray-200'
  }`;
  bulkUploadFeedback.classList.remove('hidden');
}

function resetBulkUpload() {
  selectedFiles = [];
  bulkFileInput.value = '';
  bulkUploadFeedback.classList.add('hidden');
  processBulkFilesButton.disabled = false;
}