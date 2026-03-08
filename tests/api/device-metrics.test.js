const request = require('supertest');
const app = require('../../server/index.js');

describe('Device metrics API (device auth)', () => {
  const deviceId = 'test-device';
  const deviceSecret = 'test-secret';

  it('returns 401 without credentials', async () => {
    await request(app)
      .post('/api/device/metrics')
      .set('Content-Type', 'application/json')
      .send({ temperatures: [{ celsius: 5 }] })
      .expect(401);
  });

  it('returns 401 with wrong secret', async () => {
    await request(app)
      .post('/api/device/metrics')
      .set('X-Device-Id', deviceId)
      .set('X-Device-Secret', 'wrong-secret')
      .set('Content-Type', 'application/json')
      .send({ temperatures: [{ celsius: 5 }] })
      .expect(401);
  });

  it('returns 400 when no temperatures or pours', async () => {
    await request(app)
      .post('/api/device/metrics')
      .set('X-Device-Id', deviceId)
      .set('X-Device-Secret', deviceSecret)
      .set('Content-Type', 'application/json')
      .send({})
      .expect(400);
  });

  it('accepts temperatures and returns 200', async () => {
    const res = await request(app)
      .post('/api/device/metrics')
      .set('X-Device-Id', deviceId)
      .set('X-Device-Secret', deviceSecret)
      .set('Content-Type', 'application/json')
      .send({ temperatures: [{ celsius: 12.5 }] })
      .expect(200);
    expect(res.body).toHaveProperty('ok', true);
  });

  it('accepts heartbeat and returns 200', async () => {
    const res = await request(app)
      .post('/api/device/heartbeat')
      .set('X-Device-Id', deviceId)
      .set('X-Device-Secret', deviceSecret)
      .expect(200);
    expect(res.body).toHaveProperty('ok', true);
  });
});
