import { useState } from 'react';
import { Button, Checkbox, Input, Modal, Select, Space, App } from 'antd';

type SavedView = { name: string; query: string };
export function AnalysisTools({ storageKey, params, onChange, columns, visible, onColumns, exportRows }: {
  storageKey: string; params: URLSearchParams; onChange: (next: URLSearchParams) => void;
  columns?: { value: string; label: string }[]; visible?: string[]; onColumns?: (keys: string[]) => void;
  exportRows?: string[][];
}) {
  const { message } = App.useApp();
  const [views, setViews] = useState<SavedView[]>(() => { try { return JSON.parse(localStorage.getItem(storageKey) ?? '[]'); } catch { return []; } });
  const [modal, setModal] = useState<'save' | 'columns' | 'export'>(); const [name, setName] = useState('');
  const csv = (exportRows ?? []).map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(',')).join('\n');
  return <><Space wrap style={{ marginBottom: 12 }}>
    <Select aria-label="常用视图" placeholder="常用视图" style={{ width: 180 }} value={views.find((view) => view.query === params.toString())?.name ?? null} options={views.map((v) => ({ value: v.name, label: v.name }))} onChange={(value) => { const view = views.find((v) => v.name === value); if (view) onChange(new URLSearchParams(view.query)); }} />
    <Button onClick={() => { setName(''); setModal('save'); }}>保存视图</Button>
    <Button onClick={() => onChange(new URLSearchParams())}>恢复默认视图</Button>
    {columns && <Button onClick={() => setModal('columns')}>列设置</Button>}
    {exportRows && <Button onClick={() => setModal('export')}>导出预览</Button>}
  </Space>
    <Modal title="保存常用视图" open={modal === 'save'} onCancel={() => setModal(undefined)} onOk={() => {
      if (!name.trim()) { message.error('请输入视图名称'); return; }
      const next = [...views.filter((v) => v.name !== name.trim()), { name: name.trim(), query: params.toString() }];
      try { localStorage.setItem(storageKey, JSON.stringify(next)); setViews(next); setModal(undefined); message.success('视图已保存'); } catch { message.error('浏览器无法保存视图，请检查存储设置'); }
    }}><Input aria-label="视图名称" value={name} maxLength={30} onChange={(e) => setName(e.target.value)} placeholder="例如：智慧城市高风险项目" /></Modal>
    <Modal title="列显示设置" open={modal === 'columns'} onCancel={() => setModal(undefined)} footer={<Button onClick={() => setModal(undefined)}>完成</Button>}><Checkbox.Group options={columns} value={visible} onChange={(values) => onColumns?.(values as string[])} /></Modal>
    <Modal title="当前筛选结果导出预览（CSV模拟）" open={modal === 'export'} onCancel={() => setModal(undefined)} footer={<Button onClick={() => setModal(undefined)}>关闭</Button>} width={800}><p>共 {Math.max(0, (exportRows?.length ?? 1) - 1)} 条记录，使用当前筛选范围和金额口径。</p><Input.TextArea readOnly value={csv} rows={12} aria-label="导出CSV预览" /></Modal>
  </>;
}
