import React, { useMemo, useState, useEffect, useRef } from 'react';
import { CATEGORY_COLORS, bubbleConnections, computeBubbleLayout, scaleBubblesToViewport, deleteDirectoryFromDirectoryMap, deleteFileFromDirectoryMap, filterAndRankItems, formatSize, getParentPath, type FileCategory, type FilterMode, type RankedDirItem, type RawDirItem } from './utils/bubblePacking';
import { PRESET_DRIVES, VIRTUAL_DIRECTORIES } from './data/virtualFileSystem';

const DOWNLOADS = 'Sample/Downloads';
export default function App() {
  const [map, setMap] = useState<Record<string, RawDirItem[]>>(() => ({...VIRTUAL_DIRECTORIES}));
  const [path, setPath] = useState(DOWNLOADS);
  const [history, setHistory] = useState([DOWNLOADS]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [search, setSearch] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const mapRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{x:number; y:number; left:number; top:number; moved:boolean} | null>(null);
  const suppressClick = useRef(false);
  const zoomRef = useRef(zoom);
  useEffect(() => { zoomRef.current = zoom; }, [zoom]);
  useEffect(() => {
    const el = mapRef.current;
    if (!el) return;
    const ownsFocus = () => document.activeElement === el || el.contains(document.activeElement);
    const setZoomMode = (active: boolean) => { el.dataset.zooming = active ? 'true' : 'false'; };
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Control' && ownsFocus()) setZoomMode(true); };
    const onKeyUp = (event: KeyboardEvent) => { if (event.key === 'Control') setZoomMode(false); };
    const onBlur = () => setZoomMode(false);
    const onWheel = (event: WheelEvent) => {
      if (!event.ctrlKey || !ownsFocus()) return;
      event.preventDefault();
      setZoomMode(true);
      const oldZoom = zoomRef.current;
      const next = Math.max(1, Math.min(5, Math.round(oldZoom * (event.deltaY < 0 ? 1.2 : 1 / 1.2) * 100) / 100));
      if (next === oldZoom) return;
      const bounds = el.getBoundingClientRect();
      const px = Math.max(0, Math.min(bounds.width, event.clientX - bounds.left));
      const py = Math.max(0, Math.min(bounds.height, event.clientY - bounds.top));
      const left = el.scrollLeft, top = el.scrollTop, ratio = next / oldZoom;
      zoomRef.current = next; setZoom(next);
      requestAnimationFrame(() => {
        el.scrollLeft = (left + px) * ratio - px; el.scrollTop = (top + py) * ratio - py;
        if (dragRef.current) { dragRef.current.x = event.clientX; dragRef.current.y = event.clientY; dragRef.current.left = el.scrollLeft; dragRef.current.top = el.scrollTop; }
      });
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    el.addEventListener('blur', onBlur);
    window.addEventListener('wheel', onWheel, { passive: false, capture: true });
    return () => { window.removeEventListener('keydown', onKeyDown); window.removeEventListener('keyup', onKeyUp); window.removeEventListener('blur', onBlur); el.removeEventListener('blur', onBlur); window.removeEventListener('wheel', onWheel, true); };
  }, []);
  const [filter, setFilter] = useState<FilterMode>('Both');
  const [category, setCategory] = useState<FileCategory | 'All'>('All');
  const [selected, setSelected] = useState<number | null>(null);
  const [pending, setPending] = useState<RankedDirItem | null>(null);
  const [undo, setUndo] = useState<{map: Record<string, RawDirItem[]>; name: string} | null>(null);
  const [notice, setNotice] = useState('');
  const [termsOpen, setTermsOpen] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [theme, setTheme] = useState(() => sessionStorage.getItem('vibos-theme') || 'system');
  useEffect(() => { sessionStorage.setItem('vibos-theme', theme); }, [theme]);
  useEffect(() => { if (!pending) return; const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setPending(null); }; window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey); }, [pending]);
  const [systemDark, setSystemDark] = useState(() => window.matchMedia('(prefers-color-scheme: dark)').matches);
  useEffect(() => { const m = window.matchMedia('(prefers-color-scheme: dark)'); const change = () => setSystemDark(m.matches); m.addEventListener('change', change); return () => m.removeEventListener('change', change); }, []);
  const effectiveTheme = theme === 'system' ? (systemDark ? 'dark' : 'light') : theme;
  const {rankedItems, bubbleInputItems, totalSize} = useMemo(() => filterAndRankItems(map[path] || [], filter, category), [map, path, filter, category]);
  const bubbles = useMemo(() => scaleBubblesToViewport(computeBubbleLayout(bubbleInputItems, totalSize), 800, 500, 30), [bubbleInputItems, totalSize]);
  const item = selected === null ? null : rankedItems.find(x => x.rank === selected) || null;
  const navigate = (next: string) => { if (!map[next] || next === path) return; setHistory([...history.slice(0, historyIndex + 1), next]); setHistoryIndex(historyIndex + 1); setPath(next); setSelected(null); setNotice(''); setZoom(1); };
  const goHistory = (offset: number) => { let next = historyIndex + offset; while (next >= 0 && next < history.length && !map[history[next]]) next += offset; if (next < 0 || next >= history.length) return; setHistoryIndex(next); setPath(history[next]); setSelected(null); setNotice(''); setZoom(1); };
  const parent = getParentPath(path);
  const remove = () => {
    if (!pending) return;
    setUndo({map, name: pending.name});
    setMap(pending.is_dir ? deleteDirectoryFromDirectoryMap(map, path, pending) : deleteFileFromDirectoryMap(map, path, pending));
    setNotice(`Removed “${pending.name}” from the sample.`); setPending(null); setSelected(null);
  };
  return <div className="app" data-theme={effectiveTheme}>
    <header className="top"><div className="brand-group"><button className="menu-toggle" aria-expanded={sidebarOpen} aria-controls="utility-sidebar" onClick={() => setSidebarOpen(v => !v)}>☰ <span>Menu</span></button><img className="brand-logo" src={`${import.meta.env.BASE_URL}vibos-mark-${effectiveTheme}.png`} alt="" /><strong className="brand">VIBOS</strong><span className="tag">Web demo</span></div><span className="header-note">VISUAL STORAGE EXPLORER</span></header>
    <div className="app-shell">
      {sidebarOpen && <aside className="utility-sidebar" id="utility-sidebar" aria-label="Demo settings and download"><p className="side-label">CONTROLS</p><label className="side-field">Appearance<select value={theme} onChange={e => setTheme(e.target.value)}><option value="system">System</option><option value="light">Paper &amp; Tangerine</option><option value="dark">Ink &amp; Mint</option></select></label><label className="side-field" htmlFor="samples">Sample folder<select id="samples" value={path === DOWNLOADS ? DOWNLOADS : PRESET_DRIVES.some(p => p.rootPath === path) ? path : ''} onChange={e => navigate(e.target.value)}><option value="" disabled>Choose a sample</option><option value={DOWNLOADS}>Student Downloads</option>{PRESET_DRIVES.map(p => <option key={p.id} value={p.rootPath}>{p.label}</option>)}</select></label><div className="side-divider"/><p className="side-label">DESKTOP APP</p><p className="side-copy">Explore folders on your own computer.</p><button onClick={() => {setAccepted(false); setTermsOpen(true);}}>Get Python App (.py)</button><p className="side-hint">Includes setup steps and terms.</p></aside>}
    <main>
      <div className="notice"><strong>Sample data only.</strong> This demo cannot scan or delete files on your computer. Changes reset when you refresh the page.</div>
      <section className="intro"><div><p className="eyebrow">A clearer view of your storage</p><h1>Explore your space, one bubble at a time.</h1><p>Try a student’s Downloads folder to see how files and folders use space.</p></div><button className="primary" onClick={() => navigate(DOWNLOADS)}>Explore Downloads</button></section>
      <section className="toolbar" aria-label="Sample navigation"><div className="navrow"><strong>Sample folder</strong><span className="path">{path}</span><button disabled={historyIndex <= 0} onClick={() => goHistory(-1)}>Back</button><button disabled={historyIndex >= history.length - 1} onClick={() => goHistory(1)}>Forward</button><button disabled={!parent || !map[parent]} onClick={() => parent && navigate(parent)}>Up one level</button></div><div className="navrow"><div className="filters" role="group" aria-label="Filter items">{([['Both','Everything'],['Files','Files'],['Directories','Folders']] as [FilterMode,string][]).map(([value,label]) => <button key={value} className={filter === value ? 'active' : ''} aria-pressed={filter === value} onClick={() => {setFilter(value); setSelected(null);}}>{label}</button>)}</div></div></section>
      {notice && <div className="feedback" role="status">{notice} {undo && <button onClick={() => {setMap(undo.map); setNotice(`Restored “${undo.name}” in the sample.`); setUndo(null); setSelected(null);}}>Undo</button>}</div>}
      <div className="workspace"><section className="panel map"><h2>Bubble map</h2><p className="muted">Bigger bubbles represent items using more space. Select one to see details.</p><div className="zoomrow" role="group" aria-label="Bubble map zoom"><span>Map zoom:</span><button disabled={zoom <= 1} onClick={() => setZoom(z => Math.max(1, Math.round(z / 1.3 * 100) / 100))} aria-label="Zoom out">−</button><span aria-live="polite">{Math.round(zoom * 100)}%</span><button disabled={zoom >= 5} onClick={() => setZoom(z => Math.min(5, Math.round(z * 1.3 * 100) / 100))} aria-label="Zoom in">+</button><button onClick={() => setZoom(1)}>Reset</button><span className="muted small">Click map, hold Ctrl + scroll to zoom. Drag to pan, even while zooming.</span></div><div className="canvas" ref={mapRef} tabIndex={0} aria-label="Interactive bubble map. Click, then use Ctrl and mouse wheel to zoom; drag to move." onPointerDown={e => { if (e.button !== 0) return; e.currentTarget.focus(); if (e.ctrlKey) suppressClick.current=true; dragRef.current = {x:e.clientX, y:e.clientY, left:e.currentTarget.scrollLeft, top:e.currentTarget.scrollTop, moved:false}; }} onKeyDown={e => { if (e.target !== e.currentTarget) return; const offsets: Record<string, [number, number]> = {ArrowLeft:[-50,0], ArrowRight:[50,0], ArrowUp:[0,-50], ArrowDown:[0,50]}; if (offsets[e.key]) {e.preventDefault(); const [dx,dy]=offsets[e.key]; e.currentTarget.scrollLeft+=dx; e.currentTarget.scrollTop+=dy;} }} onPointerMove={e => {const d=dragRef.current; if (!d) return; const dx=e.clientX-d.x, dy=e.clientY-d.y; if (Math.abs(dx)+Math.abs(dy)>5) {d.moved=true; e.currentTarget.setPointerCapture(e.pointerId); e.currentTarget.scrollLeft=d.left-dx; e.currentTarget.scrollTop=d.top-dy;}}} onPointerUp={e => {if (dragRef.current?.moved || e.ctrlKey) suppressClick.current=true; dragRef.current=null; if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);}} onPointerCancel={() => {dragRef.current=null; suppressClick.current=false;}} onClickCapture={e => {if (suppressClick.current || e.ctrlKey || e.currentTarget.dataset.zooming === 'true') { e.preventDefault(); e.stopPropagation(); suppressClick.current=false; }}}><svg style={{width: `${zoom * 100}%`, maxWidth:'none'}} viewBox="0 0 800 500" role="group" aria-label="Sample storage bubble map"><g className="bubble-links" aria-hidden="true">{bubbleConnections(bubbles).map(([a,b]) => <line key={`${a.rank}-${b.rank}`} x1={a.sx} y1={a.sy} x2={b.sx} y2={b.sy} />)}</g>{bubbles.map(b => {const color = CATEGORY_COLORS[b.category]; const r = b.sr || 1; return <g key={b.rank} role="button" tabIndex={0} aria-label={`${b.name}, ${formatSize(b.size)}`} onClick={() => b.category !== 'Grouped' && setSelected(b.rank)} onKeyDown={e => {if((e.key === 'Enter' || e.key === ' ') && b.category !== 'Grouped') {e.preventDefault(); setSelected(b.rank);}}} onDoubleClick={() => b.is_dir && b.path && navigate(b.path)}><title>{b.name} · {formatSize(b.size)}</title><circle cx={b.sx} cy={b.sy} r={r} fill={color.fill} stroke={selected === b.rank ? 'var(--accent)' : color.outline} strokeWidth={selected === b.rank ? 5 : 2}/>{r * zoom > 30 && <text x={b.sx} y={b.sy} textAnchor="middle" fill={color.text} fontSize={Math.min(15, Math.max(10, r * zoom/5)) / zoom} fontWeight="700"><tspan x={b.sx} dy="-.2em">{b.name.length > r * zoom/4 ? b.name.slice(0, Math.max(4, Math.floor(r * zoom/4)-1)) + '…' : b.name}</tspan><tspan x={b.sx} dy="1.4em">{formatSize(b.size)}</tspan></text>}</g>})}</svg>{!bubbles.length && <p className="empty">No items match this filter.</p>}</div><div className="legend" role="group" aria-label="Filter by category"><button className="category-filter all-categories" aria-pressed={category === 'All'} onClick={() => {setCategory('All'); setSelected(null);}}>All categories</button>{(Object.entries(CATEGORY_COLORS) as [FileCategory, typeof CATEGORY_COLORS[FileCategory]][]).map(([name,color]) => <button className="category-filter" key={name} aria-pressed={category === name} onClick={() => {setCategory(category === name ? 'All' : name); setSelected(null);}} style={{'--category-color':color.fill} as React.CSSProperties} title={name === 'Grouped' ? 'Items combined into the smaller-items bubble for the current Files/Folders view' : `Show ${name === 'Directory' ? 'folders' : name}`}><span className="swatch" aria-hidden="true" style={{backgroundColor:color.fill, borderColor:color.outline}} />{name === 'Directory' ? 'Folder' : name}</button>)}</div><p className="muted small">Select a category to filter. Grouped means items beyond the first 54 when there are over 55. Lines are decorative, not file relationships.</p></section>
      <aside className="side"><section className="panel"><h2>Selected item</h2>{item ? <><h3 className="break">{item.name}</h3><p>{item.is_dir ? 'Folder' : `File · ${item.category}`} · {formatSize(item.size)}</p><p className="muted small">{item.pct.toFixed(1)}% of this view</p><div className="actions">{item.is_dir && item.path && map[item.path] && <button onClick={() => navigate(item.path!)}>Open folder</button>}{item.path && <button className="danger" onClick={() => setPending(item)}>Remove from sample</button>}</div></> : <p className="muted">Select a bubble or an item in the list.</p>}</section><section className="panel ranking"><div className="rankinghead"><h2>Largest items</h2><span>{formatSize(totalSize)} · {rankedItems.length} items</span></div><label className="search-label">Search items <input type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name" /></label><div className="items">{rankedItems.filter(i => i.name.toLowerCase().includes(search.toLowerCase())).map(i => <button className={'item '+(selected === i.rank ? 'chosen' : '')} key={i.path || i.rank} onClick={() => setSelected(i.rank)} onDoubleClick={() => i.is_dir && i.path && navigate(i.path)}><span><strong>{i.name}</strong><small>{i.is_dir ? 'Folder' : i.category}</small></span><strong>{formatSize(i.size)}</strong></button>)}</div></section></aside></div>

    </main>
    </div>
    {termsOpen && <div className="overlay"><div className="dialog terms" role="dialog" aria-modal="true" aria-labelledby="terms-title"><h2 id="terms-title">VIBOS desktop app: terms of use</h2><div className="terms-body" tabIndex={0}>
      <p><strong>Draft terms and privacy notice · 15 November 2026</strong></p>
      <p><strong>About VIBOS.</strong> The web demo uses fictional data only. The desktop app scans folders you select and displays names, paths, file types and calculated sizes. Results may be incomplete when files are inaccessible, skipped or change during scanning. Use the app only on devices and files you are authorized to access.</p>
      <p><strong>Real files and backups.</strong> You choose each file or folder and confirm before it is sent to the Recycle Bin. Keep backups and review the full path first. Recovery is not guaranteed; Windows or drive settings can result in permanent removal, and the bin can be emptied. VIBOS has no in-app Undo for real files.</p>
      <p><strong>Privacy and local processing.</strong> The current desktop code reads metadata locally to calculate and display results; it does not send scan data to VIBOS servers. Chosen folders, navigation and scan results are held in memory for the current session. The web demo keeps sample changes in memory until reload and stores the theme choice in browser session storage. Access to your device, backups, logs or screenshots may expose file information to others.</p>
      <p><strong>Hosting and dependencies.</strong> Your browser contacts the web host to load the demo or download the app; hosting providers may receive technical data such as IP addresses or access logs according to their own practices. The publisher must verify and disclose any hosting, analytics, retention and other data practices before release. Installing Python or Send2Trash contacts their package providers and is subject to their terms.</p>
      <p><strong>Your responsibilities.</strong> Protect your device and backups, review actions before confirming, and do not use VIBOS to access data without permission or interfere with other systems.</p>
      <p><strong>Availability and liability.</strong> To the extent permitted by law, VIBOS is provided “as is” and “as available” without warranties, and its creators disclaim liability for loss or damage related to its use, including data loss. No term excludes rights, warranties or liability that cannot lawfully be excluded.</p>
      <p><strong>Rights and contact.</strong> Applicable privacy laws may give people rights over their personal data, including the rights to information, access and correction. The publisher must add its name, contact and a way to exercise rights before public release. Nothing here waives applicable privacy rights.</p>
      <p><strong>Changes and third-party terms.</strong> The publisher may update these draft terms; changes should be dated and communicated as appropriate. Dependencies remain subject to their own licenses. These terms do not transfer ownership of VIBOS or of users’ files.</p>
      <p><strong>Setup:</strong> After downloading the Python file, install Python 3 and run <code>py -m pip install Send2Trash</code> to enable the Recycle Bin action. Then run <code>py VIBOS_APP.py</code>.</p>
      <p><strong>Before public release:</strong> identify the publisher and contact, verify hosting and data practices, and obtain legal review of these draft terms and privacy notice.</p></div><label className="accept"><input type="checkbox" checked={accepted} onChange={e => setAccepted(e.target.checked)}/> I have read and agree to these terms.</label><div className="actions"><button autoFocus onClick={() => setTermsOpen(false)}>Cancel</button>{accepted ? <a className="button primary" href={`${import.meta.env.BASE_URL}VIBOS_APP.py`} download="VIBOS_APP.py" onClick={() => setTermsOpen(false)}>Agree and download (.py)</a> : <button className="primary" disabled>Agree and download (.py)</button>}</div></div></div>}
    {pending && <div className="overlay" onMouseDown={e => {if(e.target === e.currentTarget) setPending(null);}}><div className="dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title"><h2 id="dialog-title">Remove from sample?</h2><p>This changes demo data only. No files on your computer will be deleted. You can Undo afterward.</p><p className="break"><strong>{pending.name}</strong><br/>{pending.is_dir ? 'Sample folder and its contents' : 'Sample file'} · {formatSize(pending.size)}</p><div className="actions"><button autoFocus onClick={() => setPending(null)}>Cancel</button><button className="danger" onClick={remove}>Remove from sample</button></div></div></div>}
  </div>;
}
