(function() {
  var overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML =
    '<div class="modal-content">' +
      '<button class="modal-close" aria-label="Close">&times;</button>' +
      '<div class="modal-body"></div>' +
    '</div>';
  document.body.appendChild(overlay);

  var body = overlay.querySelector('.modal-body');
  var closeBtn = overlay.querySelector('.modal-close');

  function openModal(url) {
    body.innerHTML = '<p style="text-align:center;color:#94a3b8;padding:2rem 0;">Loading&hellip;</p>';
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
    fetch(url)
      .then(function(r) { return r.text(); })
      .then(function(html) {
        var doc = new DOMParser().parseFromString(html, 'text/html');
        var main = doc.querySelector('main');
        body.innerHTML = main ? main.innerHTML : '<p>Could not load content.</p>';
      })
      .catch(function() {
        body.innerHTML = '<p>Could not load content.</p>';
      });
  }

  function closeModal() {
    overlay.classList.remove('open');
    document.body.style.overflow = '';
  }

  closeBtn.addEventListener('click', closeModal);
  overlay.addEventListener('click', function(e) {
    if (e.target === overlay) closeModal();
  });
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') closeModal();
  });

  document.addEventListener('click', function(e) {
    var link = e.target.closest('a[data-modal]');
    if (link) {
      e.preventDefault();
      openModal(link.getAttribute('href'));
    }
  });
})();
