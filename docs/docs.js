/* Sertone Docs — TOC scroll spy + mobile nav toggle */

(function () {
  'use strict';

  // Mobile nav toggle
  var toggle = document.querySelector('.mobile-nav-toggle');
  var nav = document.querySelector('.docs-nav');
  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      nav.classList.toggle('open');
    });
    // Close on nav link click (mobile)
    nav.querySelectorAll('.nav-link').forEach(function (link) {
      link.addEventListener('click', function () {
        nav.classList.remove('open');
      });
    });
  }

  // TOC scroll spy
  var tocLinks = document.querySelectorAll('.toc-link[href^="#"]');
  if (tocLinks.length === 0) return;

  var headings = [];
  tocLinks.forEach(function (link) {
    var id = link.getAttribute('href').slice(1);
    var el = document.getElementById(id);
    if (el) headings.push({ el: el, link: link });
  });

  function updateActive() {
    var scrollY = window.scrollY + 80;
    var current = null;
    for (var i = 0; i < headings.length; i++) {
      if (headings[i].el.offsetTop <= scrollY) {
        current = headings[i];
      }
    }
    tocLinks.forEach(function (link) {
      link.removeAttribute('data-active');
      link.classList.remove('active');
    });
    if (current) {
      current.link.setAttribute('data-active', 'true');
      current.link.classList.add('active');
    }
  }

  window.addEventListener('scroll', updateActive, { passive: true });
  updateActive();
})();
