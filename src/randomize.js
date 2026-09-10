const JumpintoRandomize = (() => {
  const WORDS = [
    'season', 'update', 'blog', 'captain', 'films', 'market', 'design', 'travel',
    'budget', 'weather', 'culture', 'transport', 'research', 'balance', 'signal',
  ];

  const ROMAN = [
    'i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix', 'x',
    'xi', 'xii', 'xiii', 'xiv', 'xv',
  ];

  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const letters = (n) => Array.from({ length: n }, (_, i) => String.fromCharCode(65 + i));

  function optionCount(block, index) {
    const item = block.body && block.body.items && block.body.items[index];
    if (item && Array.isArray(item.options)) return item.options.length;
    if (block.body && Array.isArray(block.body.list)) return block.body.list.length;
    return 4;
  }

  function valueFor(block, index) {
    const type = block.type || '';
    if (type.startsWith('input')) return pick(WORDS);
    if (type === 'option-true-false') return pick(['TRUE', 'FALSE', 'NOT GIVEN']);
    if (type === 'option-yes-no') return pick(['YES', 'NO', 'NOT GIVEN']);
    if (type === 'option-abc') return pick(letters(optionCount(block, index)));
    if (type === 'select-section-given-list') {
      return pick(ROMAN.slice(0, optionCount(block, index)));
    }
    if (type.startsWith('select')) return pick(letters(optionCount(block, index)));
    return null;
  }

  function buildAnswers(blocks, mode) {
    const answers = {};
    for (const block of blocks) {
      const start = Number(block.start);
      const end = Number(block.end);
      for (let n = start; n <= end; n++) {
        if (mode === 'clear') {
          answers[String(n)] = '';
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
