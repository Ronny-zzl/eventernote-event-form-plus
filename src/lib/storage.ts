import { GM_getValue, GM_setValue } from '$';

export type Actor = { id: string; name: string };
export type ActorPreset = { name: string; actors: Actor[] };
export type Place = { id: string; name: string; prefecture: string; address: string };
export type ImageData = { dataUrl: string; name: string; type: string };

export type FormSnapshot = {
  fields: Record<string, string>;
  selects: Record<string, string>;
  actors: Actor[];
  prefecture: string;
  place: { id: string; name: string } | null;
};

export type PendingUpload = {
  image: ImageData;
  eventName: string;
  placeId: string;
  createdAt: number;
  uploadingAt?: number;
};

// Tampermonkey 存储里的全部键（只存在用户浏览器里）
type Store = {
  actorPresets: ActorPreset[];
  recentPlaces: Place[];
  recentActors: Actor[];
  formSnapshot: FormSnapshot | null;
  draftImage: ImageData | null;
  pendingUpload: PendingUpload | null;
  formDraft: (FormSnapshot & { savedAt: number }) | null;
};

export const load = <K extends keyof Store>(key: K, fallback: Store[K]): Store[K] =>
  GM_getValue(key, fallback);

export const save = <K extends keyof Store>(key: K, value: Store[K]) => GM_setValue(key, value);
