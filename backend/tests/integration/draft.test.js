const request = require('supertest');
const app = require('../../server');
const { createTestUser } = require('../factories/userFactory');
const { getAuthCookie } = require('../helpers/authHelper');
const Test = require('../../models/Test');

describe('Draft Auto-save Integration Tests (T-14)', () => {
  let creatorCookie;
  let creator;

  beforeEach(async () => {
    creator = await createTestUser({ email: 'draftcreator@quiz.com', password: 'Password123!' });
    creatorCookie = await getAuthCookie('draftcreator@quiz.com', 'Password123!');
  });

  it('should save a new draft with minimal data', async () => {
    const res = await request(app)
      .post('/api/tests/draft')
      .set('Cookie', creatorCookie)
      .send({ title: 'My Initial Draft' });
      
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.testId).toBeDefined();

    const dbDraft = await Test.findById(res.body.testId);
    expect(dbDraft.status).toBe('draft');
    expect(dbDraft.title).toBe('My Initial Draft');
  });

  it('should update an existing draft', async () => {
    // 1. Create draft
    const createRes = await request(app)
      .post('/api/tests/draft')
      .set('Cookie', creatorCookie)
      .send({ title: 'My Initial Draft' });
      
    const draftId = createRes.body.testId;

    // 2. Update draft
    const updateRes = await request(app)
      .put(`/api/tests/draft/${draftId}`)
      .set('Cookie', creatorCookie)
      .send({
        title: 'Updated Draft',
        subject: 'Math',
        questions: [{ question: '1+1?', options: ['1','2','3','4'], correctAnswer: 1 }]
      });

    expect(updateRes.status).toBe(200);
    
    const dbDraft = await Test.findById(draftId);
    expect(dbDraft.title).toBe('Updated Draft');
    expect(dbDraft.subject).toBe('Math');
    expect(dbDraft.questions.length).toBe(1);
  });

  it('should finalize a draft into a waiting test', async () => {
    // 1. Create a draft with complete info
    const createRes = await request(app)
      .post('/api/tests/draft')
      .set('Cookie', creatorCookie)
      .send({
        title: 'Ready to Finalize',
        subject: 'Science',
        type: 'public',
        questions: [{ question: 'Water formula?', options: ['H2O','CO2'], correctAnswer: 0 }]
      });
      
    const draftId = createRes.body.testId;

    // 2. Finalize
    const finalizeRes = await request(app)
      .post(`/api/tests/${draftId}/finalize`)
      .set('Cookie', creatorCookie)
      .send({
        title: 'Ready to Finalize',
        subject: 'Science',
        type: 'public',
        questions: [{ question: 'Water formula?', options: ['H2O','CO2'], correctAnswer: 0 }]
      });
      
    expect(finalizeRes.status).toBe(200);
    expect(finalizeRes.body.success).toBe(true);
    expect(finalizeRes.body.test.status).toBe('waiting');

    const dbDraft = await Test.findById(draftId);
    expect(dbDraft.status).toBe('waiting');
  });
  
  it('should fail to finalize an incomplete draft', async () => {
    // 1. Create a draft with missing questions
    const createRes = await request(app)
      .post('/api/tests/draft')
      .set('Cookie', creatorCookie)
      .send({ title: 'Incomplete Draft' });
      
    const draftId = createRes.body.testId;

    // 2. Finalize without questions
    const finalizeRes = await request(app)
      .post(`/api/tests/${draftId}/finalize`)
      .set('Cookie', creatorCookie)
      .send({
        title: 'Incomplete Draft',
        subject: 'Science',
        type: 'public'
        // missing questions
      });
      
    expect(finalizeRes.status).toBe(400);
    expect(finalizeRes.body.success).toBe(false);

    const dbDraft = await Test.findById(draftId);
    expect(dbDraft.status).toBe('draft');
  });
});
