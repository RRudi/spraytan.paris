import { db } from './firebaseConfig.js';
import { collection, getDocs } from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js';

const phoneNumber = "33611142309";

async function getListeArticle() {
  console.log("index.js -> getArticles");
  try {
    // Récupération des articles en base
    const collectionArticles = collection(db, 'articles');
    const articlesSnapshot = await getDocs(collectionArticles);
    const listeArticle = articlesSnapshot.docs
      .map(doc => doc.data())
      .filter(article => article.est_actif !== false); // Exclure les articles inactifs

    // Tri des articles par ordre du champ 'ordre_affichage'
    listeArticle.sort((a, b) => a.ordre_affichage - b.ordre_affichage);

    // Récupération de la date de création la plus récente
    const latestDate = listeArticle.reduce((latest, article) => {
      const articleDate = new Date(article.date_creation);
      return articleDate > latest ? articleDate : latest;
    }, new Date(0));

    // Affichage de la date et de l'heure dans l'élément <p id="last-updated">
    const lastUpdatedElement = document.getElementById('last-updated');
    if (lastUpdatedElement) {
      lastUpdatedElement.textContent = `Dernière mise à jour : ${latestDate.toLocaleDateString('fr-FR')} à ${latestDate.toLocaleTimeString('fr-FR')}`;
    }

    console.log("listeArticle : ", listeArticle);

    if (!Array.isArray(listeArticle) || listeArticle.length === 0) {
      throw new Error('Aucun article trouvé dans la base de données.');
    }

    // Récupération de la classe <div class="insta-container">
    const container = document.querySelector('.insta-container');
    // Insertion du code HTML des articles dans le container
    container.innerHTML = listeArticle.map(article => `
      <article id="${article.id}">
        <header class="insta-container-header">
          <div class="insta-container-header-titre font-secondaire">
            <h2>${article.titre}</h2>
            <h3>${article.sous_titre}</h3>
          </div>
          <div class="insta-container-header-img"></div>
        </header>
        ${article.image ? `
        <div class="insta-container-image">
          <img src="${article.image}" alt="${article.sous_titre}" />
        </div>` : ''}
        <div class="insta-container-texte">
          <div class="article-content">
            ${article.contenu}
          </div>
          <div class="telephone">
            <a
              href="https://wa.me/${phoneNumber}"
              target="_blank"
              title="Discuter sur WhatsApp"
              ><i class="fab fa-whatsapp"></i
            >Commencer une discussion WhatsApp
            </a>
          </div>
        </div>
      </article>
    `).join('');

  } catch (error) {
    console.error('Erreur lors du chargement des articles :', error.message);
    const container = document.querySelector('.insta-container');
    container.innerHTML = `<p>Impossible de charger les articles pour le moment. Veuillez réessayer plus tard.</p>`;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  getListeArticle();
});
