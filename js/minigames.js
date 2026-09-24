/**
 * SHADOW DEFENSE - minigames.js
 * 5 Minigames Bônus Completos:
 * 1. Roleta da Sorte
 * 2. Raspadinha Mística
 * 3. Jogo da Memória
 * 4. Escolha um Baú
 * 5. Clique Rápido (10s Speed Click)
 */

class MinigamesManager {
  constructor() {
    this.activeMinigame = null;
    this.isSpinning = false;
    this.speedClickActive = false;
    this.speedClickCount = 0;
    this.speedClickTimer = 10;
    this.speedClickInterval = null;
  }

  // 1. ROLETA DA SORTE
  initRoulette() {
    const canvas = document.getElementById('roulette-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = 340;
    canvas.height = 340;

    const slices = [
      { text: '150 🪙', color: '#1e1438', rewardCoins: 150, rewardXp: 40 },
      { text: '500 🪙', color: '#4c1d95', rewardCoins: 500, rewardXp: 80 },
      { text: '+1 Ticket 🎫', color: '#047857', rewardTickets: 1, rewardXp: 50 },
      { text: '1.200 🪙', color: '#1e1438', rewardCoins: 1200, rewardXp: 120 },
      { text: '3.000 🪙', color: '#6d28d9', rewardCoins: 3000, rewardXp: 200 },
      { text: '500 XP 🔮', color: '#0369a1', rewardCoins: 200, rewardXp: 500 },
      { text: 'JACKPOT 10k! 👑', color: '#b45309', rewardCoins: 10000, rewardXp: 1000 },
      { text: '800 🪙', color: '#1e1438', rewardCoins: 800, rewardXp: 90 },
    ];

    let currentRotation = 0;

    const drawWheel = (angle) => {
      const numSlices = slices.length;
      const sliceAngle = (Math.PI * 2) / numSlices;
      const radius = 150;
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(angle);

      for (let i = 0; i < numSlices; i++) {
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, radius, i * sliceAngle, (i + 1) * sliceAngle);
        ctx.fillStyle = slices[i].color;
        ctx.fill();
        ctx.strokeStyle = '#facc15';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Texto do setor
        ctx.save();
        ctx.rotate(i * sliceAngle + sliceAngle / 2);
        ctx.textAlign = 'right';
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 13px sans-serif';
        ctx.shadowBlur = 4;
        ctx.shadowColor = '#000000';
        ctx.fillText(slices[i].text, radius - 15, 5);
        ctx.restore();
      }

      // Centro dourado
      ctx.beginPath();
      ctx.arc(0, 0, 22, 0, Math.PI * 2);
      ctx.fillStyle = '#facc15';
      ctx.fill();
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 3;
      ctx.stroke();

      ctx.restore();

      // Indicador / Ponteiro no Topo
      ctx.beginPath();
      ctx.moveTo(cx - 14, 10);
      ctx.lineTo(cx + 14, 10);
      ctx.lineTo(cx, 34);
      ctx.closePath();
      ctx.fillStyle = '#f43f5e';
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();
    };

    drawWheel(0);

    const spinBtn = document.getElementById('spin-roulette-btn');
    if (spinBtn) {
      spinBtn.onclick = () => {
        if (this.isSpinning) return;
        if (state.minigameTickets < 1) {
          window.ui.showToast('Sem tickets de minigame disponíveis! Suba de nível ou vença ondas para ganhar mais.', 'red');
          return;
        }

        state.minigameTickets--;
        this.isSpinning = true;
        spinBtn.disabled = true;
        if (window.ui) window.ui.updateMinigamesUI();

        const numSlices = slices.length;
        const targetIndex = Math.floor(Math.random() * numSlices);
        const sliceAngle = (Math.PI * 2) / numSlices;
        // Calcular ângulo para o ponteiro parar no topo (-PI/2)
        const targetAngle = (Math.PI * 2 * 5) + ((numSlices - targetIndex - 0.5) * sliceAngle) - (Math.PI / 2);

        const startTime = performance.now();
        const duration = 4000;
        let lastTickIndex = -1;

        const animateSpin = (now) => {
          const elapsed = now - startTime;
          const progress = Math.min(1, elapsed / duration);
          // Easing Cubic Out
          const easeOut = 1 - Math.pow(1 - progress, 3);
          const currentAngle = currentRotation + targetAngle * easeOut;

          drawWheel(currentAngle);

          // Efeito sonoro do tick do ponteiro
          const currentSlice = Math.floor(((currentAngle + Math.PI / 2) % (Math.PI * 2)) / sliceAngle);
          if (currentSlice !== lastTickIndex) {
            audio.playClick();
            lastTickIndex = currentSlice;
          }

          if (progress < 1) {
            requestAnimationFrame(animateSpin);
          } else {
            currentRotation = currentAngle % (Math.PI * 2);
            this.isSpinning = false;
            spinBtn.disabled = false;

            const prize = slices[targetIndex];
            audio.playVictory();
            if (prize.rewardCoins) state.addCoins(prize.rewardCoins);
            if (prize.rewardXp) state.addXp(prize.rewardXp);
            if (prize.rewardTickets) state.minigameTickets += prize.rewardTickets;

            window.ui.showToast(`🎉 Roleta: Você ganhou ${prize.text}!`, 'gold');
            particles.createBurst(window.innerWidth / 2, window.innerHeight / 2, 40, ['#facc15', '#a855f7'], 200);
            window.ui.updateHUD();
            window.ui.updateMinigamesUI();
          }
        };

        requestAnimationFrame(animateSpin);
      };
    }
  }

  // 2. RASPADINHA MÍSTICA (Canvas Interativo com Cursor de Raspagem)
  initScratchcard() {
    const canvas = document.getElementById('scratch-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = 320;
    canvas.height = 200;

    const symbolsPool = ['💎', '👑', '🔮', '🪙', '⚡', '💀'];
    // Gerar 6 casas
    let matching = Math.random() < 0.45; // 45% de chance de vitória
    let chosenWinning = symbolsPool[Math.floor(Math.random() * (symbolsPool.length - 1))];
    let slots = [];

    if (matching) {
      slots = [chosenWinning, chosenWinning, chosenWinning];
      while (slots.length < 6) {
        slots.push(symbolsPool[Math.floor(Math.random() * symbolsPool.length)]);
      }
      slots.sort(() => Math.random() - 0.5);
    } else {
      slots = [symbolsPool[0], symbolsPool[1], symbolsPool[2], symbolsPool[0], symbolsPool[1], symbolsPool[3]];
      slots.sort(() => Math.random() - 0.5);
    }

    // Desenhar símbolos por baixo no container HTML
    const gridEl = document.getElementById('scratch-hidden-grid');
    if (gridEl) {
      gridEl.innerHTML = '';
      slots.forEach(sym => {
        const d = document.createElement('div');
        d.className = 'scratch-slot-icon';
        d.textContent = sym;
        gridEl.appendChild(d);
      });
    }

    // Camada raspável prateada/sombria no Canvas
    const drawFoil = () => {
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = '#334155';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#64748b';
      ctx.font = 'bold 16px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('✨ RASPE COM O MOUSE OU TOQUE ✨', canvas.width / 2, canvas.height / 2 - 10);
      ctx.font = '12px sans-serif';
      ctx.fillText('Encontre 3 símbolos iguais para vencer!', canvas.width / 2, canvas.height / 2 + 15);
    };

    drawFoil();

    let isScratching = false;
    let scratchedPixels = 0;
    let evaluated = false;

    const scratch = (x, y) => {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath();
      ctx.arc(x, y, 22, 0, Math.PI * 2);
      ctx.fill();

      scratchedPixels++;
      if (scratchedPixels % 12 === 0) {
        audio.playClick();
      }

      if (scratchedPixels > 85 && !evaluated) {
        evaluated = true;
        // Revelar resultado
        if (matching) {
          const reward = 1200 + state.level * 250;
          state.addCoins(reward);
          state.addXp(300);
          audio.playVictory();
          window.ui.showToast(`🎉 Raspadinha Vencedora! 3x ${chosenWinning} encontrados! +${reward} 🪙`, 'gold');
        } else {
          audio.playClick();
          window.ui.showToast('Quase! Tente outra raspadinha para encontrar 3 iguais.', 'purple');
        }
        window.ui.updateHUD();
      }
    };

    const getPos = (e) => {
      const rect = canvas.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      return {
        x: (clientX - rect.left) * (canvas.width / rect.width),
        y: (clientY - rect.top) * (canvas.height / rect.height)
      };
    };

    canvas.onmousedown = (e) => { isScratching = true; const p = getPos(e); scratch(p.x, p.y); };
    canvas.onmousemove = (e) => { if (isScratching) { const p = getPos(e); scratch(p.x, p.y); } };
    window.addEventListener('mouseup', () => isScratching = false);

    canvas.ontouchstart = (e) => { isScratching = true; const p = getPos(e); scratch(p.x, p.y); };
    canvas.ontouchmove = (e) => { if (isScratching) { const p = getPos(e); scratch(p.x, p.y); } };
    window.addEventListener('touchend', () => isScratching = false);

    const resetBtn = document.getElementById('new-scratch-btn');
    if (resetBtn) {
      resetBtn.onclick = () => {
        if (state.minigameTickets < 1) {
          window.ui.showToast('Sem tickets de minigame!', 'red');
          return;
        }
        state.minigameTickets--;
        window.ui.updateMinigamesUI();
        this.initScratchcard();
      };
    }
  }

  // 3. JOGO DA MEMÓRIA
  initMemoryGame() {
    const container = document.getElementById('memory-cards-grid');
    if (!container) return;
    container.innerHTML = '';

    const icons = ['💀', '🧛', '👻', '🐺', '💎', '👑'];
    const deck = [...icons, ...icons].sort(() => Math.random() - 0.5);

    let flippedCards = [];
    let matchedPairs = 0;
    let moves = 0;

    deck.forEach((icon, idx) => {
      const card = document.createElement('div');
      card.className = 'memory-card';
      card.dataset.icon = icon;
      card.dataset.index = idx;
      card.innerHTML = `
        <div class="card-inner">
          <div class="card-front">❓</div>
          <div class="card-back">${icon}</div>
        </div>
      `;

      card.onclick = () => {
        if (card.classList.contains('flipped') || card.classList.contains('matched') || flippedCards.length >= 2) return;

        audio.playClick();
        card.classList.add('flipped');
        flippedCards.push(card);

        if (flippedCards.length === 2) {
          moves++;
          const [c1, c2] = flippedCards;
          if (c1.dataset.icon === c2.dataset.icon) {
            // Par correspondente!
            audio.playCoin();
            c1.classList.add('matched');
            c2.classList.add('matched');
            matchedPairs++;
            flippedCards = [];

            if (matchedPairs === icons.length) {
              // Vitória no jogo da memória
              const reward = Math.max(500, Math.floor(2500 - moves * 50) + state.level * 100);
              state.addCoins(reward);
              state.addXp(350);
              audio.playVictory();
              window.ui.showToast(`🧠 Memória Afiada! Concluído em ${moves} jogadas! +${reward} 🪙`, 'gold');
              window.ui.updateHUD();
            }
          } else {
            // Errou o par
            setTimeout(() => {
              c1.classList.remove('flipped');
              c2.classList.remove('flipped');
              flippedCards = [];
            }, 800);
          }
        }
      };

      container.appendChild(card);
    });
  }

  // 4. ESCOLHA UM BAÚ
  initChestPicker() {
    const container = document.getElementById('chests-container');
    if (!container) return;
    container.innerHTML = '';

    const chestsData = [
      { reward: 600 + state.level * 100, xp: 120, title: 'Tesouro Comum' },
      { reward: 1800 + state.level * 250, xp: 300, title: 'Tesouro Raro' },
      { reward: 5000 + state.level * 600, xp: 800, title: 'LENDÁRIO!' },
    ].sort(() => Math.random() - 0.5);

    let picked = false;

    chestsData.forEach((data, idx) => {
      const box = document.createElement('div');
      box.className = 'mystery-chest';
      box.innerHTML = `
        <div class="chest-icon">📦</div>
        <div class="chest-label">Baú #${idx + 1}</div>
        <div class="chest-loot" style="display:none;"></div>
      `;

      box.onclick = () => {
        if (picked) return;
        if (state.minigameTickets < 1) {
          window.ui.showToast('Sem tickets para abrir o baú!', 'red');
          return;
        }

        state.minigameTickets--;
        picked = true;
        audio.playVictory();

        // Revelar todos os baús
        container.querySelectorAll('.mystery-chest').forEach((cEl, cIdx) => {
          cEl.classList.add('opened');
          const loot = chestsData[cIdx];
          const iconEl = cEl.querySelector('.chest-icon');
          const lootEl = cEl.querySelector('.chest-loot');
          iconEl.textContent = '🎁';
          lootEl.style.display = 'block';
          lootEl.innerHTML = `<strong>${loot.title}</strong><br>+${loot.reward} 🪙`;

          if (cEl === box) {
            cEl.classList.add('winner');
            state.addCoins(loot.reward);
            state.addXp(loot.xp);
            window.ui.showToast(`✨ Você abriu o ${loot.title} e ganhou +${loot.reward} 🪙!`, 'gold');
          }
        });

        window.ui.updateHUD();
        window.ui.updateMinigamesUI();
      };

      container.appendChild(box);
    });
  }

  // 5. CLIQUE RÁPIDO (10 Segundos)
  initSpeedClick() {
    const orb = document.getElementById('speed-click-orb');
    const timerEl = document.getElementById('speed-click-timer');
    const countEl = document.getElementById('speed-click-count');
    const startBtn = document.getElementById('start-speed-click-btn');

    if (!orb || !startBtn) return;

    this.speedClickActive = false;
    this.speedClickCount = 0;
    this.speedClickTimer = 10;
    timerEl.textContent = '10.0s';
    countEl.textContent = '0';
    startBtn.disabled = false;

    startBtn.onclick = () => {
      if (this.speedClickActive) return;
      if (state.minigameTickets < 1) {
        window.ui.showToast('Sem tickets de minigame!', 'red');
        return;
      }

      state.minigameTickets--;
      window.ui.updateMinigamesUI();

      this.speedClickActive = true;
      this.speedClickCount = 0;
      this.speedClickTimer = 10;
      startBtn.disabled = true;
      countEl.textContent = '0';

      const startTime = performance.now();

      this.speedClickInterval = setInterval(() => {
        const remaining = Math.max(0, 10 - ((performance.now() - startTime) / 1000));
        timerEl.textContent = `${remaining.toFixed(1)}s`;

        if (remaining <= 0) {
          clearInterval(this.speedClickInterval);
          this.speedClickActive = false;
          startBtn.disabled = false;

          // Recompensa baseada no total de cliques
          const reward = this.speedClickCount * (30 + state.level * 8);
          state.addCoins(reward);
          state.addXp(this.speedClickCount * 5);
          audio.playVictory();
          window.ui.showToast(`⚡ Fim do Teste! ${this.speedClickCount} cliques (${(this.speedClickCount / 10).toFixed(1)} CPS)! +${reward} 🪙`, 'gold');
          window.ui.updateHUD();
        }
      }, 50);
    };

    orb.onclick = () => {
      if (!this.speedClickActive) return;
      this.speedClickCount++;
      countEl.textContent = this.speedClickCount;
      audio.playClick();
      orb.classList.remove('orb-bounce');
      void orb.offsetWidth;
      orb.classList.add('orb-bounce');
    };
  }
}

// Instância global única
const minigames = new MinigamesManager();
