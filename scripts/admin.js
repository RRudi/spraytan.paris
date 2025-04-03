import { db } from './firebaseConfig.js';
import { collection, getDocs, addDoc, query, where, updateDoc, deleteDoc, doc } from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js';

let nombreArticles = 0; // Variable globale pour stocker le nombre d'articles

async function getListeArticle() {
  try {
    // Récupération des articles en base
    const collectionArticles = collection(db, 'articles');
    const articlesSnapshot = await getDocs(collectionArticles);
    const listeArticle = articlesSnapshot.docs.map(doc => ({
      id: doc.id, // Récupération de l'ID du document
      ...doc.data() // Récupération des données du document
    }));

    // Tri des articles par ordre du champ 'ordre_affichage'
    listeArticle.sort((a, b) => a.ordre_affichage - b.ordre_affichage);

    console.log("listeArticle : ", listeArticle);

    if (!Array.isArray(listeArticle) || listeArticle.length === 0) {
      throw new Error('Aucun article trouvé dans la base de données.');
    }

    nombreArticles = listeArticle.length; // Stocker le nombre d'articles
    console.log("Nombre d'articles :", nombreArticles);

    // Mettre à jour le contenu de <span id="articles-number">
    document.getElementById('articles-number').textContent = nombreArticles;

    // Récupération de la classe <div class="insta-container">
    const container = document.getElementById('articles-container');
    // Insertion du code HTML des articles dans le container
    container.innerHTML = listeArticle.map(article => `
      <div class="article-item" data-id="${article.id}">
        <h3 title="ID: ${article.id}">${article.ordre_affichage} - ${article.titre}</h3>
        <div class="article-actions">
          <button title="Modifier" onclick="editArticle('${article.id}')">✏️</button>
          <button title="Afficher" onclick="updateStatus('${article.id}', ${article.est_actif})">
            ${article.est_actif ? '🐵' : '🙈'}
          </button>
          <button title="Dupliquer" onclick="duplicateArticle('${article.id}')">✌️</button>
          <button title="Supprimer" onclick="deleteArticle('${article.id}')">🗑️</button>
        </div>
      </div>
    `).join('');

  } catch (error) {
    console.error('Erreur lors du chargement des articles :', error.message);
    const container = document.querySelector('.articles-container');
    container.innerHTML = `<p>Impossible de charger les articles pour le moment. Veuillez réessayer plus tard.</p>`;
  }
}

async function addArticle(event) {
  event.preventDefault(); // Empêche le rechargement de la page lors de la soumission du formulaire

  const champs_titre = document.getElementById('title').value.trim();
  const champs_soustitre = document.getElementById('subtitle').value.trim();
  const champs_contenu = document.getElementById('content').value.trim();
  const champs_image = document.getElementById('image').value.trim();

  if (!champs_titre || !champs_contenu) {
    console.error('Le titre et le contenu sont obligatoires.');
    return;
  }

  try {
    const collectionArticles = collection(db, 'articles');
    const newArticle = {
      titre: champs_titre,
      sous_titre: champs_soustitre,
      contenu: champs_contenu,
      image: champs_image,
      est_actif: true,
      ordre_affichage: nombreArticles + 1, // Utilisation de la variable pour définir l'ordre
      date_creation: new Date().toISOString() // Ajout de la date actuelle
    };
    await addDoc(collectionArticles, newArticle);
    console.log('Article créé avec succès:', newArticle);

    // Masquer le formulaire après la création de l'article
    const articleForm = document.getElementById('add-article-form');
    if (articleForm) {
      articleForm.style.display = 'none';
    }

    // Recharger la liste des articles
    getListeArticle();

  } catch (error) {
    console.error('Erreur lors de la création de l\'article :', error.message);
  }
}

async function checkAdmin(event) {
  console.log('checkAdmin');
  try {
    event.preventDefault(); // Empêche le rechargement de la page lors de la soumission du formulaire
  
    const champs_username= document.getElementById('username').value.trim();
    const champs_password = document.getElementById('password').value.trim();

    const adminCollection = collection(db, 'administration');
    const q = query(adminCollection, where('utilisateur', '==', champs_username), where('motdepasse', '==', champs_password));
    const querySnapshot = await getDocs(q);

    let isValid = !querySnapshot.empty; // Retourne true si les identifiants sont valides
    console.log('checkAdmin : isValid : ', isValid);

    if (isValid) {
      document.getElementById('login-container').style.display = 'none';
      document.getElementById('admin-container').style.display = 'block';
    } else {
      const errorElement = document.getElementById('login-error');
      errorElement.style.display = 'block';
    }

  } catch (error) {
    console.error('Erreur lors de la vérification des identifiants :', error.message);
    return false;
  }
}

async function editArticle(articleId) {
  console.log('editArticle');
  try {
    const collectionArticles = collection(db, 'articles');
    const articlesSnapshot = await getDocs(collectionArticles);
    const articleDoc = articlesSnapshot.docs.find(doc => doc.id === articleId);

    if (articleDoc) {
      const articleData = articleDoc.data();
      console.log('articleData : ', articleData);
      document.getElementById('edit-article-id').value = articleId;
      document.getElementById('edit-title').value = articleData.titre;
      document.getElementById('edit-order').value = articleData.ordre_affichage;
      document.getElementById('edit-subtitle').value = articleData.sous_titre;
      document.getElementById('edit-image').value = articleData.image;
      document.getElementById('edit-image-preview').src = articleData.image; // Ajouter la source de l'image
      document.getElementById('edit-image-preview').style.display = articleData.image ? 'inline' : 'none'; // Afficher ou masquer l'aperçu
      tinymce.get("edit-content").setContent(articleData.contenu);

      // Afficher le formulaire de modification
      document.getElementById('edit-article-form').style.display = 'block';
    } else {
      console.error('Article introuvable.');
    }
  } catch (error) {
    console.error('Erreur lors de l\'édition de l\'article :', error.message);
  }
}

async function updateArticle(event) {
  event.preventDefault(); // Empêche le rechargement de la page lors de la soumission du formulaire

  const articleId = document.getElementById('edit-article-id').value;
  const order = document.getElementById('edit-order').value;
  const titre = document.getElementById('edit-title').value.trim();
  const sousTitre = document.getElementById('edit-subtitle').value.trim();
  const image = document.getElementById('edit-image').value.trim();
  const contenu = document.getElementById('edit-content').value.trim();

  if (!titre || !contenu) {
    console.error('Le titre et le contenu sont obligatoires.');
    return;
  }

  try {
    const articleRef = doc(db, 'articles', articleId);
    await updateDoc(articleRef, {
      ordre_affichage: order,
      titre,
      sous_titre: sousTitre,
      image,
      contenu
    });
    console.log('Article mis à jour avec succès.');

    // Masquer le formulaire de modification après la mise à jour
    document.getElementById('edit-article-form').style.display = 'none';

    // Recharger la liste des articles
    getListeArticle();
  } catch (error) {
    console.error('Erreur lors de la mise à jour de l\'article :', error.message);
  }
}

async function deleteArticle(articleId) {
  console.log('deleteArticle');
  try {
    const articleRef = doc(db, 'articles', articleId);
    await deleteDoc(articleRef);
    console.log('Article supprimé avec succès.');
    getListeArticle(); // Recharger la liste des articles
  } catch (error) {
    console.error('Erreur lors de la suppression de l\'article :', error.message);
  }
}

async function updateStatus(id, currentStatus) {
  console.log('toggleArticleStatus() :', id);
  try {
    const collectionArticles = collection(db, 'articles');
    const articlesSnapshot = await getDocs(collectionArticles);
    const articleDoc = articlesSnapshot.docs.find(doc => doc.id === id);

    if (articleDoc) {
      await updateDoc(articleDoc.ref, { est_actif: !currentStatus });
      console.log('Statut de l\'article mis à jour.');
      getListeArticle(); // Recharger la liste des articles
    } else {
      console.error('Article introuvable.');
    }

    // Recharger la liste des articles
    getListeArticle();
  } catch (error) {
    console.error('Erreur lors de la mise à jour du statut de l\'article :', error.message);
  }
}

async function duplicateArticle(articleId) {
  console.log('duplicateArticle');
  try {
    const collectionArticles = collection(db, 'articles');
    const articlesSnapshot = await getDocs(collectionArticles);
    const articleDoc = articlesSnapshot.docs.find(doc => doc.id === articleId);

    if (articleDoc) {
      const articleData = articleDoc.data();
      const newArticle = {
        ...articleData,
        titre: `${articleData.titre} (Copie)`,
        date_creation: new Date().toISOString()
      };
      delete newArticle.id; // Supprimer l'ID pour éviter les conflits
      await addDoc(collectionArticles, newArticle);
      console.log('Article dupliqué avec succès:', newArticle);
      getListeArticle(); // Recharger la liste des articles
    } else {
      console.error('Article introuvable.');
    }
  } catch (error) {
    console.error('Erreur lors de la duplication de l\'article :', error.message);
  }
}

// Rendre les fonctions accessibles globalement
window.updateStatus = updateStatus;
window.editArticle = editArticle;
window.deleteArticle = deleteArticle;
window.duplicateArticle = duplicateArticle;

document.addEventListener('DOMContentLoaded', () => {
  // Récupérer la liste des articles
  getListeArticle();

  // Ajout de l'écoute des boutons Submit des formulaires (Identification, Creation et modification d'articles)
  document.getElementById('login-form').addEventListener('submit', checkAdmin);
  document.getElementById('add-article-form').addEventListener('submit', addArticle);
  document.getElementById('edit-article-form').addEventListener('submit', updateArticle);

  // Afficher le formulaire de création d'article lorsque le bouton est cliqué
  document.getElementById('add-article-button').addEventListener('click', () => {
    console.log('Afficher le formulaire');
    document.getElementById('add-article-form').style.display = 'block';
  });

  // Masquer le formulaire de création d'article lorsque le bouton Annulé est cliqué
  document.getElementById('cancel-button').addEventListener('click', () => {
    document.getElementById('add-article-form').style.display = 'none';
  });

  // Masquer le formulaire de modification d'article lorsque le bouton Annulé est cliqué
  document.getElementById('edit-cancel-button').addEventListener('click', () => {
    document.getElementById('edit-article-form').style.display = 'none';
  });

  tinymce.init({
    selector: "#content",
    plugins: "lists link image code", // Ajout du plugin textcolor
    toolbar:
      "undo redo | styleselect | bold italic underline forecolor | alignleft aligncenter | bullist numlist outdent indent | link",
    menubar: false,
    height: 300,
    hidden_input: false, // Désactive la création d'un champ masqué
    setup: (editor) => {
      editor.on("change", () => {
        document.getElementById("content").value = editor.getContent();
      });
    },
  });

  tinymce.init({
    selector: "#edit-content",
    plugins: "lists link image code", // Ajout du plugin textcolor
    toolbar:
      "undo redo | styleselect | bold italic underline forecolor | alignleft aligncenter | bullist numlist outdent indent | link",
    menubar: false,
    height: 300,
    hidden_input: false, // Désactive la création d'un champ masqué
    setup: (editor) => {
      editor.on("change", () => {
        document.getElementById("edit-content").value = editor.getContent();
      });
    },
  });

  const editImageInput = document.getElementById("edit-image");
  const editImagePreview = document.getElementById("edit-image-preview");

  editImageInput.addEventListener("input", () => {
    const imageUrl = editImageInput.value;
    if (imageUrl) {
      editImagePreview.src = imageUrl;
      editImagePreview.style.display = "inline";
    } else {
      editImagePreview.style.display = "none";
    }
  });
});
