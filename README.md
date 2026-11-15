# Platine

Lecteur audio perso pour beatmakers, en web app installable (PWA) sur iPhone.
Tes sons restent **sur ton téléphone** : rien n'est envoyé en ligne.

## Fonctions (v1)

- Bibliothèque de sons avec pochettes (ou dégradés générés automatiquement)
- Lecteur avec disque vinyle qui tourne (démarrage et freinage doux) et bras de platine
- Forme d'onde : touche ou glisse dessus pour te déplacer dans le son
- **Varispeed** : vitesse et tonalité bougent ensemble, comme sur une platine (de 50 à 150 %)
- **Tempo** : la vitesse change, la tonalité reste la même
- Boutons −1 / +1 demi-ton. Le BPM et la tonalité affichés se recalculent (ex : `G min → A min`, `87 → 97.7 BPM`)
- **Gain de −24 à +12 dB**, avec un limiteur pour éviter la saturation, et un bouton **Normaliser** qui monte un export trop faible jusqu'à −0,3 dBFS
- Boucle A-B, répétition (tous les sons ou un seul), mini-lecteur
- Commandes sur l'écran verrouillé et dans le Centre de contrôle
- Partage du fichier audio d'origine (AirDrop, WhatsApp…)
- Réglages enregistrés pour chaque son. BPM et tonalité repérés dans le nom du fichier (ex : `beat 87bpm Gmin.wav`)

## Mettre l'app en ligne avec GitHub Pages

1. Sur github.com, crée un nouveau dépôt **public**, par exemple `platine`.
2. Sur la page du dépôt : **Add file → Upload files**. Glisse **le contenu** du dossier (`index.html`, `manifest.webmanifest`, `sw.js`, `README.md` et le dossier `icons`), puis **Commit changes**.
3. Va dans **Settings → Pages**. Dans **Source**, choisis **Deploy from a branch**, puis la branche `main` et le dossier `/ (root)`. Clique sur **Save**.
4. Attends une minute. L'app est disponible sur `https://TON-PSEUDO.github.io/platine/`.

## Installer l'app sur l'iPhone

1. Ouvre le lien dans **Safari**.
2. Touche **Partager**, puis **Sur l'écran d'accueil**.
3. Ouvre Platine depuis l'icône, **puis** importe tes sons avec le bouton +.
   Les sons importés dans Safari ne se retrouvent pas dans l'app installée : leur stockage est séparé.

## Mettre à jour l'app

Remplace les fichiers sur GitHub. Dans `sw.js`, change aussi `platine-v1` en `platine-v2` (puis v3, etc.).
Ferme l'app et rouvre-la pour voir la nouvelle version. Tes sons ne sont pas touchés.

## À savoir

- Tes sons sont copiés dans le stockage de l'app. Garde toujours tes originaux dans Fichiers ou iCloud : si tu supprimes l'app, iOS efface aussi ses sons.
- Quand le gain est réglé sur autre chose que 0 dB, le son passe par Web Audio. Selon la version d'iOS, la lecture peut alors se couper quand l'écran est verrouillé. À 0 dB, la lecture passe par le lecteur natif d'iOS : c'est le mode le plus fiable en arrière-plan.
- Changer la tonalité sans changer la vitesse n'est pas encore possible (prévu pour une prochaine version).
