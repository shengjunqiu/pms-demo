import { useState } from 'react';
import { Button } from 'antd';
import { useNavigate } from 'react-router-dom';
import { DemoDataDialog } from './DemoDataDialog';
import { useDemoPersistence } from './persistence';

export function DemoDataButton() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const status = useDemoPersistence((s) => s.status);
  return <>
    <Button danger={status === 'error'} onClick={() => setOpen(true)} aria-label="演示数据与恢复">{status === 'error' ? '演示保存失败' : status === 'saving' ? '案例保存中…' : '演示数据'}</Button>
    <DemoDataDialog open={open} onClose={() => setOpen(false)} onLoaded={() => setOpen(false)} onBackupRestored={() => navigate('/projects')} />
  </>;
}
