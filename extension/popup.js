const DEFAULT_SETTINGS = {
  backendBaseUrl: 'http://localhost:8000',
  dashboardUrl: 'http://localhost:3000',
  defaultCvText: ''
};

const form = document.getElementById('captureForm');
const statusEl = document.getElementById('status');
const refillBtn = document.getElementById('refillBtn');
const saveBtn = document.getElementById('saveBtn');
const saveGenerateBtn = document.getElementById('saveGenerateBtn');
const dashboardBtn = document.getElementById('dashboardBtn');
const optionsBtn = document.getElementById('optionsBtn');

const fields = {
  jobTitle: document.getElementById('jobTitle'),
  companyName: document.getElementById('companyName'),
  location: document.getElementById('location'),
  jobUrl: document.getElementById('jobUrl'),
  jobDescription: document.getElementById('jobDescription'),
  notes: document.getElementById('notes'),
  cvUsed: document.getElementById('cvUsed')
};

let settings = { ...DEFAULT_SETTINGS };

function setStatus(message, tone = '') {
  statusEl.textContent = message;
  statusEl.className = tone ? `status ${tone}` : 'status';
}

function setBusy(isBusy) {
  [refillBtn, saveBtn, saveGenerateBtn, dashboardBtn, optionsBtn].forEach((button) => {
    button.disabled = isBusy;
  });
}

function cleanBaseUrl(url) {
  return url.replace(/\/+$/, '');
}

async function loadSettings() {
  settings = await chrome.storage.sync.get(DEFAULT_SETTINGS);
  if (!fields.cvUsed.value.trim()) {
    fields.cvUsed.value = settings.defaultCvText || '';
  }
}

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.id) {
    throw new Error('No active tab available');
  }
  return tab;
}

function appendCaptureNote(existingNotes, sourceUrl) {
  const trimmed = existingNotes.trim();
  if (trimmed.includes('Captured via Jobby Chrome extension')) {
    return trimmed;
  }
  const sourceLine = sourceUrl ? `Captured from: ${sourceUrl}` : 'Captured from browser extension';
  const stamped = `Captured via Jobby Chrome extension on ${new Date().toLocaleString()}`;
  return [trimmed, sourceLine, stamped].filter(Boolean).join('\n');
}

function scrapeJobPosting() {
  const clean = (value) => (value ? value.replace(/\s+/g, ' ').trim() : '');
  const textFromSelectors = (selectors) => {
    for (const selector of selectors) {
      const node = document.querySelector(selector);
      const value = clean(node?.textContent || '');
      if (value) {
        return value;
      }
    }
    return '';
  };

  const longestText = (selectors) => {
    let best = '';
    for (const selector of selectors) {
      const nodes = document.querySelectorAll(selector);
      for (const node of nodes) {
        const text = clean(node.textContent || '');
        if (text.length > best.length) {
          best = text;
        }
      }
    }
    return best;
  };

  const parseJsonLd = () => {
    const scripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
    for (const script of scripts) {
      try {
        const parsed = JSON.parse(script.textContent || '{}');
        const items = Array.isArray(parsed)
          ? parsed
          : Array.isArray(parsed['@graph'])
            ? parsed['@graph']
            : [parsed];
        const posting = items.find((item) => item && item['@type'] === 'JobPosting');
        if (!posting) {
          continue;
        }
        const address = posting.jobLocation?.address || posting.applicantLocationRequirements?.[0]?.name;
        let location = '';
        if (typeof address === 'string') {
          location = clean(address);
        } else if (address) {
          location = clean([address.addressLocality, address.addressRegion, address.addressCountry].filter(Boolean).join(', '));
        }
        return {
          title: clean(posting.title),
          company: clean(posting.hiringOrganization?.name),
          location,
          description: clean(posting.description ? posting.description.replace(/<[^>]+>/g, ' ') : '')
        };
      } catch (_error) {
        continue;
      }
    }
    return null;
  };

  const jsonLd = parseJsonLd();

  const title = jsonLd?.title || textFromSelectors([
    'h1',
    '[data-testid="job-title"]',
    '[data-test="jobTitle"]',
    '.jobs-unified-top-card__job-title',
    '.topcard__title',
    '.jobsearch-JobInfoHeader-title',
    '[class*="job-title"]'
  ]) || clean(document.title.split(/\s[\-|\|—–]\s/)[0]);

  const company = jsonLd?.company || textFromSelectors([
    '[data-testid="company-name"]',
    '[data-testid="inlineHeader-companyName"]',
    '.jobs-unified-top-card__company-name',
    '.job-details-jobs-unified-top-card__company-name',
    '.topcard__org-name-link',
    '.company',
    'a[href*="/company/"]'
  ]);

  const location = jsonLd?.location || textFromSelectors([
    '[data-testid="job-location"]',
    '.jobs-unified-top-card__bullet',
    '.topcard__flavor--bullet',
    '.jobsearch-JobInfoHeader-subtitle div',
    '[class*="location"]'
  ]);

  const description = jsonLd?.description || longestText([
    '[data-testid="job-details"]',
    '.jobs-description',
    '.jobs-box__html-content',
    '.show-more-less-html__markup',
    '#job-details',
    '.description__text',
    '.jobsearch-jobDescriptionText',
    '[class*="job-description"]',
    'main'
  ]).slice(0, 12000);

  return {
    title: title || 'Unknown title',
    company: company || 'Unknown company',
    location,
    url: window.location.href,
    description,
    dateScraped: new Date().toISOString()
  };
}

async function refillFromPage() {
  setBusy(true);
  setStatus('Scanning current page...');
  try {
    const tab = await getActiveTab();
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: scrapeJobPosting
    });

    fields.jobTitle.value = result?.title || '';
    fields.companyName.value = result?.company || '';
    fields.location.value = result?.location || '';
    fields.jobUrl.value = result?.url || tab.url || '';
    fields.jobDescription.value = result?.description || '';
    if (!fields.notes.value.trim()) {
      fields.notes.value = appendCaptureNote('', result?.url || tab.url || '');
    }
    setStatus('Page details captured.', 'success');
  } catch (error) {
    setStatus(error instanceof Error ? error.message : 'Could not scrape this page.', 'error');
  } finally {
    setBusy(false);
  }
}

function buildPayload() {
  const title = fields.jobTitle.value.trim();
  const company = fields.companyName.value.trim();
  const location = fields.location.value.trim() || null;
  const jobUrl = fields.jobUrl.value.trim() || null;
  const jobDescription = fields.jobDescription.value.trim();
  const notes = appendCaptureNote(fields.notes.value, jobUrl || '');
  const cvUsed = fields.cvUsed.value.trim();

  if (!title || !company) {
    throw new Error('Job title and company are required.');
  }

  return {
    company_name: company,
    job_title: title,
    location,
    status: 'draft',
    applied_date: null,
    job_url: jobUrl,
    job_description: jobDescription,
    cv_used: cvUsed,
    notes,
    cover_letter: '',
    interview_questions: [],
    tailored_bullets: []
  };
}

async function createApplication(payload) {
  const response = await fetch(`${cleanBaseUrl(settings.backendBaseUrl)}/applications`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.detail || 'Could not save application to Jobby.');
  }
  return data;
}

async function triggerGeneration(applicationId) {
  const response = await fetch(`${cleanBaseUrl(settings.backendBaseUrl)}/applications/${applicationId}/generate`, {
    method: 'POST'
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.detail || 'Application saved, but generation failed.');
  }
  return data;
}

async function saveDraft(shouldGenerate) {
  setBusy(true);
  setStatus(shouldGenerate ? 'Saving draft and generating assets...' : 'Saving draft to Jobby...');
  try {
    const payload = buildPayload();
    const application = await createApplication(payload);
    if (shouldGenerate) {
      await triggerGeneration(application.id);
      setStatus('Saved and generated successfully.', 'success');
    } else {
      setStatus('Draft saved to Jobby.', 'success');
    }
  } catch (error) {
    setStatus(error instanceof Error ? error.message : 'Save failed.', 'error');
  } finally {
    setBusy(false);
  }
}

async function openDashboard() {
  await chrome.tabs.create({ url: settings.dashboardUrl || DEFAULT_SETTINGS.dashboardUrl });
}

form.addEventListener('submit', (event) => {
  event.preventDefault();
});
refillBtn.addEventListener('click', refillFromPage);
saveBtn.addEventListener('click', () => saveDraft(false));
saveGenerateBtn.addEventListener('click', () => saveDraft(true));
dashboardBtn.addEventListener('click', openDashboard);
optionsBtn.addEventListener('click', () => chrome.runtime.openOptionsPage());

document.addEventListener('DOMContentLoaded', async () => {
  await loadSettings();
  await refillFromPage();
});
