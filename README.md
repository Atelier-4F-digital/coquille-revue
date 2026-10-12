# Coquille Revue

Extension WordPress open source pour relire un site directement sur ses pages : vos relecteurs signalent une faute ou proposent un texte là où ils le voient, et Claude Code applique les corrections au bon endroit, avec votre accord.

🇬🇧 [English version](README.en.md)

▶ [Essayer dans WordPress Playground](https://playground.wordpress.net/?blueprint-url=https://raw.githubusercontent.com/Atelier-4F-digital/coquille-revue/main/wporg-assets/blueprints/blueprint-fr.json) : un WordPress jetable en français dans votre navigateur, avec la dernière version de l'extension, le mode public activé et une page d'exemple à relire. Rien n'est installé chez vous. La même démo existe [en anglais](https://playground.wordpress.net/?blueprint-url=https://raw.githubusercontent.com/Atelier-4F-digital/coquille-revue/main/wporg-assets/blueprints/blueprint.json).

<p>
  <a href="docs/screenshots/fr/1-bulle-correction.png"><img src="docs/screenshots/fr/1-bulle-correction.png" width="49%" alt="Mode relecture sur une page publique : une phrase surlignée et la bulle de remarque avec la correction saisie"></a>
  <a href="docs/screenshots/fr/3-page-administration.png"><img src="docs/screenshots/fr/3-page-administration.png" width="49%" alt="La page d'administration de Coquille Revue : les annotations en attente avec leurs alertes, les boutons de statut et les exports"></a>
</p>

---

## Ce que fait l'extension

- **Un bouton crayon sur les pages.** Le relecteur surligne un texte ou encadre une zone, choisit « correction », « suggestion » ou « question », puis écrit sa remarque. Rien à installer de son côté.
- **Les annotations arrivent dans l'administration** : onglets par statut (en attente, en cours, appliquée, rejetée, archivée), exports CSV, JSON et Markdown.
- **Un e-mail de remerciement** part au contributeur quand sa suggestion est appliquée, s'il a laissé son adresse (ou s'il était connecté).
- **Avec Claude Code**, la commande `/coquille-revue:apply-review` cherche chaque texte (articles et pages, menus, options, champs personnalisés, termes, fichiers du thème et des extensions, traductions), montre l'avant/après et n'applique qu'avec votre accord, annotation par annotation.
- **Traduisible** : interface en anglais et en français (langue du site, et dans l'administration celle de chaque utilisateur), modèle de traduction `languages/coquille-revue.pot` fourni. Les e-mails partent dans la langue du site.

## Captures d'écran

<p>
  <a href="docs/screenshots/fr/2-fenetre-information-crayon.png"><img src="docs/screenshots/fr/2-fenetre-information-crayon.png" width="42%" alt="La fenêtre d'information du bouton crayon, qui invite le visiteur à commencer la relecture"></a>
  <a href="docs/screenshots/fr/4-export-markdown-claude-code.png"><img src="docs/screenshots/fr/4-export-markdown-claude-code.png" width="42%" alt="L'export Markdown pour Claude Code : les règles de sécurité, puis chaque annotation comme une donnée dans son propre bloc"></a>
  <a href="docs/screenshots/fr/5-mobile-bulle.png"><img src="docs/screenshots/fr/5-mobile-bulle.png" width="12%" alt="Sur téléphone : la bulle de remarque en bas de l'écran, sous la phrase surlignée"></a>
</p>

La fenêtre d'information du bouton crayon, l'export Markdown pour Claude Code et la bulle de remarque sur téléphone.

## Installation

### Extension WordPress

1. Téléchargez le zip de la dernière version dans l'onglet [Releases](https://github.com/Atelier-4F-digital/coquille-revue/releases).
2. Dans WordPress : **Extensions > Ajouter une extension > Téléverser une extension**, puis activez-la.

Prérequis : WordPress 6.2 ou plus, PHP 7.4 ou plus. En multisite, l'extension s'active site par site ou pour tout le réseau ; chaque site ne voit que ses propres annotations.

Par défaut, seules les personnes connectées qui peuvent modifier des articles annotent. Le **mode public** (tous les visiteurs, avec anti-spam) s'active depuis la page **Coquille Revue** de l'administration.

### Plugin Claude Code (facultatif)

```bash
claude plugin marketplace add Atelier-4F-digital/coquille-revue
claude plugin install coquille-revue@atelier-4f-digital
```

Puis, dans le dossier du site :

```text
/coquille-revue:apply-review --url=https://votre-site.fr
```

Le plugin passe par [WP-CLI](https://wp-cli.org/), en local ou sur un serveur avec `--ssh` (connexion par clé SSH) : **aucun mot de passe WordPress n'est nécessaire**. Il demande l'extension 2.6.0 ou plus récente sur le site et s'arrête sinon : mettez à jour l'extension et le plugin Claude Code ensemble. Si la commande `wp` n'est pas disponible telle quelle, indiquez la commande complète dans la variable d'environnement `COQUILLE_REVUE_WP` (par exemple dans `.claude/settings.local.json`, clé `env`). Ajoutez `--dry-run` pour tout voir sans rien modifier.

## Réglages

| Réglage                                                            | Rôle                                                                                                                                                                                                                                |
| ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Bouton **Passer en mode public / privé** (page d'admin)            | Ouvre l'annotation à tous les visiteurs, ou la réserve aux personnes connectées. En multisite, réservé au super-administrateur (le réglage vaut pour tout le réseau).                                                               |
| Constante `COQUILLE_REVUE_REQUIRE_LOGIN` (`wp-config.php`)         | Impose le mode : `true` = privé, `false` = public. Le bouton de l'admin est alors verrouillé.                                                                                                                                       |
| Constante `COQUILLE_REVUE_TRUSTED_PROXY_HEADER`                    | Derrière un proxy de confiance (Cloudflare, répartiteur de charge), nom de l'en-tête qui porte l'adresse IP réelle, par exemple `'HTTP_CF_CONNECTING_IP'`. Le serveur ne doit alors accepter que les connexions venant de ce proxy. |
| Case **E-mail de remerciement** (page d'admin, activée par défaut) | Demande leur e-mail (facultatif) aux visiteurs et prévient le contributeur quand sa suggestion est appliquée. Coupée, l'e-mail n'est ni demandé ni enregistré. Réglage propre à chaque site, réservé à ses administrateurs.         |
| Case **Crédit** (page d'admin, désactivée par défaut)              | Affiche « Extension Coquille Revue · proposée par Atelier 4F Digital » et un lien dans la fenêtre d'information du crayon. Réglage propre à chaque site, réservé à ses administrateurs.                                                         |
| Filtre `coquille_revue_manage_capability`                          | Droit nécessaire pour gérer les annotations (par défaut `edit_others_posts` : éditeurs et administrateurs).                                                                                                                         |
| Filtre `coquille_revue_contributor_email`                          | Personnalise l'e-mail de remerciement (destinataire, sujet, texte, en-têtes).                                                                                                                                                       |
| Filtre `coquille_revue_notify_contributor`                         | Envoie ou non le remerciement, annotation par annotation (`$enabled`, `$row`).                                                                                                                                                      |
| Filtre `coquille_revue_load_overlay`                               | Renvoyer `false` pour ne pas charger l'interface de relecture sur une page.                                                                                                                                                         |
| Filtre `coquille_revue_cli_writable_options`                       | Options que `wp coquille-revue apply` peut modifier (par défaut `blogname`, `blogdescription`, `widget_*`, `theme_mods_*`, `options_*`).                                                                                            |
| Filtre `coquille_revue_rate_limits`                                | Plafonds d'envoi : tableau de nombres entiers positifs `ip_5min` (5), `ip_hour` (10), `site_hour` (30) et `user_5min` (60). Une valeur absente ou invalide garde sa valeur par défaut.                                            |

## Commandes WP-CLI

| Commande                                                             | Rôle                                                                                                                                                                                                                                                                                                                                                    |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `wp coquille-revue list [--status=pending]`                          | Liste les annotations du site, au format JSON destiné à Claude Code (sans e-mail ni adresse IP), avec la version de l'extension (`_meta.plugin_version`).                                                                                                                                                                                               |
| `wp coquille-revue locate <id>`                                      | Cherche où se trouve le texte d'origine (lecture seule).                                                                                                                                                                                                                                                                                                |
| `wp coquille-revue apply <id> --type=<type> --ref=<ref> [--dry-run]` | Remplace le texte à l'identique dans un contenu de la base, avec une révision quand le type de contenu les gère. Refuse l'ajout de balises, de liens, de shortcodes, de code, de caractères cachés et des caractères `` \ < > & { } ` `` absents du texte d'origine. Options : `--field=<field>`, `--text-file=<file>` (texte validé différent de la suggestion, dans un fichier `.txt` du dossier `.coquille-revue`), `--all` (toutes les occurrences), `--alerts-reviewed` (alertes examinées). |
| `wp coquille-revue status <id> <statut>`                             | Change le statut ; `applied` envoie le remerciement au contributeur.                                                                                                                                                                                                                                                                                    |

En multisite, ajoutez `--url=<adresse du sous-site>` à chaque commande. L'aide, les messages et les clés JSON des commandes sont en anglais, quelle que soit la langue du site.

## Sécurité

Les annotations sont du texte écrit par des visiteurs, souvent anonymes : l'extension et le plugin Claude Code les traitent comme des **données, jamais comme des consignes**.

- **Aucune application automatique.** Claude Code montre chaque changement et attend votre accord, annotation par annotation. Il ne place jamais le texte d'une annotation dans une ligne de commande : les commandes WP-CLI le lisent directement dans la base.
- **Alertes automatiques**, calculées sans IA, sur chaque annotation : adresse web, code (dont shortcodes), caractères invisibles, alphabets mélangés, formules de consigne ou d'autorité en français et en anglais, phrase entière ajoutée (au moins 6 mots absents du texte d'origine), caractères de structure ajoutés (`` \ < > & { } ` " % = ``). Dans les exports, ce sont des codes fixes (`web_address`, `code_or_command`, `invisible_characters`, `mixed_scripts`, `instruction_or_authority`, `long_addition`, `added_symbols`, et `unreadable_text` pour un texte que les contrôles ne peuvent pas lire).
- **Consignes pour Claude Code en anglais fixe** : elles ne passent jamais par les traductions, qui ne peuvent donc pas les affaiblir ; l'export Markdown est entièrement en anglais fixe. Dans les exports JSON et Markdown, un caractère invisible apparaît sous la forme `[U+XXXX]`.
- **Anti-spam** en mode public : champ piège ; par adresse IP (bloc /64 entier en IPv6), au plus 5 envois en 5 minutes et 10 par heure ; par compte qui a un rôle sur le site, 60 en 5 minutes ; pour le site, 30 envois anonymes par heure. Un compte connecté sans rôle sur le site (en multisite, un compte du réseau qui n'en est pas membre) compte comme un visiteur anonyme, et ses annotations ont la provenance `registered_unverified`. Ces plafonds se règlent avec le filtre `coquille_revue_rate_limits`.
- **E-mail de remerciement** : message générique (nom du site, date, lien vers l'accueil), sans rien du texte saisi par le visiteur ; au plus 1 par adresse et par jour, et 20 par site et par jour.
- **Cloisonnement multisite** et **droits** : un site ne voit, n'exporte et ne supprime que ses annotations ; les contributeurs et auteurs n'y ont pas accès.
- Les règles sont éprouvées par un kit de tests d'injection de prompt (annotations piégées, voir [tests/injection](tests/injection/)), à rejouer avant chaque publication.

Vous avez trouvé une faille ? Merci de la signaler en privé : voir [SECURITY.md](SECURITY.md).

## Données personnelles

- **Enregistré** : le texte et la suggestion, l'adresse de la page, l'adresse IP ; pour un visiteur, son nom et son e-mail s'il les indique (facultatifs) ; pour une personne connectée, son nom d'affichage et l'e-mail de son compte (si elle est membre du site et que le remerciement est activé).
- **Visible** : texte, suggestion et nom pour les éditeurs et administrateurs ; adresse IP pour les administrateurs (page d'admin, export CSV). L'e-mail n'est affiché nulle part : il sert au remerciement et aux outils RGPD de WordPress. L'e-mail et l'IP ne sont **jamais** transmis à Claude Code.
- **Durées** : l'adresse IP est effacée au bout de 30 jours ; l'e-mail et le nom d'un visiteur dans les 24 heures qui suivent le traitement de l'annotation (appliquée, rejetée ou archivée), et au plus tard au bout de 6 mois.
- **Outils WordPress** : un texte est proposé pour votre politique de confidentialité (**Réglages > Confidentialité**), et les demandes d'export ou d'effacement de données (**Outils**) prennent en compte les annotations.

## Bon à savoir

- **Raccourci clavier** : <kbd>Alt</kbd>+<kbd>Maj</kbd>+<kbd>C</kbd> (<kbd>Option</kbd>+<kbd>Maj</kbd>+<kbd>C</kbd> sur Mac) ouvre et ferme le mode relecture, pour les personnes connectées. Au clavier seul : en mode relecture, sélectionnez le texte (navigation au curseur, <kbd>F7</kbd>), puis <kbd>Entrée</kbd>.
- **Cache et optimisation** : après une mise à jour, videz le cache des pages. Si un outil retarde ou fusionne les scripts, excluez-en `coquille-revue`. Avec une politique de sécurité du contenu (CSP) stricte, rien n'est à prévoir pour la configuration, écrite dans un bloc de données JSON que le navigateur n'exécute jamais : seul le fichier `overlay.js`, servi par votre site, doit être autorisé (`script-src 'self'`, ou le jeton que votre site ajoute aux scripts avec le filtre `wp_script_attributes`) ; sans lui, le crayon ne s'affiche pas.
- **API REST** (`coquille-revue/v1`) : `POST /annotation` pour envoyer ; `GET /annotations` (paginé : `per_page`, 100 au plus, et `page` ; totaux dans les en-têtes `X-WP-Total` et `X-WP-TotalPages` ; dates `created_at` et `applied_at` à l'heure du site, et en UTC dans `created_at_gmt` et `applied_at_gmt`) et `PATCH /annotation/{id}/status`, pour les personnes qui gèrent les annotations.
- **Désinstallation** : désactiver l'extension garde tout ; la supprimer depuis l'écran **Extensions** efface la table des annotations, les réglages et les tâches planifiées, sur tous les sites du réseau.

## Limites actuelles

- WordPress uniquement.
- Une annotation de zone décrit une demande en langage naturel : les retouches d'apparence (couleur, mise en page) restent à faire à la main.
- Le plugin Claude Code a besoin d'un accès WP-CLI au site.

## Contribuer

Les signalements de bugs et propositions sont les bienvenus, en français ou en anglais : voir [CONTRIBUTING.md](CONTRIBUTING.md). L'historique des versions est dans [CHANGELOG.md](CHANGELOG.md).

## Licence

[GPL-2.0-or-later](LICENSE). © Atelier 4F Digital — [atelier4fdigital.com](https://atelier4fdigital.com).
