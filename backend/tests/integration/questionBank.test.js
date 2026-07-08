const request = require('supertest');
const app = require('../../server');
const { createTestUser } = require('../factories/userFactory');
const { getAuthCookie } = require('../helpers/authHelper');
const QuestionBank = require('../../models/QuestionBank');

describe('Question Bank Integration Tests (T-15)', () => {
  let user1Cookie, user2Cookie;
  let user1, user2;

  beforeEach(async () => {
    user1 = await createTestUser({ email: 'user1@quiz.com', password: 'Password123!' });
    user1Cookie = await getAuthCookie('user1@quiz.com', 'Password123!');
    
    user2 = await createTestUser({ email: 'user2@quiz.com', password: 'Password123!' });
    user2Cookie = await getAuthCookie('user2@quiz.com', 'Password123!');
  });

  it('should save a valid question to the bank', async () => {
    const res = await request(app)
      .post('/api/question-bank')
      .set('Cookie', user1Cookie)
      .send({
        question: 'What is the capital of France?',
        options: ['London', 'Berlin', 'Paris', 'Madrid'],
        correctAnswer: 2,
        subject: 'Geography'
      });
      
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.question.question).toBe('What is the capital of France?');
    
    const dbQuestion = await QuestionBank.findById(res.body.question._id);
    expect(dbQuestion).toBeTruthy();
    expect(dbQuestion.creator.toString()).toBe(user1._id.toString());
  });
  
  it('should prevent saving question with missing fields', async () => {
    const res = await request(app)
      .post('/api/question-bank')
      .set('Cookie', user1Cookie)
      .send({
        question: 'Incomplete question?'
        // missing options, correctAnswer, subject
      });
      
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('should retrieve questions for the current user only', async () => {
    // Save question for user1
    await request(app)
      .post('/api/question-bank')
      .set('Cookie', user1Cookie)
      .send({
        question: 'User 1 Question',
        options: ['A', 'B'],
        correctAnswer: 0,
        subject: 'Math'
      });
      
    // Save question for user2
    await request(app)
      .post('/api/question-bank')
      .set('Cookie', user2Cookie)
      .send({
        question: 'User 2 Question',
        options: ['A', 'B'],
        correctAnswer: 0,
        subject: 'Science'
      });
      
    const res1 = await request(app).get('/api/question-bank').set('Cookie', user1Cookie);
    expect(res1.status).toBe(200);
    expect(res1.body.questions.length).toBe(1);
    expect(res1.body.questions[0].question).toBe('User 1 Question');
    
    const res2 = await request(app).get('/api/question-bank').set('Cookie', user2Cookie);
    expect(res2.body.questions.length).toBe(1);
    expect(res2.body.questions[0].question).toBe('User 2 Question');
  });
  
  it('should filter questions by subject', async () => {
    // Save 2 questions with different subjects
    await request(app).post('/api/question-bank').set('Cookie', user1Cookie)
      .send({ question: 'Q1', options: ['A','B'], correctAnswer: 0, subject: 'Math' });
    await request(app).post('/api/question-bank').set('Cookie', user1Cookie)
      .send({ question: 'Q2', options: ['C','D'], correctAnswer: 1, subject: 'Science' });
      
    const res = await request(app).get('/api/question-bank?subject=Math').set('Cookie', user1Cookie);
    expect(res.status).toBe(200);
    expect(res.body.questions.length).toBe(1);
    expect(res.body.questions[0].subject).toBe('Math');
  });

  it('should allow user to delete their own question', async () => {
    const saveRes = await request(app)
      .post('/api/question-bank')
      .set('Cookie', user1Cookie)
      .send({
        question: 'Delete me',
        options: ['1', '2'],
        correctAnswer: 0,
        subject: 'Test'
      });
      
    const qId = saveRes.body.question._id;
    
    const deleteRes = await request(app).delete(`/api/question-bank/${qId}`).set('Cookie', user1Cookie);
    expect(deleteRes.status).toBe(200);
    
    const dbQuestion = await QuestionBank.findById(qId);
    expect(dbQuestion).toBeNull();
  });

  it('should prevent user from deleting another users question', async () => {
    const saveRes = await request(app)
      .post('/api/question-bank')
      .set('Cookie', user1Cookie)
      .send({
        question: 'User 1 Question',
        options: ['1', '2'],
        correctAnswer: 0,
        subject: 'Test'
      });
      
    const qId = saveRes.body.question._id;
    
    // User 2 tries to delete User 1's question
    const deleteRes = await request(app).delete(`/api/question-bank/${qId}`).set('Cookie', user2Cookie);
    expect(deleteRes.status).toBe(403);
    
    const dbQuestion = await QuestionBank.findById(qId);
    expect(dbQuestion).toBeTruthy(); // Still exists
  });
});
