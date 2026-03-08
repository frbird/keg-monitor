const request = require('supertest');
const app = require('../../server/index.js');

describe('Dashboard API (public)', () => {
  describe('GET /api/dashboard', () => {
    it('returns taps and settings without auth', async () => {
      const res = await request(app).get('/api/dashboard').expect(200);
      expect(res.body).toHaveProperty('taps');
      expect(res.body).toHaveProperty('settings');
      expect(Array.isArray(res.body.taps)).toBe(true);
      expect(res.body.settings).toMatchObject({
        title: expect.any(String),
        showKegSize: expect.any(Boolean),
        tempUnit: expect.stringMatching(/^F|C$/),
        showDevice: expect.any(Boolean),
      });
    });
  });
});
