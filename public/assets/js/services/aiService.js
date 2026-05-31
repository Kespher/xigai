export async function requestAI(action, payload) {
  const response = await fetch('/api/ai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, payload })
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || `AI 请求失败：${response.status}`);
  }
  return data.text || 'AI 暂时没有返回内容。';
}
