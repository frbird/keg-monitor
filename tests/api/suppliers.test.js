const request = require('supertest');
const app = require('../../server/index.js');

function login(agent) {
  return agent.post('/api/admin/login').set('Content-Type', 'application/json').send({ username: 'admin', password: 'admin' });
}

describe('Suppliers API (CRUD)', () => {
  let agent;

  beforeAll(() => {
    agent = request.agent(app);
  });

  beforeEach(async () => {
    await login(agent);
  });

  describe('GET /api/admin/suppliers', () => {
    it('returns array of suppliers', async () => {
      const res = await agent.get('/api/admin/suppliers').expect(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('POST /api/admin/suppliers', () => {
    it('creates a supplier and returns id', async () => {
      const res = await agent
        .post('/api/admin/suppliers')
        .set('Content-Type', 'application/json')
        .send({ name: 'Test Supplier', email: 'test@example.com' })
        .expect(201);
      expect(res.body).toHaveProperty('id');
    });

    it('returns 400 when name missing', async () => {
      await agent
        .post('/api/admin/suppliers')
        .set('Content-Type', 'application/json')
        .send({})
        .expect(400);
    });
  });

  describe('PUT /api/admin/suppliers/:id', () => {
    it('updates a supplier', async () => {
      const create = await agent.post('/api/admin/suppliers').set('Content-Type', 'application/json').send({ name: 'Original' }).expect(201);
      await agent
        .put(`/api/admin/suppliers/${create.body.id}`)
        .set('Content-Type', 'application/json')
        .send({ name: 'Updated Supplier', phone: '555-1234' })
        .expect(200);
      const list = await agent.get('/api/admin/suppliers').expect(200);
      const found = list.body.find((s) => s.id === create.body.id);
      expect(found).toBeDefined();
      expect(found.name).toBe('Updated Supplier');
    });
  });

  describe('DELETE /api/admin/suppliers/:id', () => {
    it('deletes a supplier', async () => {
      const create = await agent.post('/api/admin/suppliers').set('Content-Type', 'application/json').send({ name: 'To Delete' }).expect(201);
      await agent.delete(`/api/admin/suppliers/${create.body.id}`).expect(200);
      const list = await agent.get('/api/admin/suppliers').expect(200);
      expect(list.body.some((s) => s.id === create.body.id)).toBe(false);
    });
  });
});
