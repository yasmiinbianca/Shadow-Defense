/**
 * SHADOW DEFENSE - state.js
 * Gerenciamento centralizado de estado, economia, XP, níveis e LocalStorage
 */

class GameState {
  constructor() {
    this.STORAGE_KEY = 'SHADOW_DEFENSE_SAVE_V1';
    this.resetDefaults();
  }

  resetDefaults() {
    // Recursos Principais
    this.coins = GAME_DATA.CONFIG.INITIAL_COINS;
    this.lives = GAME_DATA.CONFIG.INITIAL_LIVES;
    this.maxLives = GAME_DATA.CONFIG.INITIAL_LIVES;

    // Progressão de Nível e XP
    this.level = 1;
    this.xp = 0;

    // Ondas
    this.wave = 1;
    this.highestWave = 1;
    this.waveInProgress = false;
    this.autoWave = false;
    this.gameSpeed = 1; // 1x, 2x, 3x

    // Estatísticas Gerais
    this.totalCoinsEarned = GAME_DATA.CONFIG.INITIAL_COINS;
    this.totalClicks = 0;
    this.enemiesKilled = 0;
    this.bossesKilled = 0;
    this.timePlayedSeconds = 0;

    // Upgrades do Cristal e Geradores
    this.clickUpgrades = {};
    GAME_DATA.CLICK_UPGRADES.forEach(u => this.clickUpgrades[u.id] = 0);

    this.autoGenerators = {};
    GAME_DATA.AUTO_GENERATORS.forEach(g => this.autoGenerators[g.id] = 0);

    // Árvore de Economia
    this.economyTree = {};
    GAME_DATA.ECONOMY_TREE.forEach(t => this.economyTree[t.id] = 0);

    // Sistema de Combo
    this.combo = 0;
    this.highestCombo = 0;
    this.lastClickTimestamp = 0;

    // Conquistas { [id]: { unlocked: boolean, claimed: boolean } }
    this.achievements = {};
    GAME_DATA.ACHIEVEMENTS.forEach(a => {
      this.achievements[a.id] = { unlocked: false, claimed: false };
    });

    // Minigames
    this.minigameTickets = 3;
    this.minigameCooldowns = {
      roulette: 0,
      scratch: 0,
      memory: 0,
      chest: 0,
      speedClick: 0,
    };

    // Configurações
    this.settings = {
      sfx: true,
      music: true,
      damageNumbers: true,
      screenShake: true,
    };
  }

  // XP necessária para o próximo nível
  getXpNeededForLevel(lvl = this.level) {
    return Math.floor(80 * Math.pow(1.24, lvl - 1));
  }

  // Adicionar XP e calcular níveis alcançados
  addXp(amount) {
    if (amount <= 0) return;
    this.xp += amount;
    let leveledUp = false;

    while (this.xp >= this.getXpNeededForLevel()) {
      this.xp -= this.getXpNeededForLevel();
      this.level++;
      leveledUp = true;
      this.onLevelUp();
    }

    if (leveledUp && window.ui) {
      window.ui.showToast(`✨ SUBIU DE NÍVEL! Nível ${this.level}`, 'gold');
      audio.playVictory();
    }
  }

  onLevelUp() {
    // Recompensa de Moedas ao subir de nível
    const bonusCoins = this.level * 150;
    this.addCoins(bonusCoins);

    // Concede 1 ticket de minigame a cada 2 níveis
    if (this.level % 2 === 0) {
      this.minigameTickets++;
    }

    // Checar desbloqueios de torres
    this.checkTowerUnlocks();
  }

  checkTowerUnlocks() {
    Object.values(GAME_DATA.TOWERS).forEach(tower => {
      if (this.level === tower.unlockLevel && window.ui) {
        window.ui.showToast(`🔓 Nova Defesa Desbloqueada: ${tower.name}!`, 'purple');
        audio.playUpgrade();
      }
    });
  }

  // Gestão de Moedas
  addCoins(amount) {
    if (amount <= 0) return;
    this.coins += amount;
    this.totalCoinsEarned += amount;
    this.checkAchievements();
  }

  spendCoins(amount) {
    if (this.coins >= amount) {
      this.coins -= amount;
      return true;
    }
    return false;
  }

  // Cálculo Dinâmico de Moedas por Clique (MPC)
  getCoinsPerClick() {
    let base = 1;

    // Upgrades diretos de clique
    GAME_DATA.CLICK_UPGRADES.forEach(u => {
      const lvl = this.clickUpgrades[u.id] || 0;
      base += lvl * u.addClick;
    });

    // Bônus da Árvore de Economia (% de Clique)
    const treeClickLvl = this.economyTree['tree_click_boost'] || 0;
    const treeMult = 1 + treeClickLvl * 0.15;
    let mpc = base * treeMult;

    // Multiplicador de Combo
    const comboMult = this.getComboMultiplier();
    mpc *= comboMult;

    return Math.max(1, Math.floor(mpc));
  }

  // Multiplicador Ativo de Combo
  getComboMultiplier() {
    let bonusPct = 0;
    for (let i = GAME_DATA.COMBO_TIERS.length - 1; i >= 0; i--) {
      const tier = GAME_DATA.COMBO_TIERS[i];
      if (this.combo >= tier.count) {
        bonusPct = tier.bonusPercent;
        break;
      }
    }

    // Bônus da Árvore de Economia para combo
    const treeComboLvl = this.economyTree['tree_combo_bonus'] || 0;
    bonusPct *= (1 + treeComboLvl * 0.25);

    return 1 + (bonusPct / 100);
  }

  // Nome do patamar de combo atual
  getComboTierName() {
    for (let i = GAME_DATA.COMBO_TIERS.length - 1; i >= 0; i--) {
      if (this.combo >= GAME_DATA.COMBO_TIERS[i].count) {
        return GAME_DATA.COMBO_TIERS[i].name;
      }
    }
    return '';
  }

  // Tempo de retenção do combo antes de expirar (ms)
  getComboDecayTime() {
    const treeTimeLvl = this.economyTree['tree_combo_time'] || 0;
    return GAME_DATA.CONFIG.COMBO_DECAY_TIME_MS + (treeTimeLvl * 1000);
  }

  // Chance Crítica
  getCritChance() {
    const treeCritLvl = this.economyTree['tree_crit_chance'] || 0;
    return GAME_DATA.CONFIG.BASE_CRIT_CHANCE + (treeCritLvl * 0.02);
  }

  // Multiplicador de Dano Crítico
  getCritMultiplier() {
    const treeMultLvl = this.economyTree['tree_crit_mult'] || 0;
    return GAME_DATA.CONFIG.BASE_CRIT_MULT + (treeMultLvl * 1.0);
  }

  // Moedas por Segundo (Geração Automática / Idle)
  getCoinsPerSecond() {
    let baseGps = 0;
    GAME_DATA.AUTO_GENERATORS.forEach(g => {
      const lvl = this.autoGenerators[g.id] || 0;
      baseGps += lvl * g.addGps;
    });

    const treeIdleLvl = this.economyTree['tree_idle_boost'] || 0;
    const idleMult = 1 + treeIdleLvl * 0.15;

    return Math.floor(baseGps * idleMult);
  }

  // Custo de Upgrades de Clique
  getClickUpgradeCost(id) {
    const def = GAME_DATA.CLICK_UPGRADES.find(u => u.id === id);
    if (!def) return Infinity;
    const lvl = this.clickUpgrades[id] || 0;
    return Math.floor(def.baseCost * Math.pow(def.costMult, lvl));
  }

  // Custo de Geradores Automáticos
  getAutoGeneratorCost(id) {
    const def = GAME_DATA.AUTO_GENERATORS.find(g => g.id === id);
    if (!def) return Infinity;
    const lvl = this.autoGenerators[id] || 0;
    return Math.floor(def.baseCost * Math.pow(def.costMult, lvl));
  }

  // Custo da Árvore de Economia
  getEconomyTreeNodeCost(id) {
    const node = GAME_DATA.ECONOMY_TREE.find(n => n.id === id);
    if (!node) return Infinity;
    const lvl = this.economyTree[id] || 0;
    if (lvl >= node.maxLevel) return null; // Máximo alcançado
    return Math.floor(node.costBase * Math.pow(node.costMult, lvl));
  }

  // Checar e Atualizar Conquistas
  checkAchievements() {
    GAME_DATA.ACHIEVEMENTS.forEach(ach => {
      const curr = this.achievements[ach.id];
      if (curr && !curr.unlocked) {
        let reached = false;
        switch (ach.reqType) {
          case 'wave':
            reached = this.highestWave >= ach.reqVal;
            break;
          case 'bosses':
            reached = this.bossesKilled >= ach.reqVal;
            break;
          case 'clicks':
            reached = this.totalClicks >= ach.reqVal;
            break;
          case 'max_combo':
            reached = this.highestCombo >= ach.reqVal;
            break;
          case 'total_coins':
            reached = this.totalCoinsEarned >= ach.reqVal;
            break;
          case 'kills':
            reached = this.enemiesKilled >= ach.reqVal;
            break;
          case 'has_mythic':
            // Verificado no game.js ao construir ou aprimorar
            break;
        }

        if (reached) {
          curr.unlocked = true;
          if (window.ui) {
            window.ui.showToast(`🏆 Conquista Desbloqueada: ${ach.name}!`, 'gold');
            audio.playVictory();
            window.ui.updateAchievementsList();
          }
        }
      }
    });
  }

  claimAchievement(id) {
    const ach = GAME_DATA.ACHIEVEMENTS.find(a => a.id === id);
    const curr = this.achievements[id];
    if (ach && curr && curr.unlocked && !curr.claimed) {
      curr.claimed = true;
      this.addCoins(ach.rewardCoins);
      this.addXp(ach.rewardXp);
      audio.playCoin();
      if (window.ui) {
        window.ui.showToast(`🎁 Recompensa resgatada: +${ach.rewardCoins} moedas, +${ach.rewardXp} XP!`, 'green');
        window.ui.updateAchievementsList();
        window.ui.updateHUD();
      }
      return true;
    }
    return false;
  }

  // Persistência em LocalStorage
  save() {
    try {
      const dataToSave = {
        coins: this.coins,
        lives: this.lives,
        maxLives: this.maxLives,
        level: this.level,
        xp: this.xp,
        wave: this.wave,
        highestWave: this.highestWave,
        totalCoinsEarned: this.totalCoinsEarned,
        totalClicks: this.totalClicks,
        enemiesKilled: this.enemiesKilled,
        bossesKilled: this.bossesKilled,
        timePlayedSeconds: this.timePlayedSeconds,
        clickUpgrades: this.clickUpgrades,
        autoGenerators: this.autoGenerators,
        economyTree: this.economyTree,
        highestCombo: this.highestCombo,
        achievements: this.achievements,
        minigameTickets: this.minigameTickets,
        settings: this.settings,
        savedAt: Date.now(),
      };
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(dataToSave));
      return true;
    } catch (e) {
      console.error("Erro ao salvar progresso:", e);
      return false;
    }
  }

  load() {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      if (!raw) return false;
      const data = JSON.parse(raw);

      if (data.coins !== undefined) this.coins = data.coins;
      if (data.lives !== undefined) this.lives = data.lives;
      if (data.maxLives !== undefined) this.maxLives = data.maxLives;
      if (data.level !== undefined) this.level = data.level;
      if (data.xp !== undefined) this.xp = data.xp;
      if (data.wave !== undefined) this.wave = data.wave;
      if (data.highestWave !== undefined) this.highestWave = data.highestWave;
      if (data.totalCoinsEarned !== undefined) this.totalCoinsEarned = data.totalCoinsEarned;
      if (data.totalClicks !== undefined) this.totalClicks = data.totalClicks;
      if (data.enemiesKilled !== undefined) this.enemiesKilled = data.enemiesKilled;
      if (data.bossesKilled !== undefined) this.bossesKilled = data.bossesKilled;
      if (data.timePlayedSeconds !== undefined) this.timePlayedSeconds = data.timePlayedSeconds;
      if (data.highestCombo !== undefined) this.highestCombo = data.highestCombo;
      if (data.minigameTickets !== undefined) this.minigameTickets = data.minigameTickets;

      if (data.clickUpgrades) this.clickUpgrades = { ...this.clickUpgrades, ...data.clickUpgrades };
      if (data.autoGenerators) this.autoGenerators = { ...this.autoGenerators, ...data.autoGenerators };
      if (data.economyTree) this.economyTree = { ...this.economyTree, ...data.economyTree };
      if (data.achievements) this.achievements = { ...this.achievements, ...data.achievements };
      if (data.settings) this.settings = { ...this.settings, ...data.settings };

      // Se passou muito tempo offline, podemos simular ganho idle limitado (até 2 horas)
      if (data.savedAt) {
        const offlineSecs = Math.min(7200, Math.floor((Date.now() - data.savedAt) / 1000));
        if (offlineSecs > 10) {
          const gps = this.getCoinsPerSecond();
          const offlineCoins = gps * offlineSecs;
          if (offlineCoins > 0) {
            this.addCoins(offlineCoins);
            setTimeout(() => {
              if (window.ui) {
                window.ui.showToast(`🌙 Rendimento Ocioso: +${offlineCoins.toLocaleString()} moedas ganhas enquanto esteve fora!`, 'gold');
              }
            }, 1200);
          }
        }
      }

      return true;
    } catch (e) {
      console.error("Erro ao carregar dados salvos:", e);
      return false;
    }
  }

  resetSave() {
    localStorage.removeItem(this.STORAGE_KEY);
    this.resetDefaults();
  }
}

// Instância global de estado
const state = new GameState();
