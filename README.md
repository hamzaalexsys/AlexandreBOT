# AlexandreBOT

Plateforme locale bilingue du Groupe scolaire Alexandre pour les 6–12 ans. **Milo** explique, dessine et construit des expériences SVG interactives. **Alexandre** aide le parent à comprendre le dossier d’un élève pilote lu en temps réel dans Azure SQL.

## Démarrer le pilote local

Node.js 22.13 ou supérieur est requis. Les fichiers `.env` sont locaux et ignorés par Git.

Installer les dépendances une fois :

```powershell
npm.cmd --prefix services/school-gateway ci
npm.cmd ci
```

Puis lancer le pilote dans un terminal :

```powershell
npm.cmd run dev
```

`npm run dev` démarre la passerelle scolaire locale si elle ne tourne pas déjà, puis le site. Ouvrir `http://localhost:5173`. Aucun déploiement n’est nécessaire ni prévu pour ce pilote. Pour utiliser la passerelle seule, `npm run gateway` reste disponible.

La configuration web attend `SESSION_SECRET`, `OPENROUTER_API_KEY`, `OPENROUTER_MODEL=deepseek/deepseek-v4.1-flash`, `SCHOOL_GATEWAY_URL`, `SCHOOL_GATEWAY_TOKEN` et `PILOT_ENROLLMENT_ID`. La passerelle attend la connexion SQL, le même jeton de service et un mapping serveur `pilot-parent` vers le parent autorisé. Les secrets ne sont jamais exposés au navigateur.

## Conversation vocale

La conversation s'ouvre directement en mode vocal, sur ordinateur et sur mobile. Cliquer **Parler**, attendre l'ouverture du micro, poser sa question, puis cliquer **Stop** : la question est envoyée automatiquement. Les phrases sont transcrites pendant les pauses ; au Stop, seule la fin encore en cours attend sa transcription. Une dictée dure au maximum 60 secondes. En cas d'échec réseau, **Réessayer l'envoi** réutilise les portions échouées gardées en mémoire ; aucun message incomplet n'est envoyé.

La réponse est lue automatiquement. Cliquer **Parler** pendant que l'avatar répond coupe immédiatement sa voix et ouvre le micro pour une nouvelle question. La voix arrive en flux audio, sans attendre la génération complète. Une nouvelle conversation ou un changement de langue arrête les requêtes audio en cours.

Les valeurs par défaut sont `openai/gpt-4o-transcribe` pour la reconnaissance et `x-ai/grok-voice-tts-1.0`, voix `sal`, pour la synthèse française/arabe. Elles utilisent la clé OpenRouter existante. `OPENROUTER_VOICE_VOCABULARY` peut ajouter les prénoms et termes propres à l'école au contexte de reconnaissance. Ce sont des indications, jamais une substitution forcée dans le texte. Le lecteur attend du PCM mono 24 kHz ; un autre modèle TTS doit prendre en charge ce format. Les valeurs configurables sont documentées dans `.env.example`.

Le micro nécessite un navigateur récent avec AudioWorklet, sur localhost ou HTTPS. La reconnaissance des accents et du bruit ambiant reste à vérifier sur le micro de présentation. La latence réseau et le temps de réponse de l’agent scolaire s’ajoutent à la transcription.

## Parcours à présenter

1. Choisir **Je suis élève**. Une nouvelle page vide s’ouvre ; les anciennes pages restent dans le carnet.
2. Ouvrir un des **Labos magiques de Milo** : mélanger les lumières RGB, construire un polygone ou faire bondir Milo sur une droite numérique. Les curseurs et animations réagissent immédiatement.
3. Demander à Milo : « Montre-moi pourquoi un ballon rebondit et sa trajectoire. » Modifier ensuite la hauteur, Terre/Lune, puis revenir à une ancienne page.
4. Demander un dessin libre animé, toucher une figure et dessiner au doigt. Dès qu'un trait existe, la question suivante transmet automatiquement une capture du tableau à Milo ; **Expliquer mon dessin** permet aussi de l'interroger directement. Une équation concrète est transmise au solveur vérifié.
5. Passer en arabe : l’interface devient RTL et les nouvelles réponses sont en arabe.
6. Changer d’espace et choisir **Je suis parent**. Le clic reste dans l’espace Alexandre.
7. Consulter la fiche reelle d'Aamar en lecture seule, puis demander ses resultats, sa classe ou son absence pour l'annee scolaire en cours. Les annees precedentes ne sont pas accessibles. La fiche de gauche suit le sujet de la conversation.

Le login est volontairement faux pour la présentation locale. La session parent contient un périmètre pilote signé côté serveur ; elle ne prend aucun identifiant dans le chat ou l’URL.

## Garanties de lecture seule

L’agent ne possède aucun outil d’écriture. La passerelle accepte uniquement `GET`, choisit parmi neuf chaînes `SELECT` paramétrées et bornées, et revérifie la relation parent–inscription–année courante dans chaque lecture. Elle refuse une requête sans jeton, un sujet non mappé, un identifiant hors périmètre et toute méthode d’écriture. Aucune migration n’est exécutée dans la base scolaire.

Le compte fourni pour ce pilote possède des capacités administratives. Le drapeau local `ALLOW_WRITE_CAPABLE_READONLY_TEST=true` autorise uniquement le démarrage de cette démonstration ; il n’ajoute aucune requête d’écriture à l’application. Avant tout usage hors poste local, créer un principal SQL limité à `SELECT` et retirer ce drapeau.

## Vérifier

```powershell
npx.cmd tsc --noEmit
npm.cmd run lint
npm.cmd run check:core
npm.cmd run check:voice
npm.cmd run gateway:test
npm.cmd run build
npm.cmd run check:api
npm.cmd run check:board
npm.cmd run check:parent
npm.cmd run check:vision
npm.cmd run check:drawing
npm.cmd run check:labs
npm.cmd run check:voice:live
npm.cmd run check:voice:live -- --parent
```

`check:voice` vérifie hors réseau la capture, la fin d’enregistrement, l’ordre des phrases, les annulations, les reprises, le flux PCM et les protections des routes. `check:voice:live` utilise de vrais appels OpenRouter : synthèse puis transcription en français/arabe avec Fahd et Hamza. L’option `--parent` vérifie aussi la question transcrite → réponse scolaire → premiers octets de la voix.

Les contrôles de conversation utilisent de vrais appels OpenRouter et, pour Alexandre, de vraies lectures SQL. `check:parent` pose 15 questions de présentation et compare les réponses aux faits Azure attendus. `check:drawing` vérifie qu’une équation manuscrite est lue, résolue sur la page courante et ensuite décrite sans mutation. `check:labs` force les trois nouveaux parcours d’outil, une équation vérifiée, une demande arabe et une conversation ordinaire qui ne doit appeler aucun outil.

## Documentation

- [Architecture complète](docs/ARCHITECTURE.md)
- [Exploitation locale](docs/OPERATIONS.md)
- [Vérifications](docs/VERIFICATION.md)
- [Scénario de présentation](docs/DEMO.md)
- [Métadonnées SQL](docs/school-schema.json), [relations](docs/school-relations.json), [définitions de vues](docs/school-view-definitions.json)
