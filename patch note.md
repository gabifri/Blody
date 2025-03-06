# Patch Note Blody 1.4.2

La version 1.4.2 est la version la plus récente, améliorant et étendant les fonctionnalités de la version 1.6 (anciennement 1.0.6). Voici les principales nouveautés, corrections et ajouts :

## Nouveautés & Améliorations

### 1. Personnalisation avancée
- **Nombre de lettres en gras configurable** : L’utilisateur peut désormais choisir d'afficher de 1 à 4 lettres en gras par mot. Si le mot est trop court, seule la première lettre est mise en gras.
- **Option de couleur** : Choix entre le mode "Auto" (adaptation à la couleur du texte) et une couleur personnalisée pour le texte mis en gras.
- **Mode aléatoire** : Possibilité d'activer un mode aléatoire pour varier le nombre de lettres en gras par mot, entre 1 et la valeur définie par l'utilisateur.

### 2. Interface utilisateur enrichie
- **Popup améliorée** :  
  - Réglage du nombre de lettres en gras.
  - Sélection entre le mode couleur "Auto" ou "Custom" avec choix de couleur.
  - Activation/désactivation du mode aléatoire.
  - Réglage de la vitesse de lecture pour la fonctionnalité de text-to-speech.
  - Gestion d'une liste noire pour exclure certains domaines.
  - Définition et modification du raccourci clavier (par défaut Alt+Shift+B).
  - Bouton de réinitialisation pour restaurer les réglages par défaut.

### 3. Fonctionnalités de lecture audio
- **Text-to-Speech intégré** :  
  - Permet de lire le contenu de la page avec des commandes Play, Pause et Resume.
  - Contrôle de la vitesse de lecture via un slider dans l'interface.

### 4. Commandes et contextes étendus
- **Raccourci clavier** : Un raccourci permet désormais d'activer ou désactiver rapidement l'extension directement depuis la page.
- **Background Script & Menus contextuels** :  
  - Ajout d’un service worker pour gérer les commandes clavier et le menu contextuel, facilitant l'interaction avec l'extension.

### 5. Traitement du texte amélioré
- **Détection des zones éditables** : Le script évite désormais de modifier le texte dans les champs de saisie, textarea, et autres éléments éditables.
- **Optimisation pour PDF** : Une détection spécifique des couches de texte dans les fichiers PDF permet un traitement adapté.

## Corrections & Optimisations

- **Performance optimisée** : Le traitement par lots des nœuds texte est optimisé pour réduire l’impact sur le fil principal.
- **Prévention du retraitement** : Mise en place d’un marquage pour éviter de retravailler plusieurs fois un même nœud texte.
- **Compatibilité améliorée** : Le style CSS est injecté de façon dynamique afin de mieux s’adapter aux différentes mises en page des sites web.

## Remarques

- Cette mise à jour vise à offrir une expérience plus riche et personnalisable pour aider les personnes dyslexiques, en combinant des fonctionnalités avancées de personnalisation visuelle et de lecture audio.
- Des améliorations futures pourront inclure une gestion encore plus fine des contenus dans les iframes et des options supplémentaires basées sur les retours utilisateurs.

---

*Blody* continue d’évoluer pour répondre au mieux aux besoins de ses utilisateurs. Vos retours restent essentiels pour orienter les prochaines versions.
