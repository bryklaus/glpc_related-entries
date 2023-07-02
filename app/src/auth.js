const allowCrossDomain = function(req, res, next) {
    const allowedOrigins = JSON.parse(process.env.ALLOWED_ORIGINS);
    const origin = req.headers.origin;

    if (req.url.startsWith('/css/') || req.url.startsWith('/img/') || req.url.startsWith('/js/')) {
        // Allow public access to the /static subfolder
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET');
    } else if (allowedOrigins.includes(origin)) {
        // Allow CORS for the specified origins
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE');
        res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type');
        res.setHeader('Access-Control-Allow-Credentials', 'true');
    } else {
        res.status(403).send('Access Forbidden');
        return;
    }

    if (req.method === 'OPTIONS') {
        // Respond to preflight request
        res.status(200).end();
    } else {
        // Continue processing the actual request
        next();
    }
};

module.exports = {
    allowCrossDomain
};
