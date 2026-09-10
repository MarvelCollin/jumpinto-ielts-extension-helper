(() => {
  const decorated = new WeakSet();

  const el = (tag, props, children = []) => {
    const node = Object.assign(document.createElement(tag), props);
    for (const c of children) node.append(c);
    return node;
  };

  function contextFor(anchor) {
    const href = anchor.getAttribute('href');
    if (!href || href.indexOf('/ielts/practice/') === -1) return null;
    try {
      return JumpintoApi.parseLocation(new URL(href, location.origin).pathname);
    } catch (err) {
      return null;
    }
  }

  function makeButton(ctx, mode) {
    const label = mode === 'clear' ? 'Clear' : 'Random';
    const button = el('button', {
      className: 'jp-row-button',
      type: 'button',
      textContent: label,
      title: `${label === 'Clear' ? 'Clear' : 'Randomize'} all ${ctx.testPart} answers for ${JumpintoActions.describe(ctx)}`,
    });

    button.addEventListener('click', async (event) => {
      event.preventDefault();
      event.stopPropagation();

      const verb = mode === 'clear' ? 'Clear' : 'Randomize';
      const confirmed = confirm(
        `${verb} every ${ctx.testPart} answer for ${JumpintoActions.describe(ctx)}?\n\n` +
          `That is ${ctx.taskParts.length} parts. Open the test and use "Undo last" to put them back.`
      );
      if (!confirmed) return;

      const row = button.parentElement;
      for (const b of row.querySelectorAll('button')) b.disabled = true;
      button.textContent = '…';

      try {
        await JumpintoActions.apply(ctx, mode, ctx.taskParts, (text) => {
          button.title = text;
        });
        button.textContent = 'done';
        setTimeout(() => location.reload(), 600);
      } catch (err) {
        button.textContent = 'failed';
        button.title = String(err.message || err);
        for (const b of row.querySelectorAll('button')) b.disabled = false;
      }
    });

    return button;
  }

  function decorate() {
    for (const anchor of document.querySelectorAll('a[href*="/ielts/practice/"]')) {
      if (decorated.has(anchor)) continue;
      const ctx = contextFor(anchor);
      if (!ctx) continue;
      decorated.add(anchor);
      anchor.after(
        el('span', { className: 'jp-row-actions' }, [
          makeButton(ctx, 'clear'),
          makeButton(ctx, 'random'),
        ])
      );
    }
  }

  decorate();
  setInterval(decorate, 800);
})();
