
'use strict';

// ── State ────────────────────────────────────
let tasks = JSON.parse(localStorage.getItem('taskly_tasks') || '[]');
let filter = 'all';
let editingId = null;

function save() {
  localStorage.setItem('taskly_tasks', JSON.stringify(tasks));
}

// ── Helpers ──────────────────────────────────
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function esc(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function formatDate(ds) {
  if (!ds) return '';
  const d = new Date(ds + 'T00:00:00');
  const today = new Date(); today.setHours(0,0,0,0);
  const diff = Math.floor((d - today) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function isOverdue(ds) {
  if (!ds) return false;
  const d = new Date(ds + 'T00:00:00');
  const today = new Date(); today.setHours(0,0,0,0);
  return d < today;
}

function isToday(ds) {
  if (!ds) return false;
  const d = new Date(ds + 'T00:00:00');
  const today = new Date(); today.setHours(0,0,0,0);
  return d.getTime() === today.getTime();
}

function toast(msg, type = 'ok') {
  const wrap = document.getElementById('toastWrap');
  const el = document.createElement('div');
  el.className = 'toast' + (type === 'err' ? ' err' : '');
  el.textContent = msg;
  wrap.appendChild(el);
  setTimeout(() => el.remove(), 3000);
}

// ── Render ───────────────────────────────────
function getFiltered() {
  return tasks.filter(t => {
    if (filter === 'active')   return !t.done;
    if (filter === 'done')     return t.done;
    if (filter === 'high')     return t.priority === 'high' && !t.done;
    if (filter === 'today')    return isToday(t.due) && !t.done;
    return true;
  });
}

function render() {
  const list = document.getElementById('taskList');
  const filtered = getFiltered();

  // Stats
  const total = tasks.length;
  const done  = tasks.filter(t => t.done).length;
  document.getElementById('statTotal').textContent = total;
  document.getElementById('statDone').textContent  = done;
  document.getElementById('statLeft').textContent  = total - done;

  if (filtered.length === 0) {
    list.innerHTML = `
      <div class="empty">
        <div class="empty-icon">📋</div>
        <h3>${tasks.length === 0 ? 'No tasks yet!' : 'Nothing here'}</h3>
        <p>${tasks.length === 0 ? 'Add your first task above to get started.' : 'Try a different filter.'}</p>
      </div>`;
    return;
  }

  list.innerHTML = filtered.map(t => {
    const overdue = isOverdue(t.due) && !t.done;
    const dateLabel = formatDate(t.due);
    return `
      <div class="task-card ${t.done ? 'done' : ''} pri-${t.priority}" data-id="${t.id}">
        <button class="check-btn" data-id="${t.id}" title="Toggle done">
          <svg width="12" height="12" fill="none" stroke="#fff" stroke-width="2.5" viewBox="0 0 24 24">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </button>
        <div class="task-body">
          <div class="task-title">${esc(t.title)}</div>
          <div class="task-meta">
            <span class="badge badge-${t.priority}">${t.priority}</span>
            ${dateLabel ? `<span class="due-tag ${overdue ? 'overdue' : ''}">📅 ${dateLabel}${overdue ? ' · Overdue' : ''}</span>` : ''}
          </div>
          ${t.notes ? `<div class="task-notes">${esc(t.notes)}</div>` : ''}
        </div>
        <div class="task-actions">
          <button class="act-btn edit-btn" data-id="${t.id}" title="Edit">
            <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
          <button class="act-btn del act-del" data-id="${t.id}" title="Delete">
            <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
              <path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
            </svg>
          </button>
        </div>
      </div>`;
  }).join('');

  // Attach events
  list.querySelectorAll('.check-btn').forEach(btn => {
    btn.addEventListener('click', () => toggleDone(btn.dataset.id));
  });
  list.querySelectorAll('.edit-btn').forEach(btn => {
    btn.addEventListener('click', () => openEdit(btn.dataset.id));
  });
  list.querySelectorAll('.act-del').forEach(btn => {
    btn.addEventListener('click', () => deleteTask(btn.dataset.id));
  });
}

// ── Actions ──────────────────────────────────
function addTask() {
  const title = document.getElementById('newTitle').value.trim();
  if (!title) {
    const inp = document.getElementById('newTitle');
    inp.style.borderColor = 'var(--red)';
    inp.focus();
    setTimeout(() => inp.style.borderColor = '', 1800);
    return;
  }
  tasks.unshift({
    id:       uid(),
    title,
    notes:    document.getElementById('newNotes').value.trim(),
    priority: document.getElementById('newPri').value,
    due:      document.getElementById('newDue').value || '',
    done:     false,
    created:  Date.now(),
  });
  save();
  document.getElementById('newTitle').value = '';
  document.getElementById('newNotes').value = '';
  document.getElementById('newDue').value   = '';
  document.getElementById('newPri').value   = 'medium';
  render();
  toast('Task added! 🎉');
}

function toggleDone(id) {
  const t = tasks.find(t => t.id === id);
  if (!t) return;
  t.done = !t.done;
  save();
  render();
  toast(t.done ? 'Marked as done ✓' : 'Marked as active');
}

function deleteTask(id) {
  tasks = tasks.filter(t => t.id !== id);
  save();
  render();
  toast('Task deleted', 'err');
}

// ── Edit Modal ───────────────────────────────
function openEdit(id) {
  const t = tasks.find(t => t.id === id);
  if (!t) return;
  editingId = id;
  document.getElementById('editTitle').value = t.title;
  document.getElementById('editNotes').value = t.notes || '';
  document.getElementById('editPri').value   = t.priority;
  document.getElementById('editDue').value   = t.due || '';
  document.getElementById('editModal').classList.add('open');
  document.getElementById('editTitle').focus();
}

function closeEdit() {
  document.getElementById('editModal').classList.remove('open');
  editingId = null;
}

document.getElementById('closeModal').addEventListener('click', closeEdit);
document.getElementById('cancelModal').addEventListener('click', closeEdit);
document.getElementById('editModal').addEventListener('click', e => {
  if (e.target === document.getElementById('editModal')) closeEdit();
});

document.getElementById('saveBtn').addEventListener('click', () => {
  const title = document.getElementById('editTitle').value.trim();
  if (!title) { document.getElementById('editTitle').focus(); return; }
  const t = tasks.find(t => t.id === editingId);
  if (!t) return;
  t.title    = title;
  t.notes    = document.getElementById('editNotes').value.trim();
  t.priority = document.getElementById('editPri').value;
  t.due      = document.getElementById('editDue').value || '';
  save();
  render();
  closeEdit();
  toast('Task updated ✓');
});

document.getElementById('delBtn').addEventListener('click', () => {
  deleteTask(editingId);
  closeEdit();
});

// ── Filters ──────────────────────────────────
document.querySelectorAll('.f-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.f-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    filter = btn.dataset.f;
    render();
  });
});

// ── Keyboard ─────────────────────────────────
document.getElementById('addBtn').addEventListener('click', addTask);
document.getElementById('newTitle').addEventListener('keydown', e => {
  if (e.key === 'Enter') addTask();
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeEdit();
  if (e.key === 'Enter' && e.ctrlKey && document.getElementById('editModal').classList.contains('open')) {
    document.getElementById('saveBtn').click();
  }
});

// ── Init ─────────────────────────────────────
render();