# Vérifications — 15 septembre 2026

## Qualité du code

- TypeScript : `npx tsc --noEmit` réussi.
- ESLint : réussi sur le code source ; les sorties de build sont exclues.
- Build Vinext : réussi, avec les routes `/`, `/api/session`, `/api/child` et `/api/chat`.
- Passerelle : 4 tests réussis sur les SELECT bornés, le périmètre parent/année/inscription, le refus de requêtes libres et le refus des identités non mappées.
- Sécurité HTTP réelle : 401 sans jeton et 405 sur une tentative POST vers la passerelle.

## Azure SQL réel

Le pilote relie le faux login parent au dossier d’Aamar, actif en CE5-C en 2026/2027. La passerelle confirme un parcours continu de sept années, dont CE2-B en 2023/2024 et CE3-B en 2024/2025. Elle renvoie une absence en français le 14 septembre 2026, enregistrée comme non justifiée sans motif textuel, ainsi qu’aucune observation pédagogique, aucun message et aucun devoir récent.

Les calculs indicatifs validés sont 16,23/20 sur 49 notes en 2023/2024 et 13,8/20 sur 50 notes en 2024/2025. Les quatre comparaisons de matière sont : mathématiques 12,4 → 18,25 ; français 16,93 → 13,45 ; arabe 15,95 → 14,28 ; anglais 20 → 13,19. Les quatre périodes sont 15,63 puis 16,77 en 2023/2024 et 13,28 puis 14,33 en 2024/2025. Aucune note hors barème n’entre dans ces deux synthèses.

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

Le correctif 503 ajoute trois tentatives réelles par appel pour les erreurs 429, 5xx, réseau et délai, le routage OpenRouter par latence avec repli compatible, le plugin officiel Response Healing et jusqu’à deux corrections lorsque le contrat métier ou l’ancrage factuel reste invalide. Le cas non déterministe qui associait 2024/2025 à une mauvaise classe et omettait les moyennes est désormais rejeté avant affichage. Un faux positif qui rejetait « je ne peux pas affirmer qu’il n’y a pas de résultats » comme si Alexandre affirmait une absence de résultats est couvert par un test de régression. Aucun texte de secours local n’est affiché comme réponse IA.

Le contrat navigateur accepte désormais les recommandations parent jusqu’à la même limite de 220 caractères que le serveur. Les réponses ne sont plus perdues après un HTTP 200. Les libellés internes et les dates SQL sont normalisés avant affichage : `OBSERVED AT`, `NOT RECORDED`, `FRANCAIS` et `2026-09-14` deviennent une formulation naturelle. La session locale de présentation dure huit heures afin d’éviter une reconnexion pendant la démonstration.

## Navigateur et mobile

Le parcours a été rejoué dans le navigateur local : Parent ouvre Alexandre, Élève ouvre Milo, puis Parent ouvre à nouveau Alexandre. La course entre la reprise d’ancienne session et le clic utilisateur est corrigée.

À l’entrée Milo, la page active est vide, le crayon est déjà sélectionné et une consigne courte indique où dessiner. Le carnet affichait les anciennes pages et permettait d’y revenir. Sur une page existante, Milo a reconnu les traits violets de l’enfant et la page est restée à 8/8 avec ses 2 traits après la réponse. À 390 × 844, les espaces Milo et Alexandre n’avaient aucun débordement horizontal. La fiche parent affichait les valeurs SQL réelles, l’avatar en djellaba et casquette, les états vides honnêtes et une conversation naturelle. Une question de résultats a ouvert « Résultats et tendances » ; la question d’absence suivante a ouvert « Présence » avec date, matière et statut. Le basculement arabe a produit `lang=ar` et `dir=rtl`. Aucun avertissement ni erreur n’était présent dans la console après le parcours final.

## Limite du pilote

Le compte SQL fourni possède des droits administratifs ; l’application n’expose pourtant aucune capacité d’écriture. Cette exception est acceptable uniquement sur le poste local demandé. Avant tout déploiement, un compte SQL limité à `SELECT` et une authentification familiale réelle sont obligatoires. Aucun déploiement n’a été effectué.
