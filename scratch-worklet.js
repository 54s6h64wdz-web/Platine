/* =========================================================
   Platine — moteur de scratch (AudioWorklet)
   Lit le son échantillon par échantillon à une vitesse variable,
   y compris en marche arrière.
   - drag  : la tête de lecture suit le doigt (lissé sur 25 ms) :
             vitesse et sens viennent du mouvement de la main.
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
        this.pos = d.pos * this.bsr; this.target = this.pos; this.v = 0;
        this.mode = 'drag'; this.gTarget = 1; this.stopping = false; this.loop = d.loop; this.ended = false;
        break;
      case 'drag': this.target = d.pos * this.bsr; break;
      case 'release': this.mode = 'spin'; this.tv = d.targetRate * k; this.loop = d.loop; this.settled = false; break;
      case 'target': this.tv = d.targetRate * k; this.settled = false; break;
      case 'stop': this.gTarget = 0; this.stopping = true; break;
    }
  }
  process(inputs, outputs) {
    const out = outputs[0], n = out[0].length;
    if (!this.ch || (this.mode === 'idle' && this.g < 1e-4)) { for (const o of out) o.fill(0); return true; }
    const sr = sampleRate, bsr = this.bsr;
    const kDrag = 1 - Math.exp(-1 / (sr * 0.025));
    const speedingUp = Math.abs(this.tv) > Math.abs(this.v);
    const kSpin = 1 - Math.exp(-1 / (sr * (speedingUp ? 0.32 : (this.tv === 0 ? 0.35 : 0.3))));
    const kG = 1 - Math.exp(-1 / (sr * 0.004));
    const kFric = Math.exp(-1 / (sr * 0.3)), brake = 2.5 * (bsr / sr) / sr;   // perd 2,5× la vitesse normale par seconde
    const a = 0.995, L = this.loop, nc = this.ch.length, last = this.len - 2;
    for (let i = 0; i < n; i++) {
      if (this.mode === 'drag') { const np = this.pos + (this.target - this.pos) * kDrag; this.v = np - this.pos; this.pos = np; }
      else if (this.mode === 'spin') {
        if (this.tv === 0) {                          // frein (lecture en pause) : friction + freinage constant, arrêt net
          this.v *= kFric; const dv = brake * Math.sign(this.v);
          this.v = Math.abs(this.v) <= Math.abs(dv) ? 0 : this.v - dv;
        } else this.v += (this.tv - this.v) * kSpin;  // moteur : retour en douceur à la vitesse de lecture
        this.pos += this.v;
      }
      if (L && this.v > 0 && this.pos >= L[1] * bsr) this.pos -= (L[1] - L[0]) * bsr;     // boucle active
      if (this.pos < 0) { this.pos = 0; if (this.mode === 'spin' && this.v < 0) this.v = 0; }
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
      const tol = this.tv === 0 ? 1e-9 : 0.006 * Math.abs(this.tv);
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
