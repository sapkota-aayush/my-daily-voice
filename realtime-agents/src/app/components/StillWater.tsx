import { useEffect, useRef } from "react";

interface StillWaterProps {
  isActive: boolean;
  size?: number;
}

export const StillWater = ({ isActive, size = 260 }: StillWaterProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const timeRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);

    const centerX = size / 2;
    const surfaceY = size * 0.45;

    const animate = () => {
      timeRef.current += isActive ? 0.012 : 0.006;
      const t = timeRef.current;

      ctx.clearRect(0, 0, size, size);

      const breath = Math.sin(t * 0.7) * 0.5 + 0.5;
      const radius = 38 + breath * (isActive ? 6 : 3);

      // The self - warm, soft orb above
      const selfGradient = ctx.createRadialGradient(
        centerX - radius * 0.25,
        surfaceY - radius * 0.3,
        0,
        centerX,
        surfaceY,
        radius * 1.3
      );
      selfGradient.addColorStop(0, `hsla(32, 40%, ${isActive ? 78 : 72}%, 1)`);
      selfGradient.addColorStop(0.5, `hsla(28, 35%, ${isActive ? 62 : 58}%, 1)`);
      selfGradient.addColorStop(1, `hsla(25, 30%, ${isActive ? 52 : 48}%, 0.9)`);

      // Soft outer glow
      const glowGradient = ctx.createRadialGradient(
        centerX, surfaceY, radius * 0.8,
        centerX, surfaceY, radius * 2.2
      );
      glowGradient.addColorStop(0, `hsla(30, 35%, 65%, ${isActive ? 0.2 : 0.1})`);
      glowGradient.addColorStop(1, "hsla(30, 30%, 60%, 0)");
      
      ctx.beginPath();
      ctx.arc(centerX, surfaceY, radius * 2.2, 0, Math.PI * 2);
      ctx.fillStyle = glowGradient;
      ctx.fill();

      // Draw main orb
      ctx.beginPath();
      ctx.arc(centerX, surfaceY, radius, 0, Math.PI * 2);
      ctx.fillStyle = selfGradient;
      ctx.fill();

      // Inner highlight
      const highlight = ctx.createRadialGradient(
        centerX - radius * 0.3,
        surfaceY - radius * 0.35,
        0,
        centerX,
        surfaceY,
        radius * 0.8
      );
      highlight.addColorStop(0, "rgba(255, 252, 248, 0.5)");
      highlight.addColorStop(0.4, "rgba(255, 250, 245, 0.15)");
      highlight.addColorStop(1, "rgba(255, 248, 240, 0)");
      
      ctx.beginPath();
      ctx.arc(centerX, surfaceY, radius, 0, Math.PI * 2);
      ctx.fillStyle = highlight;
      ctx.fill();

      // Water surface line - subtle
      const waterY = surfaceY + radius + 15;
      ctx.beginPath();
      ctx.moveTo(centerX - 60, waterY);
      for (let x = -60; x <= 60; x += 2) {
        const wave = Math.sin(x * 0.08 + t * 2) * (isActive ? 1.5 : 0.5);
        ctx.lineTo(centerX + x, waterY + wave);
      }
      ctx.strokeStyle = `hsla(30, 20%, 60%, ${isActive ? 0.25 : 0.15})`;
      ctx.lineWidth = 1;
      ctx.stroke();

      // Reflection below - softer, slightly distorted
      const reflectionY = waterY + radius * 0.8;
      const reflectionRadius = radius * 0.85;
      
      // Reflection is more diffuse
      const reflectionGradient = ctx.createRadialGradient(
        centerX,
        reflectionY - reflectionRadius * 0.1,
        0,
        centerX,
        reflectionY,
        reflectionRadius * 1.4
      );
      reflectionGradient.addColorStop(0, `hsla(30, 25%, 60%, ${isActive ? 0.35 : 0.25})`);
      reflectionGradient.addColorStop(0.6, `hsla(28, 20%, 55%, ${isActive ? 0.2 : 0.12})`);
      reflectionGradient.addColorStop(1, "hsla(25, 15%, 50%, 0)");

      // Slightly wobbly reflection when active
      ctx.beginPath();
      if (isActive) {
        const points = 30;
        for (let i = 0; i <= points; i++) {
          const angle = (i / points) * Math.PI * 2;
          const wobble = Math.sin(angle * 3 + t * 3) * 2;
          const r = reflectionRadius + wobble;
          const x = centerX + Math.cos(angle) * r;
          const y = reflectionY + Math.sin(angle) * r * 0.7;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
      } else {
        ctx.ellipse(centerX, reflectionY, reflectionRadius, reflectionRadius * 0.7, 0, 0, Math.PI * 2);
      }
      ctx.fillStyle = reflectionGradient;
      ctx.fill();

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isActive, size]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: size, height: size }}
    />
  );
};
