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
const stateChipEl = document.getElementById('stateChip');
const sourceChipEl = document.getElementById('sourceChip');
const openJobLinkEl = document.getElementById('openJobLink');
const deleteBtn = document.getElementById('deleteBtn');

const fields = {
  jobTitle: document.getElementById('jobTitle'),
  companyName: document.getElementById('companyName'),
  location: document.getElementById('location'),
  jobUrl: document.getElementById('jobUrl'),
  jobDescription: document.getElementById('jobDescription')
};

let settings = { ...DEFAULT_SETTINGS };
let currentApplicationId = null;
let popupState = 'unsaved';
let currentSourceLabel = 'Page';

function setStatus(message, tone = '') {
  statusEl.textContent = message;
  statusEl.className = tone ? `status ${tone}` : 'status';
}

function setBusy(isBusy) {
  refillBtn.disabled = isBusy;
  saveBtn.disabled = isBusy;
  saveGenerateBtn.disabled = isBusy || !currentApplicationId;
  deleteBtn.disabled = isBusy || !currentApplicationId;
}

function cleanBaseUrl(url) {
  return url.replace(/\/+$/, '');
}

function deriveSourceLabel(url) {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, '');
    if (hostname.includes('linkedin')) {
      return 'LinkedIn';
    }
    if (hostname.includes('indeed')) {
      return 'Indeed';
    }
    return hostname || 'Page';
  } catch (_error) {
    return 'Page';
  }
}

function updateUiState(nextState) {
  popupState = nextState;

  const stateMeta = {
    unsaved: { label: 'Unsaved', chipClass: 'chip chip-muted' },
    saved: { label: 'Saved', chipClass: 'chip chip-success' },
    generated: { label: 'Generated', chipClass: 'chip chip-success' }
  };

  const activeState = stateMeta[nextState] || stateMeta.unsaved;
  stateChipEl.textContent = activeState.label;
  stateChipEl.className = activeState.chipClass;
  sourceChipEl.textContent = currentSourceLabel;

  const hasSavedRecord = Boolean(currentApplicationId);
  saveBtn.textContent = hasSavedRecord ? 'Update Job' : 'Save Job';
  saveGenerateBtn.disabled = !hasSavedRecord;
  openJobLinkEl.classList.toggle('hidden', !hasSavedRecord);
  deleteBtn.classList.toggle('hidden', !hasSavedRecord);

  if (hasSavedRecord) {
    openJobLinkEl.href = `${cleanBaseUrl(settings.dashboardUrl)}/applications/${currentApplicationId}`;
  } else {
    openJobLinkEl.href = '#';
  }
}

function populateFieldsFromRecord(record) {
  fields.jobTitle.value = record.job_title || '';
  fields.companyName.value = record.company_name || '';
  fields.location.value = record.location || '';
  fields.jobUrl.value = record.job_url || '';
  fields.jobDescription.value = record.job_description || '';
  currentSourceLabel = deriveSourceLabel(record.job_url || '');
  updateUiState(currentApplicationId ? popupState : 'unsaved');
}

async function loadSettings() {
  settings = await chrome.storage.sync.get(DEFAULT_SETTINGS);
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
  const hostname = window.location.hostname.toLowerCase();
  const clean = (value) => (value ? value.replace(/\s+/g, ' ').trim() : '');
  const cleanMultiline = (value) => (value ? value.replace(/\r/g, '').replace(/\t/g, ' ').replace(/[ \f\v]+/g, ' ').trim() : '');
  const textFromSelectors = (selectors, root = document) => {
    for (const selector of selectors) {
      const node = root.querySelector(selector);
      const value = clean(node?.textContent || '');
      if (value) {
        return value;
      }
    }
    return '';
  };

  const longestNodeFromSelectors = (selectors, root = document) => {
    let bestNode = null;
    let bestLength = 0;
    for (const selector of selectors) {
      const nodes = root.querySelectorAll(selector);
      for (const node of nodes) {
        const length = clean(node.textContent || '').length;
        if (length > bestLength) {
          bestNode = node;
          bestLength = length;
        }
      }
    }
    return bestNode;
  };

  const contentFromSelectors = (selectors, attribute = 'content', root = document) => {
    for (const selector of selectors) {
      const node = root.querySelector(selector);
      const value = clean(node?.getAttribute?.(attribute) || '');
      if (value) {
        return value;
      }
    }
    return '';
  };

  const cleanTitle = (value) => {
    if (!value) {
      return '';
    }

    return clean(value)
      .replace(/\s+\|\s+(LinkedIn|Indeed|Glassdoor|Greenhouse|Lever|Workday)$/i, '')
      .replace(/\s+-\s+(LinkedIn|Indeed|Glassdoor|Greenhouse|Lever|Workday)$/i, '')
      .replace(/\s+\|\s+Job Details.*$/i, '')
      .replace(/\s*-\s*Job\b.*$/i, '')
      .replace(/\s+at\s+.+$/i, '');
  };

  const cleanLocation = (value) => {
    if (!value) {
      return '';
    }

    return clean(value)
      .replace(/ · .*/g, '')
      .replace(/\s*\([^)]*\)\s*/g, ' ')
      .replace(/\b(\d+\s*(day|days|hour|hours|week|weeks)\s+ago)\b/gi, '')
      .replace(/\b(over|more than)\s+\d+\s+applicants?\b/gi, '')
      .replace(/\b\d+\s+applicants?\b/gi, '')
      .replace(/\b(promoted by hirer|easy apply|actively reviewing applicants)\b/gi, '')
      .replace(/\s{2,}/g, ' ')
      .replace(/[,\-|\u00b7]\s*$/g, '')
      .trim();
  };

  const looksLikeLocation = (value) => {
    if (!value) {
      return false;
    }

    const cleaned = cleanLocation(value);
    if (!cleaned) {
      return false;
    }

    if (/\b(applicants?|easy apply|promoted by hirer|actively reviewing|responses managed off)\b/i.test(cleaned)) {
      return false;
    }

    if (/^\d+\s*(day|days|hour|hours|week|weeks)\s+ago$/i.test(cleaned)) {
      return false;
    }

    return /,/.test(cleaned)
      || /\b(remote|hybrid|on-site|onsite)\b/i.test(cleaned)
      || /\b[a-z]+, [a-z]+\b/i.test(cleaned.toLowerCase());
  };

  const cleanFieldValue = (value, fallback = '') => {
    const trimmed = clean(value);
    if (!trimmed) {
      return fallback;
    }
    if (/^unknown (title|company)$/i.test(trimmed)) {
      return fallback;
    }
    return trimmed;
  };

  const removeJunkNodes = (root) => {
    if (!root) {
      return;
    }

    root.querySelectorAll([
      'script',
      'style',
      'noscript',
      'iframe',
      'svg',
      'nav',
      'footer',
      'header button',
      'aside',
      'button',
      'input',
      'select',
      'textarea',
      '[aria-hidden="true"]',
      '.visually-hidden',
      '.sr-only',
      '.screen-reader-text',
      '[role="alert"]',
      '[role="banner"]',
      '[role="navigation"]',
      '.jobs-poster__container',
      '.jobs-company__box',
      '.jobs-description__footer-button',
      '.jobs-similar-jobs',
      '.jobs-box--fade',
      '.jobsearch-JobComponent-descriptionMetadata',
      '.jobsearch-JobDescription-footer',
      '.jobsearch-RelatedJobs',
      '.jobsearch-RightPane',
      '.icl-u-xs-hide',
      '.css-1m4cuuf',
      '[data-testid="apply-button"]'
    ].join(',')).forEach((node) => node.remove());
  };

  const htmlToText = (element) => {
    if (!element) {
      return '';
    }

    const root = element.cloneNode(true);
    removeJunkNodes(root);

    const walk = (node) => {
      let output = '';

      node.childNodes.forEach((child) => {
        if (child.nodeType === Node.TEXT_NODE) {
          output += child.nodeValue || '';
          return;
        }

        if (child.nodeType !== Node.ELEMENT_NODE) {
          return;
        }

        const tag = child.tagName.toLowerCase();
        const text = walk(child).trim();

        if (!text && !['br', 'li'].includes(tag)) {
          return;
        }

        if (tag === 'br') {
          output += '\n';
        } else if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tag)) {
          output += `\n${text}\n`;
        } else if (tag === 'li') {
          output += `\n- ${text}`;
        } else if (['p', 'div', 'section', 'article', 'main', 'ul', 'ol'].includes(tag)) {
          output += `\n${text}\n`;
        } else {
          output += `${text} `;
        }
      });

      return output;
    };

    return walk(root);
  };

  const cleanupDescription = (value) => {
    if (!value) {
      return '';
    }

    const startMarkers = [
      /^about the job$/i,
      /^job description$/i,
      /^about this job$/i,
      /^role overview$/i
    ];
    const endMarkers = [
      /^about the company$/i,
      /^company photos$/i,
      /^more jobs$/i,
      /^set alert$/i,
      /^set alert for similar jobs$/i,
      /^job search faster$/i,
      /^access company insights/i,
      /^reactivate premium$/i,
      /^cancel anytime\./i,
      /^learn more:\s*/i,
      /^next steps$/i,
      /^looking for talent\?$/i,
      /^benefits$/i
    ];
    const noisePatterns = [
      /^continue/i,
      /^skip to main/i,
      /^sign in/i,
      /^join now/i,
      /^easy apply$/i,
      /^apply now$/i,
      /^apply on company site$/i,
      /^save$/i,
      /^share$/i,
      /^report this job$/i,
      /^meet the hiring team/i,
      /^people you can reach out to/i,
      /^promoted by hirer/i,
      /^actively reviewing applicants/i,
      /^over \d+ applicants/i,
      /^\d+ applicants$/i,
      /^\d+ days ago$/i,
      /^responses managed off/i,
      /^see who you compare to/i,
      /^off$/i,
      /^access company insights/i,
      /^alexandru and millions of other members use premium$/i,
      /^cancel anytime\./i,
      /^learn more:\s*/i,
      /^show more$/i,
      /^show less$/i,
      /^page \d+ of \d+$/i
    ];

    let lines = value
      .replace(/<[^>]+>/g, ' ')
      .split('\n')
      .map((line) => cleanMultiline(line))
      .filter((line, index, all) => line || (index > 0 && all[index - 1] !== ''));

    let startIndex = 0;
    for (let i = 0; i < lines.length; i += 1) {
      if (startMarkers.some((pattern) => pattern.test(lines[i]))) {
        startIndex = i;
        break;
      }
    }

    let endIndex = lines.length;
    for (let i = startIndex + 1; i < lines.length; i += 1) {
      if (endMarkers.some((pattern) => pattern.test(lines[i]))) {
        endIndex = i;
        break;
      }
    }

    const deduped = [];
    let previous = '';
    for (const line of lines.slice(startIndex, endIndex)) {
      if (!line) {
        if (deduped[deduped.length - 1] !== '') {
          deduped.push('');
        }
        continue;
      }

      if (noisePatterns.some((pattern) => pattern.test(line))) {
        continue;
      }

      if (line === previous) {
        continue;
      }

      deduped.push(line);
      previous = line;
    }

    while (deduped[0] === '') {
      deduped.shift();
    }
    while (deduped[deduped.length - 1] === '') {
      deduped.pop();
    }

    const formatHeading = (line) => {
      const normalizedLine = cleanMultiline(line).replace(/:$/, '');
      if (!normalizedLine) {
        return '';
      }

      if (
        /^(about the job|job description|about this job|your mission|your first three months at .+|your experience may include|skills we are looking for|nice to have|what we offer|next steps)$/i.test(normalizedLine)
      ) {
        return `## ${normalizedLine}`;
      }

      return normalizedLine;
    };

    const normalized = [];
    const shouldJoinParagraphLine = (current, next) => {
      if (!current || !next) {
        return false;
      }

      if (current.startsWith('- ') || next.startsWith('- ') || current.startsWith('## ') || next.startsWith('## ')) {
        return false;
      }

      if (/[.:!?]$/.test(current)) {
        return false;
      }

      if (/^[A-Z][A-Za-z0-9/&()' -]{0,60}$/.test(next)) {
        return false;
      }

      if (/^[a-z]/.test(next) || /^(and|or|to|with|for|in|on|of|that|where|using)\b/i.test(next)) {
        return true;
      }

      return current.length < 90 && next.length < 120;
    };

    for (const rawLine of deduped) {
      if (!rawLine) {
        if (normalized[normalized.length - 1] !== '') {
          normalized.push('');
        }
        continue;
      }

      const line = formatHeading(rawLine);
      const previousLine = normalized[normalized.length - 1];
      if (shouldJoinParagraphLine(previousLine, line)) {
        normalized[normalized.length - 1] = `${previousLine} ${line}`.replace(/\s+/g, ' ').trim();
      } else {
        normalized.push(line);
      }
    }

    return normalized.join('\n').slice(0, 12000).trim();
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
          location = cleanLocation(address);
        } else if (address) {
          location = cleanLocation([address.addressLocality, address.addressRegion, address.addressCountry].filter(Boolean).join(', '));
        }

        return {
          title: cleanTitle(posting.title),
          company: clean(posting.hiringOrganization?.name),
          location,
          description: cleanupDescription(posting.description || '')
        };
      } catch (_error) {
        continue;
      }
    }
    return {};
  };

  const extractLinkedIn = () => {
    const descriptionNode = longestNodeFromSelectors([
      '.jobs-description-content__text',
      '.show-more-less-html__markup',
      '.jobs-box__html-content'
    ]);
    const extractLinkedInLocation = () => {
      const topCardSelectors = [
        '.job-details-jobs-unified-top-card__container--two-pane',
        '.jobs-unified-top-card',
        '.job-details-jobs-unified-top-card__content',
        '.jobs-details-top-card'
      ];
      const rowSelectors = [
        '.job-details-jobs-unified-top-card__primary-description-without-tagline p',
        '.jobs-unified-top-card__primary-description-without-tagline p',
        '.job-details-jobs-unified-top-card__tertiary-description-container p',
        '.jobs-unified-top-card__tertiary-description-container p',
        '.job-details-jobs-unified-top-card__primary-description-without-tagline',
        '.jobs-unified-top-card__primary-description-without-tagline',
        '.job-details-jobs-unified-top-card__tertiary-description-container',
        '.jobs-unified-top-card__tertiary-description-container'
      ];

      const rows = Array.from(document.querySelectorAll(rowSelectors.join(',')));
      for (const row of rows) {
        const spanTexts = Array.from(row.querySelectorAll('span'))
          .map((node) => clean(node.textContent || ''))
          .filter((value) => value && value !== '·' && value !== '.');

        const directMatch = spanTexts.find((value) => looksLikeLocation(value));
        if (directMatch) {
          return cleanLocation(directMatch);
        }

        const grouped = spanTexts.join(' | ').split('|').map((value) => cleanLocation(value)).filter(Boolean);
        const groupedMatch = grouped.find((value) => looksLikeLocation(value));
        if (groupedMatch) {
          return groupedMatch;
        }

        const rowText = cleanLocation(row.textContent || '');
        if (looksLikeLocation(rowText)) {
          return rowText;
        }
      }

      for (const selector of topCardSelectors) {
        const card = document.querySelector(selector);
        if (!card) {
          continue;
        }

        const candidates = Array.from(card.querySelectorAll('span, div, p'))
          .map((node) => clean(node.textContent || ''))
          .filter((value) => value && value.length <= 120);

        const directMatch = candidates.find((value) => looksLikeLocation(value));
        if (directMatch) {
          return cleanLocation(directMatch);
        }
      }

      return '';
    };
    const parsedLocation = extractLinkedInLocation();

    return {
      title: textFromSelectors([
        '.job-details-jobs-unified-top-card__job-title',
        '.jobs-unified-top-card__job-title',
        '.topcard__title',
        'h1'
      ]),
      company: textFromSelectors([
        '.job-details-jobs-unified-top-card__company-name',
        '.jobs-unified-top-card__company-name',
        '.job-details-jobs-header__company-url',
        '.topcard__org-name-link'
      ]),
      location: cleanLocation(parsedLocation || textFromSelectors([
        '.job-details-jobs-header__company-location',
        '.jobs-unified-top-card__bullet',
        '.topcard__flavor--bullet',
        '.job-details-jobs-unified-top-card__primary-description-without-tagline',
        '.jobs-unified-top-card__primary-description-without-tagline'
      ])),
      description: cleanupDescription(htmlToText(descriptionNode))
    };
  };

  const extractIndeed = () => {
    const descriptionNode = longestNodeFromSelectors([
      '#jobDescriptionText',
      '.jobsearch-jobDescriptionText',
      '[data-testid="jobsearch-JobComponent-description"]'
    ]);

    return {
      title: textFromSelectors([
        '.jobsearch-JobInfoHeader-title',
        '[data-testid="jobsearch-JobInfoHeader-title"]',
        'h1'
      ]),
      company: textFromSelectors([
        '[data-testid="inlineHeader-companyName"]',
        '[data-testid="company-name"]',
        '.jobsearch-JobInfoHeader-companyNameSimple'
      ]),
      location: cleanLocation(textFromSelectors([
        '[data-testid="inlineHeader-companyLocation"]',
        '[data-testid="job-location"]',
        '.jobsearch-JobInfoHeader-subtitle div'
      ])),
      description: cleanupDescription(htmlToText(descriptionNode))
    };
  };

  const extractGeneric = () => {
    const descriptionNode = longestNodeFromSelectors([
      '[data-testid="job-details"]',
      '.jobs-description',
      '.jobs-box__html-content',
      '.show-more-less-html__markup',
      '#job-details',
      '.description__text',
      '.jobsearch-jobDescriptionText',
      '[class*="job-description"]',
      'article',
      'main'
    ]);

    return {
      title: textFromSelectors([
        'h1',
        '[data-testid="job-title"]',
        '[data-test="jobTitle"]',
        '.jobs-unified-top-card__job-title',
        '.topcard__title',
        '.jobsearch-JobInfoHeader-title',
        '[class*="job-title"]'
      ]),
      company: textFromSelectors([
        '[data-testid="company-name"]',
        '[data-testid="inlineHeader-companyName"]',
        '.jobs-unified-top-card__company-name',
        '.job-details-jobs-unified-top-card__company-name',
        '.topcard__org-name-link',
        '.company',
        'a[href*="/company/"]'
      ]),
      location: cleanLocation(textFromSelectors([
        '[data-testid="job-location"]',
        '.jobs-unified-top-card__bullet',
        '.topcard__flavor--bullet',
        '.jobsearch-JobInfoHeader-subtitle div',
        '[class*="location"]'
      ])),
      description: cleanupDescription(htmlToText(descriptionNode))
    };
  };

  const selectBoardExtractor = () => {
    if (hostname.includes('linkedin.com')) {
      return extractLinkedIn;
    }
    if (hostname.includes('indeed.com')) {
      return extractIndeed;
    }
    return extractGeneric;
  };

  const jsonLd = parseJsonLd();
  const boardData = selectBoardExtractor()();
  const genericData = extractGeneric();
  const fallbackTitle = cleanTitle(
    contentFromSelectors([
      'meta[property="og:title"]',
      'meta[name="twitter:title"]',
      'meta[name="title"]'
    ])
      || document.title.split(/\s(?:-|—|–|\|)\s/)[0]
  );

  const title = cleanFieldValue(boardData.title, cleanFieldValue(jsonLd.title, cleanFieldValue(genericData.title, fallbackTitle)));
  const company = cleanFieldValue(boardData.company, cleanFieldValue(jsonLd.company, cleanFieldValue(genericData.company)));
  const location = cleanLocation(boardData.location || jsonLd.location || genericData.location || '');
  const description = cleanupDescription(boardData.description || jsonLd.description || genericData.description || '');

  return {
    title: title || 'Unknown title',
    company: company || 'Unknown company',
    location,
    url: window.location.href,
    description,
    dateScraped: new Date().toISOString()
  };
}

async function findApplicationByUrl(jobUrl) {
  if (!jobUrl) {
    return null;
  }

  const url = new URL(`${cleanBaseUrl(settings.backendBaseUrl)}/applications`);
  url.searchParams.set('job_url', jobUrl);
  url.searchParams.set('limit', '1');

  const response = await fetch(url.toString());
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.detail || 'Could not look up saved jobs in Jobby.');
  }

  const summary = data.items?.[0];
  if (!summary?.id) {
    return null;
  }

  const detailResponse = await fetch(`${cleanBaseUrl(settings.backendBaseUrl)}/applications/${summary.id}`);
  const detail = await detailResponse.json().catch(() => ({}));
  if (!detailResponse.ok) {
    throw new Error(detail.detail || 'Could not load saved job details from Jobby.');
  }

  return detail;
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

    const scraped = {
      title: result?.title || '',
      company: result?.company || '',
      location: result?.location || '',
      url: result?.url || tab.url || '',
      description: result?.description || ''
    };
    currentSourceLabel = deriveSourceLabel(scraped.url);

    fields.jobTitle.value = scraped.title;
    fields.companyName.value = scraped.company;
    fields.location.value = scraped.location;
    fields.jobUrl.value = scraped.url;
    fields.jobDescription.value = scraped.description;

    const existing = await findApplicationByUrl(scraped.url);
    if (existing) {
      currentApplicationId = existing.id;
      popupState = existing.cover_letter ? 'generated' : 'saved';
      populateFieldsFromRecord(existing);
      setStatus('');
    } else {
      currentApplicationId = null;
      updateUiState('unsaved');
      setStatus('');
    }
  } catch (error) {
    setStatus(error instanceof Error ? error.message : 'Could not scrape this page.', 'error');
  } finally {
    setBusy(false);
    updateUiState(popupState);
  }
}

function buildPayload() {
  const title = fields.jobTitle.value.trim();
  const company = fields.companyName.value.trim();
  const location = fields.location.value.trim() || null;
  const jobUrl = fields.jobUrl.value.trim() || null;
  const jobDescription = fields.jobDescription.value.trim();
  const notes = appendCaptureNote('', jobUrl || '');
  const cvUsed = (settings.defaultCvText || '').trim();

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
    interview_questions: []
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

async function updateApplication(applicationId, payload) {
  const response = await fetch(`${cleanBaseUrl(settings.backendBaseUrl)}/applications/${applicationId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.detail || 'Could not update application in Jobby.');
  }
  return data;
}

async function deleteApplication(applicationId) {
  const response = await fetch(`${cleanBaseUrl(settings.backendBaseUrl)}/applications/${applicationId}`, {
    method: 'DELETE'
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.detail || 'Could not delete application from Jobby.');
  }
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
  if (shouldGenerate && !currentApplicationId) {
    setStatus('Save the job first, then generate the letter.', 'error');
    return;
  }

  setBusy(true);
  setStatus(shouldGenerate ? 'Generating assets from saved job...' : 'Saving draft to Jobby...');
  try {
    if (shouldGenerate) {
      const generatedApplication = await triggerGeneration(currentApplicationId);
      currentApplicationId = generatedApplication.id;
      popupState = 'generated';
      populateFieldsFromRecord(generatedApplication);
      setStatus('Letter generated successfully.', 'success');
    } else {
      const payload = buildPayload();
      const application = currentApplicationId
        ? await updateApplication(currentApplicationId, payload)
        : await createApplication(payload);
      currentApplicationId = application.id;
      popupState = 'saved';
      populateFieldsFromRecord(application);
      setStatus('Draft saved to Jobby.', 'success');
    }
  } catch (error) {
    setStatus(error instanceof Error ? error.message : 'Save failed.', 'error');
  } finally {
    setBusy(false);
    updateUiState(popupState);
  }
}

async function deleteCurrentApplication() {
  if (!currentApplicationId) {
    return;
  }

  const confirmed = window.confirm('Delete this saved job from Jobby?');
  if (!confirmed) {
    return;
  }

  setBusy(true);
  setStatus('Deleting saved job...');
  try {
    await deleteApplication(currentApplicationId);
    currentApplicationId = null;
    popupState = 'unsaved';
    updateUiState('unsaved');
    setStatus('Job deleted from Jobby.', 'success');
  } catch (error) {
    setStatus(error instanceof Error ? error.message : 'Delete failed.', 'error');
  } finally {
    setBusy(false);
    updateUiState(popupState);
  }
}

form.addEventListener('submit', (event) => {
  event.preventDefault();
});
refillBtn.addEventListener('click', refillFromPage);
saveBtn.addEventListener('click', () => saveDraft(false));
saveGenerateBtn.addEventListener('click', () => saveDraft(true));
deleteBtn.addEventListener('click', deleteCurrentApplication);

document.addEventListener('DOMContentLoaded', async () => {
  await loadSettings();
  updateUiState('unsaved');
  await refillFromPage();
});
