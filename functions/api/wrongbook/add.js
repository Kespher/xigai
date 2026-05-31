export async function onRequestPost({ request, env }) {
  try {
    const body = await request.json();

    const {
      userId,
      questionId,
      questionType,
      userAnswer,
      correctAnswer,
    } = body;

    if (!userId || !questionId || !questionType) {
      return Response.json(
        { success: false, error: "缺少 userId / questionId / questionType" },
        { status: 400 }
      );
    }

    await env.DB.prepare(`
      INSERT INTO wrong_questions (
        user_id,
        question_id,
        question_type,
        last_user_answer,
        correct_answer,
        wrong_count,
        mastered,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, 1, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT(user_id, question_id)
      DO UPDATE SET
        last_user_answer = excluded.last_user_answer,
        correct_answer = excluded.correct_answer,
        wrong_count = wrong_count + 1,
        mastered = 0,
        updated_at = CURRENT_TIMESTAMP
    `)
      .bind(
        userId,
        String(questionId),
        questionType,
        JSON.stringify(userAnswer ?? ""),
        JSON.stringify(correctAnswer ?? "")
      )
      .run();

    return Response.json({ success: true });
  } catch (error) {
    return Response.json(
      { success: false, error: error.message || "添加错题失败" },
      { status: 500 }
    );
  }
}