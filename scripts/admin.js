import { db, auth, storage } from './firebaseConfig.js';
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js';
import {
  collection, getDocs, getDoc, addDoc, updateDoc, deleteDoc, doc
} from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js';
import {
  ref as storageRef, uploadBytes, getDownloadURL
} from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-storage.js';

// ─── État global ──────────────────────────────────────────────────────────────
let articles = [];
let avis = [];
let pendingAction = null;
let draggedId = null;
let dragFromHandle = false;

// ─── Toast notifications ──────────────────────────────────────────────────────
function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('show'));
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// ─── Authentification ─────────────────────────────────────────────────────────
function showLoginScreen() {
  document.getElementById('login-screen').hidden = false;
  document.getElementById('admin-screen').hidden = true;
  document.getElementById('login-error').hidden = true;
  document.getElementById('login-form').reset();
}

function showAdminScreen() {
  document.getElementById('login-screen').hidden = true;
  document.getElementById('admin-screen').hidden = false;
  loadArticles();
  loadSettings();
}

async function handleLogin(event) {
  event.preventDefault();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const errorEl = document.getElementById('login-error');
  const btn = document.getElementById('login-btn');

  errorEl.hidden = true;
  btn.disabled = true;
  btn.textContent = 'Connexion…';

  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (err) {
    const messages = {
      'auth/invalid-email': 'Adresse e-mail invalide.',
      'auth/user-not-found': 'Identifiants incorrects.',
      'auth/wrong-password': 'Identifiants incorrects.',
      'auth/invalid-credential': 'Identifiants incorrects.',
      'auth/too-many-requests': 'Trop de tentatives. Réessayez plus tard.'
    };
    errorEl.textContent = messages[err.code] || 'Erreur de connexion. Veuillez réessayer.';
    errorEl.hidden = false;
  } finally {
    btn.disabled = false;
    btn.textContent = 'Se connecter';
  }
}

async function handleLogout() {
  await signOut(auth);
}

// ─── Chargement et affichage des articles ─────────────────────────────────────
async function loadArticles() {
  document.getElementById('loading-articles').hidden = false;
  document.getElementById('articles-container').innerHTML = '';

  try {
    const snapshot = await getDocs(collection(db, 'articles'));
    articles = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    articles.sort((a, b) => (a.ordre_affichage || 0) - (b.ordre_affichage || 0));
    renderArticles();
  } catch (err) {
    console.error(err);
    showToast('Erreur lors du chargement des articles.', 'error');
  } finally {
    document.getElementById('loading-articles').hidden = true;
  }
}

function escapeHtml(str) {
  const el = document.createElement('div');
  el.appendChild(document.createTextNode(str || ''));
  return el.innerHTML;
}

function renderArticles() {
  const count = articles.length;
  document.getElementById('articles-count').textContent =
    count === 0 ? 'Aucun article' : `${count} article${count > 1 ? 's' : ''}`;

  const container = document.getElementById('articles-container');

  if (count === 0) {
    container.innerHTML = '<p class="empty-state">Aucun article pour le moment. Créez votre premier article !</p>';
    return;
  }

  container.innerHTML = articles.map((article, index) => `
    <div class="article-row${article.est_actif ? '' : ' article-inactive'}"
         data-id="${article.id}" data-index="${index}" draggable="true">
      <div class="drag-handle" role="button" aria-label="Déplacer l'article" title="Déplacer">⠿</div>
      <div class="article-info">
        <span class="article-order">#${article.ordre_affichage ?? '–'}</span>
        <div class="article-details">
          <span class="article-title">${escapeHtml(article.titre || 'Sans titre')}</span>
          ${article.sous_titre ? `<span class="article-subtitle">${escapeHtml(article.sous_titre)}</span>` : ''}
        </div>
        <span class="article-status ${article.est_actif ? 'status-active' : 'status-inactive'}">
          ${article.est_actif ? 'Actif' : 'Inactif'}
        </span>
      </div>
      <div class="article-actions">
        <button class="btn-action btn-edit"      data-id="${article.id}" title="Modifier">✏️ Modifier</button>
        <button class="btn-action btn-toggle"    data-id="${article.id}" data-active="${article.est_actif}" title="${article.est_actif ? 'Masquer' : 'Afficher'}">
          ${article.est_actif ? '🙈 Masquer' : '👁 Afficher'}
        </button>
        <button class="btn-action btn-duplicate" data-id="${article.id}" title="Dupliquer">📋 Dupliquer</button>
        <button class="btn-action btn-delete"    data-id="${article.id}" title="Supprimer">🗑 Supprimer</button>
      </div>
    </div>
  `).join('');
}

// ─── Modal article (ajout et modification) ────────────────────────────────────
function openModal(article = null) {
  const idField       = document.getElementById('form-article-id');
  const titleField    = document.getElementById('form-title');
  const subtitleField = document.getElementById('form-subtitle');
  const orderField    = document.getElementById('form-order');
  const imageField    = document.getElementById('form-image');
  const preview       = document.getElementById('form-image-preview');
  const fileInput     = document.getElementById('form-image-file');
  const modalTitle    = document.getElementById('modal-title');
  const editor        = document.getElementById('form-content');

  if (article) {
    modalTitle.textContent    = "Modifier l'article";
    idField.value             = article.id;
    titleField.value          = article.titre || '';
    subtitleField.value       = article.sous_titre || '';
    orderField.value          = article.ordre_affichage || '';
    imageField.value          = article.image || '';
    if (article.image) {
      preview.src    = article.image;
      preview.hidden = false;
    } else {
      preview.src    = '';
      preview.hidden = true;
    }
    editor.innerHTML = article.contenu || '';
  } else {
    modalTitle.textContent = 'Ajouter un article';
    idField.value          = '';
    titleField.value       = '';
    subtitleField.value    = '';
    orderField.value       = articles.length + 1;
    imageField.value       = '';
    preview.hidden         = true;
    preview.src            = '';
    editor.innerHTML       = '';
  }

  if (fileInput) fileInput.value = '';
  const statusEl = document.getElementById('form-image-upload-status');
  if (statusEl) statusEl.hidden = true;

  updateTitleCount();
  document.getElementById('article-modal').hidden = false;
  document.body.style.overflow = 'hidden';
  titleField.focus();
}

function closeModal() {
  document.getElementById('article-modal').hidden = true;
  document.body.style.overflow = '';
}

async function handleArticleSubmit(event) {
  event.preventDefault();

  const id        = document.getElementById('form-article-id').value;
  const titre     = document.getElementById('form-title').value.trim();
  const sous_titre = document.getElementById('form-subtitle').value.trim();
  const ordre     = parseInt(document.getElementById('form-order').value) || (articles.length + 1);
  const imageField = document.getElementById('form-image');
  const fileInput  = document.getElementById('form-image-file');
  const editor     = document.getElementById('form-content');
  const contenu    = editor ? editor.innerHTML.trim() : '';

  if (!titre) {
    showToast('Le titre est obligatoire.', 'error');
    return;
  }
  if (!contenu || contenu === '<br>') {
    showToast('Le contenu est obligatoire.', 'error');
    return;
  }

  const submitBtn = document.getElementById('form-submit');
  submitBtn.disabled    = true;
  submitBtn.textContent = 'Enregistrement…';

  try {
    let image = imageField.value.trim();

    // Upload du fichier image si un fichier est sélectionné
    if (fileInput && fileInput.files && fileInput.files[0]) {
      const file = fileInput.files[0];
      const statusEl = document.getElementById('form-image-upload-status');
      if (statusEl) { statusEl.textContent = 'Téléchargement de l\'image…'; statusEl.hidden = false; }
      const filename = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      const sRef = storageRef(storage, `articles/${filename}`);
      await uploadBytes(sRef, file);
      image = await getDownloadURL(sRef);
      if (statusEl) statusEl.hidden = true;
    }

    if (id) {
      await updateDoc(doc(db, 'articles', id), {
        titre, sous_titre, ordre_affichage: ordre, image, contenu
      });
      showToast('Article mis à jour avec succès !');
    } else {
      await addDoc(collection(db, 'articles'), {
        titre, sous_titre, contenu, image,
        est_actif: true,
        ordre_affichage: ordre,
        date_creation: new Date().toISOString()
      });
      showToast('Article créé avec succès !');
    }
    closeModal();
    await loadArticles();
  } catch (err) {
    console.error(err);
    showToast("Erreur lors de l'enregistrement.", 'error');
  } finally {
    submitBtn.disabled    = false;
    submitBtn.textContent = 'Enregistrer';
  }
}

// ─── Actions sur les articles ─────────────────────────────────────────────────
async function toggleArticleStatus(id, currentActive) {
  try {
    await updateDoc(doc(db, 'articles', id), { est_actif: !currentActive });
    showToast(currentActive ? 'Article masqué.' : 'Article affiché.');
    await loadArticles();
  } catch (err) {
    console.error(err);
    showToast('Erreur lors de la mise à jour du statut.', 'error');
  }
}

function openConfirmModal(action) {
  pendingAction = action;
  document.getElementById('confirm-modal').hidden = false;
  document.body.style.overflow = 'hidden';
}

function cancelConfirm() {
  pendingAction = null;
  document.getElementById('confirm-modal').hidden = true;
  document.body.style.overflow = '';
}

async function executeConfirm() {
  if (!pendingAction) return;
  const fn = pendingAction;
  cancelConfirm();
  await fn();
}

function openConfirmDelete(id) {
  openConfirmModal(async () => {
    try {
      await deleteDoc(doc(db, 'articles', id));
      showToast('Article supprimé.');
      await loadArticles();
    } catch (err) {
      console.error(err);
      showToast('Erreur lors de la suppression.', 'error');
    }
  });
}

async function duplicateArticle(id) {
  const article = articles.find(a => a.id === id);
  if (!article) return;
  try {
    const { id: _id, ...data } = article;
    await addDoc(collection(db, 'articles'), {
      ...data,
      titre: `${data.titre} (Copie)`,
      date_creation: new Date().toISOString()
    });
    showToast('Article dupliqué.');
    await loadArticles();
  } catch (err) {
    console.error(err);
    showToast('Erreur lors de la duplication.', 'error');
  }
}

// ─── Réordonnancement des articles (drag & drop) ──────────────────────────────
async function saveArticlesOrder(reordered) {
  try {
    await Promise.all(
      reordered.map((a, i) => updateDoc(doc(db, 'articles', a.id), { ordre_affichage: i + 1 }))
    );
    articles = reordered.map((a, i) => ({ ...a, ordre_affichage: i + 1 }));
    renderArticles();
    showToast('Ordre des articles mis à jour.');
  } catch (err) {
    console.error(err);
    showToast("Erreur lors de la mise à jour de l'ordre.", 'error');
    await loadArticles();
  }
}

// ─── Paramètres globaux (note / nombre d'avis) ────────────────────────────────
const ADMIN_DOC_ID = 'vUe53lHeUzvtElioOgxb';

async function loadSettings() {
  try {
    const adminSnap = await getDoc(doc(db, 'administration', ADMIN_DOC_ID));
    if (!adminSnap.exists()) return;
    const data = adminSnap.data();
    if (data.note_globale !== undefined) document.getElementById('settings-note').value = data.note_globale;
    if (data.nombre_avis  !== undefined) document.getElementById('settings-compte').value = data.nombre_avis;
  } catch (err) {
    console.error(err);
  }
}

async function handleSettingsSubmit(event) {
  event.preventDefault();
  const note        = document.getElementById('settings-note').value.trim();
  const nombre_avis = parseInt(document.getElementById('settings-compte').value, 10);
  const btn         = event.submitter;

  if (!note) { showToast('La note est obligatoire.', 'error'); return; }
  if (isNaN(nombre_avis)) { showToast('Le nombre d\'avis est invalide.', 'error'); return; }

  btn.disabled    = true;
  btn.textContent = 'Enregistrement…';
  try {
    await updateDoc(doc(db, 'administration', ADMIN_DOC_ID), { note_globale: note, nombre_avis });
    showToast('Paramètres mis à jour.');
  } catch (err) {
    console.error(err);
    showToast('Erreur lors de l\'enregistrement.', 'error');
  } finally {
    btn.disabled    = false;
    btn.textContent = 'Enregistrer les paramètres';
  }
}

// ─── Avis ─────────────────────────────────────────────────────────────────────
async function loadAvis() {
  document.getElementById('loading-avis').hidden = false;
  document.getElementById('avis-container').innerHTML = '';

  try {
    const snapshot = await getDocs(collection(db, 'avis'));
    avis = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    avis.sort((a, b) => new Date(b.date_creation || 0) - new Date(a.date_creation || 0));
    renderAvis();
  } catch (err) {
    console.error(err);
    showToast('Erreur lors du chargement des avis.', 'error');
  } finally {
    document.getElementById('loading-avis').hidden = true;
  }
}

function renderAvis() {
  const count = avis.length;
  document.getElementById('avis-count').textContent =
    count === 0 ? 'Aucun avis' : `${count} avis`;

  const container = document.getElementById('avis-container');

  if (count === 0) {
    container.innerHTML = '<p class="empty-state">Aucun avis pour le moment. Ajoutez votre premier avis !</p>';
    return;
  }

  container.innerHTML = avis.map(a => `
    <div class="article-row" data-id="${a.id}">
      <div class="avis-info">
        ${a.photo
          ? `<img class="avis-avatar" src="${escapeHtml(a.photo)}" alt="${escapeHtml(a.auteur || '')}" onerror="this.style.display='none'" />`
          : '<div class="avis-avatar-placeholder">👤</div>'
        }
        <div class="article-details">
          <span class="article-title">${escapeHtml(a.auteur || 'Anonyme')}</span>
          <span class="article-subtitle"><span aria-label="${a.rating || 5} étoiles sur 5">${'⭐'.repeat(Math.min(5, Math.max(1, a.rating || 5)))}</span> · ${escapeHtml(a.temps || '')}</span>
          <span class="article-subtitle">${escapeHtml((a.texte || '').substring(0, 100))}${(a.texte || '').length > 100 ? '…' : ''}</span>
        </div>
      </div>
      <div class="article-actions">
        <button class="btn-action btn-edit-avis"   data-id="${a.id}" title="Modifier">✏️ Modifier</button>
        <button class="btn-action btn-delete-avis" data-id="${a.id}" title="Supprimer">🗑 Supprimer</button>
      </div>
    </div>
  `).join('');
}

function openAvisModal(avisItem = null) {
  const idField     = document.getElementById('form-avis-id');
  const auteurField = document.getElementById('form-avis-auteur');
  const ratingField = document.getElementById('form-avis-rating');
  const tempsField  = document.getElementById('form-avis-temps');
  const texteField  = document.getElementById('form-avis-texte');
  const photoField  = document.getElementById('form-avis-photo');
  const title       = document.getElementById('avis-modal-title');

  if (avisItem) {
    title.textContent    = "Modifier l'avis";
    idField.value        = avisItem.id;
    auteurField.value    = avisItem.auteur    || '';
    ratingField.value    = avisItem.rating    ?? 5;
    tempsField.value     = avisItem.temps     || '';
    texteField.value     = avisItem.texte     || '';
    photoField.value     = avisItem.photo     || '';
  } else {
    title.textContent    = 'Ajouter un avis';
    idField.value        = '';
    auteurField.value    = '';
    ratingField.value    = 5;
    tempsField.value     = '';
    texteField.value     = '';
    photoField.value     = '';
  }

  document.getElementById('avis-modal').hidden = false;
  document.body.style.overflow = 'hidden';
  auteurField.focus();
}

function closeAvisModal() {
  document.getElementById('avis-modal').hidden = true;
  document.body.style.overflow = '';
}

async function handleAvisSubmit(event) {
  event.preventDefault();

  const id     = document.getElementById('form-avis-id').value;
  const auteur = document.getElementById('form-avis-auteur').value.trim();
  const rating = parseInt(document.getElementById('form-avis-rating').value, 10) || 5;
  const temps  = document.getElementById('form-avis-temps').value.trim();
  const texte  = document.getElementById('form-avis-texte').value.trim();
  const photo  = document.getElementById('form-avis-photo').value.trim();

  if (!auteur) { showToast('L\'auteur est obligatoire.', 'error'); return; }
  if (!texte)  { showToast('Le texte est obligatoire.', 'error');  return; }

  const btn = document.getElementById('avis-form-submit');
  btn.disabled    = true;
  btn.textContent = 'Enregistrement…';

  try {
    const now = new Date().toISOString();
    if (id) {
      await updateDoc(doc(db, 'avis', id), { auteur, rating, temps, texte, photo });
      showToast('Avis mis à jour avec succès !');
    } else {
      await addDoc(collection(db, 'avis'), {
        auteur, rating, temps, texte, photo,
        date_creation: now,
        date_recuperation: now
      });
      showToast('Avis ajouté avec succès !');
    }
    closeAvisModal();
    await loadAvis();
  } catch (err) {
    console.error(err);
    showToast("Erreur lors de l'enregistrement de l'avis.", 'error');
  } finally {
    btn.disabled    = false;
    btn.textContent = 'Enregistrer';
  }
}

function openConfirmDeleteAvis(id) {
  openConfirmModal(async () => {
    try {
      await deleteDoc(doc(db, 'avis', id));
      showToast('Avis supprimé.');
      await loadAvis();
    } catch (err) {
      console.error(err);
      showToast('Erreur lors de la suppression.', 'error');
    }
  });
}

function updateTitleCount() {
  const input = document.getElementById('form-title');
  document.getElementById('title-count').textContent = `${input.value.length} / ${input.maxLength}`;
}

// ─── Initialisation ───────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {

  // Suivi de l'état d'authentification
  onAuthStateChanged(auth, user => {
    if (user) {
      showAdminScreen();
    } else {
      showLoginScreen();
    }
  });

  // Connexion
  document.getElementById('login-form').addEventListener('submit', handleLogin);

  // Déconnexion
  document.getElementById('logout-btn').addEventListener('click', handleLogout);

  // ── Onglets ────────────────────────────────────────────────────────────────
  let avisLoaded = false;
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tabId = btn.dataset.tab;
      document.querySelectorAll('.tab-btn').forEach(b => {
        const active = b === btn;
        b.classList.toggle('active', active);
        b.setAttribute('aria-selected', String(active));
      });
      document.querySelectorAll('.tab-content').forEach(t => { t.hidden = t.id !== `tab-${tabId}`; });
      if (tabId === 'avis' && !avisLoaded) {
        avisLoaded = true;
        loadAvis();
      }
    });
  });

  // ── Articles ───────────────────────────────────────────────────────────────
  document.getElementById('add-article-btn').addEventListener('click', () => openModal());

  document.getElementById('modal-close').addEventListener('click', closeModal);
  document.getElementById('form-cancel').addEventListener('click', closeModal);
  document.getElementById('article-modal').addEventListener('click', e => {
    if (e.target === e.currentTarget) closeModal();
  });

  document.getElementById('article-form').addEventListener('submit', handleArticleSubmit);
  document.getElementById('form-title').addEventListener('input', updateTitleCount);

  document.getElementById('form-image-file').addEventListener('change', e => {
    const file = e.target.files[0];
    const preview = document.getElementById('form-image-preview');
    if (file) {
      const url = URL.createObjectURL(file);
      preview.src    = url;
      preview.hidden = false;
    } else {
      preview.src    = '';
      preview.hidden = true;
    }
  });

  // ── Confirmation suppression (générique) ──────────────────────────────────
  document.getElementById('confirm-cancel').addEventListener('click', cancelConfirm);
  document.getElementById('confirm-delete').addEventListener('click', executeConfirm);
  document.getElementById('confirm-modal').addEventListener('click', e => {
    if (e.target === e.currentTarget) cancelConfirm();
  });

  // ── Délégation sur la liste d'articles ────────────────────────────────────
  const articlesContainer = document.getElementById('articles-container');

  articlesContainer.addEventListener('click', e => {
    const btn = e.target.closest('.btn-action');
    if (!btn) return;
    const id = btn.dataset.id;

    if (btn.classList.contains('btn-edit')) {
      const article = articles.find(a => a.id === id);
      if (article) openModal(article);
    } else if (btn.classList.contains('btn-toggle')) {
      toggleArticleStatus(id, btn.dataset.active === 'true');
    } else if (btn.classList.contains('btn-duplicate')) {
      duplicateArticle(id);
    } else if (btn.classList.contains('btn-delete')) {
      openConfirmDelete(id);
    }
  });

  // ── Drag & drop articles ───────────────────────────────────────────────────
  articlesContainer.addEventListener('mousedown', e => {
    dragFromHandle = !!e.target.closest('.drag-handle');
  });

  articlesContainer.addEventListener('dragstart', e => {
    if (!dragFromHandle) { e.preventDefault(); return; }
    const row = e.target.closest('.article-row');
    if (!row) return;
    draggedId = row.dataset.id;
    e.dataTransfer.effectAllowed = 'move';
    setTimeout(() => row.classList.add('dragging'), 0);
  });

  articlesContainer.addEventListener('dragover', e => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const row = e.target.closest('.article-row');
    if (!row || row.dataset.id === draggedId) return;
    articlesContainer.querySelectorAll('.article-row').forEach(r => r.classList.remove('drag-over'));
    row.classList.add('drag-over');
  });

  articlesContainer.addEventListener('dragleave', e => {
    const row = e.target.closest('.article-row');
    if (row) row.classList.remove('drag-over');
  });

  articlesContainer.addEventListener('drop', async e => {
    e.preventDefault();
    const targetRow = e.target.closest('.article-row');
    if (!targetRow || targetRow.dataset.id === draggedId) return;

    articlesContainer.querySelectorAll('.article-row').forEach(r => r.classList.remove('drag-over', 'dragging'));

    const fromIndex = articles.findIndex(a => a.id === draggedId);
    const toIndex   = articles.findIndex(a => a.id === targetRow.dataset.id);
    if (fromIndex === -1 || toIndex === -1) return;

    const reordered = [...articles];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, moved);

    await saveArticlesOrder(reordered);
    draggedId = null;
  });

  articlesContainer.addEventListener('dragend', () => {
    articlesContainer.querySelectorAll('.article-row').forEach(r => r.classList.remove('drag-over', 'dragging'));
    draggedId = null;
    dragFromHandle = false;
  });

  // ── Avis ──────────────────────────────────────────────────────────────────
  document.getElementById('settings-form').addEventListener('submit', handleSettingsSubmit);

  document.getElementById('add-avis-btn').addEventListener('click', () => openAvisModal());
  document.getElementById('avis-modal-close').addEventListener('click', closeAvisModal);
  document.getElementById('avis-form-cancel').addEventListener('click', closeAvisModal);
  document.getElementById('avis-modal').addEventListener('click', e => {
    if (e.target === e.currentTarget) closeAvisModal();
  });
  document.getElementById('avis-form').addEventListener('submit', handleAvisSubmit);

  document.getElementById('avis-container').addEventListener('click', e => {
    const btn = e.target.closest('.btn-action');
    if (!btn) return;
    const id = btn.dataset.id;

    if (btn.classList.contains('btn-edit-avis')) {
      const item = avis.find(a => a.id === id);
      if (item) openAvisModal(item);
    } else if (btn.classList.contains('btn-delete-avis')) {
      openConfirmDeleteAvis(id);
    }
  });

  // ── Éditeur de texte riche ────────────────────────────────────────────────
  document.querySelectorAll('#editor-toolbar .toolbar-btn').forEach(btn => {
    btn.addEventListener('mousedown', e => {
      e.preventDefault(); // prevent losing focus on editor
      const cmd = btn.dataset.cmd;
      document.execCommand(cmd, false, null);
    });
  });

  const colorInput = document.getElementById('toolbar-color');
  if (colorInput) {
    colorInput.addEventListener('input', e => {
      document.execCommand('foreColor', false, e.target.value);
    });
  }
});
