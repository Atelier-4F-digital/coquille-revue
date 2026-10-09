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

### Migration depuis « Content Review » (2.3.x / 2.4.x)

1. Si `wp-config.php` contient `define('CR_REQUIRE_LOGIN', …)`, renommer la constante en `COQUILLE_REVUE_REQUIRE_LOGIN`.
2. Désactiver l'ancienne extension « Content Review ».
3. Activer « Coquille Revue » : la nouvelle table est créée.
4. **Juste après**, recopier les annotations et le réglage public/privé de l'ancienne version. L'ancienne table n'est pas supprimée.
5. Mettre à jour `/apply-review` pour la nouvelle adresse d'API.

## [2.4.1] — 2026-06-24

Dernière version publiée sous le nom interne « Content Review » (API `content-review/v1`).
