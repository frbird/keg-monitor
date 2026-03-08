const request = require('supertest');
const app = require('../../server/index.js');

describe('Auth API', () => {
  describe('POST /api/admin/login', () => {
    it('returns 401 for missing credentials', async () => {
      await request(app)
        .post('/api/admin/login')
        .send({})
        .expect(401);
    });

    it('returns 401 for wrong password', async () => {
      await request(app)
        .post('/api/admin/login')
        .set('Content-Type', 'application/json')
        .send({ username: 'admin', password: 'wrong' })
        .expect(401);
    });

    it('returns 200 and username for valid credentials', async () => {
      const res = await request(app)
        .post('/api/admin/login')
        .set('Content-Type', 'application/json')
        .send({ username: 'admin', password: 'admin' })
        .expect(200);
      expect(res.body).toHaveProperty('username', 'admin');
    });
  });

  describe('GET /api/admin/me', () => {
    it('returns 401 when not logged in', async () => {
      await request(app).get('/api/admin/me').expect(401);
    });

    it('returns user when session exists', async () => {
      const agent = request.agent(app);
      await agent.post('/api/admin/login').send({ username: 'admin', password: 'admin' }).expect(200);
      const res = await agent.get('/api/admin/me').expect(200);
      expect(res.body).toHaveProperty('username', 'admin');
    });
  });
});
