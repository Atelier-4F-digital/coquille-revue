# Sécurité / Security

## Signaler une faille

Merci de **ne pas ouvrir de ticket public** pour une faille de sécurité. Signalez-la en privé :

- de préférence avec le bouton **Report a vulnerability** de l'onglet [Security](https://github.com/Atelier-4F-digital/coquille-revue/security) du dépôt ;
- sinon par e-mail à **atelierdigital4f@gmail.com**, avec « Coquille Revue — sécurité » en objet.

Indiquez la version concernée, les étapes pour reproduire le problème et son impact. Nous accusons réception sous 5 jours ouvrés et vous tenons informé jusqu'à la correction. Nous citons volontiers la personne qui a signalé la faille, si elle le souhaite.

## Versions suivies

| Version                                               | Correctifs de sécurité |
| ----------------------------------------------------- | ---------------------- |
| 2.5.x                                                 | Oui                    |
| Versions antérieures (nom interne « Content Review ») | Non                    |

## Modèle de menace

Les annotations sont écrites par des visiteurs, souvent anonymes. Elles sont traitées comme des **données non fiables** :

- l'extension ne les exécute ni ne les affiche sans échappement ;
- les règles fournies à Claude Code (export et plugin Claude Code) interdisent de suivre une consigne contenue dans une annotation, d'appliquer quoi que ce soit sans l'accord de l'utilisateur, et de placer le texte d'une annotation dans une ligne de commande ;
- les commandes WP-CLI lisent le texte dans la base à partir du numéro et refusent l'ajout de code, de balises ou de liens.

Une annotation qui amènerait Claude Code à agir sans l'accord de l'utilisateur, à divulguer un secret ou à modifier autre chose que du texte visible est considérée comme une faille.

---

## Reporting a vulnerability

Please **do not open a public issue** for a security problem. Report it privately via the **Report a vulnerability** button in the repository's [Security](https://github.com/Atelier-4F-digital/coquille-revue/security) tab, or by email to **atelierdigital4f@gmail.com** with "Coquille Revue — security" as the subject. Include the affected version, steps to reproduce and the impact. We acknowledge reports within 5 business days.

Annotations are untrusted visitor input. Any annotation that makes Claude Code act without the user's approval, disclose a secret, or change anything other than visible text is treated as a vulnerability.
