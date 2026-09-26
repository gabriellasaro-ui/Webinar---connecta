/* ==========================================================================
   TRACE · Motion kit
   Scroll reveal, tilt 3D com holofote, nav, filtro de portfolio e formulario.
   Vanilla, sem dependencias. Carregar com defer.

   Todo trabalho por quadro passa por requestAnimationFrame e nenhuma leitura
   de layout (getBoundingClientRect) acontece dentro de listener de scroll.
   ========================================================================== */
(function () {
  'use strict';

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var coarse = window.matchMedia('(pointer: coarse)').matches;
  var $  = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  /* -------------------------------------------- 01. ENTRADA DA SECAO ----- */
  /* A secao inteira materializa antes do conteudo dela entrar em cascata.
     Observa mais cedo que os elementos (limiar menor) justamente para o
     bloco chegar primeiro e a cascata acontecer por cima dele.            */
  function initSectionReveal() {
    var secs = $$('[data-sec]');
    if (!secs.length) return;

    if (reduce || !('IntersectionObserver' in window)) {
      secs.forEach(function (el) { el.classList.add('is-in'); });
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        io.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -6% 0px', threshold: 0.02 });

    secs.forEach(function (el) { io.observe(el); });

    /* secao mais alta que a janela nunca cruza 2% estando so parcialmente
       visivel no reload; a varredura resolve esse caso e o do back/anchor */
    function sweep() {
      secs.forEach(function (el) {
        if (el.classList.contains('is-in')) return;
        var r = el.getBoundingClientRect();
        if (r.top < window.innerHeight * 0.94 && r.bottom > 0) {
          el.classList.add('is-in');
          io.unobserve(el);
        }
      });
    }

    sweep();
    window.addEventListener('load', sweep);
    setTimeout(sweep, 600);
    setTimeout(sweep, 1600);
  }

  /* ------------------------------------------------ 02. SCROLL REVEAL ---- */
  function initReveal() {
    var items = $$('[data-reveal], .reveal-lines');
    if (!items.length) return;

    if (reduce || !('IntersectionObserver' in window)) {
      items.forEach(function (el) { el.classList.add('is-in'); });
      return;
    }

    /* A cortina do data-reveal="mask" e uma mascara de gradiente. Ela
       precisa sair do caminho assim que a varredura termina, senao corta
       sombra e hover dos filhos para sempre. */
    function limparMascara(el) {
      el.style.webkitMaskImage = 'none';
      el.style.maskImage = 'none';
    }

    function soltarCortina(el) {
      if (el.getAttribute('data-reveal') !== 'mask') return;
      el.addEventListener('transitionend', function aoFim(ev) {
        if (ev.target !== el) return;
        if (ev.propertyName.indexOf('mask-position') === -1) return;
        limparMascara(el);
        el.removeEventListener('transitionend', aoFim);
      });
      /* rede de seguranca: se o transitionend nao vier (aba em segundo
         plano, transicao interrompida), a mascara cai no tempo previsto */
      setTimeout(function () { limparMascara(el); }, 3200);
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        soltarCortina(entry.target);
        entry.target.classList.add('is-in');
        io.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.1 });

    items.forEach(function (el) { io.observe(el); });

    /* Dois casos que o observer sozinho nao resolve:

       1. Pagina aberta com o scroll deslocado (reload no meio, botao voltar,
          link com ancora): o que ficou acima da viewport nunca entraria de
          novo e ficaria invisivel para sempre. Esses aparecem sem animacao,
          ja que o usuario nao viu a entrada.

       2. Quem nasce na faixa de baixo da primeira tela: a raiz do observer
          e encolhida em 10%, entao um elemento inteiro dentro desses 10%
          finais nunca cruza o limiar e some ate o primeiro scroll. Era o
          caso do botao principal do hero no celular. Esses entram animando,
          porque o usuario esta olhando para eles. */
    function sweepPassed() {
      var janela = window.innerHeight || document.documentElement.clientHeight;

      items.forEach(function (el) {
        if (el.classList.contains('is-in')) return;
        var r = el.getBoundingClientRect();

        if (r.bottom <= 0) {
          el.classList.add('is-in');
          el.style.webkitMaskImage = 'none';
          el.style.maskImage = 'none';
          io.unobserve(el);
        } else if (r.top < janela) {
          soltarCortina(el);
          el.classList.add('is-in');
          io.unobserve(el);
        }
      });
    }

    sweepPassed();
    window.addEventListener('load', sweepPassed);
    window.addEventListener('hashchange', function () { setTimeout(sweepPassed, 900); });
    /* fontes e imagens mudam a altura das secoes, entao repete depois */
    setTimeout(sweepPassed, 700);
    setTimeout(sweepPassed, 1800);
  }

  /* stagger automatico dentro de grupos marcados */
  function initStagger() {
    $$('[data-stagger]').forEach(function (group) {
      var step = parseFloat(group.dataset.stagger) || 0.09;
      $$('[data-reveal]', group).forEach(function (kid, i) {
        kid.style.setProperty('--d', (i * step).toFixed(2) + 's');
      });
    });

    $$('.reveal-lines').forEach(function (block) {
      $$('span', block).forEach(function (line, i) {
        var inner = line.querySelector('i');
        if (inner) inner.style.setProperty('--d', (i * 0.11).toFixed(2) + 's');
      });
    });
  }

  /* ------------------------------------------- 03. HOLOFOTE + TILT 3D ---- */
  function initCards() {
    if (coarse || reduce) return;

    $$('.card, .js-tilt').forEach(function (card) {
      var raf = null;
      var ultimo = null;

      function pintar() {
        raf = null;
        if (!ultimo) return;
        var r = card.getBoundingClientRect();
        var px = (ultimo.clientX - r.left) / r.width;
        var py = (ultimo.clientY - r.top) / r.height;

        card.style.setProperty('--mx', (px * 100).toFixed(1) + '%');
        card.style.setProperty('--my', (py * 100).toFixed(1) + '%');

        if (!card.hasAttribute('data-no-tilt')) {
          var rx = (0.5 - py) * 7;
          var ry = (px - 0.5) * 9;
          card.style.transform =
            'perspective(1000px) rotateX(' + rx.toFixed(2) + 'deg) rotateY(' +
            ry.toFixed(2) + 'deg) translate3d(0,-6px,0)';
        }
      }

      card.addEventListener('mousemove', function (e) {
        ultimo = { clientX: e.clientX, clientY: e.clientY };
        if (!raf) raf = requestAnimationFrame(pintar);
      });

      card.addEventListener('mouseleave', function () {
        if (raf) { cancelAnimationFrame(raf); raf = null; }
        ultimo = null;
        card.style.transform = '';
        card.style.removeProperty('--mx');
        card.style.removeProperty('--my');
      });
    });
  }

  /* ------------------------------------------------------- 04. HEADER --- */
  function initHeader() {
    var header = $('[data-header]');
    var toggle = $('[data-nav-toggle]');
    var menu   = $('[data-nav-menu]');
    if (!header) return;

    var raf = null;

    /* O cabecalho fica sempre a vista. Antes ele se recolhia ao descer e
       voltava ao subir; agora so troca de fundo quando sai do topo. */
    function pintar() {
      raf = null;
      header.classList.toggle('is-stuck', (window.scrollY || window.pageYOffset) > 40);
    }

    pintar();
    window.addEventListener('scroll', function () {
      if (!raf) raf = requestAnimationFrame(pintar);
    }, { passive: true });

    if (toggle && menu) {
      toggle.addEventListener('click', function () {
        var aberto = header.classList.toggle('is-open');
        toggle.setAttribute('aria-expanded', aberto ? 'true' : 'false');
        toggle.setAttribute('aria-label', aberto ? 'Fechar menu' : 'Abrir menu');
        document.body.classList.toggle('nav-aberta', aberto);
      });

      $$('a', menu).forEach(function (a) {
        a.addEventListener('click', function () {
          header.classList.remove('is-open');
          toggle.setAttribute('aria-expanded', 'false');
          toggle.setAttribute('aria-label', 'Abrir menu');
          document.body.classList.remove('nav-aberta');
        });
      });

      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && header.classList.contains('is-open')) toggle.click();
      });
    }
  }

  /* pilula ativa do menu conforme a secao visivel */
  function initSpy() {
    var links = $$('[data-spy]');
    if (!links.length || !('IntersectionObserver' in window)) return;

    var mapa = {};
    links.forEach(function (link) {
      var id = link.getAttribute('href');
      if (id && id.charAt(0) === '#' && document.getElementById(id.slice(1))) {
        mapa[id.slice(1)] = link;
      }
    });

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        links.forEach(function (l) { l.classList.remove('is-active'); });
        var link = mapa[entry.target.id];
        if (link) link.classList.add('is-active');
      });
    }, { rootMargin: '-45% 0px -50% 0px' });

    Object.keys(mapa).forEach(function (id) {
      io.observe(document.getElementById(id));
    });
  }

  /* ------------------------------------------- 05. PROGRESSO DO SCROLL -- */
  function initProgress() {
    var bar = $('[data-progress]');
    if (!bar) return;

    var raf = null;
    var altura = 0;

    function medir() { altura = document.documentElement.scrollHeight - window.innerHeight; }

    function pintar() {
      raf = null;
      var p = altura > 0 ? (window.scrollY || window.pageYOffset) / altura : 0;
      bar.style.transform = 'scaleX(' + Math.min(1, Math.max(0, p)).toFixed(4) + ')';
    }

    medir();
    pintar();
    window.addEventListener('scroll', function () {
      if (!raf) raf = requestAnimationFrame(pintar);
    }, { passive: true });
    window.addEventListener('resize', function () { medir(); pintar(); });
    window.addEventListener('load', medir);
  }

  /* --------------------------------------------- 06. FILTRO PORTFOLIO --- */
  function initFilter() {
    var tabs = $$('[data-filter]');
    var items = $$('[data-cat]');
    if (!tabs.length || !items.length) return;

    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        var cat = tab.dataset.filter;

        tabs.forEach(function (t) {
          var on = t === tab;
          t.classList.toggle('is-active', on);
          t.setAttribute('aria-pressed', on ? 'true' : 'false');
        });

        var mostrados = 0;
        items.forEach(function (item) {
          var exibir = cat === 'all' || item.dataset.cat === cat;
          item.classList.toggle('is-hidden', !exibir);
          item.classList.remove('is-pop');
          if (exibir) {
            item.style.setProperty('--d', (mostrados * 0.035).toFixed(3) + 's');
            mostrados++;
          }
        });

        if (!reduce) {
          void document.body.offsetWidth;
          items.forEach(function (item) {
            if (!item.classList.contains('is-hidden')) item.classList.add('is-pop');
          });
        }

        if (window.trackEvent) window.trackEvent('portfolio_filter', { categoria: cat });
      });
    });
  }

  /* ----------------------------------------------- 07. FORMULARIO ------- */
  function initForm() {
    var form = $('[data-lead-form]');
    if (!form) return;

    var status = $('[data-form-status]');
    var button = form.querySelector('button[type="submit"]');
    var label  = button ? button.querySelector('.btn__label') : null;
    var labelIdle = label ? label.textContent : '';

    function dizer(msg, tipo) {
      if (!status) return;
      status.textContent = msg;
      status.className = 'form__status is-' + tipo;
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();

      var dados = {};
      new FormData(form).forEach(function (v, k) { dados[k] = String(v).trim(); });

      if (!dados.nome || !dados.contato) {
        dizer('Preencha nome e contato para a gente falar com você.', 'error');
        return;
      }

      /* leva as UTMs junto, o time de midia agradece */
      var qs = new URLSearchParams(window.location.search);
      ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'].forEach(function (k) {
        if (qs.get(k)) dados[k] = qs.get(k);
      });
      dados.pagina = window.location.pathname;

      if (button) { button.disabled = true; if (label) label.textContent = 'Enviando...'; }
      dizer('Enviando seu briefing...', 'loading');

      fetch('/api/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dados)
      })
        .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, body: j }; }); })
        .then(function (res) {
          if (!res.ok || !res.body.ok) throw new Error(res.body.error || 'falha');
          form.reset();
          dizer('Recebido. Retornamos em até 1 dia útil.', 'ok');
          if (window.trackEvent) window.trackEvent('lead_submit', dados);
        })
        .catch(function () {
          dizer('Não consegui enviar agora. Chama a gente no WhatsApp que resolvemos na hora.', 'error');
        })
        .then(function () {
          if (button) { button.disabled = false; if (label) label.textContent = labelIdle; }
        });
    });
  }

  /* ---------------------------------------------------- 08. UTM NO CTA -- */
  /* Propaga parametros de campanha nos links de contato externos.          */
  function initUtmPassthrough() {
    var qs = window.location.search;
    if (!qs || qs.length < 2) return;

    $$('a[data-keep-utm]').forEach(function (a) {
      try {
        var url = new URL(a.href, window.location.origin);
        new URLSearchParams(qs).forEach(function (v, k) {
          if (k.indexOf('utm_') === 0 || k === 'gclid' || k === 'fbclid') {
            url.searchParams.set(k, v);
          }
        });
        a.href = url.toString();
      } catch (err) { /* link relativo estranho, ignora */ }
    });
  }

  /* ------------------------------------------------------- 09. BOOT ----- */
  function boot() {
    initStagger();
    initSectionReveal();
    initReveal();
    initCards();
    initHeader();
    initSpy();
    initProgress();
    initFilter();
    initForm();
    initUtmPassthrough();
    document.documentElement.classList.add('is-ready');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
