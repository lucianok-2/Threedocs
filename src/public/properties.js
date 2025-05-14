// Inicializar Firebase con la configuración
let firebaseConfig;
let selectedPropertyId = null;

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
    
    // Inicializar Firestore
    const db = firebase.firestore();
    
    // Cargar la lista de predios
    loadProperties();
    
    // Configurar event listeners
    setupEventListeners();
  })
  .catch(error => console.error('Error al cargar la configuración de Firebase:', error));

// Función para cargar la lista de predios
function loadProperties() {
  const propertyList = document.getElementById('property-list');
  const db = firebase.firestore();
  
  propertyList.innerHTML = '<p class="text-gray-500 text-center py-4">Cargando predios...</p>';
  
  db.collection('predios').get()
    .then(snapshot => {
      if (snapshot.empty) {
        propertyList.innerHTML = '<p class="text-gray-500 text-center py-4">No hay predios registrados</p>';
        return;
      }
      
      let propertiesHTML = '';
      
      snapshot.forEach(doc => {
        const data = doc.data();
        propertiesHTML += `
          <div class="property-item p-3 border-b hover:bg-gray-50 cursor-pointer" data-id="${doc.id}">
            <h4 class="font-medium text-gray-800">${data.nombre || 'Predio sin nombre'}</h4>
            <p class="text-sm text-gray-600">${data.ubicacion || 'Sin ubicación'}</p>
          </div>
        `;
      });
      
      propertyList.innerHTML = propertiesHTML;
      
      // Agregar event listeners a los items de predios
      const propertyItems = document.querySelectorAll('.property-item');
      propertyItems.forEach(item => {
        item.addEventListener('click', function() {
          const propertyId = this.getAttribute('data-id');
          selectProperty(propertyId);
        });
      });
    })
    .catch(error => {
      console.error('Error al cargar predios:', error);
      propertyList.innerHTML = '<p class="text-red-500 text-center py-4">Error al cargar predios</p>';
    });
}

// Configurar todos los event listeners
function setupEventListeners() {
  // Botón para agregar nuevo predio
  const addPropertyBtn = document.getElementById('add-property-btn');
  addPropertyBtn.addEventListener('click', showAddPropertyForm);
  
  // Botón para editar predio
  const editPropertyBtn = document.getElementById('edit-property-btn');
  editPropertyBtn.addEventListener('click', function() {
    if (selectedPropertyId) {
      showEditPropertyForm(selectedPropertyId);
    }
  });
  
  // Botón para eliminar predio
  const deletePropertyBtn = document.getElementById('delete-property-btn');
  deletePropertyBtn.addEventListener('click', function() {
    if (selectedPropertyId) {
      confirmDeleteProperty(selectedPropertyId);
    }
  });
  
  // Búsqueda de predios
  const propertySearch = document.getElementById('property-search');
  propertySearch.addEventListener('input', function() {
    searchProperties(this.value);
  });
  
  // Actualizar enlace de subida de documentos
  const uploadDocumentBtn = document.getElementById('upload-document-btn');
  uploadDocumentBtn.addEventListener('click', function(e) {
    if (selectedPropertyId) {
      e.preventDefault();
      // Obtener el token del localStorage
      const token = localStorage.getItem('token');
      // Redirigir incluyendo el token como parámetro de consulta
      window.location.href = `/upload?propertyId=${selectedPropertyId}&token=${token}`;
    }
  });
}

// Seleccionar un predio
function selectProperty(propertyId) {
  selectedPropertyId = propertyId;
  
  // Resaltar el predio seleccionado
  const propertyItems = document.querySelectorAll('.property-item');
  propertyItems.forEach(item => {
    if (item.getAttribute('data-id') === propertyId) {
      item.classList.add('bg-blue-50', 'border-l-4', 'border-blue-500');
    } else {
      item.classList.remove('bg-blue-50', 'border-l-4', 'border-blue-500');
    }
  });
  
  // Mostrar detalles del predio
  loadPropertyDetails(propertyId);
  
  // Mostrar documentos del predio
  loadPropertyDocuments(propertyId);
  
  // Mostrar las secciones de detalles y documentos
  document.getElementById('property-details').classList.remove('hidden');
  document.getElementById('property-documents').classList.remove('hidden');
  
  // Actualizar enlace de subida de documentos
  const uploadDocumentBtn = document.getElementById('upload-document-btn');
  // Obtener el token del localStorage
  const token = localStorage.getItem('token');
  uploadDocumentBtn.href = `/upload?propertyId=${propertyId}&token=${token}`;
}

// Cargar detalles del predio
function loadPropertyDetails(propertyId) {
  const propertyInfo = document.getElementById('property-info');
  const db = firebase.firestore();
  
  propertyInfo.innerHTML = '<p class="text-gray-500 text-center py-4">Cargando detalles...</p>';
  
  db.collection('predios').doc(propertyId).get()
    .then(doc => {
      if (!doc.exists) {
        propertyInfo.innerHTML = '<p class="text-red-500 text-center py-4">Predio no encontrado</p>';
        return;
      }
      
      const data = doc.data();
      
      let detailsHTML = `
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p class="text-sm text-gray-600 mb-1">Nombre:</p>
            <p class="font-medium text-gray-800 mb-3">${data.nombre || 'Sin nombre'}</p>
          </div>
          <div>
            <p class="text-sm text-gray-600 mb-1">Rol:</p>
            <p class="font-medium text-gray-800 mb-3">${data.rol || 'Sin rol'}</p>
          </div>
          <div>
            <p class="text-sm text-gray-600 mb-1">Ubicación:</p>
            <p class="font-medium text-gray-800 mb-3">${data.ubicacion || 'Sin ubicación'}</p>
          </div>
          <div>
            <p class="text-sm text-gray-600 mb-1">Superficie:</p>
            <p class="font-medium text-gray-800 mb-3">${data.superficie ? `${data.superficie} ha` : 'Sin información'}</p>
          </div>
          <div class="md:col-span-2">
            <p class="text-sm text-gray-600 mb-1">Descripción:</p>
            <p class="font-medium text-gray-800 mb-3">${data.descripcion || 'Sin descripción'}</p>
          </div>
        </div>
      `;
      
      propertyInfo.innerHTML = detailsHTML;
    })
    .catch(error => {
      console.error('Error al cargar detalles del predio:', error);
      propertyInfo.innerHTML = '<p class="text-red-500 text-center py-4">Error al cargar detalles</p>';
    });
}

// Cargar documentos del predio
function loadPropertyDocuments(propertyId) {
  const documentList = document.getElementById('document-list');
  const db = firebase.firestore();
  
  documentList.innerHTML = '<p class="text-gray-500 text-center py-4">Cargando documentos...</p>';
  
  db.collection('documentos')
    .where('predioId', '==', propertyId)
    .get()
    .then(snapshot => {
      if (snapshot.empty) {
        documentList.innerHTML = '<p class="text-gray-500 text-center py-4">No hay documentos para este predio</p>';
        return;
      }
      
      // Agrupar documentos por tipo
      const documentsByType = {};
      
      snapshot.forEach(doc => {
        const data = doc.data();
        if (!documentsByType[data.tipo]) {
          documentsByType[data.tipo] = [];
        }
        documentsByType[data.tipo].push({
          id: doc.id,
          ...data
        });
      });
      
      // Nombres de los tipos de documentos
      const documentTypes = {
        1: 'CONSULTA ANTECEDENTE BIEN RAIZ (SII)',
        2: 'RESOLUCIÓN PLAN DE MANEJO',
        3: 'AVISO EJECUCION DE FAENA',
        4: 'ESCRITURA O TITULOS DE DOMINIO',
        6: 'CONTRATO COMPRA Y VENTA',
        7: 'PLANO DEL PREDIO',
        8: 'CONTRATO DE TRABAJO',
        9: 'DERECHO A SABER',
        10: 'ENTREGA EPP',
        11: 'VARIOS',
        12: 'REGLAMENTO INTERNO SALUD, HIGIENE Y SEGURIDAD',
        13: 'REGISTRO DE CAPACITACIÓN',
        14: 'DOCTO. ADICIONAL'
      };
      
      let documentsHTML = '';
      
      // Generar HTML para cada tipo de documento
      Object.keys(documentsByType).forEach(typeId => {
        const typeName = documentTypes[typeId] || `Tipo ${typeId}`;
        
        documentsHTML += `
          <div class="mb-6">
            <h4 class="font-medium text-gray-700 mb-3">${typeName}</h4>
            <div class="space-y-2">
        `;
        
        documentsByType[typeId].forEach(doc => {
          const date = doc.fechaSubida ? new Date(doc.fechaSubida.seconds * 1000).toLocaleDateString() : 'Fecha desconocida';
          
          documentsHTML += `
            <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
              <div>
                <p class="font-medium text-gray-800">${doc.nombre}</p>
                <p class="text-sm text-gray-600">Subido el ${date}</p>
              </div>
              <div>
                <a href="${doc.url}" target="_blank" class="text-blue-600 hover:text-blue-800 mr-2">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
                    <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
                  </svg>
                </a>
                <button class="text-red-600 hover:text-red-800 delete-document" data-id="${doc.id}">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          `;
        });
        
        documentsHTML += `
            </div>
          </div>
        `;
      });
      
      documentList.innerHTML = documentsHTML;
      
      // Agregar event listeners a los botones de eliminar
      const deleteButtons = document.querySelectorAll('.delete-document');
      deleteButtons.forEach(button => {
        button.addEventListener('click', function() {
          const docId = this.getAttribute('data-id');
          confirmDeleteDocument(docId);
        });
      });
    })
    .catch(error => {
      console.error('Error al cargar documentos:', error);
      documentList.innerHTML = '<p class="text-red-500 text-center py-4">Error al cargar documentos</p>';
    });
}

// Buscar predios
function searchProperties(query) {
  const propertyItems = document.querySelectorAll('.property-item');
  const lowerQuery = query.toLowerCase();
  
  propertyItems.forEach(item => {
    const propertyName = item.querySelector('h4').textContent.toLowerCase();
    const propertyLocation = item.querySelector('p').textContent.toLowerCase();
    
    if (propertyName.includes(lowerQuery) || propertyLocation.includes(lowerQuery)) {
      item.style.display = 'block';
    } else {
      item.style.display = 'none';
    }
  });
}

// Mostrar formulario para agregar predio
function showAddPropertyForm() {
  // Implementar según necesidades
  alert('Funcionalidad para agregar predio en desarrollo');
}

// Mostrar formulario para editar predio
function showEditPropertyForm(propertyId) {
  // Implementar según necesidades
  alert('Funcionalidad para editar predio en desarrollo');
}

// Confirmar eliminación de predio
function confirmDeleteProperty(propertyId) {
  if (confirm('¿Está seguro que desea eliminar este predio? Esta acción no se puede deshacer.')) {
    deleteProperty(propertyId);
  }
}

// Eliminar predio
function deleteProperty(propertyId) {
  const db = firebase.firestore();
  
  db.collection('predios').doc(propertyId).delete()
    .then(() => {
      alert('Predio eliminado correctamente');
      loadProperties();
      document.getElementById('property-details').classList.add('hidden');
      document.getElementById('property-documents').classList.add('hidden');
      selectedPropertyId = null;
    })
    .catch(error => {
      console.error('Error al eliminar predio:', error);
      alert('Error al eliminar el predio');
    });
}

// Confirmar eliminación de documento
function confirmDeleteDocument(docId) {
  if (confirm('¿Está seguro que desea eliminar este documento? Esta acción no se puede deshacer.')) {
    deleteDocument(docId);
  }
}

// Eliminar documento
function deleteDocument(docId) {
  const db = firebase.firestore();
  const storage = firebase.storage();
  
  // Primero obtener la referencia al documento para conocer la ruta del archivo
  db.collection('documentos').doc(docId).get()
    .then(doc => {
      if (!doc.exists) {
        throw new Error('Documento no encontrado');
      }
      
      const data = doc.data();
      const filePath = data.ruta;
      
      // Eliminar el archivo de Storage
      return storage.ref(filePath).delete()
        .then(() => {
          // Eliminar el documento de Firestore
          return db.collection('documentos').doc(docId).delete();
        });
    })
    .then(() => {
      alert('Documento eliminado correctamente');
      loadPropertyDocuments(selectedPropertyId);
    })
    .catch(error => {
      console.error('Error al eliminar documento:', error);
      alert('Error al eliminar el documento');
    });
}