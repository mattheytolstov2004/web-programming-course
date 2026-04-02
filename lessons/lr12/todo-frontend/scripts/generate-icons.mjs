import { createCanvas } from 'canvas';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

// Создаем папку если её нет
const iconsDir = 'public/icons';
mkdirSync(iconsDir, { recursive: true });

const sizes = [192, 512];

for (const size of sizes) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  
  // Градиентный фон
  const gradient = ctx.createLinearGradient(0, 0, size, size);
  gradient.addColorStop(0, '#6366f1');
  gradient.addColorStop(1, '#8b5cf6');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  
  // Скругленные углы
  ctx.fillStyle = gradient;
  const radius = size * 0.2;
  ctx.beginPath();
  ctx.moveTo(radius, 0);
  ctx.lineTo(size - radius, 0);
  ctx.quadraticCurveTo(size, 0, size, radius);
  ctx.lineTo(size, size - radius);
  ctx.quadraticCurveTo(size, size, size - radius, size);
  ctx.lineTo(radius, size);
  ctx.quadraticCurveTo(0, size, 0, size - radius);
  ctx.lineTo(0, radius);
  ctx.quadraticCurveTo(0, 0, radius, 0);
  ctx.fill();
  
  // Белая галочка
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${size * 0.45}px "Segoe UI", "Arial"`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('✓', size / 2, size / 2);

  ctx.shadowBlur = size * 0.03;
  ctx.shadowColor = 'rgba(0,0,0,0.2)';
  
  const buffer = canvas.toBuffer('image/png');

  writeFileSync(join(iconsDir, `icon-${size}.png`), buffer);
}