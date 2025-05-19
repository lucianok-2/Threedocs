// ... existing code ...

// Cargar la funcionalidad de la barra lateral cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
  if (typeof setupSidebar === 'function') {
    setupSidebar();
  } else {
    console.error('La función setupSidebar no está disponible');
  }
  
  // Configurar el formulario para usar la colección "predios"
  const addPropertyBtn = document.getElementById('add-property-btn');
  
  if (addPropertyBtn) {
    addPropertyBtn.addEventListener('click', function() {
      // Mostrar el formulario de añadir predio
      showAddPropertyForm();
    });
  }
  const propertyForm = document.getElementById('property-form');
  
  if (addPropertyBtn && propertyForm) {
    addPropertyBtn.addEventListener('click', function() {
      // Mostrar el formulario de añadir predio
      document.getElementById('property-form-container').classList.remove('hidden');
      document.getElementById('property-details').classList.add('hidden');
      document.getElementById('property-documents').classList.add('hidden');
      
      // Limpiar el formulario
      propertyForm.reset();
      propertyForm.dataset.mode = 'add';
      propertyForm.dataset.id = '';
    });
    
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

// ... existing code ...