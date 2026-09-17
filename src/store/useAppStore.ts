import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

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

const ROLE_USER_IDS: Record<UserRole, string> = {
  executive: 'U-003',
  pmo: 'U-002',
  'project-manager': 'U-001',
  market: 'U-006',
  finance: 'U-004',
  'solution-tech': 'U-005',
  admin: 'U-ADMIN',
};

/** 由角色推导用户档案，保证 currentRole 与 currentUser 始终一致 */
export function buildUserProfile(role: UserRole): UserProfile {
  const roleInfo = ROLES.find((r) => r.key === role) || ROLES[0];
  return {
    id: ROLE_USER_IDS[role] ?? 'U-001',
    name: /\((.+)\)/.exec(roleInfo.name)?.[1] ?? roleInfo.name,
    role,
    roleName: roleInfo.name,
    department: roleInfo.dept,
    avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${role}`,
  };
}

function isValidRole(role: unknown): role is UserRole {
  return typeof role === 'string' && ROLES.some((r) => r.key === role);
}

function getStorage(): Storage {
  if (typeof localStorage !== 'undefined') return localStorage;
  // 测试/SSR 环境使用内存 fallback
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => { store.set(key, value); },
    removeItem: (key: string) => { store.delete(key); },
    get length() { return store.size; },
    key: (index: number) => [...store.keys()][index] ?? null,
    clear: () => store.clear(),
  };
}

interface AppState {
  currentRole: UserRole;
  currentUser: UserProfile;
  setRole: (role: UserRole) => void;
  selectedProjectId: string;
  setSelectedProjectId: (id: string) => void;
  asOfDate: string;
  setAsOfDate: (date: string) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      currentRole: 'project-manager',
      currentUser: buildUserProfile('project-manager'),
      setRole: (role: UserRole) => {
        set({ currentRole: role, currentUser: buildUserProfile(role) });
      },
      selectedProjectId: 'P-001',
      setSelectedProjectId: (id: string) => set({ selectedProjectId: id }),
      asOfDate: '2026-09-09',
      setAsOfDate: (date: string) => set({ asOfDate: date }),
    }),
    {
      name: 'pms-app-session',
      storage: createJSONStorage(() => getStorage()),
      // 只持久化会话偏好；currentUser 由 currentRole 重新推导，避免不一致
      partialize: (s) => ({
        currentRole: s.currentRole,
        selectedProjectId: s.selectedProjectId,
        asOfDate: s.asOfDate,
      }),
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<AppState>;
        const role = isValidRole(p.currentRole) ? p.currentRole : current.currentRole;
        return {
          ...current,
          currentRole: role,
          currentUser: buildUserProfile(role),
          selectedProjectId: typeof p.selectedProjectId === 'string' && p.selectedProjectId ? p.selectedProjectId : current.selectedProjectId,
          asOfDate: typeof p.asOfDate === 'string' && p.asOfDate ? p.asOfDate : current.asOfDate,
        };
      },
    },
  ),
);
