from pathlib import Path
import json
r=Path('.pms-loop/runs/R0038');a=r/'artifacts';e=json.loads((r/'evidence.json').read_text());plan=json.loads((r/'plan.json').read_text());e['revision']=json.loads((r/'checks.json').read_text())['revision']
obs={
'YS-06':dict(content='P-PLAN-001福建园区设备运维协同平台，主PM张建国、批准周期2026-09-09至12-31；范围、工作包、责任人、计划日期、160小时、前置任务及甘特保留。',interaction='保存范围后修订增加；编辑原任务说明保留日期依赖。Excel导入错误日期/自依赖时替换按钮禁用；载入合法样例后出现1平台交付。',data='范围与计划修订在里程碑、计划评审中一致；PMO整改后重提形成第2轮，通过预算审批并确认基线后WBS新增按钮禁用。',b1='工作包树、计划日期/责任人/工时/依赖与局部横滚甘特均呈现；合法Excel样例替换后真实显示1平台交付。',b2='错误导入包含结束早于开始和自身前置任务，被禁用替换；已生效P-001及新确认基线项目不能直接编辑，进入变更携带项目。'),
'YS-07':dict(content='左侧交付时间线，右侧5个关键节点、责任人、计划/实际、达成条件和必交材料；尚未签合同说明、到期未达成红色原因保留。',interaction='统一计划页签切换保留P-PLAN-001；标准模板与裁剪规则可展开；补充节点打开达成条件表单，取消不新增；编辑启动条件后显示新条件。',data='WBS修订3在里程碑头部一致；评审后返回仍选中里程碑；评审中和已冻结基线补充节点均不可用。',b1='合同要求验收及计划/实际节点、关键标识、材料和条件同时保留；首屏到期未达成说明实施计划，可查进度阻断。',b2='真实修改启动达成条件并在列表可见；冻结P-001及新基线项目禁止新增/删改，旧深链仍正确进入本项目。'),
'YS-08':dict(content='项目/版本摘要、四阶段步骤、提交版本材料快照和WBS/里程碑/资源页签；右侧完整性校验、提交/评审操作及历史；暂无整改项/评审历史显示真实空态。',interaction='当前完整性通过后提交进入评审中，重复提交禁用；PMO录入整改意见与事项，PM回复后重提第2轮，PMO通过后可进入预算。',data='整改轮保留原意见与材料，重提生成第二轮；预算审批通过仍需PMO独立确认基线，确认前尚无生效基线，确认后计划冻结。',b1='材料区含提交版本WBS、5里程碑和2名团队资源；整改真实填写事项/回复并形成历史，旧版本保留。',b2='计划通过后出现进入预算编制；预算审批前不可PMO确认基线，通过后独立确认才冻结；两轮评审及整改轨迹保留。')}
for p in plan['items']:
 k=p['id'];v=e['items'][k];o=obs[k];v['entry']=p['route'].replace(':id','P-PLAN-001');v['covered_features']=p['feature_ids']
 checks={'traceability':f"页面清单第{p['source_lines']['pages']}行、任务书第{p['source_lines']['brief']}行及详细功能清单YS-022~030；对照原业务范围保留字段、版本、权限与动作。",'navigation':'统一计划工作区三页签与当前URL同步，三条旧P-001深链仍可到达；变更入口携带projectId=P-001。','content':o['content'],'interaction':o['interaction'],'data':o['data'],'states':'真实浏览器逐页验证未知项目404、客户经理403（states.json）；P-001已冻结只读；暂无评审/整改使用空态。本地同步数据无新增异步网络加载。','visual':'已查看最终1440×900及1280×900截图；项目摘要、内容和动作层次清晰，无整页横向溢出。修复workspace负margin导致的8px主容器滚动/标题裁切；宽表仅内部横滚。','console':'最终三项浏览器用例及额外状态检查consoleErrors为空；共享布局8项UI回归通过，无页面错误。','business-1':o['b1'],'business-2':o['b2']}
 for key,value in checks.items():v['checks'][key].update(passed=True,observation=value)
 v['scenarios']=[dict(action='以项目经理及PMO执行当前页主要编辑、导航、提交和基线闭环',expected='保留原业务结果、版本与项目上下文，冻结后不允许直接修改',observed=o['interaction']+' '+o['data'])]
 v['artifacts']=[str(r/'browser-verified.log'),str(r/'layout-precheck.log'),str(a/'states.json')]+[str(x) for x in a.glob('ui-planning-*.json')]
 v['screenshots']={str(w):str(a/f"{k.replace('-','')}-{w}.png") for w in (1440,1280)}
(r/'evidence.json').write_text(json.dumps(e,ensure_ascii=False,indent=2)+'\n')
