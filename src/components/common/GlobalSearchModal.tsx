import React, { useEffect, useState } from 'react';
import { Modal, Input, Empty } from 'antd';
import {
  SearchOutlined,
  ProjectOutlined,
  FileTextOutlined,
  ArrowRightOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useBusinessStore } from '@/mock/business';
import { MoneyText } from './MoneyText';

interface GlobalSearchModalProps {
  open: boolean;
  onClose: () => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({ open, onClose }) => {
  const [keyword, setKeyword] = useState('');
  const navigate = useNavigate();
  const { data } = useBusinessStore();

  useEffect(() => {
    if (!open) {
      setKeyword('');
    }
  }, [open]);

  // 快捷键支持
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (open) onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  const kw = keyword.trim().toLowerCase();

  const filteredProjects = kw
    ? data.projects.filter(
        (p) =>
          p.id.toLowerCase().includes(kw) ||
          p.code.toLowerCase().includes(kw) ||
          p.name.toLowerCase().includes(kw) ||
          p.pmName.toLowerCase().includes(kw)
      ).slice(0, 4)
    : data.projects.slice(0, 3);

  const filteredContracts = kw
    ? data.contracts.filter(
        (c) =>
          c.id.toLowerCase().includes(kw) ||
          c.code.toLowerCase().includes(kw) ||
          c.name.toLowerCase().includes(kw)
      ).slice(0, 3)
    : [];

  const handleSelect = (route: string) => {
    onClose();
    navigate(route);
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      closable={false}
      width={640}
      styles={{
        body: { padding: 0 },
        content: { borderRadius: 16, overflow: 'hidden', padding: 0 },
      }}
      className="pms-search-modal"
    >
      <div className="p-4 border-b border-slate-100 flex items-center gap-3">
        <SearchOutlined className="text-slate-400 text-lg" />
        <Input
          placeholder="搜索项目代码、项目名称、合同编号、负责人... (支持 ⌘K / ESC)"
          variant="borderless"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          autoFocus
          className="text-base p-0 focus:shadow-none"
        />
        <span className="text-xs text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded font-mono border border-slate-200">
          ESC
        </span>
      </div>

      <div className="max-h-[380px] overflow-y-auto p-3 space-y-4">
        {/* 项目分组 */}
        <div>
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-3 mb-1.5 flex items-center gap-1.5">
            <ProjectOutlined />
            <span>核心项目</span>
          </div>
          <div className="space-y-1">
            {filteredProjects.map((p) => (
              <div
                key={p.id}
                onClick={() => handleSelect(`/projects/${p.id}/overview`)}
                className="flex items-center justify-between p-2.5 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-mono text-xs font-bold">
                    PJ
                  </div>
                  <div>
                    <div className="text-sm font-medium text-slate-800 group-hover:text-blue-600 transition-colors">
                      {p.name}
                    </div>
                    <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                      <span className="font-mono text-slate-500">{p.code || p.id}</span>
                      <span>•</span>
                      <span>PM: {p.pmName}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-xs font-semibold text-slate-700">
                      <MoneyText value={p.budgetAmount} /> 万元
                    </div>
                    <div className="text-[11px] text-slate-400">{p.phase} • {p.subPhase}</div>
                  </div>
                  <ArrowRightOutlined className="text-slate-300 group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all text-xs" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 合同分组 */}
        {filteredContracts.length > 0 && (
          <div>
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-3 mb-1.5 flex items-center gap-1.5">
              <FileTextOutlined />
              <span>关联主合同</span>
            </div>
            <div className="space-y-1">
              {filteredContracts.map((c) => (
                <div
                  key={c.id}
                  onClick={() => handleSelect(`/projects/${c.projectId}/contract`)}
                  className="flex items-center justify-between p-2.5 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-mono text-xs font-bold">
                      HT
                    </div>
                    <div>
                      <div className="text-sm font-medium text-slate-800 group-hover:text-emerald-600 transition-colors">
                        {c.name}
                      </div>
                      <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                        <span className="font-mono text-slate-500">{c.code || c.id}</span>
                        <span>•</span>
                        <span>签订日: {c.signDate}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-xs font-semibold text-slate-700">
                        <MoneyText value={c.amount} /> 万元
                      </div>
                      <div className="text-[11px] text-emerald-600 font-mono">{c.status}</div>
                    </div>
                    <ArrowRightOutlined className="text-slate-300 group-hover:text-emerald-500 group-hover:translate-x-0.5 transition-all text-xs" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {filteredProjects.length === 0 && filteredContracts.length === 0 && (
          <div className="py-8">
            <Empty description="未检索到匹配的项目或单据" image={Empty.PRESENTED_IMAGE_SIMPLE} />
          </div>
        )}
      </div>

      <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-4">
          <span>
            按 <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded font-mono text-[10px]">↵</kbd> 跳转
          </span>
          <span>
            按 <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded font-mono text-[10px]">ESC</kbd> 关闭
          </span>
        </div>
        <span className="text-[11px] text-slate-400">PMS 全生命周期企业管理平台</span>
      </div>
    </Modal>
  );
};
