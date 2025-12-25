import { useEffect, useRef } from "react";

interface GentleParticlesProps {
  isActive: boolean;
}

interface Mote {
  x: number;
  y: number;
  size: number;
  opacity: number;
  speedX: number;
  speedY: number;
  life: number;
}

export const GentleParticles = ({ isActive }: GentleParticlesProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const motesRef = useRef<Mote[]>([]);
  const animationRef = useRef<number>();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;

      // Spawn new motes occasionally
      if (Math.random() < (isActive ? 0.15 : 0.05)) {
        const angle = Math.random() * Math.PI * 2;
        const distance = isActive ? 100 + Math.random() * 50 : 150 + Math.random() * 200;
        
        motesRef.current.push({
          x: centerX + Math.cos(angle) * distance,
          y: centerY + Math.sin(angle) * distance,
          size: Math.random() * 2 + 1,
          opacity: 0,
          speedX: (Math.random() - 0.5) * 0.3,
          speedY: (Math.random() - 0.5) * 0.3 - 0.2,
          life: 0,
        });
      }

      // Keep motes limited
      if (motesRef.current.length > 30) {
        motesRef.current = motesRef.current.slice(-30);
      }

      // Update and draw motes
      motesRef.current = motesRef.current.filter((mote) => {
        mote.life += 0.008;
        mote.x += mote.speedX;
        mote.y += mote.speedY;

        // Fade in then out
        if (mote.life < 0.3) {
          mote.opacity = mote.life / 0.3;
        } else if (mote.life > 0.7) {
          mote.opacity = (1 - mote.life) / 0.3;
        } else {
          mote.opacity = 1;
        }

        if (mote.life >= 1) return false;

        // Draw with soft glow
        const alpha = mote.opacity * (isActive ? 0.5 : 0.25);
        
        ctx.beginPath();
        ctx.arc(mote.x, mote.y, mote.size * 2, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(25, 40%, 70%, ${alpha * 0.5})`;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(mote.x, mote.y, mote.size, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(30, 45%, 85%, ${alpha})`;
        ctx.fill();

        return true;
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener("resize", resize);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isActive]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
    />
  );
};
