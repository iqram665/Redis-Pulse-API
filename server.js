const express = require('express');
const redis = require('redis');
const axios = require('axios');

const app = express();
const PORT = 3000;

// ১. রেডিস ক্লায়েন্ট কনফিগারেশন
const redisClient = redis.createClient({
    url: 'redis://127.0.0.1:6379' 
});

redisClient.on('error', (err) => console.error('Redis Client Error:', err));
redisClient.on('connect', () => console.log('⚡ Redis Server-এর সাথে কানেকশন সফল!'));

(async () => {
    await redisClient.connect();
})();

// ২. ক্যাশিং এপিআই রাউট লজিক
app.get('/data/:id', async (req, res) => {
    const { id } = req.params;
    const cacheKey = `user-post:${id}`;

    try {
        // প্রথমে চেক করা হচ্ছে রেডিস মেমোরিতে ডাটা আছে কি না
        const cachedData = await redisClient.get(cacheKey);

        if (cachedData) {
            return res.json({
                source: 'Redis Cache (⚡ সুপার ফাস্ট)',
                data: JSON.parse(cachedData)
            });
        }

        // ক্যাশ মিস হলে মেইন এপিআই থেকে ডাটা আনা হবে
        console.log('রেডিস-এ নাই, মেইন API থেকে ডাটা আনা হচ্ছে...');
        const response = await axios.get(`https://jsonplaceholder.typicode.com/posts/${id}`);
        const apiData = response.data;

        // ডাটা ৬০ সেকেন্ডের জন্য রেডিস-এ ক্যাশ করে রাখা হচ্ছে
        await redisClient.set(cacheKey, JSON.stringify(apiData), {
            EX: 60
        });

        res.json({
            source: 'Main Database/API (স্লো ভিউ)',
            data: apiData
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'সার্ভারে সমস্যা হয়েছে!' });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 RedisPulse-API চালু হয়েছে: http://localhost:${PORT}`);
});