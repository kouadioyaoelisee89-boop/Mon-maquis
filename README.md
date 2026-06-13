# 🍺 Maquis Pro

Application de gestion de bar & maquis — PWA single-file, Supabase Realtime, déployable sur Vercel en 5 minutes.

---

## Stack technique

| Couche | Technologie |
|--------|-------------|
| Frontend | HTML / CSS / JS vanilla — fichier unique `index.html` |
| Sync cloud | [Supabase](https://supabase.com) (Realtime + PostgreSQL) |
| Persistance locale | `localStorage` (fallback offline) |
| PDF | jsPDF 2.5 |
| QR Code | qrcodejs 1.0 |
| Hébergement | Vercel (statique, zéro config) |

---

## Prérequis

- Un compte [GitHub](https://github.com) (gratuit)
- Un compte [Vercel](https://vercel.com) (gratuit)
- Un compte [Supabase](https://supabase.com) (gratuit — Spark plan)

---

## 1. Configurer Supabase

### 1.1 Créer un projet

1. Connectez-vous sur [app.supabase.com](https://app.supabase.com)
2. **New project** → choisissez un nom, une région proche (ex. `eu-west-1`), un mot de passe fort
3. Attendez ~2 min que le projet démarre

### 1.2 Créer les tables

Allez dans **SQL Editor** et exécutez ce script en une seule fois :

```sql
-- ── SETTINGS ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS settings (
  id               int  PRIMARY KEY DEFAULT 1,
  nom              text,
  whatsapp         text,
  tables           int  DEFAULT 10,
  heure_ouverture  text,
  heure_fermeture  text,
  jours_ouverture  text
);

-- ── MENU ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS menu (
  id          bigint PRIMARY KEY,
  emoji       text,
  nom         text   NOT NULL,
  prix        int    DEFAULT 0,
  cat         text,
  dispo       boolean DEFAULT true,
  custom      boolean DEFAULT false,
  pack_qty    int    DEFAULT 0,
  pack_prix   int    DEFAULT 0,
  description text,
  photo       text
);

-- ── STOCKS ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS stocks (
  id          bigint PRIMARY KEY,
  emoji       text,
  nom         text   NOT NULL,
  cat         text,
  qty         int    DEFAULT 0,
  seuil       int    DEFAULT 5,
  prix_achat  int    DEFAULT 0,
  prix_vente  int    DEFAULT 0
);

-- ── STOCK DU JOUR ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS stock_jour (
  id          bigint PRIMARY KEY,
  nom         text,
  emoji       text,
  prix        int    DEFAULT 0,
  qt_total    int    DEFAULT 0,
  qt_restant  int    DEFAULT 0
);

-- ── COMMANDES ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS commandes (
  id          bigint PRIMARY KEY,
  table_nom   text,
  statut      text   DEFAULT 'attente',
  heure       text,
  total       int    DEFAULT 0,
  vendeur_id  bigint,
  vendeur_nom text,
  source      text,
  qr_pending  boolean DEFAULT false,
  date        text
);

CREATE TABLE IF NOT EXISTS commande_articles (
  id          bigint PRIMARY KEY,
  commande_id bigint REFERENCES commandes(id) ON DELETE CASCADE,
  nom         text,
  qty         int    DEFAULT 1,
  prix        int    DEFAULT 0,
  retourne    boolean DEFAULT false
);

-- ── VENTES ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ventes (
  id          bigint PRIMARY KEY,
  date        text,
  heure       text,
  client      text,
  total       int    DEFAULT 0,
  vendeur_id  bigint,
  vendeur_nom text
);

-- ── INCIDENTS ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS incidents (
  id          bigint PRIMARY KEY,
  type        text,
  qte         int    DEFAULT 1,
  prix        int    DEFAULT 0,
  perte       int    DEFAULT 0,
  note        text,
  heure       text
);

-- ── TABLES MAQUIS ────────────────────────────────────
CREATE TABLE IF NOT EXISTS tables_maquis (
  nom         text   PRIMARY KEY,
  statut      text   DEFAULT 'libre',
  depuis      bigint,
  reserve_pour text
);

-- ── PROFILES (équipe) ────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id          bigint PRIMARY KEY,
  nom         text,
  login       text   UNIQUE,
  mdp         text,
  role        text   DEFAULT 'serveur'
);

-- ── RLS : accès public lecture/écriture (anon key) ───
ALTER TABLE settings          ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu               ENABLE ROW LEVEL SECURITY;
ALTER TABLE stocks             ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_jour         ENABLE ROW LEVEL SECURITY;
ALTER TABLE commandes          ENABLE ROW LEVEL SECURITY;
ALTER TABLE commande_articles  ENABLE ROW LEVEL SECURITY;
ALTER TABLE ventes             ENABLE ROW LEVEL SECURITY;
ALTER TABLE incidents          ENABLE ROW LEVEL SECURITY;
ALTER TABLE tables_maquis      ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles           ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_all" ON settings         FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON menu              FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON stocks            FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON stock_jour        FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON commandes         FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON commande_articles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON ventes            FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON incidents         FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON tables_maquis     FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON profiles          FOR ALL USING (true) WITH CHECK (true);

-- ── Realtime sur les tables critiques ────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE commandes;
ALTER PUBLICATION supabase_realtime ADD TABLE stock_jour;
ALTER PUBLICATION supabase_realtime ADD TABLE ventes;
ALTER PUBLICATION supabase_realtime ADD TABLE tables_maquis;
```

### 1.3 Récupérer vos clés

Dans **Project Settings → API** :

- **Project URL** → ex. `https://xxxxxxxxxxxx.supabase.co`
- **anon / public key** → la longue clé JWT

### 1.4 Mettre les clés dans `index.html`

Ouvrez `index.html`, trouvez les lignes ~3091 et remplacez :

```js
const _SB_URL = 'https://VOTRE_URL.supabase.co';
const _SB_KEY = 'VOTRE_ANON_KEY';
```

---

## 2. Publier sur GitHub

```bash
# 1. Créer un dossier local
mkdir maquis-pro && cd maquis-pro

# 2. Renommer le fichier en index.html
cp /chemin/vers/maquis-pro.html index.html

# 3. Initialiser git
git init
git add index.html
git commit -m "Initial commit — Maquis Pro v2.0"

# 4. Créer le dépôt sur GitHub (via l'interface web ou gh CLI)
gh repo create maquis-pro --public --source=. --push

# — OU si vous n'avez pas gh CLI —
# Créez le repo sur github.com, puis :
git remote add origin https://github.com/VOTRE_PSEUDO/maquis-pro.git
git branch -M main
git push -u origin main
```

> Le repo ne contient qu'un seul fichier `index.html`. C'est suffisant.

---

## 3. Déployer sur Vercel

### Option A — Interface web (recommandé)

1. Allez sur [vercel.com/new](https://vercel.com/new)
2. **Import Git Repository** → sélectionnez `maquis-pro`
3. Aucune configuration requise — Vercel détecte automatiquement un projet statique
4. Cliquez **Deploy**
5. En ~30 secondes vous avez une URL `https://maquis-pro-xxxx.vercel.app`

### Option B — CLI

```bash
npm i -g vercel
vercel login
vercel --prod
```

### Option C — Domaine personnalisé

Dans le dashboard Vercel → **Domains** → ajoutez votre domaine (ex. `maquispro.ci`) et suivez les instructions DNS.

---

## 4. Structure du dépôt

```
maquis-pro/
└── index.html        # Application complète (HTML + CSS + JS)
```

Pas de `package.json`, pas de build step, pas de node_modules. L'app tourne directement dans le navigateur.

---

## 5. Mise à jour

```bash
# Modifier index.html, puis :
git add index.html
git commit -m "fix: description du changement"
git push
```

Vercel redéploie automatiquement en ~20 secondes.

---

## 6. Variables d'environnement (optionnel, sécurité avancée)

Pour ne pas exposer les clés Supabase dans le code source public, vous pouvez utiliser un build step minimal :

1. Dans Vercel → **Settings → Environment Variables**, ajoutez :
   - `SUPABASE_URL` = votre URL
   - `SUPABASE_KEY` = votre anon key

2. Créez un fichier `vercel.json` à la racine :

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

3. Utilisez un script de build qui injecte les variables (ex. `sed`) — ou gardez simplement les clés dans le HTML si le repo est privé.

> **Note :** La clé `anon` Supabase est conçue pour être publique. Elle est protégée par les politiques RLS. Pas besoin de la cacher si le repo est privé.

---

## 7. Accès multi-appareils

Une fois déployé, tous les appareils accèdent à la même URL :

| Appareil | Action |
|----------|--------|
| Téléphone du gérant | Ouvre `https://maquis-pro.vercel.app` |
| Téléphone serveur | Même URL, login avec son compte |
| Tablette caisse | Même URL |
| Client (QR) | URL générée automatiquement par l'app (`?table=Table3&bar=...`) |

La sync Realtime Supabase propage chaque commande/vente/stock en temps réel sur tous les appareils connectés. L'icône ☁️ dans le header s'anime (pluie 🌨️) à chaque envoi.

---

## 8. Installation comme application (PWA)

Sur Android (Chrome) :
1. Ouvrez l'URL dans Chrome
2. Menu ⋮ → **Ajouter à l'écran d'accueil**
3. L'app s'installe comme une appli native, sans passer par le Play Store

Sur iOS (Safari) :
1. Ouvrez l'URL dans Safari
2. Bouton Partager → **Sur l'écran d'accueil**

---

## 9. Rôles et permissions

| Rôle | Accès |
|------|-------|
| **Gérant(e)** | Tout — paramètres, équipe, rapports, stocks, menu |
| **Manager** | Commandes, ventes, stocks, rapports (pas équipe) |
| **Serveur / Serveuse** | Commandes (les siennes), ventes, QR codes tables |

---

## 10. Limites Supabase Spark (gratuit)

| Ressource | Limite |
|-----------|--------|
| Base de données | 500 MB |
| Realtime | 200 connexions simultanées |
| Bande passante | 5 GB / mois |
| Requêtes API | Illimitées |

Suffisant pour un maquis avec 5–10 serveurs actifs simultanément.

---

## Auteur

**Blessing KOUADIO** — Côte d'Ivoire  
Maquis Pro v2.0 · Built for the West African market 🌍
