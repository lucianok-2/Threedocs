// Funciones para el dashboard

async function fetchAndDisplayHistory() {
  const historialList = document.getElementById('historial-lista');
  const loadingIndicator = document.getElementById('historial-loading'); // If added

  if (!historialList) {
    console.error('Elemento #historial-lista no encontrado.');
    return;
  }

  const token = localStorage.getItem('token');
  if (!token) {
    if(loadingIndicator) loadingIndicator.remove();
    historialList.innerHTML = '<li>Error: No autenticado. Por favor, inicie sesión.</li>';
    return;
  }

  try {
    const response = await fetch('/api/historial?limit=10', { // Fetch last 10 entries
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Error del servidor: ${response.status}`);
    }

    const historyEntries = await response.json();

    if (loadingIndicator) loadingIndicator.remove(); // Remove loading indicator
    historialList.innerHTML = ''; // Clear any existing content (like the loading message)

    if (historyEntries.length === 0) {
      historialList.innerHTML = '<li>No hay actividad reciente para mostrar.</li>';
      return;
    }

    historyEntries.forEach(entry => {
      const li = document.createElement('li');
      // li.className = 'relative pb-8'; // Match existing styling - pb-8 is too much for each item if ul has -mb-8

      let actionText = '';
      let entityText = '';
      let entityLink = '#'; // Default link

      // Construct action text based on entry.actionType
      switch (entry.actionType) {
        case 'UPLOAD_DOCUMENT':
          actionText = 'subió el documento';
          entityText = entry.documentDetails?.documentTitle || entry.documentDetails?.originalName || entry.entityId;
          if (entry.documentDetails?.idPredio) {
            // Potentially link to the property or document view
            // entityLink = `/properties/${entry.documentDetails.idPredio}/documents/${entry.id}`;
             actionText += ` al predio '${entry.propertyDetails?.nombre || entry.documentDetails.idPredio}'`;
          }
          break;
        case 'DELETE_DOCUMENT':
          actionText = 'eliminó el documento';
          entityText = entry.details?.fileName || entry.entityId; // details from history entry itself
          // No direct link as it's deleted
          if (entry.details?.idPredio) {
             actionText += ` del predio '${entry.propertyDetails?.nombre || entry.details.idPredio}'`;
          }
          break;
        case 'CREATE_PROPERTY':
          actionText = 'creó el predio';
          entityText = entry.propertyDetails?.nombre || entry.entityId;
          // entityLink = `/properties/${entry.entityId}`;
          break;
        case 'UPDATE_PROPERTY':
          actionText = 'actualizó el predio';
          entityText = entry.propertyDetails?.nombre || entry.entityId;
          // entityLink = `/properties/${entry.entityId}`;
          break;
        case 'DELETE_PROPERTY':
          actionText = 'eliminó el predio';
          entityText = entry.details?.propertyName || entry.entityId; // details from history entry
          // No direct link
          break;
        default:
          actionText = entry.actionType.toLowerCase().replace(/_/g, ' '); // Replace underscores
      }
      
      const userEmail = entry.userDetails?.email || 'Usuario desconocido';
      // Convert Firestore timestamp to readable date
      let eventTime = 'Fecha desconocida';
      if (entry.timestamp && entry.timestamp.seconds) {
        eventTime = new Date(entry.timestamp.seconds * 1000).toLocaleString();
      } else if (entry.timestamp && typeof entry.timestamp === 'string'){ // If already converted
         eventTime = new Date(entry.timestamp).toLocaleString();
      }


      // Using a structure similar to the original hardcoded one
      // Adding pb-4 to each li if -mb-8 is removed from ul, or adjust as needed.
      // For now, assuming the original -mb-8 on ul and pb-8 on li is for the *last* item effect with the line.
      // We will add pb-8 to each li for consistency with the original example's appearance for multiple items.
      li.className = 'relative pb-8';
      
      li.innerHTML = `
        <span class="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200" aria-hidden="true"></span>
        <div class="relative flex space-x-3">
          <div>
            <span class="h-8 w-8 rounded-full bg-gray-400 flex items-center justify-center ring-8 ring-white">
              <svg class="h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd" />
              </svg>
            </span>
          </div>
          <div class="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
            <div>
              <p class="text-sm text-gray-500">
                <span class="font-medium text-gray-900">${userEmail}</span>
                ${actionText}
                ${entityText ? `<a href="${entityLink}" class="font-medium text-gray-900 hover:text-blue-600">${entityText}</a>` : ''}.
              </p>
            </div>
            <div class="text-right text-sm whitespace-nowrap text-gray-500">
              <time datetime="${entry.timestamp?.seconds ? new Date(entry.timestamp.seconds * 1000).toISOString() : ''}">${eventTime}</time>
            </div>
          </div>
        </div>
      `;
      historialList.appendChild(li);
    });

  } catch (error) {
    console.error('Error al cargar el historial:', error);
    if (loadingIndicator) loadingIndicator.remove();
    historialList.innerHTML = `<li>Error al cargar el historial: ${error.message}</li>`;
  }
}
async function fetchCounts() {
  const token = localStorage.getItem('token');
  if (!token) return;
  try {
    const response = await fetch('/api/stats', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) throw new Error('Error al obtener estadísticas');
    const data = await response.json();
    const docEl = document.getElementById('document-count');
    const propEl = document.getElementById('property-count');
    if (docEl) docEl.textContent = data.documents;
    if (propEl) propEl.textContent = data.properties;
  } catch (error) {
    console.error('Error al cargar contadores:', error);
  }
}


async function fetchRecentDocuments() {
  const token = localStorage.getItem('token');
  if (!token) return;
  try {
    const response = await fetch('/api/documentos/recientes?limit=5', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) throw new Error('Error al obtener documentos recientes');
    const docs = await response.json();
    const tbody = document.getElementById('recent-documents-body');
    const loadingRow = document.getElementById('recent-documents-loading');
    if (loadingRow) loadingRow.remove();
    if (!tbody) return;
    tbody.innerHTML = '';
    if (docs.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="px-6 py-4 text-center text-gray-500">No hay documentos recientes</td></tr>';
      return;
    }
    docs.forEach(doc => {
      const tr = document.createElement('tr');
      const fecha = doc.fecha_subida && doc.fecha_subida._seconds ? new Date(doc.fecha_subida._seconds * 1000) : null;
      tr.innerHTML = `
        <td class="px-6 py-4 whitespace-nowrap">
          <div class="flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-blue-500 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clip-rule="evenodd" />
            </svg>
            <div class="text-sm font-medium text-gray-900">${doc.nombre || doc.nombre_original || 'Documento'}</div>
          </div>
        </td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${doc.tipo_documento || ''}</td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${doc.nombre_predio || doc.id_predio || ''}</td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${fecha ? fecha.toLocaleDateString() : ''}</td>
        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
          <a href="${doc.url_archivo || '#'}" target="_blank" class="text-blue-600 hover:text-blue-900 mr-3">Ver</a>
        </td>`;
      tbody.appendChild(tr);
    });
  } catch (error) {
    console.error('Error al cargar documentos recientes:', error);
    const tbody = document.getElementById('recent-documents-body');
    if (tbody) {
      tbody.innerHTML = '<tr><td colspan="5" class="px-6 py-4 text-center text-red-500">Error al cargar documentos</td></tr>';
    }
  }
}
document.addEventListener('DOMContentLoaded', function() {
  // Configurar la barra lateral
  // setupSidebar(); // Assuming setupSidebar is defined elsewhere or not strictly needed for this change
  if (typeof setupSidebar === 'function') {
    setupSidebar();
  }
  
  // Configurar botón de subir documentos
  const goToUploadBtn = document.getElementById('go-to-upload');
  if (goToUploadBtn) {
    goToUploadBtn.addEventListener('click', function() {
      const token = localStorage.getItem('token');
      if (token) {
        window.location.href = `/upload`;
      } else {
        alert('No se encontró un token de autenticación. Por favor, inicie sesión nuevamente.');
        window.location.href = '/';
      }
    });
  }
  
  // Configurar enlace de subir documentos en la barra lateral
  const uploadLink = document.getElementById('upload-link');
  if (uploadLink) {
    uploadLink.addEventListener('click', function() {
      const token = localStorage.getItem('token');
      if (token) {
        window.location.href = `/upload`;
      } else {
        alert('No se encontró un token de autenticación. Por favor, inicie sesión nuevamente.');
        window.location.href = '/';
      }
    });
  }
  
  // Configurar botón de cerrar sesión
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', function(e) {
      e.preventDefault();
      // Eliminar token
      localStorage.removeItem('token');
      sessionStorage.removeItem('token');
      // Redireccionar al login
      window.location.href = '/';
    });
  }

  // Fetch and display history
  if (document.getElementById('historial-lista')) {
    fetchAndDisplayHistory();
  }
  if (document.getElementById('recent-documents-body')) {
    fetchRecentDocuments();
  }
  fetchCounts();
});

function toggleFolder(folderId) {
  const folderContent = document.getElementById(`${folderId}-content`);
  const folderIcon = document.getElementById(`${folderId}-icon`);
  
  if (folderContent.classList.contains('hidden')) {
    folderContent.classList.remove('hidden');
    folderIcon.setAttribute('d', 'M19 9l-7 7-7-7');
  } else {
    folderContent.classList.add('hidden');
    folderIcon.setAttribute('d', 'M9 5l7 7-7 7');
  }
}