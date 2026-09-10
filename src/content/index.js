(() => {
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
    const verb = mode === 'clear' ? 'Clear' : 'Randomize';
    const where =
      scope === 'part'
        ? `${ctx.testPart} part ${ctx.taskPart}`
        : `all ${ctx.taskParts.length} ${ctx.testPart} parts`;

    if (!confirm(`${verb} your saved answers for ${where}?\n\nThis overwrites them on the server. Use "Undo last" to put them back.`)) {
      return;
    }

    setBusy(true);
    try {
      await JumpintoActions.apply(ctx, mode, parts, setStatus);
      setStatus(`${verb} done. Reloading…`, 'ok');
      setTimeout(() => location.reload(), 700);
    } catch (err) {
      setStatus(String(err.message || err), 'err');
      setBusy(false);
    }
  }

  async function undo() {
    setBusy(true);
    try {
      await JumpintoActions.undo(ctx, setStatus);
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
