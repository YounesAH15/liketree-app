'use client';

import { useSession, signIn, signOut } from "next-auth/react";
import { useState, useEffect } from "react";
import DashboardView from "./components/DashboardView";
import TreeView from "./components/TreeView";
import AnalysisView from "./components/AnalysisView";
import { saveVideosToUnreal, getStoredVideos } from "./lib/firebase";

export default function Home() {
  const { data: session } = useSession();
  
  // États
  const [likes, setLikes] = useState<any[]>([]);
  const [currentView, setCurrentView] = useState<'dashboard' | 'tree' | 'analysis'>('dashboard');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(""); 
  const [provider, setProvider] = useState<string | null>(null);

  // CONFIGURATION
  const MAX_API_FETCH = 1000; // On ouvre les vannes (1000 items)

  // 1. DÉMARRAGE : On détecte qui est connecté
  useEffect(() => {
    if (session) {
      // @ts-ignore
      const currentProvider = session.provider || 'google'; // Par défaut google si indéfini
      setProvider(currentProvider);
      
      console.log("Connecté via :", currentProvider);

      if (currentProvider === 'google') {
         loadFromVault(); 
      } else if (currentProvider === 'spotify') {
         fetchSpotifyData();
      }
    }
  }, [session]);

  // --- LOGIQUE YOUTUBE (Google) ---
  const loadFromVault = async () => {
    if (!session?.user?.email) return;
    setLoading(true);
    setStatus("Ouverture du coffre-fort YouTube...");
    
    try {
        const storedLikes = await getStoredVideos(session.user.email);
        
        if (storedLikes.length > 0) {
          setLikes(storedLikes);
          setStatus(`${storedLikes.length} vidéos chargées depuis la mémoire.`);
        } else {
          setStatus("Aucune archive trouvée. Prêt pour la synchro.");
        }
    } catch (error: any) {
        console.error("🔴 ERREUR FIREBASE :", error);
        // On affiche l'erreur à l'utilisateur pour comprendre
        setStatus(`Erreur coffre-fort : ${error.message || "Bloqué"}`);
    } finally {
        // QUOI QU'IL ARRIVE, on arrête le chargement
        setLoading(false);
    }
  };


  const syncWithYouTube = async () => {
    if (!session?.accessToken || !session?.user?.email) return;
    setLoading(true);
    setStatus("Contact des serveurs YouTube...");

    let newVideos: any[] = [];
    let nextPageToken = "";
    let pageCount = 0;
    const latestStoredId = likes.length > 0 ? likes[0].id : null; 
    let stopFetching = false;

    try {
      do {
        let url = `https://www.googleapis.com/youtube/v3/videos?myRating=like&part=snippet,statistics&maxResults=50`;
        if (nextPageToken) url += `&pageToken=${nextPageToken}`;

        const res = await fetch(url, { headers: { 'Authorization': `Bearer ${session.accessToken}` }});
        const data = await res.json();
        
        if (data.items) {
          for (const video of data.items) {
            if (video.id === latestStoredId) {
              stopFetching = true; 
              break;
            }
            newVideos.push(video);
          }
          setStatus(`${newVideos.length} nouvelles vidéos trouvées...`);
        }
        nextPageToken = data.nextPageToken;
        pageCount++;
      } while (nextPageToken && !stopFetching && (newVideos.length < MAX_API_FETCH));

      if (newVideos.length > 0) {
        setStatus(`Sauvegarde de ${newVideos.length} nouvelles données...`);
        await saveVideosToUnreal(session.user.email, newVideos);
        setLikes(prev => [...newVideos, ...prev]); // On met à jour l'affichage
        setStatus(`Synchronisation terminée. ${newVideos.length} ajouts.`);
      } else {
        setStatus("Vous êtes à jour !");
      }
    } catch (e) {
      console.error(e);
      setStatus("Erreur lors de la synchronisation YouTube.");
    } finally {
      setLoading(false);
    }
  };

  // --- LOGIQUE SPOTIFY ---

  const fetchSpotifyData = async () => {
    if (!session?.accessToken) return;
    setLoading(true);
    setStatus("Connexion au cerveau musical...");

    try {
      // TENTATIVE 1 : Les favoris (Top Tracks) - Idéal pour le profilage
      let res = await fetch('https://api.spotify.com/v1/me/top/tracks?time_range=short_term&limit=50', {
        headers: { 'Authorization': `Bearer ${session.accessToken}` }
      });
      let data = await res.json();
      let rawItems = data.items || [];
      let source = "Top Tracks";

      // TENTATIVE 2 (Fallback) : Si pas de favoris, on prend l'Historique Récent
      if (rawItems.length === 0) {
        setStatus("Compte récent détecté. Récupération de l'historique...");
        res = await fetch('https://api.spotify.com/v1/me/player/recently-played?limit=50', {
            headers: { 'Authorization': `Bearer ${session.accessToken}` }
        });
        data = await res.json();
        
        // CORRECTION ICI : On filtre les éléments nuls ou sans track
        rawItems = (data.items || [])
            .map((item: any) => item.track)
            .filter((track: any) => track && track.name); // On garde que les vrais morceaux
        
        source = "Récemment écoutés";
      }

      if (rawItems.length === 0) {
        throw new Error("Aucune musique trouvée (ni favoris, ni historique). Écoutez de la musique !");
      }

      // Transformation générique
      const spotifyItems = rawItems.map((track: any) => ({
        id: track.id,
        snippet: {
          title: track.name,
          channelTitle: track.artists[0].name,
          categoryId: "Music",
          publishedAt: track.album.release_date,
          thumbnails: { medium: { url: track.album.images[0]?.url } }
        },
        statistics: { viewCount: track.popularity }
      }));

      setLikes(spotifyItems);
      setStatus(`Profil musical chargé (${source}).`);
      
    } catch (e: any) {
      console.error(e);
      setStatus(e.message || "Erreur connexion Spotify.");
    } finally {
      setLoading(false);
    }
  };

  // --- ÉCRAN DE CONNEXION (LOGIN) ---
  if (!session) {
    return (
      <div className="min-h-screen bg-[#FDFBF7] flex flex-col items-center justify-center p-4">
        <div className="text-center max-w-md space-y-8 animate-fade-in">
          <div>
            <div className="text-6xl mb-4">🌳</div>
            <h1 className="text-4xl font-bold text-slate-800 mb-2">LikeTree</h1>
            <p className="text-slate-600">L'Architecte de vos données personnelles.</p>
          </div>
          
          <div className="flex flex-col gap-4 w-full">
            {/* BOUTON GOOGLE */}
            <button 
              onClick={() => signIn("google")} 
              className="bg-white border border-slate-200 text-slate-700 px-8 py-4 rounded-xl font-bold shadow-sm hover:bg-slate-50 transition flex items-center justify-center gap-3 transform hover:scale-[1.02]"
            >
              <span>📺</span> Continuer avec YouTube
            </button>
            
            {/* BOUTON SPOTIFY */}
            <button 
              onClick={() => signIn("spotify")} 
              className="bg-[#1DB954] text-white px-8 py-4 rounded-xl font-bold shadow-lg hover:bg-[#1ed760] transition flex items-center justify-center gap-3 transform hover:scale-[1.02]"
            >
              <span>🎵</span> Continuer avec Spotify
            </button>
          </div>
          <p className="text-xs text-slate-400 mt-8">Vos données restent privées et stockées dans votre coffre personnel.</p>
        </div>
      </div>
    );
  }

  // --- APPLICATION PRINCIPALE ---
  return (
    <div className="min-h-screen bg-[#FDFBF7] text-slate-800 font-sans">
      {/* HEADER */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex justify-between items-center">
          <div className="flex items-center gap-2 font-bold text-xl">
             <span className="text-2xl">🌳</span> 
             <span className="hidden sm:inline">LikeTree</span>
             <span className="text-xs font-normal bg-slate-100 px-2 py-1 rounded text-slate-500 ml-2 border">
                {provider === 'spotify' ? 'Mode Musique 🎵' : 'Mode Vidéo 📺'}
             </span>
          </div>
          
          <nav className="flex space-x-1 bg-slate-100 p-1 rounded-lg">
             {['dashboard', 'tree', 'analysis'].map(view => (
               <button 
                 key={view}
                 onClick={() => setCurrentView(view as any)}
                 className={`px-3 sm:px-4 py-1.5 text-xs sm:text-sm font-medium capitalize rounded-md transition ${currentView === view ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-500'}`}
               >
                 {view}
               </button>
             ))}
          </nav>

          <div className="flex items-center gap-4">
             {/* BOUTON SYNCHRO UNIVERSEL */}
             <button 
               onClick={provider === 'spotify' ? fetchSpotifyData : syncWithYouTube}
               disabled={loading}
               className={`hidden sm:flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold text-white transition
                 ${loading ? 'bg-slate-400 cursor-not-allowed' : 
                   provider === 'spotify' ? 'bg-green-500 hover:bg-green-600' : 'bg-rose-600 hover:bg-rose-700'}
                 shadow-md hover:shadow-lg
               `}
             >
               {loading ? '⏳' : '🔄'} {loading ? '...' : (provider === 'spotify' ? 'Charger Spotify' : 'Sync YouTube')}
             </button>
             
             <button onClick={() => signOut()} className="text-slate-400 hover:text-rose-600 p-2" title="Déconnexion">
                ⏻
             </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* BARRE DE STATUT */}
        <div className="mb-6 flex flex-col sm:flex-row justify-between sm:items-end border-b pb-4 gap-4">
           <div>
              <h2 className="text-2xl font-bold text-slate-800">
                {provider === 'spotify' ? 'Audit Musical' : 'Audit Vidéo'}
              </h2>
              <p className="text-slate-500 text-sm mt-1">{status || "Prêt."}</p>
           </div>
           <div className="text-right">
              <span className="text-4xl font-bold text-slate-800">{likes.length}</span>
              <span className="text-sm text-slate-500 block">Données chargées</span>
           </div>
        </div>

        {likes.length > 0 ? (
          <>
            {currentView === 'dashboard' && (
                <DashboardView 
                    likes={likes} 
                    mode={provider === 'spotify' ? 'audio' : 'video'} 
                />
            )}
            {currentView === 'tree' && <TreeView likes={likes} />}
            {currentView === 'analysis' && <AnalysisView likes={likes} />}
          </>
        ) : (
          <div className="text-center py-20 bg-white rounded-xl border border-dashed border-slate-300">
             <div className="text-6xl mb-4">📭</div>
             <h3 className="text-xl font-bold text-slate-700">Aucune donnée chargée</h3>
             <p className="text-slate-500 mb-6">
                {provider === 'google' 
                    ? "Cliquez sur Sync en haut pour importer vos likes." 
                    : "Impossible de lire vos tops titres Spotify."}
             </p>
          </div>
        )}
      </main>
    </div>
  );
}