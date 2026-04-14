import { db } from './firebaseConfig.js';
import { collection, getDocs, getDoc, addDoc, query, where, updateDoc, deleteDoc, doc } from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js';

const phoneNumber = "33611142309";

async function getListeArticle() {

  console.info("🗃️ Début de la récupération des articles en base de données");

  try {
    // Récupération des articles en base
    const collectionArticles = collection(db, 'articles');
    const articlesSnapshot = await getDocs(collectionArticles);
    const listeArticle = articlesSnapshot.docs
      .map(doc => doc.data())
      .filter(article => article.est_actif !== false); // Exclure les articles inactifs

    // Tri des articles par ordre du champ 'ordre_affichage'
    listeArticle.sort((a, b) => a.ordre_affichage - b.ordre_affichage);

    console.info("📄 Liste des articles : ", listeArticle);

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
              href="https://wa.me/${phoneNumber}?text=Bonjour,%20j'ai%20vu%20un%20article%20sur%20votre%20site%20et%20je%20souhaite%20en%20savoir%20plus."
              target="_blank"
              title="Discuter sur WhatsApp">
              <i class="fab fa-whatsapp"></i>
              <span>
              Commencer une discussion WhatsApp
              </span>
            </a>
          </div>
        </div>
      </article>
    `).join('');
    
    if (window.location.href.includes("//spraytan.paris/")) {
      console.info("✅ Le compteur d'appel est mis à jour");
      await updateCompteurGetArticles();
    }
    else {
      console.info("⚠️ Le compteur d'appel n'est pas mis à jour car l'URL ne correspond pas à l'environnement de production.");
    }

  } catch (error) {
    console.error('Erreur lors du chargement des articles :', error.message);
    const container = document.querySelector('.insta-container');
    container.innerHTML = `<p>Impossible de charger les articles pour le moment. Veuillez réessayer plus tard.</p>`;
  }

  console.info("✅ Fin de la récupération des articles en base de données");
}

async function updateCompteurGetArticles() {
  const collectionAdministration = collection(db, 'administration');
  const snapshot = await getDocs(collectionAdministration);
  const info = snapshot.docs.find(doc => doc.id === "vUe53lHeUzvtElioOgxb");
  const data = info.data();
  console.info("data.compteur_getArticles : ", data.compteur_getArticles);

  const test = doc(db, 'administration', "vUe53lHeUzvtElioOgxb");
  await updateDoc(test, {
    compteur_getArticles: data.compteur_getArticles + 1,
    date_derniere_recuperation: new Date().toISOString()
  });
}

async function getListeAvis() {

  console.info("⭐ Début de la récupération des avis en base de données");

  try {

    // Récupération des avis en base
    const collectionAvis = collection(db, 'avis');
    const articlesSnapshot = await getDocs(collectionAvis);
    const listeAvis = articlesSnapshot.docs.map(doc => doc.data()); 

    // Récupération de la date de création la plus récente
    const date_recuperation = listeAvis[0].date_recuperation;
    console.log('🗓️ Dernières récupération depuis API :', date_recuperation);

    const unMoisAvant = new Date();
    unMoisAvant.setMonth(unMoisAvant.getMonth() - 1);

    if (new Date(date_recuperation) < unMoisAvant) {
      console.log('⚠️ Les avis ne sont pas à jour');
      getAvisFromAPI();
    } else {
      const prochaineRecuperation = new Date(date_recuperation);
      prochaineRecuperation.setMonth(prochaineRecuperation.getMonth() + 1);
      const joursRestants = Math.ceil((prochaineRecuperation - new Date()) / (1000 * 60 * 60 * 24));
      console.log(`🔄 Les avis sont à jour (Rafraichissement tous les mois)`);
      console.log(`📅 Jours restants avant la prochaine récupération : ${joursRestants}`);
    }

    console.log('🎯 Liste des avis :', listeAvis);

    // Récupération de la classe <div class="avis-container">
    const container = document.querySelector('.avis-container');
    // Insertion du code HTML des articles dans le container
    container.innerHTML = listeAvis.map(avis => `
      <div class="testimonials-elem">
        <div class="testimonials-elem-text">
          <p>
            <i class="material-icons"> format_quote </i>
            ${avis.texte}
          </p>
          <em>Source : Google Avis</em>
        </div>
        <div class="testimonials-elem-profil">
          <img id="photoProfilAvis" src="${avis.photo}" alt="Logo Google avis clientes" />
          <p>${avis.auteur}</p>
          <img src="./img/avis/5-stars.png" />
          <em>${avis.temps}</em>
        </div>
      </div>
    `).join('');

  } catch (error) {
    console.error('🚨 Erreur lors du chargement des avis :', error.message);
  }

  console.info("✅ Fin de la récupération des avis en base de données");
}

async function getAvisFromAPI() {

  console.info("⭐ Début de l'alimentation des avis en base de données (Simulation)");

  // Exemple de réponse simulée
  const exempleReponse = {
    "html_attributions": [],
    "result": {
      "name": "PARADIS DU TAN-SPRAYTAN - PARIS- Bronzage",
      "rating": 4.9,
      "reviews": [
        {
          "author_name": "Audrey Sauvage",
          "profile_photo_url": "https://lh3.googleusercontent.com/a/ACg8ocJRIZOOibwboKntNpsSmefORp3rcrf3RGL2v52Qr0l0SSH-XA=s128-c0x00000000-cc-rp-mo",
          "rating": 5,
          "relative_time_description": "il y a 2 semaines",
          "time": 1742319450,
          "text": "Prestation réalisée pour ma fille de 16 ans. Nous avons reçu un très bel accueil, avec un résultat au-delà de nos attentes. Tata Fatia est vraiment la meilleure de Paris, nous reviendrons sans hésiter, et avec ses copines 😉."
        },
        {
          "author_name": "STUDIO AXELLE C (“Axelle”)",
          "profile_photo_url": "https://lh3.googleusercontent.com/a-/ALV-UjU6PP9F6rtUzj-2cU9knAt7s0dE0Jlwsc0GdwpXWJItRo_H9C4=s128-c0x00000000-cc-rp-mo",
          "rating": 5,
          "relative_time_description": "il y a 2 semaines",
          "time": 1741969044,
          "text": "Tata Fatia est une femme incroyablement inspirante dans son métier. D'une bienveillance rare, elle maîtrise son art à la perfection et incarne l'excellence en tant que coach en spray tan. À chaque séance, j'en ressors avec un effet wahou ! Si vous voulez apprendre à réaliser un spray tan impeccable, il n’y a pas meilleure formatrice qu’elle. Foncez ! ✨"
        },
        {
          "author_name": "Nahema LEDARD",
          "profile_photo_url": "https://lh3.googleusercontent.com/a/ACg8ocJYulGsoy84FvkDPJJdA20cB7b6sLJEYvrhVByjz4nr_ZnPgA=s128-c0x00000000-cc-rp-mo",
          "rating": 5,
          "relative_time_description": "il y a 3 mois",
          "time": 1733728914,
          "text": "Le meilleur établissement pour faire son spray tan. 😍L'équipe est à l'écoute pour adapter votre spray tan selon vos envies. Le résultat est incroyable et très naturel. Et en plus il tient longtemps. Et l'équipe est tellement gentille notamment Tatafatia qui est un amour. Si vous êtes à la recherche d'un magnifique bronzage pour un événement important, c'est l'établissement qu'il vous faut 🤩 foncez y les yeux fermés !"
        },
        {
          "author_name": "Anne Laure",
          "profile_photo_url": "https://lh3.googleusercontent.com/a/ACg8ocKZnEuMLmMeAs6-dMNG_sTQTJfbEKT1plJ8rEyR2IP9b46YOQ=s128-c0x00000000-cc-rp-mo-ba3",
          "rating": 5,
          "relative_time_description": "il y a 6 mois",
          "time": 1726826200,
          "text": "Je fais du spray tan depuis 2 ans. Quand je suis à Paris je rends toujours visite à Tata Fatia la queen du tan Botan ! C’est toujours un plaisir d’échanger avec elle et mon tanning est toujours au top avec les produits Botan bio naturels et vegan (et marque française cocorico 🐓 !)."
        },
        {
          "author_name": "Ilhem Sediri",
          "profile_photo_url": "https://lh3.googleusercontent.com/a/ACg8ocIs8IOpdsyZjr0mSlRJM3kRLsvLhFUtx-iKmld00i0xUdKt2g=s128-c0x00000000-cc-rp-mo",
          "rating": 5,
          "relative_time_description": "il y a 2 mois",
          "time": 1736170302,
          "text": "Un spray tan parfait chez Paradis du Tan !\n\nJe tiens à partager mon expérience incroyable chez Paradis du Tan avec Tata Fatia, qui a surpassé toutes mes attentes. Je cherchais un endroit à Paris pour un spray tan naturel, et je suis ravie d’avoir trouvé cette perle rare.\n\nDès mon arrivée, Tata Fatia a su me mettre à l’aise avec sa gentillesse et son professionnalisme. Elle a pris le temps de comprendre mes attentes et m’a expliqué chaque étape du processus, ce qui est rassurant surtout si, comme moi, c’est votre première expérience de spray tan.\n\nLe résultat est absolument bluffant ! Mon teint est lumineux, uniforme, et surtout, d’un naturel parfait. On m’a même demandé si je revenais de vacances sous le soleil des tropiques ! Aucune trace, aucune démarcation, juste une peau magnifiquement hâlée."
        }
      ]
    },
    "status": "OK"
  };

  try {
    
    // TODO : Stocker puis récupération le locationID et l'API Key en base de données
    // const locationId = "ChIJLbLF2Apy5kcRj7Ph2H2iCSg";
    // const apiKey = "Recuperer sur https://console.cloud.google.com/apis/credentials?hl=fr&invt=Abt4Gw&project=spraytan-c3749";

    // const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${locationId}&fields=name,rating,reviews&key=${apiKey}`;
    const url = `https://jsonplaceholder.typicode.com/users`;

    const reponse = await fetch(url);

    if (!reponse.status) {
      throw new Error('🚨 Erreur réseau : ' + reponse.status);
    }

    // Récupération des avis
    const listeAvis = await reponse.json();
    console.info("📄 Liste des avis : ", listeAvis);

    const collection = collection(db, 'avis');

    for (const review of exempleReponse.result.reviews) {

      const element = {
        auteur: review.author_name,
        rating: review.rating,
        temps: review.relative_time_description,
        texte: review.text,
        photo: review.profile_photo_url,
        date_creation: new Date(review.time * 1000).toISOString(),
        date_recuperation: new Date().toISOString()
      };

      await addDoc(collection, element);
      console.log('🎯 Avis ajouté avec succès:', element);
    }

  } catch (error) {
    console.error('🚨 Erreur lors de l’ajout des avis :', error.message);
  }

  console.info("✅ Fin de l'alimentation des avis en base de données (Simulation)");
}

async function loadSettings() {
  try {
    const adminRef  = doc(db, 'administration', 'vUe53lHeUzvtElioOgxb');
    const adminSnap = await getDoc(adminRef);
    if (!adminSnap.exists()) return;
    const data = adminSnap.data();
    if (data.note_globale !== undefined) {
      const el = document.querySelector('.google-note');
      if (el) el.textContent = `${data.note_globale} / 5`;
    }
    if (data.nombre_avis !== undefined) {
      const el = document.querySelector('.google-compte');
      if (el) el.textContent = `${data.nombre_avis} avis`;
    }
  } catch (error) {
    console.error('Erreur lors du chargement des paramètres :', error.message);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  console.info("🚀 Lancement du site Spray Tan");
  getListeArticle();
  getListeAvis();
  loadSettings();
});
