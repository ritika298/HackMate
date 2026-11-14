/* HackMate — about-me.js (pages/about-me.html)
 * Public page, no data is read or written. */
(function (HM) {
  'use strict';

  HM.initPage('about-me');

  /* Logged-out visitors: swap the account menu for Log in / Sign up. */
  if (HM.api) {
    HM.api.getCurrentUser().then((u) => {
      if (u) return;
      const actions = HM.$('.nav-actions');
      if (actions) {
        actions.innerHTML = `<a class="btn btn-ghost" href="${HM.pageUrl('login.html')}">Log in</a>` +
                            `<a class="btn btn-primary" href="${HM.pageUrl('signup.html')}">Sign up</a>`;
      }
    }).catch(() => {});
  }

  /* If the photo file is missing, show the placeholder instead of a broken image. */
  const img = HM.$('#mePhoto');
  const fallback = HM.$('#mePhotoFallback');
  function showFallback() { img.hidden = true; fallback.hidden = false; }
  if (img) {
    img.addEventListener('error', showFallback);
    if (img.complete && img.naturalWidth === 0) showFallback();
  }

  /* Gentle fade-in on scroll. */
  const items = HM.$$('.reveal');
  if ('IntersectionObserver' in window && items.length) {
    document.body.classList.add('me-anim');
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, { threshold: 0.12 });
    items.forEach((el) => io.observe(el));
  }
})(window.HM);
