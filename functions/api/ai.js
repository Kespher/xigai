const ACTION_CONFIG = {
  explain: {
    system: '你是一位金牌思政课辅导老师，熟悉《习近平新时代中国特色社会主义思想概论》。回答要准确、简洁、适合大学生考前复习。',
    buildPrompt(payload) {
      const q = payload.question;
      return [
        '请分析这道习概客观题，使用 Markdown 输出。',
        `题型：${q.type}`,
        `题目：${q.stem}`,
        `选项：${q.options.map((item, index) => `${String.fromCharCode(65 + index)}. ${item}`).join('；')}`,
        `正确答案：${q.answer}`,
        '',
        '请包含：1. 核心考点；2. 为什么选这个答案；3. 易错点；4. 一句话速记。'
      ].join('\n');
    }
  },
  mnemonic: {
    system: '你擅长编押韵、好记、但不低幼的政治考点口诀。必须保持政治表述准确，不要胡编史实。',
    buildPrompt(payload) {
      const q = payload.question;
      return [
        '请为这道习概题编一个方便记忆的口诀，使用 Markdown 输出。',
        `题目：${q.stem}`,
        `正确答案：${q.answer}`,
        `选项：${q.options.map((item, index) => `${String.fromCharCode(65 + index)}. ${item}`).join('；')}`,
        '',
        '要求：口诀短，解释清楚，适合考前背诵，不要玩梗过度。'
      ].join('\n');
    }
  },
  report: {
    system: '你是一位大学思政课备考规划师，擅长根据错题快速定位薄弱知识点。',
    buildPrompt(payload) {
      const wrongList = (payload.wrongQuestions || [])
        .map((q, index) => `${index + 1}. [${q.type}] ${q.stem}｜答案：${q.answer}`)
        .join('\n');
      return [
        '请基于刷题记录生成一份习概客观题复习周报，使用 Markdown 输出。',
        `总题数：${payload.total}`,
        `答对：${payload.stats?.correct ?? 0}`,
        `答错：${payload.stats?.wrong ?? 0}`,
        '',
        '代表性错题：',
        wrongList || '暂无错题。',
        '',
        '请包含：1. 当前水平判断；2. 薄弱模块；3. 接下来 3 天复习安排；4. 最优先背诵清单。'
      ].join('\n');
    }
  }
};

function json(data, init = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...(init.headers || {})
    }
  });
}

function validatePayload(action, payload) {
  if (!ACTION_CONFIG[action]) return '未知 AI 动作。';
  if (!payload || typeof payload !== 'object') return '请求数据为空。';
  if ((action === 'explain' || action === 'mnemonic') && !payload.question?.stem) {
    return '缺少题目信息。';
  }
  return null;
}

export async function onRequestOptions() {
  return json({ ok: true }, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
}

export async function onRequestPost({ request, env }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: '请求体不是合法 JSON。' }, { status: 400 });
  }

  const { action, payload } = body;
  const validationError = validatePayload(action, payload);
  if (validationError) {
    return json({ error: validationError }, { status: 400 });
  }

  if (!env.GEMINI_API_KEY) {
    return json({ error: 'AI 服务还没配置 GEMINI_API_KEY。静态刷题可用，AI 讲解需要在 Cloudflare 环境变量里添加密钥。' }, { status: 503 });
  }

  const config = ACTION_CONFIG[action];
  const model = env.GEMINI_MODEL || 'gemini-3.5-flash';
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

  const upstream = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': env.GEMINI_API_KEY
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: config.buildPrompt(payload) }] }],
      systemInstruction: { parts: [{ text: config.system }] },
      generationConfig: { temperature: action === 'mnemonic' ? 0.75 : 0.35 }
    })
  });

  const data = await upstream.json().catch(() => ({}));
  if (!upstream.ok) {
    return json({ error: data.error?.message || 'Gemini API 请求失败，请检查模型名称、API Key 或账单状态。' }, { status: upstream.status });
  }

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  return json({ text: text || 'AI 暂时没有返回内容。' });
}

export async function onRequest() {
  return json({ error: '仅支持 POST 请求。' }, { status: 405 });
}
