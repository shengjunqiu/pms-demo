const { chromium, expect } = require(process.cwd() + '/node_modules/@playwright/test');
const fs = require('node:fs');
const out = '.pms-loop/runs/R0042/artifacts';
(async () => {
 const browser = await chromium.launch({ executablePath: '/usr/bin/chromium' });
 const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
 const errors = []; page.on('pageerror', e => errors.push(String(e))); page.on('console', m => { if(m.type() === 'error') errors.push(m.text()); });
 const go = async path => { await page.evaluate(path => { history.pushState({}, '', path); dispatchEvent(new PopStateEvent('popstate')); }, path); await expect(page).toHaveURL('http://127.0.0.1:5174'+path); };
 const role = async name => { await page.locator('.ant-select[aria-label="模拟身份"] .ant-select-selector').click(); await page.locator('.ant-select-dropdown:visible .ant-select-item-option').filter({hasText:name}).click(); await expect(page.locator('.ant-select[aria-label="模拟身份"]')).toContainText(name); await page.getByRole('heading').first().click(); await expect(page.locator('.ant-select-dropdown:visible')).toHaveCount(0); };
 const confirm = async () => { const d=page.getByRole('dialog'); await d.getByRole('button',{name:/^确\s*定$/}).click(); await expect(d).toBeHidden(); };
 try {
  await page.goto('http://127.0.0.1:5174/projects/P-PLAN-001/team');
  await expect(page.getByRole('heading',{name:'项目团队',exact:true})).toBeVisible();
  const historical = await page.evaluate(async () => { const b=await import('/src/mock/business.ts'); const d=b.useBusinessStore.getState().data; return JSON.stringify({tasks:d.tasks,costs:d.costs}); });
  for(const accept of [false,true]) {
   await role('PMO负责人'); await go('/projects/P-PLAN-001/team');
   await page.getByRole('button',{name:'推荐与任命主PM',exact:true}).click();
   await page.getByLabel('任命原因',{exact:true}).fill('核实项目职责与资源安排后确认任命'); await confirm();
   await role('项目经理'); await go('/projects/P-PLAN-001/team');
   await page.getByRole('button',{name:accept?/^接\s*受$/:/^拒\s*绝$/}).click();
   await page.getByLabel('任命接收说明',{exact:true}).fill(accept?'确认承担本项目主PM职责':'本轮交接资料待补，退回后重新任命'); await confirm();
   await expect(page.getByRole('row').filter({hasText:accept?'确认承担本项目主PM职责':'本轮交接资料待补，退回后重新任命'})).toContainText(accept?'已接受':'已拒绝');
  }
  const member = page.getByRole('row').filter({hasText:'U-005'});
  await member.getByRole('button',{name:/^退\s*出$/}).click();
  await page.getByRole('dialog').getByPlaceholder('退出原因').fill('本阶段协同工作结束，保留历史责任记录'); await confirm();
  await expect(member).toContainText('已退出，当前权限收回');
  const after = await page.evaluate(async () => { const b=await import('/src/mock/business.ts'); const d=b.useBusinessStore.getState().data; return {historical:JSON.stringify({tasks:d.tasks,costs:d.costs}),team:d.projectTeams['P-PLAN-001'],pm:d.projects.find(p=>p.id==='P-PLAN-001').pmId}; });
  expect(after.historical).toBe(historical); expect(after.pm).toBe('U-001');
  await expect(page.locator('.ant-message-notice')).toHaveCount(0);
  await page.screenshot({path:out+'/YS05-appointment-exit.png',fullPage:true});
  const paths=['team','budget','estimate-budget','budget/review','baseline'];
  for(const path of paths) { await go('/projects/UNKNOWN/'+path); await expect(page.getByText('404 页面未找到',{exact:true})).toBeVisible(); }
  await role('客户经理');
  for(const path of paths) { await go('/opportunities'); await expect(page.getByRole('heading',{name:'商机台账',exact:true})).toBeVisible(); await go('/projects/P-PLAN-001/'+path); await expect(page.getByText('403 无访问权限',{exact:true})).toBeVisible(); }
  expect(errors).toEqual([]);
  fs.writeFileSync(out+'/team-states.json',JSON.stringify({status:'passed',appointments:after.team.appointments,member:after.team.members.find(m=>m.userId==='U-005'),historyUnchanged:true,states:paths,errors},null,2));
 } finally { await browser.close(); }
})().catch(e=>{console.error(e);process.exitCode=1;});
