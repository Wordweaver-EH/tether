export const PALETTE = { P1: '#70dfc1', P2: '#f0a875', ink: '#08131b' };

export function viewport(width, height) {
  const scale = Math.min((width - 36) / 16, (height - 36) / 10);
  return { scale, x: (width - 16 * scale) / 2, y: (height - 10 * scale) / 2 };
}
export function screenToWorld(x, y, vp) {
  return { x: (x - vp.x) / vp.scale - 8, y: (y - vp.y) / vp.scale - 5 };
}
export function prepareCanvas(canvas) {
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const width = Math.max(1, Math.round(rect.width * dpr));
  const height = Math.max(1, Math.round(rect.height * dpr));
  if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; }
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, vp: viewport(rect.width, rect.height), width: rect.width, height: rect.height };
}
export function beginWorld(ctx, vp, width, height) {
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = '#071119';
  ctx.fillRect(0, 0, width, height);
  ctx.save();
  ctx.translate(vp.x + 8 * vp.scale, vp.y + 5 * vp.scale);
  ctx.scale(vp.scale, vp.scale);
  ctx.beginPath(); ctx.rect(-8, -5, 16, 10); ctx.clip();
}
export function drawArena(ctx, arena, flash = false) {
  const b = arena.bounds;
  ctx.fillStyle = '#10202a'; ctx.fillRect(b.minX, b.minY, b.maxX - b.minX, b.maxY - b.minY);
  ctx.strokeStyle = '#1b3440'; ctx.lineWidth = 0.012;
  for (let x = -7; x < 8; x++) { ctx.beginPath(); ctx.moveTo(x, -5); ctx.lineTo(x, 5); ctx.stroke(); }
  for (let y = -4; y < 5; y++) { ctx.beginPath(); ctx.moveTo(-8, y); ctx.lineTo(8, y); ctx.stroke(); }
  for (const box of arena.obstacles) {
    ctx.fillStyle = '#293c47'; ctx.fillRect(box.minX, box.minY, box.maxX - box.minX, box.maxY - box.minY);
    ctx.strokeStyle = '#42606d'; ctx.lineWidth = 0.045; ctx.strokeRect(box.minX, box.minY, box.maxX - box.minX, box.maxY - box.minY);
  }
  ctx.strokeStyle = flash ? '#f6d79a' : '#5c7782'; ctx.lineWidth = flash ? 0.11 : 0.055;
  ctx.strokeRect(b.minX + 0.025, b.minY + 0.025, b.maxX - b.minX - 0.05, b.maxY - b.minY - 0.05);
}
export function drawCone(ctx, cone, color, opacity = 0.09) {
  if (!cone) return;
  const a = Math.atan2(cone.facing.y, cone.facing.x);
  ctx.beginPath(); ctx.moveTo(cone.origin.x, cone.origin.y);
  ctx.arc(cone.origin.x, cone.origin.y, 25, a - cone.halfAngleRad, a + cone.halfAngleRad);
  ctx.closePath(); ctx.fillStyle = color; ctx.globalAlpha = opacity; ctx.fill(); ctx.globalAlpha = 1;
  ctx.strokeStyle = color; ctx.globalAlpha = Math.min(opacity * 2.8, 0.45); ctx.lineWidth = 0.018;
  for (const theta of [a - cone.halfAngleRad, a + cone.halfAngleRad]) {
    ctx.beginPath(); ctx.moveTo(cone.origin.x, cone.origin.y);
    ctx.lineTo(cone.origin.x + Math.cos(theta) * 25, cone.origin.y + Math.sin(theta) * 25); ctx.stroke();
  }
  ctx.globalAlpha = 1;
}
export function drawPlayer(ctx, player) {
  const { x, y } = player.position; const color = PALETTE[player.id];
  ctx.beginPath(); ctx.arc(x, y, 0.35, 0, Math.PI * 2);
  ctx.fillStyle = color; ctx.fill(); ctx.strokeStyle = '#071119'; ctx.lineWidth = 0.065; ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x + player.facing.x * 0.14, y + player.facing.y * 0.14);
  ctx.lineTo(x + player.facing.x * 0.42, y + player.facing.y * 0.42);
  ctx.strokeStyle = '#071119'; ctx.lineWidth = 0.085; ctx.lineCap = 'round'; ctx.stroke();
}
export function drawSpear(ctx, spear) {
  const { x, y } = spear.position, d = spear.direction;
  const held = spear.state === 'HELD';
  const half = held ? 0.35 : 0.27;
  const cx = x + (held ? d.x * 0.42 : 0), cy = y + (held ? d.y * 0.42 : 0);
  ctx.beginPath(); ctx.moveTo(cx - d.x * half, cy - d.y * half);
  ctx.lineTo(cx + d.x * half, cy + d.y * half);
  ctx.strokeStyle = PALETTE[spear.owner]; ctx.lineWidth = held ? 0.085 : 0.105;
  ctx.lineCap = 'round'; ctx.globalAlpha = held ? 0.75 : 1;
  if (spear.state === 'RETURNING') ctx.setLineDash([0.12, 0.09]);
  ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;
  if (spear.state === 'EMBEDDED') {
    ctx.beginPath(); ctx.arc(x, y, 0.095, 0, Math.PI * 2); ctx.fillStyle = PALETTE[spear.owner]; ctx.fill();
  }
}
export function drawWorldEntities(ctx, players, spears) {
  for (const spear of spears) drawSpear(ctx, spear);
  for (const player of players) drawPlayer(ctx, player);
}
export function drawCaption(ctx, player, line) {
  if (!player || !line) return;
  ctx.save(); ctx.font = '0.20px system-ui'; ctx.textAlign = 'center';
  const width = Math.min(3.1, ctx.measureText(line).width + 0.35);
  const x = Math.max(-8 + width / 2 + 0.1, Math.min(8 - width / 2 - 0.1, player.position.x));
  const y = Math.max(-4.78, player.position.y - 0.72);
  ctx.fillStyle = '#e9e5d9'; ctx.fillRect(x - width / 2, y - 0.25, width, 0.37);
  ctx.fillStyle = '#182b34'; ctx.fillText(line, x, y);
  ctx.restore();
}
export function drawPlay(canvas, model, flash) {
  const { ctx, vp, width, height } = prepareCanvas(canvas);
  beginWorld(ctx, vp, width, height); drawArena(ctx, model.arena, flash);
  if (model.mode === 'MODE_B') drawCone(ctx, model.cone, PALETTE.P1, 0.10);
  if (model.npcCone) drawCone(ctx, model.npcCone, PALETTE.P2, 0.055);
  drawWorldEntities(ctx, model.players, model.spears);
  drawCaption(ctx, model.players.find((p) => p.id === 'P2'), model.outerSpeech);
  ctx.restore();
  return vp;
}
