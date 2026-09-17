// 合同台账 mock：按 BPM 合同台账表单结构生成，金额口径与项目/合同保持一致（单位：万元）。
// 设备清单、分税点、毛利测算均由合同总额/概算成本分摊得出，保证只有一个权威金额事实。
import { allocateMoney, money } from '@/utils/money';
import type {
  ContractLedger, ContractLedgerAttachment, ContractLedgerChange, ContractLedgerDevice,
  ContractLedgerInvoice, ContractLedgerLetter, ContractLedgerReceiptPhase,
} from '@/models/types';
import { mockContracts, mockEstimateVersions, mockOpportunities, mockProjects } from './index';

// 确定性伪随机：同一合同每次生成结果一致
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const hash = (text: string) => [...text].reduce((sum, ch) => (sum * 31 + ch.charCodeAt(0)) >>> 0, 7);

const SIGN_ORG = '智汇数科股份有限公司';

// 按项目类型的收入结构：软件 / 硬件 / 自主产品 占比
const incomeSplitByType: Record<string, [number, number, number]> = {
  软件开发: [0.62, 0.28, 0.1],
  系统集成: [0.18, 0.72, 0.1],
  咨询服务: [0.78, 0.12, 0.1],
  运维服务: [0.66, 0.24, 0.1],
  混合交付: [0.45, 0.45, 0.1],
};

const devicePool: Record<ContractLedgerDevice['goodsType'], {
  names: string[]; brands: string[]; units: string[];
  attribute: ContractLedgerDevice['attribute'][]; qtyRange: [number, number];
}> = {
  系统集成: { names: ['AI边缘计算盒子', '核心交换机', '视频监控摄像机', '分布式存储节点', 'UPS电源', '雷达感知设备', '门禁闸机', '企业级硬盘'], brands: ['华为', '海康威视', '大华', '新华三'], units: ['台', '套'], attribute: ['外购设备'], qtyRange: [4, 260] },
  集成服务: { names: ['平台基础服务', '数据治理服务', '视频联网服务', 'GIS一张图服务', '统一门户服务'], brands: ['南威', '自研'], units: ['套', '项'], attribute: ['自研产品', '外包'], qtyRange: [1, 3] },
  外购软件: { names: ['关系型数据库RDS', '云服务器ECS', '对象存储OSS', '中间件授权', '国产操作系统授权'], brands: ['阿里云', '华为云', 'Oracle', '麒麟软件'], units: ['套', '年'], attribute: ['外购软件', '外购服务'], qtyRange: [1, 5] },
  技术服务: { names: ['软件外包（园区运营）', '等保测评服务', '第三方监理服务', '驻场运维服务'], brands: ['国产', '定制'], units: ['项', '人月'], attribute: ['外包', '外购服务'], qtyRange: [1, 12] },
  建造: { names: ['前端点位施工外包', '管道顶管工程', '立杆基础工程', '机房装修工程'], brands: ['国产', '定制'], units: ['项'], attribute: ['外包'], qtyRange: [1, 2] },
};

const goodsTypeList: ContractLedgerDevice['goodsType'][] = ['系统集成', '集成服务', '外购软件', '技术服务', '建造'];

const taxPointTemplate: { name: string; rate: number; weight: number }[] = [
  { name: '软件开发', rate: 6, weight: 30 },
  { name: '外购软件', rate: 13, weight: 10 },
  { name: '系统集成', rate: 13, weight: 35 },
  { name: '集成服务', rate: 6, weight: 15 },
  { name: '建造', rate: 9, weight: 10 },
];

const receiptTemplate: { stage: ContractLedgerReceiptPhase['stage']; ratio: number; milestone: string; condition: string }[] = [
  { stage: '预付款', ratio: 0.2, milestone: '合同签订', condition: '合同签订并收到预付款发票后 15 日内支付' },
  { stage: '进度款', ratio: 0.3, milestone: '项目实施', condition: '完成总工程量 50% 后十五日内支付至合同总价款 50%' },
  { stage: '进度款', ratio: 0.2, milestone: '项目实施', condition: '完成总工程量 80% 后十五日内支付至合同总价款 70%' },
  { stage: '验收款', ratio: 0.15, milestone: '内部初验', condition: '最后一个模块初验完毕后十五日内支付' },
  { stage: '终验款', ratio: 0.12, milestone: '客户终验', condition: '终验报告经批准后十五日内支付至结算金额 97%' },
  { stage: '质保款', ratio: 0.03, milestone: '过保', condition: '缺陷责任期满后结清 3% 质保金' },
];

export function createMockContractLedgers(): ContractLedger[] {
  return mockContracts.map((contract, index) => {
    const project = mockProjects.find((p) => p.id === contract.projectId)!;
    const opportunity = mockOpportunities.find((o) => o.id === project.opportunityId);
    const estimate = mockEstimateVersions.find((e) => e.opportunityId === project.opportunityId && e.isFrozen);
    const rand = mulberry32(hash(contract.id));
    const total = contract.amount;
    const isP001 = project.id === 'P-001';

    // ── 基本信息 ─────────────────────────────────────────────
    const [softwareRatio, hardwareRatio, selfRatio] = incomeSplitByType[project.type] ?? [0.45, 0.45, 0.1];
    const paidTotal = contract.paidAmount;
    const accepted = project.phase === '运维' || project.phase === '已关闭';
    const basic: ContractLedger['basic'] = {
      opportunityCode: opportunity?.code ?? '—',
      contractType: index % 9 === 0 ? '框架合同' : '一般合同',
      signOrg: SIGN_ORG,
      execStatus: accepted ? '已验收' : project.subPhase === '项目结算' ? '已结算' : '在建',
      industry: project.type === '系统集成' ? '集成系统' : '软件与信息服务',
      region: '华东区',
      businessDept: project.departmentName,
      businessManager: project.pmName,
      customerAttribute: '政府单位',
      cooperationMode: ['P-001', 'P-005'].includes(project.id) ? '联合体' : '直签',
      presalePerson: '房艳龙',
      amounts: {
        total,
        hardware: money(total * hardwareRatio),
        software: money(total * softwareRatio),
        selfProduct: money(total * selfRatio),
        acceptanceTotal: accepted ? total : 0,
        retentionRatio: 3.0,
        paidTotal,
        invoicedTotal: money(paidTotal * 0.9),
        receivableTotal: money(total - paidTotal),
      },
      dates: {
        plannedStart: project.plannedStartDate,
        plannedEnd: project.plannedEndDate,
        acceptanceDue: project.plannedEndDate,
        finalAcceptanceDue: project.plannedEndDate,
        actualStart: project.actualStartDate,
        warrantDue: accepted ? '2027-12-31' : undefined,
        remark: project.level === '特大型' ? '工期总日历天数：自开工之日起 360 日历天内完工' : undefined,
      },
    };

    // ── 合同附件 ─────────────────────────────────────────────
    const attachments: ContractLedgerAttachment[] = [
      { id: `${contract.id}-ATT-1`, category: '合同电子版', fileName: `${contract.name}合同.pdf`, status: '正常' },
      { id: `${contract.id}-ATT-2`, category: '合同电子版', fileName: `${contract.name}合同.docx`, status: '正常' },
    ];
    if (['P-001', 'P-002', 'P-003'].includes(project.id)) {
      attachments.push(
        { id: `${contract.id}-ATT-3`, category: '其他附件', fileName: '联合体合作协议.pdf', status: '正常' },
        { id: `${contract.id}-ATT-4`, category: '验收资料', fileName: `${contract.name}验收申请单.pdf`, status: project.phase === '执行' ? '待补充' : '正常' },
      );
    }

    // ── 合同变更记录 ─────────────────────────────────────────
    const changeRecords: ContractLedgerChange[] = [
      { id: `${contract.id}-CHG-1`, date: contract.signDate, operator: '吴冰冰(合同管理组)', field: '合同总额', before: `${total}`, after: `${total.toFixed(2)}` },
      { id: `${contract.id}-CHG-2`, date: '2026-03-06', operator: '庄泽宏(交付管理组)', field: '业务部门', before: '生态合作部本部', after: project.departmentName },
    ];
    if (isP001) {
      changeRecords.push(
        { id: `${contract.id}-CHG-3`, date: '2026-04-18', operator: '李芳冰(合同回款组)', field: '质保金比例(%)', before: '5.0000', after: '3.0000' },
        { id: `${contract.id}-CHG-4`, date: '2026-06-02', operator: '李芳冰(项目管理部)', field: '业务经理', before: '吴志扬', after: project.pmName },
      );
    }

    // ── 回款计划（阶段金额合计 = 合同总额，实际回款合计 = 合同实收）──
    const actualAlloc = allocateMoney(paidTotal, receiptTemplate.map((_, i) => (i < 2 ? 6 : i < 4 ? 2 : 1)));
    const receiptPhases: ContractLedgerReceiptPhase[] = receiptTemplate.map((phase, i) => ({
      id: `${contract.id}-RCP-${i + 1}`,
      ratio: phase.ratio,
      amount: money(total * phase.ratio),
      stage: phase.stage,
      milestone: phase.milestone,
      plannedDate: i < 3 ? project.actualStartDate ?? project.plannedStartDate : project.plannedEndDate,
      plannedAmount: money(total * phase.ratio),
      actualAmount: actualAlloc[i],
      condition: phase.condition,
      owner: project.pmName,
    }));

    // ── 保证金回款计划（特大型/重大）──────────────────────────
    const depositPhases = (['特大型', '重大'] as const).includes(project.level as '特大型' | '重大')
      ? [
        { id: `${contract.id}-DEP-1`, kind: '履约保证金' as const, amount: money(total * 0.05), dueDate: project.plannedEndDate, condition: '合同签订后提交，验收合格后 30 日内无息退还', returnedAmount: 0 },
        { id: `${contract.id}-DEP-2`, kind: '质保保证金' as const, amount: money(total * 0.03), dueDate: '2027-12-31', condition: '缺陷责任期满且无未处理质量缺陷后结清', returnedAmount: 0 },
      ]
      : [];

    // ── 维保信息 ─────────────────────────────────────────────
    const maintenance: ContractLedger['maintenance'] = {
      type: '整体',
      months: project.isMaintenance ? 24 : 12,
      startDate: project.plannedEndDate,
      endDate: accepted ? '2027-12-31' : undefined,
      acceptanceStatus: accepted ? '维保中' : '未开始',
    };

    // ── 设备清单（销售总价合计 = 合同总额）────────────────────
    const deviceCount = ({ 特大型: 42, 重大: 30, 重点: 22, 一般: 14 } as Record<string, number>)[project.level] ?? 14;
    const typeCounts = allocateMoney(deviceCount, [0.34, 0.24, 0.16, 0.16, 0.1]).map((v) => Math.max(1, Math.round(v)));
    const goodsTypeSeq: ContractLedgerDevice['goodsType'][] = [];
    goodsTypeList.forEach((goodsType, ti) => {
      for (let k = 0; k < typeCounts[ti]; k++) goodsTypeSeq.push(goodsType);
    });
    const priceAlloc = allocateMoney(total, Array.from({ length: deviceCount }, () => 0.4 + rand()));
    const devices: ContractLedgerDevice[] = Array.from({ length: deviceCount }).map((_, i) => {
      const goodsType = goodsTypeSeq[i % goodsTypeSeq.length];
      const pool = devicePool[goodsType];
      const quantity = Math.max(1, Math.round(pool.qtyRange[0] + rand() * (pool.qtyRange[1] - pool.qtyRange[0])));
      const saleTotalPrice = priceAlloc[i];
      return {
        id: `${contract.id}-DEV-${i + 1}`,
        code: `${contract.code.replace('HT-', 'CTD-')}${String(i + 1).padStart(4, '0')}`,
        goodsType,
        name: pool.names[(i * 3 + index) % pool.names.length],
        brand: pool.brands[(i + index) % pool.brands.length],
        model: rand() > 0.5 ? '定制' : '标准版',
        unit: pool.units[i % pool.units.length],
        quantity,
        attribute: pool.attribute[(i + index) % pool.attribute.length],
        saleUnitPrice: money(saleTotalPrice / quantity),
        saleTotalPrice,
        supplier: goodsType === '外购软件' ? `${pool.brands[(i + index) % pool.brands.length]}官方渠道` : undefined,
      };
    });

    // ── 毛利测算（概算口径：收入=合同总额，成本合计=冻结概算总成本）──
    const totalCost = estimate?.totalCost ?? project.budgetAmount;
    const grossProfit = money(total - totalCost);
    const tax = money(grossProfit * 0.25);
    const costAlloc = allocateMoney(totalCost, project.type === '软件开发' ? [30, 22, 12, 16, 8, 6, 6] : [14, 10, 38, 16, 8, 7, 7]);
    const margin: ContractLedger['margin'] = {
      income: total,
      softwareIncome: money(total * softwareRatio),
      hardwareIncome: money(total * hardwareRatio),
      selfProductIncome: money(total * selfRatio),
      costItems: [
        { type: '建设成本', item: '自有软件研发成本', amount: costAlloc[0], note: '按《集团内部结算办法》约定计算' },
        { type: '建设成本', item: '自有软件交付成本', amount: costAlloc[1], note: '售前支持部与行业交付部门评估提供' },
        { type: '建设成本', item: '硬件(含外购软件)采购成本', amount: costAlloc[2], note: '以售前部门询价成本为准' },
        { type: '建设成本', item: '硬件(含外购软件)交付成本', amount: costAlloc[3], note: '实施交付部门评估提供' },
        { type: '建设成本', item: '软件外包费用', amount: costAlloc[4], note: '软件研发与实施外包费用' },
        { type: '第三方费用', item: '投标费+中标服务费', amount: costAlloc[5], note: '投标费及按规模测算的中标服务费' },
        { type: '经营费用', item: '商务合作费+业务费', amount: costAlloc[6], note: '商务合作（如有）及业务费用预算' },
      ],
      totalCost,
      grossProfit,
      grossMarginRate: money((grossProfit / total) * 100),
      hqServiceFee: money(total * softwareRatio * 0.06 + total * hardwareRatio * 0.04),
      presaleServiceFee: money(total * softwareRatio * 0.02 + total * hardwareRatio * 0.01),
      tax,
      netProfit: money(grossProfit - tax),
      netProfitRate: money(((grossProfit - tax) / total) * 100),
    };

    // ── 分税点数据 ───────────────────────────────────────────
    const taxIncomeAlloc = allocateMoney(total, taxPointTemplate.map((t) => t.weight));
    const taxCostAlloc = allocateMoney(totalCost, taxPointTemplate.map((t) => t.weight));
    const taxPoints = taxPointTemplate.map((point, i) => {
      const incomeWithTax = taxIncomeAlloc[i];
      const incomeWithoutTax = money(incomeWithTax / (1 + point.rate / 100));
      return {
        id: `${contract.id}-TAX-${i + 1}`,
        name: point.name,
        taxRate: point.rate,
        incomeWithTax,
        incomeWithoutTax,
        tax: money(incomeWithTax - incomeWithoutTax),
        cost: taxCostAlloc[i],
      };
    });

    // ── 开票明细 ─────────────────────────────────────────────
    const invoices: ContractLedgerInvoice[] = isP001
      ? [{ id: `${contract.id}-INV-1`, code: 'KPSQ-20260601', goodsName: '软件开发服务-岸海防平台一期进度款', invoiceType: '增值税专用发票', applicant: '丁菁', applyDate: '2026-06-30', amount: money(paidTotal * 0.5), processStatus: '已完成', invoiceStatus: '已开票' }]
      : index % 4 === 1
        ? [{ id: `${contract.id}-INV-1`, code: `KPSQ-2026${String(100 + index)}`, goodsName: `${project.name}进度款`, invoiceType: '增值税专用发票', applicant: '丁菁', applyDate: '2026-07-15', amount: money(paidTotal * 0.4), processStatus: '流程中', invoiceStatus: '未开票' }]
        : [];

    // ── 诉讼记录 / 项目函件记录 ───────────────────────────────
    const litigations: ContractLedger['litigations'] = project.id === 'P-003'
      ? [{ id: `${contract.id}-LIT-1`, code: 'SSSQ-2026-014', disputeParty: project.customerName, applyType: '律师函', involvedAmount: money(total * 0.02), riskLevel: '低', status: '流程中' }]
      : [];
    const letters: ContractLedgerLetter[] = isP001
      ? [
        { id: `${contract.id}-LET-1`, direction: '客户来函', title: '关于岸海防平台二期建设范围的沟通函', date: '2026-07-08', sender: project.customerName, summary: '客户希望二期扩展渔船动态监控模块，请评估范围与工期影响' },
        { id: `${contract.id}-LET-2`, direction: '我方去函', title: '关于一期交付计划调整的回函', date: '2026-07-12', sender: SIGN_ORG, summary: '因涉海设备到货延迟，申请联调阶段顺延 10 个工作日' },
      ]
      : [];

    return {
      contractId: contract.id,
      projectId: project.id,
      basic,
      attachments,
      changeRecords,
      receiptPhases,
      depositPhases,
      maintenance,
      devices,
      margin,
      taxPoints,
      invoices,
      litigations,
      letters,
    };
  });
}