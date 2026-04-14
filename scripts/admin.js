import { db, auth } from './firebaseConfig.js';
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js';
import {
  collection, getDocs, addDoc, updateDoc, deleteDoc, doc
} from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js';

// ─── État global ──────────────────────────────────────────────────────────────
let articles = [];
let pendingDeleteId = null;

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

  container.innerHTML = articles.map(article => `
    <div class="article-row${article.est_actif ? '' : ' article-inactive'}" data-id="${article.id}">
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
  const modalTitle    = document.getElementById('modal-title');

  if (article) {
    modalTitle.textContent    = "Modifier l'article";
    idField.value             = article.id;
    titleField.value          = article.titre || '';
    subtitleField.value       = article.sous_titre || '';
    orderField.value          = article.ordre_affichage || '';
    imageField.value          = article.image || '';
    if (article.image && /^https?:\/\//i.test(article.image)) {
      preview.src    = article.image;
      preview.hidden = false;
    } else {
      preview.src    = '';
      preview.hidden = true;
    }
    const editor = tinymce.get('form-content');
    if (editor) editor.setContent(article.contenu || '');
  } else {
    modalTitle.textContent = 'Ajouter un article';
    idField.value          = '';
    titleField.value       = '';
    subtitleField.value    = '';
    orderField.value       = articles.length + 1;
    imageField.value       = '';
    preview.hidden         = true;
    const editor = tinymce.get('form-content');
    if (editor) editor.setContent('');
  }

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
  const image     = document.getElementById('form-image').value.trim();

  const editor  = tinymce.get('form-content');
  const contenu = editor ? editor.getContent() : document.getElementById('form-content').value.trim();

  if (!titre) {
    showToast('Le titre est obligatoire.', 'error');
    return;
  }
  if (!contenu || contenu === '<p></p>' || contenu === '<p><br></p>') {
    showToast('Le contenu est obligatoire.', 'error');
    return;
  }

  const submitBtn = document.getElementById('form-submit');
  submitBtn.disabled    = true;
  submitBtn.textContent = 'Enregistrement…';

  try {
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

function openConfirmDelete(id) {
  pendingDeleteId = id;
  document.getElementById('confirm-modal').hidden = false;
  document.body.style.overflow = 'hidden';
}

function cancelDelete() {
  pendingDeleteId = null;
  document.getElementById('confirm-modal').hidden = true;
  document.body.style.overflow = '';
}

async function executeDelete() {
  if (!pendingDeleteId) return;
  const id = pendingDeleteId;
  cancelDelete();
  try {
    await deleteDoc(doc(db, 'articles', id));
    showToast('Article supprimé.');
    await loadArticles();
  } catch (err) {
    console.error(err);
    showToast('Erreur lors de la suppression.', 'error');
  }
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

  // Ouvrir modal ajout
  document.getElementById('add-article-btn').addEventListener('click', () => openModal());

  // Fermer modal article
  document.getElementById('modal-close').addEventListener('click', closeModal);
  document.getElementById('form-cancel').addEventListener('click', closeModal);
  document.getElementById('article-modal').addEventListener('click', e => {
    if (e.target === e.currentTarget) closeModal();
  });

  // Soumettre le formulaire article
  document.getElementById('article-form').addEventListener('submit', handleArticleSubmit);

  // Compteur de caractères du titre
  document.getElementById('form-title').addEventListener('input', updateTitleCount);

  // Aperçu de l'image
  document.getElementById('form-image').addEventListener('input', e => {
    const url = e.target.value.trim();
    const preview = document.getElementById('form-image-preview');
    if (url && /^https?:\/\//i.test(url)) {
      preview.src    = url;
      preview.hidden = false;
    } else {
      preview.src    = '';
      preview.hidden = true;
    }
  });

  // Modal confirmation suppression
  document.getElementById('confirm-cancel').addEventListener('click', cancelDelete);
  document.getElementById('confirm-delete').addEventListener('click', executeDelete);
  document.getElementById('confirm-modal').addEventListener('click', e => {
    if (e.target === e.currentTarget) cancelDelete();
  });

  // Délégation d'événements sur la liste d'articles
  document.getElementById('articles-container').addEventListener('click', e => {
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

  // Initialisation TinyMCE (éditeur de contenu unique)
  tinymce.init({
    selector: '#form-content',
    plugins: 'lists link code',
    toolbar: 'undo redo | styleselect | bold italic underline | alignleft aligncenter | bullist numlist | link | code',
    menubar: false,
    height: 300,
    setup: editor => {
      editor.on('change input', () => {
        document.getElementById('form-content').value = editor.getContent();
      });
    }
  });
});
