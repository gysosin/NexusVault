const redis = require('redis');

const { REDIS_URL } = require('../config/env');

const redisUrl = REDIS_URL;
const cache = redis.createClient({ url: redisUrl });

cache.on('error', (err) => {
  console.error('Redis error', err);
});

cache.on('connect', () => {
  console.log('Redis client connected');
});

cache.connect().catch((err) => {
  console.error('Failed to connect to Redis', err);
});

module.exports = cache;
