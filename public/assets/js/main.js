import { questionDatabase } from './data/questions.js';
import { requestAI } from './services/aiService.js';
import {
  addWrongQuestion,
  getWrongBook,
  markAsMastered
} from './services/wrongbookService.js';
import { saveProgress, loadProgress, clearProgress } from './services/progressService.js';

const els = {
  quizUI: document.querySelector('#quiz-ui'),
  summaryUI: document.querySelector('#summary-ui'),
  wrongbookBtn: document.querySelector('#wrongbook-btn'),
  exitWrongbookBtn: document.querySelector('#exit-wrongbook-btn'),
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
  summaryRestartBtn: document.querySelector('#summary-restart-btn'),
  sequentialModeBtn: document.querySelector('#sequential-mode-btn'),
  randomModeBtn: document.querySelector('#random-mode-btn'),
  questionNavPanel: document.querySelector('#question-nav-panel'),
  questionNavContent: document.querySelector('#question-nav-content')
};

const state = {
  questions: [],
  currentIndex: 0,

  // 用题目 id 记录答案，不再用 currentIndex
  answerRecords: {},

  wrongQuestionIds: [],
  stats: { correct: 0, wrong: 0 },
  currentMultiSelection: [],

  // all / wrongbook
  mode: 'all',

  // random / sequential
  orderMode: localStorage.getItem('xigai_order_mode') || 'random'
};

function saveProgressIfAllMode() {
  if (state.mode === 'all') {
    saveProgress(state);
  }
}

function shuffle(items) {
  return [...items].sort(() => Math.random() - 0.5);
}

function buildQuestionList() {
  if (state.orderMode === 'sequential') {
    return [...questionDatabase];
  }

  return shuffle(questionDatabase);
}

function getTypeKey(type) {
  if (type === '单选') return 'single';
  if (type === '多选') return 'multiple';
  if (type === '判断') return 'judge';
  return 'other';
}

function getTypeTitle(typeKey) {
  const map = {
    single: '单选题',
    multiple: '多选题',
    judge: '判断题',
    other: '其他'
  };

  return map[typeKey] || '其他';
}

function getQuestionNavClass(question) {
  const record = state.answerRecords[question.id];

  if (!record) {
    return 'bg-slate-100 text-slate-400 border-slate-200 hover:bg-slate-200';
  }

  if (record.isCorrect) {
    return 'bg-green-500 text-white border-green-500 hover:bg-green-600';
  }

  return 'bg-red-500 text-white border-red-500 hover:bg-red-600';
}

function renderQuestionNav() {
  if (
    state.mode !== 'all' ||
    state.orderMode !== 'sequential'
  ) {
    setHidden(els.questionNavPanel, true);
    return;
  }

  setHidden(els.questionNavPanel, false);

  const groups = {
    single: [],
    multiple: [],
    judge: []
  };

  questionDatabase.forEach((question) => {
    const typeKey = getTypeKey(question.type);

    if (!groups[typeKey]) {
      groups[typeKey] = [];
    }

    groups[typeKey].push(question);
  });

  els.questionNavContent.innerHTML = '';

  Object.entries(groups).forEach(([typeKey, questions]) => {
    if (questions.length === 0) return;

    const groupEl = document.createElement('div');

    groupEl.innerHTML = `
      <h3 class="text-xs font-black text-slate-500 mb-2">
        ${getTypeTitle(typeKey)}
      </h3>
      <div class="flex flex-wrap gap-2"></div>
    `;

    const buttonsContainer = groupEl.querySelector('div');

    questions.forEach((question) => {
      const index = state.questions.findIndex(
        (item) => Number(item.id) === Number(question.id)
      );

      const btn = document.createElement('button');
      btn.className = `
        w-8 h-8 rounded-full border text-xs font-black
        flex items-center justify-center transition-all
        ${getQuestionNavClass(question)}
      `;

      btn.innerText = question.id;
      btn.title = `第 ${question.id} 题`;

      btn.addEventListener('click', () => {
        if (index === -1) return;

        state.currentIndex = index;
        render();
        saveProgressIfAllMode();
      });

      buttonsContainer.appendChild(btn);
    });

    els.questionNavContent.appendChild(groupEl);
  });
}

function switchOrderMode(orderMode) {
  if (state.mode === 'wrongbook') {
    alert('错题本模式下暂不切换顺序/乱序，请先退出错题本。');
    return;
  }

  state.orderMode = orderMode;
  localStorage.setItem('xigai_order_mode', orderMode);

  state.questions = buildQuestionList();
  state.currentIndex = 0;
  state.answerRecords = {};
  state.wrongQuestionIds = [];
  state.stats = { correct: 0, wrong: 0 };
  state.currentMultiSelection = [];

  clearProgress();

  setHidden(els.summaryUI, true);
  setHidden(els.quizUI, false);
  setHidden(els.aiReportBox, true);
  els.aiReportBox.innerHTML = '';

  updateModeButtons();
  updateStats();
  render();
}

function updateModeButtons() {
  const activeClass = 'text-indigo-600 bg-indigo-50';
  const inactiveClass = 'text-slate-600 bg-slate-100';

  if (state.orderMode === 'sequential') {
    els.sequentialModeBtn.className = `text-xs font-bold px-2 py-1 rounded hover:bg-indigo-100 transition-colors ${activeClass}`;
    els.randomModeBtn.className = `text-xs font-bold px-2 py-1 rounded hover:bg-slate-200 transition-colors ${inactiveClass}`;
  } else {
    els.sequentialModeBtn.className = `text-xs font-bold px-2 py-1 rounded hover:bg-slate-200 transition-colors ${inactiveClass}`;
    els.randomModeBtn.className = `text-xs font-bold px-2 py-1 rounded hover:bg-indigo-100 transition-colors ${activeClass}`;
  }
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
  const answerRecord = state.answerRecords[question.id];

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
  const answerRecord = state.answerRecords[question.id];

  if (!answerRecord) {
    setHidden(els.feedbackArea, true);
    return;
  }

  setHidden(els.feedbackArea, false);

  const isAllCorrect =
    normalizeAnswer(answerRecord.choice) === normalizeAnswer(question.answer);

  els.feedbackCard.className = `p-4 rounded-xl flex items-start space-x-3 border-2 ${
    isAllCorrect ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
  }`;

  els.feedbackIcon.innerText = isAllCorrect ? '✅' : '❌';
  els.feedbackTitle.innerText = isAllCorrect ? '完全正确！' : '回答错误';
  els.feedbackTitle.className = `font-black mb-0.5 ${
    isAllCorrect ? 'text-green-800' : 'text-red-800'
  }`;
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

  const hasAnswered = Boolean(state.answerRecords[question.id]);
  setHidden(els.multiSubmitContainer, question.type !== '多选' || hasAnswered);
  setHidden(els.aiResponseBox, true);
  state.currentMultiSelection = [];
  renderFeedback(question);
  renderQuestionNav();
}

function  {
  const question = getCurrentQuestion();
  const normalizedChoice = normalizeAnswer(choice);
  const isCorrect = normalizedChoice === normalizeAnswer(question.answer);

  if (state.answerRecords[question.id]) return;

  state.answerRecords[question.id] = {
    choice: normalizedChoice,
    isCorrect
  };

  if (isCorrect) {
    state.stats.correct += 1;
  } else {
    state.stats.wrong += 1;
    state.wrongQuestionIds.push(question.id);

    addWrongQuestion(question, normalizedChoice).catch((error) => {
      console.error('错题保存失败：', error);
    });
  }

  updateStats();
  render();
  renderQuestionNav();
  saveProgressIfAllMode();
}

function toggleMultiSelection(letter, button) {
  const question = getCurrentQuestion();

  if (state.answerRecords[question.id]) return;

  button.classList.toggle('multi-selected');

  if (state.currentMultiSelection.includes(letter)) {
    state.currentMultiSelection = state.currentMultiSelection.filter(
      (item) => item !== letter
    );
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
    saveProgressIfAllMode();
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
    state.answerRecords = savedState.answerRecords;
    state.wrongQuestionIds = savedState.wrongQuestionIds;
    state.stats = savedState.stats;
    state.orderMode = savedState.orderMode || 'random';
    state.currentMultiSelection = [];
    localStorage.setItem('xigai_order_mode', state.orderMode);
    updateModeButtons();

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

  state.mode = 'all';
  setHidden(els.exitWrongbookBtn, true);

  state.questions = buildQuestionList();
  state.currentIndex = 0;
  state.answerRecords = {};
  state.wrongQuestionIds = [];
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
  if (state.mode === 'all') {
    saveProgressIfAllMode(state);
  }
  
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
    state.answerRecords = {};
    state.wrongQuestionIds = [];
    state.stats = { correct: 0, wrong: 0 };
    state.currentMultiSelection = [];

    state.mode = 'wrongbook';
    setHidden(els.exitWrongbookBtn, false);
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

function exitWrongBookMode() {
  const savedState = loadProgress(questionDatabase);

  state.mode = 'all';
  setHidden(els.exitWrongbookBtn, true);

  if (savedState) {
    state.questions = savedState.questions;
    state.currentIndex = savedState.currentIndex;
    state.answerRecords = savedState.answerRecords || {};
    state.wrongQuestionIds = savedState.wrongQuestionIds || [];
    state.stats = savedState.stats || { correct: 0, wrong: 0 };
    state.orderMode = savedState.orderMode || 'random';
    state.currentMultiSelection = [];

    localStorage.setItem('xigai_order_mode', state.orderMode);
    updateModeButtons();

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

  const wrongQuestions = state.wrongQuestionIds
    .slice(0, 12)
    .map((id) =>
      state.questions.find((question) => Number(question.id) === Number(id))
    )
    .filter(Boolean);

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
  els.exitWrongbookBtn.addEventListener('click', exitWrongBookMode);
  els.summaryRestartBtn.addEventListener('click', restart);
  els.multiSubmitBtn.addEventListener('click', submitMultiAnswer);
  els.prevBtn.addEventListener('click', () => goToQuestion(-1));
  els.nextBtn.addEventListener('click', () => goToQuestion(1));
  els.aiExplainBtn.addEventListener('click', () => runAIAction('explain'));
  els.aiMnemonicBtn.addEventListener('click', () => runAIAction('mnemonic'));
  els.aiReportBtn.addEventListener('click', generateReport);
  els.sequentialModeBtn.addEventListener('click', () => {
    switchOrderMode('sequential');
  });
  els.randomModeBtn.addEventListener('click', () => {
    switchOrderMode('random');
  });
}

bindEvents();
updateModeButtons();
restoreOrRestart();
