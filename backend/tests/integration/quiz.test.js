const request = require('supertest');
const app = require('../../server');
const payloads = require('../fixtures/quizPayloads');
const { createTestUser } = require('../factories/userFactory');
const { getAuthCookie } = require('../helpers/authHelper');
const Test = require('../../models/Test');

describe('Quiz Integration Tests', () => {
  let creatorCookie;
  let participantCookie;
  let creator;
  let participant;

  beforeEach(async () => {
    // Setup users fresh for each test due to DB clear
    creator = await createTestUser({ email: 'creator@quiz.com', password: 'Password123!' });
    participant = await createTestUser({ email: 'participant@quiz.com', password: 'Password123!' });
    
    creatorCookie = await getAuthCookie('creator@quiz.com', 'Password123!');
    participantCookie = await getAuthCookie('participant@quiz.com', 'Password123!');
  });

  describe('Quiz Creation & Update (T-11)', () => {
    it('should create a valid quiz', async () => {
      const res = await request(app)
        .post('/api/tests')
        .set('Cookie', creatorCookie)
        .send(payloads.validGroupwiseQuiz);
        
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.test.title).toBe(payloads.validGroupwiseQuiz.title);
      expect(res.body.test.secretCode).toBeDefined();
    });

    it('should block unauthenticated creation', async () => {
      const res = await request(app)
        .post('/api/tests')
        .send(payloads.validGroupwiseQuiz);
      expect(res.status).toBe(401);
    });

    it('should reject invalid quiz creation', async () => {
      const res = await request(app)
        .post('/api/tests')
        .set('Cookie', creatorCookie)
        .send(payloads.invalidQuiz);
      expect(res.status).toBe(400);
    });

    it('should allow creator to update quiz', async () => {
      let createRes = await request(app).post('/api/tests').set('Cookie', creatorCookie).send(payloads.validQuiz);
      let testId = createRes.body.test.id;

      const res = await request(app)
        .put(`/api/tests/${testId}`)
        .set('Cookie', creatorCookie)
        .send({ title: 'Updated Title', duration: 45 });
        
      expect(res.status).toBe(200);
      expect(res.body.test.title).toBe('Updated Title');
      expect(res.body.test.duration).toBe(45);
    });

    it('should prevent non-creator from updating quiz', async () => {
      let createRes = await request(app).post('/api/tests').set('Cookie', creatorCookie).send(payloads.validQuiz);
      let testId = createRes.body.test.id;

      const res = await request(app)
        .put(`/api/tests/${testId}`)
        .set('Cookie', participantCookie)
        .send({ title: 'Hacked Title' });
        
      expect(res.status).toBe(403);
    });
  });

  describe('Quiz Retrieval & Interactions (T-11)', () => {
    let publicTestId;
    let groupTestId;
    let groupSecretCode;

    beforeEach(async () => {
      // Create quizzes fresh for each interaction test
      let res1 = await request(app).post('/api/tests').set('Cookie', creatorCookie).send(payloads.validQuiz);
      publicTestId = res1.body.test.id;

      let res2 = await request(app).post('/api/tests').set('Cookie', creatorCookie).send(payloads.validGroupwiseQuiz);
      groupTestId = res2.body.test.id;
      groupSecretCode = res2.body.test.secretCode;
    });

    it('should list public tests', async () => {
      const res = await request(app)
        .get('/api/tests/public')
        .set('Cookie', participantCookie);
        
      expect(res.status).toBe(200);
      expect(res.body.tests.length).toBeGreaterThan(0);
      expect(res.body.tests[0].questions).toBeUndefined(); // public route omits questions entirely
    });

    it('should join groupwise quiz with valid secret code', async () => {
      const res = await request(app)
        .post(`/api/tests/${groupTestId}/join`)
        .set('Cookie', participantCookie)
        .send({ secretCode: groupSecretCode });
        
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should reject join with invalid secret code', async () => {
      const res = await request(app)
        .post(`/api/tests/${groupTestId}/join`)
        .set('Cookie', participantCookie)
        .send({ secretCode: 'WRONG' });
        
      expect(res.status).toBe(400);
    });

    it('should retrieve test details hiding correct answers for participants', async () => {
      // Participant joins
      await request(app).post(`/api/tests/${groupTestId}/join`).set('Cookie', participantCookie).send({ secretCode: groupSecretCode });
      
      const res = await request(app)
        .get(`/api/tests/${groupTestId}`)
        .set('Cookie', participantCookie);
        
      expect(res.status).toBe(200);
      const q = res.body.test.questions[0];
      expect(q.question).toBeDefined();
      expect(q.correctAnswer).toBeUndefined(); 
    });

    it('should allow creator to start test', async () => {
      const res = await request(app)
        .post(`/api/tests/${groupTestId}/start`)
        .set('Cookie', creatorCookie);
        
      expect(res.status).toBe(200);
      
      const dbTest = await Test.findById(groupTestId);
      expect(dbTest.status).toBe('active');
    });

    it('should allow participant to submit answers', async () => {
      // Setup: Join -> Start
      await request(app).post(`/api/tests/${groupTestId}/join`).set('Cookie', participantCookie).send({ secretCode: groupSecretCode });
      await request(app).post(`/api/tests/${groupTestId}/start`).set('Cookie', creatorCookie);

      const res = await request(app)
        .post(`/api/tests/${groupTestId}/submit`)
        .set('Cookie', participantCookie)
        .send({ answers: [{ questionIndex: 0, selectedOption: 1 }, { questionIndex: 1, selectedOption: 2 }] });
        
      expect(res.status).toBe(200);
      expect(res.body.score).toBe(2);
    });

    it('should fetch results and block unauthorized access', async () => {
      await request(app).post(`/api/tests/${groupTestId}/join`).set('Cookie', participantCookie).send({ secretCode: groupSecretCode });
      await request(app).post(`/api/tests/${groupTestId}/start`).set('Cookie', creatorCookie);
      await request(app).post(`/api/tests/${groupTestId}/submit`).set('Cookie', participantCookie).send({ answers: [] });
      await request(app).post(`/api/tests/${groupTestId}/end`).set('Cookie', creatorCookie);

      const res = await request(app)
        .get(`/api/tests/${groupTestId}/results`)
        .set('Cookie', participantCookie);
        
      expect(res.status).toBe(200);
      expect(res.body.results.participants.length).toBeGreaterThan(0);
    });
  });

  describe('Quiz Deletion (T-11)', () => {
    it('should prevent non-creator from deleting', async () => {
      let createRes = await request(app).post('/api/tests').set('Cookie', creatorCookie).send(payloads.validQuiz);
      let testId = createRes.body.test.id;

      const res = await request(app)
        .delete(`/api/tests/${testId}`)
        .set('Cookie', participantCookie);
      expect(res.status).toBe(403);
    });

    it('should allow creator to delete test', async () => {
      let createRes = await request(app).post('/api/tests').set('Cookie', creatorCookie).send(payloads.validQuiz);
      let testId = createRes.body.test.id;

      const res = await request(app)
        .delete(`/api/tests/${testId}`)
        .set('Cookie', creatorCookie);
      expect(res.status).toBe(200);
      
      const check = await Test.findById(testId);
      expect(check).toBeNull();
    });
  });

  describe('Quiz Duplication (T-13)', () => {
    it('should duplicate a quiz successfully and reset runtime fields', async () => {
      let createRes = await request(app).post('/api/tests').set('Cookie', creatorCookie).send(payloads.validGroupwiseQuiz);
      let originalId = createRes.body.test.id;
      
      const res = await request(app)
        .post(`/api/tests/${originalId}/duplicate`)
        .set('Cookie', creatorCookie);
        
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.test.id).not.toBe(originalId);
      expect(res.body.test.title).toBe(`${payloads.validGroupwiseQuiz.title} (Copy)`);
      expect(res.body.test.status).toBe('waiting');
      
      // Verify db state
      const dup = await Test.findById(res.body.test.id).select('+secretCode');
      expect(dup.participants.length).toBe(0);
      expect(dup.questions.length).toBe(payloads.validGroupwiseQuiz.questions.length);
      expect(dup.secretCode).not.toBe(createRes.body.test.secretCode);
      expect(dup.secretCode).toBeTruthy();
    });

    it('should prevent non-creator from duplicating', async () => {
      let createRes = await request(app).post('/api/tests').set('Cookie', creatorCookie).send(payloads.validQuiz);
      let originalId = createRes.body.test.id;

      const res = await request(app)
        .post(`/api/tests/${originalId}/duplicate`)
        .set('Cookie', participantCookie);
        
      expect(res.status).toBe(403);
    });
    
    it('should return 404 for non-existent quiz', async () => {
      const fakeId = '5f8d0a2f4c9b3a1a5c6d7e8f';
      const res = await request(app)
        .post(`/api/tests/${fakeId}/duplicate`)
        .set('Cookie', creatorCookie);
        
      expect(res.status).toBe(404);
    });
  });
});

