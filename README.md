Modifier le code : 

1. Ouvrir GitHub CodeSpace et faire les modification
2. Dans 'Contrôle de code source' ajouter le message du Commit
3. Cliquer sur la petite fleche puis selectionner l'option 'Validation et Envoi (Push)'
4. Le déploiement devrait se faire automatiquement*
5. Checker le site https://spraytan.paris/

Nommage Commit : 
v2.1 : Description modification

Pour lancer l'api : 
node /workspaces/spraytan.paris/api.js

Pour mettre à jour la base de données : 
Il faut modifier le fichier schema.sql et lancver la commande suivante : 
sqlite3 /workspaces/spraytan.paris/bdd/database.sqlite < /workspaces/spraytan.paris/bdd/schema.sql