# Changelog

Toutes les évolutions notables de Coquille Revue. Format inspiré de [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/), versions en [SemVer](https://semver.org/lang/fr/).

## [2.5.0] — en cours

### Changé (incompatible avec les versions précédentes)

- Nom unique « Coquille Revue » partout (titre d'admin, menu, exports).
- Préfixe unique `coquille_revue_` / `COQUILLE_REVUE_` pour toutes les fonctions, constantes, options, transients, actions et nonces (remplace `cr_` / `CR_`).
- Constante de `wp-config.php` : `CR_REQUIRE_LOGIN` devient `COQUILLE_REVUE_REQUIRE_LOGIN`.
- Option réseau : `cr_require_login` devient `coquille_revue_require_login`.
- Filtre : `cr_contributor_email` devient `coquille_revue_contributor_email`.
- Identifiants et classes HTML/CSS : `cr-…` devient `coquille-…`.
- Table : `{prefix}content_reviews` devient `{prefix}coquille_revue_annotations`.

### Migration depuis « Content Review » (2.3.x / 2.4.x)

1. Désactiver l'ancienne extension « Content Review ».
2. Activer « Coquille Revue » : la nouvelle table est créée.
3. Recopier les annotations de l'ancienne table vers la nouvelle. L'ancienne table n'est pas supprimée.

## [2.4.1] — 2026-06-24

Dernière version publiée sous le nom interne « Content Review » (API `content-review/v1`).
