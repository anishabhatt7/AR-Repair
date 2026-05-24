import { showScreen, showToast, show, hide } from './ui.js';
import { startCamera, stopCamera, captureFrame, isCameraSupported } from './camera.js';
import { initOverlay, renderAnnotations, clearOverlay } from './canvas-overlay.js';
import { analyzeFrame, cancelAnalysis, hasApiKey, setApiKey, getApiKey, getProvider, setProvider } from './claude-api.js';
import { loadKnowledgeBase, findProduct, getRepairContext } from './knowledge-base.js';
import { DEMO_REPAIRS } from './demo-repairs.js';
import { initChat } from './chat.js';

let repairData = null;
let currentStep = 0;
let isScanning = false;
let rescanTimer = null;
let demoMode = false;

const $ = id => document.getElementById(id);

let chatCategory = '';
let chatModel = '';
let chatProblem = '';

async function init() {
  try { await loadKnowledgeBase(); } catch (e) {}
  registerServiceWorker();
  bindEvents();
  monitorOnline();
  initSettingsUI();
  initChat(startARFromChat);
}

function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }
}

function monitorOnline() {
  const banner = $('offline-banner');
  const update = () => {
    if (navigator.onLine) hide(banner);
    else show(banner);
  };
  window.addEventListener('online', update);
  window.addEventListener('offline', update);
  update();
}

function bindEvents() {
  $('btn-chat-settings').addEventListener('click', () => { initSettingsUI(); showScreen('settings'); });
  $('btn-back-settings').addEventListener('click', () => showScreen('chat'));
  $('btn-save-key').addEventListener('click', saveKey);
  $('provider-select').addEventListener('change', onProviderChange);
  $('btn-menu').addEventListener('click', toggleMenu);
  $('btn-close-menu').addEventListener('click', toggleMenu);
  $('menu-new-repair').addEventListener('click', startOver);
  $('menu-settings').addEventListener('click', () => { stopAR(); initSettingsUI(); showScreen('settings'); });
  $('btn-prev').addEventListener('click', prevStep);
  $('btn-next').addEventListener('click', nextStep);
  $('btn-rescan').addEventListener('click', rescan);
}

function initSettingsUI() {
  const provider = getProvider();
  setProvider(provider);
  $('provider-select').value = provider;
  updateProviderUI(provider);
  $('api-key-input').value = hasApiKey() ? '••••••••••••••••' : '';
}

function onProviderChange() {
  const provider = $('provider-select').value;
  setProvider(provider);
  updateProviderUI(provider);
  $('api-key-input').value = hasApiKey() ? '••••••••••••••••' : '';
}

function updateProviderUI(provider) {
  const isGemini = provider === 'gemini';
  $('api-key-label').textContent = isGemini ? 'Google API Key' : 'Anthropic API Key';
  $('api-key-input').placeholder = isGemini ? 'AIza...' : 'sk-ant-...';
  if (isGemini) { show($('info-gemini')); hide($('info-anthropic')); }
  else { hide($('info-gemini')); show($('info-anthropic')); }
}

function saveKey() {
  const key = $('api-key-input').value.trim();
  if (!key || key === '••••••••••••••••') {
    showToast('Please enter a valid API key', 'error');
    return;
  }
  setApiKey(key);
  $('api-key-input').value = '••••••••••••••••';
  showToast('Key saved', 'success');
  showScreen('chat');
}

function startARFromChat(category, model, problem) {
  chatCategory = category;
  chatModel = model;
  chatProblem = problem;
  startAR();
}

async function startAR() {
  demoMode = !hasApiKey();

  if (!isCameraSupported()) {
    showToast('Camera not supported', 'error');
    return;
  }

  showScreen('ar');
  const video = $('camera-feed');
  const canvas = $('ar-overlay');

  try {
    await startCamera(video);
    await new Promise(resolve => {
      if (video.readyState >= 2) return resolve();
      video.addEventListener('loadeddata', resolve, { once: true });
    });
    initOverlay(canvas, video);

    if (demoMode) {
      loadDemoRepair(chatCategory);
    } else {
      setTimeout(() => performScan(), 500);
    }
  } catch (err) {
    if (err.name === 'NotAllowedError') {
      showToast('Camera permission denied', 'error');
    } else {
      showToast('Camera error: ' + err.message, 'error');
    }
    showScreen('chat');
  }
}

function stopAR() {
  cancelAnalysis();
  clearRescanTimer();
  stopCamera($('camera-feed'));
  clearOverlay($('ar-overlay'));
  hide($('step-counter'));
  hide($('instruction-bar'));
  hide($('ar-controls'));
  hide($('ar-status'));
  hide($('menu-panel'));
}

async function performScan() {
  if (isScanning) return;
  isScanning = true;

  show($('ar-status'));
  $('ar-status-text').textContent = 'Scanning...';
  hide($('ar-controls'));

  const video = $('camera-feed');
  const base64 = captureFrame(video);

  const productInfo = { category: chatCategory, model: chatModel };
  const problemDescription = chatProblem;
  const product = findProduct(productInfo.category, productInfo.model);
  const knowledgeContext = product ? getRepairContext(product, problemDescription) : null;

  try {
    repairData = await analyzeFrame(base64, productInfo, problemDescription, knowledgeContext);
    currentStep = 0;
    hide($('ar-status'));
    show($('ar-controls'));
    showStep();
    scheduleRescan();
  } catch (err) {
    hide($('ar-status'));
    if (err.name !== 'AbortError') {
      showToast(err.message, 'error');
    }
  } finally {
    isScanning = false;
  }
}

function showStep() {
  if (!repairData || !repairData.repair_steps) return;

  const steps = repairData.repair_steps;
  const step = steps[currentStep];
  if (!step) return;

  show($('step-counter'));
  $('step-number').textContent = currentStep + 1;
  const totalSteps = steps.length;
  const circumference = 150.8;
  const progress = ((currentStep + 1) / totalSteps) * circumference;
  $('step-progress').setAttribute('stroke-dashoffset', circumference - progress);

  show($('instruction-bar'));
  $('instruction-text').textContent = step.instruction;

  $('btn-prev').disabled = currentStep === 0;
  $('btn-next').disabled = currentStep === steps.length - 1;

  const canvas = $('ar-overlay');
  if (step.annotations && step.annotations.length > 0) {
    renderAnnotations(canvas, step.annotations);
  } else {
    clearOverlay(canvas);
  }

  if (navigator.vibrate) navigator.vibrate(20);
}

function prevStep() {
  if (currentStep > 0) {
    currentStep--;
    showStep();
  }
}

function nextStep() {
  if (repairData && currentStep < repairData.repair_steps.length - 1) {
    currentStep++;
    showStep();
  }
}

function loadDemoRepair(category) {
  const demo = DEMO_REPAIRS[category] || DEMO_REPAIRS.printer;
  repairData = demo;
  currentStep = 0;
  hide($('ar-status'));
  show($('ar-controls'));
  showStep();
}

function rescan() {
  clearRescanTimer();
  clearOverlay($('ar-overlay'));
  hide($('instruction-bar'));
  hide($('step-counter'));

  if (demoMode) {
    loadDemoRepair(chatCategory);
  } else {
    performScan();
  }
}

function scheduleRescan() {
  clearRescanTimer();
  rescanTimer = setTimeout(() => {
    if (!isScanning && document.getElementById('screen-ar').classList.contains('active')) {
      refreshCurrentStep();
    }
  }, 15000);
}

async function refreshCurrentStep() {
  if (isScanning) return;
  isScanning = true;

  const video = $('camera-feed');
  const base64 = captureFrame(video);

  const productInfo = { category: chatCategory, model: chatModel };
  const problemDescription = chatProblem;
  const product = findProduct(productInfo.category, productInfo.model);
  const knowledgeContext = product ? getRepairContext(product, problemDescription) : null;

  try {
    const freshData = await analyzeFrame(base64, productInfo, problemDescription, knowledgeContext);
    if (freshData && freshData.repair_steps && freshData.repair_steps[currentStep]) {
      repairData.repair_steps[currentStep].annotations = freshData.repair_steps[currentStep].annotations;
      showStep();
    }
    scheduleRescan();
  } catch (e) {
    scheduleRescan();
  } finally {
    isScanning = false;
  }
}

function clearRescanTimer() {
  if (rescanTimer) {
    clearTimeout(rescanTimer);
    rescanTimer = null;
  }
}

function toggleMenu() {
  $('menu-panel').classList.toggle('hidden');
}

function startOver() {
  stopAR();
  repairData = null;
  currentStep = 0;
  showScreen('chat');
}

init();
