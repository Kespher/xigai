export function getUserId() {
  let userId = localStorage.getItem("xigai_user_id");

  if (!userId) {
    userId = crypto.randomUUID();
    localStorage.setItem("xigai_user_id", userId);
  }

  return userId;
}

export async function addWrongQuestion(question, userAnswer) {
  const userId = getUserId();

  const response = await fetch("/api/wrongbook/add", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      userId,
      questionId: question.id,
      questionType: question.type,
      userAnswer,
      correctAnswer: question.answer,
    }),
  });

  return response.json();
}

export async function getWrongBook() {
  const userId = getUserId();

  const response = await fetch(
    `/api/wrongbook?userId=${encodeURIComponent(userId)}`
  );

  return response.json();
}

export async function markAsMastered(questionId) {
  const userId = getUserId();

  const response = await fetch("/api/wrongbook/master", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      userId,
      questionId,
    }),
  });

  return response.json();
}

export async function deleteWrongQuestion(questionId) {
  const userId = getUserId();

  const response = await fetch("/api/wrongbook/delete", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      userId,
      questionId,
    }),
  });

  return response.json();
}