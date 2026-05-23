let animationId = null;
let currentTimeline = null;
let animState = {};

function snap(v) { return Math.round(v); }

export function initOverlay(canvas, videoElement) {
  const resize = () => {
    const dpr = window.devicePixelRatio || 1;
    const w = videoElement.clientWidth || window.innerWidth;
    const h = videoElement.clientHeight || window.innerHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
  };

  if (videoElement.videoWidth > 0) {
    resize();
  } else {
    videoElement.addEventListener('loadedmetadata', resize, { once: true });
    resize();
  }

  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', () => setTimeout(resize, 200));
  return resize;
}

export function renderAnnotations(canvas, annotations) {
  stopAnimation();

  if (!annotations || annotations.length === 0) {
    clearOverlay(canvas);
    return;
  }

  animState = {};
  annotations.forEach((a, i) => {
    animState[i] = {
      x: a.x,
      y: a.y,
      opacity: 0,
      scale: 0.8,
      arrowProgress: 0,
      rotation: 0,
      pulseScale: 1
    };
  });

  if (currentTimeline) {
    currentTimeline.kill();
  }

  currentTimeline = gsap.timeline();

  annotations.forEach((a, i) => {
    currentTimeline.to(animState[i], {
      opacity: 1,
      scale: 1,
      duration: 0.4,
      ease: 'back.out(1.5)'
    }, i * 0.15);
  });

  annotations.forEach((a, i) => {
    if (a.type === 'arrow') {
      currentTimeline.to(animState[i], {
        arrowProgress: 1,
        duration: 1.2,
        ease: 'power2.inOut',
        repeat: -1,
        yoyo: true
      }, 0.6);
    } else if (a.type === 'circle' && a.label && a.label.toLowerCase().includes('screw')) {
      currentTimeline.to(animState[i], {
        rotation: 360,
        duration: 2,
        ease: 'none',
        repeat: -1
      }, 0.6);
    } else if (a.type === 'box' || a.type === '3d_box') {
      currentTimeline.to(animState[i], {
        pulseScale: 1.03,
        duration: 1.5,
        ease: 'sine.inOut',
        repeat: -1,
        yoyo: true
      }, 0.6);
    } else if (a.type === 'circle') {
      currentTimeline.to(animState[i], {
        pulseScale: 1.15,
        duration: 1,
        ease: 'sine.inOut',
        repeat: -1,
        yoyo: true
      }, 0.6);
    }
  });

  function draw() {
    const ctx = canvas.getContext('2d', { alpha: true });
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.width;
    const h = canvas.height;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, w, h);

    annotations.forEach((a, i) => {
      const state = animState[i];
      if (!state || state.opacity <= 0) return;

      ctx.globalAlpha = state.opacity;

      switch (a.type) {
        case 'box':
        case 'highlight':
        case '3d_box':
          drawGlassCard(ctx, w, h, a, state);
          break;
        case 'arrow':
          drawAnimatedArrow(ctx, w, h, a, state);
          break;
        case 'circle':
          drawAnimatedCircle(ctx, w, h, a, state);
          break;
        case 'checkmark':
          drawGlassCheck(ctx, w, h, a, state);
          break;
      }
    });

    ctx.globalAlpha = 1;
    animationId = requestAnimationFrame(draw);
  }

  draw();
}

export function clearOverlay(canvas) {
  stopAnimation();
  const ctx = canvas.getContext('2d');
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function stopAnimation() {
  if (animationId) {
    cancelAnimationFrame(animationId);
    animationId = null;
  }
  if (currentTimeline) {
    currentTimeline.kill();
    currentTimeline = null;
  }
}

function drawGlassCard(ctx, w, h, a, state) {
  const cx = snap(a.x * w + (a.width || 0.2) * w / 2);
  const cy = snap(a.y * h + (a.height || 0.12) * h / 2);
  const bw = snap((a.width || 0.2) * w * state.pulseScale);
  const bh = snap((a.height || 0.12) * h * state.pulseScale);
  const x = snap(cx - bw / 2);
  const y = snap(cy - bh / 2);
  const r = 14;

  ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.beginPath();
  roundRect(ctx, x, y, bw, bh, r);
  ctx.fill();

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  roundRect(ctx, x, y, bw, bh, r);
  ctx.stroke();

  if (a.label) {
    drawFloatingPill(ctx, cx, y + bh + 24, a.label);
  }
}

function drawAnimatedArrow(ctx, w, h, a, state) {
  const x = snap(a.x * w);
  const y = snap(a.y * h);
  const tx = snap((a.target_x ?? a.x) * w);
  const ty = snap((a.target_y ?? (a.y - 0.08)) * h);

  const progress = state.arrowProgress;
  const angle = Math.atan2(ty - y, tx - x);

  const dotX = snap(x + (tx - x) * progress);
  const dotY = snap(y + (ty - y) * progress);

  // Dashed shaft
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.setLineDash([8, 6]);
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(tx, ty);
  ctx.stroke();
  ctx.setLineDash([]);

  // Bright solid trail
  const trailStart = Math.max(0, progress - 0.35);
  const trailX = snap(x + (tx - x) * trailStart);
  const trailY = snap(y + (ty - y) * trailStart);

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(trailX, trailY);
  ctx.lineTo(dotX, dotY);
  ctx.stroke();

  // Moving dot — no shadowBlur (causes blur on mobile)
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(dotX, dotY, 9, 0, Math.PI * 2);
  ctx.fill();

  // Arrowhead
  const headLen = 18;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.beginPath();
  ctx.moveTo(tx, ty);
  ctx.lineTo(snap(tx - headLen * Math.cos(angle - 0.4)), snap(ty - headLen * Math.sin(angle - 0.4)));
  ctx.lineTo(snap(tx - headLen * Math.cos(angle + 0.4)), snap(ty - headLen * Math.sin(angle + 0.4)));
  ctx.closePath();
  ctx.fill();

  if (a.label) {
    drawFloatingPill(ctx, snap((x + tx) / 2), snap(Math.min(y, ty) - 22), a.label);
  }
}

function drawAnimatedCircle(ctx, w, h, a, state) {
  const cx = snap(a.x * w);
  const cy = snap(a.y * h);
  const baseRadius = (a.radius || 0.045) * Math.min(w, h);
  const radius = snap(baseRadius * state.pulseScale);

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(state.rotation * Math.PI / 180);

  // Outer ring
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.stroke();

  // Inner fill
  ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.fill();

  // Rotation indicator marks
  if (state.rotation > 0) {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.lineWidth = 3;
    for (let i = 0; i < 4; i++) {
      const markAngle = (i * Math.PI) / 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(markAngle) * radius * 0.55, Math.sin(markAngle) * radius * 0.55);
      ctx.lineTo(Math.cos(markAngle) * radius * 0.85, Math.sin(markAngle) * radius * 0.85);
      ctx.stroke();
    }
  }

  ctx.restore();

  if (a.label) {
    drawFloatingPill(ctx, cx, cy + radius + 24, a.label);
  }
}

function drawGlassCheck(ctx, w, h, a, state) {
  const cx = snap(a.x * w);
  const cy = snap(a.y * h);
  const size = snap((a.radius || 0.04) * Math.min(w, h) * state.scale);

  ctx.fillStyle = 'rgba(76, 175, 80, 0.2)';
  ctx.beginPath();
  ctx.arc(cx, cy, size, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = 'rgba(76, 175, 80, 0.8)';
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(snap(cx - size * 0.35), snap(cy + size * 0.05));
  ctx.lineTo(snap(cx - size * 0.05), snap(cy + size * 0.3));
  ctx.lineTo(snap(cx + size * 0.4), snap(cy - size * 0.25));
  ctx.stroke();
}

function drawFloatingPill(ctx, x, y, text) {
  x = snap(x);
  y = snap(y);
  const fontSize = 16;
  ctx.font = `600 ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
  const metrics = ctx.measureText(text);
  const padX = 18;
  const padY = 12;
  const boxW = snap(metrics.width + padX * 2);
  const boxH = snap(fontSize + padY * 2);
  const r = boxH / 2;

  const drawX = snap(x - boxW / 2);
  const drawY = snap(y - boxH / 2);

  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  ctx.beginPath();
  roundRect(ctx, drawX, drawY, boxW, boxH, r);
  ctx.fill();

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  roundRect(ctx, drawX, drawY, boxW, boxH, r);
  ctx.stroke();

  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y);
  ctx.textAlign = 'start';
  ctx.textBaseline = 'alphabetic';
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
