import { expect, test, type Page } from '@playwright/test';
import { navigate, role } from './helpers';
import { capturePageEvidence, collectBrowserErrors, prepareArtifacts, writeBrowserReport } from './evidence';
type BusinessModule = typeof import('../src/mock/business');
const errors=new WeakMap<Page,string[]>();
test.beforeEach(({page})=>{prepareArtifacts();errors.set(page,collectBrowserErrors(page));});
test.afterEach(({page},info)=>{const consoleErrors=errors.get(page)??[];writeBrowserReport(info,{url:page.url(),consoleErrors});expect(consoleErrors).toEqual([]);});
async function state(page:Page){return page.evaluate(async()=>{const path='/src/mock/business.ts';const b=await import(/* @vite-ignore */ path) as BusinessModule;return b.useBusinessStore.getState().data;});}
async function review(page:Page,approve:boolean,note:string){await page.getByLabel('审批意见',{exact:true}).fill(note);await page.getByRole('button',{name:approve?'通过申请':'驳回申请',exact:true}).click();await page.getByRole('dialog').getByRole('button',{name:/确\s*定/}).click();}

test('待办 UI：35天计划会签、原单返回和本人已办',async({page})=>{
 test.setTimeout(120_000);
 await page.goto('/projects/P-001/progress');await role(page,'项目经理');
 const before=await state(page);await navigate(page,'/projects/P-001/plan-requests/new?kind=schedule');
 await page.getByLabel('顺延天数',{exact:true}).fill('35');await page.getByLabel('申请理由',{exact:true}).fill('客户接口延期，评估35天资源占用');
 await page.getByRole('button',{name:'提交PMO审批',exact:true}).click();
 const submitted=(await state(page)).planRequests.at(-1)!;const original=`/projects/P-001/plan-requests/${submitted.id}`;
 await expect(page).toHaveURL(original);
 await role(page,'PMO负责人');await navigate(page,`/workbench/todos?project=P-001&search=${submitted.id}`);
 const row=page.locator('.ant-table-tbody tr.ant-table-row');await expect(row).toHaveCount(1);
 await capturePageEvidence(page,'UI-WK02');
 await row.getByRole('button',{name:'进入原业务',exact:true}).click();await expect(page).toHaveURL(original);
 await capturePageEvidence(page,'UI-plan-request');
 await review(page,true,'PMO确认计划影响');await expect(page.getByText('PMO：PMO确认计划影响',{exact:true})).toBeVisible();
 expect((await state(page)).planRequests.find(r=>r.id===submitted.id)?.status).toBe('待审批');
 await page.getByRole('button',{name:'返回来源',exact:true}).click();await expect(page).toHaveURL(`/workbench/todos?project=P-001&search=${submitted.id}`);
 await page.getByRole('tab',{name:/已办/}).click();await expect(row).toContainText('PMO确认计划影响');
 await role(page,'财务专员');await navigate(page,original);await review(page,true,'财务确认资源影响');
 await expect(page.getByText('财务：财务确认资源影响',{exact:true})).toBeVisible();
 const after=await state(page);expect(after.planRequests.find(r=>r.id===submitted.id)?.status).toBe('通过');expect(after.projects.find(p=>p.id==='P-001')?.plannedEndDate).toBe('2027-02-04');expect(after.tasks.filter(t=>t.progress===100)).toEqual(before.tasks.filter(t=>t.progress===100));expect(after.projects.find(p=>p.id==='P-001')?.budgetAmount).toBe(before.projects.find(p=>p.id==='P-001')?.budgetAmount);
});

test('进度 UI：task定位、执行更新与只读',async({page})=>{
 test.setTimeout(90_000);await page.goto('/projects/P-001/progress');await role(page,'项目经理');
 const before=await state(page);const task=before.tasks.find(t=>t.projectId==='P-001'&&t.progress===0)!;
 await navigate(page,`/projects/P-001/progress?task=${task.id}`);
 const row=page.locator(`tr[data-row-key="${task.id}"]`);await expect(row).toHaveClass(/ant-table-row-selected/);
 await capturePageEvidence(page,'UI-HS02');await row.getByRole('button',{name:'更新执行',exact:true}).click();
 let dialog=page.getByRole('dialog');await dialog.getByLabel('任务完成率',{exact:true}).fill('50');await dialog.getByLabel('实际开始日期',{exact:true}).fill('2026-09-08');await dialog.getByLabel('执行说明',{exact:true}).fill('联调完成一半');await dialog.getByRole('button',{name:/确\s*定/}).click();await expect(dialog).toBeHidden();
 const after=await state(page);expect(after.projects.find(p=>p.id==='P-001')?.progressRate).toBe(68.75);expect(after.baselines).toEqual(before.baselines);expect(after.tasks.find(t=>t.id===task.id)?.startDate).toBe(task.startDate);
 await row.getByRole('button',{name:'更新执行',exact:true}).click();dialog=page.getByRole('dialog');await dialog.getByLabel('任务完成率',{exact:true}).fill('100');await dialog.getByRole('button',{name:/确\s*定/}).click();await expect(dialog).toBeVisible();expect((await state(page)).tasks.find(t=>t.id===task.id)?.progress).toBe(50);await dialog.getByRole('button',{name:/取\s*消/}).click();
 await role(page,'财务专员');await navigate(page,`/projects/P-001/progress?task=${task.id}`);await expect(row.getByRole('button',{name:'更新执行',exact:true})).toBeDisabled();await navigate(page,'/projects/NOT-FOUND/progress');await expect(page.getByText('404 页面未找到',{exact:true})).toBeVisible();
});

test('阶段 UI：阻断审批与驳回历史，新申请清空输入',async({page})=>{
 test.setTimeout(90_000);await page.goto('/projects/P-001/stage-switch');await role(page,'项目经理');await navigate(page,'/projects/P-001/stage-switch');
 await page.getByLabel('申请理由',{exact:true}).fill('申请阶段核验，记录当前缺项');await page.getByRole('button',{name:'提交PMO审批',exact:true}).click();
 const request=(await state(page)).planRequests.at(-1)!;
 await role(page,'PMO负责人');await navigate(page,`/projects/P-001/stage-switch?request=${request.id}`);
 await expect(page.getByRole('cell',{name:'阻断',exact:true}).first()).toBeVisible();await capturePageEvidence(page,'UI-HS16');
 await review(page,true,'核验当前条件');await expect(page.getByRole('dialog')).toBeVisible();expect((await state(page)).planRequests.find(r=>r.id===request.id)?.status).toBe('待审批');await page.getByRole('dialog').getByRole('button',{name:/取\s*消/}).click();
 await review(page,false,'缺项退回补齐');await expect(page.getByRole('dialog')).toBeHidden();expect((await state(page)).projects.find(p=>p.id==='P-001')?.phase).toBe('执行');
 await role(page,'项目经理');await navigate(page,`/projects/P-001/stage-switch?request=${request.id}`);await expect(page.getByText('缺项退回补齐',{exact:true}).first()).toBeVisible();await page.getByRole('button',{name:'新建阶段申请',exact:true}).click();await expect(page.getByLabel('申请理由',{exact:true})).toHaveValue('');
});

test('阶段 UI：就绪前置后真实提交批准，历史使用批准快照',async({page})=>{
 test.setTimeout(90_000);await page.goto('/projects/P-001/stage-switch');
 // Domain stage tests cover these prerequisites; only setup facts are prepared.
 // The request and approval below are real UI operations.
 await page.evaluate(async()=>{const path='/src/mock/business.ts';const b=await import(/* @vite-ignore */ path) as BusinessModule;const data=b.createBusinessState();data.projects.find(p=>p.id==='P-001')!.progressRate=100;data.tasks.filter(t=>t.projectId==='P-001').forEach(t=>{t.progress=100;});data.materials.filter(m=>m.projectId==='P-001').forEach(m=>{m.status='通过';});b.useBusinessStore.setState({data});});
 await role(page,'项目经理');await navigate(page,'/projects/P-001/stage-switch');const before=await state(page);
 await page.getByLabel('申请理由',{exact:true}).fill('全部交付已核验，申请进入终验准备');await page.getByRole('button',{name:'提交PMO审批',exact:true}).click();const request=(await state(page)).planRequests.at(-1)!;
 await role(page,'PMO负责人');await navigate(page,`/projects/P-001/stage-switch?request=${request.id}`);await review(page,true,'PMO复核全部条件');await expect(page.getByRole('dialog')).toBeHidden();
 const after=await state(page);expect(after.projects.find(p=>p.id==='P-001')).toMatchObject({phase:'收尾',subPhase:'客户终验',releasedBudgetPercent:request.stageSnapshot!.releasePercent});expect(after.budgets).toEqual(before.budgets);expect(after.baselines).toEqual(before.baselines);expect(after.acceptances).toEqual(before.acceptances);
 await expect(page.getByRole('cell',{name:'阻断',exact:true})).toHaveCount(0);await capturePageEvidence(page,'UI-HS16-approved');
});


test('进度 UI：跨项目导航关闭旧任务草稿',async({page})=>{
 await page.goto('/projects/P-001/progress');await role(page,'项目经理');
 await expect(page.getByText('当前阶段 执行 / 开发实施',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'更新执行',exact:true}).first().click();
 await page.getByRole('dialog').getByLabel('执行说明',{exact:true}).fill('未提交的上一项目草稿');
 await navigate(page,'/projects/P-002/progress');await expect(page.getByRole('dialog')).toBeHidden();
 await navigate(page,'/projects/P-001/progress');await page.getByRole('button',{name:'更新执行',exact:true}).first().click();
 await expect(page.getByRole('dialog').getByLabel('执行说明',{exact:true})).not.toHaveValue('未提交的上一项目草稿');
});
