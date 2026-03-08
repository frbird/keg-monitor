const request = require('supertest');
const app = require('../../server/index.js');

function login(agent) {
  return agent.post('/api/admin/login').set('Content-Type', 'application/json').send({ username: 'admin', password: 'admin' });
}

describe('Beers API (CRUD)', () => {
  let agent;

  beforeAll(() => {
    agent = request.agent(app);
  });

  beforeEach(async () => {
    await login(agent);
  });

  describe('GET /api/admin/beers', () => {
    it('returns array of beers', async () => {
      const res = await agent.get('/api/admin/beers').expect(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('POST /api/admin/beers', () => {
    it('creates a beer and returns id', async () => {
      const res = await agent
        .post('/api/admin/beers')
        .set('Content-Type', 'application/json')
        .send({ brewery: 'Test Brew', beer_style: 'IPA', name: 'Test Beer' })
        .expect(201);
      expect(res.body).toHaveProperty('id');
      expect(typeof res.body.id).toBe('number');
    });

    it('returns 400 when required fields missing', async () => {
      await agent
        .post('/api/admin/beers')
        .set('Content-Type', 'application/json')
        .send({ brewery: 'Only Brew' })
        .expect(400);
    });
  });

  describe('PUT /api/admin/beers/:id', () => {
    it('updates a beer', async () => {
      const create = await agent.post('/api/admin/beers').set('Content-Type', 'application/json').send({ brewery: 'B', beer_style: 'S', name: 'N' }).expect(201);
      const id = create.body.id;
      const res = await agent
        .put(`/api/admin/beers/${id}`)
        .set('Content-Type', 'application/json')
        .send({ brewery: 'Updated', beer_style: 'Lager', name: 'Updated Name' })
        .expect(200);
      expect(res.body).toHaveProperty('ok', true);
      const list = await agent.get('/api/admin/beers').expect(200);
      const found = list.body.find((b) => b.id === id);
      expect(found).toBeDefined();
      expect(found.brewery).toBe('Updated');
      expect(found.name).toBe('Updated Name');
    });

    it('returns 404 for non-existent id', async () => {
      await agent
        .put('/api/admin/beers/99999')
        .set('Content-Type', 'application/json')
        .send({ brewery: 'X', beer_style: 'Y', name: 'Z' })
        .expect(404);
    });

    it('returns 400 when required fields missing', async () => {
      const create = await agent.post('/api/admin/beers').set('Content-Type', 'application/json').send({ brewery: 'B', beer_style: 'S', name: 'N' }).expect(201);
      await agent
        .put(`/api/admin/beers/${create.body.id}`)
        .set('Content-Type', 'application/json')
        .send({ brewery: '', beer_style: 'S', name: 'N' })
        .expect(400);
    });
  });

  describe('DELETE /api/admin/beers/:id', () => {
    it('deletes a beer', async () => {
      const create = await agent.post('/api/admin/beers').set('Content-Type', 'application/json').send({ brewery: 'Del', beer_style: 'S', name: 'Del' }).expect(201);
      const id = create.body.id;
      await agent.delete(`/api/admin/beers/${id}`).expect(200);
      const list = await agent.get('/api/admin/beers').expect(200);
      expect(list.body.some((b) => b.id === id)).toBe(false);
    });

    it('returns 404 for non-existent id', async () => {
      await agent.delete('/api/admin/beers/99999').expect(404);
    });
  });
});
