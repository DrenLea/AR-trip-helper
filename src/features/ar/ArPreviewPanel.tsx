import { useEffect, useRef, useState } from 'react';
import type { Place } from '../../domain/models';
import { fetchGuideContent, type GuideContent } from './guideContent';

export function ArPreviewPanel({ place }: { place: Place }): JSX.Element {
  const [guide, setGuide] = useState<GuideContent | null>(null);
  const [error, setError] = useState(''); const [attempt, setAttempt] = useState(0);
  const [cameraState, setCameraState] = useState<'off' | 'requesting' | 'on'>('off');
  const [cameraMessage, setCameraMessage] = useState(''); const [speaking, setSpeaking] = useState(false);
  const video = useRef<HTMLVideoElement>(null); const stream = useRef<MediaStream | null>(null); const mounted = useRef(true);
  useEffect(() => {
    const controller = new AbortController(); setGuide(null); setError(''); setSpeaking(false); window.speechSynthesis?.cancel();
    fetchGuideContent(place.id, controller.signal).then(setGuide).catch((reason: Error) => { if (!controller.signal.aborted) setError(reason.message); });
    return () => { controller.abort(); window.speechSynthesis?.cancel(); };
  }, [place.id, attempt]);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; stream.current?.getTracks().forEach(track => track.stop()); }; }, []);
  const stopCamera = () => { stream.current?.getTracks().forEach(track => track.stop()); stream.current = null; if (video.current) video.current.srcObject = null; setCameraState('off'); };
  async function startCamera() {
    setCameraMessage('');
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) { setCameraMessage('此浏览器无法打开相机。手机访问需要 HTTPS；你仍可阅读和播放景点讲解。'); return; }
    setCameraState('requesting');
    try {
      const media = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
      if (!mounted.current) { media.getTracks().forEach(track => track.stop()); return; }
      stream.current = media; if (video.current) { video.current.srcObject = media; await video.current.play(); } setCameraState('on');
    } catch { stopCamera(); setCameraMessage('相机未能开启，请检查浏览器权限。文字导览仍可使用。'); }
  }
  function speak() {
    if (!guide || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel(); if (speaking) { setSpeaking(false); return; }
    const segments = guide.summary.match(/[^。！？.!?]+[。！？.!?]?/g) ?? [guide.summary];
    setSpeaking(true);
    segments.forEach((text, index) => { const utterance = new SpeechSynthesisUtterance(text); utterance.lang = guide.language === 'en' ? 'en-US' : 'zh-CN'; utterance.onerror = () => setSpeaking(false); if (index === segments.length - 1) utterance.onend = () => setSpeaking(false); window.speechSynthesis.speak(utterance); });
  }
  return <section className="guide-panel" aria-label="现场导览">
    <div className="camera-stage"><video ref={video} muted playsInline hidden={cameraState !== 'on'} />
      {cameraState !== 'on' && <div className="camera-placeholder"><span aria-hidden="true">⌖</span><h3>把景点带到眼前</h3><p>开启相机，边看现场边听讲解。</p></div>}
      {cameraState === 'on' && <div className="camera-caption">{guide?.title ?? place.name} · 手动选择的景点</div>}
    </div>
    <p className="muted">相机叠加导览；尚未进行建筑识别或空间定位。</p>
    <button className="secondary-button" type="button" disabled={cameraState === 'requesting'} onClick={cameraState === 'on' ? stopCamera : () => void startCamera()}>{cameraState === 'on' ? '关闭相机' : cameraState === 'requesting' ? '等待相机授权…' : '开启相机导览'}</button>
    {cameraMessage && <p role="status">{cameraMessage}</p>}
    <article className="guide-copy" aria-live="polite"><h3>{guide?.title ?? place.name}</h3>
      {!guide && !error && <p>正在读取百科资料…</p>}
      {error && <p role="alert">{error} <button type="button" onClick={() => setAttempt(value => value + 1)}>重试</button></p>}
      {guide && <><p className="guide-text">{guide.summary}</p><p className="source-note">{guide.confidence === 'cached' ? '上次缓存的资料' : '在线百科资料'} · {guide.source?.license} · {guide.source?.retrievedAt && new Date(guide.source.retrievedAt).toLocaleString()}</p><a href={guide.source?.url} target="_blank" rel="noreferrer">{guide.source?.attribution ?? '查看原文'}</a><div><button className="primary-button" type="button" disabled={!('speechSynthesis' in window)} onClick={speak}>{speaking ? '停止讲解' : '播放景点讲解'}</button></div></>}
    </article>
  </section>;
}
