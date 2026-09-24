/**
 * SHADOW DEFENSE - main.js
 * Ponto de Entrada, Game Loop Central, Gerenciador de Carregamento e Atalhos de Teclado
 */

window.addEventListener('DOMContentLoaded', () => {
  // 1. Carregar progresso salvo no LocalStorage
  state.load();

  // 2. Inicializar Canvas do Tower Defense
  const canvas = document.getElementById('defense-canvas');
  if (canvas) {
    game.init(canvas);
  }

  // 3. Inicializar Sistema de Clique do Cristal Sombrio
  clicker.init();

  // 4. Inicializar Gerenciador de Interface e Telas
  ui.init();

  // 5. Configurar Fechamento de Modais
  document.querySelectorAll('.modal-close-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      ui.closeModals();
      audio.playClick();
    });
  });

  // Fechar modal ao clicar fora do conteúdo
  document.querySelectorAll('.game-modal').forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        ui.closeModals();
      }
    });
  });

  // 6. Simulação de Tela de Carregamento Temática
  simulateLoadingScreen();

  // 7. Configurar Atalhos de Teclado
  setupKeyboardShortcuts();

  // 8. Iniciar Game Loop Central
  lastLoopTime = performance.now();
  requestAnimationFrame(gameLoop);

  // 9. Auto-Salvamento Periódico a cada 10 segundos
  setInterval(() => {
    state.save();
  }, 10000);
});

// Simulação de Carregamento Suave
function simulateLoadingScreen() {
  const fill = document.getElementById('loading-bar-fill');
  const tipText = document.getElementById('loading-tip-text');

  const tips = [
    'Dica: O Cristal Sombrio é sua principal fonte de riqueza. Clique sem parar para manter o combo alto!',
    'Dica: A cada 10 ondas, um temível Chefe invade o campo com muita vida. Prepare torres com alto dano!',
    'Dica: A Torre de Gelo desacelera os inimigos, permitindo que suas outras defesas causem mais dano.',
    'Dica: Use seus tickets na aba BÔNUS para ganhar moedas extras na Roleta e Raspadinha.',
    'Dica: Invista na Árvore de Economia para multiplicar permanentemente seus ganhos e chances críticas.'
  ];

  let progress = 0;
  const interval = setInterval(() => {
    progress += Math.floor(Math.random() * 18) + 12;
    if (progress > 100) progress = 100;

    if (fill) fill.style.width = `${progress}%`;

    if (progress >= 100) {
      clearInterval(interval);
      setTimeout(() => {
        ui.navigateTo('screen-menu');
      }, 500);
    }
  }, 120);

  if (tipText) {
    tipText.textContent = tips[Math.floor(Math.random() * tips.length)];
  }
}

// Configuração de Atalhos Úteis no Teclado
function setupKeyboardShortcuts() {
  window.addEventListener('keydown', (e) => {
    // Tecla ESC: Fechar qualquer modal aberto
    if (e.key === 'Escape') {
      ui.closeModals();
    }

    // Apenas durante a tela de jogo
    if (ui.currentScreen === 'screen-game') {
      // Barra de Espaço: Iniciar Próxima Onda
      if (e.code === 'Space' && !e.target.matches('input, textarea, select')) {
        e.preventDefault();
        game.startWave();
      }

      // 1, 2, 3: Alternar velocidade do jogo
      if (e.key === '1') { state.gameSpeed = 1; updateSpeedBtn(); }
      if (e.key === '2') { state.gameSpeed = 2; updateSpeedBtn(); }
      if (e.key === '3') { state.gameSpeed = 3; updateSpeedBtn(); }

      // M: Silenciar/Ativar Música
      if (e.key.toLowerCase() === 'm') {
        const active = audio.toggleMusic();
        const mBtn = document.getElementById('btn-toggle-music');
        if (mBtn) mBtn.textContent = active ? 'Música: 🎵' : 'Música: 🔇';
      }

      // S: Silenciar/Ativar SFX
      if (e.key.toLowerCase() === 's') {
        const active = audio.toggleSFX();
        const sBtn = document.getElementById('btn-toggle-sfx');
        if (sBtn) sBtn.textContent = active ? 'SFX: 🔊' : 'SFX: 🔇';
      }
    }
  });
}

function updateSpeedBtn() {
  const speedBtn = document.getElementById('btn-speed-toggle');
  if (speedBtn) speedBtn.textContent = `${state.gameSpeed}x ⏩`;
}

// Game Loop Central (requestAnimationFrame de Alta Precisão)
let lastLoopTime = performance.now();

function gameLoop(now) {
  const dt = Math.min(0.1, (now - lastLoopTime) / 1000); // Clamped dt para estabilidade
  lastLoopTime = now;

  // Atualizar Sistema de Clique e Geração Idle
  clicker.update(dt);

  // Atualizar Motor do Tower Defense
  game.update(dt);

  // Atualizar Motor de Partículas
  particles.update(dt);

  // Renderizar Campo de Batalha (se a tela ativa for o jogo)
  if (ui.currentScreen === 'screen-game') {
    game.render();
  }

  requestAnimationFrame(gameLoop);
}
