(() => {
  if (window.__jumpintoDump) { console.log('Already installed. Use __jumpintoDump().'); return; }

  const log = [];
  const IGNORE = /gtag|google-analytics|googletagmanager|doubleclick|facebook|hotjar|clarity|sentry|datadog|intercom|\.(png|jpe?g|gif|svg|webp|woff2?|css|ico)(\?|$)/i;
  const trunc = (s, n = 2000) =>
    s == null ? null : String(s).length > n ? String(s).slice(0, n) + `…[+${String(s).length - n} chars]` : String(s);

  const record = (entry) => {
    if (IGNORE.test(entry.url)) return;
    log.push(entry);
    console.log(`%c[${entry.method}] ${entry.url}`, 'color:#09c', entry.reqBody || '');
  };

  const origFetch = window.fetch;
  window.fetch = async function (...args) {
    const [input, init = {}] = args;
    const url = typeof input === 'string' ? input : input?.url;
    const method = (init.method || (typeof input === 'object' && input?.method) || 'GET').toUpperCase();
    let reqBody = null;
    try {
      if (init.body) {
        reqBody = init.body instanceof FormData
          ? Object.fromEntries([...init.body.entries()].map(([k, v]) => [k, trunc(v, 200)]))
          : trunc(init.body);
      }
    } catch {}
    const res = await origFetch.apply(this, args);
    let resBody = null;
    try { resBody = trunc(await res.clone().text(), 1200); } catch {}
    record({ via: 'fetch', method, url, status: res.status, reqBody, resBody, t: Date.now() });
    return res;
  };

  const origOpen = XMLHttpRequest.prototype.open;
  const origSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.open = function (method, url, ...rest) {
    this.__ji = { method: String(method).toUpperCase(), url: String(url) };
    return origOpen.call(this, method, url, ...rest);
  };
  XMLHttpRequest.prototype.send = function (body) {
    const meta = this.__ji || {};
    this.addEventListener('loadend', () => {
      let resBody = null;
      try { resBody = trunc(this.responseText, 1200); } catch {}
      record({ via: 'xhr', ...meta, status: this.status, reqBody: trunc(body), resBody, t: Date.now() });
    });
    return origSend.call(this, body);
  };

  const OrigWS = window.WebSocket;
  window.WebSocket = function (url, protocols) {
    const ws = new OrigWS(url, protocols);
    record({ via: 'ws-open', method: 'WS', url: String(url), t: Date.now() });
    const origWsSend = ws.send.bind(ws);
    ws.send = (d) => { record({ via: 'ws-send', method: 'WS', url: String(url), reqBody: trunc(d, 600), t: Date.now() }); return origWsSend(d); };
    ws.addEventListener('message', (e) => record({ via: 'ws-recv', method: 'WS', url: String(url), resBody: trunc(e.data, 600), t: Date.now() }));
    return ws;
  };
  window.WebSocket.prototype = OrigWS.prototype;

  window.__jumpintoStop = () => {
    window.fetch = origFetch;
    XMLHttpRequest.prototype.open = origOpen;
    XMLHttpRequest.prototype.send = origSend;
    window.WebSocket = OrigWS;
    console.log('Capture stopped.');
  };

  window.__jumpintoDump = () => {
    const json = JSON.stringify(log, null, 2);
    console.log(json);
    try { copy(json); console.log('%c✅ Copied to clipboard.', 'color:#0a0;font-size:14px'); } catch {}
    console.log('%c⚠️ SCAN BEFORE PASTING: strip any auth token / bearer / password field.', 'color:#c00;font-weight:bold');
    return log;
  };

  console.log('%c✅ Capture installed. Answer a question, change it, then run __jumpintoDump()',
    'color:#0a0;font-size:14px');
})();
