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
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('historial-lista')) {
    fetchAndDisplayHistory();
  }
  fetchCounts();
});



async function fetchAndDisplayHistory() {
  const token = localStorage.getItem('token');
  if (!token) return;

  try {
    const response = await fetch('/api/historial?limit=10', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) throw new Error('Error al obtener historial');
    const history = await response.json();
    const list = document.getElementById('historial-lista');
    if (!list) return;
    const loading = document.getElementById('historial-loading');
    if (loading) loading.remove();
    list.innerHTML = '';
    if (history.length === 0) {
      list.innerHTML = '<li class="text-sm text-gray-500">Sin actividad reciente</li>';
      return;
    }

    const ICON_MAP = {
      CREATE_PROPERTY: { icon: 'fa-user-plus', bg: 'bg-purple-100 text-purple-600' },
      UPDATE_PROPERTY: { icon: 'fa-user-edit', bg: 'bg-blue-100 text-blue-600' },
      DELETE_PROPERTY: { icon: 'fa-trash', bg: 'bg-red-100 text-red-600' },
      UPLOAD_DOCUMENT: { icon: 'fa-file-upload', bg: 'bg-green-100 text-green-600' },
      DELETE_DOCUMENT: { icon: 'fa-file-alt', bg: 'bg-red-100 text-red-600' },
      DEFAULT: { icon: 'fa-history', bg: 'bg-gray-100 text-gray-600' }
    };

    history.forEach(entry => {
      const info = ICON_MAP[entry.actionType] || ICON_MAP.DEFAULT;
      const li = document.createElement('li');
      li.className = 'flex items-start';

      const iconWrap = document.createElement('div');
      iconWrap.className = `flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center ${info.bg}`;
      iconWrap.innerHTML = `<i class="fas ${info.icon}"></i>`;

      const content = document.createElement('div');
      content.className = 'ml-4';
      const ts = entry.timestamp && entry.timestamp._seconds
        ? new Date(entry.timestamp._seconds * 1000)
        : null;
      const dateStr = ts ? ts.toLocaleString() : '';
      content.innerHTML = `<p class="text-sm font-medium text-gray-900">${entry.actionType}</p><p class="text-sm text-gray-500">${dateStr}</p>`;

      li.appendChild(iconWrap);
      li.appendChild(content);
      list.appendChild(li);
    });
  } catch (error) {
    console.error('Error fetching history:', error);
    const list = document.getElementById('historial-lista');
    if (list) {
      list.innerHTML = '<li class="mb-2 text-sm text-red-600">Error al cargar historial</li>';
    }
  }
}