'use client';

import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  BarElement,
} from 'chart.js';
import { Doughnut } from 'react-chartjs-2';

ChartJS.register(
  ArcElement, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement, Title, BarElement
);

interface DashboardProps {
  likes: any[];
  mode?: 'video' | 'audio'; // Nouveau paramètre pour savoir quoi afficher
}

export default function DashboardView({ likes, mode = 'video' }: DashboardProps) {
  
  // Adaptation du vocabulaire
  const LABELS = mode === 'video' 
    ? { entity: 'Chaîne', item: 'Vidéos', top: 'Top Créateurs' }
    : { entity: 'Artiste', item: 'Titres', top: 'Top Artistes' };

  // Calcul des stats (Générique : marche pour YouTube et Spotify)
  const channelCounts: { [key: string]: number } = {};
  
  likes.forEach((item) => {
    // PROTECTION : Si l'item ou son snippet n'existe pas, on saute ce tour
    if (!item || !item.snippet) return;

    const name = item.snippet.channelTitle || 'Inconnu';
    channelCounts[name] = (channelCounts[name] || 0) + 1;
  });

  // Top 5
  const topEntities = Object.entries(channelCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const doughnutData = {
    labels: topEntities.map((c) => c[0]),
    datasets: [{
      data: topEntities.map((c) => c[1]),
      backgroundColor: ['#E11D48', '#D97706', '#0D9488', '#3B82F6', '#8B5CF6'],
      borderWidth: 0,
    }],
  };

  const totalItems = likes.length;
  const topEntityName = topEntities.length > 0 ? topEntities[0][0] : '-';
// --- CORRECTIF DE SÉCURITÉ ---
  // Au lieu de prendre le dernier item au hasard (qui peut être bugué),
  // on filtre pour ne garder que ceux qui ont une date valide.
  const validItemsWithDate = likes.filter(item => item?.snippet?.publishedAt);
  
  // On prend le dernier des valides, ou rien si tout est vide
  const oldestItem = validItemsWithDate.length > 0 
    ? validItemsWithDate[validItemsWithDate.length - 1] 
    : null;

  const oldestDate = oldestItem
    ? new Date(oldestItem.snippet.publishedAt).getFullYear()
    : '-';

  return (
    <div className="space-y-8 animate-fade-in">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className={`bg-white p-5 rounded-lg shadow-sm border-l-4 ${mode === 'audio' ? 'border-green-500' : 'border-rose-500'}`}>
          <div className="text-xs uppercase font-bold text-slate-400 mb-1">Total {LABELS.item}</div>
          <div className="text-3xl font-bold text-slate-800">{totalItems}</div>
        </div>
        <div className="bg-white p-5 rounded-lg shadow-sm border-l-4 border-amber-500">
          <div className="text-xs uppercase font-bold text-slate-400 mb-1">{LABELS.entity} Favori(te)</div>
          <div className="text-xl font-bold text-slate-800 truncate" title={topEntityName}>{topEntityName}</div>
        </div>
        <div className="bg-white p-5 rounded-lg shadow-sm border-l-4 border-teal-500">
          <div className="text-xs uppercase font-bold text-slate-400 mb-1">Depuis / Sortie</div>
          <div className="text-3xl font-bold text-slate-800">{oldestDate}</div>
        </div>
      </div>

      {/* Chart Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex flex-col h-[400px]">
          <div className="mb-4">
            <h3 className="text-lg font-bold text-slate-800">{LABELS.top}</h3>
            <p className="text-sm text-slate-500">Répartition de votre consommation.</p>
          </div>
          <div className="flex-grow flex items-center justify-center relative w-full h-full">
             <Doughnut data={doughnutData} options={{ maintainAspectRatio: false }} />
          </div>
        </div>

        {/* Liste simple pour voir les données brutes (Debug visuel) */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 h-[400px] overflow-hidden flex flex-col">
          <h3 className="text-lg font-bold text-slate-800 mb-4">Derniers ajouts</h3>
            <div className="flex-grow overflow-y-auto pr-2 space-y-2 custom-scroll">
                {likes
                // LE BOUCLIER : On ne garde que les items qui ont un snippet valide
                .filter(item => item && item.snippet)
                .slice(0, 20)
                .map((item, i) => (
                    <div key={i} className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded border-b border-slate-50">
                        <div className="text-xs text-slate-400 w-6">#{i+1}</div>
                        <div className="min-w-0">
                            <div className="font-medium text-sm truncate">{item.snippet.title}</div>
                            <div className="text-xs text-slate-500 truncate">{item.snippet.channelTitle}</div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
      </div>
    </div>
  );
}