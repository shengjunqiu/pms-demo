// 项目成本 mock：对齐 BPM「项目成本」模块（指标卡 + 项目核算情况概览），单位：万元。
// 口径与项目既有权威数值一致：收入=合同额（未签约用拟签金额），
// 概算成本=冻结概算版本总成本，预算成本=项目预算，实际费用=项目已发生成本。
import { allocateMoney, money } from '@/utils/money';
import type { ProjectCostCategory, ProjectCostOverview, ProjectCostServiceFee } from '@/models/types';
import { mockEstimateVersions, mockProjects } from './index';

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

// 收入结构：软件 / 硬件 / 运维
const incomeSplitByType: Record<string, [number, number]> = {
  软件开发: [0.62, 0.38],
  系统集成: [0.18, 0.82],
  咨询服务: [0.8, 0.2],
  运维服务: [0.55, 0.45],
  混合交付: [0.45, 0.55],
};

// 核算科目模板（权重，各列独立分摊；两个模板合计权重一致）
type SubjectSpec = { item: string; subject: string; weight: number };
const buildTemplate = (kind: 'software' | 'system'): SubjectSpec[] => {
  const thirdParty: SubjectSpec[] = [
    { item: '第三方费用', subject: '投标费用', weight: 1.2 },
    { item: '第三方费用', subject: '中标服务费', weight: 0.6 },
    { item: '第三方费用', subject: '验收费', weight: 0.2 },
    { item: '第三方费用', subject: '项目监管费', weight: 0.2 },
    { item: '第三方费用', subject: '第三方检测费', weight: 0.2 },
    { item: '第三方费用', subject: '培训费', weight: 0.2 },
    { item: '第三方费用', subject: '设计费', weight: 0.2 },
    { item: '第三方费用', subject: '其他费用', weight: 0.6 },
  ];
  const operating: SubjectSpec[] = [
    { item: '费用成本结算经营费用', subject: '商务合作费', weight: 10 },
    { item: '费用成本结算经营费用', subject: '业务费用', weight: 6 },
  ];
  const advance: SubjectSpec[] = [{ item: '项目垫资成本', subject: '垫资成本', weight: 2 }];
  const delivery: SubjectSpec[] = [
    { item: '交付人力成本', subject: '软件交付成本', weight: kind === 'software' ? 2.5 : 1.2 },
    { item: '交付人力成本', subject: '集成交付成本', weight: kind === 'software' ? 1.5 : 2.8 },
    { item: '交付期间费用', subject: '交付招待费用', weight: 0.4 },
    { item: '交付期间费用', subject: '差旅成本', weight: 0.6 },
    { item: '交付期间费用', subject: '租房成本', weight: 0.6 },
  ];
  const construction: SubjectSpec[] = kind === 'software'
    ? [
      { item: '建设成本', subject: '自有软件研发成本', weight: 30 },
      { item: '建设成本', subject: '硬件（含外购软件）采购成本', weight: 18 },
      { item: '建设成本', subject: '硬件外包实施费用', weight: 10 },
      { item: '建设成本', subject: '软件采购成本', weight: 4 },
      { item: '建设成本', subject: '软件外包费用', weight: 12 },
    ]
    : [
      { item: '建设成本', subject: '自有软件研发成本', weight: 10 },
      { item: '建设成本', subject: '硬件（含外购软件）采购成本', weight: 35 },
      { item: '建设成本', subject: '硬件外包实施费用', weight: 18 },
      { item: '建设成本', subject: '软件采购成本', weight: 6 },
      { item: '建设成本', subject: '软件外包费用', weight: 5 },
    ];
  return [...construction, ...thirdParty, ...operating, ...advance, ...delivery];
};

export function createMockProjectCostOverviews(): ProjectCostOverview[] {
  return mockProjects.map((project) => {
    const rand = mulberry32(hash(`cost-${project.id}`));
    const income = project.contractAmount || project.revenueAmount || 0;
    const [softwareRatio, hardwareRatio] = incomeSplitByType[project.type] ?? [0.45, 0.55];
    const opsIncome = project.isMaintenance ? money(income * 0.12) : 0;
    const estimate = mockEstimateVersions.find((e) => e.opportunityId === project.opportunityId && e.isFrozen);
    const estimateCost = estimate?.totalCost ?? project.budgetAmount;
    const budgetCost = project.budgetAmount;
    const actualCost = project.actualCost;

    // 各列独立按权重分摊（实际费用列加随机扰动，呈现 BPM 式的结构性偏差）
    const template = buildTemplate(project.type === '软件开发' || project.type === '咨询服务' ? 'software' : 'system');
    const estimateAlloc = allocateMoney(estimateCost, template.map((s) => s.weight));
    const budgetAlloc = allocateMoney(budgetCost, template.map((s) => s.weight));
    const actualWeights = template.map((s) => s.weight * (0.35 + rand() * 1.5));
    const actualAlloc = allocateMoney(actualCost, actualWeights);

    // 按 成本项 → 成本分类 归组
    const itemOrder: string[] = [];
    for (const spec of template) if (!itemOrder.includes(spec.item)) itemOrder.push(spec.item);
    const categories: ProjectCostCategory[] = [
      {
        category: '外部成本',
        items: itemOrder.filter((item) => !['交付人力成本', '交付期间费用'].includes(item))
          .map((item) => ({
            item,
            subjects: template.filter((s) => s.item === item).map((spec) => {
              const i = template.indexOf(spec);
              return { subject: spec.subject, estimateCost: estimateAlloc[i], budgetCost: budgetAlloc[i], actualCost: actualAlloc[i] };
            }),
          })),
      },
      {
        category: '交付结算',
        items: itemOrder.filter((item) => ['交付人力成本', '交付期间费用'].includes(item))
          .map((item) => ({
            item,
            subjects: template.filter((s) => s.item === item).map((spec) => {
              const i = template.indexOf(spec);
              return { subject: spec.subject, estimateCost: estimateAlloc[i], budgetCost: budgetAlloc[i], actualCost: actualAlloc[i] };
            }),
          })),
      },
    ];

    // 服务费为信息行：按收入口径计提，不参与成本合计
    const serviceFees: ProjectCostServiceFee[] = [
      { label: '总部服务费', estimate: money(income * softwareRatio * 0.06 + income * hardwareRatio * 0.04), budget: money(income * softwareRatio * 0.06 + income * hardwareRatio * 0.04), actual: money((income * softwareRatio * 0.06 + income * hardwareRatio * 0.04) * (rand() > 0.5 ? 1.1 : 1)) },
      { label: '售前服务费', estimate: money(income * softwareRatio * 0.02 + income * hardwareRatio * 0.01), budget: money(income * softwareRatio * 0.02 + income * hardwareRatio * 0.01), actual: money(income * softwareRatio * 0.02 + income * hardwareRatio * 0.01) },
      { label: '销售服务费', estimate: 0, budget: 0, actual: rand() > 0.6 ? money(income * 0.005) : 0 },
    ];

    return {
      projectId: project.id,
      summary: {
        estimateCost,
        budgetCost,
        actualCost,
        softwareIncome: money(income * softwareRatio),
        hardwareIncome: money(income * hardwareRatio - opsIncome),
        opsIncome,
        totalIncome: income,
      },
      serviceFees,
      categories,
    };
  });
}