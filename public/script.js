/*function parsePages(str) {
  const pages = [];
  str.split(',').forEach(part => {
    if (part.includes('-')) {
      const [start, end] = part.split('-').map(Number);
      for (let i = start; i <= end; i++) pages.push(i);
    } else {
      pages.push(Number(part));
    }
  });
  return pages;
}*/

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
    submitBtn.innerHTML = 'Processing';
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

document.addEventListener('DOMContentLoaded', function () {
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
        submitFormFetch(customForm, '/custom-merge');
      });
    }
  } catch (err) {
    console.warn('Form intercept setup failed', err);
  }
});
