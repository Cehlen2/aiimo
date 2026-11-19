/* AIIMO motion: scroll reveals, count-up stats. Only runs when the head script added .motion
   (i.e. the visitor hasn't asked for reduced motion). Without JS everything is simply visible. */
(function () {
  window.__aiimoMotion = true;
  var root = document.documentElement;

  // A faint blue haze that follows the cursor across the graph paper (mouse and trackpad only).
  if (window.matchMedia && matchMedia('(hover: hover) and (pointer: fine)').matches) {
    var haze = document.createElement('div');
    haze.className = 'cursor-haze';
    haze.setAttribute('aria-hidden', 'true');
    document.body.appendChild(haze);
    var hx = 0, hy = 0, queued = false;
    function place() { haze.style.setProperty('--hx', hx + 'px'); haze.style.setProperty('--hy', hy + 'px'); queued = false; }
    document.addEventListener('pointermove', function (e) {
      hx = e.clientX; hy = e.clientY;
      haze.classList.add('on');
      if (!queued) { queued = true; requestAnimationFrame(place); }
    }, { passive: true });
    document.documentElement.addEventListener('pointerleave', function () { haze.classList.remove('on'); });
  }

  if (!root.classList.contains('motion')) return;

  var SELECTOR = [
    '.fig', 'h2', '.lede', '.prose', '.exhibit', '.step', '.flow > .arrow', '.grid3 .item',
    '.topic', '.person', '.event', '.stat', '.sample', '.faq details', '.talk-list li',
    '.mail .btns', '.carousel-head .arrows', '.empty > p', '.empty > .btns', '.sponsors .slot', '.sponsor-ask', '.logos .slot'
  ].map(function (s) { return 'main section:not(.hero):not(.page-head) ' + s; }).join(',');

  var items = Array.prototype.slice.call(document.querySelectorAll(SELECTOR));

  // Stagger siblings that share a parent, so rows of cards cascade in.
  var counts = new Map();
  items.forEach(function (el) {
    var n = counts.get(el.parentNode) || 0;
    counts.set(el.parentNode, n + 1);
    el.style.transitionDelay = Math.min(n, 6) * 80 + 'ms';
  });

  function countUp(stat) {
    var num = stat.querySelector('.num');
    if (!num || num.dataset.done) return;
    num.dataset.done = '1';
    var target = parseInt(num.textContent, 10);
    if (!target) return;
    var start = null, dur = 1100;
    num.textContent = '0';
    function frame(t) {
      if (start === null) start = t;
      var p = Math.min((t - start) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      num.textContent = Math.round(eased * target);
      if (p < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
    // Background tabs pause animation frames: make sure the real number always lands.
    setTimeout(function () { num.textContent = target; }, dur + 300);
  }

  function reveal(el) {
    el.classList.add('in');
    if (el.classList.contains('stat')) setTimeout(function () { countUp(el); }, parseInt(el.style.transitionDelay, 10) || 0);
  }

  if (!('IntersectionObserver' in window)) { items.forEach(reveal); return; }

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      // Reveal on entering view, and also anything already scrolled past (e.g. after a jump down the page).
      if (e.isIntersecting || e.boundingClientRect.top < 0) { reveal(e.target); io.unobserve(e.target); }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
  items.forEach(function (el) { io.observe(el); });

  // Safety net: if the observer hasn't run (e.g. a browser that isn't painting yet),
  // reveal anything already on screen or scrolled past after a few seconds.
  function sweep() {
    items.forEach(function (el) {
      if (!el.classList.contains('in') && el.getBoundingClientRect().top < window.innerHeight) { reveal(el); io.unobserve(el); }
    });
  }
  setTimeout(sweep, 3000);
  window.addEventListener('scroll', function () { clearTimeout(sweep.t); sweep.t = setTimeout(sweep, 1200); }, { passive: true });
})();
