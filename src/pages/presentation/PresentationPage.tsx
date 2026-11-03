import { useEffect, useMemo, useRef, useState } from 'react';
import { DemoDataDialog } from '@/features/demo/DemoDataDialog';
import { useNavigate } from 'react-router-dom';
import { useBusinessStore } from '@/mock/store';
import { usePresentationStore } from '@/features/presentation/store';
import { PRESENTATION_CHANNEL, PRESENTATION_PROJECT, readPosition, SCREENSHOT_TARGETS } from '@/features/presentation/model';
import html from '../../../presentation/index.html?raw';
import css from '../../../presentation/styles.css?raw';
import flowCss from '../../../presentation/flow.css?raw';
import content from '../../../presentation/content.js?raw';
import player from '../../../presentation/slides.js?raw';

const images = import.meta.glob('../../../presentation/assets/*.png', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;

export function PresentationPage() {
  const frame = useRef<HTMLIFrameElement>(null);
  const navigate = useNavigate();
  const [dataOpen, setDataOpen] = useState(false);
  const pendingTarget = useRef<string>();
  const [launch] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    let position;
    try { position = readPosition(JSON.parse(params.get('position') || 'null')); } catch { /* Ignore invalid external launch parameters. */ }
    const key = params.get('shot');
    const target = key && Object.prototype.hasOwnProperty.call(SCREENSHOT_TARGETS, key) ? SCREENSHOT_TARGETS[key] : undefined;
    return { position, target };
  });
  // Capture once: subsequent position messages must not reload the iframe.
  const [initial] = useState(() => {
    const { slide, selections } = usePresentationStore.getState();
    return launch.position || { slide, selections };
  });
  const documentSource = useMemo(() => {
    let script = content + '\n' + player;
    for (const [path, url] of Object.entries(images)) {
      script = script.split(`assets/${path.split('/').at(-1)}`).join(url);
    }
    const host = JSON.stringify({ origin: window.location.origin, initialState: initial }).replace(/</g, '\\u003c');
    return html
      .replace('<link rel="stylesheet" href="styles.css">', () => `<style>${css}</style>`)
      .replace('<link rel="stylesheet" href="flow.css">', () => `<style>${flowCss}</style>`)
      .replace('<script src="content.js"></script>\n  <script src="slides.js"></script>', () => `<script>window.PMS_PRESENTATION_HOST=${host};\n${script.replace(/<\/script/gi, '<\\/script')}</script>`);
  }, [initial]);

  useEffect(() => {
    if (!launch.position) return;
    usePresentationStore.getState().remember(launch.position);
    usePresentationStore.getState().enter('/projects/P-INIT-67');
    const data = useBusinessStore.getState().data;
    if (launch.target && data.projects.some((p) => p.id === PRESENTATION_PROJECT)
      && data.opportunities.some((o) => o.id === 'OPP-073') && data.initiations.some((i) => i.id === 'INIT-6')) {
      navigate(launch.target, { replace: true });
    } else {
      navigate('/presentation', { replace: true });
      if (launch.target) { pendingTarget.current = launch.target; setDataOpen(true); }
    }
  }, [launch, navigate]);

  useEffect(() => {
    document.title = '业务流程讲解 · 项目四算管理平台';
    const receive = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.source !== frame.current?.contentWindow) return;
      const payload = event.data;
      if (!payload || payload.channel !== PRESENTATION_CHANNEL) return;
      const position = readPosition(payload.position);
      if (position) usePresentationStore.getState().remember(position);
      if (payload.type === 'manage-data') { pendingTarget.current = undefined; setDataOpen(true); return; }
      if (payload.type === 'exit') {
        navigate(usePresentationStore.getState().entryPath);
        return;
      }
      if (payload.type !== 'open-shot' || !position || typeof payload.key !== 'string') return;
      const target = Object.prototype.hasOwnProperty.call(SCREENSHOT_TARGETS, payload.key) ? SCREENSHOT_TARGETS[payload.key] : undefined;
      if (!target) return;
      const { data } = useBusinessStore.getState();
      const exists = data.projects.some((p) => p.id === PRESENTATION_PROJECT)
        && (!target.startsWith('/opportunities/') || data.opportunities.some((o) => o.id === 'OPP-073'))
        && (!target.startsWith('/initiation/') || data.initiations.some((i) => i.id === 'INIT-6'));
      if (!exists) {
        pendingTarget.current = target;
        setDataOpen(true);
        return;
      }
      // Same-document router navigation preserves business data and the active role.
      navigate(target);
    };
    window.addEventListener('message', receive);
    return () => window.removeEventListener('message', receive);
  }, [navigate]);

  return <><iframe
    ref={frame}
    title="项目四算业务流程讲解"
    srcDoc={documentSource}
    allow="fullscreen"
    allowFullScreen
    style={{ display: 'block', position: 'fixed', inset: 0, width: '100%', height: '100dvh', border: 0, background: '#e9eef6' }}
  /><DemoDataDialog onBackupRestored={() => navigate('/projects')} open={dataOpen} onClose={() => { pendingTarget.current = undefined; setDataOpen(false); }} onLoaded={() => {
    setDataOpen(false);
    const target = pendingTarget.current;
    pendingTarget.current = undefined;
    if (target) navigate(target);
  }} /></>;
}
