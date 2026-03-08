const request = require('supertest');
const app = require('../../server/index.js');

function login(agent) {
  return agent.post('/api/admin/login').set('Content-Type', 'application/json').send({ username: 'admin', password: 'admin' });
}

describe('Devices API', () => {
  let agent;

  beforeAll(() => {
    agent = request.agent(app);
  });

  beforeEach(async () => {
    await login(agent);
  });

  describe('GET /api/admin/devices', () => {
    it('returns array of devices', async () => {
      const res = await agent.get('/api/admin/devices').expect(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('POST /api/admin/devices', () => {
    it('creates a device and returns id and secret', async () => {
      const res = await agent
        .post('/api/admin/devices')
        .set('Content-Type', 'application/json')
        .send({ name: 'Test Device' })
        .expect(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body).toHaveProperty('secret');
    });
  });

  describe('PUT /api/admin/devices/:id', () => {
    it('updates device name', async () => {
      const list = await agent.get('/api/admin/devices').expect(200);
      const deviceId = list.body.find((d) => d.id === 'test-device')?.id || list.body[0]?.id;
      if (!deviceId) return;
      await agent
        .put(`/api/admin/devices/${deviceId}`)
        .set('Content-Type', 'application/json')
        .send({ name: 'Renamed Device' })
        .expect(200);
    });
  });

  describe('DELETE /api/admin/devices/:id', () => {
    it('deletes a device created in test', async () => {
      const create = await agent.post('/api/admin/devices').set('Content-Type', 'application/json').send({}).expect(201);
      await agent.delete(`/api/admin/devices/${create.body.id}`).expect(200);
    });
  });
});
