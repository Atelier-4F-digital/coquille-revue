# Contribuer à Coquille Revue

Merci de votre intérêt ! Les tickets et propositions sont les bienvenus, en français ou en anglais.

## Signaler un bug ou proposer une idée

Ouvrez un ticket (Issue) en précisant : la version de l'extension, de WordPress et de PHP, si le site est en multisite, les étapes pour reproduire le problème, et ce que vous attendiez. Pour une faille de sécurité, suivez plutôt [SECURITY.md](SECURITY.md).

## Proposer une modification

1. Créez une branche à partir de `main`.
2. Faites une modification ciblée, testée sur un WordPress local (idéalement aussi en multisite).
3. Décrivez le changement dans [CHANGELOG.md](CHANGELOG.md), section de la version en cours.
4. Ouvrez une demande de fusion (Pull Request) qui explique le pourquoi du changement.

## Environnement de développement

- Un WordPress local (Local, wp-env, Docker…) avec [WP-CLI](https://wp-cli.org/), en simple site et en multisite en sous-répertoires.
- Le zip de l'extension se construit avec `bash bin/build-zip.sh` (à partir du dernier commit).
- Le plugin Claude Code se vérifie avec `claude plugin validate ./claude-plugin` et `claude plugin validate .`, et se teste localement avec `claude --plugin-dir ./claude-plugin`.

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

**English summary.** Issues and pull requests are welcome in English or French. Branch from `main`, keep changes focused and tested on a local WordPress (single site and multisite), update `CHANGELOG.md`, and explain the why in your pull request. Use the `coquille_revue_` prefix, scope every annotation query to `get_current_blog_id()`, sanitize input, escape output, check capabilities and nonces, never expose email or IP addresses to the API or the Claude Code exports, and keep the Claude Code rules consistent between `coquille_revue_claude_code_rules()` and `SKILL.md`. Interface texts are English source strings of the `coquille-revue` text domain, never called before `init` and escaped on output; the rules for Claude Code, alert codes, JSON keys and WP-CLI texts stay in fixed English and are never translatable. After changing a string, regenerate `languages/coquille-revue.pot`, update the `.po` files and compile them with `wp i18n make-mo` and `wp i18n make-php` (commands above). Contributions are licensed under GPL-2.0-or-later. Security issues: see [SECURITY.md](SECURITY.md).
