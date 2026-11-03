import { useEffect, useRef, useState } from 'react';
import { Alert, App, Button, Descriptions, Modal, Select, Space, Typography } from 'antd';
import { useBusinessStore } from '@/mock/store';
import { hasDemo, listBackups, packageState, parsePackage, readSnapshot, saveDemo, useDemoPersistence, type SnapshotInfo, type WorkspacePackage } from './persistence';

export function DemoDataDialog({ open, onClose, onLoaded, onBackupRestored }: { open: boolean; onClose: () => void; onLoaded?: () => void; onBackupRestored?: () => void }) {
  const { message } = App.useApp();
  const file = useRef<HTMLInputElement>(null);
  const persistence = useDemoPersistence();
  const [savedAt, setSavedAt] = useState<string>();
  const [backups, setBackups] = useState<SnapshotInfo[]>([]);
  const [backupId, setBackupId] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const refresh = async () => {
    try {
      const [saved, items] = await Promise.all([readSnapshot(), listBackups()]);
      setSavedAt(saved?.savedAt); setBackups(items);
    } catch (error) { setError(String(error)); }
  };
  useEffect(() => { if (open) { setError(undefined); void refresh(); } }, [open]);
  const data = useBusinessStore((s) => s.data);
  const project = data.projects.find((p) => p.id === 'P-INIT-67');
  const load = async (source: 'saved' | 'built-in' | WorkspacePackage | { backup: string }) => {
    setBusy(true); setError(undefined);
    try {
      await useBusinessStore.getState().loadDemo(source);
      void message.success('工作区已载入；原工作区已完整备份，当前角色保持不变');
      await refresh();
      if (!hasDemo(useBusinessStore.getState().data) || (typeof source === 'object' && 'backup' in source)) { onClose(); onBackupRestored?.(); }
      else onLoaded?.();
    } catch (error) { setError(error instanceof Error ? error.message : String(error)); }
    finally { setBusy(false); }
  };
  const exportData = () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(packageState(useBusinessStore.getState().data))], { type: 'application/json' }));
    const anchor = document.createElement('a');
    anchor.href = url; anchor.download = `海州演示工作区-${new Date().toISOString().replace(/[:.]/g, '-')}.json`; anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return <Modal title="演示数据与恢复" open={open} onCancel={busy ? undefined : onClose} footer={<Button aria-label="关闭恢复窗口" onClick={onClose} disabled={busy}>关闭</Button>} width={700} maskClosable={!busy} closable={!busy} styles={{ body: { maxHeight: '65vh', overflowY: 'auto' } }}>
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Alert type="info" showIcon message="海州案例 · 可恢复的本机演示工作区" description="载入前会完整备份当前工作区，可从下方恢复。案例包含商机、立项、合同、预算、计划与启动记录；载入不代办审批，也不切换当前角色。" />
      <Descriptions column={1} size="small" bordered>
        <Descriptions.Item label="当前案例">{project ? `${project.name} · ${project.phase} / ${project.subPhase}` : '当前工作区未载入海州案例'}</Descriptions.Item>
        <Descriptions.Item label="本机保存">{persistence.status === 'saving' ? '正在保存，请等到保存完成后关闭页面' : persistence.active && persistence.status === 'saved' ? `已保存 · ${new Date(persistence.savedAt!).toLocaleString()}` : savedAt ? `可载入 · ${new Date(savedAt).toLocaleString()}` : '尚无本机案例，可使用随稿恢复包'}</Descriptions.Item>
      </Descriptions>
      {(error || persistence.error) && <Alert type="error" showIcon message={error || persistence.error} />}
      <Space wrap>
        <Button type="primary" loading={busy} disabled={!savedAt} onClick={() => void load('saved')}>载入本机已保存案例</Button>
        <Button loading={busy} onClick={() => void load('built-in')}>恢复随稿案例（已签约已启动）</Button>
      </Space>
      <Typography.Text type="secondary">随稿恢复点：2026-09-09正式启动，合同2860万元、预算1944.80万元；任务实际进度、实际成本和实收均为0。后续业务尚未完成。</Typography.Text>
      <Space wrap>
        <Button disabled={busy || !persistence.active || !hasDemo(data)} onClick={async () => { await saveDemo(useBusinessStore.getState().data); await refresh(); }}>立即保存案例</Button>
        <Button disabled={busy} onClick={exportData}>导出当前工作区备份</Button>
        <Button disabled={busy} onClick={() => file.current?.click()}>从备份文件载入</Button>
        <input ref={file} type="file" accept="application/json,.json" aria-label="选择演示备份文件" hidden onChange={async (event) => {
          const chosen = event.target.files?.[0]; event.target.value = '';
          if (!chosen) return;
          try {
            if (chosen.size > 30 * 1024 * 1024) throw new Error('备份文件超过30MB，请确认文件正确');
            await load(parsePackage(JSON.parse(await chosen.text())));
          } catch (error) { setError(error instanceof Error ? error.message : String(error)); }
        }} />
      </Space>
      {backups.length > 0 && <Space direction="vertical" style={{ width: '100%' }}>
        <Typography.Text strong>载入前工作区备份</Typography.Text>
        <Select virtual={false} aria-label="载入前工作区备份" style={{ width: '100%' }} placeholder="选择要返回的工作区" value={backupId} onChange={setBackupId} disabled={busy} options={backups.map((s) => ({ value: s.id, label: `${new Date(s.savedAt).toLocaleString()} · ${s.label}` }))} />
        <Button disabled={!backupId || busy} onClick={() => void load({ backup: backupId! })}>恢复所选工作区备份</Button>
      </Space>}
      <Typography.Text type="secondary">本机保存使用当前浏览器与原型地址的存储。现场继续使用同一地址；清理浏览器数据或换电脑前，请先导出备份。保存失败时会明确提示。</Typography.Text>
    </Space>
  </Modal>;
}
