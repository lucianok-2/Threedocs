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
  
  // Obtener el usuario actual
  const user = firebase.auth().currentUser;
  
  if (!user) {
    console.error('No hay usuario autenticado');
    propertyList.innerHTML = '<p class="text-red-500 text-center py-4">Error: No hay usuario autenticado</p>';
    return;
  }
  
  // Filtrar predios por id_user
  db.collection('predios')
    .where('id_user', '==', user.uid)
    .get()
    .then(snapshot => {
      if (snapshot.empty) {
        propertyList.innerHTML = '<p class="text-gray-500 text-center py-4">No hay predios registrados</p>';
        return;
      }
      
      let propertiesHTML = '';
      
      snapshot.forEach(doc => {
        const data = doc.data();
        propertiesHTML += `
          <div class="property-item p-3 border-b hover:bg-gray-50 cursor-pointer" data-id="${doc.id}" onclick="selectProperty('${doc.id}')">
            <h4 class="font-medium text-gray-800">${data.nombre || 'Predio sin nombre'}</h4>
            <p class="text-sm text-gray-600">${data.ubicacion || 'Sin ubicación'}</p>
          </div>
        `;
      });
      
      propertyList.innerHTML = propertiesHTML;
      
      // Agregar event listeners a cada elemento de la lista después de insertarlos en el DOM
      const propertyItems = document.querySelectorAll('.property-item');
      propertyItems.forEach(item => {
        const propertyId = item.getAttribute('data-id');
        item.addEventListener('click', function() {
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

// Función para cargar los detalles del predio
function loadPropertyDetails(propertyId) {
  const propertyInfo = document.getElementById('property-info');
  const propertyDetails = document.getElementById('property-details');
  const propertyDocuments = document.getElementById('property-documents');
  const db = firebase.firestore();
  
  propertyInfo.innerHTML = '<p class="text-gray-500 text-center py-4">Cargando detalles...</p>';
  propertyDetails.classList.remove('hidden');
  propertyDocuments.classList.remove('hidden');
  
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
          <div>
            <p class="text-sm text-gray-600 mb-1">Propietario:</p>
            <p class="font-medium text-gray-800 mb-3">${data.propietario?.nombre || 'Sin información'}</p>
          </div>
          <div>
            <p class="text-sm text-gray-600 mb-1">RUT Propietario:</p>
            <p class="font-medium text-gray-800 mb-3">${data.propietario?.rut || 'Sin información'}</p>
          </div>
          <div>
            <p class="text-sm text-gray-600 mb-1">Modelo de Compra:</p>
            <p class="font-medium text-gray-800 mb-3">${data.modeloCompra || 'Sin información'}</p>
          </div>
          <div>
            <p class="text-sm text-gray-600 mb-1">Certificaciones:</p>
            <p class="font-medium text-gray-800 mb-3">${getCertificacionesText(data.certificaciones) || 'Sin certificaciones'}</p>
          </div>
          <div class="md:col-span-2">
            <p class="text-sm text-gray-600 mb-1">Descripción:</p>
            <p class="font-medium text-gray-800 mb-3">${data.descripcion || 'Sin descripción'}</p>
          </div>
        </div>
      `;
      
      propertyInfo.innerHTML = detailsHTML;
      
      // Cargar documentos del predio
      loadPropertyDocuments(propertyId);
      
      // Modificar para añadir el evento de edición
      document.getElementById('edit-property-btn').addEventListener('click', function() {
        // Llamar directamente a showEditPropertyModal con los datos del documento
        showEditPropertyModal({
          _id: doc.id,
          ...data
        });
      });
    })
    .catch(error => {
      console.error('Error al cargar detalles del predio:', error);
      propertyInfo.innerHTML = '<p class="text-red-500 text-center py-4">Error al cargar detalles</p>';
    });
}

// Función para mostrar el modal de edición de predio
function showEditPropertyModal(property) {
  // Crear el modal si no existe
  if (!document.getElementById('edit-property-modal')) {
    console.error('El modal de edición no existe en el DOM');
    return;
  }
  
  // Rellenar el formulario con los datos del predio
  document.getElementById('edit-property-name').value = property.nombre || '';
  document.getElementById('edit-property-rol').value = property.rol || '';
  document.getElementById('edit-purchase-model').value = property.modeloCompra || 'Propietario';
  document.getElementById('edit-owner-rut').value = property.rutPropietario || '';
  document.getElementById('edit-owner-name').value = property.nombrePropietario || '';
  
  // Marcar las certificaciones si existen
  document.getElementById('edit-cert-fsc').checked = property.certificaciones && property.certificaciones.includes('FSC');
  document.getElementById('edit-cert-pefc').checked = property.certificaciones && property.certificaciones.includes('PEFC');
  document.getElementById('edit-cert-none').checked = !property.certificaciones || property.certificaciones.length === 0;
  
  // Guardar el ID del predio en el formulario para usarlo al guardar
  document.getElementById('edit-property-form').dataset.propertyId = property._id;
  
  // Mostrar el modal
  document.getElementById('edit-property-modal').classList.remove('hidden');
}

// Función para cerrar el modal de edición
function closeEditPropertyModal() {
  document.getElementById('edit-property-modal').classList.add('hidden');
}

// Función para guardar los cambios del predio
function saveEditedProperty(event) {
  event.preventDefault();
  
  const propertyId = event.target.dataset.propertyId;
  if (!propertyId) {
    console.error('No se encontró el ID del predio');
    return;
  }
  
  // Obtener los valores del formulario
  const nombre = document.getElementById('edit-property-name').value;
  const rol = document.getElementById('edit-property-rol').value;
  const modeloCompra = document.getElementById('edit-purchase-model').value;
  const rutPropietario = document.getElementById('edit-owner-rut').value;
  const nombrePropietario = document.getElementById('edit-owner-name').value;
  
  // Obtener las certificaciones seleccionadas
  const certificaciones = [];
  if (document.getElementById('edit-cert-fsc').checked) {
    certificaciones.push('FSC');
  }
  if (document.getElementById('edit-cert-pefc').checked) {
    certificaciones.push('PEFC');
  }
  
  // Generar código de certificación si hay certificaciones seleccionadas
  let codigoCertificacion = null;
  if (certificaciones.length > 0) {
    // Generar un código único basado en el nombre del predio y la fecha
    const fecha = new Date();
    const codigoBase = nombre.substring(0, 3).toUpperCase();
    codigoCertificacion = `${codigoBase}-${fecha.getFullYear()}${(fecha.getMonth()+1).toString().padStart(2, '0')}${fecha.getDate().toString().padStart(2, '0')}`;
  }
  
  // Crear el objeto con los datos actualizados
  const updatedProperty = {
    nombre,
    rol,
    modeloCompra,
    rutPropietario,
    nombrePropietario,
    certificaciones,
    codigoCertificacion
  };
  
  // Obtener el token de autenticación
  const token = localStorage.getItem('token');
  if (!token) {
    alert('No se encontró un token de autenticación. Por favor, inicie sesión nuevamente.');
    window.location.href = '/';
    return;
  }
  
  // Enviar la solicitud para actualizar el predio
  fetch(`/api/predios/${propertyId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(updatedProperty)
  })
  .then(response => {
    if (!response.ok) {
      throw new Error('Error al actualizar el predio');
    }
    return response.json();
  })
  .then(data => {
    alert('Predio actualizado correctamente');
    closeEditPropertyModal();
    loadProperties(); // Recargar la lista de predios
    loadPropertyDetails(propertyId); // Recargar los detalles del predio
  })
  .catch(error => {
    console.error('Error:', error);
    alert('Error al actualizar el predio');
  });
}

// Función auxiliar para mostrar las certificaciones en texto
function getCertificacionesText(certificaciones) {
  if (!certificaciones || certificaciones.length === 0) {
    return 'Sin certificaciones';
  }
  return certificaciones.join(', ');
}

// Función para cargar los documentos del predio
function loadPropertyDocuments(propertyId) {
  const documentList = document.getElementById('document-list');
  const db = firebase.firestore();
  
  documentList.innerHTML = '<p class="text-gray-500 text-center py-4">Cargando documentos...</p>';
  
  db.collection('predios').doc(propertyId).get()
    .then(doc => {
      if (!doc.exists || !doc.data().documentos) {
        documentList.innerHTML = '<p class="text-gray-500 text-center py-4">No hay documentos disponibles</p>';
        return;
      }
      
      const documentos = doc.data().documentos;
      let documentsHTML = '<div class="grid grid-cols-1 md:grid-cols-2 gap-4">';
      
      if (documentos.planManejo) {
        documentsHTML += `
          <div class="border rounded-lg p-4">
            <div class="flex items-center mb-2">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-blue-500 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clip-rule="evenodd" />
              </svg>
              <span class="font-medium">Plan de Manejo</span>
            </div>
            <p class="text-sm text-gray-600 mb-2">${documentos.planManejo.nombre}</p>
            <a href="${documentos.planManejo.url}" target="_blank" class="text-blue-600 hover:text-blue-800 text-sm">Ver documento</a>
          </div>
        `;
      }
      
      if (documentos.facturaCompra) {
        documentsHTML += `
          <div class="border rounded-lg p-4">
            <div class="flex items-center mb-2">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-green-500 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clip-rule="evenodd" />
              </svg>
              <span class="font-medium">Factura Compra</span>
            </div>
            <p class="text-sm text-gray-600 mb-2">${documentos.facturaCompra.nombre}</p>
            <a href="${documentos.facturaCompra.url}" target="_blank" class="text-blue-600 hover:text-blue-800 text-sm">Ver documento</a>
          </div>
        `;
      }
      
      documentsHTML += '</div>';
      
      documentList.innerHTML = documentsHTML;
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

// Cuando el DOM esté cargado
document.addEventListener('DOMContentLoaded', function() {
  console.log('DOM cargado completamente');
  
  // Configurar event listeners si setupEventListeners aún no ha sido llamado
  if (!document.getElementById('add-property-btn').hasAttribute('data-initialized')) {
    const addPropertyBtn = document.getElementById('add-property-btn');
    if (addPropertyBtn) {
      addPropertyBtn.setAttribute('data-initialized', 'true');
      addPropertyBtn.addEventListener('click', function() {
        console.log('Botón Nuevo clickeado');
        showAddPropertyForm();
      });
    }
  }
  
  // Event listeners para el modal de edición
  const closeEditModalBtn = document.getElementById('close-edit-modal');
  if (closeEditModalBtn) {
    closeEditModalBtn.addEventListener('click', closeEditPropertyModal);
  }
  
  const cancelEditBtn = document.getElementById('cancel-edit-property');
  if (cancelEditBtn) {
    cancelEditBtn.addEventListener('click', closeEditPropertyModal);
  }
  
  const editPropertyForm = document.getElementById('edit-property-form');
  if (editPropertyForm) {
    editPropertyForm.addEventListener('submit', saveEditedProperty);
  }
  
  // Configurar el comportamiento de los checkboxes de certificación
  const certNoneCheckbox = document.getElementById('edit-cert-none');
  if (certNoneCheckbox) {
    certNoneCheckbox.addEventListener('change', function() {
      if (this.checked) {
        document.getElementById('edit-cert-fsc').checked = false;
        document.getElementById('edit-cert-pefc').checked = false;
      }
    });
  }
  
  const certFscCheckbox = document.getElementById('edit-cert-fsc');
  const certPefcCheckbox = document.getElementById('edit-cert-pefc');
  
  if (certFscCheckbox && certPefcCheckbox) {
    certFscCheckbox.addEventListener('change', function() {
      if (this.checked) {
        document.getElementById('edit-cert-none').checked = false;
      }
    });
    
    certPefcCheckbox.addEventListener('change', function() {
      if (this.checked) {
        document.getElementById('edit-cert-none').checked = false;
      }
    });
  }
  
  // Corregir el botón "Nuevo Predio"
  const addPropertyBtn = document.getElementById('add-property-btn');
  if (addPropertyBtn) {
    addPropertyBtn.addEventListener('click', showAddPropertyForm);
  }
});

// Función para mostrar el modal de nuevo predio
function mostrarModalNuevoPredio() {
  console.log('Mostrando modal de nuevo predio');
  const modal = document.getElementById('nuevo-predio-modal');
  if (modal) {
    modal.classList.remove('hidden');
  } else {
    console.error('No se encontró el modal nuevo-predio-modal');
  }
}

// Función para cerrar el modal de nuevo predio
function cerrarModalNuevoPredio() {
  console.log('Cerrando modal de nuevo predio');
  const modal = document.getElementById('nuevo-predio-modal');
  if (modal) {
    modal.classList.add('hidden');
    const form = document.getElementById('nuevo-predio-form');
    if (form) {
      form.reset();
    }
  }
}

// Función para guardar el nuevo predio
function guardarNuevoPredio(e) {
  e.preventDefault();
  console.log('Guardando nuevo predio');
  
  // Obtener el usuario actual
  const user = firebase.auth().currentUser;
  
  if (!user) {
    console.error('No hay usuario autenticado');
    alert('Error: No hay usuario autenticado');
    return;
  }
  
  // Recopilar datos del formulario
  const propertyData = {
    nombre: document.getElementById('property-name').value,
    rol: document.getElementById('property-rol').value,
    ubicacion: document.getElementById('property-location').value,
    superficie: document.getElementById('property-area').value || null,
    descripcion: document.getElementById('property-description')?.value || '',
    certificacionFSC: document.getElementById('no-fsc').checked ? null : document.getElementById('fsc-certification').value,
    certificacionPEFC: document.getElementById('no-pefc').checked ? null : document.getElementById('pefc-certification').value,
    fechaCreacion: firebase.firestore.FieldValue.serverTimestamp(),
    // Agregar el ID del usuario actual
    id_user: user.uid
  };
  
  console.log('Datos del predio:', propertyData);
  
  // Guardar en Firestore
  const db = firebase.firestore();
  
  db.collection('predios').add(propertyData)
    .then(() => {
      alert('Predio agregado correctamente');
      cerrarModalNuevoPredio();
      loadProperties(); // Recargar la lista de predios
    })
    .catch(error => {
      console.error('Error al agregar predio:', error);
      alert('Error al agregar el predio: ' + error.message);
    });
}

// Función para mostrar el modal de agregar predio
function showAddPropertyModal() {
  // Crear el modal si no existe
  if (!document.getElementById('add-property-modal')) {
    const modalHTML = `
      <div id="add-property-modal" class="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 hidden">
        <div class="bg-white rounded-lg shadow-xl w-full max-w-4xl">
          <div class="border-b px-6 py-4 flex justify-between items-center">
            <h3 class="text-lg font-semibold text-gray-800">Agregar Nuevo Predio</h3>
            <button id="close-add-modal" class="text-gray-500 hover:text-gray-700">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div class="p-6">
            <form id="add-property-form">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label for="property-name" class="block text-sm font-medium text-gray-700 mb-1">Nombre del Predio</label>
                  <input type="text" id="property-name" class="w-full px-3 py-2 border rounded-lg" required>
                </div>
                <div>
                  <label for="property-rol" class="block text-sm font-medium text-gray-700 mb-1">Rol</label>
                  <input type="text" id="property-rol" class="w-full px-3 py-2 border rounded-lg" required>
                </div>
                <div>
                  <label for="property-location" class="block text-sm font-medium text-gray-700 mb-1">Ubicación</label>
                  <input type="text" id="property-location" class="w-full px-3 py-2 border rounded-lg" required>
                </div>
                <div>
                  <label for="property-area" class="block text-sm font-medium text-gray-700 mb-1">Superficie (ha)</label>
                  <input type="number" id="property-area" class="w-full px-3 py-2 border rounded-lg" step="0.01">
                </div>
                <div class="md:col-span-2">
                  <label for="property-description" class="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                  <textarea id="property-description" class="w-full px-3 py-2 border rounded-lg" rows="3"></textarea>
                </div>
              </div>
              
              <h4 class="font-medium text-gray-700 mb-3">Información del Propietario</h4>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label for="propietario-rut" class="block text-sm font-medium text-gray-700 mb-1">RUT Propietario</label>
                  <input type="text" id="propietario-rut" class="w-full px-3 py-2 border rounded-lg" required>
                </div>
                <div>
                  <label for="propietario-nombre" class="block text-sm font-medium text-gray-700 mb-1">Nombre Propietario</label>
                  <input type="text" id="propietario-nombre" class="w-full px-3 py-2 border rounded-lg" required>
                </div>
              </div>
              
              <h4 class="font-medium text-gray-700 mb-3">Modelo de Compra</h4>
              <div class="mb-4">
                <select id="purchase-model" class="w-full px-3 py-2 border rounded-lg" required>
                  <option value="">Seleccione un modelo</option>
                  <option value="directo">Compra Directa</option>
                  <option value="intermediario">Con Intermediario</option>
                </select>
              </div>
              
              <div id="intermediario-fields" class="hidden grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label for="intermediario-rut" class="block text-sm font-medium text-gray-700 mb-1">RUT Intermediario</label>
                  <input type="text" id="intermediario-rut" class="w-full px-3 py-2 border rounded-lg">
                </div>
                <div>
                  <label for="intermediario-nombre" class="block text-sm font-medium text-gray-700 mb-1">Nombre Intermediario</label>
                  <input type="text" id="intermediario-nombre" class="w-full px-3 py-2 border rounded-lg">
                </div>
              </div>
              
              <div class="flex justify-end">
                <button type="button" id="cancel-add-property" class="bg-gray-300 hover:bg-gray-400 text-gray-800 font-medium py-2 px-4 rounded-lg mr-2">Cancelar</button>
                <button type="submit" class="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg">Guardar Predio</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Agregar event listeners al modal
    document.getElementById('close-add-modal').addEventListener('click', closeAddPropertyModal);
    document.getElementById('cancel-add-property').addEventListener('click', closeAddPropertyModal);
    document.getElementById('add-property-form').addEventListener('submit', saveProperty);
    
    // Mostrar/ocultar campos de intermediario según el modelo de compra
    document.getElementById('purchase-model').addEventListener('change', function() {
      const intermediarioFields = document.getElementById('intermediario-fields');
      if (this.value === 'intermediario') {
        intermediarioFields.classList.remove('hidden');
      } else {
        intermediarioFields.classList.add('hidden');
      }
    });
  }
  
  // Mostrar el modal
  document.getElementById('add-property-modal').classList.remove('hidden');
}

// Función para cerrar el modal de agregar predio
function closeAddPropertyModal() {
  const modal = document.getElementById('add-property-modal');
  if (modal) {
    modal.classList.add('hidden');
    document.getElementById('add-property-form').reset();
  }
}

// Función para validar RUT chileno
function validateRUT(rutInput) {
  const rutValue = rutInput.value.replace(/\./g, '').replace('-', '');
  if (rutValue.length < 2) {
    alert('RUT inválido');
    return false;
  }
  
  const dv = rutValue.slice(-1);
  const rut = rutValue.slice(0, -1);
  
  let suma = 0;
  let multiplo = 2;
  
  for (let i = rut.length - 1; i >= 0; i--) {
    suma += parseInt(rut.charAt(i)) * multiplo;
    multiplo = multiplo < 7 ? multiplo + 1 : 2;
  }
  
  const dvEsperado = 11 - (suma % 11);
  const dvCalculado = dvEsperado === 11 ? '0' : dvEsperado === 10 ? 'K' : dvEsperado.toString();
  
  if (dv.toUpperCase() !== dvCalculado) {
    alert('RUT inválido');
    return false;
  }
  
  return true;
}

// Función para mostrar el formulario de agregar predio
function showAddPropertyForm() {
  console.log('Botón Nuevo clickeado');
  
  // Crear el modal si no existe
  if (!document.getElementById('add-property-modal')) {
    const modalHTML = `
      <div id="add-property-modal" class="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
        <div class="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-screen overflow-y-auto">
          <div class="border-b px-6 py-4 flex justify-between items-center">
            <h3 class="text-lg font-semibold text-gray-800">Agregar Nuevo Predio</h3>
            <button id="close-add-modal" class="text-gray-500 hover:text-gray-700">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div class="p-6">
            <form id="add-property-form" class="space-y-6">
              <!-- Información básica del predio -->
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Nombre del Predio <span class="text-red-500">*</span></label>
                  <input type="text" id="property-name" class="w-full px-4 py-2 border rounded-lg" required>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Rol <span class="text-red-500">*</span></label>
                  <input type="text" id="property-rol" class="w-full px-4 py-2 border rounded-lg" required>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Ubicación <span class="text-red-500">*</span></label>
                  <input type="text" id="property-location" class="w-full px-4 py-2 border rounded-lg" required>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Superficie (ha)</label>
                  <input type="number" id="property-area" class="w-full px-4 py-2 border rounded-lg" step="0.01">
                </div>
              </div>
              
              <!-- Descripción -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                <textarea id="property-description" class="w-full px-4 py-2 border rounded-lg" rows="3"></textarea>
              </div>
              
              <div class="flex justify-end">
                <button type="button" id="cancel-add-property" class="bg-gray-300 hover:bg-gray-400 text-gray-800 font-medium py-2 px-4 rounded-lg mr-2">Cancelar</button>
                <button type="submit" class="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg">Guardar Predio</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    `;
    
    // Agregar el modal al DOM
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Configurar event listeners
    document.getElementById('close-add-modal').addEventListener('click', closeAddPropertyModal);
    document.getElementById('cancel-add-property').addEventListener('click', closeAddPropertyModal);
    document.getElementById('add-property-form').addEventListener('submit', saveProperty);
  }
  
  // Mostrar el modal
  const modal = document.getElementById('add-property-modal');
  if (modal) {
    modal.classList.remove('hidden');
  } else {
    console.error('No se encontró el modal add-property-modal');
  }
}

// Función para cerrar el modal
function closeAddPropertyModal() {
  const modal = document.getElementById('add-property-modal');
  if (modal) {
    modal.classList.add('hidden');
    document.getElementById('add-property-form').reset();
  }
}

// Función para validar RUT chileno
function validateRUT(rutInput) {
  const rutValue = rutInput.value.replace(/\./g, '').replace('-', '');
  if (rutValue.length < 2) {
    alert('RUT inválido');
    return false;
  }
  
  const dv = rutValue.slice(-1);
  const rut = rutValue.slice(0, -1);
  
  let suma = 0;
  let multiplo = 2;
  
  for (let i = rut.length - 1; i >= 0; i--) {
    suma += parseInt(rut.charAt(i)) * multiplo;
    multiplo = multiplo < 7 ? multiplo + 1 : 2;
  }
  
  const dvEsperado = 11 - (suma % 11);
  const dvCalculado = dvEsperado === 11 ? '0' : dvEsperado === 10 ? 'K' : dvEsperado.toString();
  
  if (dv.toUpperCase() !== dvCalculado) {
    alert('RUT inválido');
    return false;
  }
  
  return true;
}

// Función para manejar el cambio en el modelo de compras
function handlePurchaseModel() {
  const purchaseModel = document.getElementById('purchase-model').value;
  const intermediarioSection = document.getElementById('intermediario-section');
  const facturaIntermediarioField = document.getElementById('factura-intermediario-field');
  
  if (purchaseModel === 'intermediario') {
    intermediarioSection.style.display = 'block';
    facturaIntermediarioField.style.display = 'block';
    
    // Hacer campos de intermediario requeridos
    document.getElementById('intermediario-rut').required = true;
    document.getElementById('intermediario-nombre').required = true;
  } else {
    intermediarioSection.style.display = 'none';
    facturaIntermediarioField.style.display = 'none';
    
    // Quitar requerido de campos de intermediario
    document.getElementById('intermediario-rut').required = false;
    document.getElementById('intermediario-nombre').required = false;
  }
}

// Función para validar RUT chileno
function validateRUT(input) {
  const rut = input.value.trim();
  
  // Expresión regular para validar formato RUT chileno (12.345.678-9)
  const rutRegex = /^(\d{1,3}(\.?\d{3}){2}-[\dkK])$/;
  
  if (!rutRegex.test(rut) && rut !== '') {
    input.classList.add('border-red-500');
    alert('El formato del RUT no es válido. Utilice el formato 12.345.678-9');
    return false;
  } else {
    input.classList.remove('border-red-500');
    return true;
  }
}

// Función para guardar el predio
function saveProperty(event) {
  event.preventDefault();
  
  // Obtener el token de autenticación
  const token = localStorage.getItem('token');
  if (!token) {
    alert('No se encontró un token de autenticación. Por favor, inicie sesión nuevamente.');
    window.location.href = '/';
    return;
  }
  
  // Obtener los valores del formulario
  const propertyName = document.getElementById('property-name').value;
  const propertyRol = document.getElementById('property-rol').value;
  const propertyLocation = document.getElementById('property-location').value;
  const propertyArea = document.getElementById('property-area').value;
  const propertyDescription = document.getElementById('property-description').value;
  
  // Validar campos requeridos
  if (!propertyName || !propertyRol || !propertyLocation) {
    alert('Por favor complete todos los campos requeridos');
    return;
  }
  
  // Mostrar indicador de carga
  const submitButton = document.querySelector('#add-property-form button[type="submit"]');
  const originalText = submitButton.innerHTML;
  submitButton.innerHTML = '<svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline-block" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Guardando...';
  submitButton.disabled = true;
  
  // Crear el objeto de datos del predio
  const propertyData = {
    nombre: propertyName,
    rol: propertyRol,
    ubicacion: propertyLocation,
    superficie: propertyArea ? parseFloat(propertyArea) : null,
    descripcion: propertyDescription
  };
  
  // Enviar los datos al servidor
  fetch('/api/predios', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(propertyData)
  })
  .then(response => {
    if (!response.ok) {
      throw new Error('Error al guardar el predio');
    }
    return response.json();
  })
  .then(data => {
    console.log('Predio guardado con ID:', data.id);
    
    // Cerrar el modal
    closeAddPropertyModal();
    
    // Recargar la lista de predios
    loadProperties();
    
    // Mostrar mensaje de éxito
    alert('Predio guardado exitosamente');
  })
  .catch(error => {
    console.error('Error al guardar predio:', error);
    alert('Error al guardar el predio: ' + error.message);
  })
  .finally(() => {
    // Restaurar el botón
    submitButton.innerHTML = originalText;
    submitButton.disabled = false;
  });
}

function closeAddPropertyModal() {
  const modal = document.getElementById('add-property-modal');
  if (modal) {
    modal.classList.add('hidden');
    // Limpiar el formulario
    document.getElementById('add-property-form').reset();
  }
}

// Función para validar RUT chileno
function validateRUT(rutInput) {
  const rutValue = rutInput.value.replace(/\./g, '').replace('-', '');
  if (rutValue.length < 2) {
    alert('RUT inválido');
    return false;
  }
  
  const dv = rutValue.slice(-1);
  const rut = rutValue.slice(0, -1);
  
  let suma = 0;
  let multiplo = 2;
  
  for (let i = rut.length - 1; i >= 0; i--) {
    suma += parseInt(rut.charAt(i)) * multiplo;
    multiplo = multiplo < 7 ? multiplo + 1 : 2;
  }
  
  const dvEsperado = 11 - (suma % 11);
  const dvCalculado = dvEsperado === 11 ? '0' : dvEsperado === 10 ? 'K' : dvEsperado.toString();
  
  if (dv.toUpperCase() !== dvCalculado) {
    alert('RUT inválido');
    return false;
  }
  
  return true;
}

// Función para manejar el cambio en el modelo de compras
function handlePurchaseModel() {
  const purchaseModel = document.getElementById('purchase-model').value;
  const intermediarioSection = document.getElementById('intermediario-section');
  const facturaIntermediarioField = document.getElementById('factura-intermediario-field');
  
  if (purchaseModel === 'intermediario') {
    intermediarioSection.style.display = 'block';
    facturaIntermediarioField.style.display = 'block';
    
    // Hacer campos de intermediario requeridos
    document.getElementById('intermediario-rut').required = true;
    document.getElementById('intermediario-nombre').required = true;
  } else {
    intermediarioSection.style.display = 'none';
    facturaIntermediarioField.style.display = 'none';
    
    // Quitar requerido de campos de intermediario
    document.getElementById('intermediario-rut').required = false;
    document.getElementById('intermediario-nombre').required = false;
  }
}

// Función para validar RUT chileno
function validateRUT(input) {
  const rut = input.value.trim();
  
  // Expresión regular para validar formato RUT chileno (12.345.678-9)
  const rutRegex = /^(\d{1,3}(\.?\d{3}){2}-[\dkK])$/;
  
  if (!rutRegex.test(rut) && rut !== '') {
    input.classList.add('border-red-500');
    alert('El formato del RUT no es válido. Utilice el formato 12.345.678-9');
    return false;
  } else {
    input.classList.remove('border-red-500');
    return true;
  }
}

// Función para guardar el predio
function saveProperty(event) {
  event.preventDefault();
  
  // Obtener el token de autenticación
  const token = localStorage.getItem('token');
  if (!token) {
    alert('No se encontró un token de autenticación. Por favor, inicie sesión nuevamente.');
    window.location.href = '/';
    return;
  }
  
  // Obtener los valores del formulario
  const propertyName = document.getElementById('property-name').value;
  const propertyRol = document.getElementById('property-rol').value;
  const propertyLocation = document.getElementById('property-location').value;
  const propertyArea = document.getElementById('property-area').value;
  const propertyDescription = document.getElementById('property-description').value;
  
  // Validar campos requeridos
  if (!propertyName || !propertyRol || !propertyLocation) {
    alert('Por favor complete todos los campos requeridos');
    return;
  }
  
  // Mostrar indicador de carga
  const submitButton = document.querySelector('#add-property-form button[type="submit"]');
  const originalText = submitButton.innerHTML;
  submitButton.innerHTML = '<svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline-block" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Guardando...';
  submitButton.disabled = true;
  
  // Crear el objeto de datos del predio
  const propertyData = {
    nombre: propertyName,
    rol: propertyRol,
    ubicacion: propertyLocation,
    superficie: propertyArea ? parseFloat(propertyArea) : null,
    descripcion: propertyDescription
  };
  
  // Enviar los datos al servidor
  fetch('/api/predios', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(propertyData)
  })
  .then(response => {
    if (!response.ok) {
      throw new Error('Error al guardar el predio');
    }
    return response.json();
  })
  .then(data => {
    console.log('Predio guardado con ID:', data.id);
    
    // Cerrar el modal
    closeAddPropertyModal();
    
    // Recargar la lista de predios
    loadProperties();
    
    // Mostrar mensaje de éxito
    alert('Predio guardado exitosamente');
  })
  .catch(error => {
    console.error('Error al guardar predio:', error);
    alert('Error al guardar el predio: ' + error.message);
  })
  .finally(() => {
    // Restaurar el botón
    submitButton.innerHTML = originalText;
    submitButton.disabled = false;
  });
}
