import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

let renderer, scene, camera, composer, bloomPass;
let animationId = null;
let currentTimeline = null;
let animState = {};
let sceneObjects = [];
let labelElements = [];
let labelsContainer = null;
let viewW = 0, viewH = 0;
let bloomEnabled = true;
let frameTimes = [];

export function initOverlay(canvas, videoElement) {
  labelsContainer = document.getElementById('ar-labels');

  const resize = function() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = videoElement.clientWidth || window.innerWidth;
    var h = videoElement.clientHeight || window.innerHeight;
    viewW = w;
    viewH = h;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';

    if (renderer) {
      renderer.setSize(w, h);
      renderer.setPixelRatio(dpr);
    }
    if (camera) {
      camera.left = 0;
      camera.right = w;
      camera.top = 0;
      camera.bottom = -h;
      camera.updateProjectionMatrix();
    }
    if (composer) {
      composer.setSize(w, h);
    }
  };

  renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    alpha: true,
    antialias: true,
    premultipliedAlpha: false
  });
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

  scene = new THREE.Scene();
  camera = new THREE.OrthographicCamera(0, 1, 0, -1, -100, 100);

  var renderTarget = new THREE.WebGLRenderTarget(1, 1, {
    type: THREE.HalfFloatType,
    format: THREE.RGBAFormat
  });
  composer = new EffectComposer(renderer, renderTarget);
  composer.addPass(new RenderPass(scene, camera));

  bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth / 2, window.innerHeight / 2),
    1.0, 0.4, 0.85
  );
  composer.addPass(bloomPass);
  composer.addPass(new OutputPass());

  var savedQuality = localStorage.getItem('ar_quality');
  if (savedQuality === 'no-bloom') {
    bloomEnabled = false;
    bloomPass.enabled = false;
  }

  if (videoElement.videoWidth > 0) {
    resize();
  } else {
    videoElement.addEventListener('loadedmetadata', resize, { once: true });
    resize();
  }

  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', function() { setTimeout(resize, 200); });
  return resize;
}

export function renderAnnotations(canvas, annotations) {
  stopAnimation();

  if (!annotations || annotations.length === 0) {
    clearOverlay(canvas);
    return;
  }

  animState = {};
  annotations.forEach(function(a, i) {
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

  annotations.forEach(function(a, i) {
    currentTimeline.to(animState[i], {
      opacity: 1,
      scale: 1,
      duration: 0.4,
      ease: 'back.out(1.5)'
    }, i * 0.15);
  });

  annotations.forEach(function(a, i) {
    if (a.type === 'arrow') {
      currentTimeline.to(animState[i], {
        arrowProgress: 1,
        duration: 1.2,
        ease: 'power2.inOut',
        repeat: -1,
        yoyo: true
      }, 0.6);
    } else if (a.type === 'circle' && a.label && a.label.toLowerCase().indexOf('screw') >= 0) {
      currentTimeline.to(animState[i], {
        rotation: 360,
        duration: 2,
        ease: 'none',
        repeat: -1
      }, 0.6);
    } else if (a.type === 'box' || a.type === '3d_box') {
      currentTimeline.to(animState[i], {
        pulseScale: 1.04,
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

  // Build 3D scene objects
  disposeScene();
  annotations.forEach(function(a, i) {
    var group = new THREE.Group();
    group.userData.index = i;
    group.userData.annotation = a;

    switch (a.type) {
      case 'arrow':
        buildArrow(group, a);
        break;
      case 'circle':
        buildCircle(group, a);
        break;
      case 'box':
      case 'highlight':
      case '3d_box':
        buildBox(group, a);
        break;
      case 'checkmark':
        buildCheckmark(group, a);
        break;
    }

    scene.add(group);
    sceneObjects.push(group);

    if (a.label) {
      createLabel(a, i);
    }
  });

  frameTimes = [];
  function draw() {
    var t0 = performance.now();

    annotations.forEach(function(a, i) {
      var state = animState[i];
      var group = sceneObjects[i];
      if (!group || !state) return;

      group.visible = state.opacity > 0.01;
      if (!group.visible) return;

      updateAnnotation(group, a, state);
      updateLabel(i, a, state);
    });

    composer.render();

    var dt = performance.now() - t0;
    frameTimes.push(dt);
    if (frameTimes.length > 10) {
      frameTimes.shift();
      var avg = frameTimes.reduce(function(s, v) { return s + v; }, 0) / frameTimes.length;
      if (avg > 18 && bloomEnabled) {
        bloomEnabled = false;
        bloomPass.enabled = false;
        localStorage.setItem('ar_quality', 'no-bloom');
      }
    }

    animationId = requestAnimationFrame(draw);
  }
  draw();
}

export function clearOverlay(canvas) {
  stopAnimation();
  disposeScene();
  if (renderer) {
    renderer.setClearColor(0x000000, 0);
    renderer.clear();
  }
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

function disposeScene() {
  sceneObjects.forEach(function(obj) {
    obj.traverse(function(child) {
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach(function(m) { m.dispose(); });
        } else {
          child.material.dispose();
        }
      }
    });
    scene.remove(obj);
  });
  sceneObjects = [];

  labelElements.forEach(function(el) { el.remove(); });
  labelElements = [];
}

// === Build Primitives ===

function buildArrow(group, a) {
  var x = a.x * viewW;
  var y = -(a.y * viewH);
  var tx = (a.target_x != null ? a.target_x : a.x) * viewW;
  var ty = -((a.target_y != null ? a.target_y : a.y - 0.08) * viewH);

  // Dashed shaft line
  var points = [new THREE.Vector3(x, y, 0), new THREE.Vector3(tx, ty, 0)];
  var lineGeo = new THREE.BufferGeometry().setFromPoints(points);
  var lineMat = new THREE.LineDashedMaterial({
    color: 0xffffff,
    opacity: 0.4,
    transparent: true,
    dashSize: 8,
    gapSize: 6
  });
  var line = new THREE.Line(lineGeo, lineMat);
  line.computeLineDistances();
  group.add(line);

  // Traveling dot (emissive for bloom)
  var dotGeo = new THREE.SphereGeometry(6, 16, 16);
  var dotMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 1
  });
  dotMat.toneMapped = false;
  var dot = new THREE.Mesh(dotGeo, dotMat);
  dot.name = 'dot';
  dot.position.set(x, y, 1);
  group.add(dot);

  // Particle trail
  var trailCount = 8;
  var trailPositions = new Float32Array(trailCount * 3);
  var trailOpacities = new Float32Array(trailCount);
  for (var i = 0; i < trailCount; i++) {
    trailPositions[i * 3] = x;
    trailPositions[i * 3 + 1] = y;
    trailPositions[i * 3 + 2] = 0;
    trailOpacities[i] = (trailCount - i) / trailCount;
  }
  var trailGeo = new THREE.BufferGeometry();
  trailGeo.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3));
  var trailMat = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 4,
    transparent: true,
    opacity: 0.6,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  var trail = new THREE.Points(trailGeo, trailMat);
  trail.name = 'trail';
  group.add(trail);

  // Arrowhead (cone)
  var angle = Math.atan2(ty - y, tx - x);
  var coneGeo = new THREE.ConeGeometry(7, 16, 8);
  var coneMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.7
  });
  var cone = new THREE.Mesh(coneGeo, coneMat);
  cone.position.set(tx, ty, 0);
  cone.rotation.z = angle - Math.PI / 2;
  cone.name = 'arrowhead';
  group.add(cone);

  group.userData.start = new THREE.Vector3(x, y, 1);
  group.userData.end = new THREE.Vector3(tx, ty, 1);
}

function buildCircle(group, a) {
  var cx = a.x * viewW;
  var cy = -(a.y * viewH);
  var radius = (a.radius || 0.045) * Math.min(viewW, viewH);

  // Outer ring (torus)
  var torusGeo = new THREE.TorusGeometry(radius, 2, 8, 48);
  var torusMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.8
  });
  torusMat.toneMapped = false;
  var torus = new THREE.Mesh(torusGeo, torusMat);
  torus.name = 'ring';
  group.add(torus);

  // Inner fill (very subtle)
  var circleGeo = new THREE.CircleGeometry(radius * 0.9, 32);
  var circleMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.05,
    side: THREE.DoubleSide
  });
  var circle = new THREE.Mesh(circleGeo, circleMat);
  circle.position.z = -1;
  group.add(circle);

  // Tick marks for screw type
  if (a.label && a.label.toLowerCase().indexOf('screw') >= 0) {
    for (var i = 0; i < 4; i++) {
      var markAngle = (i * Math.PI) / 2;
      var markGeo = new THREE.CylinderGeometry(1.5, 1.5, radius * 0.25, 6);
      var markMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6 });
      var mark = new THREE.Mesh(markGeo, markMat);
      mark.position.set(
        Math.cos(markAngle) * radius * 0.7,
        Math.sin(markAngle) * radius * 0.7,
        0
      );
      mark.rotation.z = markAngle;
      group.add(mark);
    }
  }

  group.position.set(cx, cy, 0);
}

function buildBox(group, a) {
  var x = a.x * viewW;
  var y = -(a.y * viewH);
  var bw = (a.width || 0.2) * viewW;
  var bh = (a.height || 0.12) * viewH;
  var cx = x + bw / 2;
  var cy = y - bh / 2;

  // Rounded rectangle outline
  var shape = new THREE.Shape();
  var r = 12;
  var hw = bw / 2;
  var hh = bh / 2;
  shape.moveTo(-hw + r, -hh);
  shape.lineTo(hw - r, -hh);
  shape.quadraticCurveTo(hw, -hh, hw, -hh + r);
  shape.lineTo(hw, hh - r);
  shape.quadraticCurveTo(hw, hh, hw - r, hh);
  shape.lineTo(-hw + r, hh);
  shape.quadraticCurveTo(-hw, hh, -hw, hh - r);
  shape.lineTo(-hw, -hh + r);
  shape.quadraticCurveTo(-hw, -hh, -hw + r, -hh);

  var edgePoints = shape.getPoints(48);
  var edgeGeo = new THREE.BufferGeometry().setFromPoints(
    edgePoints.map(function(p) { return new THREE.Vector3(p.x, p.y, 0); })
  );
  var edgeMat = new THREE.LineBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.6
  });
  edgeMat.toneMapped = false;
  var edge = new THREE.LineLoop(edgeGeo, edgeMat);
  edge.name = 'border';
  group.add(edge);

  // Fill
  var fillGeo = new THREE.ShapeGeometry(shape);
  var fillMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.06,
    side: THREE.DoubleSide
  });
  var fill = new THREE.Mesh(fillGeo, fillMat);
  fill.position.z = -1;
  group.add(fill);

  group.position.set(cx, cy, 0);
}

function buildCheckmark(group, a) {
  var cx = a.x * viewW;
  var cy = -(a.y * viewH);
  var size = (a.radius || 0.04) * Math.min(viewW, viewH);

  // Green circle bg
  var circleGeo = new THREE.CircleGeometry(size, 32);
  var circleMat = new THREE.MeshBasicMaterial({
    color: 0x4caf50,
    transparent: true,
    opacity: 0.2,
    side: THREE.DoubleSide
  });
  var circle = new THREE.Mesh(circleGeo, circleMat);
  group.add(circle);

  // Circle border
  var ringGeo = new THREE.TorusGeometry(size, 1.5, 8, 48);
  var ringMat = new THREE.MeshBasicMaterial({
    color: 0x4caf50,
    transparent: true,
    opacity: 0.7
  });
  var ring = new THREE.Mesh(ringGeo, ringMat);
  group.add(ring);

  // Checkmark line
  var checkPoints = [
    new THREE.Vector3(-size * 0.35, -size * 0.05, 1),
    new THREE.Vector3(-size * 0.05, -size * 0.3, 1),
    new THREE.Vector3(size * 0.4, size * 0.25, 1)
  ];
  var checkGeo = new THREE.BufferGeometry().setFromPoints(checkPoints);
  var checkMat = new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 2 });
  var check = new THREE.Line(checkGeo, checkMat);
  check.name = 'check';
  group.add(check);

  group.position.set(cx, cy, 0);
}

// === Update functions (called each frame) ===

function updateAnnotation(group, a, state) {
  if (a.type === 'arrow') {
    var start = group.userData.start;
    var end = group.userData.end;
    var dot = group.getObjectByName('dot');
    var trail = group.getObjectByName('trail');

    if (dot) {
      dot.position.lerpVectors(start, end, state.arrowProgress);
      dot.material.opacity = state.opacity;
      dot.scale.setScalar(state.scale);
    }

    if (trail) {
      var positions = trail.geometry.attributes.position.array;
      for (var i = 7; i > 0; i--) {
        positions[i * 3] = positions[(i - 1) * 3];
        positions[i * 3 + 1] = positions[(i - 1) * 3 + 1];
      }
      if (dot) {
        positions[0] = dot.position.x;
        positions[1] = dot.position.y;
        positions[2] = dot.position.z;
      }
      trail.geometry.attributes.position.needsUpdate = true;
      trail.material.opacity = state.opacity * 0.5;
    }

    group.children.forEach(function(child) {
      if (child.material && child !== dot && child !== trail) {
        child.material.opacity = Math.min(child.material.opacity, state.opacity * 0.7);
      }
    });

  } else if (a.type === 'circle') {
    var ring = group.getObjectByName('ring');
    if (ring) {
      ring.material.opacity = state.opacity * 0.8;
    }
    group.scale.setScalar(state.pulseScale * state.scale);
    group.rotation.z = state.rotation * Math.PI / 180;
    group.children.forEach(function(child) {
      if (child.material) child.material.opacity = Math.min(child.material.opacity + 0.01, state.opacity);
    });

  } else if (a.type === 'box' || a.type === '3d_box' || a.type === 'highlight') {
    group.scale.setScalar(state.pulseScale * state.scale);
    var border = group.getObjectByName('border');
    if (border) {
      border.material.opacity = state.opacity * 0.6;
    }

  } else if (a.type === 'checkmark') {
    group.scale.setScalar(state.scale);
    group.children.forEach(function(child) {
      if (child.material) {
        child.material.opacity = Math.min(child.material.opacity + 0.01, state.opacity);
      }
    });
  }
}

// === HTML Labels ===

function createLabel(a, index) {
  var el = document.createElement('div');
  el.className = 'ar-label-pill';
  el.textContent = a.label;
  el.style.opacity = '0';
  el.dataset.index = index;
  labelsContainer.appendChild(el);
  labelElements.push(el);
}

function updateLabel(index, a, state) {
  var el = labelElements.find(function(e) { return e.dataset.index == index; });
  if (!el) return;

  var lx, ly;
  if (a.type === 'arrow') {
    lx = ((a.x + (a.target_x || a.x)) / 2) * 100;
    ly = (Math.min(a.y, a.target_y || a.y) - 0.04) * 100;
  } else if (a.type === 'box' || a.type === '3d_box' || a.type === 'highlight') {
    lx = (a.x + (a.width || 0.2) / 2) * 100;
    ly = (a.y + (a.height || 0.12) + 0.03) * 100;
  } else {
    lx = a.x * 100;
    ly = (a.y + (a.radius || 0.045) + 0.03) * 100;
  }

  el.style.left = lx + '%';
  el.style.top = ly + '%';
  el.style.opacity = state.opacity;
}
