import type { Actor, BusinessState } from './business';
import type { BusinessTodo } from '@/models/todos';
import type { InitiationRound } from '@/models/initiation';
import { canViewInitiation, INITIATION_SIGNATURES } from './initiation';
import { canManageOpportunity } from './opportunities';

const deadline = (date: string, days = 3) => new Date(Date.parse(date) + days * 86400000).toISOString().slice(0, 10);

/** Derives assignments and actual handling history; never writes workflow or configuration state. */
export function selectInitiationTodos(state: BusinessState, actor: Actor): BusinessTodo[] {
  const rows: BusinessTodo[] = [];
  for (const app of state.initiations) {
    if (!canViewInitiation(state, app, actor)) continue;
    const opportunity = state.opportunities.find(o => o.id === app.input.opportunityId);
    for (const [index, round] of app.rounds.entries()) {
      const latest = index === app.rounds.length - 1 && app.status === round.status;
      const route = `/initiation/${app.id}/decision`;
      const prefix = `${app.id}:r${round.revision}`;
      const base = {
        projectId: app.projectId,
        sourceType: 'initiation' as const,
        sourceId: app.id,
        sourceName: round.input.name,
        revision: round.revision,
        title: `${round.input.name} · 立项修订 ${round.revision}`,
        type: '立项评审',
        owner: actor.name,
        route,
      };
      const pending = (key: string, node: string, due: string, target = route, opinion?: string) => rows.push({
        ...base, id: `${prefix}:${key}`, node, due, route: target,
        status: '待办理', done: false, opinion,
      });
      const handled = (key: string, node: string, date: string, status: string, opinion: string) => rows.push({
        ...base, id: `${prefix}:${key}`, node: `${node}（日期为办理日）`,
        due: date, status, done: true, opinion,
      });

      if (latest && round.status === '待风险评估' && actor.role === 'pmo') {
        pending('risk', 'PMO综合风险评估', deadline(round.submittedAt), `/initiation/${app.id}/risk-assessment`);
      }
      if (latest && round.status === '待分级' && actor.role === 'pmo') {
        pending('grading', 'PMO项目分级', deadline(round.submittedAt));
      }
      for (const node of INITIATION_SIGNATURES) {
        if (node.role !== actor.role) continue;
        const signature = round.signatures.find(s => s.node === node.node);
        const key = `professional:${node.node}:${actor.role}`;
        if (signature?.by === actor.name && signature.role === actor.role) {
          handled(key, `${node.node}专业签署`, signature.date, signature.conclusion, signature.opinion);
        } else if (latest && round.status === '会签中' && !signature) {
          pending(key, `${node.node}专业签署`, deadline(round.submittedAt));
        }
      }

      const progress = round.approvalProgress;
      for (const review of progress?.reviews ?? []) {
        if (review.role !== actor.role || review.by !== actor.name) continue;
        const node = progress!.snapshot.nodes[review.node];
        handled(`formal:${review.node}:${review.role}`, node?.name ?? `正式决策节点 ${review.node + 1}`,
          review.date, review.approve ? '已同意' : '已否决', review.opinion);
      }
      if (latest && round.status === '待决策') {
        const negativeProfessional = round.path === '线上会签' && round.signatures.some(s => s.conclusion === '否决');
        if (negativeProfessional) {
          if (actor.role === 'pmo') pending('professional-return', '专业否决：PMO整改或否决处理', deadline(round.submittedAt));
        } else if (progress) {
          const node = progress.snapshot.nodes[progress.node];
          const reviewedRole = progress.reviews.some(r => r.node === progress.node && r.role === actor.role);
          if (progress.status === '待审批' && node?.roles.includes(actor.role) && !reviewedRole) {
            pending(`formal:${progress.node}:${actor.role}`, node.name, deadline(progress.enteredAt, node.timeoutDays));
          }
        } else if (actor.role === (round.path === 'PMC决策会' ? 'executive' : 'pmo')) {
          pending('legacy-decision', '历史路径正式决策', deadline(round.submittedAt));
        }
      }
      if (latest && round.status === '整改' && opportunity && canManageOpportunity(state, opportunity, actor)) {
        const due = round.decision?.rectifications.map(r => r.deadline).sort()[0] ?? deadline(round.submittedAt);
        pending('rectification', '主办角色补充整改并重新提交', due, `/initiation/apply?id=${app.id}`, round.decision?.opinion);
      }
      if (latest && round.status === '暂缓' && actor.role === 'pmo' && round.decision?.resumeDate) {
        pending('resume', 'PMO暂缓复评恢复', round.decision.resumeDate, route, round.decision.opinion);
      }
      if (round.decision?.by === actor.name && actor.role === (round.path === 'PMC决策会' ? 'executive' : 'pmo') && !decisionRecordedByNode(round, actor)) {
        handled('decision', `立项${round.decision.result}决定`, round.decision.date,
          round.decision.result, round.decision.opinion);
      }
    }
  }
  return rows;
}

function decisionRecordedByNode(round: InitiationRound, actor: Actor) {
  const decision = round.decision;
  return !!decision && ['通过', '否决'].includes(decision.result) &&
    !!round.approvalProgress?.reviews.some(r => r.role === actor.role && r.by === actor.name &&
      r.date === decision.date && r.opinion === decision.opinion && r.approve === (decision.result === '通过'));
}
