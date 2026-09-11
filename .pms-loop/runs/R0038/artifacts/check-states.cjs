const {chromium,expect}=require('@playwright/test');
const fs=require('node:fs');
(async()=>{const b=await chromium.launch({executablePath:'/usr/bin/chromium'});const p=await b.newPage();const errors=[];const observations=[];p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')errors.push(m.text());});const nav=async url=>p.evaluate(url=>{history.pushState({},'',url);dispatchEvent(new PopStateEvent('popstate'));},url);try{
await p.goto('http://127.0.0.1:5174/projects/P-PLAN-001/wbs');await expect(p.getByRole('heading',{name:'WBS计划编制',exact:true})).toBeVisible();
for(const [path,title] of [['wbs','WBS计划编制'],['milestones','里程碑计划'],['plan-review','计划评审']]){
 await nav('/projects/P-PLAN-001/'+path);await expect(p.getByRole('heading',{name:title,exact:true})).toBeVisible();await nav('/projects/P-NOT-FOUND/'+path);await expect(p.locator('.ant-result-404')).toBeVisible();observations.push({path,result:'未知项目404'});
}
await p.locator('.ant-select[aria-label="模拟身份"] .ant-select-selector').click();await p.locator('.ant-select-dropdown:visible .ant-select-item-option').filter({hasText:'客户经理'}).click();await expect(p.getByRole('heading',{name:'商机台账',exact:true})).toBeVisible();
for(const path of ['wbs','milestones','plan-review']){await nav('/opportunities');await expect(p.getByRole('heading',{name:'商机台账',exact:true})).toBeVisible();await nav('/projects/P-001/'+path);await expect(p.locator('.ant-result-403')).toBeVisible();observations.push({path,result:'客户经理访问403'});}
expect(errors).toEqual([]);fs.writeFileSync('.pms-loop/runs/R0038/artifacts/states.json',JSON.stringify({status:'passed',observations,consoleErrors:errors},null,2));console.log(JSON.stringify(observations));
}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
