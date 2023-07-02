const express = require('express');
const router = express.Router();
const bodyParser = require('body-parser');

// Import middleware functions from auth.js
const { allowCrossDomain } = require('../auth');

router.use(allowCrossDomain);
router.use(bodyParser.urlencoded({ extended: true }));
router.use(bodyParser.json());

router.post('/api/call', (req, res) => {
	const apiKey = req.body.apiKey;

	// Check the allowed origins before making the API call
	const allowedOrigins = JSON.parse(process.env.ALLOWED_ORIGINS);
	const origin = req.headers.origin;
	if (!allowedOrigins.includes(origin)) {
		return res.status(403).json({ message: 'Access Forbidden' });
	}

	res.json({ success: true });
});

module.exports = router;
