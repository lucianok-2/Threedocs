// ... existing code ...

// Función para cargar los documentos de un predio
function loadPropertyDocuments(propertyId) {
  const token = localStorage.getItem('token');
  if (!token) {
    alert('No se encontró un token de autenticación. Por favor, inicie sesión nuevamente.');
    window.location.href = '/';
    return;
  }
  
  const documentList = document.getElementById('document-list');
  if (documentList) {
    documentList.innerHTML = '<p class="text-gray-500 text-center py-4">Cargando documentos...</p>';
    
    // Realizar la petición para obtener los documentos del predio
    fetch(`/api/predios/${propertyId}/documentos`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    .then(response => {
      if (!response.ok) {
        throw new Error('Error al cargar los documentos');
      }
      return response.json();
    })
    .then(data => {
      if (data.length === 0) {
        documentList.innerHTML = '<p class="text-gray-500 text-center py-4">No hay documentos disponibles</p>';
      } else {
        documentList.innerHTML = '';
        data.forEach(document => {
          const documentItem = document.createElement('div');
          documentItem.className = 'mb-4 p-4 border rounded-lg';
          documentItem.innerHTML = `
            <div class="flex justify-between items-center">
              <div>
                <div class="font-medium">${document.nombre}</div>
                <div class="text-sm text-gray-600">${new Date(document.fechaSubida).toLocaleDateString()}</div>
              </div>
              <div>
                <a href="${document.url}" target="_blank" class="text-blue-600 hover:text-blue-800 mr-2">Ver</a>
                <button class="text-red-600 hover:text-red-800 delete-document" data-id="${document._id}">Eliminar</button>
              </div>
            </div>
          `;
          documentList.appendChild(documentItem);
        });
        
        // Agregar event listeners a los botones de eliminar
        const deleteButtons = documentList.querySelectorAll('.delete-document');
        deleteButtons.forEach(button => {
          button.addEventListener('click', function() {
            const documentId = this.getAttribute('data-id');
            if (confirm('¿Está seguro de que desea eliminar este documento?')) {
              deleteDocument(propertyId, documentId);
            }
          });
        });
      }
    })
    .catch(error => {
      console.error('Error:', error);
      documentList.innerHTML = '<p class="text-red-500 text-center py-4">Error al cargar los documentos</p>';
    });
  }
}

// Función para eliminar un documento
function deleteDocument(propertyId, documentId) {
  const token = localStorage.getItem('token');
  if (!token) {
    alert('No se encontró un token de autenticación. Por favor, inicie sesión nuevamente.');
    window.location.href = '/';
    return;
  }
  
  fetch(`/api/predios/${propertyId}/documentos/${documentId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })
  .then(response => {
    if (!response.ok) {
      throw new Error('Error al eliminar el documento');
    }
    return response.json();
  })
  .then(data => {
    alert('Documento eliminado correctamente');
    loadPropertyDocuments(propertyId);
  })
  .catch(error => {
    console.error('Error:', error);
    alert('Error al eliminar el documento');
  });
}

// Función para mostrar el modal de añadir propiedad
function showAddPropertyModal() {
  const modal = document.getElementById('add-property-modal');
  if (modal) {
    modal.classList.remove('hidden');
    
    // Limpiar el formulario
    const form = document.getElementById('add-property-form');
    if (form) {
      form.reset();
    }
    
    // Configurar los botones
    setupAddModalButtons();
  }
}

// Cargar la funcionalidad de la barra lateral cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
  if (typeof setupSidebar === 'function') {
    setupSidebar();
  } else {
    console.error('La función setupSidebar no está disponible');
  }
  
  // Configurar el botón para añadir nuevo predio
  const addPropertyBtn = document.getElementById('add-property-btn');
  
  if (addPropertyBtn) {
    addPropertyBtn.addEventListener('click', function() {
      // Mostrar el formulario de añadir predio
      showAddPropertyForm();
    });
  }
 
  
  const propertyForm = document.getElementById('property-form');
  if (propertyForm) {
    propertyForm.addEventListener('submit', function(e) {
      e.preventDefault();
      
      // Obtener los datos del formulario
      const formData = new FormData(propertyForm);
      const propertyData = {
        nombre: formData.get('nombre'),
        ubicacion: formData.get('ubicacion'),
        superficie: formData.get('superficie'),
        propietario: formData.get('propietario'),
        descripcion: formData.get('descripcion')
      };
      
      // Obtener el token de autenticación
      const token = localStorage.getItem('token');
      if (!token) {
        alert('No se encontró un token de autenticación. Por favor, inicie sesión nuevamente.');
        window.location.href = '/';
        return;
      }
      
      // Determinar si es una adición o una actualización
      const isAdd = propertyForm.dataset.mode === 'add';
      const url = isAdd ? '/api/predios' : `/api/predios/${propertyForm.dataset.id}`;
      const method = isAdd ? 'POST' : 'PUT';
      
      // Enviar la solicitud a la API
      fetch(url, {
        method: method,
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
        alert(isAdd ? 'Predio añadido correctamente' : 'Predio actualizado correctamente');
        // Ocultar el formulario y actualizar la lista de predios
        document.getElementById('property-form-container').classList.add('hidden');
        loadProperties(); // Función para cargar los predios desde la API
      })
      .catch(error => {
        console.error('Error:', error);
        alert('Error al guardar el predio');
      });
    });
  }
});

// Función para cargar los predios desde la API
function loadProperties() {
  const token = localStorage.getItem('token');
  if (!token) {
    alert('No se encontró un token de autenticación. Por favor, inicie sesión nuevamente.');
    window.location.href = '/';
    return;
  }
  
  const propertyList = document.getElementById('property-list');
  if (propertyList) {
    propertyList.innerHTML = '<p class="text-gray-500 text-center py-4">Cargando predios...</p>';
    
    fetch('/api/predios', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    .then(response => {
      if (!response.ok) {
        throw new Error('Error al cargar los predios');
      }
      return response.json();
    })
    .then(data => {
      if (data.length === 0) {
        propertyList.innerHTML = '<p class="text-gray-500 text-center py-4">No hay predios disponibles</p>';
      } else {
        propertyList.innerHTML = '';
        data.forEach(property => {
          const propertyItem = document.createElement('div');
          propertyItem.className = 'py-2 px-3 hover:bg-gray-100 cursor-pointer rounded';
          propertyItem.innerHTML = `
            <div class="font-medium">${property.nombre}</div>
            <div class="text-sm text-gray-600">${property.ubicacion}</div>
          `;
          propertyItem.addEventListener('click', function() {
            loadPropertyDetails(property._id);
          });
          propertyList.appendChild(propertyItem);
        });
      }
    })
    .catch(error => {
      console.error('Error:', error);
      propertyList.innerHTML = '<p class="text-red-500 text-center py-4">Error al cargar los predios</p>';
    });
  }
}

// Cargar los predios al iniciar la página
document.addEventListener('DOMContentLoaded', loadProperties);

// Función para mostrar el formulario de añadir predio
function showAddPropertyForm() {
  // Usar la función del archivo de modales
  if (window.modalHelpers && window.modalHelpers.showAddPropertyModal) {
    window.modalHelpers.showAddPropertyModal();
    
    // Configurar los botones
    setupAddModalButtons();
  } else {
    console.error('Las funciones de modales no están disponibles');
    
    // Fallback al código original si las funciones no están disponibles
    const modal = document.getElementById('add-property-modal');
    if (modal) {
      modal.classList.remove('hidden');
      
      // Limpiar el formulario
      const form = document.getElementById('add-property-form');
      if (form) {
        form.reset();
      }
      
      // Configurar los botones
      setupAddModalButtons();
    }
  }
}

// Configurar los botones del modal de añadir predio
function setupAddModalButtons() {
  // Botón para cerrar el modal
  const closeBtn = document.getElementById('close-add-modal');
  if (closeBtn) {
    // Eliminar event listeners anteriores
    const newCloseBtn = closeBtn.cloneNode(true);
    closeBtn.parentNode.replaceChild(newCloseBtn, closeBtn);
    
    // Agregar nuevo event listener
    newCloseBtn.addEventListener('click', function() {
      if (window.modalHelpers && window.modalHelpers.closeAddPropertyModal) {
        window.modalHelpers.closeAddPropertyModal();
      } else {
        document.getElementById('add-property-modal').classList.add('hidden');
      }
    });
  }
  
  // Botón para cancelar
  const cancelBtn = document.getElementById('cancel-add-property');
  if (cancelBtn) {
    // Eliminar event listeners anteriores
    const newCancelBtn = cancelBtn.cloneNode(true);
    cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);
    
    // Agregar nuevo event listener
    newCancelBtn.addEventListener('click', function() {
      if (window.modalHelpers && window.modalHelpers.closeAddPropertyModal) {
        window.modalHelpers.closeAddPropertyModal();
      } else {
        document.getElementById('add-property-modal').classList.add('hidden');
      }
    });
  }
  
  // Configurar el formulario
  const addForm = document.getElementById('add-property-form');
  if (addForm) {
    // Eliminar event listeners anteriores
    const newAddForm = addForm.cloneNode(true);
    addForm.parentNode.replaceChild(newAddForm, addForm);
    
    // Agregar nuevo event listener
    newAddForm.addEventListener('submit', function(e) {
      e.preventDefault();
      
      // Obtener los datos del formulario
      const formData = new FormData(this);
      const propertyData = {
        nombre: formData.get('nombre'),
        rol: formData.get('rol'),
        ubicacion: formData.get('ubicacion'),
        superficie: formData.get('superficie'),
        propietario: {
          nombre: formData.get('propietario')
        }
      };
      
      // Guardar el predio en Firestore
      const db = firebase.firestore();
      
      // Obtener el usuario actual
      const user = firebase.auth().currentUser;
      
      if (!user) {
        alert('No hay usuario autenticado');
        return;
      }
      
      // Añadir el ID del usuario al predio
      propertyData.id_user = user.uid;
      
      // Guardar en Firestore
      db.collection('predios').add(propertyData)
        .then(() => {
          alert('Predio añadido correctamente');
          document.getElementById('add-property-modal').classList.add('hidden');
          loadProperties(); // Recargar la lista de predios
        })
        .catch(error => {
          console.error('Error al añadir predio:', error);
          alert('Error al añadir el predio: ' + error.message);
        });
    });
  }
}

// Función para mostrar el modal de añadir predio
function showAddPropertyModal() {
  document.getElementById('add-property-modal').classList.remove('hidden');
}

// Función para cerrar el modal de añadir predio
function closeAddPropertyModal() {
  document.getElementById('add-property-modal').classList.add('hidden');
}

// Función para mostrar/ocultar sección de intermediario según el modelo de compra
function toggleIntermediarySection(modalType) {
  const purchaseModel = document.getElementById(`${modalType}-purchase-model`).value;
  const intermediarySection = document.getElementById(`${modalType}-intermediary-section`);
  
  if (purchaseModel === 'Intermediario') {
    intermediarySection.classList.remove('hidden');
    // Hacer campos de intermediario requeridos
    const requiredFields = intermediarySection.querySelectorAll('input[name="nombreIntermediario"], input[name="rutIntermediario"]');
    requiredFields.forEach(field => field.setAttribute('required', ''));
  } else {
    intermediarySection.classList.add('hidden');
    // Quitar required de los campos de intermediario
    const fields = intermediarySection.querySelectorAll('input');
    fields.forEach(field => field.removeAttribute('required'));
  }
}

// Función para cargar detalles del predio
function loadPropertyDetails(propertyId) {
  const token = localStorage.getItem('token');
  if (!token) {
    alert('No se encontró un token de autenticación. Por favor, inicie sesión nuevamente.');
    window.location.href = '/';
    return;
  }
  
  // Mostrar secciones de detalles
  document.getElementById('property-details').classList.remove('hidden');
  document.getElementById('property-documents').classList.remove('hidden');
  
  // Mostrar mensaje de carga
  document.getElementById('property-info').innerHTML = '<p class="text-gray-500 text-center py-4">Cargando detalles del predio...</p>';
  
  fetch(`/api/predios/${propertyId}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })
  .then(response => {
    if (!response.ok) {
      throw new Error('Error al cargar los detalles del predio');
    }
    return response.json();
  })
  .then(property => {
    // Rellenar información del predio
    const propertyInfo = document.getElementById('property-info');
    propertyInfo.innerHTML = `
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <p class="text-sm text-gray-500">Nombre del Predio</p>
          <p class="font-medium">${property.nombre}</p>
        </div>
        <div>
          <p class="text-sm text-gray-500">Rol</p>
          <p class="font-medium">${property.rol || 'No especificado'}</p>
        </div>
        <div>
          <p class="text-sm text-gray-500">Modelo de Compra</p>
          <p class="font-medium">${property.modeloCompra || 'Propietario'}</p>
        </div>
        <div>
          <p class="text-sm text-gray-500">RUT Propietario</p>
          <p class="font-medium">${property.rutPropietario || 'No especificado'}</p>
        </div>
      </div>
    `;
    
    // Cargar documentos del predio
    loadPropertyDocuments(propertyId);
  })
  .catch(error => {
    console.error('Error:', error);
    document.getElementById('property-info').innerHTML = '<p class="text-red-500 text-center py-4">Error al cargar los detalles del predio</p>';
  });
}

// Inicializar eventos cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
  // Cargar lista de predios
  loadProperties();
  
  // Configurar botón de añadir predio
  const addPropertyBtn = document.getElementById('add-property-btn');
  if (addPropertyBtn) {
    addPropertyBtn.addEventListener('click', showAddPropertyModal);
  }
  
  // Configurar botón de cerrar modal
  const closeAddModalBtn = document.getElementById('close-add-modal');
  if (closeAddModalBtn) {
    closeAddModalBtn.addEventListener('click', closeAddPropertyModal);
  }
  
  // Configurar cambio en modelo de compra para mostrar/ocultar sección de intermediario
  const addPurchaseModel = document.getElementById('add-purchase-model');
  if (addPurchaseModel) {
    addPurchaseModel.addEventListener('change', () => toggleIntermediarySection('add'));
  }
  
  const editPurchaseModel = document.getElementById('edit-purchase-model');
  if (editPurchaseModel) {
    editPurchaseModel.addEventListener('change', () => toggleIntermediarySection('edit'));
  }
  
  // Inicializar estado de secciones de intermediario
  if (addPurchaseModel) {
    toggleIntermediarySection('add');
  }
  
  if (editPurchaseModel) {
    toggleIntermediarySection('edit');
  }
});