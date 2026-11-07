process.env.NODE_ENV = "test";
process.env.DB_NAME = process.env.DB_TEST_NAME ?? "rivr_hotel_test";
process.env.SESSION_SECRET = "test-session-secret-0123456789abcdef0123456789";
process.env.ALLOW_DEMO_RESET = "false";
process.env.SEED_ADMIN_EMAIL = "";
process.env.SEED_ADMIN_PASSWORD = "";
process.env.COOKIE_SECURE = "false";
process.env.WEB_ORIGIN = "http://localhost:5173";
