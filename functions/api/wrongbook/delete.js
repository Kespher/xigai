export async function onRequestPost({ request, env }) {
  try {
    const { userId, questionId } = await request.json();

    if (!userId || !questionId) {
      return Response.json(
        { success: false, error: "缺少 userId 或 questionId" },
        { status: 400 }
      );
    }

    await env.DB.prepare(`
      DELETE FROM wrong_questions
      WHERE user_id = ?
        AND question_id = ?
    `)
      .bind(userId, String(questionId))
      .run();

    return Response.json({ success: true });
  } catch (error) {
    return Response.json(
      { success: false, error: error.message || "删除错题失败" },
      { status: 500 }
    );
  }
}