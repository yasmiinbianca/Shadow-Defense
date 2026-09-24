/**
 * SHADOW DEFENSE - game.js
 * Motor do Campo de Batalha (Tower Defense Canvas)
 * Caminho estratégico, posicionamento de torres, projéteis, IA de inimigos e ondas
 */

class TowerDefenseGame {
  constructor() {
    this.canvas = null;
    this.ctx = null;
    this.width = 1000;
    this.height = 560;

    // Caminho estratégico com curvas e encruzilhadas
    this.path = [
      { x: -30, y: 280 },
      { x: 170, y: 280 },
      { x: 170, y: 110 },
      { x: 420, y: 110 },
      { x: 420, y: 440 },
      { x: 680, y: 440 },
      { x: 680, y: 250 },
      { x: 970, y: 250 },
      { x: 1040, y: 250 },
    ];

    // Slots / Plataformas de Construção predefinidas (fora da pista)
    this.buildPlots = [
      { id: 1, x: 80, y: 210, tower: null },
      { id: 2, x: 80, y: 350, tower: null },
      { id: 3, x: 240, y: 180, tower: null },
      { id: 4, x: 240, y: 280, tower: null },
      { id: 5, x: 330, y: 180, tower: null },
      { id: 6, x: 330, y: 360, tower: null },
      { id: 7, x: 490, y: 200, tower: null },
      { id: 8, x: 490, y: 360, tower: null },
      { id: 9, x: 590, y: 200, tower: null },
      { id: 10, x: 590, y: 360, tower: null },
      { id: 11, x: 590, y: 500, tower: null },
      { id: 12, x: 760, y: 180, tower: null },
      { id: 13, x: 760, y: 330, tower: null },
      { id: 14, x: 860, y: 180, tower: null },
      { id: 15, x: 860, y: 330, tower: null },
      { id: 16, x: 240, y: 50, tower: null },
    ];

    this.enemies = [];
    this.projectiles = [];
    this.selectedPlot = null;
    this.selectedTower = null;

    // Gerenciador de Ondas
    this.waveSpawnQueue = [];
    this.spawnTimer = 0;
    this.spawnInterval = 0.85;
    this.enemiesRemainingToSpawn = 0;
    this.enemiesAlive = 0;
    this.waveBoss = null;

    this.autoWaveTimer = 0;
    this.isPaused = false;
  }

  init(canvasElement) {
    this.canvas = canvasElement;
    this.ctx = this.canvas.getContext('2d');
    this.canvas.width = this.width;
    this.canvas.height = this.height;

    this.setupEvents();
  }

  setupEvents() {
    this.canvas.addEventListener('click', (e) => this.handleCanvasClick(e));
    this.canvas.addEventListener('mousemove', (e) => this.handleCanvasHover(e));
  }

  // Obter coordenadas no canvas considerando escala CSS responsiva
  getCanvasCoords(e) {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }

  handleCanvasClick(e) {
    const { x, y } = this.getCanvasCoords(e);

    // Checar se clicou em alguma plataforma de construção
    for (const plot of this.buildPlots) {
      const dist = Math.hypot(plot.x - x, plot.y - y);
      if (dist <= 30) {
        if (plot.tower) {
          // Clicou em torre existente: inspecionar/melhorar
          this.selectedTower = plot.tower;
          this.selectedPlot = plot;
          if (window.ui) window.ui.openTowerModal(plot.tower, plot);
        } else {
          // Clicou em slot vazio: abrir seletor de construção
          this.selectedPlot = plot;
          this.selectedTower = null;
          if (window.ui) window.ui.openBuildSelector(plot);
        }
        audio.playClick();
        return;
      }
    }

    // Clique fora: desselecionar
    this.selectedPlot = null;
    this.selectedTower = null;
    if (window.ui) window.ui.closeModals();
  }

  handleCanvasHover(e) {
    const { x, y } = this.getCanvasCoords(e);
    let hovering = false;
    for (const plot of this.buildPlots) {
      if (Math.hypot(plot.x - x, plot.y - y) <= 30) {
        hovering = true;
        break;
      }
    }
    this.canvas.style.cursor = hovering ? 'pointer' : 'default';
  }

  // Construir Torre em uma Plataforma
  buildTower(plotId, towerKey) {
    const plot = this.buildPlots.find(p => p.id === plotId);
    const def = GAME_DATA.TOWERS[towerKey];
    if (!plot || plot.tower || !def) return false;

    if (state.level < def.unlockLevel) {
      if (window.ui) window.ui.showToast(`Nível ${def.unlockLevel} necessário para desbloquear esta defesa!`, 'red');
      return false;
    }

    if (!state.spendCoins(def.cost)) {
      if (window.ui) window.ui.showToast('Moedas insuficientes!', 'red');
      return false;
    }

    const tower = {
      id: 'tower_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      key: towerKey,
      plotId: plot.id,
      x: plot.x,
      y: plot.y,
      name: def.name,
      icon: def.icon,
      rarity: def.rarity,
      level: 1,
      totalInvested: def.cost,
      damage: def.damage,
      range: def.range,
      attackSpeed: def.attackSpeed,
      lastAttackTime: 0,
      targetMode: 'first', // first, last, strong, weak
      kills: 0,
      totalDamageDealt: 0,
    };

    plot.tower = tower;
    this.selectedTower = tower;

    // Checar conquista mítica
    if (def.rarity === 'mythic') {
      const ach = state.achievements['mythic_tower'];
      if (ach && !ach.unlocked) {
        ach.unlocked = true;
        if (window.ui) window.ui.showToast('🏆 Conquista: Poder Supremo desbloqueada!', 'gold');
      }
    }

    particles.createBurst(plot.x, plot.y, 25, ['#facc15', '#a855f7', '#38bdf8'], 180);
    particles.createShockwave(plot.x, plot.y, 70, 'rgba(250,204,21,0.85)');
    audio.playUpgrade();

    if (window.ui) {
      window.ui.showToast(`${def.name} construída com sucesso!`, 'green');
      window.ui.updateHUD();
    }
    return true;
  }

  // Melhorar Torre
  upgradeTower(tower) {
    const def = GAME_DATA.TOWERS[tower.key];
    if (!def) return false;

    const cost = Math.floor(def.cost * Math.pow(def.upgradeCostMult, tower.level));
    if (!state.spendCoins(cost)) {
      if (window.ui) window.ui.showToast('Moedas insuficientes para melhoria!', 'red');
      return false;
    }

    tower.level++;
    tower.totalInvested += cost;
    tower.damage += def.damagePerLevel;
    tower.range += def.rangePerLevel;
    tower.attackSpeed = +(tower.attackSpeed * 1.05).toFixed(2);

    particles.createBurst(tower.x, tower.y, 20, ['#facc15', '#ec4899', '#a855f7'], 150);
    audio.playUpgrade();

    if (window.ui) {
      window.ui.showToast(`🔥 ${tower.name} evoluída para Nível ${tower.level}!`, 'gold');
      window.ui.updateTowerModal(tower);
      window.ui.updateHUD();
    }
    return true;
  }

  // Vender Torre (Recupera 70% do ouro investido)
  sellTower(tower, plot) {
    const refund = Math.floor(tower.totalInvested * 0.7);
    state.addCoins(refund);
    plot.tower = null;
    this.selectedTower = null;

    particles.createBurst(plot.x, plot.y, 16, ['#facc15', '#9ca3af'], 100);
    audio.playCoin();

    if (window.ui) {
      window.ui.showToast(`Torre vendida por +${refund} moedas!`, 'gold');
      window.ui.closeModals();
      window.ui.updateHUD();
    }
  }

  // Iniciar Onda
  startWave() {
    if (state.waveInProgress) return;
    state.waveInProgress = true;
    this.autoWaveTimer = 0;

    const isBossWave = state.wave % 10 === 0;
    this.waveSpawnQueue = this.generateWaveQueue(state.wave, isBossWave);
    this.enemiesRemainingToSpawn = this.waveSpawnQueue.length;
    this.enemiesAlive = 0;
    this.spawnTimer = 0;

    if (isBossWave) {
      audio.playBossSpawn();
      particles.triggerScreenShake(8, 0.6);
      if (window.ui) {
        const bossDef = GAME_DATA.BOSSES[state.wave] || GAME_DATA.BOSSES.generic;
        window.ui.showToast(`⚠️ ALERTA DE CHEFE: ${bossDef.name} se aproxima!`, 'red');
      }
    } else {
      audio.playShoot('rifle');
      if (window.ui) {
        window.ui.showToast(`⚔️ Onda ${state.wave} iniciada!`, 'purple');
      }
    }

    if (window.ui) window.ui.updateHUD();
  }

  // Gerar Composição da Onda com Balanceamento Dinâmico
  generateWaveQueue(wave, isBossWave) {
    const queue = [];
    const count = Math.min(60, Math.floor(8 + wave * 2.2));

    // Determinar inimigos disponíveis com base na onda
    const available = ['zombie'];
    if (wave >= 2) available.push('skeleton');
    if (wave >= 4) available.push('vampire');
    if (wave >= 7) available.push('ghost');
    if (wave >= 12) available.push('werewolf');

    for (let i = 0; i < count; i++) {
      const type = available[Math.floor(Math.random() * available.length)];
      queue.push({
        type,
        isBoss: false,
        waveScale: 1 + (wave - 1) * 0.22,
      });
    }

    // Se for onda de Chefe, colocar o Boss no clímax da onda
    if (isBossWave) {
      queue.push({
        type: 'boss',
        isBoss: true,
        bossWave: wave,
        waveScale: 1 + (wave - 1) * 0.28,
      });
    }

    return queue;
  }

  // Spawnar Inimigo no início do caminho
  spawnEnemy(info) {
    let enemy = null;

    if (info.isBoss) {
      const bossDef = GAME_DATA.BOSSES[info.bossWave] || GAME_DATA.BOSSES.generic;
      const baseHp = 1200 * bossDef.hpMultiplier * (1 + (info.bossWave / 10) * 0.5);
      enemy = {
        id: 'boss_' + Date.now(),
        name: bossDef.name,
        icon: bossDef.icon,
        isBoss: true,
        title: bossDef.title,
        maxHp: Math.floor(baseHp),
        hp: Math.floor(baseHp),
        speed: bossDef.speed,
        baseSpeed: bossDef.speed,
        damage: bossDef.damage,
        reward: Math.floor(bossDef.reward * info.waveScale),
        xp: Math.floor(bossDef.xp * info.waveScale),
        color: bossDef.color,
        aura: bossDef.aura,
        radius: bossDef.radius,
        pathIndex: 0,
        x: this.path[0].x,
        y: this.path[0].y,
        distanceTraveled: 0,
        slowTimer: 0,
        burnTimer: 0,
        burnDps: 0,
      };
      this.waveBoss = enemy;
    } else {
      const def = GAME_DATA.ENEMIES[info.type];
      const scaledHp = Math.floor(def.baseHp * info.waveScale);
      enemy = {
        id: 'enemy_' + Date.now() + '_' + Math.random(),
        name: def.name,
        icon: def.icon,
        isBoss: false,
        maxHp: scaledHp,
        hp: scaledHp,
        speed: def.speed * (1 + Math.min(0.5, (state.wave * 0.01))),
        baseSpeed: def.speed,
        damage: def.damage,
        reward: Math.floor(def.reward * (1 + state.wave * 0.05)),
        xp: Math.floor(def.xp * (1 + state.wave * 0.05)),
        color: def.color,
        radius: def.radius,
        pathIndex: 0,
        x: this.path[0].x,
        y: this.path[0].y,
        distanceTraveled: 0,
        slowTimer: 0,
        burnTimer: 0,
        burnDps: 0,
      };
    }

    this.enemies.push(enemy);
    this.enemiesAlive++;
  }

  // Atualização da Lógica de Jogo
  update(dt) {
    if (this.isPaused) return;

    // Multiplicador de velocidade (1x, 2x, 3x)
    const effectiveDt = dt * state.gameSpeed;

    // Gerenciador de Spawns da Onda
    if (state.waveInProgress) {
      if (this.waveSpawnQueue.length > 0) {
        this.spawnTimer += effectiveDt;
        if (this.spawnTimer >= this.spawnInterval) {
          this.spawnTimer = 0;
          const info = this.waveSpawnQueue.shift();
          this.spawnEnemy(info);
        }
      } else if (this.enemies.length === 0) {
        // Onda concluída com sucesso!
        this.onWaveComplete();
      }
    } else if (state.autoWave) {
      // Auto-iniciar próxima onda após 2.5 segundos de descanso
      this.autoWaveTimer += effectiveDt;
      if (this.autoWaveTimer >= 2.5) {
        this.autoWaveTimer = 0;
        this.startWave();
      }
    }

    // Atualizar Inimigos
    this.updateEnemies(effectiveDt);

    // Atualizar Torres e Ataques
    this.updateTowers(effectiveDt);

    // Atualizar Projéteis
    this.updateProjectiles(effectiveDt);
  }

  // Atualiza Inimigos pelo Caminho
  updateEnemies(dt) {
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];

      // Aplicação de DoT de Queimadura
      if (e.burnTimer > 0) {
        e.burnTimer -= dt;
        const burnDamage = e.burnDps * dt;
        e.hp -= burnDamage;
        if (Math.random() < 0.2) {
          particles.createBurst(e.x, e.y, 2, ['#fb923c', '#ef4444'], 40);
        }
      }

      // Aplicação de Redução de Lentidão por Gelo
      if (e.slowTimer > 0) {
        e.slowTimer -= dt;
        e.speed = e.baseSpeed * 0.6;
      } else {
        e.speed = e.baseSpeed;
      }

      // Checar Morte por DoT
      if (e.hp <= 0) {
        this.killEnemy(e, i);
        continue;
      }

      // Movimentação pelos Waypoints
      const targetPoint = this.path[e.pathIndex + 1];
      if (!targetPoint) {
        // Inimigo alcançou a Base do jogador!
        this.enemyReachedBase(e, i);
        continue;
      }

      const dx = targetPoint.x - e.x;
      const dy = targetPoint.y - e.y;
      const dist = Math.hypot(dx, dy);
      const step = e.speed * dt;

      if (dist <= step) {
        e.x = targetPoint.x;
        e.y = targetPoint.y;
        e.pathIndex++;
      } else {
        e.x += (dx / dist) * step;
        e.y += (dy / dist) * step;
      }

      e.distanceTraveled += step;
    }
  }

  // Inimigo Chegou à Base
  enemyReachedBase(e, index) {
    this.enemies.splice(index, 1);
    this.enemiesAlive = Math.max(0, this.enemiesAlive - 1);

    state.lives -= e.damage;
    particles.triggerScreenShake(7, 0.35);
    particles.createBurst(970, 250, 25, ['#ef4444', '#dc2626', '#facc15'], 180);
    audio.playExplosion();

    if (window.ui) {
      window.ui.showToast(`🛡️ A Base sofreu ${e.damage} de dano!`, 'red');
      window.ui.updateHUD();
    }

    if (state.lives <= 0) {
      state.lives = 0;
      this.triggerGameOver();
    }
  }

  // Matar Inimigo
  killEnemy(e, index, killerTower = null) {
    this.enemies.splice(index, 1);
    this.enemiesAlive = Math.max(0, this.enemiesAlive - 1);

    // Recompensas
    state.addCoins(e.reward);
    state.addXp(e.xp);
    state.enemiesKilled++;

    if (e.isBoss) {
      state.bossesKilled++;
      this.waveBoss = null;
      audio.playEnemyDeath(true);
      particles.createBurst(e.x, e.y, 45, ['#facc15', '#c084fc', '#f43f5e'], 250);
      particles.createShockwave(e.x, e.y, 110, 'rgba(244,63,94,0.9)', 0.5);
      particles.addFloatingText(e.x, e.y - 25, `CHEFE DERROTADO! +${e.reward} 🪙`, '#facc15', 22, true);
    } else {
      audio.playEnemyDeath(false);
      particles.createBurst(e.x, e.y, 14, [e.color, '#facc15'], 120);
      particles.addFloatingText(e.x, e.y - 12, `+${e.reward} 🪙`, '#facc15', 14);
    }

    if (killerTower) {
      killerTower.kills++;
    }

    state.checkAchievements();
    if (window.ui) window.ui.updateHUD();
  }

  // Atualizar Torres
  updateTowers(dt) {
    const now = performance.now() / 1000;

    for (const plot of this.buildPlots) {
      const tower = plot.tower;
      if (!tower) continue;

      const def = GAME_DATA.TOWERS[tower.key];
      const fireInterval = 1 / tower.attackSpeed;

      if (now - tower.lastAttackTime >= fireInterval) {
        // Encontrar alvos no alcance
        const targets = this.findTargets(tower);
        if (targets.length > 0) {
          tower.lastAttackTime = now;
          this.executeTowerAttack(tower, def, targets);
        }
      }
    }
  }

  // Seleção de Alvos com base no modo prioritário
  findTargets(tower) {
    const inRange = this.enemies.filter(e => Math.hypot(e.x - tower.x, e.y - tower.y) <= tower.range);
    if (inRange.length === 0) return [];

    switch (tower.targetMode) {
      case 'strong':
        inRange.sort((a, b) => b.hp - a.hp);
        break;
      case 'weak':
        inRange.sort((a, b) => a.hp - b.hp);
        break;
      case 'last':
        inRange.sort((a, b) => a.distanceTraveled - b.distanceTraveled);
        break;
      case 'first':
      default:
        inRange.sort((a, b) => b.distanceTraveled - a.distanceTraveled);
        break;
    }

    return inRange;
  }

  // Disparo e Execução de Habilidade da Torre
  executeTowerAttack(tower, def, targets) {
    const primary = targets[0];

    audio.playShoot(def.type);

    switch (def.type) {
      case 'aoe_ground': // Espinhos
        targets.forEach(t => {
          this.applyDamage(t, tower.damage, tower);
          particles.createBurst(t.x, t.y, 4, ['#94a3b8', '#cbd5e1'], 50);
        });
        particles.createShockwave(tower.x, tower.y, tower.range * 0.8, 'rgba(148,163,184,0.6)', 0.2);
        break;

      case 'dot_fire': // Fogueira
        targets.forEach(t => {
          t.burnTimer = 3.0;
          t.burnDps = tower.damage;
          this.applyDamage(t, tower.damage * 0.4, tower);
        });
        particles.createBurst(tower.x, tower.y, 8, ['#fb923c', '#f59e0b'], 70);
        break;

      case 'chain_lightning': // Raio em Cadeia
        {
          const chainCount = def.chainTargets || 3;
          const chainList = targets.slice(0, chainCount);
          let prev = tower;
          chainList.forEach((t, idx) => {
            this.applyDamage(t, tower.damage * (1 - idx * 0.15), tower);
            this.createLightningArc(prev.x, prev.y, t.x, t.y);
            prev = t;
          });
        }
        break;

      case 'slow_ice': // Torre de Gelo
        targets.slice(0, 3).forEach(t => {
          t.slowTimer = def.slowDuration || 2.5;
          this.applyDamage(t, tower.damage, tower);
          particles.createBurst(t.x, t.y, 6, ['#67e8f9', '#a5f3fc'], 60);
        });
        break;

      case 'splash': // Canhão explosivo
        this.spawnProjectile(tower, primary, def, () => {
          // Explosão em área ao acertar
          const splashR = def.splashRadius || 55;
          particles.createBurst(primary.x, primary.y, 25, ['#ef4444', '#f97316', '#fbbf24'], 160);
          particles.createShockwave(primary.x, primary.y, splashR, 'rgba(239,68,68,0.7)', 0.3);
          audio.playExplosion();

          this.enemies.forEach(e => {
            const d = Math.hypot(e.x - primary.x, e.y - primary.y);
            if (d <= splashR) {
              const falloff = 1 - (d / splashR) * 0.5;
              this.applyDamage(e, tower.damage * falloff, tower);
            }
          });
        });
        break;

      case 'beam': // Orbe Lendário
        this.applyDamage(primary, tower.damage, tower);
        this.createBeamEffect(tower.x, tower.y, primary.x, primary.y, '#eab308');
        break;

      case 'chaos_nova': // Núcleo Mítico
        targets.slice(0, 4).forEach(t => {
          this.applyDamage(t, tower.damage, tower);
          this.createBeamEffect(tower.x, tower.y, t.x, t.y, '#f43f5e');
          particles.createBurst(t.x, t.y, 8, ['#f43f5e', '#a855f7'], 90);
        });
        break;

      case 'single':
      default:
        this.spawnProjectile(tower, primary, def, () => {
          this.applyDamage(primary, tower.damage, tower);
          particles.createBurst(primary.x, primary.y, 5, [def.bulletColor || '#fef08a'], 70);
        });
        break;
    }
  }

  // Cria Projétil Balístico animado
  spawnProjectile(tower, target, def, onHit) {
    this.projectiles.push({
      x: tower.x,
      y: tower.y,
      target,
      speed: def.projectileSpeed || 500,
      color: def.bulletColor || '#fef08a',
      radius: def.type === 'splash' ? 6 : 4,
      onHit,
    });
  }

  // Atualiza Movimentação de Projéteis
  updateProjectiles(dt) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];

      // Se o alvo morreu antes de chegar, acerta a última posição do alvo
      const tx = p.target && p.target.hp > 0 ? p.target.x : p.x;
      const ty = p.target && p.target.hp > 0 ? p.target.y : p.y;

      const dx = tx - p.x;
      const dy = ty - p.y;
      const dist = Math.hypot(dx, dy);
      const step = p.speed * dt;

      if (dist <= step || dist < 8) {
        if (p.onHit) p.onHit();
        this.projectiles.splice(i, 1);
      } else {
        p.x += (dx / dist) * step;
        p.y += (dy / dist) * step;
      }
    }
  }

  // Aplica dano com registro de estatísticas
  applyDamage(enemy, amount, tower) {
    enemy.hp -= amount;
    tower.totalDamageDealt += amount;

    if (state.settings.damageNumbers) {
      particles.addFloatingText(enemy.x, enemy.y - 10, `-${Math.round(amount)}`, '#fca5a5', 13);
    }

    if (enemy.hp <= 0) {
      const idx = this.enemies.indexOf(enemy);
      if (idx !== -1) {
        this.killEnemy(enemy, idx, tower);
      }
    }
  }

  // Efeito Visual de Raio Elétrico
  createLightningArc(x1, y1, x2, y2) {
    particles.particles.push({
      type: 'arc',
      x1, y1, x2, y2,
      life: 0.12,
      maxLife: 0.12,
      alpha: 1.0,
      color: '#c084fc',
    });
  }

  // Efeito Visual de Feixe Laser
  createBeamEffect(x1, y1, x2, y2, color) {
    particles.particles.push({
      type: 'beam',
      x1, y1, x2, y2,
      life: 0.14,
      maxLife: 0.14,
      alpha: 1.0,
      color,
    });
  }

  // Conclusão da Onda
  onWaveComplete() {
    state.waveInProgress = false;
    const waveReward = GAME_DATA.getWaveReward(state.wave);
    const waveXp = Math.floor(60 + state.wave * 25);

    state.addCoins(waveReward);
    state.addXp(waveXp);

    if (state.wave > state.highestWave) {
      state.highestWave = state.wave;
    }

    // Checar Conquistas de Onda
    state.checkAchievements();

    audio.playVictory();

    const wasBossWave = state.wave % 10 === 0;

    if (wasBossWave) {
      // Exibe a tela de vitória épica de marco/chefe!
      if (window.ui) {
        window.ui.showVictoryScreen(state.wave, waveReward, waveXp);
      }
    } else {
      if (window.ui) {
        window.ui.showToast(`🏆 Onda ${state.wave} Concluída! +${waveReward} 🪙, +${waveXp} XP`, 'gold');
        window.ui.updateHUD();
      }
    }

    state.wave++;
    state.save();
  }

  // Fim de Jogo (Derrota)
  triggerGameOver() {
    state.waveInProgress = false;
    this.enemies = [];
    this.projectiles = [];
    audio.playDefeat();

    if (window.ui) {
      window.ui.showGameOverScreen(state.wave);
    }
  }

  // Reiniciar Partida após Game Over
  restartGame() {
    state.lives = state.maxLives;
    state.waveInProgress = false;
    this.enemies = [];
    this.projectiles = [];
    this.waveSpawnQueue = [];

    // Limpar torres do tabuleiro
    this.buildPlots.forEach(p => p.tower = null);
    this.selectedTower = null;
    this.selectedPlot = null;

    if (window.ui) {
      window.ui.navigateTo('screen-game');
      window.ui.updateHUD();
    }
  }

  // Renderização Completa do Campo de Batalha no Canvas
  render() {
    if (!this.ctx) return;
    const ctx = this.ctx;

    ctx.save();
    ctx.clearRect(0, 0, this.width, this.height);

    // Efeito de Tremor de Tela
    particles.applyScreenShake(ctx);

    // 1. Fundo do Campo de Batalha (Gothic Dark Fantasy)
    this.renderBackground(ctx);

    // 2. Caminho Estratégico das Sombras
    this.renderPath(ctx);

    // 3. Base do Jogador (Cidadela Sombria com Cristais Protetores)
    this.renderBase(ctx);

    // 4. Portal de Spawn dos Inimigos
    this.renderSpawnPortal(ctx);

    // 5. Plataformas e Torres de Defesa
    this.renderPlotsAndTowers(ctx);

    // 6. Projéteis e Efeitos de Ataque
    this.renderProjectiles(ctx);

    // 7. Inimigos e Chefes com Barras de Vida
    this.renderEnemies(ctx);

    // 8. Motor de Partículas e Textos Flutuantes
    particles.render(ctx);

    ctx.restore();
  }

  renderBackground(ctx) {
    // Gradiente de fundo sombrio
    const bgGrad = ctx.createRadialGradient(500, 280, 50, 500, 280, 600);
    bgGrad.addColorStop(0, '#100c22');
    bgGrad.addColorStop(0.6, '#080514');
    bgGrad.addColorStop(1, '#030208');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, this.width, this.height);

    // Grade sutil mística de runas e pedras
    ctx.strokeStyle = 'rgba(147, 51, 234, 0.05)';
    ctx.lineWidth = 1;
    const gridSize = 40;
    for (let x = 0; x < this.width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, this.height);
      ctx.stroke();
    }
    for (let y = 0; y < this.height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(this.width, y);
      ctx.stroke();
    }
  }

  renderPath(ctx) {
    // Borda exterior do caminho com brilho rúnico
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(this.path[0].x, this.path[0].y);
    for (let i = 1; i < this.path.length; i++) {
      ctx.lineTo(this.path[i].x, this.path[i].y);
    }
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Borda de pedra sombria
    ctx.lineWidth = 54;
    ctx.strokeStyle = '#1e1438';
    ctx.stroke();

    // Faixa central de terra maldita
    ctx.lineWidth = 44;
    ctx.strokeStyle = '#110b22';
    ctx.stroke();

    // Linha mística de energia guia central
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(192, 132, 252, 0.25)';
    ctx.setLineDash([8, 12]);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.restore();
  }

  renderSpawnPortal(ctx) {
    const sp = this.path[0];
    const time = performance.now() * 0.003;

    ctx.save();
    ctx.translate(sp.x + 35, sp.y);

    // Vórtice sombrio giratório
    ctx.rotate(time);
    const grad = ctx.createRadialGradient(0, 0, 4, 0, 0, 36);
    grad.addColorStop(0, '#f43f5e');
    grad.addColorStop(0.5, '#7e22ce');
    grad.addColorStop(1, 'transparent');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, 36, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  renderBase(ctx) {
    const basePos = this.path[this.path.length - 2];
    ctx.save();
    ctx.translate(basePos.x, basePos.y);

    // Escudo protetor pulsante da Cidadela
    const pulse = Math.sin(performance.now() * 0.004) * 4;
    ctx.beginPath();
    ctx.arc(0, 0, 36 + pulse, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(234, 179, 8, 0.08)';
    ctx.strokeStyle = 'rgba(234, 179, 8, 0.5)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fill();

    // Ícone da Fortaleza
    ctx.font = '32px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🏰', 0, 0);

    ctx.restore();
  }

  renderPlotsAndTowers(ctx) {
    for (const plot of this.buildPlots) {
      const tower = plot.tower;

      ctx.save();
      ctx.translate(plot.x, plot.y);

      // Plataforma de Pedra Rúnica
      ctx.beginPath();
      ctx.arc(0, 0, 25, 0, Math.PI * 2);
      ctx.fillStyle = tower ? '#161129' : 'rgba(26, 18, 48, 0.7)';
      ctx.strokeStyle = tower ? GAME_DATA.RARITIES[tower.rarity].color : 'rgba(168, 85, 247, 0.35)';
      ctx.lineWidth = tower ? 2.5 : 1.5;
      ctx.fill();
      ctx.stroke();

      if (!tower) {
        // Sinal de "+" suave para construir
        ctx.fillStyle = 'rgba(168, 85, 247, 0.5)';
        ctx.font = '16px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('+', 0, 0);
      } else {
        // Ícone da Torre
        ctx.font = '24px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(tower.icon, 0, -2);

        // Nível da Torre (Estrela / Badge)
        ctx.fillStyle = '#facc15';
        ctx.font = 'bold 10px sans-serif';
        ctx.fillText(`Lv.${tower.level}`, 0, 18);

        // Se estiver selecionada, desenhar anel de alcance
        if (this.selectedTower === tower) {
          ctx.restore();
          ctx.save();
          ctx.beginPath();
          ctx.arc(plot.x, plot.y, tower.range, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(168, 85, 247, 0.12)';
          ctx.strokeStyle = GAME_DATA.RARITIES[tower.rarity].color;
          ctx.lineWidth = 1.5;
          ctx.setLineDash([4, 4]);
          ctx.fill();
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.restore();
          continue;
        }
      }

      ctx.restore();
    }
  }

  renderProjectiles(ctx) {
    for (const p of this.projectiles) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.shadowBlur = 8;
      ctx.shadowColor = p.color;
      ctx.fill();
      ctx.restore();
    }
  }

  renderEnemies(ctx) {
    for (const e of this.enemies) {
      ctx.save();
      ctx.translate(e.x, e.y);

      // Aura de Chefe
      if (e.isBoss) {
        const pulse = Math.sin(performance.now() * 0.006) * 5;
        ctx.beginPath();
        ctx.arc(0, 0, e.radius + 8 + pulse, 0, Math.PI * 2);
        ctx.fillStyle = e.aura || 'rgba(239, 68, 68, 0.3)';
        ctx.fill();
      }

      // Efeito de Congelamento
      if (e.slowTimer > 0) {
        ctx.beginPath();
        ctx.arc(0, 0, e.radius + 3, 0, Math.PI * 2);
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2.5;
        ctx.stroke();
      }

      // Efeito de Chamas
      if (e.burnTimer > 0) {
        ctx.beginPath();
        ctx.arc(0, 0, e.radius + 4, 0, Math.PI * 2);
        ctx.strokeStyle = '#fb923c';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // Ícone do Monstro
      ctx.font = `${Math.round(e.radius * 1.6)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(e.icon, 0, 0);

      // Barra de Vida
      const barW = e.isBoss ? 70 : 28;
      const barH = e.isBoss ? 6 : 4;
      const hpPct = Math.max(0, e.hp / e.maxHp);

      ctx.fillStyle = '#0f172a';
      ctx.fillRect(-barW / 2, -e.radius - 12, barW, barH);

      ctx.fillStyle = e.isBoss ? '#ef4444' : '#22c55e';
      ctx.fillRect(-barW / 2, -e.radius - 12, barW * hpPct, barH);

      // Nome do Chefe acima da barra
      if (e.isBoss) {
        ctx.font = 'bold 11px sans-serif';
        ctx.fillStyle = '#fef08a';
        ctx.shadowBlur = 4;
        ctx.shadowColor = '#000000';
        ctx.fillText(e.name, 0, -e.radius - 18);
      }

      ctx.restore();
    }
  }
}

// Instância global única
const game = new TowerDefenseGame();
