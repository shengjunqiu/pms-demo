import { AS_OF_DATE, mockProcurements, mockOutsources } from '@/mock';
import type { Actor, BusinessState } from '@/mock/business';
import type { AcceptanceRecord } from '@/models/types';
import type { AcceptanceType, AcceptanceDetail, AcceptanceCheck, AcceptanceReport } from '@/models/settlement';
import { qualityPlan, documentPhase } from '@/mock/deliverables';
import { money, sumMoney } from '@/utils/money';

export const acceptancePaths = { 内部初验: 'internal-acceptance', 供应商验收: 'supplier-acceptance', 客户终验: 'customer-acceptance' };
export const checkNames = (type: AcceptanceType) => type === '内部初验' ? ['功能', '性能', '安全', '文档'] : type === '供应商验收' ? ['数量', '质量及技术参数', '服务', '交付时间', '成果及文档'] : ['验收范围', '验收材料', '现场条件', '客户签署意见'];
export function acceptanceDetail(state: BusinessState, record: AcceptanceRecord): AcceptanceDetail {
  return state.acceptanceDetails[record.id] ?? { submitted: record.status !== '待验收', scope: '导入验收记录，范围以原项目基线为准', plannedDate: record.acceptanceDate ?? AS_OF_DATE, method: '现场验收', customerContact: '', participants: '', checks: checkNames(record.type).map((name) => ({ name, passed: record.status === '已通过', note: record.status === '已通过' ? '历史验收通过快照' : '' })), corrections: record.status === '整改中' ? [{ id: `${record.id}-R1`, content: '客户要求补充园区接口联调记录与操作培训材料', owner: state.projects.find((p) => p.id === record.projectId)?.pmName ?? '项目经理', deadline: '2026-09-20' }] : [], opinion: record.status === '整改中' ? '补齐接口联调和培训记录后重新组织客户复验' : '', process: '', proofFiles: [], history: [] };
}
export function supplierSources(state: BusinessState, projectId: string) {
  return [
    ...mockProcurements.filter((o) => o.projectId === projectId).map((o) => ({ id: o.id, code: o.code, name: o.supplierName, amount: o.amount, scope: '采购设备及随货技术资料', path: 'procurement', ready: ['已全部到货', '已结算'].includes(o.status), status: o.status })),
    ...mockOutsources.filter((o) => o.projectId === projectId).map((o) => ({ id: o.id, code: o.code, name: o.vendorName, amount: o.amount, scope: '合同约定软件开发及技术服务', path: 'outsourcing', ready: ['已终验', '已结算'].includes(o.status), status: o.status })),
    ...state.costOrders.filter((o) => o.projectId === projectId && o.kind !== 'expense' && o.status !== '驳回').map((o) => ({ id: o.id, code: o.contractNo, name: o.supplier, amount: o.amount, scope: o.scope, path: o.kind === 'procurement' ? 'procurement' : 'outsourcing', ready: o.progress === 100 && ['已批准', '验收通过', '已入账'].includes(o.status), status: o.status })),
  ];
}
export function acceptanceConditions(state: BusinessState, projectId: string, type: AcceptanceType) {
  const base = `/projects/${projectId}`;
  const materials = state.materials.filter((m) => m.projectId === projectId && m.required && (type === '客户终验' ? m.name !== '验收确认函' : documentPhase(m) !== '客户终验'));
  const openBugs = state.bugs.filter((b) => b.projectId === projectId && ['致命', '严重'].includes(b.severity) && b.status !== '已关闭');
  const openIssues = state.issues.filter((i) => i.projectId === projectId && i.severity === '重大' && i.status !== '已关闭');
  const tasks = state.tasks.filter((t) => t.projectId === projectId && !state.tasks.some((c) => c.parentId === t.id));
  const requirements = state.requirements.filter((r) => r.projectId === projectId && r.priority === '高' && r.status !== '已关闭');
  const checks = qualityPlan(state, projectId).checks;
  const common = [
    { name: '有效范围基线', passed: state.baselines.some((b) => b.projectId === projectId && b.status === '已生效' && b.scopeDesc.trim()), detail: '引用当前生效范围基线', path: `${base}/baseline` },
    { name: 'WBS交付任务', passed: tasks.length > 0 && tasks.every((t) => t.status === '已完成'), detail: `${tasks.filter((t) => t.status === '已完成').length}/${tasks.length} 叶子任务完成`, path: `${base}/progress` },
    { name: '关键需求与BUG', passed: !openBugs.length && !requirements.length, detail: `${requirements.length} 项高优需求、${openBugs.length} 项严重/致命BUG未关闭`, path: `/requirements-bugs?project=${projectId}` },
    { name: '重大问题处置', passed: !openIssues.length, detail: `${openIssues.length} 项重大问题未关闭`, path: `/issues-risks?project=${projectId}` },
    { name: '质量检查', passed: !!checks.at(-1)?.passed && !checks.some((c) => c.issueId && state.issues.find((i) => i.id === c.issueId)?.status !== '已关闭'), detail: checks.at(-1)?.passed ? '最近质量复查通过' : '需要检查通过记录', path: `${base}/deliverables?tab=quality` },
    { name: '必交材料', passed: materials.length > 0 && materials.every((m) => m.status === '通过'), detail: materials.filter((m) => m.status !== '通过').map((m) => `${m.name}：${m.status}`).join('；') || '前置必交材料审核通过', path: `${base}/deliverables` },
  ];
  if (type !== '内部初验') common.unshift({ name: '内部验收', passed: state.acceptances.filter((r) => r.projectId === projectId && r.type === '内部初验').sort((a,b) => b.round-a.round)[0]?.status === '已通过', detail: '最近一轮内部验收须通过', path: `${base}/internal-acceptance` });
  if (type === '客户终验') {
    const sources = supplierSources(state, projectId);
    common.push({ name: '供应商履约', passed: sources.every((s) => s.ready || state.acceptances.some((r) => r.projectId === projectId && r.type === '供应商验收' && r.status === '已通过' && state.acceptanceDetails[r.id]?.supplierSourceId === s.id)), detail: sources.length ? `${sources.length} 份采购/外包原单；逐一核对履约节点` : '不适用：无采购、外包或供应商合同', path: `${base}/supplier-acceptance` });
  }
  return common;
}
export type AcceptanceAction =
 | { type: 'submit-acceptance'; projectId: string; kind: AcceptanceType; id?: string; detail: Pick<AcceptanceDetail, 'scope'|'plannedDate'|'method'|'customerContact'|'participants'|'contractId'|'supplierSourceId'> }
 | { type: 'review-acceptance'; id: string; passed: boolean; checks: AcceptanceCheck[]; opinion: string; process: string; proofFiles?: string[]; correction?: { content: string; owner: string; deadline: string } }
 | { type: 'reply-acceptance'; id: string; reply: string }
 | { type: 'confirm-acceptance'; id: string; proofFiles: string[]; opinion: string }
 | { type: 'save-acceptance-proof'; id: string; proofFiles: string[] }
 | { type: 'save-acceptance-report'; report: Omit<AcceptanceReport, 'id'|'status'|'submittedBy'>; id?: string; submit: boolean }
 | { type: 'confirm-acceptance-report'; id: string; approve: boolean; opinion: string };
export const reportAmount = (r: Pick<AcceptanceReport, 'taxLines'>) => sumMoney(r.taxLines.map((l) => l.amount));
export const confirmedReportedAmount = (state: BusinessState, contractId: string) => sumMoney(state.acceptanceReports.filter((r) => r.contractId === contractId && r.status === '已确认').map(reportAmount));
export function applyAcceptanceAction(state: BusinessState, action: AcceptanceAction, actor: Actor) {
  const report = action.type === 'confirm-acceptance-report' ? state.acceptanceReports.find((r) => r.id === action.id) : undefined;
  const record = 'id' in action && action.id ? state.acceptances.find((a) => a.id === action.id) : undefined;
  const projectId = action.type === 'submit-acceptance' ? action.projectId : action.type === 'save-acceptance-report' ? action.report.projectId : report?.projectId ?? record?.projectId;
  const p = state.projects.find((p) => p.id === projectId); if (!p) throw new Error('项目或验收原单不存在');
  if (state.lockedProjects.includes(p.id) || ['运维', '已关闭'].includes(p.phase)) throw new Error('建设期已结束，验收记录只读');
  const pm = actor.role === 'project-manager' && actor.id === p.pmId;
  const detail = record ? structuredClone(acceptanceDetail(state, record)) : undefined;
  const history = (d: AcceptanceDetail, verb: string, note: string) => d.history.push({ date: AS_OF_DATE, actor: actor.name, action: verb, note });
  if (action.type === 'submit-acceptance') {
    if (!pm) throw new Error('仅项目主PM可发起或重新提交验收');
    if (record && (record.projectId !== p.id || record.type !== action.kind)) throw new Error('原轮次不属于当前项目');
    if (!action.detail.scope.trim() || !action.detail.participants.trim() || !action.detail.method.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(action.detail.plannedDate) || !Number.isFinite(Date.parse(action.detail.plannedDate)) || action.detail.plannedDate < AS_OF_DATE) throw new Error('范围、参与人、方式及有效计划日期必填，计划不得早于演示日');
    if (action.kind === '客户终验' && (!action.detail.customerContact.trim() || !state.contracts.some((c) => c.id === action.detail.contractId && c.projectId === p.id && c.status !== '已终止'))) throw new Error('客户联系人及本项目有效客户合同必填');
    const failed = acceptanceConditions(state, p.id, action.kind).filter((c) => !c.passed);
    if (failed.length) throw new Error(`验收条件未满足：${failed.map((c) => c.name).join('、')}`);
    if (action.kind === '供应商验收' && !supplierSources(state,p.id).some((s) => s.id === action.detail.supplierSourceId && s.ready)) throw new Error('请选择已完成履约的采购/外包原合同');
    if (record && detail?.submitted && record.status === '待验收') throw new Error('已有待验收轮次，不可重复提交');
    if (record?.status === '已通过') throw new Error('已通过轮次只读');
    if (record?.status === '整改中' && detail?.corrections.some((c) => !c.reply)) throw new Error('须先回复全部整改项再申请新轮次');
    const same = state.acceptances.filter((a) => a.projectId === p.id && a.type === action.kind && (action.kind !== '供应商验收' || state.acceptanceDetails[a.id]?.supplierSourceId === action.detail.supplierSourceId));
    if (same.some((a) => a.id !== record?.id && a.status === '待验收' && state.acceptanceDetails[a.id]?.submitted)) throw new Error('此验收已有待处理轮次');
    const reuse = record && !detail?.submitted && record.status === '待验收';
    const next: AcceptanceRecord = reuse ? record : { id: `ACC-NEW-${state.acceptances.length + 1}`, projectId: p.id, type: action.kind, round: Math.max(0,...same.map((a) => a.round))+1, status:'待验收', amount:0, createdAt: AS_OF_DATE, submittedBy: actor.name };
    if (!reuse) state.acceptances.push(next);
    const d: AcceptanceDetail = { ...action.detail, submitted:true, previousId: record?.status === '整改中' ? record.id : undefined, checks:checkNames(action.kind).map((name) => ({name,passed:false,note:''})),corrections:[],opinion:'',process:'',proofFiles:[],history:[] };
    history(d,'提交验收',d.scope); state.acceptanceDetails[next.id]=d;
  } else if (action.type === 'review-acceptance') {
    if (!record || !detail?.submitted || record.status !== '待验收') throw new Error('须先发起待验收轮次');
    if (record.type === '客户终验' ? !pm : actor.role !== 'pmo') throw new Error(record.type === '客户终验' ? '客户结论由主PM记录' : '内部/供应商验收由PMO模拟验收组办理');
    if (!action.opinion.trim() || !action.process.trim()) throw new Error('过程记录及验收意见必填');
    if (action.checks.length !== checkNames(record.type).length || checkNames(record.type).some((n) => !action.checks.some((c) => c.name === n && c.note.trim()))) throw new Error('必须逐项填写验收检查结果及依据');
    if (action.passed && action.checks.some((c) => !c.passed)) throw new Error('检查项未全部通过，不能通过验收');
    if (action.passed && acceptanceConditions(state,p.id,record.type).some((c) => !c.passed)) throw new Error('前置条件发生变化，须补齐后复验');
    if (!action.passed && (!action.correction?.content.trim() || !action.correction.owner.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(action.correction.deadline) || !Number.isFinite(Date.parse(action.correction.deadline)) || action.correction.deadline < AS_OF_DATE)) throw new Error('整改内容、责任人和有效截止日期必填');
    if(record.type==='供应商验收'&&action.passed&&(!action.proofFiles?.length||action.proofFiles.some((f)=>!/\.(pdf|docx|jpg|png)$/i.test(f)))) throw new Error('供应商验收通过须登记有效验收证明文件名');
    if(action.proofFiles?.length)detail.proofFiles=[...action.proofFiles];
    detail.checks = structuredClone(action.checks); detail.opinion=action.opinion; detail.process=action.process;
    if (!action.passed) { record.status='整改中'; detail.corrections.push({id:`${record.id}-R${detail.corrections.length+1}`,...action.correction!}); }
    else { record.status='已通过'; record.acceptanceDate=AS_OF_DATE; if (record.type==='供应商验收') { const o=state.costOrders.find((o) => o.id===detail.supplierSourceId); if (o?.status==='已批准') {o.status='验收通过';o.acceptance=action.opinion;o.history.push({date:AS_OF_DATE,actor:actor.name,action:'供应商验收通过',note:record.id});} } }
    history(detail,action.passed?'验收通过':'验收整改',action.opinion); state.acceptanceDetails[record.id]=detail;
  } else if (action.type === 'reply-acceptance') {
    if (!pm || !record || !detail || record.status!=='整改中' || !action.reply.trim()) throw new Error('主PM填写整改回复后提交');
    detail.corrections.forEach((c) => {if (!c.reply) {c.reply=action.reply;c.repliedAt=AS_OF_DATE;}});history(detail,'整改回复',action.reply);state.acceptanceDetails[record.id]=detail;
  } else if (action.type === 'save-acceptance-proof' || action.type === 'confirm-acceptance') {
    if (!record || !detail || record.type!=='客户终验' || record.status!=='已通过' || detail.confirmedAt) throw new Error('须为尚未最终确认的客户通过轮次');
    if (state.acceptances.filter((a)=>a.projectId===p.id&&a.type==='客户终验').sort((a,b)=>b.round-a.round)[0]?.id!==record.id) throw new Error('仅最近客户验收轮次可登记或确认，历史轮次保持只读');
    if (action.type==='save-acceptance-proof' ? !pm : actor.role!=='pmo') throw new Error('证明由主PM登记，最终确认由PMO办理');
    if (!action.proofFiles.length || action.proofFiles.some((f) => !/\.(pdf|docx|jpg|png)$/i.test(f))) throw new Error('必须登记客户签署验收报告/确认函（pdf/docx/jpg/png）');
    if (action.type==='confirm-acceptance' && (!detail.proofFiles.length || JSON.stringify(detail.proofFiles)!==JSON.stringify(action.proofFiles))) throw new Error('须由主PM先登记客户签署证明，PMO按已登记原件确认');
    detail.proofFiles=[...action.proofFiles];
    if (action.type==='confirm-acceptance') {if (!action.opinion.trim()) throw new Error('确认意见必填'); detail.confirmedAt=AS_OF_DATE;detail.confirmedBy=actor.name;p.subPhase='项目结算';history(detail,'PMO确认客户验收完成',action.opinion);
      // 验收通过联动：将未核销回款计划标记为待收款
      state.receiptPlans.filter((rp) => rp.projectId === p.id && rp.paidAmount < rp.amount && !rp.collectionStatus).forEach((rp) => {
        rp.collectionStatus = '待收款';
      });} else history(detail,'登记签署证明',action.proofFiles.join('、'));
    state.acceptanceDetails[record.id]=detail;
  } else if (action.type==='save-acceptance-report') {
    if (!pm) throw new Error('仅项目主PM可编制报验');
    const old=state.acceptanceReports.find((r) => r.id===action.id);
    if (action.id && (!old || old.projectId!==p.id || !['草稿','退回'].includes(old.status))) throw new Error('仅原草稿或退回报验可编辑');
    const r=action.report; const contract=state.contracts.find((c) => c.id===r.contractId&&c.projectId===p.id&&c.status!=='已终止');
    const acceptance=state.acceptances.find((a) => a.id===r.acceptanceId&&a.projectId===p.id&&a.type==='客户终验'&&a.status==='已通过');
    if (!contract || !acceptance || state.acceptanceDetails[acceptance.id]?.contractId!==contract.id) throw new Error('须关联本合同的客户通过验收原单');
    if (action.submit && r.reportType==='最终报验' && !state.acceptanceDetails[acceptance.id]?.confirmedAt) throw new Error('最终报验须先由PMO确认客户验收完成');
    if (!r.batchNo.trim() || state.acceptanceReports.some((x) => x.id!==old?.id&&x.contractId===r.contractId&&x.batchNo===r.batchNo)) throw new Error('报验批次号必填且合同内不能重复');
    if (!r.taxLines.length||r.taxLines.some((l) => ![0,1,3,6,9,13].includes(l.taxRate)||!Number.isFinite(l.amount)||l.amount<=0||money(l.amount)!==l.amount)||new Set(r.taxLines.map((l)=>l.taxRate)).size!==r.taxLines.length) throw new Error('每个税点仅一行，含税金额必须为正数且精确到分');
    if (reportAmount(r)+sumMoney(state.acceptanceReports.filter((x)=>x.id!==old?.id&&x.contractId===r.contractId&&['已确认','待确认'].includes(x.status)).map(reportAmount))>contract.amount) throw new Error('本次加已确认及待确认金额超过合同金额');
    if (action.submit && (!r.materials.length||r.materials.some((f)=>!f.trim()||!/\.(pdf|docx|xlsx|jpg|png)$/i.test(f))||!r.note.trim()||!/^\d{4}-\d{2}-\d{2}$/.test(r.date)||!Number.isFinite(Date.parse(r.date))||r.date>AS_OF_DATE)) throw new Error('提交须有有效报验日期、材料与说明');
    const next:AcceptanceReport={...structuredClone(r),id:old?.id??`RPT-${state.acceptanceReports.length+1}`,status:action.submit?'待确认':'草稿',submittedBy:actor.name};
    if (old) Object.assign(old,next); else state.acceptanceReports.push(next);
  } else {
    if (actor.role!=='finance'||!report||report.status!=='待确认'||!action.opinion.trim()) throw new Error('财务填写意见确认待处理报验');
    const contract=state.contracts.find((c)=>c.id===report.contractId)!;
    if (action.approve && confirmedReportedAmount(state,report.contractId)+reportAmount(report)>contract.amount) throw new Error('累计确认金额超过合同');
    report.status=action.approve?'已确认':'退回';report.confirmedBy=actor.name;report.opinion=action.opinion;
  }
  return p.id;
}
