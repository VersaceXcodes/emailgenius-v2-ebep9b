import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import pkg from 'pg';
import { betterAuth } from 'better-auth';
import { expo } from '@better-auth/expo';
import { toNodeHandler } from 'better-auth/node';

const { Pool } = pkg;

dotenv.config();

const { DATABASE_URL, PGHOST, PGDATABASE, PGUSER, PGPASSWORD, PGPORT = 5432 } = process.env;

const pool = new Pool(
  DATABASE_URL
    ? {
        connectionString: DATABASE_URL,
        ssl: { rejectUnauthorized: false },
      }
    : {
        host: PGHOST,
        database: PGDATABASE,
        user: PGUSER,
        password: PGPASSWORD,
        port: Number(PGPORT),
        ssl: { rejectUnauthorized: false },
      }
);

const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const port = Number(process.env.PORT || 3000);
const backendUrl = process.env.BETTER_AUTH_URL || process.env.BACKEND_URL || `http://localhost:${port}`;
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
const isProduction = process.env.NODE_ENV === 'production';
const rawTunnelDomain = (process.env.TUNNEL_DOMAIN || 'launchpulse.ai').replace(/^https?:\/\//, '').trim();
const tunnelDomain = rawTunnelDomain || 'launchpulse.ai';
const rawAppScheme = (process.env.EXPO_APP_SCHEME || process.env.APP_SCHEME || 'launchpulse').trim();
const appScheme = rawAppScheme.replace(/:\/\/.*$/, '').replace(/[^a-zA-Z0-9+.-]/g, '') || 'launchpulse';

const parseEnvList = (value?: string): string[] =>
  (value || '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);

const isLocalhostOrigin = (origin: string): boolean => /^https?:\/\/(localhost|127\.0\.0\.1)(?::\d+)?$/i.test(origin);

const isTrustedTunnelOrigin = (origin: string): boolean => {
  try {
    const parsed = new URL(origin);
    if (parsed.protocol !== 'https:') return false;
    const host = parsed.hostname.toLowerCase();

    if (host.endsWith('.launchpulse.ai')) {
      return true;
    }

    if (tunnelDomain && tunnelDomain !== 'launchpulse.ai') {
      return host.endsWith(`.${tunnelDomain.toLowerCase()}`);
    }

    return false;
  } catch {
    return false;
  }
};

const isTrustedModalOrigin = (origin: string): boolean => {
  try {
    const parsed = new URL(origin);
    return parsed.protocol === 'https:' && parsed.hostname.toLowerCase().endsWith('.modal.host');
  } catch {
    return false;
  }
};

const allowedOrigins = Array.from(
  new Set(
    [
      frontendUrl,
      process.env.EXPO_PUBLIC_FRONTEND_URL,
      ...parseEnvList(process.env.ALLOWED_ORIGINS),
    ].filter(Boolean) as string[]
  )
);

app.use(
  cors({
    origin: (origin, callback) => {
      const localhostOrigin = typeof origin === 'string' && isLocalhostOrigin(origin);
      const isTunnelOrigin = typeof origin === 'string' && isTrustedTunnelOrigin(origin);
      const modalOrigin = typeof origin === 'string' && isTrustedModalOrigin(origin);
      if (!origin || allowedOrigins.includes(origin) || localhostOrigin || isTunnelOrigin || modalOrigin) {
        callback(null, true);
        return;
      }
      callback(new Error('Origin not allowed by CORS'));
    },
    credentials: true,
  })
);
app.use(express.json({ limit: '5mb' }));
app.use(express.static(path.join(__dirname, 'public')));

const toHeaders = (headers: Record<string, string | string[] | undefined>): Headers => {
  const converted = new Headers();

  for (const [key, value] of Object.entries(headers)) {
    if (typeof value === 'string') {
      converted.set(key, value);
      continue;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        converted.append(key, item);
      }
    }
  }

  return converted;
};

const betterAuthSecret =
  process.env.BETTER_AUTH_SECRET?.trim() ||
  process.env.JWT_SECRET?.trim() ||
  crypto.randomBytes(32).toString('base64');

if (!process.env.BETTER_AUTH_SECRET) {
  console.warn(
    '[auth] BETTER_AUTH_SECRET is missing. Using a fallback secret for this process. ' +
      'Set BETTER_AUTH_SECRET in backend/.env to persist sessions across restarts.'
  );
}

const trustedOrigins = Array.from(
  new Set(
    [
      `${appScheme}://*/*`,
      'exp://*/*',
      'exps://*/*',
      'http://localhost:*',
      'http://127.0.0.1:*',
      `https://*.${tunnelDomain}`,
      'https://*.launchpulse.ai',
      'https://*.modal.host',
      frontendUrl,
      backendUrl,
      ...parseEnvList(process.env.ALLOWED_ORIGINS),
    ].filter(Boolean) as string[]
  )
);

const auth = betterAuth({
  database: pool,
  secret: betterAuthSecret,
  baseURL: backendUrl,
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
    requireEmailVerification: false,
  },
  trustedOrigins,
  plugins: [
    expo(),
  ],
  advanced: {
    crossSubDomainCookies: {
      enabled: true,
    },
    trustedProxyHeaders: true,
    disableCSRFCheck: true,
    // Local dev over HTTP cannot use SameSite=None cookies because browsers reject
    // them unless Secure=true. Keep production cross-site behavior, but use Lax in dev.
    defaultCookieAttributes: isProduction
      ? {
          sameSite: 'none',
          secure: true,
          partitioned: true,
        }
      : {
          sameSite: 'lax',
          secure: false,
        },
  },
});

interface AuthRequest extends express.Request {
  authSession?: any;
}

const attachSession: express.RequestHandler = async (req, _res, next) => {
  try {
    const session = await auth.api.getSession({
      headers: toHeaders(req.headers as Record<string, string | string[] | undefined>),
    });
    (req as AuthRequest).authSession = session;
  } catch (error) {
    console.warn('[auth] Failed to resolve session:', error instanceof Error ? error.message : error);
    (req as AuthRequest).authSession = null;
  }

  next();
};

const requireAuth: express.RequestHandler = (req, res, next) => {
  const authSession = (req as AuthRequest).authSession;
  if (!authSession?.user) {
    res.status(401).json({ message: 'Authentication required' });
    return;
  }

  next();
};

const initializeDatabase = async () => {
  const statements = [
    `CREATE TABLE IF NOT EXISTS "user" (
      "id" TEXT PRIMARY KEY,
      "name" TEXT NOT NULL,
      "email" TEXT NOT NULL UNIQUE,
      "emailVerified" BOOLEAN NOT NULL DEFAULT FALSE,
      "image" TEXT,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS "session" (
      "id" TEXT PRIMARY KEY,
      "expiresAt" TIMESTAMPTZ NOT NULL,
      "token" TEXT NOT NULL UNIQUE,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "ipAddress" TEXT,
      "userAgent" TEXT,
      "userId" TEXT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS "account" (
      "id" TEXT PRIMARY KEY,
      "accountId" TEXT NOT NULL,
      "providerId" TEXT NOT NULL,
      "userId" TEXT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
      "accessToken" TEXT,
      "refreshToken" TEXT,
      "idToken" TEXT,
      "accessTokenExpiresAt" TIMESTAMPTZ,
      "refreshTokenExpiresAt" TIMESTAMPTZ,
      "scope" TEXT,
      "password" TEXT,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS "verification" (
      "id" TEXT PRIMARY KEY,
      "identifier" TEXT NOT NULL,
      "value" TEXT NOT NULL,
      "expiresAt" TIMESTAMPTZ NOT NULL,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE INDEX IF NOT EXISTS "session_userId_idx" ON "session" ("userId")`,
    `CREATE INDEX IF NOT EXISTS "account_userId_idx" ON "account" ("userId")`,
    `CREATE INDEX IF NOT EXISTS "verification_identifier_idx" ON "verification" ("identifier")`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "account_provider_account_uidx" ON "account" ("providerId", "accountId")`,
    `CREATE TABLE IF NOT EXISTS "email_generation" (
      "id" TEXT PRIMARY KEY,
      "userId" TEXT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
      "topic" TEXT NOT NULL,
      "tone" TEXT NOT NULL,
      "generatedEmail" TEXT NOT NULL,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE INDEX IF NOT EXISTS "email_generation_userId_idx" ON "email_generation" ("userId")`,
    `CREATE TABLE IF NOT EXISTS "subscription" (
      "id" TEXT PRIMARY KEY,
      "userId" TEXT NOT NULL UNIQUE REFERENCES "user"("id") ON DELETE CASCADE,
      "stripeCustomerId" TEXT,
      "stripeSubscriptionId" TEXT,
      "stripePriceId" TEXT,
      "status" TEXT NOT NULL DEFAULT 'inactive',
      "currentPeriodStart" TIMESTAMPTZ,
      "currentPeriodEnd" TIMESTAMPTZ,
      "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE INDEX IF NOT EXISTS "subscription_userId_idx" ON "subscription" ("userId")`,
    `CREATE INDEX IF NOT EXISTS "subscription_stripeCustomerId_idx" ON "subscription" ("stripeCustomerId")`,
  ];

  for (const statement of statements) {
    await pool.query(statement);
  }

  console.log('Database initialized successfully');
};

// Better Auth routes
app.all('/api/auth/*', toNodeHandler(auth));

// Session helper route for frontend bootstrapping
app.get('/api/session', attachSession, (req, res) => {
  const authSession = (req as AuthRequest).authSession;
  res.json({
    session: authSession?.session ?? null,
    user: authSession?.user ?? null,
  });
});

// Example protected endpoint
app.get('/api/protected', attachSession, requireAuth, (req, res) => {
  const authSession = (req as AuthRequest).authSession;

  res.json({
    message: 'This is a protected endpoint',
    user: authSession.user,
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Save generated email to database
app.post('/api/emails/generate', attachSession, requireAuth, async (req, res) => {
  try {
    const authSession = (req as AuthRequest).authSession;
    const { topic, tone, generatedEmail } = req.body;

    if (!topic || !tone || !generatedEmail) {
      res.status(400).json({ message: 'Missing required fields' });
      return;
    }

    const id = crypto.randomBytes(16).toString('hex');
    
    await pool.query(
      'INSERT INTO "email_generation" ("id", "userId", "topic", "tone", "generatedEmail") VALUES ($1, $2, $3, $4, $5)',
      [id, authSession.user.id, topic, tone, generatedEmail]
    );

    res.json({ success: true, id });
  } catch (error) {
    console.error('Email save error:', error);
    res.status(500).json({ message: 'Failed to save email' });
  }
});

// Get user's email history
app.get('/api/emails/history', attachSession, requireAuth, async (req, res) => {
  try {
    const authSession = (req as AuthRequest).authSession;
    const limit = parseInt(req.query.limit as string) || 10;
    
    const result = await pool.query(
      'SELECT * FROM "email_generation" WHERE "userId" = $1 ORDER BY "createdAt" DESC LIMIT $2',
      [authSession.user.id, limit]
    );

    res.json({ emails: result.rows });
  } catch (error) {
    console.error('Email history error:', error);
    res.status(500).json({ message: 'Failed to fetch email history' });
  }
});

// Get user subscription status
app.get('/api/subscription/status', attachSession, requireAuth, async (req, res) => {
  try {
    const authSession = (req as AuthRequest).authSession;
    
    const result = await pool.query(
      'SELECT * FROM "subscription" WHERE "userId" = $1',
      [authSession.user.id]
    );

    if (result.rows.length === 0) {
      res.json({ 
        isSubscribed: false,
        status: 'inactive',
        subscription: null 
      });
      return;
    }

    const subscription = result.rows[0];
    const isActive = subscription.status === 'active' && 
                     (!subscription.currentPeriodEnd || new Date(subscription.currentPeriodEnd) > new Date());

    res.json({
      isSubscribed: isActive,
      status: subscription.status,
      subscription: {
        id: subscription.id,
        status: subscription.status,
        currentPeriodEnd: subscription.currentPeriodEnd,
      }
    });
  } catch (error) {
    console.error('Subscription status error:', error);
    res.status(500).json({ message: 'Failed to fetch subscription status' });
  }
});

// Create or update subscription
app.post('/api/subscription/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  // This would be called by Stripe webhooks in production
  // For now, we'll create a simple endpoint to update subscription status
  try {
    const { userId, stripeCustomerId, stripeSubscriptionId, status } = req.body;

    if (!userId) {
      res.status(400).json({ message: 'Missing userId' });
      return;
    }

    const id = crypto.randomBytes(16).toString('hex');
    
    await pool.query(
      `INSERT INTO "subscription" ("id", "userId", "stripeCustomerId", "stripeSubscriptionId", "status", "currentPeriodStart", "currentPeriodEnd", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW() + INTERVAL '1 month', NOW())
       ON CONFLICT ("userId") DO UPDATE SET
       "stripeCustomerId" = $3,
       "stripeSubscriptionId" = $4,
       "status" = $5,
       "currentPeriodEnd" = NOW() + INTERVAL '1 month',
       "updatedAt" = NOW()`,
      [id, userId, stripeCustomerId, stripeSubscriptionId, status || 'active']
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Subscription webhook error:', error);
    res.status(500).json({ message: 'Failed to update subscription' });
  }
});

app.get('/', (_req, res) => {
  res.json({ message: 'LaunchPulse backend boilerplate' });
});

// Catch-all route for SPA routing
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

export { app, pool, auth };

initializeDatabase()
  .then(() => {
    app.listen(port, '0.0.0.0', () => {
      console.log(`Server running on port ${port} and listening on 0.0.0.0`);
    });
  })
  .catch((error) => {
    console.error('Database initialization error:', error);
    process.exit(1);
  });
