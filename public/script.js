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
