import { useEffect, useRef } from "react";

interface Line {
  x: number;
  y: number;
  length: number;
  speed: number;
  opacity: number;
  thickness: number;
  color: string;
}

const COLORS = [
  "#22c55e",
  "rgba(255,255,255,0.6)",
  "rgba(255,255,255,0.3)",
  "rgba(30,40,60,0.8)",
  "rgba(30,40,60,0.5)",
];

function createLine(canvasW: number, canvasH: number, randomizeY = true): Line {
  const color = COLORS[Math.floor(Math.random() * COLORS.length)];
  const length = 20 + Math.random() * 60;
  const speed = 0.3 + Math.random() * 1.2;
  const opacity = 0.08 + Math.random() * 0.35;
  const thickness = 1 + Math.random() * 1;

  const x = randomizeY
    ? Math.random() * (canvasW + canvasH) - canvasH
    : -length - Math.random() * canvasW * 0.5;
  const y = randomizeY
    ? Math.random() * (canvasH + canvasW)
    : -length - Math.random() * canvasH * 0.3;

  return { x, y, length, speed, opacity, thickness, color };
}

const LINE_COUNT = 70;
const ANGLE = Math.PI / 4;
const COS_A = Math.cos(ANGLE);
const SIN_A = Math.sin(ANGLE);

export default function DiagonalLinesBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let w = 0;
    let h = 0;
    let lines: Line[] = [];

    function resize() {
      const dpr = window.devicePixelRatio || 1;
      w = window.innerWidth;
      h = window.innerHeight;
      canvas!.width = w * dpr;
      canvas!.height = h * dpr;
      canvas!.style.width = w + "px";
      canvas!.style.height = h + "px";
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function init() {
      resize();
      lines = Array.from({ length: LINE_COUNT }, () => createLine(w, h, true));
    }

    function draw() {
      ctx!.clearRect(0, 0, w, h);

      for (const line of lines) {
        line.x += line.speed * COS_A;
        line.y += line.speed * SIN_A;

        if (line.x - line.length > w + 50 || line.y - line.length > h + 50) {
          Object.assign(line, createLine(w, h, false));
        }

        ctx!.beginPath();
        ctx!.moveTo(line.x, line.y);
        ctx!.lineTo(line.x + line.length * COS_A, line.y - line.length * SIN_A);
        ctx!.strokeStyle = line.color;
        ctx!.globalAlpha = line.opacity;
        ctx!.lineWidth = line.thickness;
        ctx!.lineCap = "square";
        ctx!.stroke();
      }

      ctx!.globalAlpha = 1;
      animId = requestAnimationFrame(draw);
    }

    init();
    draw();
    window.addEventListener("resize", resize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        zIndex: 0,
        pointerEvents: "none",
      }}
    />
  );
}
