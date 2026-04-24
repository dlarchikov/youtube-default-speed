let speed = 1;
let ready = null;

ready = new Promise((resolve) => {
  try {
    if (!chrome.storage || !chrome.storage.sync) { resolve(); return; }
    chrome.storage.sync.get({ youtubeDefaultSpeed: null }, (r) => {
      if (r.youtubeDefaultSpeed != null) speed = r.youtubeDefaultSpeed;
      resolve();
    });
  } catch (e) { resolve(); }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'getSpeed') {
    ready.then(() => sendResponse({ speed }));
    return true;
  }
  if (message.action === 'setSpeed') {
    speed = message.speed;
    try { if (chrome.storage && chrome.storage.sync) chrome.storage.sync.set({ youtubeDefaultSpeed: speed }); } catch (e) {}
    notifyTabs(speed);
    return false;
  }
});

function notifyTabs(speed) {
  try {
    chrome.tabs.query({ url: '*://www.youtube.com/*' }).then((tabs) => {
      tabs.forEach(tab => {
        chrome.tabs.sendMessage(tab.id, { action: 'applySpeed', speed }).catch(() => {});
      });
    }).catch(() => {});
  } catch (e) {}
}
