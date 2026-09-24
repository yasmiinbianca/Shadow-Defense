/**
 * SHADOW DEFENSE - audio.js
 * Motor de Áudio Procedural com Web Audio API
 * Sem dependências externas de arquivos de áudio, 100% autônomo e de alta performance.
 */

class SoundSystem {
  constructor() {
    this.ctx = null;
    this.sfxEnabled = true;
    this.musicEnabled = true;
    this.sfxVolume = 0.6;
    this.musicVolume = 0.35;
    this.musicInterval = null;
    this.musicStep = 0;
    this.masterGain = null;
    this.sfxGain = null;
    this.musicGain = null;
    this.isInitialized = false;
  }

  // Inicializa o contexto de áudio na primeira interação do usuário
  init() {
    if (this.isInitialized) return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContext();

      // Master Nodes
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(1.0, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.setValueAtTime(this.sfxVolume, this.ctx.currentTime);
      this.sfxGain.connect(this.masterGain);

      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.setValueAtTime(this.musicVolume, this.ctx.currentTime);
      this.musicGain.connect(this.masterGain);

      this.isInitialized = true;

      if (this.musicEnabled) {
        this.startMusic();
      }
    } catch (e) {
      console.warn("Web Audio API não suportada ou bloqueada:", e);
    }
  }

  resumeIfNeeded() {
    if (!this.isInitialized) {
      this.init();
    } else if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // Som do Clique no Cristal Sombrio
  playClick() {
    if (!this.sfxEnabled) return;
    this.resumeIfNeeded();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    // Timbre cristalino místico
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(620, t);
    osc.frequency.exponentialRampToValueAtTime(1240, t + 0.04);
    osc.frequency.exponentialRampToValueAtTime(320, t + 0.12);

    gain.gain.setValueAtTime(0.35, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.14);
  }

  // Som de Coleta de Moedas
  playCoin() {
    if (!this.sfxEnabled) return;
    this.resumeIfNeeded();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = 'sine';
    osc2.type = 'triangle';

    osc1.frequency.setValueAtTime(987.77, t); // B5
    osc1.frequency.setValueAtTime(1318.51, t + 0.06); // E6

    osc2.frequency.setValueAtTime(1975.53, t); // B6
    osc2.frequency.setValueAtTime(2637.02, t + 0.06); // E7

    gain.gain.setValueAtTime(0.22, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.sfxGain);

    osc1.start(t);
    osc2.start(t);
    osc1.stop(t + 0.28);
    osc2.stop(t + 0.28);
  }

  // Som de Acerto Crítico (Impacto com brilho ressonante)
  playCrit() {
    if (!this.sfxEnabled) return;
    this.resumeIfNeeded();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    // Sub-bass thump
    const subOsc = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(140, t);
    subOsc.frequency.exponentialRampToValueAtTime(35, t + 0.25);
    subGain.gain.setValueAtTime(0.7, t);
    subGain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    subOsc.connect(subGain);
    subGain.connect(this.sfxGain);
    subOsc.start(t);
    subOsc.stop(t + 0.3);

    // Shimmer chord
    [880, 1108, 1320, 1760].forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t + idx * 0.02);
      gain.gain.setValueAtTime(0.25, t + idx * 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t + idx * 0.02);
      osc.stop(t + 0.35);
    });
  }

  // Disparo das Torres
  playShoot(type) {
    if (!this.sfxEnabled) return;
    this.resumeIfNeeded();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    switch (type) {
      case 'rifle':
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(800, t);
        osc.frequency.exponentialRampToValueAtTime(120, t + 0.12);
        gain.gain.setValueAtTime(0.25, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.12);
        break;

      case 'cannon':
      case 'splash':
        // Explosão com ruído sintetizado
        this.playExplosion();
        return;

      case 'electric':
      case 'chain_lightning':
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(1200 + Math.random() * 300, t);
        osc.frequency.linearRampToValueAtTime(300, t + 0.09);
        gain.gain.setValueAtTime(0.2, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
        break;

      case 'slow_ice':
      case 'ice':
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1200, t);
        osc.frequency.linearRampToValueAtTime(1900, t + 0.14);
        gain.gain.setValueAtTime(0.2, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.15);
        break;

      case 'beam':
      case 'chaos_nova':
        osc.type = 'square';
        osc.frequency.setValueAtTime(350, t);
        osc.frequency.exponentialRampToValueAtTime(950, t + 0.15);
        gain.gain.setValueAtTime(0.18, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.18);
        break;

      case 'pistol':
      default:
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(450, t);
        osc.frequency.exponentialRampToValueAtTime(140, t + 0.08);
        gain.gain.setValueAtTime(0.25, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.08);
        break;
    }

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.2);
  }

  // Som de Explosão
  playExplosion() {
    if (!this.sfxEnabled) return;
    this.resumeIfNeeded();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const dur = 0.45;

    // Buffer de Ruído Branco filtrado
    const bufferSize = this.ctx.sampleRate * dur;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(600, t);
    filter.frequency.exponentialRampToValueAtTime(60, t + dur);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    noise.start(t);
  }

  // Som de Morte de Inimigo
  playEnemyDeath(isBoss = false) {
    if (!this.sfxEnabled) return;
    this.resumeIfNeeded();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    if (isBoss) {
      // Rugido estrondoso de derrota de Boss
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(160, t);
      osc.frequency.exponentialRampToValueAtTime(30, t + 0.8);
      gain.gain.setValueAtTime(0.6, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.8);
      this.playExplosion();
    } else {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(220, t);
      osc.frequency.exponentialRampToValueAtTime(80, t + 0.12);
      gain.gain.setValueAtTime(0.2, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.12);
    }

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + (isBoss ? 0.8 : 0.12));
  }

  // Alerta de Boss Entrando em Campo
  playBossSpawn() {
    if (!this.sfxEnabled) return;
    this.resumeIfNeeded();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(65, t);
    osc.frequency.linearRampToValueAtTime(110, t + 0.4);
    osc.frequency.linearRampToValueAtTime(55, t + 0.9);

    gain.gain.setValueAtTime(0.45, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 1.0);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 1.0);
  }

  // Fanfarra de Vitória
  playVictory() {
    if (!this.sfxEnabled) return;
    this.resumeIfNeeded();
    if (!this.ctx) return;

    const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99]; // C Major arpeggio épico
    const t = this.ctx.currentTime;

    notes.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t + i * 0.12);
      gain.gain.setValueAtTime(0.3, t + i * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.12 + 0.4);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t + i * 0.12);
      osc.stop(t + i * 0.12 + 0.45);
    });
  }

  // Som de Game Over
  playDefeat() {
    if (!this.sfxEnabled) return;
    this.resumeIfNeeded();
    if (!this.ctx) return;

    const notes = [293.66, 261.63, 220.00, 146.83]; // D minor decadente
    const t = this.ctx.currentTime;

    notes.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, t + i * 0.25);
      gain.gain.setValueAtTime(0.3, t + i * 0.25);
      gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.25 + 0.5);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t + i * 0.25);
      osc.stop(t + i * 0.25 + 0.55);
    });
  }

  // Som de Upgrade Realizado
  playUpgrade() {
    if (!this.sfxEnabled) return;
    this.resumeIfNeeded();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    [440, 554.37, 659.25, 880].forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t + idx * 0.07);
      gain.gain.setValueAtTime(0.2, t + idx * 0.07);
      gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.07 + 0.22);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t + idx * 0.07);
      osc.stop(t + idx * 0.07 + 0.25);
    });
  }

  // Trilha Sonora Sombria Procedural (Dark Ambient Synth)
  startMusic() {
    if (this.musicInterval) return;
    this.resumeIfNeeded();

    // Escala menor sombria em D: D, F, G, A, C
    const scale = [146.83, 174.61, 196.00, 220.00, 261.63, 293.66, 349.23, 392.00];
    const bassNotes = [73.42, 65.41, 58.27, 87.31]; // D2, C2, Bb1, F2

    this.musicInterval = setInterval(() => {
      if (!this.musicEnabled || !this.ctx || this.ctx.state !== 'running') return;
      const t = this.ctx.currentTime;

      // Baixo sombrio a cada 4 tempos
      if (this.musicStep % 4 === 0) {
        const bassFreq = bassNotes[(this.musicStep / 4) % bassNotes.length];
        const bassOsc = this.ctx.createOscillator();
        const bassFilter = this.ctx.createBiquadFilter();
        const bGain = this.ctx.createGain();

        bassOsc.type = 'sawtooth';
        bassOsc.frequency.setValueAtTime(bassFreq, t);

        bassFilter.type = 'lowpass';
        bassFilter.frequency.setValueAtTime(280, t);
        bassFilter.frequency.exponentialRampToValueAtTime(110, t + 1.8);

        bGain.gain.setValueAtTime(0.18, t);
        bGain.gain.exponentialRampToValueAtTime(0.001, t + 2.0);

        bassOsc.connect(bassFilter);
        bassFilter.connect(bGain);
        bGain.connect(this.musicGain);

        bassOsc.start(t);
        bassOsc.stop(t + 2.0);
      }

      // Arpejo místico sutil
      if (Math.random() > 0.3) {
        const note = scale[Math.floor(Math.random() * scale.length)];
        const padOsc = this.ctx.createOscillator();
        const padGain = this.ctx.createGain();

        padOsc.type = 'sine';
        padOsc.frequency.setValueAtTime(note, t);

        padGain.gain.setValueAtTime(0.06, t);
        padGain.gain.exponentialRampToValueAtTime(0.001, t + 0.9);

        padOsc.connect(padGain);
        padGain.connect(this.musicGain);

        padOsc.start(t);
        padOsc.stop(t + 0.95);
      }

      this.musicStep++;
    }, 550);
  }

  stopMusic() {
    if (this.musicInterval) {
      clearInterval(this.musicInterval);
      this.musicInterval = null;
    }
  }

  toggleMusic() {
    this.musicEnabled = !this.musicEnabled;
    if (this.musicEnabled) {
      this.startMusic();
    } else {
      this.stopMusic();
    }
    return this.musicEnabled;
  }

  toggleSFX() {
    this.sfxEnabled = !this.sfxEnabled;
    return this.sfxEnabled;
  }
}

// Instância global única
const audio = new SoundSystem();
