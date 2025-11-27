import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import SpotifyProvider from "next-auth/providers/spotify";

const handler = NextAuth({
  providers: [
    // ... tes providers Google et Spotify (ne change rien ici) ...
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      authorization: {
        params: {
          scope: "openid email profile https://www.googleapis.com/auth/youtube.readonly",
          prompt: "consent",
          access_type: "offline",
          response_type: "code"
        }
      }
    }),
    SpotifyProvider({
      clientId: process.env.SPOTIFY_CLIENT_ID || "",
      clientSecret: process.env.SPOTIFY_CLIENT_SECRET || "",
      authorization: {
        params: {
          scope: "user-read-email user-library-read user-read-recently-played user-top-read"
        }
      }
    })
  ],
  callbacks: {
    // ... tes callbacks (ne change rien ici) ...
    async jwt({ token, account }) {
      if (account) {
        token.accessToken = account.access_token;
        token.provider = account.provider;
      }
      return token;
    },
    async session({ session, token }) {
      // @ts-ignore
      session.accessToken = token.accessToken;
      // @ts-ignore
      session.provider = token.provider; 
      return session;
    }
  },
  pages: {
    signIn: '/', 
  },
  
  // --- LE CORRECTIF EST ICI ---
  // On lui dit explicitement où trouver la clé, même s'il est un peu aveugle
  secret: process.env.NEXTAUTH_SECRET, 
  
  // Ajoute aussi ceci pour éviter les warnings en mode dev
  debug: process.env.NODE_ENV === 'development',
});

export { handler as GET, handler as POST };