
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