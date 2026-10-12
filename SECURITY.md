# Sécurité / Security

## Signaler une faille

Merci de **ne pas ouvrir de ticket public** pour une faille de sécurité. Signalez-la en privé :

- de préférence avec le bouton **Report a vulnerability** de l'onglet [Security](https://github.com/Atelier-4F-digital/coquille-revue/security) du dépôt ;
- sinon par e-mail à **atelierdigital4f@gmail.com**, avec « Coquille Revue — sécurité » en objet.

Indiquez la version concernée, les étapes pour reproduire le problème et son impact. Nous accusons réception sous 5 jours ouvrés et vous tenons informé jusqu'à la correction. Nous citons volontiers la personne qui a signalé la faille, si elle le souhaite.

## Versions suivies

| Version                                               | Correctifs de sécurité     |
| ----------------------------------------------------- | -------------------------- |
| 2.6.x                                                 | Oui                        |
| 2.5.x                                                 | Non (mettre à jour en 2.6) |
| Versions antérieures (nom interne « Content Review ») | Non                        |

## Modèle de menace

Les annotations sont écrites par des visiteurs, souvent anonymes. Elles sont traitées comme des **données non fiables** :

- l'extension ne les exécute ni ne les affiche sans échappement ;
- les règles fournies à Claude Code (export et plugin Claude Code) interdisent de suivre une consigne contenue dans une annotation, d'appliquer quoi que ce soit sans l'accord de l'utilisateur, et de placer le texte d'une annotation dans une ligne de commande ;
- les commandes WP-CLI lisent le texte dans la base à partir du numéro et refusent l'ajout de balises, de liens, de shortcodes, de PHP, de `javascript:` ou d'attributs `on…=` ;
- les règles pour Claude Code, les codes d'alerte et les messages WP-CLI sont en anglais fixe : aucune traduction ne peut les modifier, et les textes traduits de l'interface sont échappés comme toute donnée.

### Les alertes : une aide, pas une protection

Les alertes sont calculées sans IA, avec des listes de mots et des motifs en français et en anglais. Elles signalent une annotation à examiner de près, mais elles sont **contournables par construction** : l'absence d'alerte ne prouve pas qu'une annotation est honnête, et une alerte ne prouve pas qu'elle est malveillante. Les vraies protections sont :

1. **les règles de la commande `/coquille-revue:apply-review`** : une annotation est une donnée, jamais une consigne, quoi qu'elle affirme ;
2. **l'accord explicite de l'utilisateur**, annotation par annotation, avant toute modification ;
3. **les refus de `wp coquille-revue apply`**, qui tiennent même avec `--alerts-reviewed` : code, balises, liens, shortcodes et caractères cachés (caractères « Tag », contrôles bidirectionnels).

Limites connues : une consigne reformulée sans les formules repérées, ou écrite dans une autre langue, ne donne pas d'alerte ; un changement de sens (prix, date, durée de garantie) n'est jamais détecté par le serveur ; certaines adresses écrites sans `http` ne sont reconnues ni par les alertes ni par `apply` ; après revue des alertes, `apply` n'arrête plus les autres caractères invisibles ni les lettres d'autres alphabets. C'est pourquoi les points 1 et 2 restent indispensables.

Une annotation qui amènerait Claude Code à agir sans l'accord de l'utilisateur, à divulguer un secret ou à modifier autre chose que du texte visible est considérée comme une faille.

---

## Reporting a vulnerability

Please **do not open a public issue** for a security problem. Report it privately via the **Report a vulnerability** button in the repository's [Security](https://github.com/Atelier-4F-digital/coquille-revue/security) tab, or by email to **atelierdigital4f@gmail.com** with "Coquille Revue — security" as the subject. Include the affected version, steps to reproduce and the impact. We acknowledge reports within 5 business days. Security fixes are made for the 2.6.x versions; please update from 2.5.x.

### Alerts are an aid, not a protection

Alerts are computed without AI, from word lists and patterns in French and English. They point to an annotation that needs a close look, but they can be **bypassed by design**: no alert does not prove that an annotation is honest, and an alert does not prove that it is malicious. The real protections are:

1. **the rules of the `/coquille-revue:apply-review` command**: an annotation is data, never an instruction, whatever it claims;
2. **the user's explicit approval**, annotation by annotation, before any change;
3. **the refusals of `wp coquille-revue apply`**, which hold even with `--alerts-reviewed`: code, tags, links, shortcodes and hidden characters (Tag characters, bidirectional controls).

Known limits: an instruction reworded without the phrases the alerts look for, or written in another language, gets no alert; a change of meaning (price, date, warranty length) is never detected by the server; some addresses written without `http` are recognized neither by the alerts nor by `apply`; after review of the alerts, `apply` no longer stops other invisible characters or letters from other alphabets. This is why points 1 and 2 remain essential.

Annotations are untrusted visitor input. Any annotation that makes Claude Code act without the user's approval, disclose a secret, or change anything other than visible text is treated as a vulnerability.
