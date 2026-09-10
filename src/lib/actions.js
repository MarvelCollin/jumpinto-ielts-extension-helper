const JumpintoActions = (() => {
  const UNDO_KEY = 'jumpinto-last-snapshot';

  const noop = () => {};

  async function clear(ctx, parts, onStatus = noop) {
    const snapshot = { ts: Date.now(), ctx, parts: [] };

    for (const part of parts) {
      onStatus('Reading part ' + part);
      const [existing, blocks] = await Promise.all([
        JumpintoApi.getAnswers(ctx, part),
        JumpintoApi.getQuestions(ctx, part),
      ]);
      snapshot.parts.push({ taskPart: part, answers: existing || {} });

      const generated = JumpintoAnswers.buildCleared(blocks);
      onStatus('Saving part ' + part);
      await JumpintoApi.putAnswers(ctx, part, Object.assign({}, existing, generated));
    }

    await chrome.storage.local.set({ [UNDO_KEY]: snapshot });
    return snapshot;
  }

  async function readSnapshot() {
    const stored = await chrome.storage.local.get(UNDO_KEY);
    return stored[UNDO_KEY] || null;
  }

  function coversSameTest(snapshot, ctx) {
    return (
      !!snapshot &&
      snapshot.ctx.seriesType === ctx.seriesType &&
      snapshot.ctx.seriesId === ctx.seriesId &&
      snapshot.ctx.testId === ctx.testId &&
      snapshot.ctx.testPart === ctx.testPart
    );
  }

  async function undo(ctx, onStatus = noop) {
    const snapshot = await readSnapshot();
    if (!snapshot) throw new Error('Nothing to undo');
    if (!coversSameTest(snapshot, ctx)) throw new Error('Last change was on another test');

    for (const { taskPart, answers } of snapshot.parts) {
      onStatus('Restoring part ' + taskPart);
      await JumpintoApi.putAnswers(ctx, taskPart, answers);
    }

    await chrome.storage.local.remove(UNDO_KEY);
    return snapshot;
  }

  function describe(ctx) {
    return `IELTS ${ctx.seriesId} test ${ctx.testId} ${ctx.testPart}`;
  }

  return { UNDO_KEY, clear, undo, readSnapshot, coversSameTest, describe };
})();
