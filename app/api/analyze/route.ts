import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

// On initialise Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function POST(req: Request) {
  try {
    const { videos } = await req.json();

    if (!videos || videos.length === 0) {
      return NextResponse.json({ error: "Pas de vidéos fournies" }, { status: 400 });
    }
    // LE CORRECTIF DE SÉCURITÉ :
    // On filtre d'abord pour ne garder que les objets valides qui ont bien un titre.
    const validVideos = videos.filter((v: any) => v && v.snippet && v.snippet.title);

    // Ensuite seulement, on extrait les titres (on prend jusqu'à 500 pour être large)
    const titles = validVideos.slice(0, 500).map((v: any) => v.snippet.title).join("\n");

    const model = genAI.getGenerativeModel({ model: "gemini-pro-latest" });

    // LE PROMPT D'INGÉNIERIE (C'est ici que réside la valeur de ton business)
    const prompt = `
      Tu es un expert en psychologie comportementale et un consultant en carrière numérique.
      Voici les 1000 dernières vidéos aimées par un utilisateur sur YouTube :
      ---
      ${titles}
      ---
      
      Analyse cette liste et fournis une réponse au format JSON STRICT (sans markdown, juste le JSON) avec la structure suivante :
      {
        "archetype": "Un nom créatif pour ce profil (ex: L'Architecte Curieux, Le Philosophe Tech...)",
        "psychology": "Un paragraphe de 3 lignes analysant ce que ces vidéos disent de sa personnalité, ses peurs ou ses ambitions actuelles. Adopte un ton direct, bienveillant mais perspicace (tutoiement).",
        "skills": ["Compétence 1 détectée", "Compétence 2", "Compétence 3"],
        "business_idea": "Une idée concrète de projet ou de business qu'il pourrait lancer basé sur ce qu'il consomme (ex: Si beaucoup de cuisine + tech -> Une app de recettes AI)."
      }
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Nettoyage au cas où Gemini mettrait des balises markdown ```json
    const cleanText = text.replace(/```json/g, "").replace(/```/g, "").trim();

    return NextResponse.json(JSON.parse(cleanText));

  } catch (error) {
    console.error("Erreur Gemini:", error);
    return NextResponse.json({ error: "Erreur lors de l'analyse" }, { status: 500 });
  }
}