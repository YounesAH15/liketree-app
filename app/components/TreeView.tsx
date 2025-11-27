'use client';

import { useState, useMemo } from 'react';
import { getCategoryName } from '@/app/utils/youtubeCategories';

interface TreeViewProps {
  likes: any[];
}

export default function TreeView({ likes }: TreeViewProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null);

// 1. Organiser les données (Hiérarchie)
  const treeData = useMemo(() => {
    const tree: any = {};
    
    likes.forEach(video => {
      // --- LE BOUCLIER ---
      // Si la vidéo est vide ou n'a pas de snippet, on l'ignore poliment
      if (!video || !video.snippet) return; 

      // On ajoute aussi une sécurité sur l'ID de catégorie (au cas où il manque)
      const catId = video.snippet.categoryId || 'unknown';
      
      const catName = getCategoryName(catId);
      // On sécurise aussi le titre de la chaîne
      const channel = video.snippet.channelTitle || 'Artiste Inconnu';

      if (!tree[catName]) tree[catName] = {};
      if (!tree[catName][channel]) tree[catName][channel] = [];
      
      tree[catName][channel].push(video);
    });
    return tree;
  }, [likes]);

  // Récupérer la liste des vidéos affichées actuellement
  const currentVideos = useMemo(() => {
    if (selectedCategory && selectedChannel) {
      return treeData[selectedCategory][selectedChannel];
    }
    return [];
  }, [treeData, selectedCategory, selectedChannel]);


  
  return (
    <div className="flex flex-col md:flex-row h-[600px] bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden animate-fade-in">
      
      {/* COLONNE 1 : Catégories */}
      <div className="w-full md:w-1/4 border-r border-slate-100 bg-slate-50 overflow-y-auto">
        <div className="p-3 bg-slate-100 font-semibold text-xs text-slate-500 uppercase sticky top-0">
          Catégories
        </div>
        {Object.keys(treeData).sort().map(cat => (
          <div 
            key={cat}
            onClick={() => { setSelectedCategory(cat); setSelectedChannel(null); }}
            className={`p-3 cursor-pointer hover:bg-white hover:text-rose-600 transition text-sm font-medium flex justify-between ${selectedCategory === cat ? 'bg-white text-rose-600 border-l-4 border-rose-600' : 'text-slate-700'}`}
          >
            <span>{cat}</span>
            <span className="bg-slate-200 text-slate-600 text-xs px-2 rounded-full">
              {Object.values(treeData[cat]).flat().length}
            </span>
          </div>
        ))}
      </div>

      {/* COLONNE 2 : Chaînes (si catégorie sélectionnée) */}
      <div className="w-full md:w-1/4 border-r border-slate-100 bg-white overflow-y-auto">
        <div className="p-3 bg-slate-50 font-semibold text-xs text-slate-500 uppercase sticky top-0">
          Chaînes
        </div>
        {!selectedCategory && (
          <div className="p-8 text-center text-slate-400 text-sm italic">
            👈 Choisissez une catégorie
          </div>
        )}
        {selectedCategory && Object.keys(treeData[selectedCategory]).sort().map(channel => (
          <div 
            key={channel}
            onClick={() => setSelectedChannel(channel)}
            className={`p-3 cursor-pointer hover:bg-slate-50 transition text-sm border-b border-slate-50 ${selectedChannel === channel ? 'text-rose-600 font-bold bg-rose-50' : 'text-slate-600'}`}
          >
            {channel}
            <span className="ml-2 text-xs text-slate-400">({treeData[selectedCategory][channel].length})</span>
          </div>
        ))}
      </div>

      {/* COLONNE 3 : Vidéos (si chaîne sélectionnée) */}
      <div className="w-full md:w-2/4 bg-slate-50 overflow-y-auto p-4">
        <div className="mb-4 font-semibold text-xs text-slate-500 uppercase">
          Vidéos
        </div>
        
        {!selectedChannel && (
          <div className="h-full flex flex-col items-center justify-center text-slate-400">
            <span className="text-4xl mb-2">📺</span>
            <p>Sélectionnez une chaîne pour voir les vidéos</p>
          </div>
        )}

        <div className="space-y-3">
          {currentVideos.map((video: any) => (
            <a 
              key={video.id} 
              href={`https://www.youtube.com/watch?v=${video.id}`} 
              target="_blank" 
              rel="noreferrer"
              className="block bg-white p-3 rounded-lg shadow-sm hover:shadow-md transition group"
            >
              <h4 className="font-medium text-slate-800 text-sm group-hover:text-rose-600 truncate">
                {video.snippet.title}
              </h4>
              <div className="flex justify-between mt-2 text-xs text-slate-400">
                <span>{new Date(video.snippet.publishedAt).toLocaleDateString()}</span>
                <span>👀 {parseInt(video.statistics.viewCount).toLocaleString()}</span>
              </div>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}