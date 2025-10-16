// Fundo animado 3D com partículas pulsantes - Otimizado para performance
class BackgroundAnimation {
  constructor() {
    this.canvas = document.getElementById('bg-canvas');
    this.ctx = this.canvas.getContext('2d', { alpha: false });
    this.particles = [];
    this.particleCount = 50; // Reduzido para melhor performance
    this.mouseX = 0;
    this.mouseY = 0;
    this.animationId = null;

    this.init();
  }

  init() {
    this.resize();
    this.createParticles();
    this.setupEventListeners();
    this.animate();
  }

  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  createParticles() {
    this.particles = [];
    for (let i = 0; i < this.particleCount; i++) {
      this.particles.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        radius: Math.random() * 2 + 1,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        pulse: Math.random() * Math.PI * 2,
        pulseSpeed: Math.random() * 0.02 + 0.01
      });
    }
  }

  setupEventListeners() {
    window.addEventListener('resize', () => {
      this.resize();
      this.createParticles();
    });

    document.addEventListener('mousemove', (e) => {
      this.mouseX = e.clientX;
      this.mouseY = e.clientY;
    });
  }

  drawParticles() {
    this.particles.forEach((particle, i) => {
      // Atualiza posição
      particle.x += particle.vx;
      particle.y += particle.vy;

      // Bounce nas bordas
      if (particle.x < 0 || particle.x > this.canvas.width) particle.vx *= -1;
      if (particle.y < 0 || particle.y > this.canvas.height) particle.vy *= -1;

      // Atualiza pulso
      particle.pulse += particle.pulseSpeed;
      const scale = Math.sin(particle.pulse) * 0.5 + 1;
      const currentRadius = particle.radius * scale;

      // Calcula distância do mouse
      const dx = this.mouseX - particle.x;
      const dy = this.mouseY - particle.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const maxDistance = 150;

      // Efeito de repulsão suave
      if (distance < maxDistance) {
        const force = (maxDistance - distance) / maxDistance;
        particle.x -= (dx / distance) * force * 2;
        particle.y -= (dy / distance) * force * 2;
      }

      // Desenha partícula com gradiente
      const gradient = this.ctx.createRadialGradient(
        particle.x, particle.y, 0,
        particle.x, particle.y, currentRadius * 3
      );
      gradient.addColorStop(0, 'rgba(59, 130, 246, 0.8)');
      gradient.addColorStop(0.5, 'rgba(96, 165, 250, 0.4)');
      gradient.addColorStop(1, 'rgba(59, 130, 246, 0)');

      this.ctx.fillStyle = gradient;
      this.ctx.beginPath();
      this.ctx.arc(particle.x, particle.y, currentRadius * 3, 0, Math.PI * 2);
      this.ctx.fill();

      // Desenha conexões com partículas próximas
      for (let j = i + 1; j < this.particles.length; j++) {
        const other = this.particles[j];
        const dx = particle.x - other.x;
        const dy = particle.y - other.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 120) {
          const opacity = (1 - dist / 120) * 0.3;
          this.ctx.strokeStyle = `rgba(59, 130, 246, ${opacity})`;
          this.ctx.lineWidth = 0.5;
          this.ctx.beginPath();
          this.ctx.moveTo(particle.x, particle.y);
          this.ctx.lineTo(other.x, other.y);
          this.ctx.stroke();
        }
      }
    });
  }

  drawWaves() {
    const time = Date.now() * 0.001;

    // Ondas de fundo
    for (let i = 0; i < 3; i++) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, this.canvas.height / 2);

      for (let x = 0; x < this.canvas.width; x += 10) {
        const y = Math.sin(x * 0.01 + time + i) * 20 +
                  Math.sin(x * 0.005 + time * 0.5) * 30 +
                  this.canvas.height / 2 + i * 50;
        this.ctx.lineTo(x, y);
      }

      this.ctx.strokeStyle = `rgba(59, 130, 246, ${0.1 - i * 0.02})`;
      this.ctx.lineWidth = 2;
      this.ctx.stroke();
    }
  }

  animate() {
    // Limpa canvas com gradiente de fundo
    const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
    gradient.addColorStop(0, '#0a0e27');
    gradient.addColorStop(0.5, '#0f1535');
    gradient.addColorStop(1, '#0a0e27');
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Desenha elementos
    this.drawWaves();
    this.drawParticles();

    // Continua animação
    this.animationId = requestAnimationFrame(() => this.animate());
  }

  destroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }
}

// Inicializa quando o DOM estiver pronto
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new BackgroundAnimation();
  });
} else {
  new BackgroundAnimation();
}
