// backend/config/passport.ts

import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import * as userService from '../services/user.service.ts'; 
import { generateAuthToken } from '../utils/jwt.util.ts'; 

// Đọc biến môi trường (Giả định bạn đã cài đặt dotenv hoặc đã có config load .env)
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
      
      // Gọi hàm service vừa tạo để tìm/tạo người dùng
      const user = await userService.findOrCreateByGoogleId({ email, name, googleId });
      
      // Tạo JWT cho người dùng
      const token = generateAuthToken(user);
      
      // Thành công, truyền đối tượng người dùng và token
      return done(null, { user, token }); 
    } catch (err) {
      return done(err, undefined);
    }
  }
));

// Dù dùng JWT, Passport vẫn cần serialize/deserialize user
passport.serializeUser((data, done) => {
    // data là đối tượng { user, token } từ hàm verify ở trên
    done(null, data); 
});
passport.deserializeUser((data: any, done) => {
    done(null, data);
});

export default passport;