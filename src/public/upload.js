// Inicializar Firebase con la configuración
let firebaseConfig;
let selectedFile = null;
let currentPropertyId = null;

// Cargar la configuración de Firebase
fetch('/firebase-config.js')
  .then(response => response.text())
  .then(text => {
    eval(text); // Esto establece window.firebaseConfig
    firebaseConfig = window.firebaseConfig;
    
    // Inicializar Firebase
    if (!firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
    }
    
    // Inicializar Firestore y Storage
    const db = firebase.firestore();
    const storage = firebase.storage();
    
    // Cargar la lista de predios
    loadProperties();
    
    // Configurar event listeners
    setupEventListeners();
    
    // Verificar si hay un ID de predio en la URL
    const urlParams = new URLSearchParams(window.location.search);
    const propertyIdFromUrl = urlParams.get('propertyId');
    
    if (propertyIdFromUrl) {
      // Seleccionar automáticamente el predio si viene en la URL
      const propertySelect = document.getElementById('property-select');
      propertySelect.value = propertyIdFromUrl;
      
      // Disparar el evento change para mostrar la sección de documentos
      const event = new Event('change');
      propertySelect.dispatchEvent(event);
    }
  })
  .catch(error => console.error('Error al cargar la configuración de Firebase:', error));

// Función para cargar la lista de predios
function loadProperties() {
  const propertySelect = document.getElementById('property-select');
  const db = firebase.firestore();
  
  db.collection('predios').get()
    .then(snapshot => {
      // Limpiar opciones existentes excepto la primera
      while (propertySelect.options.length > 1) {
        propertySelect.remove(1);
      }
      
      if (snapshot.empty) {
        const option = document.createElement('option');
        option.value = "";
        option.textContent = "No hay predios disponibles";
        propertySelect.appendChild(option);
        return;
      }
      
      // Agregar cada predio como una opción
      snapshot.forEach(doc => {
        const data = doc.data();
        const option = document.createElement('option');
        option.value = doc.id;
        option.textContent = data.nombre || `Predio ${doc.id}`;
        propertySelect.appendChild(option);
      });
    })
    .catch(error => {
      console.error('Error al cargar predios:', error);
      alert('Error al cargar la lista de predios');
    });
}

// Configurar todos los event listeners
function setupEventListeners() {
  // Selección de predio
  const propertySelect = document.getElementById('property-select');
  propertySelect.addEventListener('change', function() {
    currentPropertyId = this.value;
    const documentSection = document.getElementById('document-section');
    
    if (currentPropertyId) {
      documentSection.classList.remove('hidden');
      loadDocumentCounts(currentPropertyId);
    } else {
      documentSection.classList.add('hidden');
    }
  });
  
  // Botones de carga de documentos
  const uploadButtons = document.querySelectorAll('.upload-btn');
  uploadButtons.forEach(button => {
    button.addEventListener('click', function() {
      const docTypeId = this.getAttribute('data-doc-id');
      openUploadModal(docTypeId);
    });
  });
  
  // Modal de carga
  const modal = document.getElementById('upload-modal');
  const closeModalBtn = document.getElementById('close-modal');
  const cancelUploadBtn = document.getElementById('cancel-upload');
  
  closeModalBtn.addEventListener('click', closeModal);
  cancelUploadBtn.addEventListener('click', closeModal);
  
  // Dropzone para arrastrar archivos
  const dropzone = document.getElementById('dropzone');
  const fileInput = document.getElementById('file-input');
  const browseFilesBtn = document.getElementById('browse-files');
  
  browseFilesBtn.addEventListener('click', function() {
    fileInput.click();
  });
  
  fileInput.addEventListener('change', function(e) {
    if (this.files.length > 0) {
      selectedFile = this.files[0];
      document.getElementById('selected-file').textContent = `Archivo seleccionado: ${selectedFile.name}`;
      document.getElementById('selected-file').classList.remove('hidden');
    }
  });
  
  dropzone.addEventListener('dragover', function(e) {
    e.preventDefault();
    dropzone.classList.add('border-blue-500');
  });
  
  dropzone.addEventListener('dragleave', function() {
    dropzone.classList.remove('border-blue-500');
  });
  
  dropzone.addEventListener('drop', function(e) {
    e.preventDefault();
    dropzone.classList.remove('border-blue-500');
    
    if (e.dataTransfer.files.length > 0) {
      selectedFile = e.dataTransfer.files[0];
      document.getElementById('selected-file').textContent = `Archivo seleccionado: ${selectedFile.name}`;
      document.getElementById('selected-file').classList.remove('hidden');
    }
  });
  
  // Botón de subir documento
  const submitUploadBtn = document.getElementById('submit-upload');
  submitUploadBtn.addEventListener('click', uploadDocument);
}

// Abrir el modal de carga
function openUploadModal(docTypeId) {
  if (!currentPropertyId) {
    alert('Por favor, seleccione un predio primero');
    return;
  }
  
  const modal = document.getElementById('upload-modal');
  const documentTypeId = document.getElementById('document-type-id');
  const modalTitle = document.getElementById('modal-title');
  
  // Obtener el título del documento según su ID
  const docTitle = document.querySelector(`[data-doc-id="${docTypeId}"]`).closest('div').querySelector('h5').textContent;
  
  modalTitle.textContent = `Subir Documento: ${docTitle}`;
  documentTypeId.value = docTypeId;
  
  // Limpiar campos
  document.getElementById('document-name').value = '';
  document.getElementById('file-input').value = '';
  document.getElementById('selected-file').textContent = '';
  document.getElementById('selected-file').classList.add('hidden');
  selectedFile = null;
  
  modal.classList.remove('hidden');
}

// Cerrar el modal de carga
function closeModal() {
  const modal = document.getElementById('upload-modal');
  modal.classList.add('hidden');
}

// Subir documento a Firebase
function uploadDocument() {
  if (!selectedFile) {
    alert('Por favor, seleccione un archivo para subir');
    return;
  }
  
  const documentName = document.getElementById('document-name').value.trim();
  if (!documentName) {
    alert('Por favor, ingrese un nombre para el documento');
    return;
  }
  
  const docTypeId = document.getElementById('document-type-id').value;
  const storage = firebase.storage();
  const db = firebase.firestore();
  
  // Mostrar indicador de carga
  const submitBtn = document.getElementById('submit-upload');
  const originalText = submitBtn.textContent;
  submitBtn.textContent = 'Subiendo...';
  submitBtn.disabled = true;
  
  // Crear referencia al archivo en Storage
  const fileExtension = selectedFile.name.split('.').pop();
  const timestamp = new Date().getTime();
  const filePath = `predios/${currentPropertyId}/documentos/${docTypeId}/${timestamp}_${documentName}.${fileExtension}`;
  const storageRef = storage.ref(filePath);
  
  // Subir archivo
  const uploadTask = storageRef.put(selectedFile);
  
  uploadTask.on('state_changed', 
    // Progreso
    (snapshot) => {
      const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
      console.log('Progreso de carga: ' + progress + '%');
    },
    // Error
    (error) => {
      console.error('Error al subir archivo:', error);
      alert('Error al subir el archivo');
      submitBtn.textContent = originalText;
      submitBtn.disabled = false;
    },
    // Completado
    () => {
      // Obtener URL de descarga
      uploadTask.snapshot.ref.getDownloadURL().then((downloadURL) => {
        // Guardar metadatos en Firestore
        db.collection('documentos').add({
          nombre: documentName,
          tipo: parseInt(docTypeId),
          predioId: currentPropertyId,
          url: downloadURL,
          ruta: filePath,
          fechaSubida: firebase.firestore.FieldValue.serverTimestamp(),
          tamaño: selectedFile.size,
          tipoArchivo: fileExtension
        })
        .then(() => {
          alert('Documento subido correctamente');
          closeModal();
          submitBtn.textContent = originalText;
          submitBtn.disabled = false;
          
          // Actualizar contador de documentos
          updateDocumentCount(docTypeId);
        })
        .catch((error) => {
          console.error('Error al guardar metadatos:', error);
          alert('Error al guardar la información del documento');
          submitBtn.textContent = originalText;
          submitBtn.disabled = false;
        });
      });
    }
  );
}

// Actualizar contador de documentos
function updateDocumentCount(docTypeId) {
  const db = firebase.firestore();
  
  db.collection('documentos')
    .where('predioId', '==', currentPropertyId)
    .where('tipo', '==', parseInt(docTypeId))
    .get()
    .then(snapshot => {
      const count = snapshot.size;
      document.getElementById(`doc-count-${docTypeId}`).textContent = `${count} doc. adjunto(s)`;
    })
    .catch(error => {
      console.error('Error al contar documentos:', error);
    });
}

// Cargar contadores de documentos para un predio
function loadDocumentCounts(propertyId) {
  const db = firebase.firestore();
  
  // Para cada tipo de documento, contar cuántos hay
  for (let i = 1; i <= 14; i++) {
    if (i === 5) continue; // Saltar el tipo 5 que no existe
    
    db.collection('documentos')
      .where('predioId', '==', propertyId)
      .where('tipo', '==', i)
      .get()
      .then(snapshot => {
        const count = snapshot.size;
        const countElement = document.getElementById(`doc-count-${i}`);
        if (countElement) {
          countElement.textContent = `${count} doc. adjunto(s)`;
        }
      })
      .catch(error => {
        console.error(`Error al contar documentos tipo ${i}:`, error);
      });
  }
}

// Al inicio del archivo
document.addEventListener('DOMContentLoaded', function() {
  // Verificar si hay un mensaje de error en la página
  const errorElement = document.querySelector('pre');
  if (errorElement && errorElement.textContent.includes('Token requerido')) {
    // Obtener token de localStorage
    const token = localStorage.getItem('token');
    
    if (token) {
      // Intentar recargar la página con el token
      const currentUrl = new URL(window.location.href);
      currentUrl.searchParams.set('token', token);
      window.location.href = currentUrl.toString();
    } else {
      // Redirigir al login
      alert('Su sesión ha expirado. Por favor, inicie sesión nuevamente.');
      window.location.href = '/';
    }
  }
});