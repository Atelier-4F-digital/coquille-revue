# Changelog

Toutes les évolutions notables de Coquille Revue. Format inspiré de [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/), versions en [SemVer](https://semver.org/lang/fr/).

## [Unreleased]

### Changements incompatibles

- WordPress 6.2 minimum (au lieu de 5.8) : toutes les requêtes SQL passent le nom de la table par le marqueur `%i` de `$wpdb->prepare()`, apparu dans cette version.
- Raccourci clavier : Ctrl+Maj+R (le rechargement forcé du navigateur) n'est plus détourné. Le mode relecture s'ouvre et se ferme avec **Alt+Maj+C** (Option+Maj+C sur Mac), pour les personnes connectées seulement, et jamais pendant une saisie dans un champ.
- API REST : le champ `platform`, ignoré par le serveur, n'est plus déclaré ni envoyé par le script (un ancien script qui l'envoie encore est accepté).
- API REST : chaque champ est validé (type, longueur, valeurs permises) avant d'être nettoyé. Une valeur du mauvais type (un tableau à la place d'un texte, par exemple) reçoit une erreur 400 au lieu de faire planter PHP ; un champ trop long reçoit 400 et non plus 413. Le texte d'origine et la suggestion doivent faire au moins 2 caractères.
- API REST : `PATCH /annotation/{id}/status` exige le paramètre `status` (il valait `applied` par défaut). `GET /annotations` est paginé : `per_page` (100 au plus, 100 par défaut) et `page`, total dans les en-têtes `X-WP-Total` et `X-WP-TotalPages`.
- WP-CLI : `apply --type=option` ne modifie plus que des options de texte du site : `blogname`, `blogdescription`, `widget_*`, `theme_mods_*`, `options_*` (ACF), liste extensible avec le filtre `coquille_revue_cli_writable_options`. `locate` indique pour chaque option si elle est `modifiable`. `locate` et `apply` refusent un texte d'origine de moins de 2 caractères.
- E-mail de remerciement : message générique, sans aucun texte saisi par le visiteur (ni nom, ni titre, ni extrait), avec la date, le nom du site et un lien vers l'accueil. L'expéditeur est celui de WordPress (filtres `wp_mail_from` et `wp_mail_from_name`) : plus de `From` ni de `Reply-To` à l'adresse de l'administrateur.

### Ajouts

- Réglage par site « E-mail de remerciement » (activé par défaut), dans la page d'admin, réservé aux administrateurs du site. Coupé, l'e-mail n'est plus demandé aux visiteurs ni enregistré, et les textes de confidentialité sont adaptés. Filtre `coquille_revue_notify_contributor` (`$enabled`, `$row`) pour décider annotation par annotation.
- Page d'admin : 50 annotations par page avec pagination, colonne « Alertes » (les mêmes que dans les exports pour Claude Code), texte complet du texte d'origine et de la suggestion au survol, confirmation avant « Appliqué » quand un remerciement va partir.
- Réglage par site « Crédit » (désactivé par défaut), réservé aux administrateurs du site : affiche « Coquille Revue, proposé par Atelier 4F Digital » et un lien dans la fenêtre d'information du crayon. Les deux réglages du site (remerciement et crédit) sont enregistrés par un seul formulaire.
- Filtre `coquille_revue_load_overlay` (booléen) : renvoyer `false` pour ne pas charger l'interface de relecture sur une page.
- Désinstallation : supprimer l'extension depuis l'écran Extensions efface la table des annotations, les réglages et les tâches planifiées, sur chaque site du réseau (`uninstall.php`). La simple désactivation garde tout.

### Modifications

- Bulle d'annotation fixée à l'écran, juste au-dessus de la barre (ou en haut quand elle cacherait le texte choisi) : elle restait accrochée au premier écran de la page, si bien qu'après un défilement elle sortait de l'écran et la page sautait au moment de la saisie. En mode relecture, le crayon et les messages passent au-dessus de la barre, où ils cachaient le bouton « Arrêter ».
- Écrans tactiles : la bulle s'ouvre une fois la sélection stabilisée (appui long, puis poignées, qui la mettent à jour sans effacer la remarque) et sans ouvrir le clavier ; elle se place au-dessus du clavier virtuel. L'aide « clic + glisser sur une zone » est masquée, les boutons sont plus grands et les champs en 16 px (iOS n'agrandit plus la page à la saisie). La touche Entrée du clavier mobile s'affiche « Envoyer » et envoie la remarque, comme le bouton « Envoyer ».
- Accessibilité de l'interface publique : icônes en SVG (plus d'emoji), boutons typés et nommés (« Fermer » sur la croix, zone de clic de 32 px), crayon et types de remarque annoncés comme boutons à bascule (`aria-pressed`), bulle en `role="dialog"` nommée par son titre, champs étiquetés avec les consignes clavier hors du texte indicatif, message de confirmation ou d'erreur annoncé (`role="status"`), adresse e-mail invalide signalée (`aria-invalid` et message). La fenêtre d'information s'ouvre aussi au focus clavier du crayon ; à la fermeture de la bulle ou de la barre, le focus revient au crayon. Focus visible partout, contrastes d'au moins 4,5:1 pour les textes, animations coupées si le système demande de les réduire. Annotation possible au clavier seul : en mode relecture, sélectionner le texte (navigation au curseur, F7) puis appuyer sur Entrée. Le raccourci est indiqué dans la fenêtre d'information (`aria-keyshortcuts` sur le crayon).
- Interface publique : plus chargée dans l'aperçu du Customizer. Le clic-glisser hors de la bulle ouverte envoie la remarque saisie (ou ferme la bulle) au lieu de démarrer une nouvelle zone qui effaçait cette remarque ; le curseur est recalculé à chaque entrée dans le mode relecture.
- Crédit public masqué par défaut : plus de lien « plugin par Atelier 4F Digital » dans la barre de relecture des visiteurs, ni de commentaire HTML avec le nom et la version de l'extension dans les pages. Le crédit reste dans la page d'admin, les exports et les README.
- Interface publique : le CSS et le JavaScript ne sont plus écrits dans chaque page. WordPress les charge depuis `assets/css/overlay.css` et `assets/js/overlay.js` (script en pied de page, en `defer`), avec la version de l'extension en `?ver=`. La configuration (adresse de l'API, jeton, longueurs maximales, textes) est passée dans `window.coquilleRevueConfig`. Rien n'est chargé quand l'interface ne s'affiche pas (mode privé et visiteur non connecté). Avec une règle CSP stricte, seule cette configuration écrite dans la page a besoin d'un nonce (filtre `wp_inline_script_attributes`). Après une mise à jour, vider le cache de page ; si un outil d'optimisation retarde ou fusionne les scripts, en exclure `coquille-revue`.
- Page d'admin : styles dans `assets/css/admin.css`, chargé seulement sur la page Coquille Revue (plus aucun attribut `style`). Couleurs des statuts plus foncées, pour un contraste d'au moins 4,5:1 ; icônes de WordPress (dashicons) à la place des emojis ; tout le texte est échappé au moment de l'affichage.
- Page d'admin : la confirmation avant « Appliqué » passe par un attribut `data-coquille-confirm` et un petit script chargé par WordPress, au lieu d'un attribut `onclick`. Les liens de changement de statut d'une page ouverte avant la mise à jour ne marchent plus (« Le lien a expiré ») : recharger la page.
- Alertes : les points de code (U+XXXX) des caractères invisibles et des alphabets mélangés sont calculés sans l'extension PHP mbstring, que WordPress n'exige pas.

### Sécurité

- Remerciement : au plus 1 e-mail par adresse et par jour, et 20 par jour et par site ; un double clic ou deux appels simultanés sur « Appliqué » n'envoient qu'un e-mail. Il se termine par « Si vous n'êtes pas à l'origine de cette suggestion, ignorez ce message ».
- Export CSV : une cellule qui commence par `=`, `+`, `-`, `@`, une tabulation ou un retour à la ligne est précédée d'une apostrophe, pour qu'un tableur ne l'exécute pas comme une formule ; les guillemets sont doublés, sans caractère d'échappement.
- Export Markdown : dans le bloc de données, chaque ligne d'une valeur est décalée de deux espaces ; un visiteur ne peut plus y écrire de fausse ligne `url:`, `auteur:` ou `suggestion:`.
- Alertes : l'« adresse web » reconnaît aussi `mailto:`, `tel:`, `data:`, `//hôte` et les domaines sans `www` aux extensions courantes (`.ru`, `.co`, `.io`…) ; `apply` refuse l'ajout de ces liens. Les formules de « consigne ou autorité » sont cherchées en français et en anglais, quelle que soit la langue du site.
- « Tout supprimer » est un formulaire (POST) avec une case de confirmation obligatoire : la confirmation marche sans JavaScript et sous une CSP stricte, et un simple lien, même avec un jeton valide, ne supprime plus rien.
- Anti-spam : en plus des limites existantes, au plus 10 envois anonymes par heure et par adresse IP, pour qu'une seule adresse ne puisse pas épuiser le quota du site (30 par heure).
- Page d'admin : un paramètre d'adresse piégé (`coquille_revue_msg[]=1`, `format[]=…`) ne fait plus planter la page ; les liens ouverts dans un nouvel onglet ont `rel="noopener noreferrer"`.
- Changement de statut depuis la page d'admin : le jeton de sécurité est vérifié avant toute lecture des paramètres de l'adresse.
- Exports CSV, JSON et Markdown et `wp coquille-revue list` lisent la base par lots de 500 et écrivent au fil de l'eau : la mémoire reste stable quel que soit le nombre d'annotations.

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
