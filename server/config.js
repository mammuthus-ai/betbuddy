import dotenv from 'dotenv';
dotenv.config();

export default {
  port: parseInt(process.env.PORT || process.env.SERVER_PORT || '3001'),
  jwtSecret: process.env.JWT_SECRET || 'flexorfold-dev-secret',
  google: {
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: '/auth/google/callback',
  },
  github: {
    clientID: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    callbackURL: '/auth/github/callback',
  },
  clientURL: process.env.CLIENT_URL || 'http://localhost:5173',
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY,
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
  },
};
