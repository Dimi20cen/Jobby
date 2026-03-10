const DEFAULT_SETTINGS = {
  backendBaseUrl: 'http://localhost:8000',
  dashboardUrl: 'http://localhost:3000',
  defaultCvText: ''
};

const backendBaseUrlInput = document.getElementById('backendBaseUrl');
const dashboardUrlInput = document.getElementById('dashboardUrl');
const defaultCvTextInput = document.getElementById('defaultCvText');
const optionsStatus = document.getElementById('optionsStatus');

function setStatus(message, tone = '') {
  optionsStatus.textContent = message;
  optionsStatus.className = tone ? `status ${tone}` : 'status';
}

async function loadSettings() {
  const stored = await chrome.storage.sync.get(DEFAULT_SETTINGS);
  backendBaseUrlInput.value = stored.backendBaseUrl;
  dashboardUrlInput.value = stored.dashboardUrl;
  defaultCvTextInput.value = stored.defaultCvText;
}

async function saveSettings(event) {
  event.preventDefault();
  const nextSettings = {
    backendBaseUrl: backendBaseUrlInput.value.trim() || DEFAULT_SETTINGS.backendBaseUrl,
    dashboardUrl: dashboardUrlInput.value.trim() || DEFAULT_SETTINGS.dashboardUrl,
    defaultCvText: defaultCvTextInput.value.trim()
  };
  await chrome.storage.sync.set(nextSettings);
  setStatus('Settings saved.', 'success');
}

async function resetSettings() {
  await chrome.storage.sync.set(DEFAULT_SETTINGS);
  await loadSettings();
  setStatus('Settings reset to local defaults.', 'success');
}

document.getElementById('optionsForm').addEventListener('submit', saveSettings);
document.getElementById('resetOptionsBtn').addEventListener('click', resetSettings);

document.addEventListener('DOMContentLoaded', loadSettings);
