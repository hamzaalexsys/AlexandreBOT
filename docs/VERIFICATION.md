# Vérifications — 15 septembre 2026

## Qualité du code

- TypeScript : `npx tsc --noEmit` réussi.
- ESLint : réussi sur le code source ; les sorties de build sont exclues.
- Build Vinext : réussi, avec les routes `/`, `/api/session`, `/api/child` et `/api/chat`.
- Passerelle : 4 tests réussis sur les SELECT bornés, le périmètre parent/année/inscription, le refus de requêtes libres et le refus des identités non mappées.
- Sécurité HTTP réelle : 401 sans jeton et 405 sur une tentative POST vers la passerelle.

## Azure SQL réel

Le pilote relie le faux login parent au dossier d'Aamar, actif en CE5-C en 2026/2027. Toutes les lectures sont limitees a cette inscription active et a cette annee scolaire. Elles renvoient notamment les absences enregistrees cette annee, sans consulter les annees precedentes.

Les calculs indicatifs sont produits uniquement a partir des notes valides de l'annee scolaire active et sont ramenes sur 20. Aucune note hors bareme ni aucune note d'une annee precedente n'entre dans ces syntheses.

Aucun `INSERT`, `UPDATE`, `DELETE`, `MERGE`, DDL, changement d’utilisateur ou changement de permission n’a été exécuté. Toutes les lectures applicatives passent par les requêtes fixes de `services/school-gateway/queries.mjs`.

## Appels réels OpenRouter

| Parcours Milo | Résultat |
| --- | --- |
| Bonjour | Réponse OpenRouter, `keep`, aucun outil |
| Ballon et trajectoire | Nouvelle simulation interactive |
| Labo RGB | Appel ciblé de `create_interactive_concept_lab`, trois curseurs et couleur recalculée |
| Fabrique des formes | Polygone passé de 5 à 8 côtés, huit sommets tactiles |
| Droite numérique | Saut positif puis négatif, égalité et position recalculées |
| Équation `2x + 4 = 10` | Appel de `solve_linear_equation`, huit formes et solution vérifiée `x = 3` |
| Question ordinaire | Réponse OpenRouter sans appel d’outil |
| Hauteur à 5 m | Mise à jour de la même scène |
| Plante et soleil | Dessin libre animé de dix objets |
| Question arabe | Réponse arabe, tableau conservé |
| Image de formes | Rond orange et carré bleu reconnus, tableau conservé |
| Équation enfant `x + 1 = 0` | Traits violets reconnus, solution `x = −1` ajoutée à la page courante |
| « J’ai dessiné quoi ? » | Description des traits de l’enfant, `keep`, aucune nouvelle page |
| « Montre-moi dans le tableau » en mathématiques, français et arabe | Action `new` ou `update`, jamais `keep`, avec au moins quatre objets visibles |

Alexandre a répondu à 15 questions automatiquement comparées aux valeurs SQL : parcours, comparaison annuelle, bilan global, forces, progression par matière, baisse et nuance, semestres, français, taille des échantillons, absence, motif manquant, résumé pour l’enseignant, questions à poser, actions à la maison et données manquantes. Les 15 réponses avaient `source=openrouter`, une scène parent nulle et les neuf lectures autorisées. Elles concordaient avec Azure SQL.

Le correctif 503 ajoute trois tentatives reelles par appel pour les erreurs 429, 5xx, reseau et delai, le routage OpenRouter par latence avec repli compatible, le plugin officiel Response Healing et jusqu'a deux corrections lorsque le contrat metier ou l'ancrage factuel reste invalide. Toute reponse qui cite une autre annee scolaire est rejetee avant affichage. Aucun texte de secours local n'est affiche comme reponse IA.

Le contrat navigateur accepte désormais les recommandations parent jusqu’à la même limite de 220 caractères que le serveur. Les réponses ne sont plus perdues après un HTTP 200. Les libellés internes et les dates SQL sont normalisés avant affichage : `OBSERVED AT`, `NOT RECORDED`, `FRANCAIS` et `2026-09-14` deviennent une formulation naturelle. La session locale de présentation dure huit heures afin d’éviter une reconnexion pendant la démonstration.

## Navigateur et mobile

Le parcours a été rejoué dans le navigateur local : Parent ouvre Alexandre, Élève ouvre Milo, puis Parent ouvre à nouveau Alexandre. La course entre la reprise d’ancienne session et le clic utilisateur est corrigée.

À l’entrée Milo, la page active est vide, le crayon est déjà sélectionné et une consigne courte indique où dessiner. Le carnet affichait les anciennes pages et permettait d’y revenir. Sur une page existante, Milo a reconnu les traits violets de l’enfant et la page est restée à 8/8 avec ses 2 traits après la réponse. À 390 × 844, les espaces Milo et Alexandre n’avaient aucun débordement horizontal. La fiche parent affichait les valeurs SQL réelles, l’avatar en djellaba et casquette, les états vides honnêtes et une conversation naturelle. Une question de résultats a ouvert « Résultats et tendances » ; la question d’absence suivante a ouvert « Présence » avec date, matière et statut. Le basculement arabe a produit `lang=ar` et `dir=rtl`. Aucun avertissement ni erreur n’était présent dans la console après le parcours final.

## Conversation vocale — 23 septembre 2026

`check:voice` passe : WAV 16 kHz, conservation des échantillons, capture AudioWorklet et vidage de la dernière portion, absence d’envoi sur silence, Stop répété, deux transcriptions concurrentes au maximum, ordre des phrases malgré des réponses réseau inversées, reprise d’une portion échouée, annulation, lecture PCM avec octets fragmentés, session et origine des routes, format Safari `m4a` et rejet des entrées invalides avant appel fournisseur.

Essais réels OpenRouter via les routes locales :

| Mesure | Résultat observé |
| --- | --- |
| Transcription française, audio synthétique de 6,55 s | 1,84 s ; « Hamza » et « Fahd » corrects |
| Transcription arabe, audio synthétique de 6,39 s | 0,88 s ; « حمزة » et « فهد » corrects |
| Premiers octets TTS français / arabe | 1,73 s / 0,50 s |
| Question vocale française → réponse scolaire parent | réponse OpenRouter en 6,84 s après transcription, lectures scolaires exécutées |
| Réponse scolaire → premiers octets de la voix | 0,46 s |

Comparaison préalable sur un même audio synthétique : `gpt-4o-transcribe` a reconnu « Fahd » en 1,05 s ; l’ancien `whisper-large-v3-turbo` a écrit « Fad » en 2,93 s. Ce sont des mesures ponctuelles, pas une garantie de latence ni une évaluation d’accents réels. La transcription commence aux pauses de parole ; une phrase continue reste à finaliser après Stop. Le temps de génération de la réponse scolaire est distinct de la transcription.

Aucun essai avec un micro humain ni écoute subjective des haut-parleurs n’a été réalisé lors de ce changement. Avant la présentation, vérifier le parcours Dicter → Stop → envoi automatique → réponse parlée avec le navigateur, le micro et le réseau de la salle. La reconnaissance des prénoms est guidée par le contexte, sans correction forcée des mots.

## Limite du pilote

### Incident local de la passerelle — 23 septembre 2026

La question parent « Est-ce que tu peux me parler de mon enfant Fahd? » renvoyait `503 AI_UNAVAILABLE` quand le site tournait seul et que la passerelle SQL sur `127.0.0.1:8788` était arrêtée. Reproduction avant correctif : `/api/child` renvoyait un 500 sans corps ; `/api/chat` renvoyait `503 AI_UNAVAILABLE`. La même session et la même question ont répondu `200` une fois la passerelle relancée. Le fournisseur OpenRouter n’était pas la cause.

`npm run dev` lance désormais la passerelle locale si elle est absente, puis le site. Les deux processus ont été redémarrés sous ce lanceur ; la même question a répondu `200` en 4,45 s. Si la passerelle est momentanément indisponible, les routes parent renvoient `503 SCHOOL_UNAVAILABLE` avec un corps JSON et le chat indique clairement que les informations scolaires sont indisponibles, avec reprise de la question possible. Le test hors réseau reproduit cette panne.

Le compte SQL fourni possède des droits administratifs ; l’application n’expose pourtant aucune capacité d’écriture. Cette exception est acceptable uniquement sur le poste local demandé. Avant tout déploiement, un compte SQL limité à `SELECT` et une authentification familiale réelle sont obligatoires. Aucun déploiement n’a été effectué.
