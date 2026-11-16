'use client';

import { use, useEffect, useState } from 'react';
import { api, formatDate, json, type Reveal } from '../../../lib/api';

export default function RevealPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [data, setData] = useState<Reveal | null>(null); const [error, setError] = useState('');
  const [count, setCount] = useState<number | null>(null); const [busy, setBusy] = useState(false);
  useEffect(() => { api<Reveal>(`/reveal/${encodeURIComponent(token)}`).then(setData).catch(e => setError(e.message)); }, [token]);
  async function reveal() {
    setError(''); setBusy(true);
    try {
      if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        for (const number of [3, 2, 1]) { setCount(number); await new Promise(resolve => setTimeout(resolve, 1050)); }
      }
      setData(await api<Reveal>(`/reveal/${encodeURIComponent(token)}`, json('POST')));
    } catch (e) { setError(e instanceof Error ? e.message : 'Não foi possível revelar sua surpresa.'); }
    finally { setCount(null); setBusy(false); }
  }
  return <main className="reveal-page"><div className="stars" aria-hidden="true">✦ <span>✧</span> ✦ <span>✳</span> ✧</div><header className="reveal-brand">✳ &nbsp; amigo doce</header><div className="reveal-content">{!data ? error ? <div className="reveal-card"><div className="gift">✦</div><h1>Ops! Algo aconteceu.</h1><p role="alert">{error}</p></div> : <div className="reveal-loading" role="status" aria-label="Preparando sua surpresa"><div className="reveal-loading-intro" aria-hidden="true"><div className="skeleton skeleton-kicker"/><div className="skeleton skeleton-event-title"/><div className="skeleton skeleton-meta"/></div><div className="reveal-card reveal-loading-card" aria-hidden="true"><div className="skeleton skeleton-gift"/><div className="skeleton skeleton-kicker"/><div className="skeleton skeleton-heading"/><div className="skeleton skeleton-copy"/><div className="skeleton skeleton-copy short"/><div className="skeleton skeleton-button"/></div><span className="sr-only">Preparando sua surpresa...</span></div> : <><div className="reveal-intro"><span className="eyebrow light">UM CONVITE ESPECIAL PARA VOCÊ</span><h1>{data.event.title}<span>.</span></h1><div className="reveal-meta">{data.event.dateTime && <span>◷ {formatDate(data.event.dateTime)}</span>}{data.event.location && <span>⌖ {data.event.location}</span>}</div>{data.event.message && <p>“{data.event.message}”</p>}</div><section className="reveal-card" aria-live="polite"><div className={`surprise-scene ${count !== null ? 'is-counting' : ''} ${data.revealed ? 'is-revealed' : ''}`} aria-hidden="true"><div className="scene-glow" /><div className="scene-sparkles"><i>✦</i><i>✧</i><i>✦</i><i>✧</i><i>✦</i><i>✧</i></div><div className="present"><div className="present-bow">∞</div><div className="present-lid" /><div className="present-box" /></div></div><span className="eyebrow">UMA SURPRESA PARA {data.participant.name.toUpperCase()}</span>{count !== null ? <><h2 key={count} className="countdown" aria-label={`Revelando em ${count}`}>{count}</h2><p>Um pouquinho de magia...</p></> : data.revealed && data.match ? <><h2>Seu amigo doce é</h2><p className="match-name reveal-name">{data.match.name}</p><p>Agora é só preparar um presente cheio de carinho.</p></> : <><h2>Olá, {data.participant.name}!</h2><p>O momento chegou. Descubra quem você vai presentear e espalhe um pouco de alegria.</p><button onClick={() => void reveal()} disabled={busy}>✦ &nbsp; {busy ? 'Preparando...' : 'Descobrir meu amigo doce'}</button></>}{error && <p role="alert" className="error">{error}</p>}</section></>}</div><footer>FEITO COM CARINHO PARA CELEBRAR ✦</footer></main>;
}
