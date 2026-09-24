/**
 * SHADOW DEFENSE - clicker.js
 * Mecânica Principal do Cristal Sombrio, Combos, Acertos Críticos e Geração Ociosa (Idle)
 */

class ClickerSystem {
  constructor() {
    this.crystalElement = null;
    this.comboBarElement = null;
    this.comboTimeRemaining = 0;
    this.idleAccumulator = 0;
    this.lastTimestamp = performance.now();
  }

  init() {
    this.crystalElement = document.getElementById('dark-crystal-btn');
    this.comboBarElement = document.getElementById('combo-progress-fill');

    if (this.crystalElement) {
      this.crystalElement.addEventListener('click', (e) => this.handleCrystalClick(e));
      // Suporte a toque ágil em celulares/tablets
      this.crystalElement.addEventListener('touchstart', (e) => {
        e.preventDefault();
        this.handleCrystalClick(e.touches[0]);
      }, { passive: false });
    }
  }

  // Manipulador do Clique no Cristal Sombrio
  handleCrystalClick(e) {
    const now = performance.now();

    // 1. Atualização do Combo
    state.combo++;
    if (state.combo > state.highestCombo) {
      state.highestCombo = state.combo;
    }
    this.comboTimeRemaining = state.getComboDecayTime();

    // 2. Cálculo de Moedas por Clique e Acerto Crítico
    const baseCpc = state.getCoinsPerClick();
    const isCrit = Math.random() < state.getCritChance();
    const critMult = state.getCritMultiplier();
    const finalCoins = isCrit ? Math.floor(baseCpc * critMult) : baseCpc;

    // Adiciona moedas e contabiliza estatísticas
    state.addCoins(finalCoins);
    state.totalClicks++;

    // 3. Efeitos Visuais & Sonoros
    if (isCrit) {
      audio.playCrit();
      particles.triggerScreenShake(7, 0.28);
      this.spawnCrystalParticles(e, 35, ['#facc15', '#f43f5e', '#ffffff'], 220);
      this.spawnFloatingNumber(e, `CRÍTICO! +${finalCoins} 🪙`, '#facc15', true);
    } else {
      audio.playClick();
      this.spawnCrystalParticles(e, 14, ['#c084fc', '#a855f7', '#fef08a'], 130);
      this.spawnFloatingNumber(e, `+${finalCoins}`, '#fef08a', false);
    }

    // Animação de pulso no elemento HTML do cristal
    if (this.crystalElement) {
      this.crystalElement.classList.remove('crystal-pulse');
      void this.crystalElement.offsetWidth; // Force reflow
      this.crystalElement.classList.add('crystal-pulse');
    }

    // Checar conquistas
    state.checkAchievements();

    // Atualizar HUD
    if (window.ui) {
      window.ui.updateClickerUI();
      window.ui.updateHUD();
    }
  }

  // Partículas na área do cristal (Canvas Flutuante ou Coordenadas)
  spawnCrystalParticles(e, count, colors, speedMax) {
    if (!this.crystalElement) return;
    const rect = this.crystalElement.getBoundingClientRect();
    const x = e && e.clientX ? e.clientX : rect.left + rect.width / 2;
    const y = e && e.clientY ? e.clientY : rect.top + rect.height / 2;

    // Criar elementos DOM dinâmicos de faíscas rápidas
    const container = document.getElementById('crystal-particles-container') || document.body;
    for (let i = 0; i < Math.min(count, 15); i++) {
      const spark = document.createElement('div');
      spark.className = 'dom-particle';
      const angle = Math.random() * Math.PI * 2;
      const dist = 30 + Math.random() * (speedMax * 0.4);
      const destX = Math.cos(angle) * dist;
      const destY = Math.sin(angle) * dist;
      const color = colors[Math.floor(Math.random() * colors.length)];

      spark.style.cssText = `
        left: ${x}px;
        top: ${y}px;
        background: ${color};
        box-shadow: 0 0 8px ${color};
        --destX: ${destX}px;
        --destY: ${destY}px;
      `;
      container.appendChild(spark);
      setTimeout(() => spark.remove(), 600);
    }
  }

  // Número Flutuante HTML
  spawnFloatingNumber(e, text, color, isCrit) {
    if (!this.crystalElement) return;
    const rect = this.crystalElement.getBoundingClientRect();
    const x = (e && e.clientX ? e.clientX : rect.left + rect.width / 2) + (Math.random() * 30 - 15);
    const y = (e && e.clientY ? e.clientY : rect.top + rect.height / 2) - 10;

    const floater = document.createElement('div');
    floater.className = `dom-floating-text ${isCrit ? 'crit' : ''}`;
    floater.textContent = text;
    floater.style.left = `${x}px`;
    floater.style.top = `${y}px`;
    floater.style.color = color;

    document.body.appendChild(floater);
    setTimeout(() => floater.remove(), isCrit ? 1000 : 750);
  }

  // Loop de Atualização do Combo e Geração Ociosa (Idle GPS)
  update(dt) {
    // 1. Atualizar Decay do Combo
    if (this.comboTimeRemaining > 0) {
      this.comboTimeRemaining -= dt * 1000;
      if (this.comboTimeRemaining <= 0) {
        this.comboTimeRemaining = 0;
        if (state.combo > 0) {
          state.combo = 0;
          if (window.ui) {
            window.ui.showToast('O combo sombrio expirou!', 'red');
            window.ui.updateClickerUI();
          }
        }
      }
    }

    // 2. Atualizar Barra de Progresso do Combo na UI
    if (this.comboBarElement) {
      const maxDecay = state.getComboDecayTime();
      const pct = maxDecay > 0 ? Math.max(0, (this.comboTimeRemaining / maxDecay) * 100) : 0;
      this.comboBarElement.style.width = `${pct}%`;
    }

    // 3. Geração Automática de Moedas (Idle GPS)
    const gps = state.getCoinsPerSecond();
    if (gps > 0) {
      this.idleAccumulator += gps * dt;
      if (this.idleAccumulator >= 1) {
        const coinsToAdd = Math.floor(this.idleAccumulator);
        this.idleAccumulator -= coinsToAdd;
        state.addCoins(coinsToAdd);
        if (window.ui) window.ui.updateHUD();
      }
    }

    // 4. Contabilização do Tempo de Jogo
    state.timePlayedSeconds += dt;
  }
}

// Instância global única
const clicker = new ClickerSystem();
