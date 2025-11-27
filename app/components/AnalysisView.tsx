'use client';

import { useState, useEffect } from 'react';
import { useSession } from "next-auth/react";
import { saveAnalysis, getAnalysis } from '../lib/firebase';

interface AnalysisProps {
  likes: any[];
}

export default function AnalysisView({ likes }: AnalysisProps) {
  const { data: session } = useSession();
  
  // On stocke les deux analyses séparément
  const [youtubeResult, setYoutubeResult] = useState<any>(null);
  const [spotifyResult, setSpotifyResult] = useState<any>(null);
  const [synthesis, setSynthesis] = useState<any>(null);
  
  const [loading, setLoading] = useState(false);

  // 1. CHARGEMENT INITIAL (On cherche les deux briques)
  useEffect(() => {
    const loadMemories = async () => {
      if (session?.user?.email) {
        // On charge en parallèle
        const [yt, sp] = await Promise.all([
          getAnalysis(session.user.email, 'google'),
          getAnalysis(session.user.email, 'spotify')
        ]);
        setYoutubeResult(yt);
        setSpotifyResult(sp);
      }
    };
    loadMemories();
  }, [session]);

  // Lancer une analyse simple (celle de la source actuelle)
  const runSingleAnalysis = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videos: likes })
      });
      const data = await res.json();
      
      // @ts-ignore
      const source = session?.provider || 'google';
      const resultToSave = { ...data, source };
      
      if (session?.user?.email) await saveAnalysis(session.user.email, resultToSave);
      
      // Mise à jour locale
      if (source === 'google') setYoutubeResult(resultToSave);
      else setSpotifyResult(resultToSave);

    } catch (e) { console.error(e); } 
    finally { setLoading(false); }
  };

  // Lancer la SYNTHÈSE (Fusion)
  const runSynthesis = async () => {
    if (!youtubeResult || !spotifyResult) return;
    setLoading(true);
    try {
      const res = await fetch('/api/synthesize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ youtubeAnalysis: youtubeResult, spotifyAnalysis: spotifyResult })
      });
      const data = await res.json();
      setSynthesis(data);
    } catch (e) { console.error(e); } 
    finally { setLoading(false); }
  };

  // @ts-ignore
  const currentProvider = session?.provider || 'google';
  const hasCurrentAnalysis = currentProvider === 'google' ? youtubeResult : spotifyResult;

  return (
    <div className="space-y-8 animate-fade-in max-w-6xl mx-auto">
      
      {/* HEADER DE LA SECTION */}
      <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-200">
        <h2 className="text-3xl font-bold mb-2 text-slate-800">Le Laboratoire Cognitif</h2>
        <p className="text-slate-500">
           État des données : 
           <span className={youtubeResult ? "text-green-600 font-bold ml-2" : "text-slate-300 ml-2"}>📺 YouTube</span> 
           <span className="mx-2">+</span>
           <span className={spotifyResult ? "text-green-600 font-bold" : "text-slate-300"}>🎵 Spotify</span>
        </p>

        {/* Bouton d'action contextuel */}
        <div className="mt-6 flex gap-4">
            {!hasCurrentAnalysis && (
                <button 
                    onClick={runSingleAnalysis}
                    disabled={loading}
                    className="bg-indigo-600 text-white px-6 py-3 rounded-lg font-bold shadow hover:bg-indigo-700 transition"
                >
                    {loading ? 'Analyse...' : `🧠 Analyser mes données ${currentProvider === 'google' ? 'Vidéo' : 'Audio'}`}
                </button>
            )}

            {youtubeResult && spotifyResult && !synthesis && (
                <button 
                    onClick={runSynthesis}
                    disabled={loading}
                    className="bg-gradient-to-r from-rose-500 to-indigo-600 text-white px-8 py-3 rounded-lg font-bold shadow-lg hover:opacity-90 transition transform hover:scale-105"
                >
                    {loading ? 'Fusion en cours...' : '🧬 GÉNÉRER LA SYNTHÈSE FINALE'}
                </button>
            )}
        </div>
      </div>

      {/* RÉSULTAT : LA SYNTHÈSE (Si disponible) */}
      {synthesis && (
        <div className="bg-slate-900 text-white p-8 rounded-2xl shadow-2xl border border-slate-700 animate-fade-in">
           <div className="text-center mb-8">
              <div className="text-xs font-bold text-rose-400 uppercase tracking-widest mb-2">PROFIL COMPLET DÉTECTÉ</div>
              <h1 className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-rose-400 to-indigo-400">
                {synthesis.meta_archetype}
              </h1>
           </div>

           <div className="grid md:grid-cols-2 gap-8 text-lg">
              <div className="bg-white/5 p-6 rounded-xl border border-white/10">
                 <h3 className="font-bold text-indigo-300 mb-4">L'Analyse Croisée</h3>
                 <p className="leading-relaxed opacity-90">{synthesis.synthesis}</p>
              </div>
              <div className="space-y-4">
                 <div className="bg-emerald-500/10 p-4 rounded-xl border border-emerald-500/20">
                    <h4 className="font-bold text-emerald-400 mb-1">💡 Conseil de Vie</h4>
                    <p className="text-sm">{synthesis.life_advice}</p>
                 </div>
                 <div className="bg-amber-500/10 p-4 rounded-xl border border-amber-500/20">
                    <h4 className="font-bold text-amber-400 mb-1">🚀 Carrière Idéale</h4>
                    <p className="text-sm">{synthesis.career_path}</p>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* VUES INDIVIDUELLES (Cartes simples) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 opacity-70 hover:opacity-100 transition duration-500">
         {youtubeResult && (
            <div className="bg-white p-6 rounded-xl border border-slate-200">
               <div className="text-xs font-bold text-red-500 uppercase mb-2">Cerveau Gauche (YouTube)</div>
               <h3 className="font-bold text-xl mb-2">{youtubeResult.archetype}</h3>
               <p className="text-sm text-slate-600 line-clamp-3">{youtubeResult.psychology}</p>
            </div>
         )}
         {spotifyResult && (
            <div className="bg-white p-6 rounded-xl border border-slate-200">
               <div className="text-xs font-bold text-green-500 uppercase mb-2">Cerveau Droit (Spotify)</div>
               <h3 className="font-bold text-xl mb-2">{spotifyResult.archetype}</h3>
               <p className="text-sm text-slate-600 line-clamp-3">{spotifyResult.psychology}</p>
            </div>
         )}
      </div>

    </div>
  );
}