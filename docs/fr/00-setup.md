# Installation et premier démarrage

Ce guide vous accompagne pas à pas pour cloner le dépôt, démarrer le backend,
installer le frontend et ouvrir l'application dans votre navigateur. Suivez
chaque section dans l'ordre lors de la première installation.

---

## Prérequis

Installez ces outils avant de commencer :

| Outil | Version | Pourquoi |
|---|---|---|
| Node.js | 22 LTS | Requis par Angular CLI et npm |
| Angular CLI | 21 | Génère les composants, services et autres fichiers |
| Java | 21 | Requis pour démarrer le backend Spring Boot |
| Maven | 3.9+ | Compile et démarre le backend Spring Boot |
| Git | toute version récente | Clone les dépôts |
| Docker Desktop | toute version récente | Optionnel : lancer l'app dans un conteneur |

Vérifiez vos versions :

```bash
node -v        # doit afficher v22.x.x
ng version     # doit afficher Angular CLI 21.x.x
java -version  # doit afficher 21.x.x
mvn -v         # doit afficher 3.9.x
```

---

## 1. Démarrer le backend

L'application Angular appelle un seul backend Spring Boot :
[`spring-boot-tutorial`](https://github.com/EdgarEldy/spring-boot-tutorial).
Il possède tous les endpoints : authentification, utilisateurs, rôles, permissions,
catégories, produits, clients et commandes, tous sous `/api/v1`.

```bash
# Dans un terminal séparé, clonez et démarrez le backend
git clone https://github.com/EdgarEldy/spring-boot-tutorial.git
cd spring-boot-tutorial
./mvnw spring-boot:run
```

Attendez d'apercevoir `Started ... in X seconds`. Le backend écoute sur le port
**8080**. Vérifiez qu'il est opérationnel :

```bash
curl http://localhost:8080/api/v1/categories
# Doit retourner {"success":true,...}
```

> **Activation par email :** le backend envoie un email de confirmation à
> l'inscription. Par défaut il utilise les paramètres SMTP dans son
> `application.yml`. Consultez le README du backend pour configurer un serveur
> mail local (par ex. MailHog) afin de pouvoir cliquer les liens d'activation
> sans vrai fournisseur email.

---

## 2. Cloner et installer le frontend

```bash
git clone https://github.com/EdgarEldy/angular-tutorial.git
cd angular-tutorial
npm install
```

---

## 3. Démarrer le serveur de développement

```bash
npm start
```

Angular CLI compile l'application et active le proxy. Ouvrez
[http://localhost:4200](http://localhost:4200) dans votre navigateur.

Le proxy de développement (`proxy.conf.json`) redirige toutes les requêtes dont
le chemin commence par `/api/v1` vers `http://localhost:8080`. L'application
Angular ne parle donc jamais directement au backend par son hôte : elle utilise
toujours le chemin relatif `/api/v1`, qui fonctionne de manière identique en
développement (proxié par le CLI) et en production (proxié par nginx).

---

## 4. Créer votre premier compte

1. Cliquez **Register** sur la page de connexion.
2. Renseignez votre nom, email et un mot de passe d'au moins 8 caractères.
3. Validez. Le backend crée un compte désactivé et vous envoie un email
   d'activation.
4. Ouvrez le lien d'activation (depuis votre serveur mail ou MailHog à
   `http://localhost:8025`).
5. Votre compte est maintenant actif. Allez sur
   [http://localhost:4200/login](http://localhost:4200/login) et connectez-vous.

Le premier compte admin doit être créé directement en base de données ou initialisé
par le backend (voir son README). L'inscription ordinaire crée un utilisateur sans
rôle admin.

---

## 5. Scripts npm

| Script | Commande | Ce qu'il fait |
|---|---|---|
| Serveur de dev | `npm start` | Lance `ng serve` avec le proxy API |
| Build de production | `npm run build` | Compile dans `dist/angular-tutorial/browser/` |
| Tests | `npm test` | Exécute la suite Vitest avec `ng test` |
| Lint | `npm run lint` | Lance angular-eslint |

---

## 6. Comment fonctionne le proxy de développement

`proxy.conf.json` contient une entrée :

```json
{
  "/api/v1": {
    "target": "http://localhost:8080",
    "secure": false,
    "changeOrigin": true
  }
}
```

Quand `ng serve` reçoit une requête pour `/api/v1/categories`, il la redirige vers
`http://localhost:8080/api/v1/categories`. Le navigateur ne voit que l'origine
Angular (`http://localhost:4200`), il n'y a donc aucun problème CORS en
développement. Le proxy est câblé dans `angular.json` sous
`projects.angular-tutorial.architect.serve.options`.

---

## 7. Exécuter avec Docker (mode production)

Construire et lancer l'image de production :

```bash
docker build -t angular-tutorial .
docker run -p 4200:80 angular-tutorial
```

Le Dockerfile utilise un build en deux étapes : l'étape 1 compile l'application
Angular avec Node ; l'étape 2 sert les fichiers statiques avec nginx. La
configuration nginx dans `nginx.conf` proxifie `/api/v1` vers
`host.docker.internal:8080` pour que le conteneur puisse atteindre le backend
tournant sur la machine hôte.

Vous pouvez aussi utiliser `docker-compose.yml` pour démarrer le conteneur :

```bash
docker compose up --build
```

---

## 8. Résolution des problèmes courants

| Problème | Cause probable | Solution |
|---|---|---|
| `npm start` échoue avec le port 4200 occupé | Un autre processus est sur le port 4200 | Terminez-le ou utilisez `ng serve --port 4201` |
| Les appels API retournent 502 Bad Gateway | Le backend ne tourne pas | Démarrez `spring-boot-tutorial` en premier |
| Erreur "Cannot activate account" | Le token d'activation est expiré | Réinscrivez-vous ou augmentez le TTL dans la config backend |
| `npm install` échoue avec une erreur peer-dep | Version de Node incorrecte | Utilisez Node 22 LTS |
| Erreurs de lint après `npm install` | Incompatibilité de config eslint | Exécutez `npm run lint` et corrigez les erreurs signalées |
