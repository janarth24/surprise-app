import { useEffect, useRef } from 'react';

export default function AnimatedBackground({ children }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    handleResize();
    window.addEventListener('resize', handleResize);

    // 1. Floating Balloons (15 items) 🎈
    const balloons = Array.from({ length: 15 }, () => ({
      x: Math.random() * canvas.width,
      y: canvas.height + Math.random() * 300,
      size: Math.floor(Math.random() * 20 + 24), // 24px to 44px
      speedY: Math.random() * 0.8 + 0.4,
      drift: Math.random() * 0.5 - 0.25,
    }));

    // 2. Floating Gift Boxes (12 items) 🎁
    const gifts = Array.from({ length: 12 }, () => ({
      x: Math.random() * canvas.width,
      y: canvas.height + Math.random() * 400,
      size: Math.floor(Math.random() * 18 + 22), // 22px to 40px
      speedY: Math.random() * 0.6 + 0.3,
      rotation: Math.random() * Math.PI,
      rotSpeed: Math.random() * 0.02 - 0.01,
    }));

    // 3. Falling Confetti (40 items) 🎉 🎊
    const confettiTypes = ['🎉', '🎊', '✨', '⭐'];
    const confetti = Array.from({ length: 40 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height - canvas.height,
      size: Math.floor(Math.random() * 12 + 14),
      speedY: Math.random() * 1.2 + 0.8,
      speedX: Math.random() * 0.8 - 0.4,
      emoji: confettiTypes[Math.floor(Math.random() * confettiTypes.length)],
    }));

    // 4. Fireworks Particle Burst Generator 🎆
    let fireworkParticles = [];
    const triggerFirework = () => {
      const cx = Math.random() * canvas.width;
      const cy = Math.random() * (canvas.height * 0.4) + 100;
      const colors = ['#f43f5e', '#ec4899', '#a855f7', '#3b82f6', '#10b981', '#f59e0b', '#facc15'];

      for (let i = 0; i < 45; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 5 + 1.5;
        fireworkParticles.push({
          x: cx,
          y: cy,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          alpha: 1,
          color: colors[Math.floor(Math.random() * colors.length)],
          radius: Math.random() * 3 + 2,
        });
      }
    };

    const fireworkInterval = setInterval(triggerFirework, 5000);
    triggerFirework();

    // --- MAIN ANIMATION LOOP ---
    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // A. Draw & Move Falling Confetti 🎉
      confetti.forEach((c) => {
        c.y += c.speedY;
        c.x += c.speedX;
        if (c.y > canvas.height) {
          c.y = -20;
          c.x = Math.random() * canvas.width;
        }
        ctx.font = `${c.size}px serif`;
        ctx.fillText(c.emoji, c.x, c.y);
      });

      // B. Draw & Move Floating Balloons 🎈
      balloons.forEach((b) => {
        b.y -= b.speedY;
        b.x += b.drift;
        if (b.y < -50) {
          b.y = canvas.height + 50;
          b.x = Math.random() * canvas.width;
        }
        ctx.font = `${b.size}px serif`;
        ctx.fillText('🎈', b.x, b.y);
      });

      // C. Draw & Move Floating Gift Boxes 🎁
      gifts.forEach((g) => {
        g.y -= g.speedY;
        g.rotation += g.rotSpeed;
        if (g.y < -50) {
          g.y = canvas.height + 50;
          g.x = Math.random() * canvas.width;
        }
        ctx.save();
        ctx.translate(g.x, g.y);
        ctx.rotate(g.rotation);
        ctx.font = `${g.size}px serif`;
        ctx.fillText('🎁', 0, 0);
        ctx.restore();
      });

      // D. Draw Fireworks Explosion 🎆
      fireworkParticles.forEach((fp, index) => {
        fp.x += fp.vx;
        fp.y += fp.vy;
        fp.vy += 0.05; // Gravity
        fp.alpha -= 0.015;

        if (fp.alpha <= 0) {
          fireworkParticles.splice(index, 1);
        } else {
          ctx.beginPath();
          ctx.arc(fp.x, fp.y, fp.radius, 0, Math.PI * 2);
          ctx.fillStyle = fp.color;
          ctx.globalAlpha = fp.alpha;
          ctx.shadowBlur = 12;
          ctx.shadowColor = fp.color;
          ctx.fill();
          ctx.shadowBlur = 0;
          ctx.globalAlpha = 1.0;
        }
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      clearInterval(fireworkInterval);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className="main-background-wrapper">
      <canvas ref={canvasRef} className="bg-canvas" />
      <div className="bg-content">{children}</div>
    </div>
  );
}