const request = require('supertest');
const app = require('../../server/index.js');

function login(agent) {
  return agent.post('/api/admin/login').set('Content-Type', 'application/json').send({ username: 'admin', password: 'admin' });
}

describe('Dashboard settings API', () => {
  let agent;

  beforeAll(() => {
    agent = request.agent(app);
  });

  beforeEach(async () => {
    await login(agent);
  });

  describe('GET /api/admin/dashboard-settings', () => {
    it('returns current settings', async () => {
      const res = await agent.get('/api/admin/dashboard-settings').expect(200);
      expect(res.body).toHaveProperty('title');
      expect(res.body).toHaveProperty('logoUrl');
      expect(res.body).toHaveProperty('showKegSize');
      expect(res.body).toHaveProperty('tempUnit');
      expect(res.body).toHaveProperty('showDevice');
    });
  });

  describe('PUT /api/admin/dashboard-settings', () => {
    it('updates settings', async () => {
      const res = await agent
        .put('/api/admin/dashboard-settings')
        .set('Content-Type', 'application/json')
        .send({ title: 'My Kegs', tempUnit: 'C', showKegSize: false })
        .expect(200);
      expect(res.body.title).toBe('My Kegs');
      expect(res.body.tempUnit).toBe('C');
      expect(res.body.showKegSize).toBe(false);
      // Restore for other tests
      await agent.put('/api/admin/dashboard-settings').set('Content-Type', 'application/json').send({ title: 'Keg Monitor', tempUnit: 'F', showKegSize: true });
    });
  });
});
