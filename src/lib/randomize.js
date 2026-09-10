const JumpintoRandomize = (() => {
  const WORDS = [
    'season', 'update', 'blog', 'captain', 'films', 'market', 'design', 'travel',
    'budget', 'weather', 'culture', 'transport', 'research', 'balance', 'signal',
  ];

  const ROMAN = [
    'i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix', 'x',
    'xi', 'xii', 'xiii', 'xiv', 'xv', 'xvi', 'xvii', 'xviii', 'xix', 'xx',
  ];

  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

  const letters = (n) =>
    Array.from({ length: Math.max(n, 1) }, (_, i) => String.fromCharCode(65 + i));

  function spanFor(range) {
    const from = String(range[0]);
    const to = String(range[1]);

    if (/^[ivxlcdm]+$/.test(from) && /^[ivxlcdm]+$/.test(to)) {
      const i = ROMAN.indexOf(from);
      const j = ROMAN.indexOf(to);
      if (i >= 0 && j >= i) return ROMAN.slice(i, j + 1);
      return null;
    }

    if (/^[A-Z]$/.test(from) && /^[A-Z]$/.test(to)) {
      const i = from.charCodeAt(0);
      const j = to.charCodeAt(0);
      if (j >= i) return Array.from({ length: j - i + 1 }, (_, k) => String.fromCharCode(i + k));
    }

    return null;
  }

  function pool(block, index) {
    const desc = block.desc || {};
    const body = block.body || {};

    for (const range of [desc.optionRange, desc.sectionRange]) {
      if (Array.isArray(range) && range.length === 2) {
        const span = spanFor(range);
        if (span) return span;
      }
    }

    const item = body.items && body.items[index];
    if (item && Array.isArray(item.options)) return letters(item.options.length);

    const size = Array.isArray(body.list) && body.list.length ? body.list.length : 4;
    if ((block.type || '') === 'select-section-given-list') {
      return ROMAN.slice(0, Math.min(size, ROMAN.length));
    }
    return letters(size);
  }

  function pickDistinct(source, count) {
    const rest = source.slice();
    const out = [];
    while (out.length < count && rest.length) {
      out.push(rest.splice(Math.floor(Math.random() * rest.length), 1)[0]);
    }
    return out.sort();
  }

  function checkboxValue(block) {
    const quantity = Number((block.desc || {}).quantity) || 2;
    return pickDistinct(pool(block, 0), quantity);
  }

  function valueFor(block, index) {
    const type = block.type || '';
    if (type.startsWith('input')) return pick(WORDS);
    if (type === 'option-true-false') return pick(['TRUE', 'FALSE', 'NOT GIVEN']);
    if (type === 'option-yes-no') return pick(['YES', 'NO', 'NOT GIVEN']);
    if (type === 'option-abc' || type.startsWith('select')) return pick(pool(block, index));
    return null;
  }

  const emptyFor = (block) => (block.type === 'checkbox' ? [] : '');

  function buildAnswers(blocks, mode) {
    const answers = {};
    for (const block of blocks) {
      const start = Number(block.start);
      const end = Number(block.end);

      if (block.type === 'checkbox') {
        const value = mode === 'clear' ? [] : checkboxValue(block);
        for (let n = start; n <= end; n++) answers[String(n)] = value;
        continue;
      }

      for (let n = start; n <= end; n++) {
        if (mode === 'clear') {
          answers[String(n)] = emptyFor(block);
        } else {
          const v = valueFor(block, n - start);
          if (v !== null) answers[String(n)] = v;
        }
      }
    }
    return answers;
  }

  return { buildAnswers };
})();
