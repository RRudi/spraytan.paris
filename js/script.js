async function fetchArticles() {
  try {
    const apiUrl = '/api/articles'; // Cette route retourne uniquement les articles actifs
    const response = await fetch(apiUrl);
    if (!response.ok) {
      throw new Error(`Erreur HTTP : ${response.status} ${response.statusText}`);
    }

    const articles = await response.json();

    if (!Array.isArray(articles) || articles.length === 0) {
      throw new Error('Aucun article trouvé dans la base de données.');
    }

    const container = document.querySelector('.insta-container');
    container.innerHTML = articles.map(article => `
      <article id="${article.id}">
        <header class="insta-container-header">
          <div class="insta-container-header-titre font-secondaire">
            <h2>${article.title}</h2>
            <h3>${article.subtitle}</h3>
          </div>
        </header>
        <div class="insta-container-image">
          <img src="${article.image}" alt="${article.alt}" />
        </div>
        <div class="insta-container-texte">
          <p>${article.content}</p>
          <div class="telephone">
            <i class="material-icons">phone</i>
            <p>06 11 14 23 09</p>
          </div>
        </div>
      </article>
    `).join('');

    // Mettre à jour la date de la dernière mise à jour
    const lastUpdatedElement = document.getElementById('last-updated');
    const lastUpdatedDate = articles[0].updated_at;
    lastUpdatedElement.textContent = `Dernière mise à jour : ${new Date(lastUpdatedDate).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })}`;
  } catch (error) {
    console.error('Erreur lors du chargement des articles :', error.message);
    const container = document.querySelector('.insta-container');
    container.innerHTML = `<p>Impossible de charger les articles pour le moment. Veuillez réessayer plus tard.</p>`;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  fetchArticles();
});
