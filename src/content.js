(() => {
  const UNDO_KEY = 'jumpinto-last-snapshot';
  let ctx = null;
  let busy = false;

  const el = (tag, props = {}, children = []) => {
    const node = Object.assign(document.createElement(tag), props);
    for (const c of children) node.append(c);
    return node;
  };

  const panel = el('div', { className: 'jp-reset-panel' });
  const status = el('div', { className: 'jp-reset-status' });
  const buttons = el('div', { className: 'jp-reset-buttons' });
  const title = el('div', { className: 'jp-reset-title', textContent: 'Answer reset' });
  const toggle = el('button', { className: 'jp-reset-toggle', textContent: '–' });

  function setStatus(text, kind = '') {
    status.textContent = text;
    status.className = 'jp-reset-status ' + kind;
  }

  function setBusy(value) {
    busy = value;
    for (const b of buttons.querySelectorAll('button')) b.disabled = value;
  }

  async function apply(mode, scope) {
    const parts = scope === 'part' ? [ctx.taskPart] : ctx.taskParts;
    const label = mode === 'clear' ? 'Clear' : 'Randomize';
    const where =
      scope === 'part'
        ? `${ctx.testPart} part ${ctx.taskPart}`
        : `all ${ctx.taskParts.length} ${ctx.testPart} parts`;

    if (!confirm(`${label} your saved answers for ${where}?\n\nThis overwrites them on the server. Use "Undo last" to put them back.`)) {
      return;
    }

    setBusy(true);
    const snapshot = { ts: Date.now(), ctx, parts: [] };

    try {
      for (const part of parts) {
        setStatus(`Reading part ${part}…`);
        const [existing, blocks] = await Promise.all([
          JumpintoApi.getAnswers(ctx, part),
          JumpintoApi.getQuestions(ctx, part),
        ]);
        snapshot.parts.push({ taskPart: part, answers: existing || {} });

        const generated = JumpintoRandomize.buildAnswers(blocks, mode);
        const merged = Object.assign({}, existing, generated);

        setStatus(`Saving part ${part}…`);
        await JumpintoApi.putAnswers(ctx, part, merged);
      }

      await chrome.storage.local.set({ [UNDO_KEY]: snapshot });
      setStatus(`${label} done. Reloading…`, 'ok');
      setTimeout(() => location.reload(), 700);
    } catch (err) {
      setStatus(String(err.message || err), 'err');
      setBusy(false);
    }
  }

  async function undo() {
    const stored = await chrome.storage.local.get(UNDO_KEY);
    const snapshot = stored[UNDO_KEY];
    if (!snapshot) {
      setStatus('Nothing to undo.', 'err');
      return;
    }
    const sameTest =
      snapshot.ctx.seriesId === ctx.seriesId &&
      snapshot.ctx.testId === ctx.testId &&
      snapshot.ctx.testPart === ctx.testPart;
    if (!sameTest) {
      setStatus('Last change was on a different test.', 'err');
      return;
    }

    setBusy(true);
    try {
      for (const { taskPart, answers } of snapshot.parts) {
        setStatus(`Restoring part ${taskPart}…`);
        await JumpintoApi.putAnswers(ctx, taskPart, answers);
      }
      await chrome.storage.local.remove(UNDO_KEY);
      setStatus('Restored. Reloading…', 'ok');
      setTimeout(() => location.reload(), 700);
    } catch (err) {
      setStatus(String(err.message || err), 'err');
      setBusy(false);
    }
  }

  function render() {
    buttons.replaceChildren(
      el('button', {
        textContent: `Clear part ${ctx.taskPart}`,
        onclick: () => apply('clear', 'part'),
      }),
      el('button', {
        textContent: `Clear all ${ctx.testPart}`,
        onclick: () => apply('clear', 'section'),
      }),
      el('button', {
        textContent: `Randomize part ${ctx.taskPart}`,
        onclick: () => apply('random', 'part'),
      }),
      el('button', {
        textContent: `Randomize all ${ctx.testPart}`,
        onclick: () => apply('random', 'section'),
      }),
      el('button', { textContent: 'Undo last', className: 'jp-reset-undo', onclick: undo })
    );
    setStatus(`${ctx.seriesType} ${ctx.seriesId} · test ${ctx.testId} · ${ctx.testPart} ${ctx.taskPart}`);
  }

  function mount() {
    toggle.onclick = () => {
      panel.classList.toggle('jp-collapsed');
      toggle.textContent = panel.classList.contains('jp-collapsed') ? '+' : '–';
    };
    panel.append(el('div', { className: 'jp-reset-head' }, [title, toggle]), status, buttons);
    document.body.append(panel);
  }

  function sync() {
    const next = JumpintoApi.parseLocation();
    if (!next) {
      panel.style.display = 'none';
      return;
    }
    panel.style.display = '';
    ctx = next;
    if (!busy) render();
  }

  mount();
  sync();

  let lastPath = location.pathname;
  setInterval(() => {
    if (location.pathname !== lastPath) {
      lastPath = location.pathname;
      sync();
    }
  }, 500);
})();
