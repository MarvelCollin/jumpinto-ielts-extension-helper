const JumpintoAnswers = (() => {
  const emptyFor = (block) => ((block.type || '') === 'checkbox' ? [] : '');

  function buildCleared(blocks) {
    const answers = {};
    for (const block of blocks) {
      const start = Number(block.start);
      const end = Number(block.end);
      for (let n = start; n <= end; n++) {
        answers[String(n)] = emptyFor(block);
      }
    }
    return answers;
  }

  return { emptyFor, buildCleared };
})();
