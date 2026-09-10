const JumpintoApi = (() => {
  const BASE = 'https://www.jumpinto.com/api/v1/assessment/ielts/practice/';

  const PARTS = {
    listening: [1, 2, 3, 4],
    reading: [1, 2, 3],
  };

  function parsePath(pathname) {
    const m = pathname.match(
      /^\/ielts\/practice\/([^/]+)\/([^/]+)\/([^/]+)\/([^/]+)(?:\/([^/]+))?/
    );
    if (!m) return null;
    const [, seriesType, seriesId, testId, testPart, taskPart] = m;
    return { seriesType, seriesId, testId, testPart, taskPart: Number(taskPart) || 1 };
  }

  function parseLocation(pathname = location.pathname) {
    const raw = parsePath(pathname);
    if (!raw || !PARTS[raw.testPart]) return null;
    return Object.assign({}, raw, { taskParts: PARTS[raw.testPart] });
  }

  function query(ctx, taskPart, extra = {}) {
    const p = new URLSearchParams({
      series_type: ctx.seriesType,
      series_id: ctx.seriesId,
      test_id: ctx.testId,
      test_part: ctx.testPart,
      task_part: String(taskPart),
      ...extra,
    });
    return p.toString();
  }

  async function get(endpoint, qs) {
    const res = await fetch(BASE + endpoint + '?' + qs, { credentials: 'include' });
    if (!res.ok) throw new Error(endpoint + ' -> HTTP ' + res.status);
    const json = await res.json();
    if (json.code !== 2000) throw new Error(endpoint + ' -> ' + json.message);
    return json.data;
  }

  const getAnswers = (ctx, taskPart) =>
    get('comprehension/get-my-answer-by-task', query(ctx, taskPart));

  const getQuestions = (ctx, taskPart) =>
    get('question/get-test-question', query(ctx, taskPart)).then(
      (d) => d.test_question || []
    );

  const putAnswers = (ctx, taskPart, answers) =>
    get(
      'comprehension/submit-answer-by-task',
      query(ctx, taskPart, { user_answer: JSON.stringify(answers) })
    );

  return { PARTS, parsePath, parseLocation, getAnswers, getQuestions, putAnswers };
})();
