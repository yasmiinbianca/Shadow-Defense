/**
 * SHADOW DEFENSE - ui.js
 * Gerenciador de Telas, Abas, HUD, Modais, Notificações Toast e Atualizações de Interface
 */

class UIManager {
  constructor() {
    this.currentScreen = 'screen-loading';
    this.activeTab = 'tab-towers';
    this.toastContainer = null;
  }

  init() {
    this.toastContainer = document.getElementById('toast-container');
    this.setupNavigation();
    this.setupTabs();
    this.setupHUDControls();
    this.renderShopTabs();
  }

  // Navegação entre as 9 Telas do Jogo
  navigateTo(screenId) {
    const screens = document.querySelectorAll('.game-screen');
    screens.forEach(s => s.classList.remove('active'));

    const target = document.getElementById(screenId);
    if (target) {
      target.classList.add('active');
      this.currentScreen = screenId;
    }

    // Ações ao entrar em telas específicas
    if (screenId === 'screen-game') {
      this.updateHUD();
      this.updateClickerUI();
      this.renderShopTabs();
    } else if (screenId === 'screen-profile') {
      this.updateProfileStats();
    } else if (screenId === 'screen-achievements') {
      this.updateAchievementsList();
    }
  }

  setupNavigation() {
    // Menu Principal
    document.getElementById('btn-play')?.addEventListener('click', () => {
      audio.resumeIfNeeded();
      audio.playClick();
      this.navigateTo('screen-game');
    });

    document.getElementById('btn-profile')?.addEventListener('click', () => {
      audio.playClick();
      this.navigateTo('screen-profile');
    });

    document.getElementById('btn-achievements')?.addEventListener('click', () => {
      audio.playClick();
      this.navigateTo('screen-achievements');
    });

    document.getElementById('btn-instructions')?.addEventListener('click', () => {
      audio.playClick();
      this.navigateTo('screen-instructions');
    });

    document.getElementById('btn-credits')?.addEventListener('click', () => {
      audio.playClick();
      this.navigateTo('screen-credits');
    });

    // Botões de Voltar ao Menu
    document.querySelectorAll('.btn-back-menu').forEach(btn => {
      btn.addEventListener('click', () => {
        audio.playClick();
        this.navigateTo('screen-menu');
      });
    });

    // Botão de Pausa / Menu no Game Screen
    document.getElementById('btn-game-menu')?.addEventListener('click', () => {
      audio.playClick();
      this.navigateTo('screen-menu');
    });

    // Botão Continuar na Tela de Vitória
    document.getElementById('btn-victory-continue')?.addEventListener('click', () => {
      audio.playClick();
      this.navigateTo('screen-game');
      this.updateHUD();
    });

    // Botão Reiniciar na Tela de Game Over
    document.getElementById('btn-restart-game')?.addEventListener('click', () => {
      audio.playClick();
      game.restartGame();
    });

    // Botão Salvar Manual no Perfil
    document.getElementById('btn-manual-save')?.addEventListener('click', () => {
      state.save();
      audio.playCoin();
      this.showToast('Progresso salvo com sucesso!', 'green');
    });

    // Botão Resetar Progresso no Perfil
    document.getElementById('btn-reset-save')?.addEventListener('click', () => {
      if (confirm('Tem certeza de que deseja apagar todo o seu progresso? Esta ação não pode ser desfeita.')) {
        state.resetSave();
        audio.playDefeat();
        this.showToast('Progresso reiniciado.', 'red');
        this.updateProfileStats();
      }
    });
  }

  // Configuração das Abas Inferiores
  setupTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        tabBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const targetTab = btn.dataset.tab;
        document.querySelectorAll('.tab-content-panel').forEach(p => p.classList.remove('active'));
        document.getElementById(targetTab)?.classList.add('active');
        this.activeTab = targetTab;
        audio.playClick();

        if (targetTab === 'tab-minigames') {
          this.updateMinigamesUI();
        }
      });
    });
  }

  // Configuração dos Controles de HUD da Partida
  setupHUDControls() {
    // Iniciar Onda
    const startWaveBtn = document.getElementById('btn-start-wave');
    startWaveBtn?.addEventListener('click', () => {
      game.startWave();
    });

    // Alternar Auto-Onda
    const autoWaveBtn = document.getElementById('btn-auto-wave');
    autoWaveBtn?.addEventListener('click', () => {
      state.autoWave = !state.autoWave;
      autoWaveBtn.classList.toggle('active', state.autoWave);
      autoWaveBtn.textContent = state.autoWave ? 'Auto-Onda: LIGADO' : 'Auto-Onda: DESLIGADO';
      audio.playClick();
      this.showToast(`Auto-Onda ${state.autoWave ? 'ativada' : 'desativada'}`, 'purple');
    });

    // Controle de Velocidade (1x, 2x, 3x)
    const speedBtn = document.getElementById('btn-speed-toggle');
    speedBtn?.addEventListener('click', () => {
      if (state.gameSpeed === 1) state.gameSpeed = 2;
      else if (state.gameSpeed === 2) state.gameSpeed = 3;
      else state.gameSpeed = 1;

      speedBtn.textContent = `${state.gameSpeed}x ⏩`;
      audio.playClick();
    });

    // Toggle Efeitos Sonoros
    const sfxBtn = document.getElementById('btn-toggle-sfx');
    sfxBtn?.addEventListener('click', () => {
      const active = audio.toggleSFX();
      sfxBtn.textContent = active ? 'SFX: 🔊' : 'SFX: 🔇';
      state.settings.sfx = active;
    });

    // Toggle Música
    const musicBtn = document.getElementById('btn-toggle-music');
    musicBtn?.addEventListener('click', () => {
      const active = audio.toggleMusic();
      musicBtn.textContent = active ? 'Música: 🎵' : 'Música: 🔇';
      state.settings.music = active;
    });
  }

  // Atualização Global do HUD Superior
  updateHUD() {
    // Moedas
    const coinsEl = document.getElementById('hud-coins-val');
    if (coinsEl) {
      coinsEl.textContent = state.coins.toLocaleString();
    }

    // Vida da Base
    const hpText = document.getElementById('hud-hp-text');
    const hpBar = document.getElementById('hud-hp-fill');
    if (hpText && hpBar) {
      hpText.textContent = `${Math.max(0, Math.ceil(state.lives))} / ${state.maxLives}`;
      const pct = Math.max(0, (state.lives / state.maxLives) * 100);
      hpBar.style.width = `${pct}%`;
      hpBar.style.backgroundColor = pct > 40 ? '#22c55e' : (pct > 20 ? '#eab308' : '#ef4444');
    }

    // Nível e XP
    const lvlEl = document.getElementById('hud-level-val');
    const xpBar = document.getElementById('hud-xp-fill');
    const xpText = document.getElementById('hud-xp-text');
    if (lvlEl && xpBar && xpText) {
      lvlEl.textContent = `Nv. ${state.level}`;
      const needed = state.getXpNeededForLevel();
      const pct = Math.min(100, (state.xp / needed) * 100);
      xpBar.style.width = `${pct}%`;
      xpText.textContent = `${state.xp} / ${needed} XP`;
    }

    // Onda Atual e Inimigos
    const waveEl = document.getElementById('hud-wave-val');
    if (waveEl) {
      waveEl.textContent = state.wave;
    }

    const enemiesEl = document.getElementById('hud-enemies-val');
    if (enemiesEl) {
      enemiesEl.textContent = game.enemiesRemainingToSpawn + game.enemies.length;
    }

    // Próximo Chefe
    const bossCounterEl = document.getElementById('hud-next-boss-val');
    if (bossCounterEl) {
      const nextBossWave = Math.ceil(state.wave / 10) * 10;
      const wavesLeft = nextBossWave - state.wave;
      bossCounterEl.textContent = wavesLeft === 0 ? 'NESTA ONDA!' : `em ${wavesLeft} onda${wavesLeft > 1 ? 's' : ''}`;
      bossCounterEl.style.color = wavesLeft === 0 ? '#ef4444' : '#facc15';
    }

    // Botão Iniciar Onda
    const startWaveBtn = document.getElementById('btn-start-wave');
    if (startWaveBtn) {
      startWaveBtn.disabled = state.waveInProgress;
      startWaveBtn.textContent = state.waveInProgress ? 'Onda em Andamento...' : `⚔️ Iniciar Onda ${state.wave}`;
    }

    // Atualizar custos e disponibilidade nas abas
    this.refreshShopButtonsState();
  }

  // Atualizar Interface do Cristal Sombrio
  updateClickerUI() {
    const cpcEl = document.getElementById('crystal-cpc-val');
    const gpsEl = document.getElementById('crystal-gps-val');
    const comboCountEl = document.getElementById('combo-counter-val');
    const comboNameEl = document.getElementById('combo-tier-name');
    const critInfoEl = document.getElementById('crystal-crit-val');

    if (cpcEl) cpcEl.textContent = state.getCoinsPerClick().toLocaleString();
    if (gpsEl) gpsEl.textContent = `${state.getCoinsPerSecond().toLocaleString()}/s`;
    if (comboCountEl) comboCountEl.textContent = `${state.combo}x`;
    if (comboNameEl) comboNameEl.textContent = state.getComboTierName();

    if (critInfoEl) {
      const chance = (state.getCritChance() * 100).toFixed(0);
      const mult = state.getCritMultiplier().toFixed(1);
      critInfoEl.textContent = `${chance}% (${mult}x)`;
    }
  }

  // Renderizar Itens das Abas de Compra
  renderShopTabs() {
    this.renderTowersTab();
    this.renderClickUpgradesTab();
    this.renderAutoGeneratorsTab();
    this.renderEconomyTreeTab();
  }

  // 1. Aba de Torres
  renderTowersTab() {
    const container = document.getElementById('tab-towers-list');
    if (!container) return;
    container.innerHTML = '';

    Object.values(GAME_DATA.TOWERS).forEach(t => {
      const rarity = GAME_DATA.RARITIES[t.rarity];
      const isLocked = state.level < t.unlockLevel;

      const card = document.createElement('div');
      card.className = `shop-item-card ${isLocked ? 'locked' : ''}`;
      card.style.borderColor = rarity.border;

      card.innerHTML = `
        <div class="item-header">
          <span class="item-icon">${t.icon}</span>
          <div class="item-title-box">
            <div class="item-name">${t.name}</div>
            <span class="rarity-badge" style="color:${rarity.color}; background:${rarity.bg}">${rarity.name}</span>
          </div>
        </div>
        <p class="item-desc">${t.description}</p>
        <div class="item-stats-preview">
          <span>💥 Dano: <strong>${t.damage}</strong></span>
          <span>🎯 Alcance: <strong>${t.range}</strong></span>
          <span>⚡ Cadência: <strong>${t.attackSpeed}/s</strong></span>
        </div>
        <div class="item-footer">
          ${isLocked
            ? `<span class="lock-tag">🔒 Nível ${t.unlockLevel}</span>`
            : `<button class="btn-buy-tower btn-action" data-tower="${t.id}">
                 Construir (${t.cost.toLocaleString()} 🪙)
               </button>`
          }
        </div>
      `;

      card.querySelector('.btn-buy-tower')?.addEventListener('click', () => {
        // Se houver um slot selecionado, constrói direto nele
        if (game.selectedPlot && !game.selectedPlot.tower) {
          game.buildTower(game.selectedPlot.id, t.id);
        } else {
          // Destaca slots vazios disponíveis
          this.showToast('Clique em uma plataforma circular no campo para posicionar!', 'purple');
        }
      });

      container.appendChild(card);
    });
  }

  // 2. Aba de Upgrades de Clique
  renderClickUpgradesTab() {
    const container = document.getElementById('tab-clicks-list');
    if (!container) return;
    container.innerHTML = '';

    GAME_DATA.CLICK_UPGRADES.forEach(u => {
      const lvl = state.clickUpgrades[u.id] || 0;
      const cost = state.getClickUpgradeCost(u.id);

      const card = document.createElement('div');
      card.className = 'shop-item-card';
      card.id = `card-${u.id}`;

      card.innerHTML = `
        <div class="item-header">
          <span class="item-icon">${u.icon}</span>
          <div class="item-title-box">
            <div class="item-name">${u.name}</div>
            <span class="level-badge">Nv. ${lvl}</span>
          </div>
        </div>
        <p class="item-desc">${u.desc}</p>
        <div class="item-footer">
          <button class="btn-action btn-upgrade-click" data-id="${u.id}">
            Melhorar (${cost.toLocaleString()} 🪙)
          </button>
        </div>
      `;

      card.querySelector('.btn-upgrade-click')?.addEventListener('click', () => {
        if (state.spendCoins(cost)) {
          state.clickUpgrades[u.id] = lvl + 1;
          audio.playUpgrade();
          this.showToast(`${u.name} aprimorado!`, 'green');
          this.updateHUD();
          this.updateClickerUI();
          this.renderClickUpgradesTab();
        } else {
          this.showToast('Moedas insuficientes!', 'red');
        }
      });

      container.appendChild(card);
    });
  }

  // 3. Aba de Geradores Automáticos (Idle)
  renderAutoGeneratorsTab() {
    const container = document.getElementById('tab-gens-list');
    if (!container) return;
    container.innerHTML = '';

    GAME_DATA.AUTO_GENERATORS.forEach(g => {
      const lvl = state.autoGenerators[g.id] || 0;
      const cost = state.getAutoGeneratorCost(g.id);

      const card = document.createElement('div');
      card.className = 'shop-item-card';

      card.innerHTML = `
        <div class="item-header">
          <span class="item-icon">${g.icon}</span>
          <div class="item-title-box">
            <div class="item-name">${g.name}</div>
            <span class="level-badge">Nv. ${lvl}</span>
          </div>
        </div>
        <p class="item-desc">${g.desc}</p>
        <div class="item-footer">
          <button class="btn-action btn-buy-gen" data-id="${g.id}">
            Comprar (${cost.toLocaleString()} 🪙)
          </button>
        </div>
      `;

      card.querySelector('.btn-buy-gen')?.addEventListener('click', () => {
        if (state.spendCoins(cost)) {
          state.autoGenerators[g.id] = lvl + 1;
          audio.playUpgrade();
          this.showToast(`${g.name} adquirido!`, 'green');
          this.updateHUD();
          this.updateClickerUI();
          this.renderAutoGeneratorsTab();
        } else {
          this.showToast('Moedas insuficientes!', 'red');
        }
      });

      container.appendChild(card);
    });
  }

  // 4. Aba de Árvore de Economia
  renderEconomyTreeTab() {
    const container = document.getElementById('tab-tree-list');
    if (!container) return;
    container.innerHTML = '';

    GAME_DATA.ECONOMY_TREE.forEach(node => {
      const lvl = state.economyTree[node.id] || 0;
      const cost = state.getEconomyTreeNodeCost(node.id);
      const isMax = lvl >= node.maxLevel;

      const card = document.createElement('div');
      card.className = `shop-item-card ${isMax ? 'maxed' : ''}`;

      card.innerHTML = `
        <div class="item-header">
          <span class="item-icon">${node.icon}</span>
          <div class="item-title-box">
            <div class="item-name">${node.name}</div>
            <span class="level-badge">${lvl} / ${node.maxLevel}</span>
          </div>
        </div>
        <p class="item-desc">${node.desc}</p>
        <div class="item-footer">
          ${isMax
            ? `<span class="max-tag">⭐ Nível Máximo</span>`
            : `<button class="btn-action btn-upgrade-tree" data-id="${node.id}">
                 Aprender (${cost.toLocaleString()} 🪙)
               </button>`
          }
        </div>
      `;

      card.querySelector('.btn-upgrade-tree')?.addEventListener('click', () => {
        if (state.spendCoins(cost)) {
          state.economyTree[node.id] = lvl + 1;
          audio.playUpgrade();
          this.showToast(`Talento: ${node.name} aprimorado!`, 'gold');
          this.updateHUD();
          this.updateClickerUI();
          this.renderEconomyTreeTab();
        } else {
          this.showToast('Moedas insuficientes!', 'red');
        }
      });

      container.appendChild(card);
    });
  }

  // Atualizar Estado dos Botões de Compra (Desabilitar se sem moedas)
  refreshShopButtonsState() {
    document.querySelectorAll('.btn-buy-tower').forEach(btn => {
      const towerId = btn.dataset.tower;
      const def = GAME_DATA.TOWERS[towerId];
      if (def) {
        btn.disabled = state.coins < def.cost;
      }
    });

    document.querySelectorAll('.btn-upgrade-click').forEach(btn => {
      const id = btn.dataset.id;
      const cost = state.getClickUpgradeCost(id);
      btn.disabled = state.coins < cost;
    });

    document.querySelectorAll('.btn-buy-gen').forEach(btn => {
      const id = btn.dataset.id;
      const cost = state.getAutoGeneratorCost(id);
      btn.disabled = state.coins < cost;
    });

    document.querySelectorAll('.btn-upgrade-tree').forEach(btn => {
      const id = btn.dataset.id;
      const cost = state.getEconomyTreeNodeCost(id);
      btn.disabled = cost === null || state.coins < cost;
    });
  }

  // Modais de Construção e Inspeção
  openBuildSelector(plot) {
    const modal = document.getElementById('modal-build-selector');
    const container = document.getElementById('build-options-container');
    if (!modal || !container) return;

    container.innerHTML = '';

    Object.values(GAME_DATA.TOWERS).forEach(t => {
      const rarity = GAME_DATA.RARITIES[t.rarity];
      const isLocked = state.level < t.unlockLevel;
      const canAfford = state.coins >= t.cost;

      const opt = document.createElement('div');
      opt.className = `modal-tower-option ${isLocked ? 'locked' : ''}`;
      opt.style.borderColor = rarity.border;

      opt.innerHTML = `
        <div class="opt-icon">${t.icon}</div>
        <div class="opt-info">
          <div class="opt-name">${t.name}</div>
          <div class="opt-rarity" style="color:${rarity.color}">${rarity.name}</div>
          <div class="opt-stats">💥 ${t.damage} | 🎯 ${t.range} | ⚡ ${t.attackSpeed}/s</div>
        </div>
        <div class="opt-action">
          ${isLocked
            ? `<span class="lock-tag">Nv. ${t.unlockLevel}</span>`
            : `<button class="btn-action ${canAfford ? '' : 'disabled'}">
                 ${t.cost.toLocaleString()} 🪙
               </button>`
          }
        </div>
      `;

      if (!isLocked) {
        opt.onclick = () => {
          if (game.buildTower(plot.id, t.id)) {
            modal.classList.remove('active');
          }
        };
      }

      container.appendChild(opt);
    });

    modal.classList.add('active');
  }

  openTowerModal(tower, plot) {
    const modal = document.getElementById('modal-tower-inspect');
    if (!modal) return;

    this.updateTowerModal(tower);
    modal.classList.add('active');

    // Botão Upgrade
    const upBtn = document.getElementById('modal-tower-upgrade-btn');
    if (upBtn) {
      upBtn.onclick = () => {
        game.upgradeTower(tower);
      };
    }

    // Botão Vender
    const sellBtn = document.getElementById('modal-tower-sell-btn');
    if (sellBtn) {
      sellBtn.onclick = () => {
        game.sellTower(tower, plot);
      };
    }

    // Seletor de Prioridade de Alvo
    const targetSel = document.getElementById('modal-tower-target-select');
    if (targetSel) {
      targetSel.value = tower.targetMode;
      targetSel.onchange = (e) => {
        tower.targetMode = e.target.value;
        this.showToast(`Alvo alterado para: ${e.target.selectedOptions[0].text}`, 'purple');
      };
    }
  }

  updateTowerModal(tower) {
    const def = GAME_DATA.TOWERS[tower.key];
    const rarity = GAME_DATA.RARITIES[tower.rarity];
    const upCost = Math.floor(def.cost * Math.pow(def.upgradeCostMult, tower.level));
    const refund = Math.floor(tower.totalInvested * 0.7);

    document.getElementById('modal-tower-name').textContent = tower.name;
    document.getElementById('modal-tower-icon').textContent = tower.icon;

    const rarityEl = document.getElementById('modal-tower-rarity');
    rarityEl.textContent = rarity.name;
    rarityEl.style.color = rarity.color;

    document.getElementById('modal-tower-level').textContent = `Nível ${tower.level}`;
    document.getElementById('modal-tower-damage').textContent = tower.damage;
    document.getElementById('modal-tower-range').textContent = tower.range;
    document.getElementById('modal-tower-speed').textContent = `${tower.attackSpeed}/s`;
    document.getElementById('modal-tower-kills').textContent = tower.kills;

    const upBtn = document.getElementById('modal-tower-upgrade-btn');
    if (upBtn) {
      upBtn.textContent = `Melhorar (+${def.damagePerLevel} Dano) - ${upCost.toLocaleString()} 🪙`;
      upBtn.disabled = state.coins < upCost;
    }

    const sellBtn = document.getElementById('modal-tower-sell-btn');
    if (sellBtn) {
      sellBtn.textContent = `Vender (+${refund.toLocaleString()} 🪙)`;
    }
  }

  closeModals() {
    document.querySelectorAll('.game-modal').forEach(m => m.classList.remove('active'));
  }

  // Atualizar Estatísticas na Tela de Perfil
  updateProfileStats() {
    const setVal = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    };

    setVal('prof-level', state.level);
    setVal('prof-xp', `${state.xp} / ${state.getXpNeededForLevel()} XP`);
    setVal('prof-wave-record', state.highestWave);
    setVal('prof-total-coins', state.totalCoinsEarned.toLocaleString());
    setVal('prof-total-clicks', state.totalClicks.toLocaleString());
    setVal('prof-max-combo', `${state.highestCombo}x`);
    setVal('prof-kills', state.enemiesKilled.toLocaleString());
    setVal('prof-bosses', state.bossesKilled.toLocaleString());

    // Tempo de Jogo formatado
    const mins = Math.floor(state.timePlayedSeconds / 60);
    const secs = Math.floor(state.timePlayedSeconds % 60);
    setVal('prof-time', `${mins}m ${secs}s`);

    const xpBar = document.getElementById('prof-xp-bar');
    if (xpBar) {
      const pct = Math.min(100, (state.xp / state.getXpNeededForLevel()) * 100);
      xpBar.style.width = `${pct}%`;
    }
  }

  // Atualizar Conquistas na Tela de Conquistas
  updateAchievementsList() {
    const container = document.getElementById('achievements-grid-list');
    if (!container) return;
    container.innerHTML = '';

    GAME_DATA.ACHIEVEMENTS.forEach(ach => {
      const st = state.achievements[ach.id] || { unlocked: false, claimed: false };

      const card = document.createElement('div');
      card.className = `achievement-card ${st.unlocked ? 'unlocked' : ''} ${st.claimed ? 'claimed' : ''}`;

      card.innerHTML = `
        <div class="ach-icon">${ach.icon}</div>
        <div class="ach-info">
          <div class="ach-name">${ach.name}</div>
          <div class="ach-desc">${ach.desc}</div>
          <div class="ach-rewards">Recompensa: +${ach.rewardCoins.toLocaleString()} 🪙 | +${ach.rewardXp} XP</div>
        </div>
        <div class="ach-status">
          ${st.claimed
            ? `<span class="claimed-badge">✅ Resgatado</span>`
            : (st.unlocked
                ? `<button class="btn-claim-ach btn-action" data-id="${ach.id}">🎁 Resgatar</button>`
                : `<span class="locked-badge">🔒 Bloqueada</span>`
              )
          }
        </div>
      `;

      card.querySelector('.btn-claim-ach')?.addEventListener('click', () => {
        state.claimAchievement(ach.id);
      });

      container.appendChild(card);
    });
  }

  // Atualizar UI da Aba Bônus e Minigames
  updateMinigamesUI() {
    const tCountEl = document.getElementById('minigames-tickets-val');
    if (tCountEl) {
      tCountEl.textContent = state.minigameTickets;
    }

    // Configurar botões de inicialização de cada minigame de forma idempotente
    const btnRoulette = document.getElementById('btn-open-roulette');
    if (btnRoulette) {
      btnRoulette.onclick = () => {
        this.openMinigameModal('minigame-roulette-view');
        minigames.initRoulette();
      };
    }

    const btnScratch = document.getElementById('btn-open-scratch');
    if (btnScratch) {
      btnScratch.onclick = () => {
        this.openMinigameModal('minigame-scratch-view');
        minigames.initScratchcard();
      };
    }

    const btnMemory = document.getElementById('btn-open-memory');
    if (btnMemory) {
      btnMemory.onclick = () => {
        this.openMinigameModal('minigame-memory-view');
        minigames.initMemoryGame();
      };
    }

    const btnChest = document.getElementById('btn-open-chest');
    if (btnChest) {
      btnChest.onclick = () => {
        this.openMinigameModal('minigame-chest-view');
        minigames.initChestPicker();
      };
    }

    const btnSpeed = document.getElementById('btn-open-speed-click');
    if (btnSpeed) {
      btnSpeed.onclick = () => {
        this.openMinigameModal('minigame-speed-view');
        minigames.initSpeedClick();
      };
    }
  }

  openMinigameModal(viewId) {
    const modal = document.getElementById('modal-minigames');
    if (!modal) return;

    modal.querySelectorAll('.minigame-view').forEach(v => v.classList.remove('active'));
    document.getElementById(viewId)?.classList.add('active');
    modal.classList.add('active');
    audio.playClick();
  }

  // Tela de Vitória Épica
  showVictoryScreen(waveNum, coins, xp) {
    document.getElementById('victory-wave-title').textContent = `ONDA ${waveNum} SUPERADA!`;
    document.getElementById('victory-coins-val').textContent = `+${coins.toLocaleString()} 🪙`;
    document.getElementById('victory-xp-val').textContent = `+${xp.toLocaleString()} XP`;
    this.navigateTo('screen-victory');
    particles.createBurst(window.innerWidth / 2, window.innerHeight / 2, 60, ['#facc15', '#a855f7', '#38bdf8'], 250);
  }

  // Tela de Game Over
  showGameOverScreen(waveReached) {
    document.getElementById('gameover-wave-val').textContent = `Você resistiu até a Onda ${waveReached}`;
    document.getElementById('gameover-kills-val').textContent = state.enemiesKilled.toLocaleString();
    document.getElementById('gameover-coins-val').textContent = state.totalCoinsEarned.toLocaleString();
    this.navigateTo('screen-gameover');
  }

  // Sistema de Notificações Toast
  showToast(message, type = 'purple') {
    if (!this.toastContainer) return;

    const toast = document.createElement('div');
    toast.className = `game-toast toast-${type}`;
    toast.textContent = message;

    this.toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('fade-out');
      setTimeout(() => toast.remove(), 400);
    }, 2800);
  }
}

// Instância global única
const ui = new UIManager();
