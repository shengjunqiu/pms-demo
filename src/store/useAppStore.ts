import { create } from 'zustand';

export type UserRole =
  | 'executive'
  | 'pmo'
  | 'project-manager'
  | 'market'
  | 'finance'
  | 'solution-tech'
  | 'admin';

export interface UserProfile {
  id: string;
  name: string;
  role: UserRole;
  roleName: string;
  department: string;
  avatar: string;
}

export const ROLES: { key: UserRole; name: string; dept: string; desc: string }[] = [
  { key: 'executive', name: '集团领导 (王总)', dept: '集团管理层', desc: '拥有全局经营、异常监控、高阶决策权限' },
  { key: 'pmo', name: 'PMO负责人 (李主任)', dept: '集团PMO', desc: '负责项目立项评审、基线、阶段门禁与流程监管' },
  { key: 'project-manager', name: '项目经理 (张建国)', dept: '交付中心一部', desc: '负责P-001等在建项目的计划、执行、核算与交付' },
  { key: 'market', name: '客户经理/销售 (陈亮)', dept: '市场商务部', desc: '负责商机跟进、售前概算与合同签订' },
  { key: 'finance', name: '财务专员 (刘敏)', dept: '财务管理部', desc: '负责成本归集、费用审核、回款与四算对比' },
  { key: 'solution-tech', name: '方案架构师 (赵工)', dept: '技术支撑部', desc: '负责售前方案、技术可行性与WBS技术分解' },
  { key: 'admin', name: '系统管理员 (Admin)', dept: '信息技术部', desc: '负责系统配置、规则阈值与权限管理' },
];

interface AppState {
  currentRole: UserRole;
  currentUser: UserProfile;
  setRole: (role: UserRole) => void;
  selectedProjectId: string;
  setSelectedProjectId: (id: string) => void;
  asOfDate: string;
  setAsOfDate: (date: string) => void;
}

export const useAppStore = create<AppState>((set) => ({
  currentRole: 'project-manager',
  currentUser: {
    id: 'U-001',
    name: '张建国',
    role: 'project-manager',
    roleName: '项目经理',
    department: '交付中心一部',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix',
  },
  setRole: (role: UserRole) => {
    const roleInfo = ROLES.find((r) => r.key === role) || ROLES[0];
    set({
      currentRole: role,
      currentUser: {
        id: ({ executive: 'U-003', pmo: 'U-002', 'project-manager': 'U-001', market: 'U-006', finance: 'U-004', 'solution-tech': 'U-005', admin: 'U-ADMIN' })[role],
        name: /\((.+)\)/.exec(roleInfo.name)?.[1] ?? roleInfo.name,
        role: role,
        roleName: roleInfo.name,
        department: roleInfo.dept,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${role}`,
      },
    });
  },
  selectedProjectId: 'P-001',
  setSelectedProjectId: (id: string) => set({ selectedProjectId: id }),
  asOfDate: '2026-09-09',
  setAsOfDate: (date: string) => set({ asOfDate: date }),
}));
