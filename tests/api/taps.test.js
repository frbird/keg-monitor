const request = require('supertest');
const app = require('../../server/index.js');

function login(agent) {
  return agent.post('/api/admin/login').set('Content-Type', 'application/json').send({ username: 'admin', password: 'admin' });
}

describe('Taps API (CRUD)', () => {
  let agent;

  beforeAll(() => {
    agent = request.agent(app);
  });

  beforeEach(async () => {
    await login(agent);
  });

  describe('GET /api/admin/taps', () => {
    it('returns array of taps', async () => {
      const res = await agent.get('/api/admin/taps').expect(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('POST /api/admin/taps', () => {
    it('creates a tap and returns id', async () => {
      const res = await agent
        .post('/api/admin/taps')
        .set('Content-Type', 'application/json')
        .send({ name: 'Tap Test', keg_size_id: 1 })
        .expect(201);
      expect(res.body).toHaveProperty('id');
    });
  });

  describe('PUT /api/admin/taps/:id', () => {
    it('updates a tap', async () => {
      const create = await agent.post('/api/admin/taps').set('Content-Type', 'application/json').send({ name: 'Tap', keg_size_id: 1 }).expect(201);
      await agent
        .put(`/api/admin/taps/${create.body.id}`)
        .set('Content-Type', 'application/json')
        .send({ name: 'Tap Updated' })
        .expect(200);
      const list = await agent.get('/api/admin/taps').expect(200);
      const found = list.body.find((t) => t.id === create.body.id);
      expect(found).toBeDefined();
      expect(found.name).toBe('Tap Updated');
    });
  });

  describe('DELETE /api/admin/taps/:id', () => {
    it('deletes a tap', async () => {
      const create = await agent.post('/api/admin/taps').set('Content-Type', 'application/json').send({ name: 'Tap Del', keg_size_id: 1 }).expect(201);
      await agent.delete(`/api/admin/taps/${create.body.id}`).expect(200);
      const list = await agent.get('/api/admin/taps').expect(200);
      expect(list.body.some((t) => t.id === create.body.id)).toBe(false);
    });
  });
});
