/* ═══════════════════════════════════════════════════════════
   State
═══════════════════════════════════════════════════════════ */
const state = {
  user: null,          // { id, username, is_admin }
  currentPath: '',     // current directory relative to FILES_ROOT
  pendingDelete: null, // { path, name }
  pendingRename: null, // { path, name }
};

/* ═══════════════════════════════════════════════════════════
   API helpers
═══════════════════════════════════════════════════════════ */
async function api(method, url, body = null, isForm = false) {
  const opts = {
    method,
    headers: {},
    credentials: 'include',
  };
  if (body && isForm) {
    opts.body = body; // FormData — no Content-Type header (browser sets boundary)
  } else if (body) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }
  const res = await fetch(url, opts);
  if (res.status === 401) {
    showLogin();
    return null;
  }
  const data = res.headers.get('Content-Type')?.includes('application/json')
    ? await res.json()
    : { message: await res.text() };
  if (!res.ok) throw new Error(data.detail || data.message || 'Request failed');
  return data;
}

/* ═══════════════════════════════════════════════════════════
   Toast
═══════════════════════════════════════════════════════════ */
let toastTimer = null;
function showToast(message, type = 'success') {
  const el = document.getElementById('toast');
  el.textContent = message;
  el.className = `toast ${type}`;
  el.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.add('hidden'), 3000);
}

/* ═══════════════════════════════════════════════════════════
   Modal helpers
═══════════════════════════════════════════════════════════ */
function openModal(id) {
  document.getElementById(id).classList.remove('hidden');
}
function closeModal(id) {
  document.getElementById(id).classList.add('hidden');
}

// Close modals via [data-close] buttons
document.querySelectorAll('[data-close]').forEach(btn => {
  btn.addEventListener('click', () => closeModal(btn.dataset.close));
});

// Close on backdrop click
document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
  backdrop.addEventListener('click', e => {
    if (e.target === backdrop) closeModal(backdrop.id);
  });
});

/* ═══════════════════════════════════════════════════════════
   Auth
═══════════════════════════════════════════════════════════ */
function showLogin() {
  state.user = null;
  document.getElementById('login-screen').classList.remove('hidden');
  document.getElementById('app').classList.add('hidden');
}

function showApp(user) {
  state.user = user;
  document.getElementById('login-screen').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');
  document.getElementById('header-username').textContent = user.username;
  const adminBtn = document.getElementById('admin-btn');
  if (user.is_admin) adminBtn.classList.remove('hidden');
  else adminBtn.classList.add('hidden');
  loadFiles('');
}

document.getElementById('login-form').addEventListener('submit', async e => {
  e.preventDefault();
  const err = document.getElementById('login-error');
  err.classList.add('hidden');
  const btn = document.getElementById('login-btn');
  btn.disabled = true;
  btn.textContent = 'Signing in...';
  try {
    const form = new FormData(e.target);
    const data = await api('POST', '/api/auth/login', form, true);
    if (data) showApp(data);
  } catch (ex) {
    err.classList.remove('hidden');
    err.textContent = ex.message || 'Invalid username or password';
  } finally {
    btn.disabled = false;
    btn.textContent = 'Sign In';
  }
});

document.getElementById('logout-btn').addEventListener('click', async () => {
  await api('POST', '/api/auth/logout');
  showLogin();
});

/* ═══════════════════════════════════════════════════════════
   File utilities
═══════════════════════════════════════════════════════════ */
function formatSize(bytes) {
  if (bytes == null) return '—';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / 1024 / 1024).toFixed(1) + ' MB';
  return (bytes / 1024 / 1024 / 1024).toFixed(2) + ' GB';
}

function formatDate(ts) {
  if (!ts) return '—';
  const d = new Date(ts * 1000);
  return d.toLocaleDateString('en-US') + ' ' +
    d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

function getFileIconClass(name, isDir) {
  if (isDir) return 'dir';
  const ext = name.split('.').pop().toLowerCase();
  const map = {
    img:   ['jpg','jpeg','png','gif','webp','svg','bmp','ico','avif'],
    video: ['mp4','mkv','avi','mov','webm','flv','wmv'],
    code:  ['py','js','ts','html','css','json','yaml','yml','sh','bash','go','rs','java','c','cpp','h','php','rb','sql'],
    text:  ['txt','md','log','csv','xml','conf','ini','toml','env'],
    arch:  ['zip','tar','gz','bz2','xz','7z','rar'],
  };
  for (const [cls, exts] of Object.entries(map)) {
    if (exts.includes(ext)) return cls;
  }
  return 'file';
}

function getFileIcon(name, isDir) {
  if (isDir) return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
    <path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2z"/></svg>`;
  const cls = getFileIconClass(name, false);
  const icons = {
    img: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
      <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>
      <path d="M21 15l-5-5L5 21"/></svg>`,
    video: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
      <rect x="2" y="5" width="20" height="14" rx="2"/><path d="M10 9l5 3-5 3z" fill="currentColor"/></svg>`,
    code: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
      <path d="M8 9l-3 3 3 3M16 9l3 3-3 3M14 4l-4 16"/></svg>`,
    text: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/></svg>`,
    arch: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
      <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/></svg>`,
    file: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/></svg>`,
  };
  return icons[cls] || icons.file;
}

/* ═══════════════════════════════════════════════════════════
   Breadcrumb
═══════════════════════════════════════════════════════════ */
function renderBreadcrumb(path) {
  const container = document.getElementById('breadcrumb');
  container.innerHTML = '';

  const root = document.createElement('button');
  root.className = 'breadcrumb-item breadcrumb-root' + (path === '' ? ' active' : '');
  root.dataset.path = '';
  root.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2z"/></svg> Root`;
  root.addEventListener('click', () => loadFiles(''));
  container.appendChild(root);

  if (path) {
    const parts = path.split('/').filter(Boolean);
    parts.forEach((part, i) => {
      const sep = document.createElement('span');
      sep.className = 'breadcrumb-sep';
      sep.textContent = '/';
      container.appendChild(sep);

      const btn = document.createElement('button');
      const fullPath = parts.slice(0, i + 1).join('/');
      btn.className = 'breadcrumb-item' + (i === parts.length - 1 ? ' active' : '');
      btn.dataset.path = fullPath;
      btn.textContent = part;
      btn.addEventListener('click', () => loadFiles(fullPath));
      container.appendChild(btn);
    });
  }
}

/* ═══════════════════════════════════════════════════════════
   File list
═══════════════════════════════════════════════════════════ */
async function loadFiles(path) {
  state.currentPath = path;
  renderBreadcrumb(path);
  const list = document.getElementById('file-list');
  const empty = document.getElementById('empty-state');
  list.innerHTML = '';
  empty.classList.add('hidden');

  try {
    const url = path ? `/api/files/${encodeURIPath(path)}` : '/api/files';
    const data = await api('GET', url);
    if (!data) return;

    if (data.items.length === 0) {
      empty.classList.remove('hidden');
      return;
    }

    data.items.forEach((item, i) => {
      const row = buildFileRow(item, i);
      list.appendChild(row);
    });
  } catch (ex) {
    showToast('Failed to load files: ' + ex.message, 'error');
  }
}

function encodeURIPath(path) {
  return path.split('/').map(encodeURIComponent).join('/');
}

function buildFileRow(item, index) {
  const isDir = item.type === 'directory';
  const iconClass = getFileIconClass(item.name, isDir);
  const row = document.createElement('div');
  row.className = 'file-row';
  row.style.animationDelay = `${index * 20}ms`;

  row.innerHTML = `
    <div class="file-name">
      <div class="file-icon ${iconClass}">${getFileIcon(item.name, isDir)}</div>
      <span class="file-name-text" title="${escHtml(item.name)}">${escHtml(item.name)}</span>
    </div>
    <div class="file-size">${formatSize(item.size)}</div>
    <div class="file-modified">${formatDate(item.modified)}</div>
    <div class="file-actions">
      ${!isDir ? `
        <button class="btn btn-icon btn-download" title="Download">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/>
          </svg>
        </button>` : ''}
      <button class="btn btn-icon btn-rename" title="Rename">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
          <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
        </svg>
      </button>
      <button class="btn btn-icon btn-delete" title="Delete">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
          <path d="M10 11v6M14 11v6M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
        </svg>
      </button>
    </div>
  `;

  // Navigate into directory
  row.querySelector('.file-name-text').addEventListener('click', () => {
    if (isDir) loadFiles(item.path);
    else downloadFile(item.path, item.name);
  });

  // Download
  const dlBtn = row.querySelector('.btn-download');
  if (dlBtn) dlBtn.addEventListener('click', () => downloadFile(item.path, item.name));

  // Rename
  row.querySelector('.btn-rename').addEventListener('click', () => startRename(item.path, item.name));

  // Delete
  row.querySelector('.btn-delete').addEventListener('click', () => startDelete(item.path, item.name));

  return row;
}

function escHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/* ═══════════════════════════════════════════════════════════
   Download
═══════════════════════════════════════════════════════════ */
function downloadFile(path, name) {
  const a = document.createElement('a');
  a.href = `/api/download/${encodeURIPath(path)}`;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

/* ═══════════════════════════════════════════════════════════
   Upload
═══════════════════════════════════════════════════════════ */
document.getElementById('btn-upload').addEventListener('click', () => {
  document.getElementById('upload-input').value = '';
  document.getElementById('upload-label-text').textContent = 'Choose files or drag them here';
  openModal('modal-upload');
});

const uploadInput = document.getElementById('upload-input');
uploadInput.addEventListener('change', () => {
  const files = uploadInput.files;
  if (files.length === 1) {
    document.getElementById('upload-label-text').textContent = files[0].name;
  } else if (files.length > 1) {
    document.getElementById('upload-label-text').textContent = `${files.length} files selected`;
  }
});

// Drag & drop on upload area
const uploadLabel = document.getElementById('upload-label');
['dragenter','dragover'].forEach(evt => {
  uploadLabel.addEventListener(evt, e => { e.preventDefault(); uploadLabel.classList.add('drag-over'); });
});
['dragleave','drop'].forEach(evt => {
  uploadLabel.addEventListener(evt, e => {
    e.preventDefault();
    uploadLabel.classList.remove('drag-over');
    if (evt === 'drop' && e.dataTransfer.files.length) {
      // Assign dropped files to input (best-effort)
      const dt = new DataTransfer();
      Array.from(e.dataTransfer.files).forEach(f => dt.items.add(f));
      uploadInput.files = dt.files;
      const files = uploadInput.files;
      document.getElementById('upload-label-text').textContent =
        files.length === 1 ? files[0].name : `${files.length} files selected`;
    }
  });
});

document.getElementById('btn-upload-confirm').addEventListener('click', async () => {
  const files = uploadInput.files;
  if (!files.length) { showToast('Choose at least one file', 'error'); return; }

  const btn = document.getElementById('btn-upload-confirm');
  btn.disabled = true;

  let ok = 0, fail = 0;
  let firstError = '';
  for (const file of files) {
    const fd = new FormData();
    fd.append('file', file);
    const urlPath = state.currentPath ? `/api/upload/${encodeURIPath(state.currentPath)}` : '/api/upload';
    try {
      await api('POST', urlPath, fd, true);
      ok++;
    } catch (ex) {
      fail++;
      if (!firstError) firstError = ex.message || 'Upload failed';
      console.error(ex);
    }
  }

  btn.disabled = false;
  closeModal('modal-upload');
  let message = `Uploaded: ${ok} file(s)`;
  if (fail > 0) {
    message = files.length === 1
      ? firstError
      : `Uploaded: ${ok}, failed: ${fail}. ${firstError}`;
  }
  showToast(message, fail === 0 ? 'success' : 'error');
  loadFiles(state.currentPath);
});

/* ═══════════════════════════════════════════════════════════
   Mkdir
═══════════════════════════════════════════════════════════ */
document.getElementById('btn-mkdir').addEventListener('click', () => {
  document.getElementById('mkdir-name').value = '';
  openModal('modal-mkdir');
  setTimeout(() => document.getElementById('mkdir-name').focus(), 50);
});

document.getElementById('mkdir-name').addEventListener('keydown', e => {
  if (e.key === 'Enter') document.getElementById('btn-mkdir-confirm').click();
});

document.getElementById('btn-mkdir-confirm').addEventListener('click', async () => {
  const name = document.getElementById('mkdir-name').value.trim();
  if (!name) { showToast('Enter a name', 'error'); return; }
  const url = state.currentPath ? `/api/mkdir/${encodeURIPath(state.currentPath)}` : '/api/mkdir';
  try {
    await api('POST', url, { name });
    closeModal('modal-mkdir');
    showToast('Folder created');
    loadFiles(state.currentPath);
  } catch (ex) {
    showToast(ex.message, 'error');
  }
});

/* ═══════════════════════════════════════════════════════════
   Rename
═══════════════════════════════════════════════════════════ */
function startRename(path, name) {
  state.pendingRename = { path, name };
  document.getElementById('rename-input').value = name;
  openModal('modal-rename');
  setTimeout(() => {
    const input = document.getElementById('rename-input');
    input.focus();
    const dotIdx = name.lastIndexOf('.');
    input.setSelectionRange(0, dotIdx > 0 ? dotIdx : name.length);
  }, 50);
}

document.getElementById('rename-input').addEventListener('keydown', e => {
  if (e.key === 'Enter') document.getElementById('btn-rename-confirm').click();
});

document.getElementById('btn-rename-confirm').addEventListener('click', async () => {
  const newName = document.getElementById('rename-input').value.trim();
  if (!newName) { showToast('Enter a name', 'error'); return; }
  const { path } = state.pendingRename;
  try {
    await api('PATCH', `/api/files/${encodeURIPath(path)}`, { new_name: newName });
    closeModal('modal-rename');
    showToast('Renamed');
    loadFiles(state.currentPath);
  } catch (ex) {
    showToast(ex.message, 'error');
  }
});

/* ═══════════════════════════════════════════════════════════
   Delete
═══════════════════════════════════════════════════════════ */
function startDelete(path, name) {
  state.pendingDelete = { path, name };
  document.getElementById('delete-name').textContent = name;
  openModal('modal-delete');
}

document.getElementById('btn-delete-confirm').addEventListener('click', async () => {
  const { path } = state.pendingDelete;
  try {
    await api('DELETE', `/api/files/${encodeURIPath(path)}`);
    closeModal('modal-delete');
    showToast('Deleted');
    loadFiles(state.currentPath);
  } catch (ex) {
    showToast(ex.message, 'error');
  }
});

/* ═══════════════════════════════════════════════════════════
   Admin — Users panel
═══════════════════════════════════════════════════════════ */
document.getElementById('admin-btn').addEventListener('click', async () => {
  openModal('modal-users');
  loadUsers();
});

async function loadUsers() {
  const list = document.getElementById('users-list');
  list.innerHTML = '<div style="color:var(--text-muted);padding:8px">Loading...</div>';
  try {
    const users = await api('GET', '/api/users');
    if (!users) return;
    list.innerHTML = '';
    users.forEach(u => {
      const row = document.createElement('div');
      row.className = 'user-row';
      row.innerHTML = `
        <div class="user-info">
          <span class="user-name">${escHtml(u.username)}</span>
          ${u.is_admin ? '<span class="user-badge">ADMIN</span>' : ''}
        </div>
        ${!u.is_admin ? `
          <button class="btn btn-icon btn-delete-user" data-id="${u.id}" title="Delete user">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
              <path d="M10 11v6M14 11v6M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
            </svg>
          </button>` : ''}
      `;
      const delBtn = row.querySelector('.btn-delete-user');
      if (delBtn) {
        delBtn.addEventListener('click', async () => {
          if (!confirm(`Delete user "${u.username}"?`)) return;
          try {
            await api('DELETE', `/api/users/${u.id}`);
            showToast('User deleted');
            loadUsers();
          } catch (ex) {
            showToast(ex.message, 'error');
          }
        });
      }
      list.appendChild(row);
    });
  } catch (ex) {
    list.innerHTML = `<div style="color:var(--danger)">${ex.message}</div>`;
  }
}

document.getElementById('btn-create-user').addEventListener('click', async () => {
  const username = document.getElementById('new-username').value.trim();
  const password = document.getElementById('new-password').value;
  if (!username || !password) { showToast('Fill in all fields', 'error'); return; }
  try {
    await api('POST', '/api/users', { username, password });
    document.getElementById('new-username').value = '';
    document.getElementById('new-password').value = '';
    showToast('User created');
    loadUsers();
  } catch (ex) {
    showToast(ex.message, 'error');
  }
});

/* ═══════════════════════════════════════════════════════════
   Boot — check existing session
═══════════════════════════════════════════════════════════ */
(async () => {
  try {
    const user = await api('GET', '/api/auth/me');
    if (user) showApp(user);
    else showLogin();
  } catch {
    showLogin();
  }
})();
