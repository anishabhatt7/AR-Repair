let mediaRecorder = null;
let recordedChunks = [];
let cameraStream = null;
let capturedSnapshots = [];
let snapshotInterval = null;
let transcribedSteps = [];
let isRecording = false;
let recognition = null;
let currentStepTranscript = '';
let stepCount = 0;

const $ = id => document.getElementById(id);

export function initRecord() {
  $('btn-start-recording').addEventListener('click', startRecording);
  $('btn-stop-recording').addEventListener('click', stopRecording);
  $('btn-next-step').addEventListener('click', captureStep);
  $('btn-confirm-recap').addEventListener('click', generateArticle);
  $('btn-redo-recording').addEventListener('click', redoRecording);
  $('btn-back-record').addEventListener('click', exitRecording);
  $('btn-recap-back').addEventListener('click', redoRecording);
  $('btn-back-article').addEventListener('click', exitArticle);
}

function exitRecording() {
  cleanup();
  document.querySelectorAll('.screen').forEach(el => el.classList.remove('active'));
  $('screen-home').classList.add('active');
}

function exitArticle() {
  document.querySelectorAll('.screen').forEach(el => el.classList.remove('active'));
  $('screen-home').classList.add('active');
}

export async function startRecordFlow() {
  document.querySelectorAll('.screen').forEach(el => el.classList.remove('active'));
  $('screen-record').classList.add('active');

  transcribedSteps = [];
  capturedSnapshots = [];
  stepCount = 0;
  currentStepTranscript = '';
  recordedChunks = [];

  $('record-recording-view').classList.remove('hidden');
  $('record-recap-view').classList.add('hidden');
  $('record-step-list').textContent = '';
  $('record-status-text').textContent = 'Tap record to start capturing your fix';
  $('record-transcript-area').textContent = '';
  $('btn-start-recording').classList.remove('hidden');
  $('btn-stop-recording').classList.add('hidden');
  $('btn-next-step').classList.add('hidden');
  $('listening-animation').classList.add('hidden');
  $('record-indicator').classList.add('hidden');

  await initCamera();
}

async function initCamera() {
  const video = $('record-video');
  try {
    cameraStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: true
    });
    video.srcObject = cameraStream;
    await video.play();
  } catch (err) {
    if (err.name === 'OverconstrainedError') {
      cameraStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      video.srcObject = cameraStream;
      await video.play();
    }
  }
}

function startRecording() {
  if (!cameraStream) return;
  isRecording = true;
  stepCount = 0;
  transcribedSteps = [];
  capturedSnapshots = [];
  currentStepTranscript = '';
  recordedChunks = [];

  mediaRecorder = new MediaRecorder(cameraStream, { mimeType: getSupportedMimeType() });
  mediaRecorder.ondataavailable = e => { if (e.data.size > 0) recordedChunks.push(e.data); };
  mediaRecorder.start(1000);

  snapshotInterval = setInterval(() => takeSnapshot(), 5000);
  takeSnapshot();

  startSpeechRecognition();

  $('btn-start-recording').classList.add('hidden');
  $('btn-stop-recording').classList.remove('hidden');
  $('btn-next-step').classList.remove('hidden');
  $('listening-animation').classList.remove('hidden');
  $('record-indicator').classList.remove('hidden');
  $('record-status-text').textContent = 'Narrate what you are doing...';
  $('record-transcript-area').textContent = '';
}

function getSupportedMimeType() {
  const types = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4'];
  for (const type of types) {
    if (MediaRecorder.isTypeSupported(type)) return type;
  }
  return 'video/webm';
}

function startSpeechRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    $('record-transcript-area').textContent = '(Speech recognition not available)';
    return;
  }

  recognition = new SpeechRecognition();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = 'en-US';

  recognition.onresult = (event) => {
    let interim = '';
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcript = event.results[i][0].transcript;
      if (event.results[i].isFinal) {
        currentStepTranscript += transcript + ' ';
      } else {
        interim += transcript;
      }
    }
    $('record-transcript-area').textContent = currentStepTranscript + interim;
  };

  recognition.onerror = (event) => {
    if (event.error === 'no-speech') return;
  };

  recognition.onend = () => {
    if (isRecording) {
      try { recognition.start(); } catch (e) {}
    }
  };

  recognition.start();
}

function captureStep() {
  const transcriptArea = $('record-transcript-area');
  if (!currentStepTranscript.trim() && !transcriptArea.textContent.trim()) return;

  stepCount++;
  const stepText = transcriptArea.textContent.trim() || 'Step ' + stepCount;
  const snapshot = takeSnapshot();

  transcribedSteps.push({ step: stepCount, text: stepText, snapshot: snapshot });

  const stepItem = document.createElement('div');
  stepItem.className = 'record-step-item';
  const numSpan = document.createElement('span');
  numSpan.className = 'record-step-num';
  numSpan.textContent = stepCount;
  const textSpan = document.createElement('span');
  textSpan.className = 'record-step-text';
  textSpan.textContent = stepText;
  stepItem.appendChild(numSpan);
  stepItem.appendChild(textSpan);
  $('record-step-list').appendChild(stepItem);

  currentStepTranscript = '';
  transcriptArea.textContent = '';

  if (navigator.vibrate) navigator.vibrate(30);
}

function takeSnapshot() {
  const video = $('record-video');
  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth || 640;
  canvas.height = video.videoHeight || 480;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
  capturedSnapshots.push(dataUrl);
  return dataUrl;
}

function stopRecording() {
  isRecording = false;

  if (currentStepTranscript.trim() || $('record-transcript-area').textContent.trim()) {
    captureStep();
  }

  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop();
  }
  if (recognition) {
    recognition.stop();
    recognition = null;
  }
  if (snapshotInterval) {
    clearInterval(snapshotInterval);
    snapshotInterval = null;
  }

  $('record-indicator').classList.add('hidden');
  showRecap();
}

function showRecap() {
  $('record-recording-view').classList.add('hidden');
  $('record-recap-view').classList.remove('hidden');

  const recapBody = $('recap-bullet-list').parentElement;
  const recapList = $('recap-bullet-list');
  recapList.textContent = '';

  if (transcribedSteps.length === 0) {
    const emptyLi = document.createElement('li');
    emptyLi.className = 'recap-empty';
    emptyLi.textContent = 'No steps were recorded. Try again?';
    recapList.appendChild(emptyLi);
    $('btn-confirm-recap').classList.add('hidden');
    return;
  }

  $('btn-confirm-recap').classList.remove('hidden');

  transcribedSteps.forEach((step) => {
    const li = document.createElement('li');
    li.className = 'recap-bullet-item';
    li.appendChild(document.createTextNode(step.text));
    recapList.appendChild(li);
  });

  $('recap-summary-text').textContent = transcribedSteps.length + ' step' + (transcribedSteps.length > 1 ? 's' : '') + ' recorded. Say "okay" or tap Confirm.';

  startConfirmListener();
}

function startConfirmListener() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) return;

  const confirmRecognition = new SpeechRecognition();
  confirmRecognition.continuous = true;
  confirmRecognition.interimResults = false;
  confirmRecognition.lang = 'en-US';

  confirmRecognition.onresult = (event) => {
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const text = event.results[i][0].transcript.toLowerCase().trim();
      if (text.includes('okay') || text.includes('ok') || text.includes('confirm') || text.includes('yes')) {
        confirmRecognition.stop();
        generateArticle();
        return;
      }
    }
  };

  confirmRecognition.onerror = () => {};
  confirmRecognition.onend = () => {};

  try { confirmRecognition.start(); } catch (e) {}
}

function generateArticle() {
  cleanup();
  document.querySelectorAll('.screen').forEach(el => el.classList.remove('active'));
  $('screen-article').classList.add('active');

  const articleContent = $('article-content');
  articleContent.textContent = '';

  const title = document.createElement('h1');
  title.className = 'article-title';
  title.textContent = 'Troubleshooting Guide';
  articleContent.appendChild(title);

  const meta = document.createElement('p');
  meta.className = 'article-meta';
  const now = new Date();
  meta.textContent = 'Recorded on ' + now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  articleContent.appendChild(meta);

  const divider = document.createElement('hr');
  divider.className = 'article-divider';
  articleContent.appendChild(divider);

  transcribedSteps.forEach((step, i) => {
    const section = document.createElement('section');
    section.className = 'article-step';

    const heading = document.createElement('h2');
    heading.className = 'article-step-heading';
    heading.textContent = 'Step ' + (i + 1);
    section.appendChild(heading);

    if (step.snapshot) {
      const img = document.createElement('img');
      img.className = 'article-step-image';
      img.src = step.snapshot;
      img.alt = 'Step ' + (i + 1) + ' snapshot';
      section.appendChild(img);
    }

    const text = document.createElement('p');
    text.className = 'article-step-text';
    text.textContent = step.text;
    section.appendChild(text);

    articleContent.appendChild(section);
  });

  if (recordedChunks.length > 0) {
    const videoSection = document.createElement('section');
    videoSection.className = 'article-video-section';
    const videoTitle = document.createElement('h2');
    videoTitle.className = 'article-step-heading';
    videoTitle.textContent = 'Full Recording';
    videoSection.appendChild(videoTitle);

    const blob = new Blob(recordedChunks, { type: 'video/webm' });
    const url = URL.createObjectURL(blob);
    const videoEl = document.createElement('video');
    videoEl.className = 'article-video';
    videoEl.src = url;
    videoEl.controls = true;
    videoEl.playsInline = true;
    videoSection.appendChild(videoEl);
    articleContent.appendChild(videoSection);
  }
}

function redoRecording() {
  transcribedSteps = [];
  capturedSnapshots = [];
  stepCount = 0;
  currentStepTranscript = '';
  recordedChunks = [];
  $('record-step-list').textContent = '';
  $('record-recording-view').classList.remove('hidden');
  $('record-recap-view').classList.add('hidden');
  $('record-status-text').textContent = 'Tap record to start capturing your fix';
  $('record-transcript-area').textContent = '';
  $('btn-start-recording').classList.remove('hidden');
  $('btn-stop-recording').classList.add('hidden');
  $('btn-next-step').classList.add('hidden');
  $('listening-animation').classList.add('hidden');
  $('record-indicator').classList.add('hidden');
}

function cleanup() {
  isRecording = false;
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop();
  }
  if (recognition) {
    recognition.stop();
    recognition = null;
  }
  if (snapshotInterval) {
    clearInterval(snapshotInterval);
    snapshotInterval = null;
  }
  if (cameraStream) {
    cameraStream.getTracks().forEach(t => t.stop());
    cameraStream = null;
  }
  const video = $('record-video');
  if (video) video.srcObject = null;
}
