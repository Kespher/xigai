import { questionDatabase } from './data/questions.js';
import { requestAI } from './services/aiService.js';
import { addWrongQuestion, getWrongBook } from './services/wrongbookService.js';
import { saveProgress, loadProgress, clearProgress } from './services/progressService.js';

const els = {
  quizUI: document.querySelector('#quiz-ui'),
  summaryUI: document.querySelector('#summary-ui'),
  wrongbookBtn: document.querySelector('#wrongbook-btn'),
  progressText: document.querySelector('#progress-text'),
  progressBar: document.querySelector('#progress-bar'),
  statCorrect: document.querySelector('#stat-correct'),
  statWrong: document.querySelector('#stat-wrong'),
  questionTypeTag: document.querySelector('#question-type-tag'),
  origId: document.querySelector('#orig-id'),
  questionStem: document.querySelector('#question-stem'),
  optionsContainer: document.querySelector('#options-container'),
  multiSubmitContainer: document.querySelector('#multi-submit-container'),
  multiSubmitBtn: document.querySelector('#multi-submit-btn'),
  feedbackArea: document.querySelector('#feedback-area'),
  feedbackCard: document.querySelector('#feedback-card'),
  feedbackIcon: document.querySelector('#feedback-icon'),
  feedbackTitle: document.querySelector('#feedback-title'),
  feedbackBody: document.querySelector('#feedback-body'),
  aiResponseBox: document.querySelector('#ai-response-box'),
  aiLoading: document.querySelector('#ai-loading'),
  aiContent: document.querySelector('#ai-content'),
  aiExplainBtn: document.querySelector('#ai-explain-btn'),
  aiMnemonicBtn: document.querySelector('#ai-mnemonic-btn'),
  prevBtn: document.querySelector('#prev-btn'),
  nextBtn: document.querySelector('#next-btn'),
  restartBtn: document.querySelector('#restart-btn'),
  summaryText: document.querySelector('#summary-text'),
  aiReportBtn: document.querySelector('#ai-report-btn'),
  aiReportBox: document.querySelector('#ai-report-box'),
  summaryRestartBtn: document.querySelector('#summary-restart-btn')
};

const state = {
  questions: [],
  currentIndex: 0,
  userChoices: {},
  wrongIndices: [],
  stats: { correct: 0, wrong: 0 },
  currentMultiSelection: []
};

function shuffle(items) {
  return [...items].sort(() => Math.random() - 0.5);
}

function setHidden(element, hidden) {
  element.classList.toggle('hidden', hidden);
}

function normalizeAnswer(answer = '') {
  return answer.split('').sort().join('');
}

function getCurrentQuestion() {
  return state.questions[state.currentIndex];
}

function renderMarkdown(target, markdown) {
  if (window.marked?.parse) {
    target.innerHTML = window.marked.parse(markdown);
    return;
  }
  target.textContent = markdown;
}

function updateStats() {
  els.statCorrect.innerText = `正: ${state.stats.correct}`;
  els.statWrong.innerText = `误: ${state.stats.wrong}`;
}

function setTypeTag(type) {
  const typeClassMap = {
    '单选': 'bg-blue-50 text-blue-600',
    '多选': 'bg-orange-50 text-orange-600',
    '判断': 'bg-purple-50 text-purple-600'
  };
  els.questionTypeTag.innerText = type;
  els.questionTypeTag.className = `px-2.5 py-1 rounded-md text-[10px] font-black tracking-wider ${typeClassMap[type] || 'bg-slate-50 text-slate-600'}`;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatAnswer(question) {
  return question.answer
    .split('')
    .map((letter) => {
      const optionText = question.options[letter.charCodeAt(0) - 65];
      return `${letter}. ${optionText}`;
    })
    .join('；');
}

function createOptionButton(question, optionText, optionIndex) {
  const letter = String.fromCharCode(65 + optionIndex);
  const button = document.createElement('button');
  button.className = 'option-btn w-full text-left p-5 border-2 border-slate-100 rounded-2xl flex items-center font-bold text-slate-700 bg-white shadow-sm hover:shadow-md transition-all';

  let iconClass = 'bg-slate-100 text-slate-400';
  const answerRecord = state.userChoices[state.currentIndex];

  if (answerRecord) {
    button.disabled = true;
    const isSelected = answerRecord.choice.includes(letter);
    const isCorrectOption = question.answer.includes(letter);

    if (isCorrectOption) {
      button.classList.add('correct');
      iconClass = 'bg-green-500 text-white';
    } else if (isSelected) {
      button.classList.add('wrong');
      iconClass = 'bg-red-500 text-white';
    }
  }

  button.innerHTML = `
    <span class="w-10 h-10 flex-shrink-0 rounded-xl flex items-center justify-center mr-5 font-black ${iconClass}">${letter}</span>
    <span class="flex-grow">${escapeHtml(optionText)}</span>
  `;

  button.addEventListener('click', () => {
    if (question.type === '多选') {
      toggleMultiSelection(letter, button);
      return;
    }
    submitAnswer(letter);
  });

  return button;
}

function renderOptions(question) {
  els.optionsContainer.innerHTML = '';
  question.options.forEach((optionText, optionIndex) => {
    els.optionsContainer.appendChild(createOptionButton(question, optionText, optionIndex));
  });
}

function renderFeedback(question) {
  const answerRecord = state.userChoices[state.currentIndex];
  if (!answerRecord) {
    setHidden(els.feedbackArea, true);
    return;
  }

  setHidden(els.feedbackArea, false);
  const isAllCorrect = normalizeAnswer(answerRecord.choice) === normalizeAnswer(question.answer);
  els.feedbackCard.className = `p-4 rounded-xl flex items-start space-x-3 border-2 ${isAllCorrect ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`;
  els.feedbackIcon.innerText = isAllCorrect ? '✅' : '❌';
  els.feedbackTitle.innerText = isAllCorrect ? '完全正确！' : '回答错误';
  els.feedbackTitle.className = `font-black mb-0.5 ${isAllCorrect ? 'text-green-800' : 'text-red-800'}`;
  els.feedbackBody.innerText = `参考答案：${formatAnswer(question)}`;
}

function render() {
  const question = getCurrentQuestion();
  if (!question) {
    showSummary();
    return;
  }

  els.progressText.innerText = `${state.currentIndex + 1} / ${state.questions.length}`;
  els.progressBar.style.width = `${((state.currentIndex + 1) / state.questions.length) * 100}%`;
  els.questionStem.innerText = question.stem;
  els.origId.innerText = `原题号 #${question.id}`;
  els.prevBtn.disabled = state.currentIndex === 0;

  setTypeTag(question.type);
  renderOptions(question);

  const hasAnswered = Boolean(state.userChoices[state.currentIndex]);
  setHidden(els.multiSubmitContainer, question.type !== '多选' || hasAnswered);
  setHidden(els.aiResponseBox, true);
  state.currentMultiSelection = [];
  renderFeedback(question);
}

function submitAnswer(choice) {
  const question = getCurrentQuestion();
  const normalizedChoice = normalizeAnswer(choice);
  const isCorrect = normalizedChoice === normalizeAnswer(question.answer);

  if (state.userChoices[state.currentIndex]) return;

  state.userChoices[state.currentIndex] = { choice: normalizedChoice, isCorrect };
  if (isCorrect) {
    state.stats.correct += 1;
  } else {
    state.stats.wrong += 1;
    state.wrongIndices.push(state.currentIndex);

    addWrongQuestion(question, normalizedChoice).catch((error) => {
        console.error("错题保存失败：", error);
    });
  }

  updateStats();
  render();
  saveProgress(state);
}

function toggleMultiSelection(letter, button) {
  if (state.userChoices[state.currentIndex]) return;

  button.classList.toggle('multi-selected');
  if (state.currentMultiSelection.includes(letter)) {
    state.currentMultiSelection = state.currentMultiSelection.filter((item) => item !== letter);
  } else {
    state.currentMultiSelection.push(letter);
  }
}

function submitMultiAnswer() {
  if (state.currentMultiSelection.length === 0) return;
  submitAnswer(state.currentMultiSelection.join(''));
}

function goToQuestion(delta) {
  const target = state.currentIndex + delta;
  if (target >= 0 && target < state.questions.length) {
    state.currentIndex = target;
    render();
    saveProgress(state);
  } else if (target >= state.questions.length) {
    showSummary();
  }
}

function showSummary() {
  setHidden(els.quizUI, true);
  setHidden(els.summaryUI, false);
  const total = state.questions.length;
  const rate = total === 0 ? 0 : Math.round((state.stats.correct / total) * 100);
  els.summaryText.innerHTML = `共挑战 ${total} 道题目，<br>你答对了 ${state.stats.correct} 题，正确率 ${rate}%。`;
}

function restoreOrRestart() {
  const savedState = loadProgress(questionDatabase);

  if (savedState) {
    state.questions = savedState.questions;
    state.currentIndex = savedState.currentIndex;
    state.userChoices = savedState.userChoices;
    state.wrongIndices = savedState.wrongIndices;
    state.stats = savedState.stats;
    state.currentMultiSelection = [];

    setHidden(els.summaryUI, true);
    setHidden(els.quizUI, false);
    setHidden(els.aiReportBox, true);
    els.aiReportBox.innerHTML = '';

    updateStats();
    render();
    return;
  }

  restart();
}

function restart() {
  clearProgress();
  state.questions = shuffle(questionDatabase);
  state.currentIndex = 0;
  state.userChoices = {};
  state.wrongIndices = [];
  state.stats = { correct: 0, wrong: 0 };
  state.currentMultiSelection = [];
  setHidden(els.summaryUI, true);
  setHidden(els.quizUI, false);
  setHidden(els.aiReportBox, true);
  els.aiReportBox.innerHTML = '';
  updateStats();
  render();
}

async function loadWrongBookMode() {
  els.wrongbookBtn.innerText = '加载中...';

  try {
    const result = await getWrongBook();

    if (!result.success) {
      alert(result.error || '错题本加载失败');
      return;
    }

    const wrongIds = result.data.map((item) => Number(item.question_id));

    const wrongQuestions = questionDatabase.filter((question) =>
      wrongIds.includes(Number(question.id))
    );

    if (wrongQuestions.length === 0) {
      alert('当前错题本为空，强得可怕。');
      return;
    }

    state.questions = wrongQuestions;
    state.currentIndex = 0;
    state.userChoices = {};
    state.wrongIndices = [];
    state.stats = { correct: 0, wrong: 0 };
    state.currentMultiSelection = [];

    setHidden(els.summaryUI, true);
    setHidden(els.quizUI, false);
    setHidden(els.aiReportBox, true);
    els.aiReportBox.innerHTML = '';

    updateStats();
    render();
  } catch (error) {
    console.error(error);
    alert('错题本加载失败，请稍后重试');
  } finally {
    els.wrongbookBtn.innerText = '错题本';
  }
}

async function runAIAction(action) {
  const question = getCurrentQuestion();
  setHidden(els.aiResponseBox, false);
  setHidden(els.aiLoading, false);
  els.aiContent.innerHTML = '';

  try {
    const text = await requestAI(action, { question });
    renderMarkdown(els.aiContent, text);
  } catch (error) {
    els.aiContent.innerText = error.message || 'AI 服务暂时不可用。';
  } finally {
    setHidden(els.aiLoading, true);
  }
}

async function generateReport() {
  setHidden(els.aiReportBox, false);
  els.aiReportBox.innerHTML = 'AI 正在分析你的错题模型...';
  const wrongQuestions = state.wrongIndices.slice(0, 12).map((index) => state.questions[index]);

  try {
    const text = await requestAI('report', {
      stats: state.stats,
      total: state.questions.length,
      wrongQuestions
    });
    renderMarkdown(els.aiReportBox, text);
  } catch (error) {
    els.aiReportBox.innerText = error.message || '报告生成失败。';
  }
}

function bindEvents() {
  els.restartBtn.addEventListener('click', restart);
  els.wrongbookBtn.addEventListener('click', loadWrongBookMode);
  els.summaryRestartBtn.addEventListener('click', restart);
  els.multiSubmitBtn.addEventListener('click', submitMultiAnswer);
  els.prevBtn.addEventListener('click', () => goToQuestion(-1));
  els.nextBtn.addEventListener('click', () => goToQuestion(1));
  els.aiExplainBtn.addEventListener('click', () => runAIAction('explain'));
  els.aiMnemonicBtn.addEventListener('click', () => runAIAction('mnemonic'));
  els.aiReportBtn.addEventListener('click', generateReport);
}

bindEvents();
restoreOrRestart();
