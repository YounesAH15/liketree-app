import NextAuth, { DefaultSession } from "next-auth"

// On étend la définition officielle de "Session"
declare module "next-auth" {
  interface Session {
    // On ajoute notre fameux accessToken
    accessToken?: string & DefaultSession["user"]
    user: {
      id?: string
    } & DefaultSession["user"]
  }
}

// On étend aussi la définition du JWT (le token crypté)
declare module "next-auth/jwt" {
  interface JWT {
    accessToken?: string
  }
}