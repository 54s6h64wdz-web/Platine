/* =========================================================
   Platine — moteur de scratch (AudioWorklet)
   Lit le son échantillon par échantillon à une vitesse variable,
   y compris en marche arrière.
   - hold  : doigt posé sur le disque → tape stop (freinage jusqu'à l'arrêt).
   - follow: le disque tourne sous le doigt → le son suit, plafonné à ×2
             (en avant comme en arrière), avec l'inertie du plateau.
   - spin  : doigt relâché : le plateau garde son élan puis revient
             doucement à la vitesse de lecture (moteur de platine)
             ou s'arrête (si la lecture était en pause).
   ========================================================= */
class ScratchProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.ch = null; this.len = 0; this.bsr = sampleRate;
    this.mode = 'idle'; this.pos = 0; this.v = 0; this.target = 0; this.tv = 0;
    this.loop = null; this.g = 0; this.gTarget = 0; this.stopping = false;
    this.cnt = 0; this.settled = true; this.ended = false;
    this.hpX = [0, 0]; this.hpY = [0, 0];            // anti-continu (évite le « pop » doigt immobile)
    this.port.onmessage = e => this.onMsg(e.data);
  }
  onMsg(d) {
    const k = this.bsr / sampleRate;                 // échantillons du son par échantillon de sortie
    switch (d.type) {
      case 'load': this.ch = d.channels; this.len = d.channels[0].length; this.bsr = d.sampleRate; break;
      case 'start':
        this.pos = d.pos * this.bsr; this.target = this.pos; this.v = (d.rate || 0) * k;
        this.vmax = (d.vmax || 2) * k; this.brake = k / (0.28 * sampleRate);   // tape stop : ×1 → 0 en 0,28 s
        this.mode = 'hold'; this.gTarget = 1; this.stopping = false; this.loop = d.loop; this.ended = false;
        break;
      case 'drag':                                   // d.delta : rotation du disque depuis le toucher (en secondes de son)
        if (this.mode === 'hold') { this.anchor = this.pos - d.delta * this.bsr; this.mode = 'follow'; }
        if (this.mode === 'follow') this.target = this.anchor + d.delta * this.bsr;
        break;
      case 'release':                                // lancer : vitesse de départ donnée par le geste
        if (typeof d.v0 === 'number') this.v = d.v0 * k;
        this.mode = 'spin'; this.tv = d.targetRate * k; this.loop = d.loop; this.settled = false; break;
      case 'target': this.tv = d.targetRate * k; this.settled = false; break;
      case 'stop': this.gTarget = 0; this.stopping = true; break;
    }
  }
  process(inputs, outputs) {
    const out = outputs[0], n = out[0].length;
    if (!this.ch || (this.mode === 'idle' && this.g < 1e-4)) { for (const o of out) o.fill(0); return true; }
    const sr = sampleRate, bsr = this.bsr;
    const kSlew = 1 - Math.exp(-1 / (sr * 0.08)), follow = 1 / (sr * 0.07), vmax = this.vmax || 2 * bsr / sr;
    const one = bsr / sr;                            // vitesse ×1 (échantillons du son par échantillon de sortie)
    const acc = (this.tv === 0 ? 0.7 : 0.45) * one / sr;   // couple du moteur : 0,45× par seconde (frein : 0,7×/s)
    const near = 0.18 * one, kEase = 1 - Math.exp(-1 / (sr * 0.35));     // inertie du plateau au lâcher
    const kG = 1 - Math.exp(-1 / (sr * 0.004));
    const a = 0.995, L = this.loop, nc = this.ch.length, last = this.len - 2;
    for (let i = 0; i < n; i++) {
      if (this.mode === 'hold') {                     // tape stop
        this.v = Math.abs(this.v) <= this.brake ? 0 : this.v - this.brake * Math.sign(this.v);
        this.pos += this.v;
      } else if (this.mode === 'follow') {            // le son suit le disque, plafonné à ×2
        let vd = (this.target - this.pos) * follow;
        vd = vd > vmax ? vmax : vd < -vmax ? -vmax : vd;
        this.v += (vd - this.v) * kSlew;
        this.pos += this.v;
      }
      else if (this.mode === 'spin') {
        // Plateau lourd : il garde son élan dans le sens du lancer, et le moteur
        // (couple limité) le ramène lentement et régulièrement à la vitesse réglée,
        // avec une arrivée en douceur sur la fin.
        const diff = this.tv - this.v;
        if (Math.abs(diff) > near) this.v += (diff > 0 ? acc : -acc);
        else this.v += diff * kEase;
        if (this.tv === 0 && Math.abs(this.v) < 0.003 * one) this.v = 0;
        if (this.v > vmax) this.v = vmax; else if (this.v < -vmax) this.v = -vmax;
        this.pos += this.v;
      }
      if (L && this.v > 0 && this.pos >= L[1] * bsr) this.pos -= (L[1] - L[0]) * bsr;     // boucle active
      else if (L && this.v < 0 && this.pos < L[0] * bsr) this.pos += (L[1] - L[0]) * bsr;  // boucle en reverse
      if (this.pos < 0) {
        this.pos = 0;
        if (this.mode === 'spin' && this.v < 0 && this.tv < 0 && !this.ended) { this.ended = true; this.port.postMessage({ type: 'end' }); }
        if (this.mode === 'spin' && this.v < 0) this.v = 0;
      }
      if (this.pos > last) {
        this.pos = last;
        if (this.mode === 'spin' && this.v > 0 && !this.ended) { this.ended = true; this.port.postMessage({ type: 'end' }); }
        if (this.mode === 'spin') this.v = 0;
      }
      this.g += (this.gTarget - this.g) * kG;
      const p = this.pos, i0 = p | 0, f = p - i0;
      for (let c = 0; c < out.length; c++) {
        const d = this.ch[c < nc ? c : nc - 1];
        const x = d[i0] + (d[i0 + 1] - d[i0]) * f;
        const cc = c & 1, y = x - this.hpX[cc] + a * this.hpY[cc];
        this.hpX[cc] = x; this.hpY[cc] = y;
        out[c][i] = y * this.g;
      }
    }
    if (this.stopping && this.g < 1e-3) { this.mode = 'idle'; this.stopping = false; this.g = 0; }
    if (this.mode === 'spin' && !this.settled) {
      const tol = this.tv === 0 ? 1e-9 : 0.01 * Math.abs(this.tv);
      if (Math.abs(this.v - this.tv) <= tol) {
        this.settled = true; this.v = this.tv;
        this.port.postMessage({ type: 'settled', pos: this.pos / bsr, rate: this.tv * sr / bsr, time: currentTime });
      }
    }
    if ((++this.cnt & 3) === 0 && this.mode !== 'idle') this.port.postMessage({ type: 'pos', pos: this.pos / bsr, rate: this.v * sr / bsr, time: currentTime });
    return true;
  }
}
registerProcessor('scratch', ScratchProcessor);
