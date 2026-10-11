# CRM Chef Mayer

CRM de prospection du **Programme Repas Entreprises** de Chef Mayer. Les entreprises de la région reçoivent une **dégustation gratuite**
au bureau, puis leurs employés commandent avec un code de rabais. Le CRM gère les listes d'entreprises, les appels, les dégustations, les
**textos et courriels automatiques** et le **relevé de royauté**.

## Ce que fait le CRM

| Écran | Pour qui | Ce qu'on y fait |
| --- | --- | --- |
| Aujourd'hui | tous | Dégustations d'aujourd'hui et de demain, rappels dus, prochaines entreprises à appeler, résultats de la semaine |
| Entreprises | tous | Recherche, filtres, fiche complète : résultat d'appel en un clic, contacts, réservation de dégustation, historique |
| Importer une liste | Tommy, Jonathan | Import CSV (Apollo, Google Sheets, Excel) avec détection des doublons |
| Dégustations | tous | À venir et passées : confirmer, reporter, annuler, marquer faite (signée → code de rabais) |
| Comptes et royauté | Tommy, Jonathan | Volumes hebdomadaires par code, palier de rabais, relevé mensuel (10 / 8 / 7 % par tranches), export CSV |
| Textos et courriels | Tommy, Jonathan | Journal de tout ce qui part, échecs, mode test |
| Scripts | tous | Script d'appel, objections, message vocal, règles |
| Équipe | Tommy | Membres, rôles, cellulaires pour les alertes |

Rôles : **admin** (Tommy), **chef** (Jonathan : voit tout et reçoit les alertes), **representant** (voit seulement ses entreprises).

### Automatisations

Les messages partent dès qu'une dégustation est réservée, puis aux 15 minutes (fonction Netlify `automatisations`).

| Quand | À qui | Canal |
| --- | --- | --- |
| À la réservation | contact de l'entreprise | texto + courriel avec les boutons « Je confirme » / « Je dois reporter » |
| À la réservation | Jonathan (s'il n'a pas réservé lui-même) | texto |
| La veille, de 10 h à 20 h | contact | texto + courriel |
| La veille à 16 h, si la dégustation n'est pas confirmée | Jonathan + la personne qui a réservé | texto |
| Le client confirme (lien ou texto « OUI ») | la personne qui a réservé | texto |
| Le client demande de reporter | Jonathan + la personne qui a réservé | texto |
| 2 h avant | contact | texto |
| Le lendemain d'une dégustation faite, de 9 h à 17 h | contact | texto + courriel avec le lien de commande et le code |

Chaque message a une clé unique au journal : il n'y a jamais de double envoi, même si un passage est relancé. Aucun texto ne part vers un
client entre 21 h et 8 h. Un texto « STOP » désabonne le contact, un texto « OUI » confirme sa prochaine dégustation. Chaque courriel
contient un lien de désabonnement (loi antipourriel).

**Mode test** : tant que `ENVOIS_REELS` n'est pas à `1`, rien ne part. Chaque message est inscrit au journal avec la mention « Mode test »,
ce qui permet de vérifier les textes et les horaires.

## Mise en route

### 1. Supabase
1. Créer un projet sur [supabase.com](https://supabase.com) (région Canada).
2. Dans SQL Editor, coller et exécuter `supabase/migrations/0001_crm_chef_mayer.sql`.
3. Dans Authentication → Users → **Add user**, créer le compte de Tommy (courriel et mot de passe).
4. Dans SQL Editor, inscrire Tommy dans l'équipe :
   ```sql
   insert into membres (email, nom, role, telephone)
   values ('courriel-de-tommy@exemple.com', 'Tommy', 'admin', '+1514XXXXXXX');
   ```
5. Ensuite, Tommy ajoute Jonathan (rôle **chef**, avec son cellulaire) et les représentants depuis l'écran **Équipe**.

### 2. Netlify
1. Créer un nouveau site à partir de ce dépôt GitHub (Netlify détecte Next.js).
2. Ajouter les variables d'environnement décrites dans `.env.exemple` : Supabase, `LIENS_SECRET`, `AUTOMATISATIONS_ACTIVES=1`, et
   `ENVOIS_REELS=0` pour commencer.
3. Déployer, se connecter, importer une première liste et réserver une dégustation test. Les messages apparaissent dans
   **Textos et courriels**, en mode test.

### 3. Textos (Telnyx)
1. Acheter un numéro local (450) et l'associer à un **Messaging Profile**.
2. Dans le Messaging Profile, mettre comme webhook entrant `https://<adresse-du-crm>/api/telnyx/entrant`.
3. Ajouter les variables `TELNYX_API_KEY`, `TELNYX_NUMERO` et `TELNYX_CLE_PUBLIQUE`.
4. Compléter l'enregistrement du numéro pour les textos d'affaires si Telnyx le demande.

### 4. Courriels
On peut démarrer avec les textos seulement : tant que `RESEND_API_KEY` et `COURRIEL_EXPEDITEUR` sont absents, les courriels restent en
mode test (inscrits au journal, pas envoyés), même avec `ENVOIS_REELS=1`. Le fournisseur n'est pas encore choisi. Le CRM est prêt pour **Resend** : faire vérifier le domaine `chefmayer.ca` chez Resend, puis
ajouter `RESEND_API_KEY`, `COURRIEL_EXPEDITEUR` et `COURRIEL_REPONSE`. Pour passer à Gmail ou Outlook, seul `lib/envoi/courriel.ts`
change.

### 5. Passer en réel
Quand Telnyx et le courriel sont configurés et que les textes vus en mode test conviennent, mettre `ENVOIS_REELS=1`, puis redéployer.

## Développement

```bash
npm install
cp .env.exemple .env.local   # remplir les variables Supabase
npm run dev
npm run lint && npm run typecheck && npm test
DATABASE_URL=postgres://… npm run test:sql   # migration et règles d'accès sur une base jetable
```

Où trouver la logique :
- `lib/automatisations/planifier.ts` : quels messages sont dus, et quand.
- `lib/automatisations/executer.ts` : envoi unique de chaque message.
- `lib/gabarits.ts` : textes des textos et des courriels.
- `lib/royaute.ts` : tranches de royauté et paliers de rabais.
- `lib/pipeline.ts` : statuts des entreprises.
- `lib/importCsv.ts` : import des listes.
