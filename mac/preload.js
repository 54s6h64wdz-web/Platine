/* Pont entre l'app Mac et le site Platine : n'est exposé qu'au site de Platine
   (ou à sa copie embarquée), jamais à une autre page. */
const { contextBridge, ipcRenderer } = require('electron');
const ok = location.protocol === 'file:' || location.origin === 'https://54s6h64wdz-web.github.io';
if (ok) contextBridge.exposeInMainWorld('platineDesktop', {
  platform: process.platform,
  version: '1.0.0',
  chooseFolder: () => ipcRenderer.invoke('chooseFolder'),
  roots: () => ipcRenderer.invoke('roots'),
  forgetRoot: p => ipcRenderer.invoke('forgetRoot', p),
  scan: root => ipcRenderer.invoke('scan', root),
  readFile: p => ipcRenderer.invoke('readFile', p),
  share: paths => ipcRenderer.invoke('share', paths),
  reveal: p => ipcRenderer.send('reveal', p),
  startDrag: paths => ipcRenderer.send('drag', paths),
  watch: root => ipcRenderer.invoke('watch', root),
  onChange: cb => ipcRenderer.on('fs-change', (e, root) => cb(root))
});
