async function fetchArticles() {
  try {
    const response = await fetch('/api/articles/all'); // Appelle la route qui retourne tous les articles
    if (!response.ok) {
      throw new Error(`Erreur HTTP : ${response.status} ${response.statusText}`);
    }

    const articles = await response.json();
    const container = document.getElementById('articles-container');
    container.innerHTML = articles.map(article => `
      <div class="article-item" data-id="${article.id}">
        <h3>${article.title}</h3>
        <div class="article-actions">
          <button onclick="editArticle(${article.id})">✏️</button>
          <button onclick="deleteArticle(${article.id})">🗑️</button>
          <button onclick="toggleArticleStatus(${article.id}, ${article.is_active})">
            ${article.is_active ? '✅' : '❌'}
          </button>
        </div>
      </div>
    `).join('');
  } catch (error) {
    console.error('Erreur lors du chargement des articles :', error.message);
  }
}

async function saveArticle(event) {
  event.preventDefault();

  const idElement = document.getElementById('article-id');
  const titleElement = document.getElementById('title');
  const subtitleElement = document.getElementById('subtitle');
  const imageInput = document.getElementById('image');
  const imageUpload = document.getElementById('image-upload');
  const altElement = document.getElementById('alt');
  const contentElement = document.getElementById('content');
  const phoneElement = document.getElementById('phone');
  const isActiveElement = document.getElementById('is-active');
  const orderElement = document.getElementById('order'); // Nouveau champ

  const id = idElement.value.trim();
  const title = titleElement.value.trim();
  const subtitle = subtitleElement.value.trim();
  const alt = altElement.value.trim();
  const content = contentElement.value.trim();
  const phone = phoneElement.value.trim();
  const isActive = isActiveElement.checked ? 1 : 0;
  const order = parseInt(orderElement.value, 10) || 1; // Récupère l'ordre ou utilise 1 par défaut

  if (!title || !content) {
    alert('Les champs "Titre" et "Contenu" sont obligatoires.');
    return;
  }

  let image = imageInput.value;

  // Si une image est uploadée, envoyez-la au serveur
  if (imageUpload.files.length > 0) {
    const formData = new FormData();
    formData.append('image', imageUpload.files[0]);

    try {
      const uploadResponse = await fetch('/api/upload-image', {
        method: 'POST',
        body: formData,
      });

      if (!uploadResponse.ok) {
        throw new Error(`Erreur HTTP : ${uploadResponse.status} ${uploadResponse.statusText}`);
      }

      const uploadResult = await uploadResponse.json();
      image = uploadResult.filePath; // Chemin de l'image sauvegardée
    } catch (error) {
      console.error('Erreur lors de l\'upload de l\'image :', error.message);
      return;
    }
  }

  const method = id ? 'PUT' : 'POST'; // Utilise PUT pour la modification et POST pour la création
  const url = id ? `/api/articles/${id}` : '/api/articles';

  try {
    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, subtitle, image, alt, content, phone, is_active: isActive, order }),
    });

    if (!response.ok) {
      throw new Error(`Erreur HTTP : ${response.status} ${response.statusText}`);
    }

    document.getElementById('form-article').reset();
    document.getElementById('article-id').value = ''; // Réinitialise l'ID après création ou mise à jour
    fetchArticles(); // Recharge les articles après la modification ou la création
  } catch (error) {
    console.error('Erreur lors de l\'enregistrement de l\'article :', error.message);
  }
}

async function editArticle(id) {
  try {
    const response = await fetch(`/api/articles/${id}`);
    if (!response.ok) {
      throw new Error(`Erreur HTTP : ${response.status} ${response.statusText}`);
    }

    const article = await response.json();
    document.getElementById('article-id').value = article.id;
    document.getElementById('title').value = article.title;
    document.getElementById('subtitle').value = article.subtitle;
    document.getElementById('image').value = article.image;
    document.getElementById('alt').value = article.alt;
    document.getElementById('content').value = article.content;
    document.getElementById('phone').value = article.phone;
    document.getElementById('is-active').checked = article.is_active === 1;
    document.getElementById('order').value = article.order || 1; // Remplit le champ `order`
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'article :', error.message);
  }
}

async function deleteArticle(id) {
  try {
    const response = await fetch(`/api/articles/${id}`, { method: 'DELETE' });
    if (!response.ok) {
      throw new Error(`Erreur HTTP : ${response.status} ${response.statusText}`);
    }

    fetchArticles();
  } catch (error) {
    console.error('Erreur lors de la suppression de l\'article :', error.message);
  }
}

async function toggleArticleStatus(id, currentStatus) {
  try {
    const newStatus = currentStatus === 1 ? 0 : 1;
    const response = await fetch(`/api/articles/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: newStatus }),
    });

    if (!response.ok) {
      throw new Error(`Erreur HTTP : ${response.status} ${response.statusText}`);
    }

    fetchArticles();
  } catch (error) {
    console.error('Erreur lors de la mise à jour du statut de l\'article :', error.message);
  }
}

async function handleLogin(event) {
  event.preventDefault();

  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;

  try {
    const response = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    if (!response.ok) {
      throw new Error('Identifiants incorrects.');
    }

    document.getElementById('login-container').style.display = 'none';
    document.getElementById('admin-container').style.display = 'block';
    fetchArticles();
  } catch (error) {
    document.getElementById('login-error').style.display = 'block';
    console.error('Erreur lors de la connexion :', error.message);
  }
}

document.getElementById('form-article').addEventListener('submit', saveArticle);
document.getElementById('login-form').addEventListener('submit', handleLogin);
document.addEventListener('DOMContentLoaded', fetchArticles);

document.getElementById('cancel-button').addEventListener('click', () => {
  document.getElementById('form-article').reset();
  document.getElementById('article-id').value = '';
});
