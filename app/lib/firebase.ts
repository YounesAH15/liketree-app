import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  where,
  doc,
  setDoc,
  getDocs,
  writeBatch,
  query,
  limit,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';


// On utilise les variables d'environnement sécurisées
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// Debug : Si ça plante encore, ceci nous le dira tout de suite dans la console du navigateur
if (!firebaseConfig.projectId) {
  // Better to warn in dev and avoid initializing an invalid config in production
  console.warn("🔴 Erreur Critique : Le Project ID Firebase est manquant. Vérifiez le .env.local");
}

// Initialize the Firebase app once and re-use the instance across client bundles
let db_tmp;
try {
  const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
  db_tmp = getFirestore(app);
} catch (e) {
  // Avoid crash during SSR/build if env vars are missing, but surface a clear error
  console.error('Firebase init error:', e);
  // Keep db_tmp undefined if initialization failed, callers should handle that
  db_tmp = undefined;
}

export const db = db_tmp;

export interface VideoData {
  id: string;
  title: string;
  channelTitle?: string;
  categoryId?: string;
  publishedAt?: string;
  thumbnail?: string;
  viewCount: number;
  importedAt?: string;
}

export async function saveVideosToUnreal(userId: string, videos: any[]) {
  if (!userId) throw new Error('userId is required');
  if (!videos?.length) return;

  if (!db) throw new Error('Firestore is not initialized');
  const BATCH_LIMIT = 500; // Firestore batch write limit
  let batch = writeBatch(db);
  let batchCounter = 0;

  for (const video of videos) {
    if (!video?.id) continue;

    const ref = doc(db, 'users', userId, 'likes', video.id);
    const viewCountNum = Number(video.statistics?.viewCount || 0);

    batch.set(
      ref,
      {
        id: video.id,
        title: video.snippet?.title ?? '',
        channelTitle: video.snippet?.channelTitle ?? '',
        categoryId: video.snippet?.categoryId ?? null,
        publishedAt: video.snippet?.publishedAt ?? null,
        thumbnail: video.snippet?.thumbnails?.medium?.url ?? '',
        viewCount: viewCountNum,
        importedAt: serverTimestamp(),
      },
      { merge: true }
    );

    batchCounter++;
    if (batchCounter >= BATCH_LIMIT) {
      // commit and create a new batch
      await batch.commit();
      batch = writeBatch(db);
      batchCounter = 0;
    }
  }

  try {
    if (batchCounter > 0) {
      await batch.commit();
    }
    console.log(`💾 ${videos.length} videos saved.`);
  } catch (err) {
    console.error('Error committing batch:', err);
    throw err; // bubble up, or return false depending on app design
  }
}

export async function getStoredVideos(userId: string, limitCount = 500) {
  if (!userId) throw new Error('userId required');

  try {
    if (!db) throw new Error('Firestore is not initialized');
    const q = query(
      collection(db, 'users', userId, 'likes'),
      orderBy('importedAt', 'desc'),
      limit(limitCount),
    );
    const querySnapshot = await getDocs(q);

    const videos: VideoData[] = querySnapshot.docs.map((snap) => {
      const data = snap.data() as any;
      return {
        id: data.id ?? snap.id,
        title: data.title ?? '',
        channelTitle: data.channelTitle ?? '',
        categoryId: data.categoryId ?? null,
        publishedAt: data.publishedAt ?? null,
        thumbnail: data.thumbnail ?? '',
        viewCount: Number(data.viewCount ?? 0),
        importedAt: // Convert Firestore Timestamp to ISO string if needed
          (data.importedAt && typeof data.importedAt.toDate === 'function')
            ? data.importedAt.toDate().toISOString()
            : data.importedAt ?? null,
      };
    });

    // robust sort (fallback to 0 if parse fails)
    return videos.sort((a, b) => {
      const at = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
      const bt = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
      return bt - at;
    });
  } catch (err) {
    console.error('Error reading stored videos', err);
    return [];
  }
}

// Save analysis with Firestore serverTimestamp for consistent ordering
export async function saveAnalysis(userId: string, analysisResult: any) {
  if (!userId) throw new Error('userId required');
  if (!db) throw new Error('Firestore is not initialized');
  const ref = doc(collection(db, 'users', userId, 'analyses'));
  await setDoc(ref, {
    ...analysisResult,
    createdAt: serverTimestamp(), // Firestore Timestamp
  });
  return ref.id;
}

export async function getAnalysis(userId: string, source: string) {
  try {
    if (!db) throw new Error('Firestore is not initialized');
    // On cherche l'analyse spécifique à la source (google ou spotify)
    const q = query(
      collection(db, "users", userId, "analyses"), 
      where("source", "==", source),
      limit(1)
    );
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      return querySnapshot.docs[0].data(); 
    }
    return null;
  } catch (e) {
    console.error(`Erreur lecture analyse (${source}):`, e);
    return null;
  }
}