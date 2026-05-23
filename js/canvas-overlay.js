let animationId = null;
let currentTimeline = null;
let animState = {};

export function initOverlay(canvas, videoElement) {
  const resize = () => {
    const w = videoElement.clientWidth || window.innerWidth;
    const h = videoElement.clientHeight || window.innerHeight;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
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

  // Initialize GSAP animated state for each annotation
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

  // Kill previous timeline
  if (currentTimeline) {
    currentTimeline.kill();
  }

  // Create GSAP timeline for entrance + looping motion
  currentTimeline = gsap.timeline();

  // Phase 1: Staggered entrance
  annotations.forEach((a, i) => {
    currentTimeline.to(animState[i], {
      opacity: 1,
      scale: 1,
      duration: 0.4,
      ease: 'back.out(1.5)'
    }, i * 0.15);
  });

  // Phase 2: Action animations (loop)
  annotations.forEach((a, i) => {
    if (a.type === 'arrow') {
      // Arrows pulse along their path to show direction of movement
      currentTimeline.to(animState[i], {
        arrowProgress: 1,
        duration: 1.2,
        ease: 'power2.inOut',
        repeat: -1,
        yoyo: true
      }, 0.6);
    } else if (a.type === 'circle' && a.label && a.label.toLowerCase().includes('screw')) {
      // Screwing motion — rotation
      currentTimeline.to(animState[i], {
        rotation: 360,
        duration: 2,
        ease: 'none',
        repeat: -1
      }, 0.6);
    } else if (a.type === 'box' || a.type === '3d_box') {
      // Gentle breathing pulse
      currentTimeline.to(animState[i], {
        pulseScale: 1.03,
        duration: 1.5,
        ease: 'sine.inOut',
        repeat: -1,
        yoyo: true
      }, 0.6);
    } else if (a.type === 'circle') {
      // Soft ring pulse
      currentTimeline.to(animState[i], {
        pulseScale: 1.15,
        duration: 1,
        ease: 'sine.inOut',
        repeat: -1,
        yoyo: true
      }, 0.6);
    }
  });

  // Render loop
  function draw() {
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.width / dpr;
    const h = canvas.height / dpr;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
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

// ===== Glass Card with breathing =====
function drawGlassCard(ctx, w, h, a, state) {
  const cx = a.x * w + (a.width || 0.2) * w / 2;
  const cy = a.y * h + (a.height || 0.12) * h / 2;
  const bw = (a.width || 0.2) * w * state.pulseScale;
  const bh = (a.height || 0.12) * h * state.pulseScale;
  const x = cx - bw / 2;
  const y = cy - bh / 2;
  const r = 12;

  // Frosted glass fill
  ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.beginPath();
  roundRect(ctx, x, y, bw, bh, r);
  ctx.fill();

  // Border
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  roundRect(ctx, x, y, bw, bh, r);
  ctx.stroke();

  if (a.label) {
    drawFloatingPill(ctx, cx, y + bh + 18, a.label);
  }
}

// ===== Animated Arrow (shows movement direction) =====
function drawAnimatedArrow(ctx, w, h, a, state) {
  const x = a.x * w;
  const y = a.y * h;
  const tx = (a.target_x ?? a.x) * w;
  const ty = (a.target_y ?? (a.y - 0.08)) * h;

  const progress = state.arrowProgress;
  const angle = Math.atan2(ty - y, tx - x);
  const len = Math.sqrt((tx - x) ** 2 + (ty - y) ** 2);

  // Animated dot traveling along the arrow path
  const dotX = x + (tx - x) * progress;
  const dotY = y + (ty - y) * progress;

  // Arrow shaft (fades behind the moving dot)
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(tx, ty);
  ctx.stroke();
  ctx.setLineDash([]);

  // Bright trail leading to the dot
  const trailStart = Math.max(0, progress - 0.4);
  const trailX = x + (tx - x) * trailStart;
  const trailY = y + (ty - y) * trailStart;

  const gradient = ctx.createLinearGradient(trailX, trailY, dotX, dotY);
  gradient.addColorStop(0, 'rgba(255, 255, 255, 0)');
  gradient.addColorStop(1, 'rgba(255, 255, 255, 0.8)');

  ctx.strokeStyle = gradient;
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(trailX, trailY);
  ctx.lineTo(dotX, dotY);
  ctx.stroke();

  // Moving dot (the "object" being moved)
  ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
  ctx.shadowColor = 'rgba(255, 255, 255, 0.6)';
  ctx.shadowBlur = 8;
  ctx.beginPath();
  ctx.arc(dotX, dotY, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  // Arrowhead at destination (shows where it ends)
  const headLen = 10;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.beginPath();
  ctx.moveTo(tx, ty);
  ctx.lineTo(tx - headLen * Math.cos(angle - 0.4), ty - headLen * Math.sin(angle - 0.4));
  ctx.lineTo(tx - headLen * Math.cos(angle + 0.4), ty - headLen * Math.sin(angle + 0.4));
  ctx.closePath();
  ctx.fill();

  if (a.label) {
    drawFloatingPill(ctx, (x + tx) / 2, Math.min(y, ty) - 16, a.label);
  }
}

// ===== Animated Circle (pulsing ring, rotation for screws) =====
function drawAnimatedCircle(ctx, w, h, a, state) {
  const cx = a.x * w;
  const cy = a.y * h;
  const baseRadius = (a.radius || 0.045) * Math.min(w, h);
  const radius = baseRadius * state.pulseScale;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(state.rotation * Math.PI / 180);

  // Outer ring
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.stroke();

  // Inner fill
  ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
  ctx.fill();

  // If screwing, draw rotation indicator marks
  if (state.rotation > 0) {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 4; i++) {
      const markAngle = (i * Math.PI) / 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(markAngle) * radius * 0.6, Math.sin(markAngle) * radius * 0.6);
      ctx.lineTo(Math.cos(markAngle) * radius * 0.85, Math.sin(markAngle) * radius * 0.85);
      ctx.stroke();
    }
  }

  ctx.restore();

  if (a.label) {
    drawFloatingPill(ctx, cx, cy + radius + 18, a.label);
  }
}

// ===== Checkmark =====
function drawGlassCheck(ctx, w, h, a, state) {
  const cx = a.x * w;
  const cy = a.y * h;
  const size = (a.radius || 0.04) * Math.min(w, h) * state.scale;

  // Circle
  ctx.fillStyle = 'rgba(76, 175, 80, 0.15)';
  ctx.beginPath();
  ctx.arc(cx, cy, size, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = 'rgba(76, 175, 80, 0.6)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Checkmark
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(cx - size * 0.35, cy + size * 0.05);
  ctx.lineTo(cx - size * 0.05, cy + size * 0.3);
  ctx.lineTo(cx + size * 0.4, cy - size * 0.25);
  ctx.stroke();
}

// ===== Floating Pill Label (matches the Android XR reference) =====
function drawFloatingPill(ctx, x, y, text) {
  const fontSize = 12;
  ctx.font = `400 ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
  const metrics = ctx.measureText(text);
  const padX = 14;
  const padY = 8;
  const boxW = metrics.width + padX * 2;
  const boxH = fontSize + padY * 2;
  const r = boxH / 2;

  const drawX = x - boxW / 2;
  const drawY = y - boxH / 2;

  // Light frosted glass background
  ctx.fillStyle = 'rgba(255, 255, 255, 0.13)';
  ctx.beginPath();
  roundRect(ctx, drawX, drawY, boxW, boxH, r);
  ctx.fill();

  // Subtle border
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
  ctx.lineWidth = 0.75;
  ctx.beginPath();
  roundRect(ctx, drawX, drawY, boxW, boxH, r);
  ctx.stroke();

  // White text
  ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
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
