import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import SpotifyProvider from "next-auth/providers/spotify";

const handler = NextAuth({
  providers: [
    // 1. Google (YouTube)
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
    // 2. Spotify (Nouveau !)
    SpotifyProvider({
      clientId: process.env.SPOTIFY_CLIENT_ID || "",
      clientSecret: process.env.SPOTIFY_CLIENT_SECRET || "",
      authorization: {
        params: {
          // On demande l'historique d'écoute et les likes
          scope: "user-read-email user-library-read user-read-recently-played user-top-read"
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, account }) {
      // Si c'est une connexion initiale (Google ou Spotify)
      if (account) {
        token.accessToken = account.access_token;
        token.provider = account.provider; // On retient si c'est "google" ou "spotify"
      }
      return token;
    },
    async session({ session, token }) {
      // On passe les infos au frontend
      // @ts-ignore (On ignore l'erreur TS temporaire sur les types custom)
      session.accessToken = token.accessToken;
      // @ts-ignore
      session.provider = token.provider; 
      return session;
    }
  },
  // Page de login personnalisée (optionnel mais propre)
  pages: {
    signIn: '/', 
  }
});

export { handler as GET, handler as POST };
