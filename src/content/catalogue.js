(() => {
  const mounted = new WeakSet();
  let openMenu = null;

  const el = (tag, props = {}, children = []) => {
    const node = Object.assign(document.createElement(tag), props);
    for (const c of children) node.append(c);
    return node;
  };

  const sectionLabel = { listening: 'Listening', reading: 'Reading' };

  function practiceAnchors() {
    const groups = new Map();
    for (const anchor of document.querySelectorAll('a[href*="/ielts/practice/"]')) {
      const href = anchor.getAttribute('href');
      if (!href) continue;
      let raw = null;
      try {
        raw = JumpintoApi.parsePath(new URL(href, location.origin).pathname);
      } catch (err) {
        raw = null;
      }
      if (!raw) continue;
      const key = [raw.seriesType, raw.seriesId, raw.testId].join('/');
      if (!groups.has(key)) groups.set(key, { raw, anchors: [], sections: new Map() });
      const group = groups.get(key);
      group.anchors.push(anchor);
      if (JumpintoApi.PARTS[raw.testPart] && !group.sections.has(raw.testPart)) {
        group.sections.set(raw.testPart, JumpintoApi.parseLocation(new URL(href, location.origin).pathname));
      }
    }
    return groups;
  }

  function cardFor(anchors) {
    let node = anchors[0].parentElement;
    while (node && node !== document.body && !anchors.every((a) => node.contains(a))) {
      node = node.parentElement;
    }
    return node && node !== document.body ? node : null;
  }

  function closeMenu() {
    if (openMenu) openMenu.remove();
    openMenu = null;
  }

  function runClear(trigger, contexts) {
    const names = contexts.map((c) => sectionLabel[c.testPart] || c.testPart).join(' and ');
    const parts = contexts.reduce((sum, c) => sum + c.taskParts.length, 0);
    const first = contexts[0];

    if (!confirm(`Clear every ${names} answer for IELTS ${first.seriesId} test ${first.testId}?\n\nThat is ${parts} parts. Open the test and use "Undo last" to put them back.`)) {
      return;
    }

    trigger.disabled = true;
    const label = trigger.textContent;
    trigger.textContent = 'Clearing';

    (async () => {
      try {
        for (const ctx of contexts) {
          await JumpintoActions.clear(ctx, ctx.taskParts, (text) => {
            trigger.title = `${sectionLabel[ctx.testPart] || ctx.testPart}: ${text}`;
          });
        }
        trigger.textContent = 'Cleared';
        setTimeout(() => location.reload(), 600);
      } catch (err) {
        trigger.textContent = label;
        trigger.title = String(err.message || err);
        trigger.disabled = false;
      }
    })();
  }

  function buildMenu(trigger, sections) {
    const menu = el('div', { className: 'jp-menu' });
    const contexts = [...sections.values()];

    for (const ctx of contexts) {
      menu.append(
        el('button', {
          className: 'jp-menu-item',
          type: 'button',
          textContent: `Clear ${sectionLabel[ctx.testPart] || ctx.testPart}`,
          onclick: () => {
            closeMenu();
            runClear(trigger, [ctx]);
          },
        })
      );
    }

    if (contexts.length > 1) {
      menu.append(
        el('button', {
          className: 'jp-menu-item jp-menu-strong',
          type: 'button',
          textContent: 'Clear whole test',
          onclick: () => {
            closeMenu();
            runClear(trigger, contexts);
          },
        })
      );
    }

    return menu;
  }

  function placeMenu(menu, trigger) {
    const box = trigger.getBoundingClientRect();
    menu.style.left = `${Math.min(box.left, window.innerWidth - 190)}px`;
    menu.style.top = `${box.bottom + 4}px`;
    menu.style.minWidth = `${Math.max(box.width, 160)}px`;
  }

  function mount(card, sections) {
    const trigger = el('button', {
      className: 'jp-card-button',
      type: 'button',
      textContent: 'Clear answers',
    });

    trigger.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (openMenu && openMenu.dataset.owner === trigger.dataset.id) {
        closeMenu();
        return;
      }
      closeMenu();
      const menu = buildMenu(trigger, sections);
      menu.dataset.owner = trigger.dataset.id;
      document.body.append(menu);
      placeMenu(menu, trigger);
      openMenu = menu;
    });

    trigger.dataset.id = String(Math.random()).slice(2);
    return el('div', { className: 'jp-card-actions' }, [trigger]);
  }

  function decorate() {
    for (const group of practiceAnchors().values()) {
      if (!group.sections.size) continue;
      const card = cardFor(group.anchors);
      if (!card || mounted.has(card)) continue;
      mounted.add(card);

      const anchor = group.anchors[group.anchors.length - 1];
      const row = anchor.parentElement === card ? anchor : anchor.parentElement;
      row.after(mount(card, group.sections));
    }
  }

  document.addEventListener('click', (event) => {
    if (openMenu && !openMenu.contains(event.target)) closeMenu();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeMenu();
  });
  window.addEventListener('scroll', closeMenu, true);
  window.addEventListener('resize', closeMenu);

  decorate();
  setInterval(decorate, 800);
})();
