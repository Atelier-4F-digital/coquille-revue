# Contribuer à Coquille Revue

Merci de votre intérêt ! Les tickets et propositions sont les bienvenus, en français ou en anglais.

## Signaler un bug ou proposer une idée

Ouvrez un ticket (Issue) en précisant : la version de l'extension, de WordPress et de PHP, si le site est en multisite, les étapes pour reproduire le problème, et ce que vous attendiez. Pour une faille de sécurité, suivez plutôt [SECURITY.md](SECURITY.md).

## Proposer une modification

1. Créez une branche à partir de `main`.
2. Faites une modification ciblée, testée sur un WordPress local (idéalement aussi en multisite). Elle doit passer PHPCS et les tests PHPUnit, en simple site et en multisite (voir plus bas).
3. Décrivez le changement dans [CHANGELOG.md](CHANGELOG.md), en anglais, section de la version en cours.
4. Ouvrez une demande de fusion (Pull Request) qui explique le pourquoi du changement. L'intégration continue rejoue toutes les vérifications.

## Environnement de développement

- Un WordPress local (Local, wp-env, Docker…) avec [WP-CLI](https://wp-cli.org/), en simple site et en multisite en sous-répertoires.
- PHP 7.4 ou plus et [Composer](https://getcomposer.org/). `composer install` installe les outils de développement dans `vendor/` : PHPCS avec les WordPress Coding Standards et PHPCompatibilityWP, PHPUnit et ses polyfills. Ils ne sont jamais livrés avec l'extension. Le `composer.lock` est résolu pour PHP 7.4 (`config.platform`) : il sert tel quel de PHP 7.4 à 8.4.
- Le zip de l'extension se construit avec `bash bin/build-zip.sh` (à partir du dernier commit). Il ne contient que `coquille-revue.php`, `uninstall.php`, `readme.txt`, `LICENSE`, `assets/` et `languages/` : tout le reste est marqué `export-ignore` dans `.gitattributes` (et listé dans `.distignore`).
- Le plugin Claude Code se vérifie avec `claude plugin validate ./claude-plugin` et `claude plugin validate .`, et se teste localement avec `claude --plugin-dir ./claude-plugin`.

### Standards de code (PHPCS)

```bash
vendor/bin/phpcs
```

Les règles sont dans `phpcs.xml.dist` (étape 1) : sécurité, base de données et API WordPress des WordPress Coding Standards 3, préfixe `coquille_revue`, domaine de traduction `coquille-revue`, WordPress 6.2 minimum (« Requires at least »), compatibilité PHP 7.4 et plus. Attendu : 0 erreur et 0 avertissement. Une exception se justifie sur la ligne même : `// phpcs:ignore Nom.De.La.Regle -- raison`. La mise en forme complète des WordPress Coding Standards (étape 2) viendra dans un commit de reformatage à part.

### Tests PHPUnit

Les tests d'intégration de `tests/phpunit/` tournent dans la suite de tests de WordPress : API REST (droits, champ piège, limites d'envoi, validation des champs, statuts), données personnelles (export, effacement, purge, dates), CSV, e-mail de remerciement, alertes en français et en anglais, exports Markdown et JSON, commandes WP-CLI (chaque refus de `apply`, grâce à une doublure de WP-CLI déclarée dans `tests/phpunit/bootstrap.php`), actions et rendu de la page d'admin, chargement des fichiers, migration de la base, et cloisonnement des sites en multisite.

Le groupe `isolated` (`tests/phpunit/test-isolated.php` : en-tête du proxy de confiance, désinstallation) modifie tout le processus (constante définie, vrai `DROP TABLE` qui valide la transaction en cours) : il est exclu du passage principal et se lance à part, avec `vendor/bin/phpunit --group isolated`.

> ⚠️ La suite de tests efface et recrée les tables WordPress de sa base à chaque lancement : utilisez une base **dédiée**, jamais celle d'un site.

Sous Linux ou macOS, avec MySQL ou MariaDB démarré :

```bash
mysqladmin -u root -p create wordpress_tests
WP_INSTALL_TESTS_SKIP_UPDATE_CHECK=true bash bin/install-wp-tests.sh wordpress_tests root '<mot de passe>' 127.0.0.1 latest true
vendor/bin/phpunit && vendor/bin/phpunit --group isolated
WP_MULTISITE=1 vendor/bin/phpunit && WP_MULTISITE=1 vendor/bin/phpunit --group isolated
```

`bin/install-wp-tests.sh` (copie épinglée du modèle de WP-CLI, sans svn) télécharge WordPress et sa suite de tests dans le dossier temporaire (variables `WP_CORE_DIR` et `WP_TESTS_DIR`). Il vérifie l'archive de WordPress avec l'empreinte SHA-1 que publie wordpress.org (qui ne publie pas de SHA-256) ; l'archive « nightly » et la suite de tests viennent d'archives GitHub, pour lesquelles aucune empreinte n'est publiée. Le dernier argument `true` saute la création de la base ; `latest` peut être remplacé par une version (`6.2`, `7.1.3`) ou par `trunk`.

Sous Windows avec [Local](https://localwp.com/), depuis Git Bash et sans Docker :

```bash
COMPOSER_PHAR=~/bin/composer.phar bash bin/test-local.sh
WP_MULTISITE=1 bash bin/test-local.sh
bash bin/test-local.sh --filter Alerts
```

`bin/test-local.sh` utilise le PHP et le MySQL de Local : démarrez d'abord un site dans Local. Il crée la base dédiée `coquille_revue_tests`, télécharge WordPress (7.1.3 par défaut) et sa suite de tests dans `~/wp-tests`, puis lance PHPUnit : le passage principal puis le groupe `isolated`, ou un seul passage avec les options données. Le chemin `WP_TESTS_BASE` ne doit pas contenir d'espace (`bin/install-wp-tests.sh` ne protège pas ses chemins : le script refuse de démarrer). Réglages par variables : `DB_PORT` (port MySQL du site, à lire dans `%APPDATA%/Local/sites.json` ; 10022 par défaut), `WP_VERSION`, `WP_TESTS_BASE`, `LOCAL_PHP_DIR`, `LOCAL_MYSQL`, et `COMPOSER_PHAR` (seulement si `vendor/` manque).

### Essayer dans WordPress Playground

- **En ligne** : le lien « Try it in WordPress Playground » de README.en.md charge `wporg-assets/blueprints/blueprint.json`, qui installe la dernière release publiée (`releases/latest/download/coquille-revue.zip`), active le mode public et ouvre une page d'exemple ; le lien de README.md charge `blueprint-fr.json`, la même démo sur un site en français (étape `setSiteLanguage`) avec une page d'exemple en français. Ce dossier correspondra au dossier `assets/blueprints/` de WordPress.org.
- **En local, avec le dossier de travail** (Node 20.10 ou plus), depuis la racine du dépôt :

  ```bash
  MSYS_NO_PATHCONV=1 npx --yes @wp-playground/cli@3.1.54 server --auto-mount --login
  ```

  Un WordPress jetable démarre sur http://127.0.0.1:9400 avec l'extension montée et activée ; arrêtez-le avec Ctrl+C. `MSYS_NO_PATHCONV=1` ne sert que sous Git Bash, qui réécrirait sinon les chemins `/wordpress/…`. La version 3.1.54 est épinglée parce que les suivantes demandent Node 24.18 ou plus.

- **Tester une modification du blueprint** sans release : construisez le zip, copiez-le avec le blueprint dans un dossier hors du dépôt, remplacez dans la copie la ressource `url` par `{"resource": "bundled", "path": "/coquille-revue.zip"}`, puis lancez `npx --yes @wp-playground/cli@3.1.54 server --blueprint=./blueprint.json --blueprint-may-read-adjacent-files` dans ce dossier.

### Intégration continue

`.github/workflows/ci.yml` (GitHub Actions) tourne à chaque envoi sur `main` et à chaque Pull Request : syntaxe PHP de 7.4 à 8.4, PHPCS, validité des fichiers JSON, syntaxe JavaScript (`node --check`) et shell (`bash -n`), PHPUnit (passage principal et groupe `isolated`) avec MySQL 8.4, image épinglée par son empreinte sha256 (PHP 7.4 et WordPress 6.2, PHP 8.3 et WordPress 7.1, et WordPress 7.1 en multisite), et Plugin Check sur le contenu réel du zip (seules les erreurs bloquent). Les actions sont épinglées par SHA de commit, version en commentaire : pour en mettre une à jour, changez le SHA et le commentaire ensemble.

Sur un tag `vX.Y.Z`, une fois tout au vert, le job `release` vérifie que le tag, l'en-tête `Version` et la constante `COQUILLE_REVUE_VERSION` sont identiques, et que `CHANGELOG.md` n'a plus de section « Unreleased » (datez la version avant d'étiqueter), puis crée une release **en brouillon** avec `coquille-revue-X.Y.Z.zip`, `coquille-revue.zip` (nom fixe, utilisé par le lien Playground) et la section du CHANGELOG. La publication reste manuelle ; une release qui existe déjà n'est jamais modifiée.

## Règles du code

- **Préfixe unique** : `coquille_revue_` pour les fonctions, options, transients, actions et nonces ; `COQUILLE_REVUE_` pour les constantes ; `coquille-` pour les identifiants et classes HTML/CSS.
- **Multisite** : la table est commune au réseau (`coquille_revue_table()`). Toute lecture ou écriture d'annotations filtre sur `get_current_blog_id()`, sauf les opérations qui portent volontairement sur tout le réseau : mises à jour de la base, purge quotidienne des données personnelles, suppression d'un site.
- **Sécurité** : nettoyer chaque entrée, échapper chaque sortie, vérifier droits et nonce sur chaque action d'administration, requêtes SQL préparées. Exception voulue : l'envoi d'une annotation par un visiteur anonyme n'a pas de nonce (il ne protégerait rien et bloquerait les sites avec cache de page) ; il est protégé par le champ piège et les limites d'envoi.
- **Données personnelles** : l'e-mail et l'adresse IP ne sortent jamais dans l'API ni dans les exports destinés à Claude Code.
- **Règles pour Claude Code** : elles vivent à deux endroits, à garder cohérents : `coquille_revue_claude_code_rules()` (exports) et `claude-plugin/skills/apply-review/SKILL.md` (qui prime). Toute modification impose de rejouer le test d'injection de `tests/injection/`.
- **Textes** : source en anglais, traduisible avec le domaine `coquille-revue` (`esc_html__()`, `esc_attr__()`, `_n()` pour les pluriels, `_x()` pour un mot ambigu, commentaire `/* translators: */` avant chaque texte à marqueur, marqueurs numérotés `%1$s` dès qu'il y en a deux). Aucun texte traduit avant le hook `init`. Un texte traduit est échappé au moment de l'affichage, comme toute donnée. Les valeurs enregistrées restent neutres (statuts, types, codes) et ne sont traduites qu'à l'affichage.
- **Jamais traduits** (anglais fixe) : les règles pour Claude Code, l'avertissement de l'export JSON, l'introduction et le bloc de données de l'export Markdown, les codes d'alerte, les clés JSON, l'aide et les messages des commandes WP-CLI. Une traduction (paquet de langue communautaire, extension de traduction) ne doit jamais pouvoir changer ce que lit Claude Code.
- **Base de données** : changer le schéma impose d'augmenter `COQUILLE_REVUE_DB_VERSION` ; `coquille_revue_maybe_upgrade()` est le seul point d'entrée des mises à jour.

## Traductions

Le dossier `languages/` contient le modèle `coquille-revue.pot` et la traduction française. Après avoir modifié un texte, depuis la racine du dépôt :

```bash
wp i18n make-pot . languages/coquille-revue.pot --domain=coquille-revue --exclude=tests,bin,claude-plugin,.claude-plugin,vendor,node_modules,build --headers='{"Report-Msgid-Bugs-To":"https://github.com/Atelier-4F-digital/coquille-revue/issues"}'
wp i18n update-po languages/coquille-revue.pot languages
```

Complétez ensuite chaque fichier `.po` (aucune chaîne vide, mêmes marqueurs `%s` que l'anglais ; en français : vouvoiement, espace insécable avant `: ; ! ?` et à l'intérieur des guillemets « »), puis compilez :

```bash
wp i18n make-mo languages
wp i18n make-php languages
```

Les fichiers `.mo` et `.l10n.php` (WordPress 6.5 et plus) sont livrés avec l'extension. Sur WordPress.org, les paquets de langue de translate.wordpress.org passent avant eux.

## Licence

En contribuant, vous acceptez que votre contribution soit publiée sous [GPL-2.0-or-later](LICENSE).

---

**English summary.** Issues and pull requests are welcome in English or French. Branch from `main`, keep changes focused and tested on a local WordPress (single site and multisite), update `CHANGELOG.md`, and explain the why in your pull request. Use the `coquille_revue_` prefix, scope every annotation query to `get_current_blog_id()`, sanitize input, escape output, check capabilities and nonces, never expose email or IP addresses to the API or the Claude Code exports, and keep the Claude Code rules consistent between `coquille_revue_claude_code_rules()` and `SKILL.md`. Interface texts are English source strings of the `coquille-revue` text domain, never called before `init` and escaped on output; the rules for Claude Code, alert codes, JSON keys and WP-CLI texts stay in fixed English and are never translatable. After changing a string, regenerate `languages/coquille-revue.pot`, update the `.po` files and compile them with `wp i18n make-mo` and `wp i18n make-php` (commands above). Development tools come from `composer install` (never shipped): run `vendor/bin/phpcs` (0 errors, 0 warnings) and the PHPUnit tests on a dedicated database (`bin/install-wp-tests.sh <db> <user> <pass> <host> latest true`, then `vendor/bin/phpunit` and `WP_MULTISITE=1 vendor/bin/phpunit`; on Windows with Local, `bin/test-local.sh`). Try your working copy with `npx --yes @wp-playground/cli@3.1.54 server --auto-mount --login`. GitHub Actions runs PHP lint (7.4 to 8.4), PHPCS, PHPUnit (single site and multisite) and Plugin Check on every push and pull request; a `vX.Y.Z` tag creates a draft release with the zips once everything passes. Contributions are licensed under GPL-2.0-or-later. Security issues: see [SECURITY.md](SECURITY.md).
