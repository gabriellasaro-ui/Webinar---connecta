/* ==========================================================================
   TRACE · Tracking base (padrao obrigatorio do sistema de LPs)
   Eventos: page_view automatico, click_cta, scroll_depth, lead_submit.
   Faz ponte com dataLayer / gtag / fbq quando existirem, sem quebrar sem eles.
   ========================================================================== */
(function (w, d) {
  'use strict';

  var STORE = 'trace_attrib';
  var UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'gclid', 'fbclid'];

  /* ---------------------------------------------- atribuicao / UTM ------ */
  function readAttribution() {
    var qs = new URLSearchParams(w.location.search);
    var fresh = {};
    UTM_KEYS.forEach(function (k) { if (qs.get(k)) fresh[k] = qs.get(k); });

    var saved = {};
    try { saved = JSON.parse(sessionStorage.getItem(STORE) || '{}'); } catch (e) { saved = {}; }

    /* a primeira origem da sessao manda, a menos que chegue UTM nova */
    var attrib = Object.keys(fresh).length ? fresh : saved;
    if (!attrib.referrer) attrib.referrer = d.referrer || 'direto';
    if (!attrib.landing) attrib.landing = w.location.pathname;

    try { sessionStorage.setItem(STORE, JSON.stringify(attrib)); } catch (e) { /* modo privado */ }
    return attrib;
  }

  var attribution = readAttribution();

  /* ------------------------------------------------------- dispatch ---- */
  function trackEvent(name, params) {
    var payload = Object.assign({}, attribution, params || {}, {
      event: name,
      page: w.location.pathname,
      ts: new Date().toISOString()
    });

    w.dataLayer = w.dataLayer || [];
    w.dataLayer.push(payload);

    if (typeof w.gtag === 'function') w.gtag('event', name, payload);
    if (typeof w.fbq === 'function') {
      var std = { click_cta: 'Contact', lead_submit: 'Lead' };
      if (std[name]) w.fbq('track', std[name], payload);
      else w.fbq('trackCustom', name, payload);
    }

    if (w.TRACE_DEBUG) console.log('[track]', name, payload);
    return payload;
  }

  /* CTA principal, exigido pelo padrao */
  function trackCTA(label) {
    return trackEvent('click_cta', { cta: label || 'principal' });
  }

  /* ------------------------------------------------- scroll depth ------ */
  function initScrollDepth() {
    var marks = [25, 50, 75, 100];
    var hit = {};

    function check() {
      var h = d.documentElement.scrollHeight - w.innerHeight;
      if (h <= 0) return;
      var pct = ((w.scrollY || w.pageYOffset) / h) * 100;
      marks.forEach(function (m) {
        if (pct >= m && !hit[m]) {
          hit[m] = true;
          trackEvent('scroll_depth', { depth: m });
        }
      });
    }
    w.addEventListener('scroll', check, { passive: true });
  }

  /* --------------------------------------------------------- boot ------ */
  function boot() {
    trackEvent('page_view');
    initScrollDepth();

    /* qualquer elemento com data-cta vira evento rastreado */
    d.addEventListener('click', function (e) {
      var el = e.target.closest ? e.target.closest('[data-cta]') : null;
      if (el) trackCTA(el.getAttribute('data-cta'));
    });
  }

  w.trackEvent = trackEvent;
  w.trackCTA = trackCTA;
  w.traceAttribution = attribution;

  if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', boot);
  else boot();
})(window, document);
