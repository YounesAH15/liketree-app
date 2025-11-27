import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function POST(req: Request) {
  try {
    const { youtubeAnalysis, spotifyAnalysis } = await req.json();

    if (!youtubeAnalysis || !spotifyAnalysis) {
      return NextResponse.json({ error: "Manque une des deux parties" }, { status: 400 });
    }

    const model = genAI.getGenerativeModel({ model: "gemini-pro-latest" });

    const prompt = `
      Agis comme un expert en psychologie comportementale de haut niveau.
      J'ai deux profils pour la même personne.
      
      PROFIL INTELLECTUEL (Basé sur ses likes YouTube) :
      Archetype: ${youtubeAnalysis.archetype}
      Psychologie: ${youtubeAnalysis.psychology}
      
      PROFIL ÉMOTIONNEL (Basé sur ses likes Spotify) :
      Archetype: ${spotifyAnalysis.archetype}
      Psychologie: ${spotifyAnalysis.psychology}
      
      TA MISSION :
      Fais la synthèse de ces deux facettes pour révéler la "Vraie Nature" de cette personne. Trouve les tensions intéressantes (ex: Un ingénieur rigoureux qui écoute du Punk chaotique) ou les synergies.
      
      Réponds en JSON STRICT :
      {
        "meta_archetype": "Un titre qui fusionne les deux aspects (ex: Le Punk Ingénieur)",
        "synthesis": "Analyse profonde de 4 lignes expliquant comment son intellect et ses émotions interagissent.",
        "life_advice": "Un conseil de vie unique basé sur cet équilibre.",
        "career_path": "Une voie professionnelle idéale qui satisferait à la fois son besoin intellectuel et émotionnel."
      }
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    const cleanText = text.replace(/```json/g, "").replace(/```/g, "").trim();

    return NextResponse.json(JSON.parse(cleanText));

  } catch (error: any) {
    console.error("Erreur Synthese:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}