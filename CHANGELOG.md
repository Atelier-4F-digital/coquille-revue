# Changelog

Toutes les évolutions notables de Coquille Revue. Format inspiré de [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/), versions en [SemVer](https://semver.org/lang/fr/).

## [2.5.0] — en cours

### Changé (incompatible avec les versions précédentes)

- Nom unique « Coquille Revue » partout (titre d'admin, menu, exports, sujet de l'e-mail admin `[Coquille Revue]` au lieu de `[Review]`).
- API REST : `content-review/v1` devient `coquille-revue/v1`. Mettre à jour `/apply-review` et tout script qui appelle l'API.
- Page d'admin : `admin.php?page=content-reviews` devient `admin.php?page=coquille-revue` (les liens des anciens e-mails et les favoris ne marchent plus).
- Fichiers d'export : `content-reviews-<statut>-…` devient `coquille-revue-<statut>-…`.
- Préfixe unique `coquille_revue_` / `COQUILLE_REVUE_` pour toutes les fonctions, constantes, options, transients, actions et nonces (remplace `cr_` / `CR_`).
- Constante de `wp-config.php` : `CR_REQUIRE_LOGIN` devient `COQUILLE_REVUE_REQUIRE_LOGIN`.
- Option réseau : `cr_require_login` devient `coquille_revue_require_login`.
- Filtre : `cr_contributor_email` devient `coquille_revue_contributor_email`.
- Identifiants et classes HTML/CSS : `cr-…` devient `coquille-…`. Le sélecteur CSS enregistré avec chaque annotation n'écarte plus que les classes propres au plugin.
- Table : `{prefix}content_reviews` devient `{prefix}coquille_revue_annotations`.

### Sécurité

- Les consignes pour Claude Code (exports JSON et Markdown) ne demandent plus jamais d'appliquer automatiquement : chaque changement est montré et attend l'accord de l'utilisateur. L'option `--auto-apply` et l'application automatique des annotations de zone sont supprimées.
- Les annotations sont présentées comme des données saisies par des visiteurs, jamais comme des consignes. Les règles interdisent d'ajouter du code, des liens externes, de toucher aux réglages, comptes ou secrets, et de placer le texte d'une annotation dans une ligne de commande.
- Une seule liste de règles, partagée par les deux exports (avant : ils se contredisaient sur le mode zone).
- Export Markdown : chaque annotation est enfermée dans un bloc de code dont la clôture est plus longue que toute suite d'accents graves du contenu, on ne peut plus y glisser de faux titres ou de fausses consignes. L'adresse IP n'y figure plus.
- Chaque annotation exportée indique sa provenance (visiteur anonyme ou utilisateur connecté) et ses `alertes`, calculées sans IA : adresse web, code ou commande, caractères invisibles, alphabets mélangés, formule de consigne ou d'autorité.
- Les règles couvrent aussi : fausse autorité écrite dans une annotation, accord groupé, correction devinée ou en masse, « changement de sens » (fait, date, prix, condition…), seconde demande cachée, injection différée, rapport sans recopie du contenu piégé.
- L'API refuse les annotations dont l'adresse de page n'appartient pas au site, et celles qui contiennent des caractères de contrôle bidirectionnel (HTTP 400).
- Règles éprouvées par un test d'injection de prompt (17 annotations piégées ou ambiguës, exports JSON et Markdown) : aucune action non voulue.

### Migration depuis « Content Review » (2.3.x / 2.4.x)

1. Si `wp-config.php` contient `define('CR_REQUIRE_LOGIN', …)`, renommer la constante en `COQUILLE_REVUE_REQUIRE_LOGIN`.
2. Désactiver l'ancienne extension « Content Review ».
3. Activer « Coquille Revue » : la nouvelle table est créée.
4. **Juste après**, recopier les annotations et le réglage public/privé de l'ancienne version. L'ancienne table n'est pas supprimée.
5. Mettre à jour `/apply-review` pour la nouvelle adresse d'API.

## [2.4.1] — 2026-06-24

Dernière version publiée sous le nom interne « Content Review » (API `content-review/v1`).
