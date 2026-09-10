import { AS_OF_DATE } from '@/mock';
import type { Actor, BusinessState, Material } from '@/mock/business';
import { applyTicketAction } from '@/mock/tickets';
export interface DocumentVersion { version: number; filename: string; uploader: string; uploadedAt: string; note: string; status: '待提交' | '待审核' | '通过' | '驳回'; reviewer?: string; opinion?: string }
export interface DocumentDetails { phase?: string; dueDate?: string; templateVersion?: string; versions?: DocumentVersion[]; archived?: boolean; archivedAt?: string }
export interface QualityPlan { target: string; checkpoints: string; standard: string; checks: { date: string; actor: string; passed: boolean; note: string; issueId?: string }[] }
export const qualityPlan = (state: BusinessState, projectId: string): QualityPlan => state.qualityPlans[projectId] ?? { target: '关键功能可用、交付文档完整、重大缺陷清零', checkpoints: '功能、性能、安全及文档完整性', standard: '必交材料齐全，检查通过，重大质量整改关闭', checks: [] };
export const documentPhase = (m: Material) => m.phase ?? (m.name === '测试报告' ? '开发实施' : m.name === '实施计划' ? '项目启动' : '客户终验');
export type DeliverableAction = { type: 'document-action'; id: string; operation: 'upload' | 'submit' | 'approve' | 'reject' | 'archive'; filename?: string; note: string }
 | { type: 'add-document'; projectId: string; name: string; phase: string; dueDate: string }
 | { type: 'quality-plan'; projectId: string; target: string; checkpoints: string; standard: string }
 | { type: 'quality-check'; projectId: string; passed: boolean; note: string }
 | { type: 'complete-milestone'; id: string; actualDate: string; note: string };
export function applyDeliverableAction(state: BusinessState, action: DeliverableAction, actor: Actor) {
  const material = action.type === 'document-action' ? state.materials.find((m) => m.id === action.id) : undefined;
  const milestone = action.type === 'complete-milestone' ? state.milestones.find((m) => m.id === action.id) : undefined;
  const projectId = action.type === 'document-action' ? material?.projectId : action.type === 'complete-milestone' ? milestone?.projectId : action.projectId;
  const p = state.projects.find((p) => p.id === projectId); if (!p) throw new Error('项目或原对象不存在');
  const pm = actor.role === 'project-manager' && actor.id === p.pmId; const pmo = actor.role === 'pmo';
  const locked = state.lockedProjects.includes(p.id) || p.phase === '已关闭';
  if (action.type !== 'document-action' && locked) throw new Error('项目已关闭，不能修改建设期记录');
  if (action.type === 'quality-plan') {
    if (!pm || !action.target.trim() || !action.checkpoints.trim() || !action.standard.trim()) throw new Error('仅主PM可维护完整质量计划');
    const prior = qualityPlan(state, p.id); state.qualityPlans[p.id] = { target: action.target.trim(), checkpoints: action.checkpoints.trim(), standard: action.standard.trim(), checks: [...prior.checks] };
  } else if (action.type === 'quality-check') {
    if (!pm || !action.note.trim()) throw new Error('主PM填写检查结论后提交');
    const plan = qualityPlan(state, p.id); state.qualityPlans[p.id] = plan;
    if (action.passed && plan.checks.some((c) => c.issueId && state.issues.find((i) => i.id === c.issueId)?.status !== '已关闭')) throw new Error('质量整改尚未最终关闭，请先完成问题闭环');
    let issueId: string | undefined;
    if (!action.passed) { issueId = `ISSUE-NEW-${state.issues.length + 1}`; applyTicketAction(state, { type: 'create-ticket', kind: 'issue', projectId: p.id, title: `质量检查整改：${action.note.slice(0, 36)}`, description: action.note, category: '质量整改', rank: '重大', ownerId: p.pmId, deadline: new Date(Date.parse(AS_OF_DATE) + 7 * 86400000).toISOString().slice(0, 10) }, actor); }
    plan.checks.push({ date: AS_OF_DATE, actor: actor.name, passed: action.passed, note: action.note, issueId });
  } else if (action.type === 'add-document') {
    if (!pmo || !action.name.trim() || !action.phase.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(action.dueDate)) throw new Error('PMO填写文档名称、阶段和时点后追加');
    if (state.materials.some((m) => m.projectId === p.id && m.name === action.name.trim())) throw new Error('同名文档已存在，请上传新版本');
    state.materials.push({ id: `MAT-NEW-${state.materials.length + 1}`, projectId: p.id, name: action.name.trim(), required: true, status: '缺失', phase: action.phase.trim(), dueDate: action.dueDate, templateVersion: '项目补充项', versions: [] });
  } else if (action.type === 'complete-milestone') {
    if (!pm || !milestone || milestone.status === '已达成') throw new Error('仅主PM可确认未达成里程碑');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(action.actualDate) || !Number.isFinite(Date.parse(action.actualDate)) || action.actualDate > AS_OF_DATE || !action.note.trim()) throw new Error('实际完成日期及说明必填，不能晚于基准日');
    const missing = milestone.requiredDeliverables.filter((name) => !state.materials.some((m) => m.projectId === p.id && m.name === name && m.status === '通过'));
    if (missing.length) throw new Error(`必交材料缺失或未通过：${missing.join('、')}`);
    if (state.issues.some((i) => i.projectId === p.id && i.severity === '重大' && i.status !== '已关闭')) throw new Error('未关闭重大问题阻断里程碑');
    const lastActual = state.milestones.filter((m) => m.projectId === p.id && m.status === '已达成' && m.actualDate).map((m) => m.actualDate!).sort().at(-1);
    if (lastActual && action.actualDate < lastActual) throw new Error('实际日期不能早于前序里程碑');
    const previous = state.milestones.filter((m) => m.projectId === p.id).find((m) => m.status !== '已达成');
    if (previous?.id !== milestone.id) throw new Error('必须按里程碑顺序确认');
    if (milestone.type === '客户终验' && state.acceptances.filter((a) => a.projectId === p.id && a.type === '客户终验').sort((a, b) => b.round - a.round)[0]?.status !== '已通过') throw new Error('客户终验须有验收通过记录');
    if (milestone.type === '项目结算') throw new Error('项目结算必须通过结算审批');
    milestone.actualDate = action.actualDate; milestone.status = '已达成'; milestone.completionNote = action.note;
  } else {
    const m = material!; if (!action.note.trim()) throw new Error('文档办理说明必填');
    if (m.archived) throw new Error('文档已归档，版本不可修改');
    if (action.operation === 'archive') {
      if (!pmo || !['收尾', '已关闭'].includes(p.phase) || m.status !== '通过') throw new Error('仅PMO可将收尾阶段审核通过文档归档');
      m.archived = true; m.archivedAt = AS_OF_DATE;
    } else {
      if (locked) throw new Error('建设期已锁定');
      m.versions ??= []; const current = m.versions.at(-1);
      if (action.operation === 'upload') {
        if (!pm || !action.filename?.trim() || !/\.(pdf|docx|xlsx|zip)$/i.test(action.filename)) throw new Error('主PM登记pdf/docx/xlsx/zip文件名；仅模拟，不传输文件');
        if (m.status === '待审核') throw new Error('待审核版本不能被覆盖');
        m.versions.push({ version: m.versions.length + 1, filename: action.filename.trim(), uploader: actor.name, uploadedAt: AS_OF_DATE, note: action.note, status: '待提交' }); m.status = '待提交';
      } else if (action.operation === 'submit') {
        if (!pm || !current || m.status !== '待提交') throw new Error('须先上传待提交版本');
        const checks = qualityPlan(state, p.id).checks;
        if (!checks.at(-1)?.passed || checks.some((c) => c.issueId && state.issues.find((i) => i.id === c.issueId)?.status !== '已关闭')) throw new Error('强制质量检查未通过或整改未关闭');
        current.status = '待审核'; m.status = '待审核';
      } else {
        if (!pmo || !current || m.status !== '待审核') throw new Error('仅PMO可审核当前待审核版本');
        current.status = action.operation === 'approve' ? '通过' : '驳回'; current.reviewer = actor.name; current.opinion = action.note; m.status = current.status;
      }
    }
  }
  return p.id;
}
