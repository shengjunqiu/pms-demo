import json
from pathlib import Path
r=Path('.pms-loop/runs/R0037'); a=r/'artifacts'
e=json.loads((r/'evidence.json').read_text()); plan=json.loads((r/'plan.json').read_text())
e['revision']=json.loads((r/'checks.json').read_text())['revision']
observations={
'WK-01':{
 'traceability':'对照页面原文第103行起（§4.1）与任务书第387行起（§11.1）；保留项目范围、待办、里程碑、成本及事项聚合，调整首屏顺序。',
 'navigation':'从去办理到原问题详情；采购申请到P-001采购；更多发起/提问题带kind=issue及projectId=P-001；项目编号打开实际项目名称标题。',
 'content':'默认10个项目、54项待办、1项超期；待办显示真实中文事项、负责人和到期日期2026-09-01。项目表保留金额、进度、四类事项和验收回款摘要。',
 'interaction':'我参与为0项目，采购按钮禁用；返回我负责恢复10；更多发起显示9项，动作进入原办理页。',
 'data':'P-001项目金额5538.30万元；问题2、风险2、BUG7、需求18，各数字下钻携带一致项目和类别。',
 'states':'实际切换我参与验证空范围与禁用快捷动作；财务身份直接访问显示403（ui-chain.json）。页面读取同步本地聚合，无独立网络加载过程。',
 'visual':'最终check之后重截并逐张查看WK01-1440/1280：待办位于y390，快捷发起和临期里程碑首屏可见；项目表在下方独立滚动，无页面横向溢出。',
 'console':'最终六项UI浏览器场景consoleErrors均为空；工作台1440/1280既有回归通过，无页面异常。',
 'business-1':'我负责/我参与、12个快捷入口（3常显+9菜单）、待办及进度成本风险验收回款聚合保留；快捷操作跳转原业务页。',
 'business-2':'自动化逐次点击P-001四类数字，验证2/2/7/18及目标URL；项目金额5538.30、项目名称与详情一致。'},
'GL-01':{
 'traceability':'对照页面原文第161行起（§4.22）与任务书第470行起（§11.3），保留规模经营回款、四阶段、健康分析、异常与待决策，下调次要说明区。',
 'navigation':'高风险筛选KPI键盘Enter进入health=red清单，返回仍保留健康度；完整P-003→总览→核算→原凭证链路见ui-chain.json。',
 'content':'默认范围66项目，8项经营KPI；33个异常预览前3项、19个待决策预览前2项；更新时间和万元单位明确，无固定运行正常误导标签。',
 'interaction':'展开更多筛选后输入无匹配名称显示空态，折叠显示1项已选，重置恢复；口径/常用视图可展开，保存视图按钮可达；原审批进入APR-1。',
 'data':'高风险KPI数量与同筛选项目清单一致，health=red保持到P-003核算；凭证VOUCHER-P-003-1关联P-003，返回仍携带筛选。',
 'states':'逐一实际切换正常、延迟、无数据、无权限、计算中、口径变更，验证对应说明/403/加载状态；额外财务身份访问403。',
 'visual':'最终check之后逐张查看GL01-1440/1280：8张指标等高，异常与决策位于y540且主要内容首屏可见；1280长项目名自然换行，无页面横向溢出。',
 'console':'最终UI测试和补充完整链路均无consoleErrors；六种状态及原审批进入过程未出现页面异常。',
 'business-1':'保留8项主要KPI及补充财务汇总、四阶段数量金额、健康度、分析Tabs；首屏展示异常原因与决策金额影响，查看原审批到APR-1。',
 'business-2':'通过高风险KPI→相同数量清单→P-003→项目总览→动态核算→凭证的真实浏览器链路；六种状态、更新时间、口径展开和筛选返回均验证。'},
'HS-01':{
 'traceability':'对照页面原文第131行起（§4.11）与任务书第430行起（§11.2），15个原页签全部保留，统一项目基础信息、生命周期与业务摘要。',
 'navigation':'逐个切换5组中的全部15个原页签；旧tab=receipts正确选中验收与回款/回款；切换P-006保留页签；BUG点击带tab=requirements&kind=BUG，浏览器返回恢复总览。',
 'content':'标题显示福建省晋江市岸海防综合治理平台；预算2847.70、滚动2986.20、偏差+138.50万元，状态关注及成本超预算原因；基础字段、生命周期、里程碑均可见。',
 'interaction':'更多项目信息展开，OPP-2026-001打开来源抽屉并显示P-001关联；有效预算可通过键盘Enter进入P-001动态核算。',
 'data':'P-001预算/滚动/偏差在总览和核算一致；BUG页签类别一致；集团领导P-003总览及凭证均保持P-003和健康度筛选。',
 'states':'未知P-NOT-FOUND显示项目不存在；集团领导P-003显示管理视角只读，高风险标签具备红色样式；各页签数据/空内容均使用原有业务面板。同步数据无新增加载状态。',
 'visual':'最终check之后逐张查看HS01-1440/1280：项目名称标题、基础信息、生命周期、五组页签及经营摘要层次明确，金额完整可读，页签无横向挤出。',
 'console':'最终6项UI测试覆盖页签、来源抽屉、切换项目、未知项目和管理身份，consoleErrors均为空；补充P-003凭证链路无错误。',
 'business-1':'统一项目头、生命周期、关键里程碑、经营摘要和动态仍可见；进度/质量/交付物/四算/成本/采购外包/变更/日报周报/问题风险/需求BUG/验收结算/回款等15页签全部逐个打开。',
 'business-2':'BUG摘要到对应类别，预算摘要到本项目核算，来源商机抽屉关联本项目；验收回款旧深链与项目切换保持上下文；集团领导只读标识和P-003原凭证链路均核对。'}
}
for item in plan['items']:
 k=item['id']; v=e['items'][k]; v['entry']=item['route'].replace(':id','P-001');v['covered_features']=item['feature_ids']
 for key,obs in observations[k].items():v['checks'][key].update(passed=True,observation=obs)
 v['scenarios']=[{'action':'以真实浏览器操作重组后的页面入口、筛选及下钻，并检查两种桌面宽度截图','expected':'业务实体、数量金额、角色限制及旧链接保持一致；首屏突出主要任务','observed':observations[k]['interaction']+' '+observations[k]['data']+' '+observations[k]['visual']}]
 v['artifacts']=[str(r/'browser-ui-final.log'),str(a/'ui-chain.json'),str(a/'UI_REVIEW.md')]+[str(p) for p in sorted(a.glob('ui-*.json'))]
 stem=k.replace('-','');v['screenshots']={str(w):str(a/f'{stem}-{w}.png') for w in (1440,1280)}
(r/'evidence.json').write_text(json.dumps(e,ensure_ascii=False,indent=2)+'\n')
p=a/'UI_REVIEW.md';s=p.read_text();s=s[:s.index('工程和浏览器结果')]+'''## 验证结果

- typecheck、lint、build 通过；32个领域测试文件、235个测试通过。
- 全部51个浏览器场景分批回归通过；最终工程检查后重新执行6项UI测试，全部通过。
- 最终1440×900、1280×900六张主要截图均已逐张查看，未见页面横向溢出或明显破版。
- 补充验证财务身份对工作台/驾驶舱的403，以及高风险指标→清单→P-003→总览→核算→原始凭证，筛选与实体一致。
- 控制台错误收集为空。构建保留原有大包体积提示，性能拆包不属于本轮UI优化。

工程记录见 `../checks.json`；最终UI回归见 `../browser-ui-final.log`；详细观察见 `../evidence.json` 和 `ui-chain.json`。全套回归分批日志保留于本轮目录，早期失败及修正过程也保留，未覆盖历史证据。

本轮正式验收范围仅为WK-01、GL-01、HS-01；全项目FINAL仍待单独验收。
''';p.write_text(s)
