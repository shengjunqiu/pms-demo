import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { prepareBusinessStore } from './mock/store';

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(<div style={{ padding: 40 }}>正在载入本机演示工作区…</div>);
void prepareBusinessStore().then(() => {
  root.render(<React.StrictMode><App /></React.StrictMode>);
}).catch((error: unknown) => {
  root.render(<div role="alert" style={{ padding: 40 }}>
    <h2>演示工作区未能载入</h2>
    <p>{error instanceof Error ? error.message : String(error)}</p>
    <p>已停止载入，原有备份保留。请检查浏览器存储后重试。</p>
    <button onClick={() => window.location.reload()}>重新载入</button>
  </div>);
});
