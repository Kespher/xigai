const PROGRESS_KEY = 'xigai_quiz_progress';

export function saveProgress(state) {
  const payload = {
    questionIds: state.questions.map((question) => question.id),
    currentIndex: state.currentIndex,
    userChoices: state.userChoices,
    wrongIndices: state.wrongIndices,
    stats: state.stats,
    savedAt: Date.now(),
  };

  localStorage.setItem(PROGRESS_KEY, JSON.stringify(payload));
}

export function loadProgress(questionDatabase) {
  const raw = localStorage.getItem(PROGRESS_KEY);

  if (!raw) {
    return null;
  }

  try {
    const payload = JSON.parse(raw);

    if (!payload.questionIds || !Array.isArray(payload.questionIds)) {
      return null;
    }

    const questionMap = new Map(
      questionDatabase.map((question) => [String(question.id), question])
    );

    const questions = payload.questionIds
      .map((id) => questionMap.get(String(id)))
      .filter(Boolean);

    if (questions.length === 0) {
      return null;
    }

    return {
      questions,
      currentIndex: payload.currentIndex || 0,
      userChoices: payload.userChoices || {},
      wrongIndices: payload.wrongIndices || [],
      stats: payload.stats || { correct: 0, wrong: 0 },
      currentMultiSelection: [],
    };
  } catch (error) {
    console.error('读取进度失败：', error);
    return null;
  }
}

export function clearProgress() {
  localStorage.removeItem(PROGRESS_KEY);
}