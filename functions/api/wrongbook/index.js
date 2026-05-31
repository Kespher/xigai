export async function onRequestGet({ request, env }) {
  try {
    const url = new URL(request.url);
    const userId = url.searchParams.get("userId");

    if (!userId) {
      return Response.json(
        { success: false, error: "缺少 userId" },
        { status: 400 }
      );
    }

    const result = await env.DB.prepare(`
      SELECT
        question_id,
        question_type,
        last_user_answer,
        correct_answer,
        wrong_count,
        mastered,
        created_at,
        updated_at
      FROM wrong_questions
      WHERE user_id = ?
        AND mastered = 0
      ORDER BY updated_at DESC
    `)
      .bind(userId)
      .all();

    return Response.json({
      success: true,
      data: result.results,
    });
  } catch (error) {
    return Response.json(
      { success: false, error: error.message || "获取错题本失败" },
      { status: 500 }
    );
  }
}