import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import * as userService from '../services/user.service.ts';
import { generateAuthToken } from '../utils/jwt.util.ts';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_CALLBACK_URL = process.env.BACKEND_URL_WITHOUT_SLASH + '/api/auth/google/callback';

passport.use(new GoogleStrategy({
  clientID: GOOGLE_CLIENT_ID!,
  clientSecret: GOOGLE_CLIENT_SECRET!,
  callbackURL: GOOGLE_CALLBACK_URL,
  scope: ['profile', 'email']
},
  async (accessToken, refreshToken, profile, done) => {
    try {
      const email = profile.emails?.[0].value;
      const name = profile.displayName;
      const googleId = profile.id;

      if (!email || !googleId) {
        return done(new Error("Google did not provide essential data (email/ID)"), undefined);
      }

      const user = await userService.findOrCreateByGoogleId({ email, name, googleId });

      if ((user as any).isBanned || ((user as any).bannedUntil && (user as any).bannedUntil > new Date())) {
        const reason = (user as any).bannedReason || '';
        const until = (user as any).bannedUntil ? (user as any).bannedUntil.toISOString() : undefined;
        return done(null, { banned: true, reason, until });
      }

      const token = generateAuthToken(user);

      return done(null, { user, token });
    } catch (err) {
      return done(err, undefined);
    }
  }
));

passport.serializeUser((data, done) => {
  done(null, data);
});
passport.deserializeUser((data: any, done) => {
  done(null, data);
});

export default passport;