# Platine

Lecteur audio perso pour beatmakers, en web app installable (PWA) sur iPhone.
Tes sons restent **sur ton téléphone** : rien n'est envoyé en ligne.

## Fonctions (v2)

- **Partage** : bouton Partager en haut du lecteur, et sélection multiple (appui long sur un son, ou « Choisir ») pour envoyer plusieurs fichiers d'un coup par WhatsApp, AirDrop…
- **Paramètres** (roue crantée) : normalisation automatique du volume (activée par défaut), loop par défaut, downbeat par défaut, espace utilisé, mise à jour.
- **Versions** : les sons dont le nom commence pareil (ex. « Nolah_… ») sont reconnus comme versions d'une même prod. Pastilles « Versions » dans le lecteur : la bascule garde le même moment musical (même mesure), même si la version est plus courte. Une version sans BPM dans son nom prend celui des autres (affiché « ≈ »).
- **Forme d'onde défilante** : tête de lecture au centre, zoom (pincer ou − / +), vue d'ensemble en dessous, glisser pour se déplacer.
- **Easter egg du disque** : doigt posé = tape stop ; glisse et lâche = le disque est lancé dans ce sens (×2 max), puis l'inertie le ramène à ×1 (ou à l'arrêt en pause).
- **Pochettes abstraites générées** pour les sons sans image : uniques, calculées à partir du nom, hors connexion.
- **Reverse** (bouton REV du lecteur) : lecture à l'envers, en mode Varispeed.
- **Tous les sons** : liste de tous les fichiers avec recherche et tri (récents, A→Z, BPM).
- **Playlists intelligentes** : se remplissent toutes seules selon des règles (dossiers, BPM min/max, texte dans le nom, tonalité).
- **Détection du tempo** (onglet Loop) avec ÷2 / ×2, **lignes de mesures** sur la forme d'onde et **A·B par mesures** : touche A (lecture immédiate au début de la mesure), puis B (lecture 3 s avant la fin, qui enchaîne sur A pour vérifier la jonction). Bouton « Tester la jonction ».
- **Varispeed en temps réel** (Web Audio) : la vitesse change pendant la lecture sans coupure, boutons Réinitialiser
- **Loop ∞ calée sur le BPM** (onglet Loop) : BPM lu dans le nom (`139bp`, `140bpm`, `141BPM`…) ou Tap tempo, downbeat détecté automatiquement (ou « Poser ici »), mesures calculées sans la queue de reverb, queue recollée au début ou coupée. Activée par défaut quand le fichier a un BPM.
- **Synchro d'un dossier** (bouton ⟳) : choisis ton dossier LOOPS dans iCloud Drive. Seuls les nouveaux sons et ceux qui ont changé sont importés, et chaque sous-dossier devient un projet. Tu peux aussi choisir un seul sous-dossier (une semaine) : il n'y aura pas de doublons. Les fichiers MIDI sont ignorés.
- **Projets** classés du plus récent au plus ancien, en vue liste, avec une recherche par nom, BPM ou tonalité
- **Playlists** : bouton ≡+ sur un son (dans une liste ou dans le lecteur), ordre modifiable, lecture enchaînée dans l'ordre de la playlist

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

Remplace les fichiers sur GitHub (au minimum `index.html` et `sw.js`). À chaque mise à jour, augmente le numéro de build au même chiffre à trois endroits : `index.html` (`BUILD`), `sw.js` (`platine-build-N`) et `version.json`. Le numéro s'affiche en bas de l'accueil. Quand une nouvelle version est en ligne, le lien « Mettre à jour » devient orange : touche-le pour recharger l'app (tes sons ne sont pas touchés).
Ferme l'app et rouvre-la pour voir la nouvelle version. Tes sons ne sont pas touchés.

## À savoir

- Tes sons sont copiés dans le stockage de l'app. Garde toujours tes originaux dans Fichiers ou iCloud : si tu supprimes l'app, iOS efface aussi ses sons.
- Quand le gain est réglé sur autre chose que 0 dB, le son passe par Web Audio. Selon la version d'iOS, la lecture peut alors se couper quand l'écran est verrouillé. À 0 dB, la lecture passe par le lecteur natif d'iOS : c'est le mode le plus fiable en arrière-plan.
- Changer la tonalité sans changer la vitesse n'est pas encore possible (prévu pour une prochaine version).
