/**
 * SHADOW DEFENSE - particles.js
 * Motor de Partículas de Alta Eficiência e Efeitos Visuais
 */

class ParticleEngine {
  constructor() {
    this.particles = [];
    this.floatingTexts = [];
    this.shockwaves = [];
    this.shakeIntensity = 0;
    this.shakeDuration = 0;
  }

  // Cria explosão de partículas
  createBurst(x, y, count = 12, colors = ['#a855f7', '#c084fc', '#facc15'], speedMax = 160) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 30 + Math.random() * speedMax;
      const life = 0.4 + Math.random() * 0.5;
      const size = 2 + Math.random() * 4.5;
      const color = colors[Math.floor(Math.random() * colors.length)];

      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color,
        size,
        alpha: 1.0,
        maxLife: life,
        life,
        gravity: 60, // Gravidade suave
      });
    }
  }

  // Cria onda de choque circular
  createShockwave(x, y, maxRadius = 60, color = 'rgba(192, 132, 252, 0.8)', duration = 0.35) {
    this.shockwaves.push({
      x,
      y,
      radius: 4,
      maxRadius,
      color,
      life: duration,
      maxLife: duration,
    });
  }

  // Adiciona texto flutuante (dano, moedas, crítico)
  addFloatingText(x, y, text, color = '#facc15', size = 16, isCrit = false) {
    this.floatingTexts.push({
      x: x + (Math.random() * 20 - 10),
      y,
      text,
      color,
      size: isCrit ? size * 1.35 : size,
      alpha: 1.0,
      vy: isCrit ? -80 : -55,
      life: isCrit ? 1.0 : 0.75,
      maxLife: isCrit ? 1.0 : 0.75,
      isCrit,
    });
  }

  // Efeito de Tremor de Tela
  triggerScreenShake(intensity = 6, duration = 0.25) {
    if (!state.settings.screenShake) return;
    this.shakeIntensity = Math.max(this.shakeIntensity, intensity);
    this.shakeDuration = Math.max(this.shakeDuration, duration);
  }

  // Atualiza física das partículas e textos
  update(dt) {
    // Atualiza Tremor de Tela
    if (this.shakeDuration > 0) {
      this.shakeDuration -= dt;
      if (this.shakeDuration <= 0) {
        this.shakeIntensity = 0;
      }
    }

    // Atualiza Partículas
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }
      p.x += p.vx * dt;
      p.y += (p.vy + p.gravity * (1 - p.life / p.maxLife)) * dt;
      p.alpha = Math.max(0, p.life / p.maxLife);
    }

    // Atualiza Ondas de Choque
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const sw = this.shockwaves[i];
      sw.life -= dt;
      if (sw.life <= 0) {
        this.shockwaves.splice(i, 1);
        continue;
      }
      const progress = 1 - (sw.life / sw.maxLife);
      sw.radius = 4 + (sw.maxRadius - 4) * progress;
    }

    // Atualiza Textos Flutuantes
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.life -= dt;
      if (ft.life <= 0) {
        this.floatingTexts.splice(i, 1);
        continue;
      }
      ft.y += ft.vy * dt;
      ft.alpha = Math.max(0, ft.life / ft.maxLife);
    }
  }

  // Renderiza sobre o Canvas
  render(ctx) {
    ctx.save();

    // Renderiza Ondas de Choque
    for (const sw of this.shockwaves) {
      const alpha = Math.max(0, sw.life / sw.maxLife);
      ctx.beginPath();
      ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
      ctx.lineWidth = 3 * alpha;
      ctx.strokeStyle = sw.color.replace('0.8', `${alpha * 0.8}`);
      ctx.stroke();
    }

    // Renderiza Partículas
    for (const p of this.particles) {
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.shadowBlur = 6;
      ctx.shadowColor = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Renderiza Textos Flutuantes
    for (const ft of this.floatingTexts) {
      ctx.save();
      ctx.globalAlpha = ft.alpha;
      ctx.font = `${ft.isCrit ? 'bold ' : ''}${Math.round(ft.size)}px 'Segoe UI', Tahoma, sans-serif`;
      ctx.fillStyle = ft.color;
      ctx.shadowBlur = ft.isCrit ? 12 : 5;
      ctx.shadowColor = ft.isCrit ? '#ff0055' : '#000000';
      ctx.textAlign = 'center';
      ctx.fillText(ft.text, ft.x, ft.y);
      ctx.restore();
    }

    ctx.restore();
  }

  // Aplica tremor no contexto do canvas
  applyScreenShake(ctx) {
    if (this.shakeDuration > 0 && this.shakeIntensity > 0) {
      const ox = (Math.random() - 0.5) * this.shakeIntensity * 2;
      const oy = (Math.random() - 0.5) * this.shakeIntensity * 2;
      ctx.translate(ox, oy);
    }
  }
}

// Instância global
const particles = new ParticleEngine();
