// src/public/js/dashboard.js

async function fetchAndDisplayHistory() {
  const token = localStorage.getItem('token');
  if (!token) {
    console.log('No token found for fetching history.');
    const list = document.getElementById('historial-lista');
    if (list) list.innerHTML = '<li class="text-sm text-gray-500">Se requiere autenticación para ver el historial.</li>';
    return;
  }

  try {
    const response = await fetch('/api/history?limit=5', { // Fetch latest 5 history items
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!response.ok) {
      let errorMessage = `Error HTTP ${response.status} al obtener historial.`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorData.error || errorMessage;
      } catch (e) {
        // Ignore if response is not JSON
      }
      throw new Error(errorMessage);
    }
    
    const history = await response.json();
    const list = document.getElementById('historial-lista');
    if (!list) return;

    list.innerHTML = ''; // Clear previous entries or loading message
    if (history.length === 0) {
      list.innerHTML = '<li class="text-sm text-gray-500 p-2">Sin actividad reciente.</li>';
      return;
    }

    const ICON_MAP = {
      CREATE_PROPERTY: { icon: 'fa-user-plus', bg: 'bg-purple-100 text-purple-600' },
      UPDATE_PROPERTY: { icon: 'fa-user-edit', bg: 'bg-blue-100 text-blue-600' },
      DELETE_PROPERTY: { icon: 'fa-trash', bg: 'bg-red-100 text-red-600' },
      UPLOAD_DOCUMENT: { icon: 'fa-file-upload', bg: 'bg-green-100 text-green-600' },
      DELETE_DOCUMENT: { icon: 'fa-file-alt', bg: 'bg-red-100 text-red-600' }, // Assumed action type
      DEFAULT: { icon: 'fa-history', bg: 'bg-gray-100 text-gray-600' }
    };

    history.forEach(entry => {
      const info = ICON_MAP[entry.actionType] || ICON_MAP.DEFAULT;
      const li = document.createElement('li');
      li.className = 'flex items-start p-2 hover:bg-gray-50 rounded-md';

      const iconWrap = document.createElement('div');
      iconWrap.className = `flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center ${info.bg}`;
      iconWrap.innerHTML = `<i class="fas ${info.icon} text-lg"></i>`;

      const content = document.createElement('div');
      content.className = 'ml-3';
      
      let detailText = entry.actionType ? entry.actionType.replace(/_/g, ' ').toLowerCase() : 'Acción desconocida';
      detailText = detailText.charAt(0).toUpperCase() + detailText.slice(1);

      if(entry.details) {
        if (entry.details.propertyName) detailText += `: ${entry.details.propertyName}`;
        else if (entry.details.documentName) detailText += `: ${entry.details.documentName}`;
        else if (entry.details.updatedFields) detailText += ` - Campos: ${entry.details.updatedFields.join(', ')}`;
        else if (entry.details.idPredio) detailText += ` (ID Predio: ${entry.details.idPredio})`;

      }

      const ts = entry.timestamp && entry.timestamp._seconds
        ? new Date(entry.timestamp._seconds * 1000)
        : (entry.timestamp ? new Date(entry.timestamp) : null);
      
      const dateStr = ts 
        ? ts.toLocaleDateString('es-ES', { year: 'numeric', month: 'short', day: 'numeric' }) + ' ' + ts.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit'}) 
        : 'Fecha desconocida';
      
      content.innerHTML = `<p class="text-sm font-medium text-gray-800">${detailText}</p>
                           <p class="text-xs text-gray-500">${dateStr}</p>`;

      li.appendChild(iconWrap);
      li.appendChild(content);
      list.appendChild(li);
    });
  } catch (error) {
    console.error('Error fetching history:', error);
    const list = document.getElementById('historial-lista');
    if (list) {
      list.innerHTML = `<li class="text-sm text-red-500 p-2">Error al cargar historial: ${error.message}</li>`;
    }
  }
}

async function fetchDashboardStats() {
  const token = localStorage.getItem('token');
  if (!token) {
    console.error('Token no encontrado para fetchDashboardStats');
    // Update UI to indicate missing token for all stats
    ['predios-registrados-count', 'predios-activos-count', 'documentos-subidos-count', 'cumplimiento-documental-percentage'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = 'Auth Req.';
    });
    const barEl = document.getElementById('cumplimiento-documental-bar');
    if (barEl) barEl.style.width = '0%';
    return;
  }

  try {
    const response = await fetch('/api/properties/stats', {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) {
      let errorMessage = `Error HTTP ${response.status} al cargar estadísticas.`;
       try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorData.error || errorMessage;
      } catch (e) {
        // Ignore if response is not JSON
      }
      throw new Error(errorMessage);
    }

    const data = await response.json();

    const prediosRegEl = document.getElementById('predios-registrados-count');
    const prediosActEl = document.getElementById('predios-activos-count');
    const docsSubidosEl = document.getElementById('documentos-subidos-count');
    const cumplDocPercEl = document.getElementById('cumplimiento-documental-percentage');
    const cumplDocBarEl = document.getElementById('cumplimiento-documental-bar');

    // Stat text elements (e.g., % change from last month) - currently not supplied by API
    const prediosRegStatEl = document.getElementById('predios-registrados-stat');
    const prediosActStatEl = document.getElementById('predios-activos-stat');
    const docsSubidosStatEl = document.getElementById('documentos-subidos-stat');

    if (prediosRegEl) prediosRegEl.textContent = data.prediosRegistrados !== undefined ? data.prediosRegistrados.toString() : 'N/A';
    if (prediosActEl) prediosActEl.textContent = data.prediosActivos !== undefined ? data.prediosActivos.toString() : 'N/A';
    if (docsSubidosEl) docsSubidosEl.textContent = data.documentosSubidos !== undefined ? data.documentosSubidos.toString() : 'N/A';
    if (cumplDocPercEl) cumplDocPercEl.textContent = (data.cumplimientoDocumental !== undefined ? data.cumplimientoDocumental : 0) + '%';
    if (cumplDocBarEl) cumplDocBarEl.style.width = (data.cumplimientoDocumental !== undefined ? data.cumplimientoDocumental : 0) + '%';
    
    if (prediosRegStatEl) prediosRegStatEl.textContent = ''; // Example: "+5% mes anterior" - Data not available
    if (prediosActStatEl) prediosActStatEl.textContent = '';
    if (docsSubidosStatEl) docsSubidosStatEl.textContent = '';

  } catch (error) {
    console.error('Error al cargar estadísticas del dashboard:', error);
    // Display error on one of the cards as an example
    const prediosRegEl = document.getElementById('predios-registrados-count');
    if(prediosRegEl) prediosRegEl.textContent = "Error";
    // Optionally set other fields to error too
    const cumplDocPercEl = document.getElementById('cumplimiento-documental-percentage');
    if (cumplDocPercEl) cumplDocPercEl.textContent = "Error";
    const cumplDocBarEl = document.getElementById('cumplimiento-documental-bar');
    if (cumplDocBarEl) cumplDocBarEl.style.width = '0%';
  }
}

function fetchDocumentProgress() {
  console.log('Placeholder: fetchDocumentProgress needs to be implemented for per-property document progress.');
  const progressList = document.getElementById('progreso-documental-lista');
  if (progressList) {
    progressList.innerHTML = '<p class="text-sm text-gray-500 p-2">El progreso documental detallado por predio se implementará próximamente.</p>';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  fetchDashboardStats();

  if (document.getElementById('historial-lista')) {
    fetchAndDisplayHistory();
  }

  if (document.getElementById('progreso-documental-lista')) {
    fetchDocumentProgress();
  }
  
  // Note: The 'go-to-upload' button from the old dashboard.handlebars was not in the new HTML.
  // If a similar button with this ID is added to the new dashboard, this code will handle it.
  const goToUploadButton = document.getElementById('go-to-upload');
  if (goToUploadButton) {
    goToUploadButton.addEventListener('click', () => {
      window.location.href = '/upload'; // Or your designated upload page route
    });
  }
}); 