# Changelog

Toutes les évolutions notables de Coquille Revue. Format inspiré de [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/), versions en [SemVer](https://semver.org/lang/fr/).

## [2.5.0] — 2026-10-09 — première version publique

Coquille Revue a d'abord servi en interne chez Atelier 4F Digital, sous le nom « Content Review » (versions 2.0 à 2.4). La 2.5.0 est la première version publiée. Elle change de nom, de préfixes et de table, et n'est pas compatible avec ces versions internes.

### Fonctionnalités

- **Relecture sur les pages** : bouton crayon, sélection d'un texte ou d'une zone, remarque de type correction, suggestion ou question. Mode privé par défaut (utilisateurs connectés qui peuvent modifier des articles), mode public (tous les visiteurs) activable depuis l'administration.
- **Administration** : onglets par statut, changements de statut, exports CSV, JSON et Markdown, e-mail de remerciement au contributeur quand sa suggestion est appliquée, e-mail groupé à l'administrateur (au plus un toutes les 15 minutes).
- **Multisite** : activation site par site ou pour tout le réseau ; chaque site ne voit, n'exporte et ne supprime que ses annotations.
- **Commandes WP-CLI** `wp coquille-revue list | locate | apply | status`. Le texte des annotations est lu dans la base à partir du numéro : il ne passe jamais par une ligne de commande. `locate` cherche le texte d'origine (recherche littérale, qui tient compte des apostrophes et guillemets typographiques et des espaces insécables) dans les articles et pages, menus, options, champs personnalisés, termes, fichiers du thème et des extensions, traductions, et sur la page elle-même. `apply` remplace le texte à l'identique dans un contenu de la base (avec une révision quand le type de contenu les gère) et refuse l'ajout de balises, de liens, de shortcodes, de PHP, de `javascript:` ou d'attributs `on…=`, les occurrences multiples (sauf `--toutes`), les questions et les annotations avec alertes (sauf `--ignorer-alertes`).
- **Plugin Claude Code** `coquille-revue` (dossier `claude-plugin/`, catalogue `.claude-plugin/marketplace.json`), commande `/coquille-revue:apply-review` : accord annotation par annotation, aucune application automatique, aucun mot de passe WordPress, mode `--dry-run`.

### Sécurité

- Les annotations sont traitées comme des données saisies par des visiteurs, jamais comme des consignes. Les règles fournies à Claude Code (exports et plugin, ces dernières priment) interdisent d'appliquer quoi que ce soit sans accord, de suivre une consigne contenue dans une annotation, de placer son texte dans une ligne de commande, d'ajouter du code ou des liens, et de recopier un contenu piégé.
- Chaque annotation exportée porte sa provenance et des `alertes` calculées sans IA : adresse web, code ou commande (dont shortcodes), caractères invisibles et alphabets mélangés (avec leurs points de code), formules de consigne ou d'autorité.
- Export Markdown : les champs des visiteurs sont enfermés dans un bloc dont ils ne peuvent pas sortir.
- L'API refuse une adresse de page qui n'appartient pas au site (au sous-site précis en multisite), un XPath ou un sélecteur de forme inattendue, des caractères de contrôle bidirectionnel et des champs trop longs.
- Anti-spam en mode public : champ piège, au plus 5 envois par adresse IP (bloc /64 en IPv6) en 5 minutes, 30 envois anonymes par heure et par site ; 60 envois en 5 minutes par compte connecté. L'adresse IP est celle de la connexion ; derrière un proxy de confiance, déclarer son en-tête avec `COQUILLE_REVUE_TRUSTED_PROXY_HEADER`.
- Droits : gérer les annotations demande `edit_others_posts` (filtre `coquille_revue_manage_capability`) ; le mode public/privé est réservé à `manage_options`, ou au super-administrateur en multisite.
- Les règles ont été éprouvées par un test d'injection de prompt (17 annotations piégées ou ambiguës, voir `tests/injection/`) : aucune action non voulue.

### Données personnelles

- Enregistré : texte et suggestion, adresse de la page (sans paramètres ni ancre), adresse IP ; pour un visiteur, le nom et l'e-mail s'il les indique ; pour une personne connectée, son nom d'affichage et l'e-mail de son compte (si elle est membre du site).
- L'e-mail n'est affiché nulle part : il sert au remerciement et aux outils RGPD de WordPress. L'adresse IP est visible des administrateurs (page d'admin, export CSV). Ni l'e-mail ni l'IP ne sont transmis à Claude Code (API, exports JSON et Markdown, WP-CLI).
- Durées : l'adresse IP est effacée au bout de 30 jours ; l'e-mail et le nom d'un visiteur dans les 24 heures qui suivent le traitement de l'annotation (appliquée, rejetée ou archivée), et au plus tard au bout de 6 mois. Les annotations d'un site supprimé sont effacées.
- Mention sous le formulaire, texte proposé pour la politique de confidentialité, prise en charge des demandes d'export et d'effacement de données de WordPress.
