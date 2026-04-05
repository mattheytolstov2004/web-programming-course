const jsonServer = require('json-server');
const jwt = require('jsonwebtoken');
const path = require('path');

const server = jsonServer.create();
const router = jsonServer.router(path.join(__dirname, 'db.json'));
const middlewares = jsonServer.defaults();

const SECRET_KEY = 'mock-jwt-secret-key';
const PORT = 3001; // Порт 3001 чтобы не конфликтовать с quiz-backend (3000)

server.use(middlewares);
server.use(jsonServer.bodyParser);

// ============ HELPER FUNCTIONS ============

function generateToken(user) {
  return jwt.sign(
    { userId: user.id, role: user.role },
    SECRET_KEY,
    { expiresIn: '7d' }
  );
}

function verifyToken(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.substring(7);
  try {
    return jwt.verify(token, SECRET_KEY);
  } catch {
    return null;
  }
}

function getCurrentUser(req, db) {
  const decoded = verifyToken(req);
  if (!decoded) return null;
  return db.get('users').find({ id: decoded.userId }).value();
}

function isAdmin(req, db) {
  const user = getCurrentUser(req, db);
  return user && user.role === 'admin';
}

function sendError(res, statusCode, error, message) {
  res.status(statusCode).json({ error, message });
}

function calculateScore(question, selectedOptions) {
  let pointsFromCorrect = 0;
  let incorrectSelected = 0;
  let correctSelected = 0;
  const correctIndices = [];

  question.options.forEach((option, index) => {
    if (option.isCorrect) {
      correctIndices.push(index);
      if (selectedOptions.includes(index)) {
        pointsFromCorrect += option.points;
        correctSelected++;
      }
    } else {
      if (selectedOptions.includes(index)) {
        incorrectSelected++;
      }
    }
  });

  const penalty = incorrectSelected * question.penaltyPerWrong;
  const totalBeforeMin = pointsFromCorrect + penalty;
  const finalScore = Math.max(totalBeforeMin, question.minScore);

  const totalCorrect = question.options.filter(o => o.isCorrect).length;
  let status;
  if (correctSelected === totalCorrect && incorrectSelected === 0) {
    status = 'correct';
  } else if (correctSelected > 0) {
    status = 'partial';
  } else {
    status = 'incorrect';
  }

  return {
    pointsEarned: finalScore,
    status,
    correctOptions: correctIndices,
    breakdown: {
      correctSelected,
      incorrectSelected,
      pointsFromCorrect,
      penaltyFromIncorrect: penalty,
      totalBeforeMin
    }
  };
}

function buildQuestionPreview(q) {
  const preview = {
    id: q.id,
    type: q.type,
    question: q.question,
    difficulty: q.difficulty,
    categoryId: q.categoryId,
    maxPoints: q.maxPoints
  };

  if (q.type === 'multiple-select') {
    preview.options = q.options.map(o => o.text);
  } else if (q.type === 'essay') {
    preview.minLength = q.minLength;
    preview.maxLength = q.maxLength;
  }

  return preview;
}

// ============ AUTH ENDPOINTS ============

// Mock GitHub OAuth — сразу возвращает токен без реального GitHub
server.post('/api/auth/github/callback', (req, res) => {
  const db = router.db;
  const { code } = req.body;

  if (!code) {
    return sendError(res, 400, 'BadRequest', 'Authorization code is required');
  }

  // Если code начинается с 'admin_' — возвращаем admin пользователя
  const role = code.startsWith('admin_') ? 'admin' : 'student';
  const user = db.get('users').find({ role }).value();

  if (!user) {
    return sendError(res, 404, 'NotFound', 'User not found');
  }

  const token = generateToken(user);
  res.json({ token, user });
});

server.get('/api/auth/me', (req, res) => {
  const db = router.db;
  const user = getCurrentUser(req, db);

  if (!user) {
    return sendError(res, 401, 'Unauthorized', 'Authentication required');
  }

  res.json(user);
});

// ============ MODE ENDPOINTS ============

server.get('/api/mode', (req, res) => {
  const db = router.db;
  res.json(db.get('mode').value());
});

server.put('/api/mode', (req, res) => {
  const db = router.db;

  if (!isAdmin(req, db)) {
    return sendError(res, 403, 'Forbidden', 'Admin access required');
  }

  const { mode, battleConfig } = req.body;
  db.set('mode', { mode, battleConfig: mode === 'battle' ? battleConfig : null }).write();
  res.json(db.get('mode').value());
});

// ============ CATEGORIES ENDPOINTS ============

server.get('/api/categories', (req, res) => {
  const db = router.db;
  res.json({ categories: db.get('categories').value() });
});

// ============ QUESTIONS ENDPOINTS ============

server.get('/api/questions', (req, res) => {
  const db = router.db;
  const mode = db.get('mode.mode').value();

  // В Battle Mode вопросы скрыты
  if (mode === 'battle') {
    return sendError(res, 403, 'Forbidden', 'Questions are hidden in Battle Mode. Create a session to start.');
  }

  const { categoryId, difficulty, type, limit = 20, offset = 0 } = req.query;

  let questions = db.get('questions');
  if (categoryId) questions = questions.filter({ categoryId });
  if (difficulty) questions = questions.filter({ difficulty });
  if (type) questions = questions.filter({ type });

  const total = questions.size().value();
  const results = questions
    .slice(Number(offset), Number(offset) + Number(limit))
    .value()
    .map(buildQuestionPreview);

  res.json({ questions: results, total, limit: Number(limit), offset: Number(offset) });
});

// ============ SESSIONS ENDPOINTS ============

server.post('/api/sessions', (req, res) => {
  const db = router.db;
  const user = getCurrentUser(req, db);

  if (!user) {
    return sendError(res, 401, 'Unauthorized', 'Authentication required');
  }

  const mode = db.get('mode.mode').value();
  const { categoryIds, difficulty, questionCount = 10 } = req.body;

  let questions = db.get('questions');

  if (categoryIds && categoryIds.length > 0) {
    questions = questions.filter(q => categoryIds.includes(q.categoryId));
  }
  if (difficulty) {
    questions = questions.filter({ difficulty });
  }

  // Случайная выборка вопросов
  const allQuestions = questions.value();
  const shuffled = allQuestions.sort(() => Math.random() - 0.5);
  const selectedQuestions = shuffled.slice(0, questionCount);

  if (selectedQuestions.length === 0) {
    return sendError(res, 400, 'BadRequest', 'No questions available with these filters');
  }

  const sessionId = `sess_${Date.now()}`;
  const maxScore = selectedQuestions.reduce((sum, q) => sum + q.maxPoints, 0);

  const session = {
    sessionId,
    userId: user.id,
    status: 'active',
    mode,
    questionIds: selectedQuestions.map(q => q.id),
    totalQuestions: selectedQuestions.length,
    answeredCount: 0,
    maxScore,
    currentScore: 0,
    createdAt: new Date().toISOString(),
    completedAt: null,
    expiresAt: mode === 'battle'
      ? new Date(Date.now() + 90 * 60 * 1000).toISOString()
      : null
  };

  db.get('sessions').push(session).write();

  res.status(201).json({
    ...session,
    questions: selectedQuestions.map(buildQuestionPreview)
  });
});

server.get('/api/sessions/:sessionId', (req, res) => {
  const db = router.db;
  const user = getCurrentUser(req, db);

  if (!user) {
    return sendError(res, 401, 'Unauthorized', 'Authentication required');
  }

  const session = db.get('sessions').find({ sessionId: req.params.sessionId }).value();

  if (!session) {
    return sendError(res, 404, 'NotFound', 'Session not found');
  }

  if (session.userId !== user.id && user.role !== 'admin') {
    return sendError(res, 403, 'Forbidden', 'Access denied');
  }

  const questions = session.questionIds.map(qId => {
    const q = db.get('questions').find({ id: qId }).value();
    return buildQuestionPreview(q);
  });

  res.json({ ...session, questions });
});

server.post('/api/sessions/:sessionId/answers', (req, res) => {
  const db = router.db;
  const user = getCurrentUser(req, db);

  if (!user) {
    return sendError(res, 401, 'Unauthorized', 'Authentication required');
  }

  const session = db.get('sessions').find({ sessionId: req.params.sessionId }).value();

  if (!session) return sendError(res, 404, 'NotFound', 'Session not found');
  if (session.userId !== user.id) return sendError(res, 403, 'Forbidden', 'Access denied');

  const { questionId, selectedOptions, text } = req.body;

  const question = db.get('questions').find({ id: questionId }).value();
  if (!question) return sendError(res, 404, 'NotFound', 'Question not found');

  const answerId = `ans_${Date.now()}`;

  if (question.type === 'multiple-select') {
    const result = calculateScore(question, selectedOptions);

    const answer = {
      answerId,
      sessionId: session.sessionId,
      questionId,
      userId: user.id,
      selectedOptions,
      status: result.status,
      pointsEarned: result.pointsEarned,
      maxPoints: question.maxPoints,
      feedback: `Вы набрали ${result.pointsEarned} из ${question.maxPoints} баллов.`,
      createdAt: new Date().toISOString()
    };

    db.get('answers').push(answer).write();
    db.get('sessions').find({ sessionId: session.sessionId }).assign({
      answeredCount: session.answeredCount + 1,
      currentScore: session.currentScore + result.pointsEarned
    }).write();

    res.json({
      answerId,
      questionId,
      status: result.status,
      pointsEarned: result.pointsEarned,
      maxPoints: question.maxPoints,
      feedback: answer.feedback,
      correctOptions: result.correctOptions,
      breakdown: result.breakdown
    });

  } else if (question.type === 'essay') {
    const answer = {
      answerId,
      sessionId: session.sessionId,
      questionId,
      userId: user.id,
      text,
      status: 'pending',
      pointsEarned: 0,
      maxPoints: question.maxPoints,
      rubricScores: null,
      feedback: null,
      createdAt: new Date().toISOString()
    };

    db.get('answers').push(answer).write();
    db.get('sessions').find({ sessionId: session.sessionId }).assign({
      answeredCount: session.answeredCount + 1
    }).write();

    res.status(202).json({
      answerId,
      questionId,
      status: 'pending',
      message: 'Ответ сохранён и ожидает проверки преподавателем'
    });
  }
});

server.post('/api/sessions/:sessionId/submit', (req, res) => {
  const db = router.db;
  const user = getCurrentUser(req, db);

  if (!user) return sendError(res, 401, 'Unauthorized', 'Authentication required');

  const session = db.get('sessions').find({ sessionId: req.params.sessionId });

  if (!session.value()) return sendError(res, 404, 'NotFound', 'Session not found');
  if (session.value().userId !== user.id) return sendError(res, 403, 'Forbidden', 'Access denied');

  session.assign({
    status: 'completed',
    completedAt: new Date().toISOString()
  }).write();

  res.json(getSessionResults(db, req.params.sessionId));
});

server.get('/api/sessions/:sessionId/results', (req, res) => {
  const db = router.db;
  const user = getCurrentUser(req, db);

  if (!user) return sendError(res, 401, 'Unauthorized', 'Authentication required');

  const session = db.get('sessions').find({ sessionId: req.params.sessionId }).value();

  if (!session) return sendError(res, 404, 'NotFound', 'Session not found');
  if (session.userId !== user.id && user.role !== 'admin') return sendError(res, 403, 'Forbidden', 'Access denied');

  res.json(getSessionResults(db, req.params.sessionId));
});

function getSessionResults(db, sessionId) {
  const session = db.get('sessions').find({ sessionId }).value();
  const answers = db.get('answers').filter({ sessionId }).value();

  const hasPending = answers.some(a => a.status === 'pending');

  const detailedAnswers = answers.map(answer => {
    const question = db.get('questions').find({ id: answer.questionId }).value();
    const result = {
      answerId: answer.answerId,
      questionId: answer.questionId,
      question: buildQuestionPreview(question),
      status: answer.status,
      pointsEarned: answer.pointsEarned,
      maxPoints: answer.maxPoints,
      feedback: answer.feedback
    };

    if (question.type === 'multiple-select') {
      result.userAnswer = answer.selectedOptions;
      result.correctOptions = question.options.map((o, i) => o.isCorrect ? i : null).filter(i => i !== null);
    } else if (question.type === 'essay') {
      result.userAnswer = answer.text;
      if (answer.rubricScores) result.rubricScores = answer.rubricScores;
    }

    return result;
  });

  const percentage = session.maxScore > 0
    ? (session.currentScore / session.maxScore * 100).toFixed(1)
    : 0;

  return {
    sessionId: session.sessionId,
    userId: session.userId,
    status: hasPending ? 'partial' : 'completed',
    mode: session.mode,
    totalQuestions: session.totalQuestions,
    answeredQuestions: session.answeredCount,
    score: {
      earned: session.currentScore,
      max: session.maxScore,
      percentage: Number(percentage)
    },
    answers: detailedAnswers,
    completedAt: session.completedAt,
    timeSpent: session.completedAt
      ? Math.floor((new Date(session.completedAt) - new Date(session.createdAt)) / 1000)
      : null
  };
}

// ============ ADMIN ENDPOINTS ============

server.get('/api/admin/questions', (req, res) => {
  const db = router.db;
  if (!isAdmin(req, db)) return sendError(res, 403, 'Forbidden', 'Admin access required');

  const { categoryId, difficulty, type, limit = 50, offset = 0 } = req.query;
  let questions = db.get('questions');
  if (categoryId) questions = questions.filter({ categoryId });
  if (difficulty) questions = questions.filter({ difficulty });
  if (type) questions = questions.filter({ type });

  const total = questions.size().value();
  const results = questions.slice(Number(offset), Number(offset) + Number(limit)).value();
  res.json({ questions: results, total });
});

server.post('/api/admin/answers/:answerId/grade', (req, res) => {
  const db = router.db;
  if (!isAdmin(req, db)) return sendError(res, 403, 'Forbidden', 'Admin access required');

  const { answerId } = req.params;
  const { rubricScores, generalFeedback } = req.body;

  const answer = db.get('answers').find({ answerId });
  if (!answer.value()) return sendError(res, 404, 'NotFound', 'Answer not found');

  const totalPoints = rubricScores.reduce((sum, r) => sum + r.earnedPoints, 0);

  answer.assign({
    status: totalPoints > 0 ? 'partial' : 'incorrect',
    pointsEarned: totalPoints,
    rubricScores,
    feedback: generalFeedback
  }).write();

  const session = db.get('sessions').find({ sessionId: answer.value().sessionId });
  if (session.value()) {
    session.assign({ currentScore: session.value().currentScore + totalPoints }).write();
  }

  res.json({
    answerId,
    status: answer.value().status,
    pointsEarned: totalPoints,
    rubricScores,
    feedback: generalFeedback
  });
});

server.use(router);

server.listen(PORT, () => {
  console.log(`🚀 Mock Quiz API Server running at http://localhost:${PORT}`);
  console.log(`\n📖 Endpoints:`);
  console.log(`   POST /api/auth/github/callback  - Авторизация (любой code)`);
  console.log(`   GET  /api/auth/me               - Текущий пользователь`);
  console.log(`   GET  /api/categories            - Список категорий`);
  console.log(`   GET  /api/questions             - Вопросы (только в game mode)`);
  console.log(`   POST /api/sessions              - Создать сессию + получить вопросы`);
  console.log(`   POST /api/sessions/:id/answers  - Отправить ответ`);
  console.log(`   POST /api/sessions/:id/submit   - Завершить сессию`);
  console.log(`   GET  /api/sessions/:id/results  - Результаты сессии`);
  console.log(`\n💡 Текущий режим: battle (вопросы скрыты, нужна сессия)`);
  console.log(`   Для смены режима: PUT /api/mode (требует admin токен)`);
});
