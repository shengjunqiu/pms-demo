import { assessHealth } from '@/utils/health';
import { sumMoney, allocateMoney, money } from '@/utils/money';
import {
  Department,
  User,
  Customer,
  Opportunity,
  EstimateVersion,
  Project,
  Contract,
  BudgetVersion,
  BaselineVersion,
  WbsTask,
  Milestone,
  Requirement,
  Bug,
  Issue,
  Risk,
  DailyReport,
  WeeklyReport,
  Timesheet,
  CostItem,
  ProcurementRecord,
  OutsourceRecord,
  ExpenseRecord,
  ProjectChange,
  StageGateRecord,
  AcceptanceRecord,
  SettlementRecord,
  DecisionItem,
  WarningRecord,
  AuditLog,
} from '@/models/types';

export const MOCK_SEED = 20260909;
// 固定演示基准日: 2026-09-09
export const AS_OF_DATE = '2026-09-09';

// 1. 组织 (≥12)
export const mockDepartments: Department[] = [
  { id: 'D-001', name: '集团总部', code: 'GRP', leader: '王总', level: 'group' },
  { id: 'D-002', name: '智慧城市业务群', code: 'BG-CITY', parentId: 'D-001', leader: '张总', level: 'business_group' },
  { id: 'D-003', name: '数字政务业务群', code: 'BG-GOV', parentId: 'D-001', leader: '赵总', level: 'business_group' },
  { id: 'D-004', name: '工业互联网业务群', code: 'BG-IND', parentId: 'D-001', leader: '孙总', level: 'business_group' },
  { id: 'D-005', name: '数字交通业务群', code: 'BG-TRANS', parentId: 'D-001', leader: '周总', level: 'business_group' },
  { id: 'D-006', name: '集团PMO部', code: 'PMO', parentId: 'D-001', leader: '李主任', level: 'department' },
  { id: 'D-007', name: '交付中心一部', code: 'DELIV-1', parentId: 'D-002', leader: '张建国', level: 'department' },
  { id: 'D-008', name: '交付中心二部', code: 'DELIV-2', parentId: 'D-002', leader: '刘经理', level: 'department' },
  { id: 'D-009', name: '政务方案部', code: 'SOL-GOV', parentId: 'D-003', leader: '赵工', level: 'department' },
  { id: 'D-010', name: '市场商务部', code: 'MKT-1', parentId: 'D-002', leader: '陈亮', level: 'department' },
  { id: 'D-011', name: '财务管理部', code: 'FIN', parentId: 'D-001', leader: '刘敏', level: 'department' },
  { id: 'D-012', name: '质量安全与风控部', code: 'QA-RISK', parentId: 'D-001', leader: '黄总监', level: 'department' },
  { id: 'D-013', name: '运维支持中心', code: 'OPS-CTR', parentId: 'D-001', leader: '郑经理', level: 'department' },
  { id: 'D-014', name: '技术架构委员会', code: 'TECH-ARCH', parentId: 'D-001', leader: '吴首席', level: 'department' },
];

// 2. 人员 (≥45)
export const mockUsers: User[] = Array.from({ length: 50 }).map((_, i) => {
  const id = `U-${String(i + 1).padStart(3, '0')}`;
  const roles = ['项目经理', '方案架构师', '高级开发工程师', '测试经理', '财务专员', '市场商务经理', 'PMO专员', '质控专员'];
  const depts = mockDepartments.map((d) => d.id);
  const names = ['张建国', '李主任', '王总', '刘敏', '赵工', '陈亮', '黄总监', '郑经理', '钱工程师', '孙总', '吴首席', '周总', '冯架构', '沈开发'];
  const name = i < names.length ? names[i] : `${['林', '何', '许', '郑', '吴', '杜'][Math.floor((i - names.length) / 6)]}${['志远', '思齐', '文静', '嘉宁', '明哲', '晓晨'][(i - names.length) % 6]}`;
  return {
    id,
    name,
    role: ['项目经理', 'PMO负责人', '集团领导', '财务专员', '方案架构师', '市场商务经理'][i] ?? roles[i % roles.length],
    departmentId: depts[i % depts.length],
    email: `user_${i + 1}@pms-group.com`,
    phone: `13800138${String(i).padStart(3, '0')}`,
    avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=User${i + 1}`,
  };
});

// 3. 客户 (≥30)
export const mockCustomers: Customer[] = Array.from({ length: 32 }).map((_, i) => {
  const id = `CUST-${String(i + 1).padStart(3, '0')}`;
  const industries = ['政府与公共安全', '数字政务', '智慧交通', '智能制造', '生态环境', '金融科技'];
  const regions = ['福建省', '广东省', '浙江省', '江苏省', '北京市', '上海市', '四川省'];
  const fixedNames = [
    '福建省晋江市海洋与渔业局',
    '福建省生态环境厅',
    '某市城市管理监督局',
    '某省政务服务数据管理局',
    '某市公安局公共安全处',
    '某区高新技术产业园区管委会',
    '某市大数据与政务云运营中心',
    '某县数字经济发展中心',
  ];
  return {
    id,
    name: i < fixedNames.length ? fixedNames[i] : `${['海州', '临江', '云山', '新港', '江宁', '滨海'][Math.floor((i - 8) / 4)]}市${['交通运输局', '工业和信息化局', '城市投资集团', '公共数据运营中心'][(i - 8) % 4]}`,
    industry: industries[i % industries.length],
    level: i < 5 ? '战略客户' : i < 15 ? '重点客户' : '普通客户',
    region: i < 2 ? '福建省' : regions[i % regions.length],
    contactPerson: `${['林', '陈', '周', '许'][i % 4]}${['志明', '雅文', '晓峰', '嘉宁', '建华', '思远', '文静', '明哲'][Math.floor(i / 4)]}`,
    contactPhone: `1890000${String(i).padStart(4, '0')}`,
  };
});

// 4. 商机 (≥36)
export const mockOpportunities: Opportunity[] = Array.from({ length: 72 }).map((_, i) => {
  const id = `OPP-${String(i + 1).padStart(3, '0')}`;
  const oppNames = [
    '福建省晋江市岸海防综合治理平台商机',
    '福建省生态环境视频能力平台商机',
    '某市城市运行管理服务平台商机',
    '某省一体化政务服务能力提升项目商机',
    '某市公共安全视频智能化建设项目商机',
    '某区智慧园区数字化平台商机',
    '某市政务云运维服务项目商机',
    '某县数据中台建设项目商机',
  ];
  const estAmount = i === 0 ? 5538.3 : i === 1 ? 1008.3 : i === 2 ? 3260.0 : i === 3 ? 8800.0 : 1200 + (i * 210);
  const statusList: ('跟进中' | '方案评审中' | '已转立项' | '暂缓' | '已终止')[] = ['已转立项', '跟进中', '方案评审中', '已转立项', '已转立项', '已转立项', '已转立项', '已转立项'];
  return {
    id,
    code: `OPP-2026-${String(i + 1).padStart(3, '0')}`,
    name: i < oppNames.length ? oppNames[i] : `2026年数字化转型商机_${i + 1}`,
    customerId: mockCustomers[i % mockCustomers.length].id,
    customerName: mockCustomers[i % mockCustomers.length].name,
    ownerId: mockUsers[i % 5].id,
    ownerName: mockUsers[i % 5].name,
    departmentId: 'D-002',
    departmentName: '智慧城市业务群',
    estimatedAmount: estAmount,
    status: i < 8 ? statusList[i] : (i % 3 === 0 ? '已转立项' : '跟进中'),
    winRate: 85 - (i % 4) * 10,
    expectedSignDate: '2026-10-15',
    earlyInvestmentQuota: i === 3 ? 120.0 : 50.0,
    earlyInvestmentUsed: i === 3 ? 98.5 : 30.0,
    createdAt: '2026-03-01',
  };
});

// 5. 8个固定故事及正式项目 (≥60, 其中未签≥10, 运维≥12)
const projectSeeds: Project[] = [
  {
    id: 'P-001',
    code: 'PRJ-2026-001',
    name: '福建省晋江市岸海防综合治理平台',
    customerId: 'CUST-001',
    customerName: '福建省晋江市海洋与渔业局',
    opportunityId: 'OPP-001',
    pmId: 'U-001',
    pmName: '张建国',
    departmentId: 'D-007',
    departmentName: '交付中心一部',
    type: '软件开发',
    level: '特大型',
    phase: '执行',
    subPhase: '开发实施',
    status: '需关注',
    health: 'yellow',
    healthReason: '滚动成本偏差+4.86%，存在2项重大技术风险',
    isUnsigned: false,
    isMaintenance: false,
    contractAmount: 5538.30,
    budgetAmount: 2847.70,
    rollingCost: 2986.20,
    actualCost: 1650.00,
    committedCost: 836.20,
    forecastRemainingCost: 500.00,
    costVariance: 138.50,
    costVarianceRate: 4.86,
    progressRate: 62.5,
    plannedStartDate: '2026-01-10',
    plannedEndDate: '2026-12-31',
    actualStartDate: '2026-01-15',
    currentBaselineVersion: 'V1.1',
    createdAt: '2026-01-01',
    description: '福建省晋江市岸海防综合治理平台项目，覆盖海岸线监控、船舶识别、应急指挥等核心功能。',
  },
  {
    id: 'P-002',
    code: 'PRJ-2026-002',
    name: '福建省生态环境视频能力平台',
    customerId: 'CUST-002',
    customerName: '福建省生态环境厅',
    opportunityId: 'OPP-002',
    pmId: 'U-002',
    pmName: '李主任',
    departmentId: 'D-007',
    departmentName: '交付中心一部',
    type: '系统集成',
    level: '重点',
    phase: '执行',
    subPhase: '试运行',
    status: '预警',
    health: 'orange',
    healthReason: '终验计划延期28天，第三方接口联调阻塞',
    isUnsigned: false,
    isMaintenance: false,
    contractAmount: 1008.30,
    budgetAmount: 720.00,
    rollingCost: 780.00,
    actualCost: 650.00,
    committedCost: 80.00,
    forecastRemainingCost: 50.00,
    costVariance: 60.00,
    costVarianceRate: 8.33,
    progressRate: 85.0,
    plannedStartDate: '2026-02-01',
    plannedEndDate: '2026-08-12',
    actualStartDate: '2026-02-05',
    currentBaselineVersion: 'V1.0',
    createdAt: '2026-02-01',
    description: '福建省生态环境视频能力平台项目，实现全省生态环境视频监控统一接入与智能分析。',
  },
  {
    id: 'P-003',
    code: 'PRJ-2026-003',
    name: '某市城市运行管理服务平台',
    customerId: 'CUST-003',
    customerName: '某市城市管理监督局',
    opportunityId: 'OPP-003',
    pmId: 'U-003',
    pmName: '王总',
    departmentId: 'D-008',
    departmentName: '交付中心二部',
    type: '软件开发',
    level: '重大',
    phase: '执行',
    subPhase: '系统联调',
    status: '高风险',
    health: 'red',
    healthReason: '采购外包严重超支超18%，毛利率下降突破红线',
    isUnsigned: false,
    isMaintenance: false,
    contractAmount: 3260.00,
    budgetAmount: 1980.00,
    rollingCost: 2360.00,
    actualCost: 1800.00,
    committedCost: 400.00,
    forecastRemainingCost: 160.00,
    costVariance: 380.00,
    costVarianceRate: 19.19,
    progressRate: 70.0,
    plannedStartDate: '2026-01-01',
    plannedEndDate: '2026-10-31',
    actualStartDate: '2026-01-05',
    currentBaselineVersion: 'V2.0',
    createdAt: '2026-01-05',
    description: '某市城市运行管理服务平台项目，构建城市运行体征监测与应急指挥调度体系。',
  },
  {
    id: 'P-004',
    code: 'PRJ-2026-004',
    name: '某省一体化政务服务能力提升项目',
    customerId: 'CUST-004',
    customerName: '某省政务服务数据管理局',
    opportunityId: 'OPP-004',
    pmId: 'U-004',
    pmName: '刘敏',
    departmentId: 'D-009',
    departmentName: '政务方案部',
    type: '软件开发',
    level: '特大型',
    phase: '立项',
    subPhase: 'WBS编制',
    status: '正常进行',
    health: 'green',
    healthReason: '未签立项提前投入受控，即将正式签约',
    isUnsigned: true,
    unsignedLimitQuota: 150.00,
    isMaintenance: false,
    contractAmount: 8800.00,
    budgetAmount: 4500.00,
    rollingCost: 4500.00,
    actualCost: 98.50,
    committedCost: 0.00,
    forecastRemainingCost: 4401.50,
    costVariance: 0.00,
    costVarianceRate: 0.00,
    progressRate: 12.0,
    plannedStartDate: '2026-08-01',
    plannedEndDate: '2027-08-31',
    actualStartDate: '2026-08-10',
    currentBaselineVersion: 'V0.9',
    createdAt: '2026-08-01',
    description: '某省一体化政务服务能力提升项目，推动政务服务事项标准化、线上化与智能化。',
  },
  {
    id: 'P-005',
    code: 'PRJ-2026-005',
    name: '某市公共安全视频智能化建设项目',
    customerId: 'CUST-005',
    customerName: '某市公安局公共安全处',
    opportunityId: 'OPP-005',
    pmId: 'U-005',
    pmName: '赵工',
    departmentId: 'D-007',
    departmentName: '交付中心一部',
    type: '系统集成',
    level: '特大型',
    phase: '执行',
    subPhase: '开发实施',
    status: '正常进行',
    health: 'green',
    healthReason: '多供应商联合交付，PMC审议里程碑正常受控',
    isUnsigned: false,
    isMaintenance: false,
    contractAmount: 12600.00,
    budgetAmount: 7800.00,
    rollingCost: 7750.00,
    actualCost: 4200.00,
    committedCost: 2300.00,
    forecastRemainingCost: 1250.00,
    costVariance: -50.00,
    costVarianceRate: -0.64,
    progressRate: 55.0,
    plannedStartDate: '2025-11-01',
    plannedEndDate: '2027-04-30',
    actualStartDate: '2025-11-10',
    currentBaselineVersion: 'V1.0',
    createdAt: '2025-11-01',
    description: '某市公共安全视频智能化建设项目，建设全市视频监控智能化分析平台。',
  },
  {
    id: 'P-006',
    code: 'PRJ-2026-006',
    name: '某区智慧园区数字化平台',
    customerId: 'CUST-006',
    customerName: '某区高新技术产业园区管委会',
    opportunityId: 'OPP-006',
    pmId: 'U-001',
    pmName: '张建国',
    departmentId: 'D-007',
    departmentName: '交付中心一部',
    type: '软件开发',
    level: '重点',
    phase: '收尾',
    subPhase: '客户终验',
    status: '需关注',
    health: 'yellow',
    healthReason: '终验整改清单待客户复验确认',
    isUnsigned: false,
    isMaintenance: false,
    contractAmount: 1860.00,
    budgetAmount: 1100.00,
    rollingCost: 1120.00,
    actualCost: 1080.00,
    committedCost: 20.00,
    forecastRemainingCost: 20.00,
    costVariance: 20.00,
    costVarianceRate: 1.82,
    progressRate: 98.0,
    plannedStartDate: '2025-09-01',
    plannedEndDate: '2026-08-31',
    actualStartDate: '2025-09-10',
    currentBaselineVersion: 'V1.2',
    createdAt: '2025-09-01',
    description: '某区智慧园区数字化平台项目，打造园区运营管理、企业服务与数据可视化一体化平台。',
  },
  {
    id: 'P-007',
    code: 'PRJ-2026-007',
    name: '某市政务云运维服务项目',
    customerId: 'CUST-007',
    customerName: '某市大数据与政务云运营中心',
    opportunityId: 'OPP-007',
    pmId: 'U-008',
    pmName: '郑经理',
    departmentId: 'D-013',
    departmentName: '运维支持中心',
    type: '运维服务',
    level: '一般',
    phase: '运维',
    subPhase: '质保运维',
    status: '正常进行',
    health: 'green',
    healthReason: '运维SLA达标99.98%，周期性巡检正常',
    isUnsigned: false,
    isMaintenance: true,
    contractAmount: 980.00,
    budgetAmount: 600.00,
    rollingCost: 590.00,
    actualCost: 350.00,
    committedCost: 150.00,
    forecastRemainingCost: 90.00,
    costVariance: -10.00,
    costVarianceRate: -1.67,
    progressRate: 60.0,
    plannedStartDate: '2026-01-01',
    plannedEndDate: '2026-12-31',
    actualStartDate: '2026-01-01',
    currentBaselineVersion: 'V1.0',
    createdAt: '2026-01-01',
    description: '某市政务云运维服务项目，提供政务云平台日常运维、安全巡检与应急保障服务。',
  },
  {
    id: 'P-008',
    code: 'PRJ-2026-008',
    name: '某县数据中台建设项目',
    customerId: 'CUST-008',
    customerName: '某县数字经济发展中心',
    opportunityId: 'OPP-008',
    pmId: 'U-001',
    pmName: '张建国',
    departmentId: 'D-007',
    departmentName: '交付中心一部',
    type: '软件开发',
    level: '重点',
    phase: '已关闭',
    subPhase: '项目结算',
    status: '已结算',
    health: 'green',
    healthReason: '已通过四算审计结算，毛利率优于预算2.4%',
    isUnsigned: false,
    isMaintenance: false,
    contractAmount: 2480.00,
    budgetAmount: 1450.00,
    rollingCost: 1390.00,
    actualCost: 1390.00,
    committedCost: 0.00,
    forecastRemainingCost: 0.00,
    costVariance: -60.00,
    costVarianceRate: -4.14,
    progressRate: 100.0,
    plannedStartDate: '2025-03-01',
    plannedEndDate: '2026-03-31',
    actualStartDate: '2025-03-15',
    actualEndDate: '2026-04-10',
    currentBaselineVersion: 'V1.0',
    createdAt: '2025-03-01',
    description: '某县数据中台建设项目，构建县域数据资源中心与数据共享交换平台。',
  },
  // 补齐至 65 个正式项目 (含未签>=10, 运维>=12)
  ...Array.from({ length: 57 }).map((_, idx) => {
    const num = idx + 9;
    const id = `P-${String(num).padStart(3, '0')}`;
    const isUnsigned = idx >= 40 && idx < 50; // 10个未签
    const isMaintenance = idx >= 25 && idx < 38; // 13个运维
    const contractAmount = 500 + (num * 75);
    const budgetAmount = Math.round(contractAmount * 0.6);
    const rollingCost = Math.round(budgetAmount * (1 + ((idx % 7) - 3) * 0.03));
    const actualCost = Math.round(rollingCost * 0.65);
    const committedCost = Math.round(rollingCost * 0.2);
    const forecastRemainingCost = rollingCost - actualCost - committedCost;
    const costVariance = rollingCost - budgetAmount;
    const costVarianceRate = Number(((costVariance / budgetAmount) * 100).toFixed(2));

    const healthArr: ('green' | 'yellow' | 'orange' | 'red')[] = ['green', 'green', 'yellow', 'green', 'orange', 'red', 'green'];
    const health = healthArr[idx % healthArr.length];

    const prjType: '软件开发' | '系统集成' | '运维服务' = isMaintenance ? '运维服务' : num % 2 === 0 ? '软件开发' : '系统集成';
    const prjLevel: '特大型' | '重大' | '重点' | '一般' = num % 4 === 0 ? '特大型' : num % 3 === 0 ? '重大' : '重点';
    const prjPhase: '立项' | '执行' | '收尾' | '运维' = isMaintenance ? '运维' : isUnsigned ? '立项' : num % 5 === 0 ? '收尾' : '执行';
    const prjSubPhase: 'WBS编制' | '开发实施' | '客户终验' | '质保运维' = isMaintenance ? '质保运维' : isUnsigned ? 'WBS编制' : num % 5 === 0 ? '客户终验' : '开发实施';
    const prjStatus: '正常进行' | '需关注' | '预警' | '高风险' = health === 'red' ? '高风险' : health === 'orange' ? '预警' : health === 'yellow' ? '需关注' : '正常进行';

    return {
      id,
      code: `PRJ-2026-${String(num).padStart(3, '0')}`,
      name: `${mockCustomers[num % mockCustomers.length].name.replace(/(局|厅|中心|管委会|集团)$/, '')}${idx < 32 ? '业务协同平台' : '数据共享平台'}${isMaintenance ? '运维服务' : ''}`,
      customerId: mockCustomers[num % mockCustomers.length].id,
      customerName: mockCustomers[num % mockCustomers.length].name,
      opportunityId: `OPP-${String(num).padStart(3, '0')}`,
      pmId: mockUsers[num % 10].id,
      pmName: mockUsers[num % 10].name,
      departmentId: mockDepartments[(num % 6) + 6].id,
      departmentName: mockDepartments[(num % 6) + 6].name,
      type: prjType,
      level: prjLevel,
      phase: prjPhase,
      subPhase: prjSubPhase,
      status: prjStatus,
      health,
      healthReason: health === 'red' ? '成本严重超支' : health === 'orange' ? '进度落后' : '指标正常',
      isUnsigned,
      unsignedLimitQuota: isUnsigned ? 80 : undefined,
      isMaintenance,
      contractAmount,
      budgetAmount,
      rollingCost,
      actualCost,
      committedCost,
      forecastRemainingCost,
      costVariance,
      costVarianceRate,
      progressRate: isMaintenance ? 70 : Math.min(100, (num * 3) % 95 + 10),
      plannedStartDate: '2026-01-01',
      plannedEndDate: '2026-12-31',
      currentBaselineVersion: 'V1.0',
      createdAt: '2026-01-01',
      description: '项目描述',
    };
  }),
];

export const mockProjects: Project[] = projectSeeds.map((p) => ({
  ...p, revenueAmount: p.contractAmount, contractAmount: p.isUnsigned ? 0 : p.contractAmount,
}));
for (const project of mockProjects) {
  const source = mockOpportunities.find((o) => o.id === project.opportunityId)!;
  Object.assign(source, { customerId: project.customerId, customerName: project.customerName,
    name: `${project.name}商机`, estimatedAmount: project.revenueAmount, status: '已转立项' });
}

// 6. 合同 (≥45)
export const mockContracts: Contract[] = mockProjects.filter((p) => !p.isUnsigned).map((p, i) => {
  return {
    id: `CTR-${String(i + 1).padStart(3, '0')}`,
    code: `HT-2026-${String(i + 1).padStart(4, '0')}`,
    name: `${p.name} 主合同`,
    projectId: p.id,
    customerId: p.customerId,
    amount: p.contractAmount,
    signDate: '2026-01-20', acceptanceDueDate: p.plannedEndDate,
    status: p.isUnsigned ? '已终止' : '履约中',
    paidAmount: money(p.contractAmount * 0.45),
    unpaidAmount: money(p.contractAmount - money(p.contractAmount * 0.45)),
  };
});

// 7. 概算版本 (≥80)
export const mockEstimateVersions: EstimateVersion[] = Array.from({ length: 85 }).map((_, i) => {
  const opp = mockOpportunities[i % mockOpportunities.length];
  const totalIncome = opp.estimatedAmount;
  const totalCost = Math.round(totalIncome * 0.58);
  const amounts = allocateMoney(totalCost, [45, 25, 20, 10]);
  const grossMargin = totalIncome - totalCost;
  const grossMarginRate = Number(((grossMargin / totalIncome) * 100).toFixed(2));
  return {
    id: `EST-VER-${String(i + 1).padStart(3, '0')}`,
    opportunityId: opp.id,
    version: `V1.${Math.floor(i / mockOpportunities.length)}`,
    isFrozen: i < mockOpportunities.length,
    totalIncome,
    totalCost,
    grossMargin,
    grossMarginRate,
    items: [
      { subjectId: 'SUB-01', subjectName: '直接人力成本', amount: amounts[0], description: '研发投入' },
      { subjectId: 'SUB-02', subjectName: '外包开发成本', amount: amounts[1], description: '专业模块' },
      { subjectId: 'SUB-03', subjectName: '设备与采购', amount: amounts[2], description: '服务器与网络' },
      { subjectId: 'SUB-04', subjectName: '项目期间费用', amount: amounts[3], description: '差旅招待' },
    ],
    createdBy: '刘敏',
    createdAt: '2026-03-10',
  };
});

// 8. 预算版本 (≥80)
export const mockBudgetVersions: BudgetVersion[] = Array.from({ length: 85 }).map((_, i) => {
  const p = mockProjects[i % mockProjects.length];
  const total = p.budgetAmount;
  const amounts = allocateMoney(total, [45, 20, 25, 8, 2]);
  return {
    id: `BUD-VER-${String(i + 1).padStart(3, '0')}`,
    projectId: p.id,
    version: i < mockProjects.length ? p.currentBaselineVersion : 'V2.0',
    status: i < mockProjects.length ? '已生效' : '草稿',
    isOverEstimate: p.id === 'P-003',
    totalAmount: total,

    items: [
      { subjectId: 'SUB-01', subjectName: '直接人力成本', amount: amounts[0] },
      { subjectId: 'SUB-02', subjectName: '外包开发成本', amount: amounts[1] },
      { subjectId: 'SUB-03', subjectName: '采购与设备', amount: amounts[2] },
      { subjectId: 'SUB-04', subjectName: '项目期间费用', amount: amounts[3] },
      { subjectId: 'SUB-05', subjectName: '不可预见准备金', amount: amounts[4] },
    ],
    createdBy: p.pmName,
    createdAt: '2026-04-01',
  };
});

// 9. 项目基线版本 (≥90)
export const mockBaselineVersions: BaselineVersion[] = Array.from({ length: 95 }).map((_, i) => {
  const p = mockProjects[i % mockProjects.length];
  return {
    id: `BASE-VER-${String(i + 1).padStart(3, '0')}`,
    projectId: p.id,
    version: i < mockProjects.length ? p.currentBaselineVersion : 'V0.9',
    status: i < mockProjects.length ? '已生效' : '历史',
    scopeDesc: `${p.name} 基线范围说明书`,
    budgetAmount: p.budgetAmount,
    plannedStartDate: p.plannedStartDate,
    plannedEndDate: p.plannedEndDate,
    createdAt: '2026-04-10',
  };
});

// 10. WBS任务 (≥500)
export const mockWbsTasks: WbsTask[] = Array.from({ length: 520 }).map((_, i) => {
  const p = mockProjects[i % mockProjects.length];
  const taskIndex = Math.floor(i / mockProjects.length);
  const isMilestone = taskIndex === 7;
  const progress = Math.max(0, Math.min(100, p.progressRate * 8 - taskIndex * 100));
  return {
    id: `TSK-${String(i + 1).padStart(4, '0')}`,
    projectId: p.id,
    taskCode: `1.${taskIndex + 1}`,
    name: ['需求调研与确认', '总体架构设计', '业务接口开发', '前端功能交付', '系统集成联调', '性能与安全验证', '初验问题整改', '项目交付验收'][taskIndex],
    ownerId: p.pmId,
    ownerName: p.pmName,
    plannedDays: 10,
    startDate: `2026-${String(p.status === '已结算' ? 1 + Math.floor(taskIndex / 3) : 3 + taskIndex + (taskIndex >= 5 ? 1 : 0)).padStart(2, '0')}-01`,
    endDate: `2026-${String(p.status === '已结算' ? 1 + Math.floor(taskIndex / 3) : 3 + taskIndex + (taskIndex >= 5 ? 1 : 0)).padStart(2, '0')}-28`,
    progress,
    isMilestone,
    status: progress === 100 ? '已完成' : progress === 0 ? '未开始' : '进行中',
  };
});

// 11. 里程碑：分五类节点（开工、开发完毕、初验、试运行、终验），按项目状态模拟进度。
export const mockMilestones: Milestone[] = mockProjects.flatMap((p) => {
  const types: Milestone['type'][] = ['启动', '开发完成', '内部初验', '试运行', '客户终验'];
  const stageLabels: Partial<Record<Milestone['type'], string>> = { 启动: '开工', 开发完成: '开发完毕', 内部初验: '初验', 试运行: '试运行', 客户终验: '终验' };
  const doneCount = p.status === '已结算' ? 5 : p.isMaintenance ? 5 : p.status === '已终止' ? 0 : p.id === 'P-002' ? 3 : (['P-001', 'P-004'].includes(p.id) ? 2 : 1);
  return types.map((type, i) => {
    const done = i < doneCount;
    const plannedDate = done ? '2026-08-01'
      : p.id === 'P-002' && i === 3 ? '2026-09-05'
      : p.id === 'P-002' && i === 4 ? '2026-09-30'
      : i === 2 ? '2026-09-20'
      : i === 3 ? '2026-10-15'
      : i === 4 ? '2026-12-31'
      : p.plannedEndDate;
    const status: Milestone['status'] = done ? '已达成'
      : p.id === 'P-002' && i < doneCount + 1 ? '逾期未达成'
      : '未达成';
    return {
      id: `MLS-${p.id}-${i + 1}`, projectId: p.id,
      name: stageLabels[type] ?? type, type,
      plannedDate, status,
      actualDate: done ? '2026-08-01' : undefined,
      requiredDeliverables: i >= 3 ? ['测试报告', '验收确认函'] : i >= 1 ? ['测试报告'] : ['实施计划'],
    };
  });
});

// 12. 日报 (≥300)
export const mockDailyReports: DailyReport[] = Array.from({ length: 310 }).map((_, i) => {
  const p = mockProjects[i % mockProjects.length];
  return {
    id: `DR-${String(i + 1).padStart(4, '0')}`,
    projectId: p.id,
    date: `2026-09-${String(8 - Math.floor(i / mockProjects.length)).padStart(2, '0')}`,
    reporter: p.pmName,
    completedTasks: '完成系统核心模块接口对接联调与单元测试',
    plannedTasks: '推进前台交互界面与数据统计联调',
  };
});

// 13. 周报 (≥100)
export const mockWeeklyReports: WeeklyReport[] = Array.from({ length: 110 }).map((_, i) => {
  const p = mockProjects[i % mockProjects.length];
  return {
    id: `WR-${String(i + 1).padStart(4, '0')}`,
    projectId: p.id,
    weekSpan: Math.floor(i / mockProjects.length) === 0 ? '2026-W36 (09.01 - 09.07)' : '2026-W35 (08.25 - 08.31)',
    reporter: p.pmName,
    progressSummary: `当前累计完工比例${p.progressRate}%，详见项目有效计划`,
    costStatus: p.costVariance > 0 ? `滚动成本高于预算${p.costVariance}万元` : '滚动成本未超过预算',
    riskSummary: '需关注第三方接口响应延迟风险',
    nextWeekPlan: '启动系统集成压力测试并组织专家初验评审',
  };
});

// 14. 需求 (≥80)
export const mockRequirements: Requirement[] = Array.from({ length: 90 }).map((_, i) => {
  const p = i < 18 ? mockProjects[0] : mockProjects[(i % (mockProjects.length - 1)) + 1]; // P-001 固定 18 个需求
  return {
    id: `REQ-${String(i + 1).padStart(4, '0')}`,
    projectId: p.id,
    code: `REQ-2026-${String(i + 1).padStart(3, '0')}`,
    title: `${['海域网格化监管', '视频点位统一接入', '船舶轨迹回放', '告警联动处置', '巡检工单闭环', '地图图层管理', '监控录像检索', '应急指挥调度', '设备在线监测', '事件统计分析', '数据质量检查', '报表导出', '组织权限配置', '移动端消息提醒', '多源数据同步', '访问审计查询', '统一登录接入', '运维告警订阅'][i % 18]}（${p.name}）`,
    priority: i % 3 === 0 ? '高' : '中',
    status: i % 2 === 0 ? '待验证' : '开发中',
    creator: '客户业务处',
    owner: p.pmName,
    deadline: '2026-09-30',
  };
});

// 15. BUG (≥100)
export const mockBugs: Bug[] = Array.from({ length: 110 }).map((_, i) => {
  const p = i < 7 ? mockProjects[0] : mockProjects[(i % (mockProjects.length - 1)) + 1]; // P-001 固定 7 个 BUG
  return {
    id: `BUG-${String(i + 1).padStart(4, '0')}`,
    projectId: p.id,
    code: `BUG-2026-${String(i + 1).padStart(3, '0')}`,
    title: `${['地图切换后点位重复显示', '告警详情附件无法预览', '录像检索跨日条件失效', '报表导出金额精度丢失', '移动端工单状态未同步', '并发保存导致重复工单', '长时间会话后刷新异常'][i % 7]}`,
    severity: i % 4 === 0 ? '严重' : '一般',
    status: i % 3 === 0 ? '待复测' : '修复中',
    creator: '测试工程师_钱工',
    owner: p.pmName,
    createdAt: '2026-09-02',
  };
});

// 16. 问题 (≥100)
export const mockIssues: Issue[] = Array.from({ length: 105 }).map((_, i) => {
  const p = mockProjects[i % mockProjects.length];
  return {
    id: `ISSUE-${String(i + 1).padStart(4, '0')}`,
    projectId: p.id,
    code: `ISS-2026-${String(i + 1).padStart(3, '0')}`,
    title: `${['第三方接口联调窗口尚未确认', '验收材料与客户口径需统一', '核心设备交货延期影响系统联调', '跨部门数据授权待协调'][i % 4]}`,
    severity: p.id === 'P-003' && i < mockProjects.length ? '重大' : p.id === 'P-002' ? '重要' : '一般',
    status: i % 2 === 0 ? '处理中' : '待解决',
    owner: p.pmName,
    deadline: i === 0 ? '2026-09-01' : '2026-09-20',
  };
});

// 17. 风险 (≥80)
export const mockRisks: Risk[] = Array.from({ length: 85 }).map((_, i) => {
  const p = i < 2 ? mockProjects[0] : mockProjects[(i % (mockProjects.length - 1)) + 1]; // P-001 固定 2 个风险
  return {
    id: `RSK-${String(i + 1).padStart(4, '0')}`,
    projectId: p.id,
    code: `RSK-2026-${String(i + 1).padStart(3, '0')}`,
    title: `${['视频接入协议兼容性影响联调', '海域现场施工受天气窗口影响', '关键供应商交货周期延长', '客户新增范围尚未冻结'][i % 4]}`,
    level: p.id === 'P-003' ? '特大' : '中等',
    status: '监控中',
    strategy: '减轻',
    owner: p.pmName,
    identifiedDate: '2026-05-10',
  };
});

// 18. 工时记录 (≥800)
export const mockTimesheets: Timesheet[] = Array.from({ length: 820 }).map((_, i) => {
  const p = mockProjects[i % mockProjects.length];
  const user = mockUsers[i % mockUsers.length];
  return {
    id: `TS-${String(i + 1).padStart(5, '0')}`,
    projectId: p.id,
    userId: user.id,
    userName: user.name,
    date: '2026-09-07',
    hours: 8,
    taskId: mockWbsTasks[i % mockWbsTasks.length].id,
    status: Math.floor(i / mockProjects.length) % 5 === 0 ? '待审核' : '已通过',
  };
});

// 19. 成本流水：按项目已发生金额生成可复算的20笔已确认流水。
export const mockCostItems: CostItem[] = mockProjects.flatMap((p) => {
  const amounts = allocateMoney(p.actualCost, Array.from({ length: 20 }, (_, i) => [45, 20, 25, 10][i % 4]));
  const types: CostItem['type'][] = ['labor', 'outsource', 'procurement', 'expense'];
  const names = ['直接人力成本', '外包开发成本', '采购与设备', '项目期间费用'];
  return amounts.map((amount, i) => ({
    id: `COST-${p.id}-${i + 1}`, sourceId: `VOUCHER-${p.id}-${i + 1}`, projectId: p.id, type: types[i % 4],
    subjectId: `SUB-0${i % 4 + 1}`, subjectName: names[i % 4], amount,
    occurredDate: ['2026-05-20', '2026-06-20', '2026-07-20', '2026-08-20', '2026-08-25'][Math.floor(i / 4)], description: `${names[i % 4]}第${Math.floor(i / 4) + 1}期已确认结转`,
  }));
});

// 20. 采购记录 (≥100)
export const mockProcurements: ProcurementRecord[] = Array.from({ length: 110 }).map((_, i) => {
  const p = mockProjects[i % mockProjects.length];
  return {
    id: `PROC-${String(i + 1).padStart(4, '0')}`,
    projectId: p.id,
    code: `CG-2026-${String(i + 1).padStart(4, '0')}`,
    supplierName: `知名硬件供应商_${(i % 8) + 1}`,
    amount: 25.0 + (i % 10) * 8.5,
    status: i % 3 === 0 ? '已全部到货' : '已下单',
    arrivalDate: '2026-07-20',
  };
});

// 21. 外包记录 (≥60)
export const mockOutsources: OutsourceRecord[] = Array.from({ length: 65 }).map((_, i) => {
  const p = mockProjects[i % mockProjects.length];
  return {
    id: `OUT-${String(i + 1).padStart(4, '0')}`,
    projectId: p.id,
    code: `WB-2026-${String(i + 1).padStart(4, '0')}`,
    vendorName: `专业软件外包公司_${(i % 5) + 1}`,
    amount: 40.0 + (i % 6) * 12.0,
    status: i % 2 === 0 ? '服务中' : '已终验',
  };
});

// 22. 费用报销记录 (≥150)
export const mockExpenses: ExpenseRecord[] = Array.from({ length: 160 }).map((_, i) => {
  const p = mockProjects[i % mockProjects.length];
  return {
    id: `EXP-${String(i + 1).padStart(4, '0')}`,
    projectId: p.id,
    code: `BX-2026-${String(i + 1).padStart(4, '0')}`,
    applicant: p.pmName,
    amount: 0.8 + (i % 5) * 0.5,
    category: i % 2 === 0 ? '差旅费' : '业务招待费',
    status: '财务已审核',
    applyDate: '2026-08-15',
  };
});

// 23. 项目变更 (≥50)
export const mockChanges: ProjectChange[] = Array.from({ length: 55 }).map((_, i) => {
  const p = mockProjects[i % mockProjects.length];
  return {
    id: `CHG-${String(i + 1).padStart(4, '0')}`,
    projectId: p.id,
    code: `CR-2026-${String(i + 1).padStart(3, '0')}`,
    title: `项目第${i + 1}次需求及工期变更`,
    type: i % 3 === 0 ? '合同/综合变更' : '范围/进度变更',
    costImpact: 15.0 + (i % 5) * 5,
    scheduleImpactDays: 14,
    status: i % 2 === 0 ? '已批准' : 'PMO审批中',
    createdAt: '2026-07-01',
  };
});

// 24. 阶段切换记录 (≥100)
export const mockStageGates: StageGateRecord[] = Array.from({ length: 105 }).map((_, i) => {
  const p = mockProjects[i % mockProjects.length];
  return {
    id: `GATE-${String(i + 1).padStart(4, '0')}`,
    projectId: p.id,
    fromPhase: '开发实施',
    toPhase: '内部初验',
    status: i % 3 === 0 ? '已通过' : '审核中',
    auditor: '李主任 (PMO)',
    auditDate: '2026-08-10',
    comments: '必交交付物与初验测试用例已全部提交完备',
  };
});

// 25. 三类验收独立保存，整改轮次不覆盖历史。
export const mockAcceptances: AcceptanceRecord[] = mockProjects.flatMap((p) => {
  const types: AcceptanceRecord['type'][] = ['内部初验', '供应商验收', '客户终验'];
  return types.map((type, i) => ({
    id: `ACC-${p.id}-${i + 1}`, projectId: p.id, type, round: 1,
    status: p.status === '已结算' || p.isMaintenance || (p.id === 'P-006' && i < 2) ? '已通过' : p.id === 'P-006' && i === 2 ? '整改中' : '待验收',
    amount: p.contractAmount, acceptanceDate: p.status === '已结算' ? '2026-03-31' : undefined,
    createdAt: '2026-03-15', submittedBy: '张建国',
  }));
});

// 26. 结算记录 (≥30)
export const mockSettlements: SettlementRecord[] = Array.from({ length: 35 }).map((_, i) => {
  const p = mockProjects[i % mockProjects.length];
  const finalIncome = p.contractAmount;
  const finalCost = p.rollingCost;
  const finalGrossMargin = finalIncome - finalCost;
  const finalGrossMarginRate = Number(((finalGrossMargin / finalIncome) * 100).toFixed(2));
  return {
    id: `SET-${String(i + 1).padStart(4, '0')}`,
    projectId: p.id,
    finalIncome,
    finalCost,
    finalGrossMargin,
    finalGrossMarginRate,
    status: p.id === 'P-008' ? '已锁定已生效' : '审核中',
    isCostLocked: p.id === 'P-008',
    settledDate: p.id === 'P-008' ? '2026-04-10' : undefined,
    createdAt: '2026-04-01',
    submittedBy: '刘敏',
  };
});

// 27. 待决策事项 (≥40)
export const mockDecisions: DecisionItem[] = Array.from({ length: 45 }).map((_, i) => {
  const p = mockProjects[i % mockProjects.length];
  return {
    id: `DEC-${String(i + 1).padStart(4, '0')}`,
    projectId: p.id,
    projectName: p.name,
    type: i % 3 === 0 ? '超概算审批' : i % 3 === 1 ? '重大变更审批' : '重大风险处置',
    title: `关于 ${p.name} 的重要经营管理决策审议`,
    impactAmount: 380.0,
    level: 'PMC决策会',
    status: '待决策',
    targetRoute: `/approvals/DEC-${String(i + 1).padStart(4, '0')}`,
    createdAt: '2026-09-05',
  };
});

// 28. 预警记录 (≥100)
export const mockWarnings: WarningRecord[] = Array.from({ length: 105 }).map((_, i) => {
  const p = mockProjects[i % mockProjects.length];
  return {
    id: `WARN-${String(i + 1).padStart(4, '0')}`,
    projectId: p.id,
    type: p.id === 'P-003' ? '成本超支' : '进度严重逾期',
    level: p.health === 'red' ? 'red' : p.health === 'orange' ? 'orange' : 'yellow',
    title: `${p.name} 触发系统经营红线预警`,
    detail: p.healthReason,
    status: '未消除',
    createdAt: '2026-09-06',
  };
});

// 29. 审计日志 (≥300)
export const mockAuditLogs: AuditLog[] = Array.from({ length: 315 }).map((_, i) => {
  const u = mockUsers[i % mockUsers.length];
  return {
    id: `LOG-${String(i + 1).padStart(5, '0')}`,
    operatorId: u.id,
    operatorName: u.name,
    action: i % 2 === 0 ? '更新项目基线成本' : '提交工时审核单',
    targetType: '项目基线',
    targetId: `P-${String((i % 60) + 1).padStart(3, '0')}`,
    detail: `修改了项目成本预算科目，系统自动记录指纹与版本快照`,
    ip: '192.168.10.15',
    timestamp: '2026-09-09 10:24:30',
  };
});

export const mockReceiptPlans = mockContracts.flatMap((contract) => [
  { id: `RCPT-${contract.id}-1`, projectId: contract.projectId, contractId: contract.id, title: '合同首付款', dueDate: '2026-05-15', amount: contract.paidAmount, paidAmount: contract.paidAmount, collectionStatus: contract.paidAmount >= contract.amount ? '已核销' as const : '已逾期' as const },
  { id: `RCPT-${contract.id}-2`, projectId: contract.projectId, contractId: contract.id, title: '验收结算款', dueDate: contract.projectId === 'P-002' ? '2026-09-01' : contract.projectId === 'P-003' ? '2026-08-30' : '2026-12-31', amount: contract.unpaidAmount, paidAmount: 0 },
]);

// 统一健康度从成本和关联事项复算，页面使用同一结果。
for (const project of mockProjects) {
  const overdue = mockMilestones.filter((m) => m.projectId === project.id && m.status !== '已达成')
    .map((m) => Math.max(0, (Date.parse(AS_OF_DATE) - Date.parse(m.plannedDate)) / 86400000));
  const health = assessHealth(project, { delayDays: Math.max(0, ...overdue), overdueReceipt: sumMoney(mockReceiptPlans.filter((r) => r.projectId === project.id && r.dueDate <= AS_OF_DATE).map((r) => r.amount - r.paidAmount)),
    majorRisks: mockRisks.filter((r) => r.projectId === project.id && ['特大', '重大'].includes(r.level) && r.status === '监控中').length, majorIssues: mockIssues.filter((i) => i.projectId === project.id && i.severity === '重大' && i.status !== '已关闭').length });
  project.health = health.level;
  project.healthReason = health.reasons.join('；');
}

// Each confirmed ledger line has one source voucher; procurement/timesheets remain upstream references,
// never an additional amount in the cost selector.
export const mockCostSources = mockCostItems.map((cost) => ({
  id: cost.sourceId!, projectId: cost.projectId, amount: cost.amount, status: '已确认' as const,
  type: cost.type, confirmedAt: cost.occurredDate,
  upstreamId: cost.type === 'labor' ? mockTimesheets.find((t) => t.projectId === cost.projectId && t.status === '已通过')?.id
    : cost.type === 'procurement' ? mockProcurements.find((p) => p.projectId === cost.projectId)?.id
    : cost.type === 'outsource' ? mockOutsources.find((o) => o.projectId === cost.projectId)?.id
    : mockExpenses.find((e) => e.projectId === cost.projectId)?.id,
}));

function freezeSnapshot<T extends object>(value: T): T {
  for (const child of Object.values(value)) if (child && typeof child === 'object') freezeSnapshot(child);
  return Object.freeze(value);
}
// Period expenses are a parent category. Only these leaves participate in totals.
const expenseLeaves = ['第三方费用', '差旅费用', '租房费用', '其他期间费用'];
for (const version of [...mockBudgetVersions, ...mockEstimateVersions]) {
  version.items = version.items.flatMap((item) => item.subjectId !== 'SUB-04' ? [item] :
    allocateMoney(item.amount, [30, 40, 10, 20]).map((amount, i) => ({
      ...item, subjectId: `SUB-04-${i + 1}`, subjectName: expenseLeaves[i], amount,
    })));
}
for (const project of mockProjects) {
  const rows = mockCostItems.filter((c) => c.projectId === project.id && c.subjectId === 'SUB-04');
  // Preserve total actual costs and source identity while giving each voucher a single leaf mapping.
  rows.forEach((row, i) => { row.subjectId = `SUB-04-${i % 4 + 1}`; row.subjectName = expenseLeaves[i % 4]; });
}
mockEstimateVersions.filter((v) => v.isFrozen).forEach(freezeSnapshot);
mockBudgetVersions.filter((v) => v.status === '已生效').forEach(freezeSnapshot);
mockBaselineVersions.forEach(freezeSnapshot);

for (const p of mockProjects) {
  const actual = (type: CostItem['type']) => money(mockCostItems.filter((c) => c.projectId === p.id && c.type === type).reduce((sum, c) => sum + c.amount, 0));
  const procurement = mockProcurements.filter((r) => r.projectId === p.id);
  procurement.forEach((row, i) => { row.status = i === 0 ? '部分到货' : '询价中'; if (i === 0) row.amount = money(actual('procurement') + p.committedCost * 0.25); });
  const outsource = mockOutsources.find((r) => r.projectId === p.id);
  if (outsource) outsource.amount = money(actual('outsource') + p.committedCost * 0.2);
  const expenses = mockExpenses.filter((r) => r.projectId === p.id);
  expenses.forEach((row, i) => { row.status = i === 0 ? '财务已审核' : '待审批'; if (i === 0) row.amount = actual('expense'); });
}
