import type { FullBaselineSnapshot, BudgetLine } from './budget';
import type { ReportSnapshot } from '@/mock/reports';
// 组织架构
export interface Department {
  id: string;
  name: string;
  code: string;
  parentId?: string;
  leader: string;
  level: 'group' | 'business_group' | 'department';
}

// 用户人员
export interface User {
  id: string;
  name: string;
  role: string;
  departmentId: string;
  email: string;
  phone: string;
  avatar: string;
}

// 客户信息
export interface Customer {
  id: string;
  name: string;
  industry: string;
  level: '战略客户' | '重点客户' | '普通客户';
  region: string;
  contactPerson: string;
  contactPhone: string;
}

// 商机
export interface Opportunity {
  id: string;
  code: string;
  name: string;
  customerId: string;
  customerName: string;
  ownerId: string;
  ownerName: string;
  departmentId: string;
  departmentName: string;
  estimatedAmount: number; // 万元
  status: '草稿' | '待评估' | '拟立项' | '跟进中' | '方案评审中' | '已转立项' | '暂缓' | '已终止';
  winRate: number; // 0-100
  expectedSignDate: string;
  currentEstimateVersionId?: string;
  earlyInvestmentQuota: number; // 万元
  earlyInvestmentUsed: number; // 万元
  createdAt: string;
}

// 概算版本
export interface EstimateVersion {
  id: string;
  opportunityId: string;
  version: string; // V1.0, V1.1
  isFrozen: boolean;
  totalIncome: number; // 万元
  totalCost: number; // 万元
  grossMargin: number; // 万元
  grossMarginRate: number; // 百分比
  items: {
    subjectId: string;
    subjectName: string;
    amount: number;
    description: string;
  }[];
  createdBy: string;
  createdAt: string;
}

// 项目实体
export interface Project {
  frozenEstimateVersionId?: string;
  memberIds?: string[];
  releasedBudgetPercent?: number;
  id: string;
  code: string;
  name: string;
  customerId: string;
  customerName: string;
  opportunityId: string;
  pmId: string;
  pmName: string;
  departmentId: string;
  departmentName: string;
  type: '软件开发' | '系统集成' | '咨询服务' | '运维服务' | '混合交付';
  level: '特大型' | '重大' | '重点' | '一般';
  phase: '商机' | '立项' | '执行' | '收尾' | '运维' | '已关闭';
  subPhase: '初步评估' | '方案评审' | '立项评审' | 'WBS编制' | '开发实施' | '系统联调' | '试运行' | '内部初验' | '客户终验' | '项目结算' | '质保运维';
  status: '正常进行' | '关注' | '预警' | '高风险' | '已结算' | '已终止' | '已关闭';
  health: 'green' | 'yellow' | 'orange' | 'red';
  healthReason: string;
  isUnsigned: boolean; // 是否未签立项
  unsignedLimitQuota?: number; // 未签投入限额 万元
  isMaintenance: boolean; // 是否运维项目
  contractAmount: number; // 合同金额 万元
  revenueAmount?: number; // 当前预计收入；未签项目保留拟签金额，合同金额为零
  budgetAmount: number; // 预算金额 万元
  rollingCost: number; // 滚动成本 万元
  actualCost: number; // 已发生成本 万元
  commitmentBySubject?: Record<string, number>;
  forecastBySubject?: Record<string, number>;
  committedCost: number; // 未发生承诺 万元
  forecastRemainingCost: number; // 剩余预测 万元
  costVariance: number; // 滚动成本偏差 万元
  costVarianceRate: number; // 偏差率 %
  progressRate: number; // 完工进度 %
  plannedStartDate: string;
  plannedEndDate: string;
  actualStartDate?: string;
  actualEndDate?: string;
  currentBaselineVersion: string;
}

// 合同
export interface Contract {
  opportunityId?: string;
  id: string;
  code: string;
  name: string;
  projectId: string;
  customerId: string;
  amount: number; // 万元
  signDate: string;
  acceptanceDueDate?: string;
  status: '已签订' | '履约中' | '已完成' | '已终止';
  paidAmount: number; // 实收金额 万元
  unpaidAmount: number; // 待收金额 万元
}

export interface ReceiptPlan {
  id: string;
  projectId: string;
  contractId: string;
  title: string;
  dueDate: string;
  amount: number;
  paidAmount: number;
}

// 预算版本
export interface BudgetVersion {
  details?: BudgetLine[]; ruleVersion?: string; overEstimateReasons?: string[];
  id: string;
  projectId: string;
  version: string;
  status: '草稿' | '审批中' | '待确认' | '已生效' | '已废弃';
  isOverEstimate: boolean; // 是否超概算
  totalAmount: number; // 万元
  laborCost: number;
  procurementCost: number;
  outsourceCost: number;
  expenseCost: number;
  reserveCost: number;
  items: {
    subjectId: string;
    subjectName: string;
    amount: number;
  }[];
  createdBy: string;
  createdAt: string;
}

// 基线版本
export interface BaselineVersion {
  snapshot?: FullBaselineSnapshot;
  id: string;
  projectId: string;
  version: string;
  status: '已生效' | '历史';
  scopeDesc: string;
  budgetAmount: number;
  plannedStartDate: string;
  plannedEndDate: string;
  createdAt: string;
}

// WBS任务
export interface WbsTask {
  predecessorIds?: string[]; plannedHours?: number; completionCondition?: string; milestoneId?: string; description?: string;
  id: string;
  projectId: string;
  taskCode: string;
  name: string;
  parentId?: string;
  ownerId: string;
  ownerName: string;
  plannedDays: number;
  startDate: string;
  endDate: string;
  actualStartDate?: string;
  actualEndDate?: string;
  executionNote?: string;
  progress: number; // 0-100
  isMilestone: boolean;
  status: '未开始' | '进行中' | '已完成' | '已延期';
}

// 里程碑
export interface Milestone {
  ownerId?: string; ownerName?: string; completionCondition?: string; acceptanceBasis?: string; isKey?: boolean; templateRequired?: boolean;
  completionNote?: string;
  id: string;
  projectId: string;
  name: string;
  type: '签约' | '启动' | '方案确认' | '开发完成' | '内部初验' | '客户终验' | '项目结算';
  plannedDate: string;
  actualDate?: string;
  status: '未达成' | '临期预警' | '逾期未达成' | '已达成';
  requiredDeliverables: string[];
}

// 需求
export interface Requirement {
  id: string;
  projectId: string;
  code: string;
  title: string;
  priority: '高' | '中' | '低';
  status: '待处理' | '开发中' | '待验证' | '已关闭';
  creator: string;
  owner: string;
  deadline: string;
}

// BUG
export interface Bug {
  id: string;
  projectId: string;
  code: string;
  title: string;
  severity: '致命' | '严重' | '一般' | '轻微';
  status: '待修复' | '修复中' | '待复测' | '已关闭';
  creator: string;
  owner: string;
  createdAt: string;
}

// 问题
export interface Issue {
  id: string;
  projectId: string;
  code: string;
  title: string;
  severity: '重大' | '重要' | '一般';
  status: '待解决' | '处理中' | '已解决' | '已关闭';
  owner: string;
  deadline: string;
  fromRiskId?: string;
}

// 风险
export interface Risk {
  id: string;
  projectId: string;
  code: string;
  title: string;
  level: '特大' | '重大' | '中等' | '一般';
  status: '监控中' | '已转问题' | '已缓解' | '已关闭';
  strategy: '规避' | '减轻' | '转移' | '接受';
  owner: string;
  identifiedDate: string;
}

// 日报
export interface DailyReport {
  status?: '草稿' | '已提交'; reportedProgress?: number; hasProgress?: boolean; noProgressReason?: string; coordination?: string; linkedIds?: string[]; snapshot?: ReportSnapshot;
  id: string;
  projectId: string;
  date: string;
  reporter: string;
  completedTasks: string;
  plannedTasks: string;
  spentHours: number;
}

// 周报
export interface WeeklyReport {
  status?: '草稿' | '已上报'; weekStart?: string; submittedAt?: string; coordination?: string; recipients?: string[]; snapshot?: ReportSnapshot;
  id: string;
  projectId: string;
  weekSpan: string;
  reporter: string;
  progressSummary: string;
  costStatus: string;
  riskSummary: string;
  nextWeekPlan: string;
}

// 工时记录
export interface Timesheet {
  id: string;
  projectId: string;
  userId: string;
  userName: string;
  date: string;
  hours: number;
  taskId: string;
  status: '待审核' | '已通过' | '已驳回';
}

// 成本流水
export interface CostItem {
  id: string;
  projectId: string;
  type: 'labor' | 'procurement' | 'outsource' | 'expense';
  subjectId: string;
  subjectName: string;
  amount: number; // 万元
  occurredDate: string;
  sourceId?: string; // 关联工时、采购单或报销单
  description: string;
}

// 采购记录
export interface ProcurementRecord {
  id: string;
  projectId: string;
  code: string;
  supplierName: string;
  amount: number; // 万元
  status: '询价中' | '已下单' | '部分到货' | '已全部到货' | '已结算';
  arrivalDate?: string;
}

// 外包记录
export interface OutsourceRecord {
  id: string;
  projectId: string;
  code: string;
  vendorName: string;
  amount: number; // 万元
  status: '合同签订' | '服务中' | '已终验' | '已结算';
}

// 费用报销记录
export interface ExpenseRecord {
  id: string;
  projectId: string;
  code: string;
  applicant: string;
  amount: number; // 万元
  category: '差旅费' | '业务招待费' | '会议费' | '其他期间费用';
  status: '待审批' | '财务已审核' | '已打款';
  applyDate: string;
}

// 变更记录
export interface ProjectChange {
  id: string;
  projectId: string;
  code: string;
  title: string;
  type: '范围变更' | '工期变更' | '成本变更' | '资源变更' | '合同变更' | '综合重大变更';
  costImpact: number; // 万元
  scheduleImpactDays: number;
  status: '草稿' | 'PMO审批中' | 'PMC审议中' | '已批准' | '已否决';
  newBaselineId?: string;
  createdAt: string;
}

// 阶段切换记录
export interface StageGateRecord {
  id: string;
  projectId: string;
  fromPhase: string;
  toPhase: string;
  status: '待提交' | '审核中' | '已通过' | '整改退回';
  auditor: string;
  auditDate?: string;
  comments: string;
}

// 验收记录
export interface AcceptanceRecord {
  id: string;
  projectId: string;
  type: '内部初验' | '供应商验收' | '客户终验';
  round: number;
  status: '待验收' | '整改中' | '已通过';
  acceptanceDate?: string;
  amount: number; // 万元
}

// 结算记录
export interface SettlementRecord {
  id: string;
  projectId: string;
  finalIncome: number; // 万元
  finalCost: number; // 万元
  finalGrossMargin: number;
  finalGrossMarginRate: number;
  status: '草稿' | '审核中' | '已锁定已生效';
  isCostLocked: boolean;
  settledDate?: string;
}

// 待决策事项
export interface DecisionItem {
  id: string;
  projectId: string;
  projectName: string;
  type: '超概算审批' | '重大变更审批' | '重大风险处置' | '未签额外投入' | '结算争议审定' | '重大验收异常';
  title: string;
  impactAmount: number; // 万元
  level: 'PMC决策会' | 'PMO立项会' | '高管审批';
  status: '待决策' | '已通过' | '已否决';
  targetRoute: string;
  createdAt: string;
}

// 预警记录
export interface WarningRecord {
  id: string;
  projectId: string;
  type: '成本超支' | '进度严重逾期' | '回款超期' | '未签超限' | '重大质量隐患';
  level: 'red' | 'orange' | 'yellow';
  title: string;
  detail: string;
  status: '未消除' | '已处理' | '已消除';
  createdAt: string;
}

// 审计日志
export interface AuditLog {
  id: string;
  operatorId: string;
  operatorName: string;
  action: string;
  targetType: string;
  targetId: string;
  detail: string;
  ip: string;
  timestamp: string;
}
