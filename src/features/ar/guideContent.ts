export interface GuideContent {
  title: string; summary: string; facts: string[]; language?: string;
  source?: { name: string; url: string; retrievedAt?: string; license?: string; attribution?: string };
  confidence: 'source' | 'cached' | 'local-fallback';
}
export async function fetchGuideContent(placeId: string, signal?: AbortSignal): Promise<GuideContent> {
  const response = await fetch(`/api/places/content?placeId=${encodeURIComponent(placeId)}`, { signal });
  if (!response.ok) throw new Error(response.status === 404 ? '该景点尚无已核对条目，请选择其他景点。' : '百科资料暂时无法加载，请重试。');
  const data = await response.json() as GuideContent;
  if (!data.source?.url || typeof data.summary !== 'string' || !data.summary.trim()) throw new Error('百科资料不完整');
  return data;
}
