import './style.css';
import { marked } from 'marked';
import { Storage } from './storage.js';

// State
let currentLogId = null;
let isEditing = false;

// DOM Elements
const app = {
  sidebar: {
    btnNew: document.getElementById('btn-new-log'),
    searchInput: document.getElementById('search-input'),
    sortSelect: document.getElementById('sort-select'),
    btnExport: document.getElementById('btn-export'),
    btnImport: document.getElementById('btn-import'),
    fileImport: document.getElementById('file-import'),
    list: document.getElementById('log-list'),
  },
  main: {
    emptyState: document.getElementById('empty-state'),
    editor: {
      view: document.getElementById('editor-view'),
      title: document.getElementById('edit-title'),
      model: document.getElementById('edit-model'),
      tags: document.getElementById('edit-tags'),
      content: document.getElementById('edit-content'),
      btnSave: document.getElementById('btn-save'),
      btnCancel: document.getElementById('btn-cancel'),
    },
    viewer: {
      view: document.getElementById('viewer-view'),
      title: document.getElementById('view-title'),
      date: document.getElementById('view-date'),
      model: document.getElementById('view-model'),
      tags: document.getElementById('view-tags'),
      content: document.getElementById('view-content'),
      btnEdit: document.getElementById('btn-edit'),
      btnDelete: document.getElementById('btn-delete'),
    },
  },
};

// Initialize
function init() {
  renderLogList();
  showEmptyState();
  setupEventListeners();
}

// Event Listeners
function setupEventListeners() {
  // Sidebar
  app.sidebar.btnNew.addEventListener('click', () => startEditing(null));
  app.sidebar.searchInput.addEventListener('input', () => refreshList());
  app.sidebar.sortSelect.addEventListener('change', () => refreshList());

  // Data Management
  app.sidebar.btnExport.addEventListener('click', exportData);
  app.sidebar.btnImport.addEventListener('click', () => app.sidebar.fileImport.click());
  app.sidebar.fileImport.addEventListener('change', importData);

  // Editor
  app.main.editor.btnSave.addEventListener('click', saveLog);
  app.main.editor.btnCancel.addEventListener('click', cancelEdit);

  // Viewer
  app.main.viewer.btnEdit.addEventListener('click', () => startEditing(currentLogId));
  app.main.viewer.btnDelete.addEventListener('click', deleteLog);
}

// Rendering
function renderLogList(query = '', sortBy = 'date') {
  const logs = Storage.search(query, sortBy);
  app.sidebar.list.innerHTML = '';

  logs.forEach(log => {
    const li = document.createElement('li');
    li.className = `log-item ${log.id === currentLogId ? 'active' : ''}`;
    li.innerHTML = `
      <h3>${log.title || 'Untitled'}</h3>
      <p>${new Date(log.createdAt).toLocaleDateString()} • ${log.model || 'No Model'}</p>
    `;
    li.addEventListener('click', () => viewLog(log.id));
    app.sidebar.list.appendChild(li);
  });
}

function refreshList() {
  renderLogList(app.sidebar.searchInput.value, app.sidebar.sortSelect.value);
}

// Actions
function viewLog(id) {
  currentLogId = id;
  isEditing = false;
  const log = Storage.get(id);
  if (!log) return;

  // Update Sidebar Selection
  refreshList();

  // Show Viewer
  hideAllViews();
  app.main.viewer.view.classList.remove('hidden');

  // Populate Viewer
  app.main.viewer.title.textContent = log.title || 'Untitled';
  app.main.viewer.date.textContent = new Date(log.createdAt).toLocaleString();
  app.main.viewer.model.textContent = log.model || '';

  app.main.viewer.tags.innerHTML = '';
  if (log.tags && log.tags.length > 0) {
    log.tags.forEach(tag => {
      const span = document.createElement('span');
      span.textContent = tag;
      app.main.viewer.tags.appendChild(span);
    });
  }

  app.main.viewer.content.innerHTML = marked.parse(log.content || '');
}

function startEditing(id) {
  isEditing = true;
  currentLogId = id;

  hideAllViews();
  app.main.editor.view.classList.remove('hidden');

  if (id) {
    // Edit existing
    const log = Storage.get(id);
    app.main.editor.title.value = log.title || '';
    app.main.editor.model.value = log.model || '';
    app.main.editor.tags.value = log.tags ? log.tags.join(', ') : '';
    app.main.editor.content.value = log.content || '';
  } else {
    // New log
    app.main.editor.title.value = '';
    app.main.editor.model.value = '';
    app.main.editor.tags.value = '';
    app.main.editor.content.value = '';
  }
}

function saveLog() {
  const title = app.main.editor.title.value.trim();
  const model = app.main.editor.model.value.trim();
  const tags = app.main.editor.tags.value.split(',').map(t => t.trim()).filter(t => t);
  const content = app.main.editor.content.value;

  if (!content && !title) {
    alert('Please enter at least a title or content.');
    return;
  }

  const logData = {
    id: currentLogId, // If null, Storage.save handles creation
    title,
    model,
    tags,
    content
  };

  const savedLog = Storage.save(logData);
  currentLogId = savedLog.id;

  refreshList();
  viewLog(currentLogId);
}

function cancelEdit() {
  if (currentLogId) {
    viewLog(currentLogId);
  } else {
    showEmptyState();
  }
}

function deleteLog() {
  if (!currentLogId) return;
  if (confirm('Are you sure you want to delete this log?')) {
    Storage.delete(currentLogId);
    currentLogId = null;
    refreshList();
    showEmptyState();
  }
}

function showEmptyState() {
  hideAllViews();
  app.main.emptyState.classList.remove('hidden');
  currentLogId = null;
  refreshList(); // Clear selection
}

async function exportData() {
  const data = Storage.export();
  const dateStr = new Date().toISOString().split('T')[0];
  const fileName = `llm_logs_backup_${dateStr}.json`;

  try {
    // Try File System Access API
    if (window.showSaveFilePicker) {
      const handle = await window.showSaveFilePicker({
        suggestedName: fileName,
        types: [{
          description: 'JSON File',
          accept: { 'application/json': ['.json'] },
        }],
      });
      const writable = await handle.createWritable();
      await writable.write(data);
      await writable.close();
    } else {
      // Fallback
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
    }
  } catch (err) {
    if (err.name !== 'AbortError') {
      console.error('Export failed:', err);
      alert('Failed to export data.');
    }
  }
}

function importData(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    const count = Storage.import(event.target.result);
    alert(`Imported ${count} logs.`);
    refreshList();
    app.sidebar.fileImport.value = ''; // Reset input
  };
  reader.readAsText(file);
}

function hideAllViews() {
  app.main.emptyState.classList.add('hidden');
  app.main.editor.view.classList.add('hidden');
  app.main.viewer.view.classList.add('hidden');
}

init();
