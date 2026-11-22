// Integration tests run against a separate database (never the development or production one).
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? "mysql://ns:ns_dev_password@localhost:3306/nargis_shaz_test";
process.env.APP_URL = "http://localhost:3000";
process.env.PAYMENTS_TEST_PROVIDER = "1";
process.env.TEST_PAYMENTS_SECRET = "vitest-secret";
process.env.RATE_LIMIT_DISABLED = "1";
delete process.env.RESEND_API_KEY;
