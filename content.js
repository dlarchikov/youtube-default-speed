let applyingSpeed = false;
const STORAGE_KEY = 'youtubeDefaultSpeed';

function setVideoSpeed(video, speed) {
  if (!speed || video.playbackRate === speed) return;
  applyingSpeed = true;
  video.playbackRate = speed;
}

function persistSpeed(speed) {
  try { localStorage.setItem(STORAGE_KEY, speed.toString()); } catch (e) {}
  try { if (chrome.storage && chrome.storage.sync) chrome.storage.sync.set({ [STORAGE_KEY]: speed }); } catch (e) {}
}

function saveSpeed(speed) {
  chrome.runtime.sendMessage({ action: 'setSpeed', speed }).catch(() => {});
  persistSpeed(speed);
}

function applySavedSpeed(video) {
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    if (s) { setVideoSpeed(video, parseFloat(s)); return; }
  } catch (e) {}
  try {
    if (chrome.storage && chrome.storage.sync) {
      chrome.storage.sync.get({ [STORAGE_KEY]: null }, (r) => {
        if (r[STORAGE_KEY]) setVideoSpeed(video, r[STORAGE_KEY]);
      });
    }
  } catch (e) {}
}

function setupVideo(video) {
  if (video._speedSetup) return;
  video._speedSetup = true;
  applySavedSpeed(video);
  video.addEventListener('ratechange', () => {
    if (applyingSpeed) { applyingSpeed = false; return; }
    saveSpeed(video.playbackRate);
  });
}

function findAndSetupVideo() {
  const video = document.querySelector('video');
  if (video) setupVideo(video);
}

findAndSetupVideo();
document.addEventListener('yt-navigate-finish', findAndSetupVideo);

new MutationObserver(() => {
  if (document.querySelector('video')) findAndSetupVideo();
}).observe(document.body, { childList: true, subtree: true });

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.action === 'applySpeed' && msg.speed) {
    const video = document.querySelector('video');
    if (video) {
      setVideoSpeed(video, msg.speed);
      persistSpeed(msg.speed);
    }
  }
});

try {
  if (chrome.storage) {
    chrome.storage.onChanged.addListener((changes) => {
      if (changes[STORAGE_KEY]) {
        const video = document.querySelector('video');
        if (video) {
          setVideoSpeed(video, changes[STORAGE_KEY].newValue);
          persistSpeed(changes[STORAGE_KEY].newValue);
        }
      }
    });
  }
} catch (e) {}

setInterval(() => {
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    if (s) {
      const parsed = parseFloat(s);
      const video = document.querySelector('video');
      if (video && parsed && video.playbackRate !== parsed) {
        setVideoSpeed(video, parsed);
      }
    }
  } catch (e) {}
}, 1500);
