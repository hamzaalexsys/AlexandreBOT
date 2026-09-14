# AlexandreBOT

Plateforme locale bilingue du Groupe scolaire Alexandre pour les 6–12 ans. **Milo** explique, dessine et construit des expériences SVG interactives. **Alexandre** aide le parent à comprendre le dossier d’un élève pilote lu en temps réel dans Azure SQL.

## Démarrer le pilote local

Node.js 22.13 ou supérieur est requis. Les fichiers `.env` sont locaux et ignorés par Git.

Dans un premier terminal :

```powershell
npm.cmd --prefix services/school-gateway ci
npm.cmd run gateway
```

Dans un second terminal :

```powershell
npm.cmd ci
npm.cmd run dev
```

Ouvrir `http://localhost:5173`. Aucun déploiement n’est nécessaire ni prévu pour ce pilote.

La configuration web attend `SESSION_SECRET`, `OPENROUTER_API_KEY`, `OPENROUTER_MODEL=deepseek/deepseek-v4.1-flash`, `SCHOOL_GATEWAY_URL`, `SCHOOL_GATEWAY_TOKEN` et `PILOT_ENROLLMENT_ID`. La passerelle attend la connexion SQL, le même jeton de service et un mapping serveur `pilot-parent` vers le parent autorisé. Les secrets ne sont jamais exposés au navigateur.

## Parcours à présenter

1. Choisir **Je suis élève**. Une nouvelle page vide s’ouvre ; les anciennes pages restent dans le carnet.
2. Demander à Milo : « Montre-moi pourquoi un ballon rebondit et sa trajectoire. » Modifier ensuite la hauteur, Terre/Lune, puis revenir à une ancienne page.
3. Demander un dessin libre animé, toucher une figure et dessiner au doigt. Dès qu’un trait existe, la question suivante transmet automatiquement une capture du tableau à Milo ; **Expliquer mon dessin** permet aussi de l’interroger directement. Une photo d’exercice peut être expliquée par le modèle vision.
4. Passer en arabe : l’interface devient RTL et les nouvelles réponses sont en arabe.
5. Changer d’espace et choisir **Je suis parent**. Le clic reste dans l’espace Alexandre.
6. Consulter la fiche réelle d’Aamar en lecture seule, puis demander une comparaison 2023/2024–2024/2025, son parcours, son absence actuelle ou des pistes pour préparer un échange avec l’enseignant. La fiche de gauche suit le sujet de la conversation.

Le login est volontairement faux pour la présentation locale. La session parent contient un périmètre pilote signé côté serveur ; elle ne prend aucun identifiant dans le chat ou l’URL.

## Garanties de lecture seule

L’agent ne possède aucun outil d’écriture. La passerelle accepte uniquement `GET`, choisit parmi neuf chaînes `SELECT` paramétrées et bornées, et revérifie la relation parent–inscription–année courante dans chaque lecture. Elle refuse une requête sans jeton, un sujet non mappé, un identifiant hors périmètre et toute méthode d’écriture. Aucune migration n’est exécutée dans la base scolaire.

Le compte fourni pour ce pilote possède des capacités administratives. Le drapeau local `ALLOW_WRITE_CAPABLE_READONLY_TEST=true` autorise uniquement le démarrage de cette démonstration ; il n’ajoute aucune requête d’écriture à l’application. Avant tout usage hors poste local, créer un principal SQL limité à `SELECT` et retirer ce drapeau.

## Vérifier

```powershell
npx.cmd tsc --noEmit
npm.cmd run lint
npm.cmd run check:core
npm.cmd run gateway:test
npm.cmd run build
npm.cmd run check:api
npm.cmd run check:board
npm.cmd run check:parent
npm.cmd run check:vision
npm.cmd run check:drawing
```

Les cinq derniers contrôles utilisent de vrais appels OpenRouter et, pour Alexandre, de vraies lectures SQL. `check:parent` pose 15 questions de présentation et compare les réponses aux faits Azure attendus. `check:drawing` vérifie qu’une équation manuscrite est lue, résolue sur la page courante et ensuite décrite sans mutation.

## Documentation

- [Architecture complète](docs/ARCHITECTURE.md)
- [Exploitation locale](docs/OPERATIONS.md)
- [Vérifications](docs/VERIFICATION.md)
- [Scénario de présentation](docs/DEMO.md)
- [Métadonnées SQL](docs/school-schema.json), [relations](docs/school-relations.json), [définitions de vues](docs/school-view-definitions.json)
