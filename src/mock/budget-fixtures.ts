import type { BudgetDraft, BudgetLine } from '@/models/budget';
import { AS_OF_DATE } from '@/mock';

export interface ProprietarySoftwareItem {
  id: string;
  name: string;
  version: string;
  moduleCode: string;
  moduleCategory: string;
  unit: string;
  quantity: number;
  listPriceYuan: number;
  quotationAmountYuan: number;
  deliveryCostAmountYuan: number;
  grossMarginRate: number;
  isCustomized: boolean;
  remarks: string;
}

export function getMockProprietarySoftware(projectId: string): ProprietarySoftwareItem[] {
  if (projectId === 'P-001') {
    return [
      {
        id: 'SW-P-001-01',
        name: '数字海防智能感知与多维时空网格引擎',
        version: 'V3.2 Pro',
        moduleCode: 'MOD-OCEAN-GRID-01',
        moduleCategory: '核心平台基座',
        unit: '套',
        quantity: 1,
        listPriceYuan: 850000,
        quotationAmountYuan: 680000,
        deliveryCostAmountYuan: 120000,
        grossMarginRate: 82.35,
        isCustomized: true,
        remarks: '含沿海三维地理信息栅格化、岸基多源雷达点云与AIS数据实时融合引擎'
      },
      {
        id: 'SW-P-001-02',
        name: '海域全景高并发视频汇聚与AI流媒体网关',
        version: 'V2.8 Enterprise',
        moduleCode: 'MOD-VIDEO-STREAM-02',
        moduleCategory: '中间件与网关',
        unit: '套',
        quantity: 1,
        listPriceYuan: 620000,
        quotationAmountYuan: 500000,
        deliveryCostAmountYuan: 80000,
        grossMarginRate: 84.00,
        isCustomized: false,
        remarks: '支持GB/T 28181、ONVIF多协议国标接入，支持2000路高清并发转码与智能分发'
      },
      {
        id: 'SW-P-001-03',
        name: '涉海可疑目标智能识别研判与违规预警系统',
        version: 'V4.0 AI-Edge',
        moduleCode: 'MOD-AI-RADAR-03',
        moduleCategory: '业务应用软件',
        unit: '套',
        quantity: 1,
        listPriceYuan: 750000,
        quotationAmountYuan: 600000,
        deliveryCostAmountYuan: 95000,
        grossMarginRate: 84.17,
        isCustomized: true,
        remarks: '含黑飞无人机雷达侦测、非法采砂船越界预警、走私快艇轨迹异常研判模型'
      },
      {
        id: 'SW-P-001-04',
        name: '跨网段涉海联合指挥调度与应急会商中枢',
        version: 'V3.5 MultiGrid',
        moduleCode: 'MOD-COMMAND-CTR-04',
        moduleCategory: '业务应用软件',
        unit: '套',
        quantity: 1,
        listPriceYuan: 420000,
        quotationAmountYuan: 330597.80,
        deliveryCostAmountYuan: 45000,
        grossMarginRate: 86.39,
        isCustomized: false,
        remarks: '支持海洋局、海警局、海事局多部门协同联动处置与移动端指令秒级下发'
      }
    ];
  }
  return [
    {
      id: `SW-${projectId}-01`,
      name: '城市级一网协同数字化操作系统基础套件',
      version: 'V3.0 Enterprise',
      moduleCode: 'MOD-GOV-CORE-01',
      moduleCategory: '核心基座',
      unit: '套',
      quantity: 1,
      listPriceYuan: 260000,
      quotationAmountYuan: 211059.78,
      deliveryCostAmountYuan: 35000,
      grossMarginRate: 83.42,
      isCustomized: false,
      remarks: '数据最多采一次地市自建系统对接中间件与标准数据交换套件'
    }
  ];
}

export function createDetailedMockBudgetDrafts(): Record<string, BudgetDraft> {
  const p001Lines: BudgetLine[] = [
    // 1. 交付人力明细 (直接人力成本 SUB-01: 1281.4656 万元)
    {
      id: 'BD-P-001-L01',
      name: '项目经理主导需求分析与整体交付策划',
      kind: 'labor',
      subjectId: 'SUB-01',
      amount: 14.4,
      userId: 'U-001',
      plannedDays: 120,
      travelDays: 0,
      grade: '高级项目经理',
      taskId: 'TSK-0001',
      stage: '方案确认',
      sourceEstimateItemId: 'SUB-01',
      justification: '负责项目全生命周期策划、客户业务需求调研、WBS/里程碑计划及方案确认',
      department: '交付中心一部',
      supplyMode: '自有交付'
    },
    {
      id: 'BD-P-001-L02',
      name: '系统架构师核心架构与高并发视频网关设计',
      kind: 'labor',
      subjectId: 'SUB-01',
      amount: 43.2,
      userId: 'U-005',
      plannedDays: 300,
      travelDays: 0,
      grade: '资深技术专家',
      taskId: 'TSK-0066',
      stage: '开发实施',
      sourceEstimateItemId: 'SUB-01',
      justification: '负责微服务架构搭建、视频流汇聚分发网关及高可用容灾核心技术攻关',
      department: '交付中心一部',
      supplyMode: '自有交付'
    },
    {
      id: 'BD-P-001-L03',
      name: '后端开发工程师服务研发与数据库优化',
      kind: 'labor',
      subjectId: 'SUB-01',
      amount: 540.0,
      userId: 'U-001',
      plannedDays: 4500,
      travelDays: 0,
      grade: '高级工程师',
      taskId: 'TSK-0131',
      stage: '开发实施',
      sourceEstimateItemId: 'SUB-01',
      justification: '岸海防综合治理业务子系统、多源数据交换平台及智能预警联动引擎核心开发',
      department: '交付中心一部',
      supplyMode: '自有交付'
    },
    {
      id: 'BD-P-001-L04',
      name: '前端交互与GIS态势一张图可视化开发',
      kind: 'labor',
      subjectId: 'SUB-01',
      amount: 504.0,
      userId: 'U-005',
      plannedDays: 3500,
      travelDays: 0,
      grade: '高级工程师',
      taskId: 'TSK-0196',
      stage: '开发实施',
      sourceEstimateItemId: 'SUB-01',
      justification: 'GIS全景一张图大屏、多指挥调度中心及多终端响应式UI交互界面开发',
      department: '交付中心一部',
      supplyMode: '自有交付'
    },
    {
      id: 'BD-P-001-L05',
      name: '全链路集成联调与QA质量验收测试',
      kind: 'labor',
      subjectId: 'SUB-01',
      amount: 179.8656,
      userId: 'U-001',
      plannedDays: 1498.88,
      travelDays: 0,
      grade: '测试经理',
      taskId: 'TSK-0326',
      stage: '内部初验',
      sourceEstimateItemId: 'SUB-01',
      justification: '多业务接口压力测试、系统安全等保合规扫描、初验及客户终验现场技术陪产',
      department: '交付中心一部',
      supplyMode: '自有交付'
    },

    // 2. 专业外包预算 (SUB-02: 569.54 万元)
    {
      id: 'BD-P-001-O01',
      name: 'AI岸线雷达目标智能识别算法模块外包',
      kind: 'outsource',
      subjectId: 'SUB-02',
      amount: 280.0,
      userId: 'U-001',
      plannedDays: 0,
      travelDays: 0,
      grade: '专业外包',
      taskId: 'TSK-0131',
      stage: '开发实施',
      sourceEstimateItemId: 'SUB-02',
      justification: '委托雷达专业厂商定制近海船舶目标智能识别算法与违规越界研判模块',
      department: '交付中心一部',
      supplyMode: '专业外包'
    },
    {
      id: 'BD-P-001-O02',
      name: '沿海无人机自动巡检机巢起降控制模块外包',
      kind: 'outsource',
      subjectId: 'SUB-02',
      amount: 189.54,
      userId: 'U-001',
      plannedDays: 0,
      travelDays: 0,
      grade: '专业外包',
      taskId: 'TSK-0261',
      stage: '开发实施',
      sourceEstimateItemId: 'SUB-02',
      justification: '沿海无人机自动机巢起降调度接口及高清图传模块集成开发',
      department: '交付中心一部',
      supplyMode: '专业外包'
    },
    {
      id: 'BD-P-001-O03',
      name: '政务外网与海洋专网跨网段安全中继模块外包',
      kind: 'outsource',
      subjectId: 'SUB-02',
      amount: 100.0,
      userId: 'U-001',
      plannedDays: 0,
      travelDays: 0,
      grade: '专业外包',
      taskId: 'TSK-0261',
      stage: '系统联调',
      sourceEstimateItemId: 'SUB-02',
      justification: '符合公安与政务安全规范的跨网段安全隔离与数据穿透中继模块实施',
      department: '交付中心一部',
      supplyMode: '专业外包'
    },

    // 3. 建设采购情况 (SUB-03: 711.925 万元)
    {
      id: 'BD-P-001-P01',
      name: '海岸全景高清双光谱重型云台光电摄像机(12套)',
      kind: 'procurement',
      subjectId: 'SUB-03',
      amount: 320.0,
      userId: 'U-001',
      plannedDays: 0,
      travelDays: 0,
      grade: '硬件采购',
      taskId: 'TSK-0261',
      stage: '开发实施',
      sourceEstimateItemId: 'SUB-03',
      justification: '沿海重点卡口与滩涂全天候红外/可见光监控感知设备',
      department: '交付中心一部',
      supplyMode: '集中采购'
    },
    {
      id: 'BD-P-001-P02',
      name: '信创边缘计算网关与视频流智能分析服务器集群',
      kind: 'procurement',
      subjectId: 'SUB-03',
      amount: 220.0,
      userId: 'U-001',
      plannedDays: 0,
      travelDays: 0,
      grade: '硬件采购',
      taskId: 'TSK-0261',
      stage: '开发实施',
      sourceEstimateItemId: 'SUB-03',
      justification: '国产化信创服务器集群，部署于沿海各分指挥所负责本地AI推断',
      department: '交付中心一部',
      supplyMode: '集中采购'
    },
    {
      id: 'BD-P-001-P03',
      name: '指挥大厅分布式KVM坐席协作系统与LED小间距拼接大屏',
      kind: 'procurement',
      subjectId: 'SUB-03',
      amount: 171.925,
      userId: 'U-001',
      plannedDays: 0,
      travelDays: 0,
      grade: '硬件采购',
      taskId: 'TSK-0456',
      stage: '内部初验',
      sourceEstimateItemId: 'SUB-03',
      justification: '市海洋与渔业局主指挥中心大屏显控系统及坐席联动终端',
      department: '交付中心一部',
      supplyMode: '集中采购'
    },

    // 4. 第三方费用明细 (SUB-04-1: 68.3448 万元)
    {
      id: 'BD-P-001-E01',
      name: '国家软件评测中心第三方软件测评与等保三级安全测评',
      kind: 'expense',
      subjectId: 'SUB-04-1',
      amount: 68.3448,
      userId: 'U-001',
      plannedDays: 0,
      travelDays: 0,
      grade: '第三方服务',
      taskId: 'TSK-0326',
      stage: '内部初验',
      sourceEstimateItemId: 'SUB-04-1',
      justification: '依据立项要求聘请具备CNAS资质的第三方机构开展软件功能及网络安全等保测评',
      department: '交付中心一部',
      supplyMode: '外协服务'
    },

    // 5. 差旅费用明细 (SUB-04-2: 91.1264 万元)
    {
      id: 'BD-P-001-E02',
      name: '项目架构师与交付工程师驻场差旅及市内交通补贴',
      kind: 'expense',
      subjectId: 'SUB-04-2',
      amount: 91.1264,
      userId: 'U-001',
      plannedDays: 0,
      travelDays: 0,
      grade: '差旅标准',
      taskId: 'TSK-0001',
      stage: '开发实施',
      sourceEstimateItemId: 'SUB-04-2',
      justification: '晋江现场技术架构师及核心开发人员往返福州/厦门至晋江现场差旅交通与食宿补贴',
      department: '交付中心一部',
      supplyMode: '报销'
    },

    // 6. 租房成本明细 (SUB-04-3: 22.7816 万元)
    {
      id: 'BD-P-001-E03',
      name: '晋江现场项目部工作站办公场所与交付人员宿舍租赁',
      kind: 'expense',
      subjectId: 'SUB-04-3',
      amount: 22.7816,
      userId: 'U-001',
      plannedDays: 0,
      travelDays: 0,
      grade: '租赁费',
      taskId: 'TSK-0001',
      stage: '开发实施',
      sourceEstimateItemId: 'SUB-04-3',
      justification: '项目现场办公室及核心骨干驻场期间宿舍租赁费用、水电宽带物业费',
      department: '交付中心一部',
      supplyMode: '租赁合同'
    },

    // 7. 交付招待及其他费用 (SUB-04-4: 45.5632 万元)
    {
      id: 'BD-P-001-E04',
      name: '业务研讨与多方协同业务招待费',
      kind: 'expense',
      subjectId: 'SUB-04-4',
      amount: 15.5632,
      userId: 'U-001',
      plannedDays: 0,
      travelDays: 0,
      grade: '业务招待',
      taskId: 'TSK-0001',
      stage: '方案确认',
      sourceEstimateItemId: 'SUB-04-4',
      justification: '方案研讨会及关键阶段涉海部门联合业务沟通交流（严格控制在业务费用的10%以内）',
      department: '交付中心一部',
      supplyMode: '报销'
    },
    {
      id: 'BD-P-001-E05',
      name: '业务培训实操演练与系统操作规范手册印制',
      kind: 'expense',
      subjectId: 'SUB-04-4',
      amount: 30.0,
      userId: 'U-001',
      plannedDays: 0,
      travelDays: 0,
      grade: '培训印制',
      taskId: 'TSK-0456',
      stage: '客户终验',
      sourceEstimateItemId: 'SUB-04-4',
      justification: '为晋江市沿海各镇街执法中队及监控中心组织多场集中式实操业务培训与教材制作',
      department: '交付中心一部',
      supplyMode: '自有交付'
    },

    // 8. 准备金 (SUB-05: 56.954 万元)
    {
      id: 'BD-P-001-R01',
      name: '恶劣海况不可抗力与第三方接口突发变更应急准备金',
      kind: 'reserve',
      subjectId: 'SUB-05',
      amount: 56.954,
      userId: 'U-001',
      plannedDays: 0,
      travelDays: 0,
      grade: '风险准备金',
      taskId: 'TSK-0456',
      stage: '客户终验',
      sourceEstimateItemId: undefined,
      justification: '用于沿海台风季施工延误防范、海警与海事局新旧数据协议突发变更等不可预见准备金',
      department: '交付中心一部',
      supplyMode: '准备金'
    }
  ];

  return {
    'P-001': {
      projectId: 'P-001',
      revision: 0,
      estimateVersionId: 'EST-VER-001',
      updatedAt: AS_OF_DATE,
      reason: '硬件采购配置升级（增配双光谱重型云台光电）及AI算法外包扩容导致科目调整，但整体预算较概算净节约364.30万元。',
      mitigation: '严格执行阶段性验收与付款，通过供应商框架集采进一步压缩硬件成本；人员投入实行按人天工时考核。',
      responsibility: '项目经理张建国对硬件集采及交付进度总负责，各业务线责任人已签署预算责任书。',
      lines: p001Lines
    }
  };
}
