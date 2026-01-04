// Parse a pages spec like "1,3,5-7" into an array of unique, sorted numbers
function parsePagesSpec(str) {
  const pages = [];
  if (!str || !str.trim()) return pages;
  str.split(',').forEach(part => {
    part = part.trim();
    if (!part) return;
    if (part.includes('-')) {
      const [startStr, endStr] = part.split('-').map(s => s.trim());
      const start = Number(startStr);
      const end = Number(endStr);
      if (isNaN(start) || isNaN(end)) return;
      for (let i = Math.min(start, end); i <= Math.max(start, end); i++) pages.push(i);
    } else {
      const n = Number(part);
      if (!isNaN(n)) pages.push(n);
    }
  });
  // unique & sorted
  return Array.from(new Set(pages)).sort((a,b) => a - b);
}

// optional helper
function showSimple() {
  document.getElementById("simple-merge").style.display = "block";
  document.getElementById("custom-merge").style.display = "none";
}

function showCustom() {
  document.getElementById("simple-merge").style.display = "none";
  document.getElementById("custom-merge").style.display = "block";
}

document.getElementById("year").textContent = new Date().getFullYear();
// Runtime diagnostics: confirm script loaded and surface uncaught errors
console.debug('script.js loaded');

// on-page debug panel removed per user request

// Startup checks + aggressive binder: diagnose missing button bindings or blocked clicks
(function startupDiagnostics() {
  try {
    function startupChecks() {
      console.debug('startupChecks: document.readyState=' + document.readyState);
      console.debug('startupChecks: pdfjsLib loaded=' + (typeof pdfjsLib !== 'undefined'));
      try { console.debug('startupChecks: pdfjsLib workerSrc=' + (window.pdfjsLib && pdfjsLib.GlobalWorkerOptions && pdfjsLib.GlobalWorkerOptions.workerSrc ? pdfjsLib.GlobalWorkerOptions.workerSrc : 'none')); } catch (e) { console.debug('startupChecks: pdfjsLib workerSrc access failed', e); }
      const mergeForm = document.getElementById('merge-form');
      const customForm = document.getElementById('custom-merge-form');
      console.debug('startupChecks: mergeForm=' + !!mergeForm + ' customForm=' + !!customForm);
      console.debug('startupChecks: detectBtn=' + !!document.getElementById('detect-generate') + ' applyBtn=' + !!document.getElementById('apply-generated') + ' resetBtn=' + !!document.getElementById('reset-generated'));
    }

    startupChecks();
    setTimeout(startupChecks, 1000);

    let attempts = 0;
    const maxAttempts = 12;
    const interval = setInterval(() => {
      attempts++;
      console.debug('binder attempt', attempts);
      const detectBtn = document.getElementById('detect-generate');
      const applyBtn = document.getElementById('apply-generated');
      const resetBtn = document.getElementById('reset-generated');

      function attachTempClick(b, name) {
        if (!b) return false;
        if (b.dataset.tempBound === '1') return true;
        b.addEventListener('click', function tempDiag(e) {
          console.debug(name + ' temp click handler fired');
          try { showAlert(name + ' clicked (temp handler)', 'info', 1500); } catch (e) { console.debug('showAlert not available', e); }
        });
        b.dataset.tempBound = '1';
        return true;
      }

      const d = attachTempClick(detectBtn, 'Detect');
      const a = attachTempClick(applyBtn, 'Apply');
      const r = attachTempClick(resetBtn, 'Reset');

      if ((d || a || r) && (d && a && r)) {
        console.debug('All buttons found and temp handlers attached');
        clearInterval(interval);
      } else if (attempts >= maxAttempts) {
        console.warn('Button binder timed out; buttons missing or blocked after', attempts, 'attempts');
        clearInterval(interval);
      }
    }, 500);
  } catch (e) {
    console.error('startupDiagnostics failed', e);
  }
})();

window.addEventListener('error', function (e) {
  try { console.error('Window error:', e.error || e.message || e); showAlert('Client error: ' + (e && e.message ? e.message : String(e)), 'danger', 7000); } catch (err) { console.error('error handler failed', err); }
});
window.addEventListener('unhandledrejection', function (e) {
  try { console.error('Unhandled promise rejection:', e.reason); showAlert('Unhandled rejection: ' + (e && e.reason && e.reason.message ? e.reason.message : String(e.reason)), 'danger', 7000); } catch (err) { console.error('rejection handler failed', err); }
});


// Fallback dropdown handler: toggles Merge Mode dropdown if Bootstrap's JS isn't initialized
(function attachDropdownFallback() {
  function bootstrapHasDropdown() {
    try {
      return typeof window.jQuery !== 'undefined' && window.jQuery && typeof window.jQuery.fn !== 'undefined' && typeof window.jQuery.fn.dropdown === 'function';
    } catch (e) {
      return false;
    }
  }

  function init() {
    try {
      if (bootstrapHasDropdown()) {
        console.debug('Bootstrap dropdown detected, skipping fallback handler');
        return;
      }

      console.debug('Attaching dropdown fallback handler');
      const toggles = document.querySelectorAll('.nav-link.dropdown-toggle');
      toggles.forEach(function (t) {
        // avoid attaching twice
        if (t.dataset.fallbackAttached) return;
        t.dataset.fallbackAttached = '1';
        t.addEventListener('click', function (e) {
          e.preventDefault();
          console.debug('Dropdown toggle clicked (fallback)');
          const parent = t.closest('.dropdown');
          if (!parent) return;
          const menu = parent.querySelector('.dropdown-menu');
          if (!menu) return;
          const isShown = menu.classList.contains('show');
          // close any other open dropdowns
          document.querySelectorAll('.dropdown-menu.show').forEach(function (m) {
            m.classList.remove('show');
            const p = m.closest('.dropdown');
            if (p) p.classList.remove('show');
          });
          if (!isShown) {
            menu.classList.add('show');
            parent.classList.add('show');
          } else {
            menu.classList.remove('show');
            parent.classList.remove('show');
          }
        });
      });

      // close dropdowns when clicking outside
      document.addEventListener('click', function (e) {
        if (!e.target.closest('.dropdown')) {
          document.querySelectorAll('.dropdown-menu.show').forEach(function (m) {
            m.classList.remove('show');
            const p = m.closest('.dropdown');
            if (p) p.classList.remove('show');
          });
        }
      });
    } catch (err) {
      console.warn('Dropdown fallback failed', err);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

// Intercept form submits and fetch merged PDF so we can show an in-page alert (useful for mobile)
function showAlert(message, type = 'success', timeout = 5000) {
  try {
    const container = document.getElementById('alerts') || document.body;
    const id = 'alert-' + Date.now();
    const div = document.createElement('div');
    div.id = id;
    div.className = `alert alert-${type} alert-dismissible fade show`;
    div.setAttribute('role', 'alert');
    div.innerHTML = `${message} <button type="button" class="close" data-dismiss="alert" aria-label="Close"><span aria-hidden="true">&times;</span></button>`;
    container.insertBefore(div, container.firstChild);
    setTimeout(() => {
      try { if (div && div.parentNode) div.parentNode.removeChild(div); } catch (e) {}
    }, timeout);
  } catch (e) {
    console.warn('showAlert failed', e);
  }
}

async function downloadBlob(blob, filename) {
  // Prefer the File System Access API to write directly and confirm completion
  if (typeof window.showSaveFilePicker === 'function') {
    try {
      const opts = {
        suggestedName: filename || 'merged.pdf',
        types: [
          {
            description: 'PDF Document',
            accept: { 'application/pdf': ['.pdf'] },
          },
        ],
      };
      const handle = await window.showSaveFilePicker(opts);
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      showAlert('File downloaded', 'success');
      return;
    } catch (err) {
      console.warn('showSaveFilePicker failed, falling back to anchor download', err);
      // fall through to anchor fallback
    }
  }

  // Fallback for browsers without showSaveFilePicker
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || 'merged.pdf';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => window.URL.revokeObjectURL(url), 1500);
  showAlert('Download started', 'success');
} 

async function submitFormFetch(form, url) {
  const submitBtn = form.querySelector('button[type="submit"]');
  let orig = null;
  if (submitBtn) {
    orig = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = 'Processing...';
  }

  try {
    const formData = new FormData(form);
    const resp = await fetch(url, { method: 'POST', body: formData });
    if (!resp.ok) {
      const text = await resp.text().catch(() => '');
      showAlert('Merge failed: ' + (text || resp.status), 'danger');
      return;
    }
    const blob = await resp.blob();
    // try to extract filename from Content-Disposition
    const cd = resp.headers.get('Content-Disposition') || '';
    let filename = 'merged.pdf';
    const m = /filename\*=UTF-8''(.+)$/.exec(cd);
    if (m) filename = decodeURIComponent(m[1]);
    else {
      const m2 = /filename="?([^\"]+)"?/.exec(cd);
      if (m2) filename = m2[1];
    }

    await downloadBlob(blob, filename);
  } catch (err) {
    console.error('submitFormFetch error', err);
    showAlert('Merge failed: ' + (err && err.message ? err.message : err), 'danger');
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = orig;
    }
  }
}

// Merged dropdown generator: detect total pages and create position dropdowns
function validateOrderFormat(str) {
  if (!str) return true;
  const tokens = str.split(',').map(s=>s.trim()).filter(Boolean);
  if (!tokens.length) return false;
  const re = /^(?:(?:pdf)?\d+|[\w\-. ]+)\s*:\s*\d+$/i;
  return tokens.every(t => re.test(t));
}

async function getPdfPageCount(file) {
  if (!file) return 0;
  if (typeof pdfjsLib === 'undefined') throw new Error('PDF.js not loaded');
  const ab = await file.arrayBuffer();
  const loading = pdfjsLib.getDocument({data: ab});
  const pdf = await loading.promise;
  return pdf.numPages;
}

async function detectMergedPages(form) {
  const fileInputs = Array.from(form.querySelectorAll('input[type="file"]')).filter(i => /^pdf\d+$/.test(i.name));
  const uploaded = fileInputs.filter(i => i.files && i.files.length > 0);
  const counts = [];
  for (const fi of uploaded) {
    try {
      // If user provided pages1/pages2, prefer those selections instead of full PDF page count
      const pagesInputName = fi.name === 'pdf1' ? 'pages1' : fi.name === 'pdf2' ? 'pages2' : null;
      const pagesInputEl = pagesInputName ? form.querySelector('input[name="' + pagesInputName + '"]') : null;
      const pagesSpec = pagesInputEl ? (pagesInputEl.value || '').trim() : '';

      if (pagesSpec) {
        const pagesList = parsePagesSpec(pagesSpec);
        if (!Array.isArray(pagesList) || pagesList.length === 0) {
          throw new Error('Invalid pages specification for ' + fi.name + ': ' + pagesSpec);
        }
        // validate against real PDF page count if possible
        try {
          const actual = await getPdfPageCount(fi.files[0]);
          const oob = pagesList.filter(p => p < 1 || p > actual);
          if (oob.length) {
            showAlert('Some selected pages for ' + fi.name + ' are out of range (1–' + actual + '): ' + oob.join(', '), 'warning', 6000);
            // clamp to valid pages
            const valid = pagesList.filter(p => p >= 1 && p <= actual);
            counts.push({ name: fi.name, filename: fi.files[0].name, pages: valid.length, pagesList: valid });
          } else {
            counts.push({ name: fi.name, filename: fi.files[0].name, pages: pagesList.length, pagesList });
          }
        } catch (e) {
          // PDF.js unavailable to validate; still use provided pages but warn
          console.debug('Could not validate pages for', fi.name, e);
          showAlert('Using provided pages for ' + fi.name + ' but could not validate against PDF (PDF.js load issue).', 'warning', 5000);
          counts.push({ name: fi.name, filename: fi.files[0].name, pages: pagesList.length, pagesList });
        }
      } else {
        const n = await getPdfPageCount(fi.files[0]);
        counts.push({ name: fi.name, filename: fi.files[0].name, pages: n, pagesList: Array.from({ length: n }, (_, i) => i + 1) });
      }
    } catch (e) {
      console.warn('detectMergedPages failed for', fi.name, e);
      throw e;
    }
  }
  return counts;
}

function generateMergedSelectors(counts) {
  const total = counts.reduce((s,c)=>s + c.pages, 0);
  const container = document.getElementById('merged-position-selectors');
  const countEl = document.getElementById('merged-pages-count');
  container.innerHTML = '';
  countEl.textContent = total;
  if (total === 0) { container.style.display='none'; return null; }
  if (total > 1000) { showAlert('Too many pages ('+total+') to generate dropdowns. Narrow selection.', 'warning', 6000); return null; }

  // build options list (respect pagesList when provided)
  const options = [];
  counts.forEach(c => {
    const pagesArr = Array.isArray(c.pagesList) && c.pagesList.length ? c.pagesList : Array.from({ length: c.pages }, (_, i) => i + 1);
    pagesArr.forEach(p => options.push({ value: `${c.name}:${p}`, label: `${c.filename}:${p}` }));
  });

  const selects = [];
  for (let pos = 1; pos <= total; pos++) {
    const row = document.createElement('div'); row.className='mb-2 d-flex align-items-center';
    const label = document.createElement('div'); label.style.minWidth='95px'; label.className='mr-2'; label.textContent=`Position ${pos}`;
    const sel = document.createElement('select'); sel.className='form-control form-control-sm'; sel.style.maxWidth='100%';
    options.forEach(opt => { const o = document.createElement('option'); o.value = opt.value; o.textContent = opt.label; sel.appendChild(o); });
    sel.addEventListener('change', ()=>{
      const chosen = new Set(Array.from(container.querySelectorAll('select')).map(s=>s.value));
      Array.from(container.querySelectorAll('select')).forEach(s=>{
        Array.from(s.options).forEach(o=>{ o.disabled = (o.value !== s.value) && chosen.has(o.value); });
      });
    });
    row.appendChild(label); row.appendChild(sel); container.appendChild(row); selects.push(sel);
  }

  container.style.display='block';
  return selects;
}

async function detectAndGenerate(form) {
  try {
    console.debug('detectAndGenerate: starting');
    if (typeof pdfjsLib === 'undefined') { showAlert('PDF.js not loaded; cannot detect page counts automatically.', 'danger'); return; }
    const countEl = document.getElementById('merged-pages-count');
    if (countEl) countEl.textContent = 'detecting...';
    const counts = await detectMergedPages(form);
    if (!counts || counts.length === 0) {
      if (countEl) countEl.textContent = '—';
      showAlert('No PDF files uploaded to detect. Please upload pdf1 and pdf2.', 'warning', 5000);
      console.debug('detectAndGenerate: no uploaded files');
      return;
    }
    console.debug('detectAndGenerate: detected counts', counts);
    const selects = generateMergedSelectors(counts);
    const container = document.getElementById('merged-position-selectors');
    container._selects = selects;
    container._counts = counts;
    console.debug('detectAndGenerate: generated', selects ? selects.length : 0, 'selects');
  } catch (err) {
    console.error('detectAndGenerate error', err);
    showAlert('Failed to detect PDF pages: ' + (err && err.message ? err.message : err), 'danger');
    const countEl = document.getElementById('merged-pages-count');
    if (countEl) countEl.textContent = '—';
  }
}

function applyGeneratedOrder() {
  try {
    console.debug('applyGeneratedOrder: start');
    const container = document.getElementById('merged-position-selectors');
    if (!container || !container._selects || !container._selects.length) { showAlert('Nothing generated to apply', 'warning'); return; }
    const vals = container._selects.map(s=>s.value);
    const orderInput = document.querySelector('input[name="order"]');
    if (!orderInput) { showAlert('Order input not found', 'danger'); return; }
    // validate values exist and are non-empty
    if (vals.some(v => !v)) { showAlert('Please select source pages for all positions before applying.', 'warning'); return; }
    orderInput.value = vals.join(',');
    showAlert('Applied generated order to Global Order field', 'success', 2500);
    console.debug('applyGeneratedOrder: applied', vals.length, 'entries');
  } catch (err) {
    console.error('applyGeneratedOrder error', err);
    showAlert('Failed to apply generated order: ' + (err && err.message ? err.message : err), 'danger');
  }
}

function resetGenerated() {
  try {
    console.debug('resetGenerated: start');
    const container = document.getElementById('merged-position-selectors');
    if (!container) return;
    container.innerHTML = '';
    container.style.display = 'none';
    document.getElementById('merged-pages-count').textContent = '—';
    const applyBtn = document.getElementById('apply-generated');
    const resetBtn = document.getElementById('reset-generated');
    if (applyBtn) applyBtn.disabled = true;
    if (resetBtn) resetBtn.disabled = true;
    console.debug('resetGenerated: done');
  } catch (err) {
    console.error('resetGenerated error', err);
    showAlert('Failed to reset generated selectors', 'danger');
  }
}


function initMainHandlers() {
  console.debug('initMainHandlers start');
  try {
    const mergeForm = document.getElementById('merge-form');
    if (mergeForm) {
      mergeForm.addEventListener('submit', function (e) {
        e.preventDefault();
        submitFormFetch(mergeForm, '/merge');
      });
    }

    const customForm = document.getElementById('custom-merge-form');
    if (customForm) {
      customForm.addEventListener('submit', function (e) {
        e.preventDefault();
        try {
          const orderInput = customForm.querySelector('input[name="order"]');
          const orderVal = orderInput ? orderInput.value.trim() : '';
          if (orderVal && !validateOrderFormat(orderVal)) {
            showAlert('Invalid order format. Example: pdf1:1,pdf2:3,pdf1:2', 'warning', 4000);
            return;
          }
        } catch (err) {
          console.warn('Order validation failed', err);
          showAlert('Order validation failed', 'danger', 3000);
          return;
        }
        submitFormFetch(customForm, '/custom-merge');
      });

      // wire detect/apply/reset buttons and auto-detect on file changes
      const detectBtn = document.getElementById('detect-generate');
      const applyBtn = document.getElementById('apply-generated');
      const resetBtn = document.getElementById('reset-generated');
      if (applyBtn) applyBtn.disabled = true;
      if (resetBtn) resetBtn.disabled = true;

      let detectTimer = null;
      const fileInputs = Array.from(customForm.querySelectorAll('input[type="file"]')).filter(i => /^pdf\d+$/.test(i.name));
      fileInputs.forEach(fi => {
        fi.addEventListener('change', function () {
          if (detectTimer) clearTimeout(detectTimer);
          detectTimer = setTimeout(() => {
            detectAndGenerate(customForm);
            if (applyBtn) applyBtn.disabled = false;
            if (resetBtn) resetBtn.disabled = false;
          }, 500);
        });
      });

      if (detectBtn) {
        console.debug('Binding detect button');
        detectBtn.addEventListener('click', async function () {
          try {
            console.debug('detectBtn clicked');
            detectBtn.disabled = true;
            showAlert('Detecting pages...', 'info', 2000);
            await detectAndGenerate(customForm);
            showAlert('Detection finished', 'success', 1500);
            if (applyBtn) applyBtn.disabled = false;
            if (resetBtn) resetBtn.disabled = false;
          } catch (err) {
            console.error('detectBtn handler error', err);
            showAlert('Detection failed: ' + (err && err.message ? err.message : err), 'danger');
          } finally {
            detectBtn.disabled = false;
          }
        });
      }

      if (applyBtn) {
        console.debug('Binding apply button');
        applyBtn.addEventListener('click', function () {
          try {
            console.debug('applyBtn clicked');
            applyGeneratedOrder();
          } catch (err) {
            console.error('applyBtn handler error', err);
            showAlert('Apply failed: ' + (err && err.message ? err.message : err), 'danger');
          }
        });
      }

      if (resetBtn) {
        console.debug('Binding reset button');
        resetBtn.addEventListener('click', function () {
          try {
            console.debug('resetBtn clicked');
            resetGenerated();
          } catch (err) {
            console.error('resetBtn handler error', err);
            showAlert('Reset failed: ' + (err && err.message ? err.message : err), 'danger');
          }
        });
      }
    }
  } catch (err) {
    console.warn('Form intercept setup failed', err);
  }
}

// Ensure handlers run even if script was loaded after DOMContentLoaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initMainHandlers);
} else {
  console.debug('Document already loaded; running initMainHandlers immediately');
  initMainHandlers();
}

