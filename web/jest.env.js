// Jest environment setup - loads environment variables
const { config } = require('dotenv');
const { join } = require('path');

// Load environment variables same way as Next.js config
const rootDir = join(__dirname, '..');
const webDir = __dirname;

// Load from root directory first (lower priority)
config({ path: join(rootDir, '.env.local') });
config({ path: join(rootDir, '.env') });

// Load from web directory second (higher priority - will override root)
config({ path: join(webDir, '.env.local') });
config({ path: join(webDir, '.env') });

// Set NODE_ENV for tests
process.env.NODE_ENV = 'test'; 