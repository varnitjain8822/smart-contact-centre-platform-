// Test env (no real secrets). Must run before any src import reads config.
Object.assign(process.env, {
  NODE_ENV: 'test', MONGO_MEMORY: '1', JWT_SECRET: 'test-secret-test-secret-test-secret-123', WEB_ORIGIN: 'http://localhost:5173',
  CHATWOOT_URL: 'http://chatwoot.test', CHATWOOT_ACCOUNT_ID: '1', CHATWOOT_INBOX_ID: '7', CHATWOOT_ADMIN_TOKEN: 'admin-tok',
  CHATWOOT_BOT_TOKEN: 'bot-tok', CHATWOOT_INBOX_SECRET: 'inbox-secret', CHATWOOT_BOT_SECRET: 'bot-secret',
  CHATWOOT_TIMEOUT_MS: '200', AI_TIMEOUT_MS: '200', LOG_LEVEL: 'error', GROQ_API_KEY: '',
  EMBED_MODEL: process.env.EVAL ? 'Xenova/multilingual-e5-small' : 'off',   // unit tests never load the model; `npm run eval` does
  UPLOAD_DIR: `${process.env.TMPDIR ?? '/tmp'}/smartcc-test-uploads-${process.pid}`,
});
