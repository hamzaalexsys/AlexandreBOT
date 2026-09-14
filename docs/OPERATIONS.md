# Exploitation locale

## Processus

AlexandreBOT reste sur le poste local. Deux processus sont nécessaires :

```powershell
# Terminal 1 : passerelle SQL sur 127.0.0.1:8788
npm.cmd run gateway

# Terminal 2 : application web sur localhost:5173
npm.cmd run dev
```

Le serveur web charge `.env`. La passerelle charge `services/school-gateway/.env`. Ces fichiers sont ignorés par Git.

## Variables web

| Variable | Usage |
| --- | --- |
| `SESSION_SECRET` | Signature HMAC des sessions, 32 caractères minimum |
| `OPENROUTER_API_KEY` | Appels serveur OpenRouter |
| `OPENROUTER_MODEL` | `deepseek/deepseek-v4.1-flash` |
| `SCHOOL_GATEWAY_URL` | `http://127.0.0.1:8788` en local |
| `SCHOOL_GATEWAY_TOKEN` | Secret partagé avec la passerelle, 48 caractères minimum |
| `PILOT_ENROLLMENT_ID` | Inscription annuelle unique utilisée par le login parent pilote |

## Variables de la passerelle

| Variable | Usage |
| --- | --- |
| `SQL_SERVER`, `SQL_DATABASE` | Azure SQL existant |
| `SQL_USER`, `SQL_PASSWORD` | Principal SQL |
| `GATEWAY_SERVICE_TOKEN` | Même valeur que `SCHOOL_GATEWAY_TOKEN` |
| `VERIFIED_PARENT_MAPPINGS` | Objet JSON serveur, par exemple sujet pilote → `Parent_ID` |
| `HOST`, `PORT` | Boucle locale, `127.0.0.1:8788` |
| `ALLOW_WRITE_CAPABLE_READONLY_TEST` | Exception locale temporaire quand le principal fourni est administrateur |

La configuration actuelle utilise l’exception locale demandée pour le pilote. Le service expose malgré cela uniquement neuf lectures nommées : enfant, apprentissages, absences, messages, devoirs, parcours, résultats annuels, résultats par matière et résultats par semestre. Il refuse toutes les méthodes autres que GET. Pour une ouverture réseau ou familiale, remplacer le compte par un principal `SELECT` uniquement et laisser l’exception désactivée.

## Diagnostic

- `SESSION_NOT_CONFIGURED` : secret de session absent ou trop court.
- `PILOT_PARENT_NOT_CONFIGURED` : URL, jeton de passerelle ou inscription pilote absente.
- `SCHOOL_UNAVAILABLE` : passerelle arrêtée, requête SQL expirée ou schéma incompatible.
- `WRITE_CAPABLE_PRINCIPAL_REJECTED` : principal SQL trop puissant sans exception locale explicite.
- `AI_NOT_CONFIGURED` : clé OpenRouter absente.
- `AI_BUSY` / `AI_PROVIDER_UNAVAILABLE` : trois appels réels ont échoué sur quota, 5xx, réseau ou délai.
- `AI_SCHEMA_CHECK` : réponse JSON non conforme ; OpenRouter Response Healing puis une correction sont utilisés.
- `PARENT_GROUNDING` dans les journaux : la première réponse parent omettait ou contredisait un fait requis ; l’orchestrateur la corrige avant affichage.

L’orchestrateur privilégie les routes OpenRouter à faible latence, permet les replis de fournisseur compatibles, applique jusqu’à 42 secondes à une tentative et une échéance globale de 100 secondes. Il ne produit aucune réponse IA locale. Alexandre reçoit les neuf résultats déjà lus, sans les schémas d’outils inutiles dans l’appel modèle ; il utilise une température basse, un petit schéma structuré et un contrôle d’ancrage sur les années, classes, moyennes, semestres et absences. Milo demande un objet JSON simple à OpenRouter, puis applique localement le contrat Zod complet des scènes et une correction modèle si nécessaire. En cas d’échec final, l’interface garde le tableau et propose de réessayer.

## Données et persistance

Le carnet Milo reste dans `localStorage`. À chaque nouvelle entrée élève, une page vide est ajoutée et les anciennes pages restent consultables. Les conversations restent en mémoire. Les images sont redimensionnées dans le navigateur et envoyées uniquement avec une demande explicite à Milo ; elles ne sont pas stockées dans Azure SQL.

Le login est factice et convient à une présentation locale. Une mise en production nécessiterait une authentification scolaire vérifiée, un mapping par famille, un compte SQL `SELECT` uniquement, une politique de conservation et une limitation de débit partagée.
