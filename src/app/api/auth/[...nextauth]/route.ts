import NextAuth, { NextAuthOptions } from 'next-auth';
import { UserPreferences, UserSession } from '@/types';

const authOptions: NextAuthOptions = {
  providers: [
    // Add providers as needed - for now, allow anonymous sessions
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async jwt({ token, user, account }) {
      // Persist user data to the token
      if (user) {
        token.userId = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      // Send properties to the client
      if (token && session.user) {
        (session.user as any).id = token.userId as string;
      }
      return session;
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };