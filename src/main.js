import './style.css';
import { marked } from 'marked';
import { markedHighlight } from "marked-highlight";
import markedKatex from 'marked-katex-extension';
import 'katex/dist/katex.min.css';
import hljs from 'highlight.js/lib/core';
import javascript from 'highlight.js/lib/languages/javascript';
import json from 'highlight.js/lib/languages/json';
import latex from 'highlight.js/lib/languages/latex';
import python from 'highlight.js/lib/languages/python';
import bash from 'highlight.js/lib/languages/bash';
import css from 'highlight.js/lib/languages/css';
import xml from 'highlight.js/lib/languages/xml';
import markdown from 'highlight.js/lib/languages/markdown';
import 'highlight.js/styles/atom-one-dark.css';

hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('json', json);
hljs.registerLanguage('latex', latex);
hljs.registerLanguage('tex', latex); // Explicit alias
hljs.registerLanguage('python', python);
hljs.registerLanguage('bash', bash);
hljs.registerLanguage('css', css);
hljs.registerLanguage('xml', xml); // handles html
hljs.registerLanguage('html', xml);
hljs.registerLanguage('markdown', markdown);

import EasyMDE from 'easymde';
import 'easymde/dist/easymde.min.css';
import { Storage } from './storage.js';

marked.use(
  markedHighlight({
    langPrefix: 'hljs language-',
    highlight(code, lang) {
      if (lang && hljs.getLanguage(lang)) {
        try {
          return hljs.highlight(code, { language: lang }).value;
        } catch (e) { }
      }
      try {
        return hljs.highlightAuto(code).value;
      } catch (e) {
        return '';
      }
    }
  })
);

marked.use({ breaks: true, gfm: true });
marked.use(markedKatex({ throwOnError: false }));

// Customize renderer to open links in new tab
const renderer = {
  link({ href, title, text }) {
    return `<a target="_blank" href="${href}" title="${title || ''}">${text}</a>`;
  }
};
marked.use({ renderer });

// State
let currentLogId = null;
let confirmCallback = null;
let isEditing = false;
let easyMDE = null;
let editingCommentId = null;




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
    btnToggle: document.getElementById('btn-theme-toggle'),
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
      commentsList: document.getElementById('comments-list'),
      commentInput: document.getElementById('comment-input'),
      btnAddComment: document.getElementById('btn-add-comment'),
      // Note: cancel button will be dynamically added/mocked if not in HTML, but best to inject
    },
    modal: {
      view: document.getElementById('delete-modal'),
      btnCancel: document.getElementById('btn-modal-cancel'),
      btnConfirm: document.getElementById('btn-modal-confirm'),
    },
    manageModels: {
      btnOpen: document.getElementById('btn-manage-models'),
      view: document.getElementById('models-view'),
      input: document.getElementById('new-model-input'),
      btnAdd: document.getElementById('btn-add-model'),
      list: document.getElementById('model-list'),
    },
  },
};

// Initialize
function init() {
  initTheme();
  populateModelSelect();
  renderLogList();
  showEmptyState();
  setupEventListeners();
  initEasyMDE();
  injectCancelCommentButton();
}

function injectCancelCommentButton() {
  // Dynamically add a cancel button next to Add Comment if it doesn't exist
  if (!document.getElementById('btn-cancel-comment')) {
    const addBtn = app.main.viewer.btnAddComment;
    if (addBtn && addBtn.parentElement) {
      const cancelBtn = document.createElement('button');
      cancelBtn.id = 'btn-cancel-comment';
      cancelBtn.className = 'btn-sm hidden'; // Start hidden
      cancelBtn.textContent = 'Cancel Edit';
      cancelBtn.style.marginLeft = '10px';
      addBtn.parentElement.appendChild(cancelBtn);

      cancelBtn.addEventListener('click', cancelCommentEdit);
    }
  }
}

function initEasyMDE() {
  if (app.main.viewer.commentInput) {
    easyMDE = new EasyMDE({
      element: app.main.viewer.commentInput,
      spellChecker: false,
      status: false,
      placeholder: 'Add a comment... (Markdown supported)',
      minHeight: '100px',
    });
  }
}

function populateModelSelect() {
  const select = app.main.editor.model;
  select.innerHTML = '<option value="" disabled selected>Select Model</option>';

  const models = [...Storage.getModels()].reverse();
  models.forEach(model => {
    const option = document.createElement('option');
    option.value = model;
    option.textContent = model;
    select.appendChild(option);
  });
}

function initTheme() {
  const savedTheme = localStorage.getItem('theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

  if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
    document.body.classList.add('dark-theme');
    if (app.sidebar.btnToggle) app.sidebar.btnToggle.textContent = '☀️';
  } else {
    document.body.classList.remove('dark-theme');
    if (app.sidebar.btnToggle) app.sidebar.btnToggle.textContent = '🌙';
  }
}

function toggleTheme() {
  document.body.classList.toggle('dark-theme');
  const isDark = document.body.classList.contains('dark-theme');
  localStorage.setItem('theme', isDark ? 'dark' : 'light');
  if (app.sidebar.btnToggle) app.sidebar.btnToggle.textContent = isDark ? '☀️' : '🌙';
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
  app.sidebar.btnImport.addEventListener('click', () => app.sidebar.fileImport.click());
  app.sidebar.fileImport.addEventListener('change', importData);
  if (app.sidebar.btnToggle) app.sidebar.btnToggle.addEventListener('click', toggleTheme);

  // Editor
  app.main.editor.btnSave.addEventListener('click', saveLog);
  app.main.editor.btnCancel.addEventListener('click', cancelEdit);

  // Viewer
  app.main.viewer.btnEdit.addEventListener('click', () => startEditing(currentLogId));
  app.main.viewer.btnDelete.addEventListener('click', requestDeleteLog);

  // Delegated listener for comment button (robust against init timing)
  document.addEventListener('click', (e) => {
    if (e.target && e.target.id === 'btn-add-comment') {
      submitComment();
    }
  });

  app.main.modal.btnCancel.addEventListener('click', hideDeleteModal);
  app.main.modal.btnConfirm.addEventListener('click', confirmDelete);

  // Manage Models
  app.main.manageModels.btnOpen.addEventListener('click', openManageModels);
  app.main.manageModels.btnAdd.addEventListener('click', addModel);
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
  cancelCommentEdit(); // Reset comment edit state
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
      span.addEventListener('click', () => {
        app.sidebar.searchInput.value = 'tag:' + tag;
        refreshList();
      });
      app.main.viewer.tags.appendChild(span);
    });
  }

  app.main.viewer.content.innerHTML = marked.parse(log.content || '');
  renderComments(log);

  // Refresh EasyMDE if needed (sometimes helps with layout when switching views)
  if (easyMDE) {
    easyMDE.value('');
    setTimeout(() => easyMDE.codemirror.refresh(), 100);
  }
}

function startEditing(id) {
  isEditing = true;
  currentLogId = id;

  hideAllViews();
  app.main.editor.view.classList.remove('hidden');

  // Reset Model Select to default options
  populateModelSelect();

  if (id) {
    // Edit existing
    const log = Storage.get(id);
    app.main.editor.title.value = log.title || '';

    // Handle Model Selection
    const modelValue = log.model || '';
    const select = app.main.editor.model;

    // Check if model exists in the list
    const exists = Array.from(select.options).some(opt => opt.value === modelValue);

    if (!exists && modelValue) {
      // Add custom option for legacy/custom value
      const option = document.createElement('option');
      option.value = modelValue;
      option.textContent = modelValue;
      select.appendChild(option);
    }
    select.value = modelValue;

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

function hideDeleteModal() {
  app.main.modal.view.classList.add('hidden');
  confirmCallback = null;
}

function showDeleteModal(title, message, callback) {
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-message').textContent = message;
  confirmCallback = callback;
  app.main.modal.view.classList.remove('hidden');
}

function requestDeleteLog() {
  if (!currentLogId) return;
  showDeleteModal(
    'Delete Log',
    'Are you sure you want to delete this log? This action cannot be undone.',
    () => {
      Storage.delete(currentLogId);
      currentLogId = null;
      refreshList();
      showEmptyState();
    }
  );
}

function confirmDelete() {
  if (confirmCallback) {
    confirmCallback();
  }
  hideDeleteModal();
  hideDeleteModal();
}

// Comments
function renderComments(log) {
  const list = document.getElementById('comments-list');
  // Input clearing is now handled by EasyMDE in viewLog or submitComment

  if (!list) return;

  list.innerHTML = '';

  const comments = log.comments || [];
  comments.forEach(comment => {
    const li = document.createElement('li');
    li.className = 'comment-item';
    li.innerHTML = `
      <div class="comment-meta">
        <span>${new Date(comment.createdAt).toLocaleString()}</span>
        <div class="comment-actions">
           <button class="btn-sm btn-edit-comment" title="Edit Comment">Edit</button>
           <button class="btn-sm btn-danger btn-delete-comment" title="Delete Comment">Delete</button>
        </div>
      </div>
      <div class="comment-text markdown-body">${marked.parse(comment.text)}</div>
    `;

    // Wire up buttons
    li.querySelector('.btn-edit-comment').addEventListener('click', () => editComment(comment.id));
    li.querySelector('.btn-delete-comment').addEventListener('click', () => deleteComment(comment.id));

    list.appendChild(li);
  });
}

function editComment(commentId) {
  const log = Storage.get(currentLogId);
  if (!log || !log.comments) return;

  const comment = log.comments.find(c => c.id === commentId);
  if (!comment) return;

  editingCommentId = commentId;

  if (easyMDE) {
    easyMDE.value(comment.text);
    easyMDE.codemirror.focus();

    // Scroll to editor
    document.getElementById('comment-input').scrollIntoView({ behavior: 'smooth' });
  }

  document.getElementById('btn-add-comment').textContent = 'Update Comment';
  const cancelBtn = document.getElementById('btn-cancel-comment');
  if (cancelBtn) cancelBtn.classList.remove('hidden');
}

function cancelCommentEdit() {
  editingCommentId = null;
  if (easyMDE) {
    easyMDE.value('');
  }
  document.getElementById('btn-add-comment').textContent = 'Add Comment';
  const cancelBtn = document.getElementById('btn-cancel-comment');
  if (cancelBtn) cancelBtn.classList.add('hidden');
}

function submitComment() {
  if (!currentLogId) return;

  // Use EasyMDE value
  let text = '';
  if (easyMDE) {
    text = easyMDE.value().trim();
  } else {
    const input = document.getElementById('comment-input');
    if (input) text = input.value.trim();
  }

  if (!text) return;

  try {
    const log = Storage.get(currentLogId);
    if (!log) return;

    if (!log.comments) log.comments = [];

    if (editingCommentId) {
      // Update existing comment
      const commentToUpdate = log.comments.find(c => c.id === editingCommentId);
      if (commentToUpdate) {
        commentToUpdate.text = text;
        // Optional: update edited timestamp? For now, keep original creation time or update it?
        // Let's keep createdAt as is.
      }
    } else {
      // Create new comment
      // Fallback for UUID if crypto is not available
      const uuid = (typeof crypto !== 'undefined' && crypto.randomUUID)
        ? crypto.randomUUID()
        : 'c-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);

      const newComment = {
        id: uuid,
        text: text,
        createdAt: new Date().toISOString()
      };
      log.comments.push(newComment);
    }

    Storage.save(log);

    renderComments(log);

    // Reset state and clear editor
    cancelCommentEdit();

  } catch (error) {
    console.error('Failed to add/update comment:', error);
    alert('Failed to save comment. See console for details.');
  }
}

function deleteComment(commentId) {
  if (!currentLogId) return;
  const log = Storage.get(currentLogId);
  if (!log || !log.comments) return;

  showDeleteModal(
    'Delete Comment',
    'Are you sure you want to delete this comment?',
    () => {
      log.comments = log.comments.filter(c => c.id !== commentId);
      Storage.save(log);

      // If deleting the currently editing comment, cancel edit
      if (editingCommentId === commentId) {
        cancelCommentEdit();
      }

      renderComments(log);
    }
  );
}


// Deprecated: deleteLog replaced by modal flow
// function deleteLog() { ... }

// Model Management
function openManageModels() {
  hideAllViews();
  app.main.manageModels.view.classList.remove('hidden');
  renderModelList();
}

function renderModelList() {
  const models = [...Storage.getModels()].reverse();
  const list = app.main.manageModels.list;
  list.innerHTML = '';

  models.forEach(model => {
    const li = document.createElement('li');
    li.className = 'model-list-item';
    li.innerHTML = `
      <span class="model-name">${model}</span>
      <div class="model-item-actions">
        <button class="btn-icon-sm btn-edit-model" title="Edit">✎</button>
        <button class="btn-icon-sm btn-delete-model" title="Delete">×</button>
      </div>
    `;

    const btnEdit = li.querySelector('.btn-edit-model');
    const btnDelete = li.querySelector('.btn-delete-model');

    btnEdit.addEventListener('click', () => enableEditMode(model, li));
    btnDelete.addEventListener('click', () => deleteModel(model));

    list.appendChild(li);
  });
}

function enableEditMode(modelName, li) {
  li.innerHTML = `
    <input type="text" class="model-edit-input" value="${modelName}" />
    <div class="model-item-actions">
      <button class="btn-icon-sm btn-save-model" title="Save">✓</button>
      <button class="btn-icon-sm btn-cancel-model" title="Cancel">✕</button>
    </div>
  `;

  const input = li.querySelector('.model-edit-input');
  const btnSave = li.querySelector('.btn-save-model');
  const btnCancel = li.querySelector('.btn-cancel-model');

  input.focus();

  btnSave.addEventListener('click', () => saveEditedModel(modelName, input.value.trim()));
  btnCancel.addEventListener('click', () => renderModelList()); // Re-render to cancel

  // Save on Enter
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') saveEditedModel(modelName, input.value.trim());
    if (e.key === 'Escape') renderModelList();
  });
}

function saveEditedModel(oldName, newName) {
  if (!newName || newName === oldName) {
    renderModelList();
    return;
  }

  const models = Storage.getModels();
  if (models.includes(newName)) {
    alert('Model name already exists.');
    return;
  }

  // Update Model List
  const index = models.indexOf(oldName);
  if (index !== -1) {
    models[index] = newName;
    Storage.saveModels(models);
  }

  // Cascade Update: Verify all logs using this model are updated
  const allLogs = Storage.getAll();
  let updatedCount = 0;
  allLogs.forEach(log => {
    if (log.model === oldName) {
      log.model = newName;
      Storage.save(log);
      updatedCount++;
    }
  });

  if (updatedCount > 0) {
    console.log(`Updated ${updatedCount} logs from "${oldName}" to "${newName}".`);
  }

  // Update current selection if editing
  if (app.main.editor.model.value === oldName) {
    // We need to repopulate first, then set value
    populateModelSelect();
    app.main.editor.model.value = newName;
  } else {
    populateModelSelect();
  }

  // Update viewer if viewing
  if (app.main.viewer.model.textContent === oldName) {
    app.main.viewer.model.textContent = newName;
  }

  refreshList(); // Update sidebar list if model is shown there (it is)
  renderModelList();
}

function addModel() {
  const input = app.main.manageModels.input;
  const newModel = input.value.trim();

  if (!newModel) return;

  const models = Storage.getModels();
  if (!models.includes(newModel)) {
    models.push(newModel);
    Storage.saveModels(models);
    renderModelList();
    populateModelSelect();

    // Select the new model
    app.main.editor.model.value = newModel;
  }

  input.value = '';
}

function deleteModel(modelToDelete) {
  showDeleteModal(
    'Delete Model',
    `Are you sure you want to delete the model "${modelToDelete}"? This action cannot be undone.`,
    () => {
      let models = Storage.getModels();
      models = models.filter(m => m !== modelToDelete);
      Storage.saveModels(models);
      renderModelList();
      populateModelSelect();
    }
  );
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
  app.main.manageModels.view.classList.add('hidden');
}


// PWA Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(registration => {
        console.log('ServiceWorker registration successful with scope: ', registration.scope);
      })
      .catch(err => {
        console.log('ServiceWorker registration failed: ', err);
      });
  });
}


init();
