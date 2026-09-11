const { chromium, expect } = require('@playwright/test');
const fs = require('node:fs');
(async () => {
 const browser = await chromium.launch({executablePath:'/usr/bin/chromium'});
 const page = await browser.newPage({viewport:{width:1280,height:900}});
 const errors=[]; const observations=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('console',m=>{if(m.type()==='error') errors.push(m.text());});
 const nav=async path=>{await page.evaluate(url=>{history.pushState({},'',url);dispatchEvent(new PopStateEvent('popstate'));},path);};
 const select=async (label,name)=>{await page.locator(`.ant-select[aria-label="${label}"] .ant-select-selector`).click();await page.locator('.ant-select-dropdown:visible .ant-select-item-option').filter({hasText:name}).click();};
 try {
 await page.goto('http://127.0.0.1:5174/workbench/project-manager');
 await expect(page.getByRole('heading',{name:'项目经理工作台',exact:true})).toBeVisible();
 await select('模拟身份','财务专员');
 await expect(page.getByRole('heading',{name:'四算经营专题',exact:true})).toBeVisible();
 for(const path of ['/workbench/project-manager','/executive/dashboard']){
  await nav(path); await expect(page.locator('.ant-result-403')).toBeVisible();
  observations.push({path,result:'财务专员访问显示403'});
 }
 await select('模拟身份','集团领导');
 await expect(page.getByRole('heading',{name:'项目经营驾驶舱',exact:true})).toBeVisible();
 await select('健康度','高风险');
 await expect(page.locator('.ant-select[aria-label="健康度"]')).toContainText('高风险');
 await expect(page.locator('.pms-metric').first().locator('.pms-metric-value')).not.toHaveText('66');
 const count=await page.locator('.pms-metric').first().locator('.pms-metric-value').innerText();
 await page.getByRole('button',{name:/在管项目/}).click();
 await expect(page.getByRole('heading',{name:'项目穿透分析',exact:true})).toBeVisible();
 await expect(page.locator('.pms-metric').first()).toContainText(count);
 await page.locator('.ant-table-row[data-row-key="P-003"]').getByRole('button').first().click();
 await expect(page.getByRole('button',{name:'进入项目总览',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'进入项目总览',exact:true}).click();
 await expect(page.locator('.pms-page-header')).toContainText('P-003');
 await expect(page.locator('.pms-page-header')).toContainText('管理视角：只读');
 expect(page.url()).toContain('health=red');
 await page.getByRole('button',{name:/有效预算/}).click();
 await expect(page.getByRole('heading',{name:'动态核算',exact:true})).toBeVisible();
 expect(page.url()).toContain('/projects/P-003/dynamic-accounting');
 expect(page.url()).toContain('health=red');
 await page.getByRole('button',{name:'VOUCHER-P-003-1',exact:true}).click();
 await expect(page.getByRole('dialog')).toContainText('P-003');
 await page.screenshot({path:'.pms-loop/runs/R0037/artifacts/GL01-chain-source-1280.png',animations:'disabled'});
 observations.push({count,url:page.url(),result:'高风险KPI→同数量清单→P-003→总览→核算→原始凭证，保持health=red，凭证关联P-003'});
 await page.locator('.ant-drawer-close').click();
 await page.getByRole('button',{name:/返回上一级/}).click();
 await expect(page.locator('.pms-page-header')).toContainText('P-003');
 expect(page.url()).toContain('health=red');
 expect(errors).toEqual([]);
 fs.writeFileSync('.pms-loop/runs/R0037/artifacts/ui-chain.json',JSON.stringify({status:'passed',observations,consoleErrors:errors},null,2));
 console.log(JSON.stringify(observations));
 } finally { await browser.close(); }
})().catch(e=>{console.error(e);process.exitCode=1;});
