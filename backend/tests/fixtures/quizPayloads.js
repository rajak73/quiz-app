const validQuiz = {
  title: 'Integration Test Quiz',
  description: 'A quiz created for integration testing.',
  type: 'public',
  duration: 15,
  subject: 'Math',
  questions: [
    {
      question: 'What is 2 + 2?',
      options: ['3', '4', '5', '6'],
      correctAnswer: 1,
      explanation: 'Basic addition'
    },
    {
      question: 'What is 5 * 5?',
      options: ['10', '20', '25', '30'],
      correctAnswer: 2,
      explanation: 'Basic multiplication'
    }
  ]
};

const validGroupwiseQuiz = {
  ...validQuiz,
  type: 'groupwise',
  maxParticipants: 5
};

const invalidQuiz = {
  description: 'Missing title, type, subject, and questions'
};

module.exports = {
  validQuiz,
  validGroupwiseQuiz,
  invalidQuiz
};
