server/
├── app.js
├── server.js

├── config/
│ ├── database.js
│ ├── redis.js
│ └── paystack.js

├── models/
├── routes/
├── controllers/

├── services/
│ ├── discovery.service.js
│ ├── payment.service.js
│ └── token.service.js

├── sockets/
│ └── index.js

├── middleware/
│ ├── auth.middleware.js
│ ├── rateLimiter.middleware.js
│ ├── validate.middleware.js
│ └── errorHandler.middleware.js

├── utils/
│ ├── location.js # haversine + bounding box
│ ├── paginate.js # cursor-based pagination
│ └── logger.js

└── jobs/
└── webhook.processor.js
