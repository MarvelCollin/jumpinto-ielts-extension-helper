(() => {
  const MAX_PER_GROUP = 40;
  const trunc = (s, n = 120) =>
    s == null ? null : String(s).length > n ? String(s).slice(0, n) + '…' : String(s);

  const describe = (el) => ({
    tag: el.tagName.toLowerCase(),
    type: el.type || null,
    name: el.name || null,
    id: el.id || null,
    cls: trunc(el.className, 160),
    value: trunc(el.value),
    checked: 'checked' in el ? el.checked : undefined,
    selectedIndex: el.tagName === 'SELECT' ? el.selectedIndex : undefined,
    options: el.tagName === 'SELECT'
      ? [...el.options].slice(0, 10).map((o) => ({ v: o.value, t: trunc(o.text, 40) }))
      : undefined,
    disabled: el.disabled || undefined,
    data: Object.fromEntries(
      [...el.attributes]
        .filter((a) => a.name.startsWith('data-') || a.name.startsWith('aria-'))
        .map((a) => [a.name, trunc(a.value, 60)])
    ),
    path: (() => {
      const parts = [];
      let n = el;
      for (let i = 0; n && n.nodeType === 1 && i < 4; i++, n = n.parentElement) {
        parts.unshift(
          n.tagName.toLowerCase() +
            (n.id ? '#' + n.id : '') +
            (n.className && typeof n.className === 'string'
              ? '.' + n.className.trim().split(/\s+/).slice(0, 3).join('.')
              : '')
        );
      }
      return parts.join(' > ');
    })(),
  });

  const scan = (root, label) => {
    const controls = [...root.querySelectorAll('input, textarea, select')];
    const editable = [...root.querySelectorAll('[contenteditable=""], [contenteditable="true"]')];

    const groups = {};
    for (const el of controls) {
      if (el.type === 'radio' || el.type === 'checkbox') {
        const k = el.name || '(no-name)';
        (groups[k] ||= []).push({ value: el.value, checked: el.checked, id: el.id });
      }
    }

    return {
      frame: label,
      url: root === document ? location.href : '(iframe)',
      counts: {
        text: controls.filter((e) => ['text', 'search', ''].includes(e.type)).length,
        radio: controls.filter((e) => e.type === 'radio').length,
        checkbox: controls.filter((e) => e.type === 'checkbox').length,
        select: controls.filter((e) => e.tagName === 'SELECT').length,
        textarea: controls.filter((e) => e.tagName === 'TEXTAREA').length,
        contenteditable: editable.length,
        draggable: root.querySelectorAll('[draggable="true"]').length,
      },
      radioCheckboxGroups: Object.fromEntries(
        Object.entries(groups).slice(0, MAX_PER_GROUP)
      ),
      controls: controls.slice(0, MAX_PER_GROUP).map(describe),
      editableSamples: editable.slice(0, 10).map((el) => ({
        cls: trunc(el.className, 160),
        data: Object.fromEntries(
          [...el.attributes].filter((a) => a.name.startsWith('data-')).map((a) => [a.name, trunc(a.value, 60)])
        ),
        text: trunc(el.innerText, 80),
      })),
    };
  };

  const report = {
    _: 'jumpinto-recon-v1',
    href: location.href,
    title: document.title,

    framework: {
      react: !!(document.querySelector('#__next, [data-reactroot]') ||
        [...document.querySelectorAll('*')].slice(0, 300).some((e) =>
          Object.keys(e).some((k) => k.startsWith('__react')))),
      nextData: !!window.__NEXT_DATA__,
      nuxt: !!window.__NUXT__,
      vue: !!window.__VUE__ || !!document.querySelector('[data-v-app]'),
      angular: !!window.ng || !!document.querySelector('[ng-version]'),
      livewire: !!window.Livewire,
      inertia: !!document.querySelector('[data-page]'),
      alpine: !!window.Alpine,
      jquery: !!window.jQuery && window.jQuery.fn && window.jQuery.fn.jquery,
    },

    nextDataKeys: window.__NEXT_DATA__?.props
      ? Object.keys(window.__NEXT_DATA__.props?.pageProps || window.__NEXT_DATA__.props)
      : null,

    storage: {
      localStorage: Object.keys(localStorage).map((k) => ({
        key: k,
        len: localStorage.getItem(k)?.length,
        preview: trunc(localStorage.getItem(k), 150),
      })),
      sessionStorage: Object.keys(sessionStorage).map((k) => ({
        key: k,
        len: sessionStorage.getItem(k)?.length,
        preview: trunc(sessionStorage.getItem(k), 150),
      })),
    },

    cookieNames: document.cookie.split(';').map((c) => c.split('=')[0].trim()).filter(Boolean),

    iframes: [...document.querySelectorAll('iframe')].map((f) => ({
      src: trunc(f.src, 160),
      sameOrigin: (() => { try { return !!f.contentDocument; } catch { return false; } })(),
    })),

    shadowRoots: [...document.querySelectorAll('*')].filter((e) => e.shadowRoot).length,

    scripts: [...document.querySelectorAll('script[src]')]
      .map((s) => trunc(s.src, 160))
      .filter((s) => !/gtag|googletag|analytics|facebook|hotjar|clarity|recaptcha/i.test(s))
      .slice(0, 25),

    buttons: [...document.querySelectorAll('button, [role="button"], input[type="submit"]')]
      .slice(0, 40)
      .map((b) => ({
        text: trunc(b.innerText || b.value, 40),
        cls: trunc(b.className, 100),
        type: b.type || null,
      })),

    frames: [scan(document, 'top')],
  };

  for (const f of document.querySelectorAll('iframe')) {
    try {
      if (f.contentDocument) report.frames.push(scan(f.contentDocument, trunc(f.src, 80)));
    } catch { }
  }

  const json = JSON.stringify(report, null, 2);
  console.log(json);
  try { copy(json); console.log('%c✅ Copied to clipboard.', 'color:#0a0;font-size:14px'); }
  catch { console.log('%c⚠️ Could not auto-copy — select the JSON above and copy it.', 'color:#c60'); }
  return report;
})();
