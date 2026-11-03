/* Offline presentation. All screenshots are original captures of P-INIT-67. */
(() => {
  'use strict';
  const shots = {
    overview:{file:'assets/project-overview.png',title:'项目工作区总览',detail:'P-INIT-67 · 真实原型界面 · 当前案例已签约、已启动',crop:[235,155,1410,620]},
    opportunity:{file:'assets/opportunity.png',title:'商机与售前评估',detail:'OPP-073 · 真实业务记录 · 已转入同一项目',crop:[235,225,1410,690],pins:[[25,36,1],[74,49,2]]},
    estimate:{file:'assets/estimate.png',title:'项目概算编制',detail:'EST-OPP-073-1 · 真实概算记录 · 收入2860万元、成本2000万元',crop:[235,260,1410,600],pins:[[37,44,1],[73,72,2]]},
    initiation:{file:'assets/initiation.png',title:'立项评审工作台',detail:'INIT-6 · 同一演示项目 · 审批状态通过',crop:[655,370,990,520],pins:[[70,17,1],[24,42,2]]},
    team:{file:'assets/team.png',title:'项目团队与资源投入',detail:'P-INIT-67 · 18名成员 · 计划工时10000小时',crop:[235,500,1410,420],pins:[[20,15,1],[72,43,2]]},
    wbs:{file:'assets/wbs.png',title:'WBS工作分解与甘特计划',detail:'P-INIT-67 · 57节点 / 51叶子任务 · 原始系统计划界面',crop:[235,175,1410,730],pins:[[25,28,1],[68,33,2]]},
    budget:{file:'assets/budget-comparison.png',title:'概算与预算科目对比',detail:'P-INIT-67 · 概算2000万元 / 预算1944.80万元',crop:[235,290,1410,625],pins:[[9,12,1],[28,12,2]]},
    start:{file:'assets/project-start.png',title:'正式启动记录与依据',detail:'P-INIT-67 · 2026-09-09 · 张建国确认启动',crop:[235,170,1410,730],pins:[[35,33,1],[30,78,2]]},
    progress:{file:'assets/progress.png',title:'任务进度与执行事实',detail:'P-INIT-67 · 当前案例任务实际完成率为0%，未填报工时',crop:[235,175,1410,730],pins:[[27,27,1],[62,27,2]]},
    daily:{file:'assets/daily-report.png',title:'项目日报与里程碑',detail:'P-INIT-67 · 当日日报待填报 · 功能页面示意',crop:[235,270,1410,640]},
    deliverables:{file:'assets/deliverables.png',title:'阶段交付物目录',detail:'P-INIT-67 · 两份准备文档已通过，其他阶段成果待完成 · 原型登记版本与审核记录',crop:[235,275,1410,645]},
    acceptance:{file:'assets/acceptance.png',title:'客户验收与准备清单',detail:'P-INIT-67 · 功能页面示意 · 当前案例尚未办理客户验收',crop:[235,275,1410,645]},
    receipts:{file:'assets/receipts.png',title:'合同回款计划',detail:'CON-REGISTER-55 · 858 / 1144 / 858万元 · 三笔实际收款均为0',crop:[235,520,1410,400],pins:[[49,59,1],[86,64,2]]},
    settlement:{file:'assets/settlement.png',title:'项目结算申请与条件检查',detail:'P-INIT-67 · 功能页面示意 · 当前案例尚未发起正式结算',crop:[235,575,1410,345]},
    handover:{file:'assets/handover.png',title:'运维移交与接收',detail:'P-INIT-67 · 功能页面示意 · 当前案例尚未移交运维',crop:[235,540,1410,380]},
    archive:{file:'assets/archive.png',title:'项目资料归档',detail:'P-INIT-67 · 功能页面示意 · 当前案例尚未正式归档',crop:[235,275,1410,645]},
    labor:{file:'assets/labor.png',title:'工时填报与人力成本',detail:'P-INIT-67 · 真实功能页面 · 当前未填报或入账工时',crop:[235,230,1410,685]},
    procurement:{file:'assets/procurement.png',title:'采购申请',detail:'P-INIT-67 · 未提交的空白表单 · 1万元是表单默认值',crop:[500,90,670,630]},
    outsource:{file:'assets/outsourcing.png',title:'外包申请与合同履约',detail:'P-INIT-67 · 真实功能页面 · 当前无外包申请原单',crop:[235,230,1410,685]},
    accounting:{file:'assets/accounting.png',title:'动态核算科目与成本来源',detail:'P-INIT-67 · 真实核算结构 · 当前实际、承诺和剩余预测均为0',crop:[235,420,1410,495]},
    report:{file:'assets/report-acceptance.png',title:'项目报验',detail:'P-INIT-67 · 合同2860万元 · 尚无报验记录',crop:[235,230,1410,685]},
    evaluation:{file:'assets/post-evaluation.png',title:'项目后评价',detail:'P-INIT-67 · 真实功能页面 · 未结算，尚未发起后评价',crop:[235,230,1410,365]},
    closure:{file:'assets/closure.png',title:'项目关闭条件检查',detail:'P-INIT-67 · 真实准备清单 · 当前项目仍在执行，未关闭',crop:[235,230,1410,685]},
    baseline:{file:'assets/baseline.png',title:'项目管理基线',detail:'P-INIT-67 · 当前有效V2.0 · 四类管理基线与来源快照',crop:[235,270,1410,645]},
    risks:{file:'assets/risks.png',title:'风险与问题事项台账',detail:'P-INIT-67 · 8项监控风险 · 责任、目标时间与跟踪记录',crop:[235,230,1410,685]},
    weekly:{file:'assets/weekly-report.png',title:'项目周报',detail:'P-INIT-67 · 本周报告尚未生成 · 功能页面示意',crop:[235,230,1410,610]},
    internal:{file:'assets/internal-acceptance.png',title:'内部验收准备',detail:'P-INIT-67 · 当前未办理内部验收 · 准备清单真实状态',crop:[235,230,1410,685]},
    supplier:{file:'assets/supplier-acceptance.png',title:'供应商验收',detail:'P-INIT-67 · 当前尚无采购外包合同，暂不适用 · 条件分支示意',crop:[235,230,1410,610]},
    four:{file:'assets/four-calculations.png',title:'四算对比分析',detail:'P-INIT-67 · 尚未正式结算，冻结结算列为空 · 不作为最终利润结论',crop:[235,575,1410,340]}
  };
  const stages=window.PMS_DECK.stages;
  const slides=window.PMS_DECK.slides.map(s=>({kind:'business',phase:-1,...s}));
  const journey=stages.map(s=>[s.name,s.target]);
  const host=window.PMS_PRESENTATION_HOST;
  const selections = new Map();
  if(host?.initialState?.selections)Object.entries(host.initialState.selections).forEach(([index,choice])=>{if(slides[Number(index)]?.gallery?.[choice])selections.set(Number(index),choice);});

  let current = 0;
  let modalScale = 1;
  let toastTimer;
  function notifyHost(type,key){
    if(host&&window.parent!==window)window.parent.postMessage({channel:'pms-presentation-v1',type,key,position:{slide:current+1,selections:Object.fromEntries(selections)}},host.origin);
  }
  function openLive(key){
    const url=new URL('http://localhost:5173/presentation');
    url.searchParams.set('position',JSON.stringify({slide:current+1,selections:Object.fromEntries(selections)}));
    if(key)url.searchParams.set('shot',key);
    window.open(url.href,'pms-haizhou-demo');
  }
  function openShot(key){if(host)notifyHost('open-shot',key);else openLive(key);}

  const $ = id => document.getElementById(id);
  const esc = value => String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const num = n => String(n).padStart(2,'0');
  const miniJourney = stage => `<div class="journey-mini" aria-label="项目生命周期">${journey.map(([name,index],i)=>`<button type="button" data-jump="${index}" class="${i===stage?'current':''}" ${i===stage?'aria-current="step"':''}>${name}</button>`).join('')}</div>`;
  const footer = (slide,index) => `<div class="slide-foot"><span class="case-signature">${index<8?"项目四算 · 正常业务流程":"海州智慧交通 · 虚拟演示案例"}</span>${miniJourney(slide.phase)}<span class="foot-count">${num(index+1)} / ${slides.length}</span></div>`;
  const heading = (slide,index) => `<header class="slide-head"><div class="eyebrow">${index<9?"业务逻辑 / ":`${stages[slide.phase]?.name||"案例"} / `}${slide.topic}</div><h1>${slide.title}</h1><p class="lede">${slide.lede}</p><span class="slide-number" aria-hidden="true">${num(index+1)}</span></header>`;
  function screen(key,index,caption){
    const shot=shots[key];
    return `<figure class="screen-frame" id="screen-panel-${index}" ${slides[index].gallery?`role="tabpanel" aria-labelledby="screen-tab-${index}-${selections.get(index)||0}"`:`role="group" aria-label="${esc(shot.title)}"`}><div class="window-strip"><span class="window-dots" aria-hidden="true"><b></b><b></b><b></b></span><span class="window-label">项目管理平台 / ${shot.title}</span><button type="button" class="window-expand" data-image="${key}" aria-label="放大截图：${shot.title}">放大截图 ⤢</button></div><button type="button" class="screenshot-button" data-open-shot="${key}" aria-label="进入原型：${esc(shot.title)}"><svg xmlns="http://www.w3.org/2000/svg" viewBox="${shot.crop.join(' ')}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="${esc(shot.title)}系统截图"><defs><clipPath id="crop-${index}-${key}"><rect x="${shot.crop[0]}" y="${shot.crop[1]}" width="${shot.crop[2]}" height="${shot.crop[3]}"/></clipPath></defs><image href="${shot.file}" width="1668" height="927" clip-path="url(#crop-${index}-${key})"/></svg>${(shot.pins||[]).map(([x,y,n])=>`<span class="pin" style="left:${x}%;top:${y}%" aria-hidden="true">${n}</span>`).join('')}<span class="zoom-hint">${'进入原型：'+esc(shot.title)+' ↗'}</span></button></figure><p class="screen-caption" id="screen-caption-${index}">${caption||''}</p>`;
  }
  function gallery(slide,index){
    const picked=selections.get(index)||0;
    return `<div class="screen-panel"><div class="screen-tabs" role="tablist" aria-label="${slide.topic}系统截图">${slide.gallery.map(([,label],i)=>`<button type="button" role="tab" id="screen-tab-${index}-${i}" aria-controls="screen-panel-${index}" aria-selected="${i===picked}" tabindex="${i===picked?0:-1}" data-gallery="${index}" data-choice="${i}">${label}</button>`).join('')}<span class="screen-status ${slide.future?'future':''}">${slide.future?'后续流程示意':'案例真实记录'}</span></div><div class="screen-content" style="display:contents">${screen(slide.gallery[picked][0],index,slide.caption)}</div></div>`;
  }
  function business(slide,index){
    return `${heading(slide,index)}<div class="slide-body content-split"><div class="story-column"><div class="input-context"><small>承接上一步</small><p>${slide.input}</p></div><div class="roles"><span class="role-label">谁来办理</span>${slide.roles.map(r=>`<span class="role">${r}</span>`).join('')}</div>${slide.steps.map(([title,body],i)=>`<div class="step"><span class="step-number">${i+1}</span><div><h3>${title}</h3><p>${body}</p></div></div>`).join('')}<div class="output"><small>${slide.future?'正常办理结果':'办理结果'}</small><p>${slide.output}</p><span class="next-label"><span class="next-arrow">→</span>${slide.next}</span></div></div>${gallery(slide,index)}</div>${footer(slide,index)}`;
  }
  function cover(slide,index){
    return `<div class="cover-grid"><div class="cover-copy"><div class="eyebrow">概算 · 预算 · 核算 · 结算</div><h1>一个项目，<br>从商机到交付，<br><em>再到长期服务。</em></h1><p class="cover-subtitle">先看懂四阶段业务，再跟随同一项目，<br>讲清每一步由谁办、产生什么、交给谁。</p><div class="cover-tags"><span>四阶段业务主线</span><span>真实系统截图</span><span>逐步讲清交接</span></div><button type="button" class="start-deck" data-jump="1">开始讲解 <span aria-hidden="true">→</span></button></div><div class="cover-art"><div class="cover-orbit" aria-hidden="true"></div><button type="button" class="hero-product" data-open-shot="overview" aria-label="进入原型：项目工作区总览"><img src="${shots.overview.file}" alt="项目管理平台真实项目总览界面"></button><div class="hero-label"><i aria-hidden="true"></i>海州市智慧交通信号优化平台</div><div class="hero-data"><div><small>模拟合同金额</small><b>2,860<span>万元</span></b></div><div><small>覆盖既有信号路口</small><b>82<span>处</span></b></div></div><span class="hero-foot">以同一虚拟项目，讲清全生命周期</span></div></div>${footer(slide,index)}`;
  }
  function panorama(slide,index){
    return `${heading(slide,index)}<div class="slide-body"><div class="phase-panorama">${stages.map((s,i)=>`<button type="button" data-jump="${i+2}" class="phase-card" style="--phase:${s.color}"><span class="phase-order">0${i+1}</span><h2>${s.name}</h2><strong>${s.scope}</strong><p class="phase-question">${s.question}</p><ul>${[
      ['商机登记与初评','方案、技术与成本评估','专家评审与概算形成'],
      ['立项分级决策与PM任命','WBS、资源及预算审批','基线确认与签约启动'],
      ['任务、报告与里程碑','质量、风险与问题管理','人力及业务成本动态核算'],
      ['内部、供应商及客户验收','结算、四算对比与后评价','归档、运维衔接与最终关闭']
    ][i].map(x=>`<li>${x}</li>`).join('')}</ul><div class="phase-output"><small>交给下一段的成果</small><b>${s.output}</b></div></button>`).join('')}</div><div class="narrative-band"><strong>一条业务主线</strong><p>客户需求 → 经营判断 → 批准交付 → 执行事实 → 验收结果 → 经营与服务闭环</p></div><p class="flow-reference">流程依据：《基于项目四算的四阶段流程图》 · 点击阶段卡片，查看本阶段业务逻辑</p></div>${footer(slide,index)}`;
  }
  function flow(slide,index){
    return `${heading(slide,index)}<div class="slide-body flow-body"><div class="flow-nodes" style="--node-count:${slide.nodes.length}">${slide.nodes.map(([title,role,action,output,target],i)=>`<button type="button" class="flow-node" data-jump="${target}"><span class="flow-node-order">${num(i+1)}</span><h2>${title}</h2><span class="flow-role">${role}</span><p>${action}</p><div><small>形成结果</small><strong>${output}</strong></div></button>`).join('')}</div><div class="takeaway"><small>阶段出口</small><strong>${slide.takeaway}</strong></div><div class="branch-note"><span>相关办理条件</span><p>${slide.branch}</p></div><div class="flow-bridge"><span>接下来</span>${slide.bridge}</div></div>${footer(slide,index)}`;
  }
  function executionMap(slide,index){
    const tracks=[['进度','WBS · 日报周报 · 里程碑','任务负责人更新实际，PM核对偏差',19],['质量','需求 · BUG · 测试与质量检查','技术与交付团队检查，责任人处理问题',25],['成本','工时 · 采购 · 外包 · 费用','原单审核、履约、入账形成实际核算',21],['风险 / 问题','识别分级 · 应对措施 · 责任期限','责任人反馈，PM跟踪，重大风险升级',24]];
    return `${heading(slide,index)}<div class="slide-body execution-diagram"><div class="execution-start"><span>阶段输入</span><strong>正式启动项目</strong><p>范围 · 进度 · 成本 · 资源基线</p><i>项目团队执行任务 →</i></div><div class="execution-tracks">${tracks.map(([name,objects,role,target],i)=>`<button type="button" data-jump="${target}"><b>${name}</b><span><strong>${objects}</strong><small>${role}</small></span><em>0${i+1}</em></button>`).join('')}</div><div class="execution-end"><span>在关键节点汇合</span><strong>任务与质量满足<br>必交材料审核通过</strong><p>确认里程碑 → 审核阶段成果<br>办理阶段切换 → 进入验收收尾</p><small>执行期间持续循环管理</small></div><div class="execution-note"><b>动态核算</b><span>已发生成本 ＋ 未发生承诺 ＋ 剩余预测 ＝ 滚动成本</span><small>里程碑未满足时，继续实施并完善成果；进度、质量、成本和风险持续围绕同一项目协同。</small></div></div>${footer(slide,index)}`;
  }
  function calculations(slide,index){
    const rows=[['依据','通过评审的方案与成本','WBS、资源量与费率','执行事实和业务原单','验收、合同与明确成本'],['办理角色','方案 · 技术 · 财务','主PM · 财务 · PMO','成员 / PM · 财务','主办 / PM · 财务 · PMO'],['主要输出','冻结测算版本','批准预算和执行基线','实际 / 承诺 / 剩余预测','审核锁定的正式结果'],['回答问题','预计收入、成本是多少','批准按什么投入来执行','实际发生多少，还需多少','最终成本与经营结果如何']];
    return `${heading(slide,index)}<div class="slide-body calc-body"><div class="calc-table"><div class="calc-corner">四算口径</div>${stages.map((s,i)=>`<button type="button" data-jump="${[11,15,24,29][i]}" style="--phase:${s.color}"><span>0${i+1}</span><b>${s.name.slice(0,2)}</b><small>${s.question}</small></button>`).join('')}${rows.map(([label,...values])=>`<strong class="calc-row-label">${label}</strong>${values.map(value=>`<p>${value}</p>`).join('')}`).join('')}</div><div class="calc-relations"><div><b>成本线</b><p>采购 / 外包批准形成承诺 → 履约验收及财务入账 → 转为已发生成本</p></div><div><b>资金线</b><p>合同约定回款计划 → 条件满足、实际到账 → 登记实收与剩余应收</p></div></div><div class="flow-bridge"><span>讲解要点</span>预算是批准依据，实际来自业务原单；回款按合同节点贯穿项目全过程。</div></div>${footer(slide,index)}`;
  }
  function swimlanes(slide,index){
    const rows=[['主办 / 市场',['识别机会、持续跟进','提交立项、落实合同','客户沟通、商务协同','结算协同、回款跟踪']],['PM / 交付团队',['参与方案、评估交付','接受任命、策划与预算','任务、报告、质量与成果','验收、归档、服务交接']],['技术 / 专业人员',['方案和技术成本评估','任务、资源和技术计划','开发测试、解决技术问题','技术验收与经验沉淀']],['财务',['核对概算与投入口径','复核预算与商务依据','审批原单、确认成本','核算锁定、收款及分析']],['PMO / 管理层',['组织评审、投入分级','立项分级、计划预算管理','阶段监督、风险升级','验收确认、评价归档与关闭']]];
    return `${heading(slide,index)}<div class="slide-body swim-body"><div class="swim-table"><span class="swim-corner">责任角色 / 阶段</span>${stages.map(s=>`<b style="--phase:${s.color}">${s.name}</b>`).join('')}${rows.map(([name,items])=>`<strong>${name}</strong>${items.map(x=>`<p>${x}</p>`).join('')}`).join('')}</div><div class="handoff-ribbon"><div><small>第一次交接</small><b>主办 → PM</b><p>方案、概算与风险</p></div><span>→</span><div><small>执行中持续协同</small><b>团队 ↔ 财务 / PMO</b><p>进度、原单与阶段成果</p></div><span>→</span><div><small>收尾交接</small><b>PM → 运维 / 档案</b><p>验收、资料与服务责任</p></div></div><div class="flow-bridge"><span>接下来</span>用一个统一案例，逐步看每个角色如何在系统中承接这些工作。</div></div>${footer(slide,index)}`;
  }
  function caseSlide(slide,index){
    return `${heading(slide,index)}<div class="slide-body case-layout"><div><h2 class="case-name">海州市智慧交通<br>信号优化平台</h2><div class="case-customer">客户：海州市交通运输局　｜　虚拟演示案例</div><div class="metrics"><div class="metric"><small>模拟合同金额</small><b>2,860<span>万元</span></b></div><div class="metric"><small>覆盖既有信号路口</small><b>82<span>处</span></b></div><div class="metric"><small>项目团队</small><b>18<span>人</span></b></div><div class="metric"><small>批准计划周期 · 2026年</small><b class="date-value">09.09 — 12.31</b></div></div><div class="case-deliverables"><strong>建设目标</strong><br>设备接入适配、配时与绿波协调、统一管控、<br>运行效果评价、权限审计与约定系统接口。</div></div><div><span class="case-panel-label">同一个项目工作区，承接前后业务</span><div class="case-shot screen-panel">${screen('overview',index,'真实项目工作区：阶段、预算、里程碑和交付入口集中呈现。')}</div><div class="case-status"><b>案例当前：已签约 · 已正式启动</b><br>后续执行、验收、结算与维护页面按正常流程作功能示意。</div></div></div>${footer(slide,index)}`;
  }
  const renderers={cover,panorama,flow,'execution-map':executionMap,calculations,swimlanes,case:caseSlide,business};
  $('deck').innerHTML=slides.map((slide,index)=>`<section class="slide ${slide.kind==='cover'?'cover':''} ${slide.kind==='business'?'business-slide':''}" data-slide="${index}" data-phase="${slide.phase}" role="group" aria-roledescription="幻灯片" aria-label="第${index+1}页，共${slides.length}页：${esc(slide.short)}" aria-hidden="true" inert>${renderers[slide.kind](slide,index)}</section>`).join('');
  $('toc-grid').innerHTML=slides.map((slide,index)=>`<button type="button" data-jump="${index}"><span>${num(index+1)} / ${slide.phase<0?'业务全景':stages[slide.phase].name}</span><strong>${slide.short}</strong><small>${slide.future?'正常路径 · 功能页面示意':index<8?'系统业务逻辑':index===8?'统一虚拟案例':'案例真实记录'}</small></button>`).join('');
  function fit(){
    const stage=$('stage');const cs=getComputedStyle(stage);
    const width=stage.clientWidth-parseFloat(cs.paddingLeft)-parseFloat(cs.paddingRight);
    const height=stage.clientHeight-parseFloat(cs.paddingTop)-parseFloat(cs.paddingBottom);
    const scale=Math.min(width/1600,height/900);
    $('deck-shell').style.width=`${1600*scale}px`;$('deck-shell').style.height=`${900*scale}px`;
    $('deck').style.setProperty('--stage-scale',String(scale));
  }
  function go(index){
    index=Math.max(0,Math.min(slides.length-1,index));current=index;
    document.querySelectorAll('.slide').forEach((el,i)=>{el.classList.toggle('active',i===index);el.setAttribute('aria-hidden',String(i!==index));el.inert=i!==index;});
    $('counter').textContent=`${num(index+1)} / ${num(slides.length)}`;
    $('player-topic').textContent=slides[index].topic;
    $('previous').disabled=index===0;$('next').disabled=index===slides.length-1;
    $('reading-progress').style.width=`${(index+1)/slides.length*100}%`;
    $('notes-text').textContent=slides[index].notes;
    document.querySelectorAll('#toc-grid button').forEach((button,i)=>button.setAttribute('aria-current',String(i===index)));
    if($('toc-dialog').open)$('toc-dialog').close();
    if(!host)history.replaceState(null,'',`#${index+1}`);
    notifyHost('state');
    document.title=`${num(index+1)} ${slides[index].short}｜项目四算管理平台`;
  }
  function chooseGallery(index,choice){
    const slide=slides[index];if(!slide.gallery?.[choice])return;
    selections.set(index,choice);
    const section=document.querySelector(`[data-slide="${index}"]`);
    section.querySelectorAll('[data-gallery]').forEach((button,i)=>{button.setAttribute('aria-selected',String(i===choice));button.tabIndex=i===choice?0:-1;});
    section.querySelector('.screen-content').innerHTML=screen(slide.gallery[choice][0],index,slide.caption);
    notifyHost('state');
  }
  function toast(message){clearTimeout(toastTimer);$('toast').textContent=message;$('toast').hidden=false;toastTimer=setTimeout(()=>$('toast').hidden=true,3200);}
  function applyZoom(scale){
    const image=$('full-image');modalScale=Math.max(.2,Math.min(3,scale));
    image.style.width=`${image.naturalWidth*modalScale}px`;
    $('zoom-label').textContent=`${Math.round(modalScale*100)}%`;
  }
  function fitImage(){
    const image=$('full-image');if(!image.naturalWidth)return;
    const box=$('image-scroll');applyZoom(Math.min((box.clientWidth-52)/image.naturalWidth,(box.clientHeight-52)/image.naturalHeight,1));
    box.scrollTop=0;box.scrollLeft=0;
  }
  function openImage(key){
    const shot=shots[key];if(!shot)return;
    const image=$('full-image');$('image-title').textContent=shot.title;$('image-description').textContent=shot.detail;
    image.onload=fitImage;image.onerror=()=>toast('截图未能读取，请确认素材目录完整。');image.src=shot.file;image.alt=`${shot.title}，未裁切的原始系统截图`;
    $('image-dialog').showModal();if(image.complete&&image.naturalWidth)fitImage();
  }
  document.addEventListener('click',event=>{
    if(event.target.closest('.brand')){event.preventDefault();go(0);return;}
    const jump=event.target.closest('[data-jump]');if(jump){go(Number(jump.dataset.jump));return;}
    const tab=event.target.closest('[data-gallery]');if(tab){chooseGallery(Number(tab.dataset.gallery),Number(tab.dataset.choice));return;}
    const shot=event.target.closest('[data-open-shot]');if(shot){openShot(shot.dataset.openShot);return;}
    const image=event.target.closest('[data-image]');if(image){openImage(image.dataset.image);return;}
    const close=event.target.closest('[data-close]');if(close)$(close.dataset.close).close();
  });
  document.querySelectorAll('dialog').forEach(dialog=>dialog.addEventListener('click',event=>{if(event.target!==dialog)return;const b=dialog.getBoundingClientRect();if(event.clientX<b.left||event.clientX>b.right||event.clientY<b.top||event.clientY>b.bottom)dialog.close();}));
  $('previous').addEventListener('click',()=>go(current-1));$('next').addEventListener('click',()=>go(current+1));
  $('toc-button').addEventListener('click',()=>$('toc-dialog').showModal());
  function toggleNotes(){const visible=$('speaker-notes').hidden;$('speaker-notes').hidden=!visible;$('notes-button').setAttribute('aria-pressed',String(visible));}
  $('notes-button').addEventListener('click',toggleNotes);$('close-notes').addEventListener('click',toggleNotes);
  async function toggleFullscreen(){try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{toast('可使用浏览器菜单进入全屏演示。');}}
  $('fullscreen-button').addEventListener('click',toggleFullscreen);
  document.addEventListener('fullscreenchange',()=>{$('fullscreen-button').innerHTML=`${document.fullscreenElement?'退出全屏':'全屏'} <kbd>F</kbd>`;fit();});
  $('print-button').addEventListener('click',()=>window.print());
  $('zoom-in').addEventListener('click',()=>applyZoom(modalScale*1.25));$('zoom-out').addEventListener('click',()=>applyZoom(modalScale/1.25));$('zoom-fit').addEventListener('click',fitImage);$('zoom-original').addEventListener('click',()=>applyZoom(1));
  document.addEventListener('keydown',event=>{
    if(event.altKey||event.ctrlKey||event.metaKey||event.target.matches('input,textarea,select'))return;
    if($('image-dialog').open||$('toc-dialog').open)return;
    const tab=event.target.closest('[data-gallery]');
    if(tab&&['ArrowLeft','ArrowRight','Home','End'].includes(event.key)){
      event.preventDefault();const index=Number(tab.dataset.gallery);const total=slides[index].gallery.length;let next=Number(tab.dataset.choice)+(event.key==='ArrowRight'?1:-1);if(event.key==='Home')next=0;if(event.key==='End')next=total-1;next=(next+total)%total;chooseGallery(index,next);document.getElementById(`screen-tab-${index}-${next}`).focus();return;
    }
    if(event.key===' '&&event.target.closest('button,a'))return;
    if(['ArrowRight','PageDown',' '].includes(event.key)){event.preventDefault();go(current+1);}
    if(['ArrowLeft','PageUp'].includes(event.key)){event.preventDefault();go(current-1);}
    if(event.key==='Home'){event.preventDefault();go(0);}if(event.key==='End'){event.preventDefault();go(slides.length-1);}
    if(event.key.toLowerCase()==='f'){event.preventDefault();toggleFullscreen();}
    if(event.key.toLowerCase()==='n'){event.preventDefault();toggleNotes();}
    if(event.key==='Escape'&&!$('speaker-notes').hidden)toggleNotes();
  });
  window.addEventListener('resize',()=>{fit();if($('image-dialog').open)fitImage();});
  window.addEventListener('hashchange',()=>{const n=parseInt(location.hash.slice(1),10);if(Number.isFinite(n))go(n-1);});
  $('open-live').hidden=!!host;
  $('open-live').addEventListener('click',()=>openLive());
  document.querySelector('.keyboard-hint').textContent='← → 翻页 · 点击截图进入原型，右上角可放大';
  if(host){
    document.body.classList.add('linked-presentation');
    document.querySelector('.keyboard-hint').textContent='← → 翻页 · 点击截图进入原型，右上角可放大';
    $('demo-data').hidden=false;
    $('demo-data').addEventListener('click',()=>notifyHost('manage-data'));
    $('back-to-prototype').hidden=false;
    $('back-to-prototype').addEventListener('click',()=>notifyHost('exit'));
  }
  go((host?.initialState?.slide||parseInt(location.hash.slice(1),10)||1)-1);fit();
})();
