# Application de gestion de tickets pour un bal

Application web complète avec backend Node.js/Express, architecture en couches, base de données Supabase/PostgreSQL, génération automatique de tickets uniques et QR codes.

## Fonctionnalités

- Enregistrement de participants : nom, téléphone, email optionnel
- Génération automatique d'un code ticket unique
- Génération d'un QR code pour chaque ticket
- Page ticket imprimable / téléchargeable
- Tableau admin avec liste des tickets
- Contrôle d'entrée par scan QR ou saisie manuelle
- Statut de ticket : `active` ou `used`
- Journalisation (Logging) avec Pino
- Arrêt en douceur (Graceful shutdown)

## Architecture Réelle

Le projet suit une architecture en couches où le frontend et le backend sont servis par la même application Node.js :

```text
Client (Navigateur)
  -> Fichiers Statiques (public/)
  -> Routes (routes/) -> Middleware (middleware/)
  -> Controllers (controllers/)
  -> Services (services/)
  -> Repositories (repositories/)
  -> Supabase (PostgreSQL)
```

- `public/` : Interface utilisateur (HTML, CSS et JavaScript frontend)
- `routes/` : Définition des endpoints de l'API
- `controllers/` : Reçoit les requêtes HTTP et renvoie les réponses
- `services/` : Logique métier (génération de ticket, QR code, validation)
- `repositories/` : Accès aux données (interactions avec Supabase)
- `middleware/` : Validation, gestion des erreurs, rate limiting et protection admin
- `utils/` : Fonctions techniques réutilisables (logger, hashage, etc.)

## Variables d'environnement (.env)

Copiez le fichier `.env.example` vers `.env` et ajustez les variables suivantes :

```env
# Configuration de l'application
PORT=3000
APP_BASE_URL=http://localhost:3000
EVENT_PREFIX=BAL-2026

# Configuration Supabase
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
SUPABASE_SERVICE_ROLE_KEY=sb_service_role_...

# Authentification Admin
ADMIN_USERNAME=admin
ADMIN_PASSWORD_HASH=$2b$12$... # Hash bcrypt de votre mot de passe
JWT_SECRET=votre-secret-tres-long-et-aleatoire
JWT_EXPIRES_IN=8h
```

Le mot de passe n'est pas stocké en clair, seul son hash bcrypt est conservé dans `.env`. La session admin utilise un cookie HTTP-only signé par JWT.

Pour générer le hash d'un mot de passe (par exemple `admin123`), vous pouvez utiliser Node.js dans votre terminal :

```bash
node
```
Puis, exécutez la commande suivante :
```javascript
require('bcrypt').hashSync('admin123', 10)
```
Copiez le résultat généré et collez-le dans votre fichier `.env` pour la variable `ADMIN_PASSWORD_HASH`.
## Commandes

- **Installation des dépendances** : 
  ```bash
  npm install
  ```
- **Lancer l'application en développement** (rechargement automatique, nécessite nodemon si configuré) :
  ```bash
  npm run dev
  ```
- **Lancer l'application en production** :
  ```bash
  node server.js
  # ou npm start
  ```

## Structure du Dossier

```text
1-objectif-du-syst-me-cr/
  ├── public/                  # Fichiers frontend
  │   ├── index.html
  │   ├── ticket.html
  │   ├── admin.html
  │   ├── scan.html
  │   ├── login.html
  │   └── assets/
  │       ├── app.js
  │       └── styles.css
  ├── config/                  # Configuration (ex: base de données)
  ├── controllers/             # Contrôleurs API
  ├── database/                # Scripts SQL
  ├── middleware/              # Middlewares Express (erreurs, auth)
  ├── repositories/            # Accès base de données
  ├── routes/                  # Routage de l'API
  ├── services/                # Logique métier (QR codes, tickets)
  ├── utils/                   # Utilitaires (logger, générateurs)
  ├── .env.example             # Exemple de variables d'environnement
  ├── package.json             # Dépendances et scripts
  └── server.js                # Point d'entrée de l'application
```

## Configuration Supabase (Setup)

1. Créez un projet sur [Supabase](https://supabase.com).
2. Allez dans le **SQL Editor** de votre tableau de bord Supabase.
3. Copiez et exécutez le contenu du fichier `database/supabase-schema.sql` pour créer les tables nécessaires.
4. Récupérez vos clés d'API (URL, `anon` public key et `service_role` key) dans **Project Settings > API**.
5. Mettez à jour ces clés dans votre fichier `.env`.

## Déploiement

L'application peut être déployée facilement sur des plateformes comme Render, Railway ou Heroku :

1. **Environnement Node.js** : Assurez-vous que la plateforme utilise Node.js.
2. **Variables d'environnement** : Configurez toutes les variables du `.env` directement dans les paramètres de la plateforme d'hébergement.
3. **Commande de démarrage** : Spécifiez `node server.js` ou `npm start` comme commande de lancement.
4. **HTTPS** : En production, l'accès à la caméra pour le scan QR nécessite un contexte sécurisé (HTTPS). Assurez-vous que votre application est servie en HTTPS, ce qui est généralement géré automatiquement par les plateformes de déploiement cloud.
