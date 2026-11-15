/* =========================================================
   Platine pour Mac — coque Electron
   - Affiche Platine depuis le site GitHub (mises à jour automatiques),
     avec repli sur la copie embarquée si pas de connexion.
   - Donne au site un accès direct aux dossiers audio choisis
     (lecture seule, uniquement ces dossiers), sans rien copier.
   - Fonctions Mac : Finder, partage macOS, glisser vers d'autres apps,
     surveillance des dossiers (nouveaux fichiers détectés tout seuls).
   ========================================================= */
const { app, BrowserWindow, ipcMain, dialog, shell, ShareMenu, nativeImage, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const fsp = fs.promises;
const { execFile } = require('child_process');

const REMOTE = 'https://54s6h64wdz-web.github.io/Platine/';
const AUDIO = /\.(wav|wave|aif|aiff|mp3|m4a|aac|flac|caf)$/i;
let win = null;

/* Dossiers autorisés (choisis par l'utilisateur), mémorisés entre les lancements */
const rootsFile = () => path.join(app.getPath('userData'), 'dossiers.json');
let roots = new Set();
function loadRoots() { try { roots = new Set(JSON.parse(fs.readFileSync(rootsFile(), 'utf8'))); } catch (e) { roots = new Set(); } }
function saveRoots() { try { fs.writeFileSync(rootsFile(), JSON.stringify([...roots])); } catch (e) {} }
const allowed = p => { const r = path.resolve(p); for (const root of roots) if (r === root || r.startsWith(root + path.sep)) return true; return false; };

function createWindow() {
  win = new BrowserWindow({
    width: 1320, height: 860, minWidth: 420, minHeight: 640,
    backgroundColor: '#0f0f10', title: 'Platine',
    titleBarStyle: 'hiddenInset', trafficLightPosition: { x: 16, y: 16 },
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, sandbox: false }
  });
  const local = path.join(__dirname, 'web', 'index.html');
  const useLocal = process.argv.includes('--local') || !app.isPackaged && fs.existsSync(local) && process.env.PLATINE_LOCAL;
  if (useLocal) win.loadFile(local);
  else win.loadURL(REMOTE).catch(() => win.loadFile(local));
  win.webContents.on('did-fail-load', (e, code, desc, url, isMain) => { if (isMain && url.startsWith('http')) win.loadFile(local); });
  // les liens externes s'ouvrent dans le navigateur, la fenêtre reste sur Platine
  win.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: 'deny' }; });
  win.webContents.on('will-navigate', (e, url) => { if (!url.startsWith(REMOTE) && !url.startsWith('file://')) { e.preventDefault(); shell.openExternal(url); } });
}

/* ---------- API pour le site ---------- */
ipcMain.handle('chooseFolder', async () => {
  const icloud = path.join(app.getPath('home'), 'Library', 'Mobile Documents', 'com~apple~CloudDocs');
  const r = await dialog.showOpenDialog(win, {
    title: 'Dossier à synchroniser', buttonLabel: 'Synchroniser ce dossier',
    properties: ['openDirectory'], defaultPath: fs.existsSync(icloud) ? icloud : app.getPath('music')
  });
  if (r.canceled || !r.filePaths[0]) return null;
  const p = path.resolve(r.filePaths[0]); roots.add(p); saveRoots();
  return p;
});
ipcMain.handle('roots', () => [...roots]);
ipcMain.handle('forgetRoot', (e, p) => { roots.delete(path.resolve(p)); saveRoots(); stopWatch(p); return true; });

// Liste des sons d'un dossier (récursif). Les fichiers iCloud non téléchargés
// (« .nom.wav.icloud ») sont listés aussi : ils seront téléchargés à la lecture.
ipcMain.handle('scan', async (e, root) => {
  root = path.resolve(root); if (!allowed(root)) return { error: 'Dossier non autorisé' };
  const base = path.dirname(root), out = [];
  async function walk(d) {
    let ents; try { ents = await fsp.readdir(d, { withFileTypes: true }); } catch (err) { return; }
    for (const en of ents) {
      const p = path.join(d, en.name);
      if (en.isDirectory()) { if (!en.name.startsWith('.')) await walk(p); continue; }
      let name = en.name, cloud = false;
      const m = /^\.(.+)\.icloud$/.exec(name);
      if (m) { name = m[1]; cloud = true; } else if (name.startsWith('.')) continue;
      if (!AUDIO.test(name)) continue;
      const real = path.join(d, name);
      try {
        const st = await fsp.stat(p);
        out.push({ path: real, rel: path.relative(base, real).split(path.sep).join('/'), size: cloud ? 0 : st.size, mtime: st.mtimeMs, cloud });
      } catch (err) {}
    }
  }
  await walk(root);
  return { files: out };
});

async function ensureLocal(p) {
  if (fs.existsSync(p)) return;
  const ph = path.join(path.dirname(p), '.' + path.basename(p) + '.icloud');
  if (!fs.existsSync(ph)) throw new Error('Fichier introuvable');
  await new Promise(res => execFile('brctl', ['download', p], () => res()));
  for (let i = 0; i < 240 && !fs.existsSync(p); i++) await new Promise(r => setTimeout(r, 500));   // jusqu'à 2 min
  if (!fs.existsSync(p)) throw new Error('Téléchargement iCloud trop long');
}
ipcMain.handle('readFile', async (e, p) => {
  if (!allowed(p)) throw new Error('Fichier hors des dossiers autorisés');
  await ensureLocal(p);
  const b = await fsp.readFile(p);
  return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
});
ipcMain.handle('share', async (e, paths) => {
  paths = (paths || []).filter(allowed);
  if (!paths.length) return false;
  for (const p of paths) await ensureLocal(p).catch(() => {});
  const menu = new ShareMenu({ filePaths: paths });
  menu.popup({ window: win });
  return true;
});
ipcMain.on('reveal', (e, p) => { if (allowed(p)) shell.showItemInFolder(p); });
const dragIcon = () => { try { return nativeImage.createFromPath(path.join(__dirname, 'build', 'icon.png')).resize({ width: 48, height: 48 }); } catch (e) { return nativeImage.createEmpty(); } };
ipcMain.on('drag', (e, paths) => {
  paths = (paths || []).filter(p => allowed(p) && fs.existsSync(p));
  if (!paths.length) return;
  e.sender.startDrag({ file: paths[0], files: paths, icon: dragIcon() });
});

/* Surveillance des dossiers : prévient le site quand un son apparaît / change */
const watchers = new Map(), timers = new Map();
function stopWatch(root) { const w = watchers.get(root); if (w) { w.close(); watchers.delete(root); } }
ipcMain.handle('watch', (e, root) => {
  root = path.resolve(root); if (!allowed(root) || watchers.has(root)) return true;
  try {
    const w = fs.watch(root, { recursive: true }, (ev, f) => {
      if (!f || !(AUDIO.test(f) || /\.icloud$/.test(f) || !path.extname(f))) return;
      clearTimeout(timers.get(root));
      timers.set(root, setTimeout(() => { if (win) win.webContents.send('fs-change', root); }, 1500));
    });
    watchers.set(root, w);
  } catch (err) {}
  return true;
});

/* Menu de l'app (raccourcis standards copier/coller, plein écran…) */
function buildMenu() {
  const t = [
    { label: 'Platine', submenu: [{ role: 'about', label: 'À propos de Platine' }, { type: 'separator' }, { role: 'hide', label: 'Masquer Platine' }, { role: 'hideOthers', label: 'Masquer les autres' }, { type: 'separator' }, { role: 'quit', label: 'Quitter Platine' }] },
    { label: 'Édition', submenu: [{ role: 'undo', label: 'Annuler' }, { role: 'redo', label: 'Rétablir' }, { type: 'separator' }, { role: 'cut', label: 'Couper' }, { role: 'copy', label: 'Copier' }, { role: 'paste', label: 'Coller' }, { role: 'selectAll', label: 'Tout sélectionner' }] },
    { label: 'Présentation', submenu: [{ role: 'reload', label: 'Recharger' }, { role: 'forceReload', label: 'Forcer le rechargement' }, { role: 'toggleDevTools', label: 'Outils de développement' }, { type: 'separator' }, { role: 'resetZoom', label: 'Taille réelle' }, { role: 'zoomIn', label: 'Zoom avant' }, { role: 'zoomOut', label: 'Zoom arrière' }, { type: 'separator' }, { role: 'togglefullscreen', label: 'Plein écran' }] },
    { label: 'Fenêtre', submenu: [{ role: 'minimize', label: 'Réduire' }, { role: 'zoom', label: 'Agrandir' }, { role: 'front', label: 'Tout ramener au premier plan' }] }
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(t));
}

app.whenReady().then(() => { loadRoots(); buildMenu(); createWindow(); });
app.on('activate', () => { if (!win) createWindow(); });
app.on('window-all-closed', () => app.quit());
