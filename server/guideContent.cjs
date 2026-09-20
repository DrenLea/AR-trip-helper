const cache = new Map();
const topics = {
  'rome-colosseum': ['罗马斗兽场', 'Colosseum'],
  'rome-forum': ['古罗马广场', 'Roman Forum'],
  'rome-pantheon': ['万神庙', 'Pantheon, Rome'],
  'guiyang-jiaxiu': ['甲秀楼', 'Jiaxiu Tower'],
  'guiyang-qianling': ['黔灵山公园', 'Qianling Park'],
};
function registerGuideContent(app) {
  app.get('/api/places/content', async (req, res) => {
    const topic = topics[String(req.query.placeId || '')];
    if (!topic) return res.status(404).json({ error: '暂无此景点的已核对百科条目' });
    const key = String(req.query.placeId); const saved = cache.get(key);
    if (saved && Date.now() - saved.at < 3600000) return res.json(saved.value);
    for (const [index, lang] of ['zh', 'en'].entries()) {
      const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), 6500);
      try {
        const url = new URL(`https://${lang}.wikipedia.org/w/api.php`);
        Object.entries({ action: 'query', format: 'json', formatversion: '2', prop: 'extracts|info', explaintext: '1', exintro: '1', inprop: 'url', redirects: '1', titles: topic[index] }).forEach(([k, v]) => url.searchParams.set(k, v));
        const response = await fetch(url, { signal: controller.signal, headers: { 'User-Agent': 'TripARHelper/0.2 (educational guide prototype)', Accept: 'application/json' } });
        if (!response.ok) throw new Error('upstream');
        const page = (await response.json()).query?.pages?.[0];
        if (!page || page.missing || typeof page.extract !== 'string' || page.extract.length < 80) continue;
        const value = { title: topic[0], summary: page.extract.slice(0, 7000), facts: [], confidence: 'source', language: lang,
          source: { name: 'Wikipedia', url: page.fullurl, retrievedAt: new Date().toISOString(), license: 'CC BY-SA 4.0', attribution: `Wikipedia contributors · ${page.title}` } };
        cache.set(key, { value, at: Date.now() }); return res.json(value);
      } catch { /* Next language, then explicitly stale cached content. */ } finally { clearTimeout(timer); }
    }
    if (saved) return res.json({ ...saved.value, confidence: 'cached', stale: true });
    return res.status(503).json({ error: '百科服务暂时无法连接，请重试或打开来源页面' });
  });
}
module.exports = { registerGuideContent };
