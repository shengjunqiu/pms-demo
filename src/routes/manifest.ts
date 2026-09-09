export interface RouteItem {
  id: string;
  title: string;
  route: string;
  kind: string;
  roles: string;
  phase: number;
  feature_ids: string[];
  upstream_feature_scope: string;
  criteria: string[];
  source_lines?: {
    pages?: number;
    brief?: number;
  };
}

export const PAGE_MANIFEST: RouteItem[] = [
  {
    "id": "WK-01",
    "title": "项目经理工作台",
    "route": "/workbench/project-manager",
    "kind": "工作台",
    "roles": "项目经理",
    "phase": 3,
    "feature_ids": [
      "HS-001",
      "HS-002",
      "HS-003",
      "HS-004",
      "HS-005",
      "HS-006",
      "PT-008"
    ],
    "upstream_feature_scope": "核算阶段高频入口、项目异常、成本、进度、待办",
    "source_lines": {
      "pages": 103,
      "brief": 387
    },
    "criteria": [
      "我负责/我参与、快捷发起、待办、进度成本风险验收回款聚合；不直接编辑核心数据",
      "项目及问题/风险/BUG/需求数字带项目筛选下钻；P-001金额与数量和详情一致"
    ]
  },
  {
    "id": "WK-02",
    "title": "我的待办中心",
    "route": "/workbench/todos",
    "kind": "工作台/列表",
    "roles": "全角色",
    "phase": 3,
    "feature_ids": [
      "PT-008",
      "PT-009",
      "PT-010",
      "PT-011",
      "PT-012",
      "PT-013",
      "PT-014"
    ],
    "upstream_feature_scope": "审批、督办、阶段任务、预警待办",
    "source_lines": {
      "pages": 104,
      "brief": 388
    },
    "criteria": [
      "待办/已办按业务类型项目时限查询，显示当前节点与责任人",
      "处理进入原业务详情，结果同步待办和原单据，未授权动作不可用"
    ]
  },
  {
    "id": "GS-01",
    "title": "商机台账",
    "route": "/opportunities",
    "kind": "台账列表",
    "roles": "市场/项目主办部门",
    "phase": 4,
    "feature_ids": [
      "GS-001",
      "GS-002",
      "GS-003",
      "GS-004",
      "GS-005",
      "GS-006",
      "GS-007",
      "GS-008"
    ],
    "upstream_feature_scope": "GS-001~008",
    "source_lines": {
      "pages": 105,
      "brief": 394
    },
    "criteria": [
      "完整商机筛选、跟进、评估、暂缓/终止/立项入口",
      "转立项条件不满足显示原因；有投入终止保留成本并要求处置"
    ]
  },
  {
    "id": "GS-02",
    "title": "商机新建/编辑",
    "route": "/opportunities/new",
    "kind": "表单",
    "roles": "市场/项目主办部门",
    "phase": 4,
    "feature_ids": [
      "GS-002",
      "GS-003"
    ],
    "upstream_feature_scope": "GS-002~003",
    "source_lines": {
      "pages": 106,
      "brief": 395
    },
    "criteria": [
      "必填校验、客户/负责人/金额/签约日期、草稿和提交",
      "保存生成编号并回显台账；冻结字段只读，取消返回不误提交"
    ]
  },
  {
    "id": "GS-03",
    "title": "商机详情",
    "route": "/opportunities/:id",
    "kind": "详情全景",
    "roles": "商机相关角色",
    "phase": 4,
    "feature_ids": [
      "GS-004",
      "GS-005",
      "GS-006",
      "GS-007",
      "GS-008"
    ],
    "upstream_feature_scope": "GS-004~008",
    "source_lines": {
      "pages": 107,
      "brief": 396
    },
    "criteria": [
      "九类页签整合跟进、方案、评审、概算、提前投入、历史",
      "立项按钮根据条件启停并列缺失项；上游关联与版本可追溯"
    ]
  },
  {
    "id": "GS-04",
    "title": "商机初步评估",
    "route": "/opportunities/:id/evaluation",
    "kind": "表单/评估",
    "roles": "项目主办部门、方案、技术、财务",
    "phase": 4,
    "feature_ids": [
      "GS-009",
      "GS-010",
      "GS-011",
      "GS-012",
      "GS-013",
      "GS-014",
      "GS-015"
    ],
    "upstream_feature_scope": "GS-009~015",
    "source_lines": {
      "pages": 108,
      "brief": 397
    },
    "criteria": [
      "专业维度评分/结论/风险/附件与综合建议",
      "角色只编辑自己维度；暂缓填写复评日和责任人"
    ]
  },
  {
    "id": "GS-05",
    "title": "需求调研与解决方案",
    "route": "/opportunities/:id/solution",
    "kind": "详情/编制",
    "roles": "解决方案、技术、市场",
    "phase": 4,
    "feature_ids": [
      "GS-016",
      "GS-017",
      "GS-018",
      "GS-019",
      "GS-020"
    ],
    "upstream_feature_scope": "GS-016~020",
    "source_lines": {
      "pages": 109,
      "brief": 398
    },
    "criteria": [
      "调研、方案范围/架构/交付物与版本记录",
      "评审提交冻结版本；整改追加新版本和响应记录"
    ]
  },
  {
    "id": "GS-06",
    "title": "技术与成本评估",
    "route": "/opportunities/:id/tech-cost",
    "kind": "编制",
    "roles": "技术、方案、财务、采购",
    "phase": 4,
    "feature_ids": [
      "GS-021",
      "GS-022",
      "GS-023",
      "GS-024",
      "GS-025",
      "GS-026"
    ],
    "upstream_feature_scope": "GS-021~026",
    "source_lines": {
      "pages": 110,
      "brief": 399
    },
    "criteria": [
      "技术可行性、采购询价、人力/外包成本与风险假设",
      "数量单价汇总、统一科目/成本基准、范围与测算关联"
    ]
  },
  {
    "id": "GS-07",
    "title": "方案与成本专家评审",
    "route": "/opportunities/:id/review",
    "kind": "评审",
    "roles": "PMO、专家组",
    "phase": 4,
    "feature_ids": [
      "GS-027",
      "GS-028",
      "GS-029",
      "GS-030",
      "GS-031"
    ],
    "upstream_feature_scope": "GS-027~031",
    "source_lines": {
      "pages": 111,
      "brief": 400
    },
    "criteria": [
      "材料包、各专家独立意见、当前轮次与通过/整改/不通过",
      "整改必填事项责任人截止日，新轮次保留原评审和方案版本"
    ]
  },
  {
    "id": "GS-08",
    "title": "项目概算编制",
    "route": "/opportunities/:id/estimate",
    "kind": "编制",
    "roles": "解决方案、财务",
    "phase": 4,
    "feature_ids": [
      "GS-032",
      "GS-033",
      "GS-034",
      "GS-035",
      "GS-036"
    ],
    "upstream_feature_scope": "GS-032~036",
    "source_lines": {
      "pages": 112,
      "brief": 401
    },
    "criteria": [
      "收入/建设/人力/第三方/期间/风险/毛利/版本完整",
      "统一科目实时汇总，评审通过才可冻结，来源版本可查"
    ]
  },
  {
    "id": "GS-09",
    "title": "概算版本对比",
    "route": "/opportunities/:id/estimate/compare",
    "kind": "专题",
    "roles": "解决方案、财务、PMO",
    "phase": 4,
    "feature_ids": [
      "GS-035",
      "GS-036"
    ],
    "upstream_feature_scope": "GS-035~036",
    "source_lines": {
      "pages": 113,
      "brief": 402
    },
    "criteria": [
      "两版本按科目/数量/单价/金额对比，显示修改原因",
      "历史只读，明确立项引用版本和新增删除修改差异"
    ]
  },
  {
    "id": "GS-10",
    "title": "提前投入申请",
    "route": "/opportunities/:id/early-investment",
    "kind": "表单",
    "roles": "项目主办部门",
    "phase": 4,
    "feature_ids": [
      "GS-037",
      "GS-038",
      "GS-039",
      "GS-040"
    ],
    "upstream_feature_scope": "GS-037~040",
    "source_lines": {
      "pages": 114,
      "brief": 403
    },
    "criteria": [
      "原因、额度、资源、周期、签约计划、风险和退出方案",
      "模拟分级审批显示规则，批准形成商机可用额度"
    ]
  },
  {
    "id": "GS-11",
    "title": "提前投入台账",
    "route": "/early-investments",
    "kind": "台账",
    "roles": "PMO、财务、主办部门",
    "phase": 4,
    "feature_ids": [
      "GS-040",
      "GS-041",
      "GS-042"
    ],
    "upstream_feature_scope": "GS-040~042",
    "source_lines": {
      "pages": 115,
      "brief": 404
    },
    "criteria": [
      "商机维度批准/发生/剩余额度、时限及异常",
      "超额/超期新增投入阻断或升级，前期成本来源可查"
    ]
  },
  {
    "id": "YS-01",
    "title": "立项申请",
    "route": "/initiation/apply",
    "kind": "表单",
    "roles": "项目主办部门",
    "phase": 5,
    "feature_ids": [
      "YS-001",
      "YS-002",
      "YS-003",
      "YS-004",
      "YS-005",
      "YS-006"
    ],
    "upstream_feature_scope": "YS-001~006",
    "source_lines": {
      "pages": 116,
      "brief": 410
    },
    "criteria": [
      "自动带入商机方案冻结概算风险成本，显示来源版本和目录",
      "拟立项/评审/冻结概算/附件校验；系统必交项不可取消"
    ]
  },
  {
    "id": "YS-02",
    "title": "立项评审工作台",
    "route": "/initiation/review",
    "kind": "评审",
    "roles": "PMO、专家、职能部门",
    "phase": 5,
    "feature_ids": [
      "YS-007",
      "YS-008",
      "YS-009",
      "YS-010",
      "YS-011",
      "YS-012",
      "YS-013",
      "YS-014",
      "YS-015",
      "YS-016"
    ],
    "upstream_feature_scope": "YS-007~016",
    "source_lines": {
      "pages": 117,
      "brief": 411
    },
    "criteria": [
      "左侧评审列表右侧材料，分级/毛利/风险/专业意见",
      "会签/PMO/PMC显示命中原因；通过整改否决暂缓有业务结果"
    ]
  },
  {
    "id": "YS-03",
    "title": "综合风险评估",
    "route": "/initiation/:id/risk-assessment",
    "kind": "专题/评估",
    "roles": "PMO、专家组",
    "phase": 5,
    "feature_ids": [
      "YS-009"
    ],
    "upstream_feature_scope": "YS-009",
    "source_lines": {
      "pages": 118,
      "brief": 412
    },
    "criteria": [
      "多专业风险及原始来源、等级矩阵与综合报告",
      "人工调整等级留原因，重大风险影响审批路径"
    ]
  },
  {
    "id": "YS-04",
    "title": "立项决策详情",
    "route": "/initiation/:id/decision",
    "kind": "评审详情",
    "roles": "PMO、PMC、管理层",
    "phase": 5,
    "feature_ids": [
      "YS-010",
      "YS-011",
      "YS-012",
      "YS-013",
      "YS-014",
      "YS-015",
      "YS-016"
    ],
    "upstream_feature_scope": "YS-010~016",
    "source_lines": {
      "pages": 119,
      "brief": 413
    },
    "criteria": [
      "材料版本、决策节点、人员意见/纪要及处理轨迹",
      "整改后重新评审，否决保留投入，通过关联正式项目"
    ]
  },
  {
    "id": "YS-05",
    "title": "项目团队",
    "route": "/projects/:id/team",
    "kind": "详情/配置",
    "roles": "项目经理、交付部门、PMO",
    "phase": 5,
    "feature_ids": [
      "YS-017",
      "YS-018",
      "YS-019",
      "YS-020",
      "YS-021"
    ],
    "upstream_feature_scope": "YS-017~021",
    "source_lines": {
      "pages": 120,
      "brief": 414
    },
    "criteria": [
      "唯一主PM、接受/拒绝任命、技术及协同成员、投入周期",
      "成员加入退出影响演示权限，历史任务工时责任不回写"
    ]
  },
  {
    "id": "YS-06",
    "title": "WBS计划编制",
    "route": "/projects/:id/wbs",
    "kind": "编制",
    "roles": "项目经理、技术经理",
    "phase": 5,
    "feature_ids": [
      "YS-022",
      "YS-023",
      "YS-024",
      "YS-025",
      "YS-026",
      "YS-027"
    ],
    "upstream_feature_scope": "YS-022~027",
    "source_lines": {
      "pages": 121,
      "brief": 415
    },
    "criteria": [
      "多级WBS树和甘特、依赖、任务人日期工时里程碑",
      "拒绝循环依赖；模拟导入校验；冻结计划引导变更"
    ]
  },
  {
    "id": "YS-07",
    "title": "里程碑计划",
    "route": "/projects/:id/milestones",
    "kind": "编制/列表",
    "roles": "项目经理、PMO",
    "phase": 5,
    "feature_ids": [
      "YS-028",
      "YS-029",
      "YS-030"
    ],
    "upstream_feature_scope": "YS-028~030",
    "source_lines": {
      "pages": 122,
      "brief": 416
    },
    "criteria": [
      "合同/计划/实际日期、关键里程碑、交付物与达成条件",
      "临期超期原因可查，冻结里程碑不能直接删除改写"
    ]
  },
  {
    "id": "YS-08",
    "title": "计划评审",
    "route": "/projects/:id/plan-review",
    "kind": "评审",
    "roles": "PMO、交付部门",
    "phase": 5,
    "feature_ids": [
      "YS-030"
    ],
    "upstream_feature_scope": "YS-030",
    "source_lines": {
      "pages": 123,
      "brief": 417
    },
    "criteria": [
      "WBS里程碑资源材料、评审意见与整改",
      "通过才允许正式基线，退回保留材料版本和整改轨迹"
    ]
  },
  {
    "id": "YS-09",
    "title": "项目预算编制",
    "route": "/projects/:id/budget",
    "kind": "编制",
    "roles": "项目经理",
    "phase": 5,
    "feature_ids": [
      "YS-031",
      "YS-032",
      "YS-033",
      "YS-034",
      "YS-035",
      "YS-036",
      "YS-037",
      "YS-038",
      "YS-039",
      "YS-040"
    ],
    "upstream_feature_scope": "YS-031~040",
    "source_lines": {
      "pages": 124,
      "brief": 418
    },
    "criteria": [
      "概算继承、预算帽、WBS阶段人力费用采购外包汇总",
      "实时差异毛利，超概算可保存，提交需原因走高级审批"
    ]
  },
  {
    "id": "YS-10",
    "title": "概算预算对比",
    "route": "/projects/:id/estimate-budget",
    "kind": "专题",
    "roles": "项目经理、PMO、财务",
    "phase": 5,
    "feature_ids": [
      "YS-038",
      "YS-039",
      "YS-040",
      "YS-041",
      "YS-042",
      "YS-043"
    ],
    "upstream_feature_scope": "YS-038~043",
    "source_lines": {
      "pages": 125,
      "brief": 419
    },
    "criteria": [
      "冻结概算与预算按统一科目对比总额/差额/比率/毛利",
      "异常来源可下钻，版本和差异原因明确，零分母安全"
    ]
  },
  {
    "id": "YS-11",
    "title": "预算审批详情",
    "route": "/projects/:id/budget/review",
    "kind": "评审",
    "roles": "PMO、财务、管理层",
    "phase": 5,
    "feature_ids": [
      "YS-041",
      "YS-042",
      "YS-043"
    ],
    "upstream_feature_scope": "YS-041~043",
    "source_lines": {
      "pages": 126,
      "brief": 420
    },
    "criteria": [
      "常规/超概算分支、原因、材料版本、审批意见",
      "通过生成预算版本并待PMO基线确认；审批中引用版本不跳动"
    ]
  },
  {
    "id": "YS-12",
    "title": "项目基线",
    "route": "/projects/:id/baseline",
    "kind": "详情/版本",
    "roles": "PMO、项目经理",
    "phase": 5,
    "feature_ids": [
      "PT-021",
      "PT-022",
      "PT-023",
      "PT-024",
      "PT-025",
      "YS-044",
      "YS-045",
      "YS-046"
    ],
    "upstream_feature_scope": "YS-044~046",
    "source_lines": {
      "pages": 127,
      "brief": 421
    },
    "criteria": [
      "范围进度成本资源四基线快照、生效原因和版本差异",
      "只有有效版用于执行，变更追加版本，旧版只读"
    ]
  },
  {
    "id": "YS-13",
    "title": "未签立项台账",
    "route": "/unsigned-projects",
    "kind": "台账",
    "roles": "PMO、财务、主办部门",
    "phase": 5,
    "feature_ids": [
      "YS-047",
      "YS-048",
      "YS-049",
      "YS-050",
      "YS-051",
      "YS-052",
      "YS-053",
      "YS-054"
    ],
    "upstream_feature_scope": "YS-047~054",
    "source_lines": {
      "pages": 128,
      "brief": 422
    },
    "criteria": [
      "未签金额日期额度成本使用率进展风险台账",
      "更新签约/追加投入/确认签订/退出可演示，超限时限联动"
    ]
  },
  {
    "id": "YS-14",
    "title": "未签项目详情",
    "route": "/unsigned-projects/:id",
    "kind": "详情",
    "roles": "PMO、主办部门、财务",
    "phase": 5,
    "feature_ids": [
      "YS-048",
      "YS-049",
      "YS-050",
      "YS-051",
      "YS-052",
      "YS-053",
      "YS-054"
    ],
    "upstream_feature_scope": "YS-048~054",
    "source_lines": {
      "pages": 129,
      "brief": 423
    },
    "criteria": [
      "签约进展、额度/时限、成本来源、沉没成本和追加审批",
      "签订转正式前检查合同；退出留痕，不把拟签额算成已签额"
    ]
  },
  {
    "id": "YS-15",
    "title": "项目启动确认",
    "route": "/projects/:id/start-confirmation",
    "kind": "表单/校验",
    "roles": "项目经理、PMO",
    "phase": 5,
    "feature_ids": [
      "YS-055",
      "YS-056",
      "YS-057"
    ],
    "upstream_feature_scope": "YS-055~057",
    "source_lines": {
      "pages": 130,
      "brief": 424
    },
    "criteria": [
      "立项、任命接受、基线、合同等启动条件清单",
      "阻断项列原因，通过才正式启动并激活执行待办"
    ]
  },
  {
    "id": "HS-01",
    "title": "项目详情总览",
    "route": "/projects/:id",
    "kind": "详情全景",
    "roles": "项目成员及管理角色",
    "phase": 3,
    "feature_ids": [
      "HS-020",
      "HS-021",
      "HS-022",
      "HS-023",
      "PT-001",
      "PT-002",
      "PT-003",
      "PT-004",
      "PT-005",
      "PT-006",
      "PT-007"
    ],
    "upstream_feature_scope": "项目全生命周期统一入口",
    "source_lines": {
      "pages": 131,
      "brief": 430
    },
    "criteria": [
      "统一项目页头、生命周期、里程碑四算成本风险需求变更交付物验收回款时间线",
      "所有摘要可到相关业务且项目一致；管理角色只读"
    ]
  },
  {
    "id": "HS-02",
    "title": "项目进度",
    "route": "/projects/:id/progress",
    "kind": "详情/计划",
    "roles": "项目经理、项目成员",
    "phase": 3,
    "feature_ids": [
      "HS-007",
      "HS-008",
      "HS-009",
      "HS-010",
      "HS-011",
      "HS-012"
    ],
    "upstream_feature_scope": "进度、WBS、里程碑、偏差",
    "source_lines": {
      "pages": 132,
      "brief": 431
    },
    "criteria": [
      "总体完成率、里程碑轴、WBS甘特、计划实际与延期",
      "更新执行事实不改基线，里程碑/计划变更/阶段入口可用"
    ]
  },
  {
    "id": "HS-03",
    "title": "项目日报",
    "route": "/projects/:id/daily-reports",
    "kind": "列表/表单",
    "roles": "项目经理",
    "phase": 6,
    "feature_ids": [
      "HS-013",
      "HS-014",
      "HS-015",
      "HS-016",
      "HS-017"
    ],
    "upstream_feature_scope": "日报填报、进展、里程碑、问题风险",
    "source_lines": {
      "pages": 133,
      "brief": 432
    },
    "criteria": [
      "自动日报待办，项目带入、进展/无进展原因、下一步和里程碑",
      "问题风险独立关联；里程碑完成需实际时间和材料"
    ]
  },
  {
    "id": "HS-04",
    "title": "项目周报",
    "route": "/projects/:id/weekly-reports",
    "kind": "列表/表单",
    "roles": "项目经理",
    "phase": 6,
    "feature_ids": [
      "HS-018",
      "HS-019"
    ],
    "upstream_feature_scope": "周度进展汇总、计划、风险",
    "source_lines": {
      "pages": 134,
      "brief": 433
    },
    "criteria": [
      "由日报/计划/成本/风险聚合周报草稿",
      "可补充提交，模拟上报范围/历史保留且不发送真实消息"
    ]
  },
  {
    "id": "HS-05",
    "title": "需求BUG台账",
    "route": "/requirements-bugs",
    "kind": "台账",
    "roles": "项目经理、产品/技术责任人",
    "phase": 6,
    "feature_ids": [
      "HS-024",
      "HS-025",
      "HS-026",
      "HS-027",
      "HS-028",
      "HS-029"
    ],
    "upstream_feature_scope": "需求与BUG闭环",
    "source_lines": {
      "pages": 135,
      "brief": 434
    },
    "criteria": [
      "需求/BUG分类型字段，项目优先级责任人超期查询",
      "新增→处理/转办→发起人确认关闭，影响基线的需求转变更"
    ]
  },
  {
    "id": "HS-06",
    "title": "需求BUG详情",
    "route": "/requirements-bugs/:id",
    "kind": "流程详情",
    "roles": "发起人、责任人",
    "phase": 6,
    "feature_ids": [
      "HS-024",
      "HS-025",
      "HS-026",
      "HS-027",
      "HS-028",
      "HS-029"
    ],
    "upstream_feature_scope": "提交→解决/转办→确认→关闭",
    "source_lines": {
      "pages": 136,
      "brief": 435
    },
    "criteria": [
      "处理时间线、解决/转办/退回/关闭，需求及BUG字段差异",
      "处理人不能自行最终关闭；转办同步人，历史不可删"
    ]
  },
  {
    "id": "HS-07",
    "title": "问题风险台账",
    "route": "/issues-risks",
    "kind": "台账",
    "roles": "项目经理、PMO",
    "phase": 6,
    "feature_ids": [
      "HS-030",
      "HS-031",
      "HS-032",
      "HS-033",
      "HS-034",
      "HS-035",
      "HS-036",
      "HS-037",
      "HS-038",
      "HS-039"
    ],
    "upstream_feature_scope": "风险、问题分级、跟踪、升级",
    "source_lines": {
      "pages": 137,
      "brief": 436
    },
    "criteria": [
      "问题风险分级责任人期限进展升级层级查询",
      "风险转问题保留原关联，健康度原因与项目摘要一致"
    ]
  },
  {
    "id": "HS-08",
    "title": "问题风险详情",
    "route": "/issues-risks/:id",
    "kind": "流程详情",
    "roles": "项目经理、责任人、PMO",
    "phase": 6,
    "feature_ids": [
      "HS-030",
      "HS-031",
      "HS-032",
      "HS-033",
      "HS-034",
      "HS-035",
      "HS-036",
      "HS-037",
      "HS-038",
      "HS-039"
    ],
    "upstream_feature_scope": "督办、反馈、升级、关闭",
    "source_lines": {
      "pages": 138,
      "brief": 437
    },
    "criteria": [
      "责任反馈、督办升级、风险措施与问题关闭轨迹",
      "PM最终关问题；重大风险升级后继续跟踪，责任链可查"
    ]
  },
  {
    "id": "HS-09",
    "title": "工时与人力成本",
    "route": "/projects/:id/labor-cost",
    "kind": "专题",
    "roles": "项目经理、项目成员、财务",
    "phase": 6,
    "feature_ids": [
      "HS-040",
      "HS-041",
      "HS-042",
      "HS-043",
      "HS-044",
      "HS-045"
    ],
    "upstream_feature_scope": "工时、预算、实际人力成本",
    "source_lines": {
      "pages": 139,
      "brief": 438
    },
    "criteria": [
      "工时填报审核与阶段/WBS/人员人力成本预算实际分析",
      "成员/日期累计/额度/阶段校验，审核后计成本，隐藏成员成本单价"
    ]
  },
  {
    "id": "HS-10",
    "title": "采购成本",
    "route": "/projects/:id/procurement",
    "kind": "专题/列表",
    "roles": "项目经理、采购、财务",
    "phase": 6,
    "feature_ids": [
      "HS-046",
      "HS-047",
      "HS-048",
      "HS-049"
    ],
    "upstream_feature_scope": "采购申请、合同、到货、成本归集",
    "source_lines": {
      "pages": 140,
      "brief": 439
    },
    "criteria": [
      "采购申请预算合同到货验收实际与承诺成本",
      "预算/未签约束，来源单据可下钻，承诺转实际不重复"
    ]
  },
  {
    "id": "HS-11",
    "title": "外包成本",
    "route": "/projects/:id/outsourcing",
    "kind": "专题/列表",
    "roles": "项目经理、采购、技术",
    "phase": 6,
    "feature_ids": [
      "HS-050",
      "HS-051",
      "HS-052"
    ],
    "upstream_feature_scope": "外包申请、合同、履约、成本归集",
    "source_lines": {
      "pages": 141,
      "brief": 440
    },
    "criteria": [
      "外包范围WBS供应商合同交付履约预算及成本",
      "超限规则与验收联动，合同承诺未发生余额准确"
    ]
  },
  {
    "id": "HS-12",
    "title": "项目费用",
    "route": "/projects/:id/expenses",
    "kind": "专题/列表",
    "roles": "项目经理、财务",
    "phase": 6,
    "feature_ids": [
      "HS-053",
      "HS-054",
      "HS-055"
    ],
    "upstream_feature_scope": "差旅、第三方、租房、业务等费用",
    "source_lines": {
      "pages": 142,
      "brief": 441
    },
    "criteria": [
      "差旅租房第三方等费用，预算已用本次剩余明细",
      "科目与阶段/锁定规则校验，审批确认后更新统一核算"
    ]
  },
  {
    "id": "HS-13",
    "title": "动态核算",
    "route": "/projects/:id/dynamic-accounting",
    "kind": "专题分析",
    "roles": "项目经理、财务、PMO",
    "phase": 3,
    "feature_ids": [
      "HS-056",
      "HS-057",
      "HS-058",
      "HS-059",
      "HS-060",
      "HS-061",
      "HS-062",
      "HS-063",
      "HS-064",
      "HS-065"
    ],
    "upstream_feature_scope": "预算 vs 实际、滚动成本、偏差",
    "source_lines": {
      "pages": 143,
      "brief": 442
    },
    "criteria": [
      "预算/实际/承诺/剩余预测/滚动/偏差/毛利及趋势和科目表",
      "异常下钻来源Drawer，三桶互斥，各页金额一致，零分母安全"
    ]
  },
  {
    "id": "HS-14",
    "title": "项目变更台账",
    "route": "/project-changes",
    "kind": "台账",
    "roles": "项目经理、项目主办部门、PMO",
    "phase": 6,
    "feature_ids": [
      "HS-066",
      "HS-067",
      "HS-068",
      "HS-069",
      "HS-070",
      "HS-071",
      "HS-072",
      "HS-073"
    ],
    "upstream_feature_scope": "范围/计划/预算等变更",
    "source_lines": {
      "pages": 144,
      "brief": 443
    },
    "criteria": [
      "范围进度成本资源等变更列表、级别影响状态",
      "进入申请/材料/对比/原审批，能追踪引起偏差的变更"
    ]
  },
  {
    "id": "HS-15",
    "title": "项目变更申请",
    "route": "/project-changes/new",
    "kind": "表单",
    "roles": "项目经理/项目主办部门",
    "phase": 6,
    "feature_ids": [
      "HS-066",
      "HS-067",
      "HS-068",
      "HS-069",
      "HS-070",
      "HS-071",
      "HS-072",
      "HS-073"
    ],
    "upstream_feature_scope": "变更影响评估与审批",
    "source_lines": {
      "pages": 145,
      "brief": 444
    },
    "criteria": [
      "原目标基线对比与范围进度成本毛利资源合同影响",
      "分级审批通过追加统一基线版本，退回保持原版"
    ]
  },
  {
    "id": "HS-16",
    "title": "阶段切换申请",
    "route": "/projects/:id/stage-switch",
    "kind": "表单/校验",
    "roles": "项目经理",
    "phase": 6,
    "feature_ids": [
      "HS-074",
      "HS-075",
      "HS-076",
      "HS-077",
      "HS-078",
      "HS-079",
      "HS-080",
      "PT-038"
    ],
    "upstream_feature_scope": "里程碑达成、交付物、阶段门",
    "source_lines": {
      "pages": 146,
      "brief": 445
    },
    "criteria": [
      "里程碑实际达成、必交材料审核、重大阻断异常校验",
      "不满足不能切阶段，通过留痕并按规则释放预算"
    ]
  },
  {
    "id": "HS-17",
    "title": "阶段交付物",
    "route": "/projects/:id/deliverables",
    "kind": "列表/文档",
    "roles": "项目经理、PMO",
    "phase": 6,
    "feature_ids": [
      "HS-020",
      "HS-021",
      "HS-022",
      "HS-023",
      "HS-075",
      "HS-076",
      "HS-077",
      "PT-015",
      "PT-016",
      "PT-017",
      "PT-018",
      "PT-019",
      "PT-020"
    ],
    "upstream_feature_scope": "阶段交付物上传、审核、归档",
    "source_lines": {
      "pages": 147,
      "brief": 446
    },
    "criteria": [
      "类型阶段模板、必交责任时点、文件名版本审核归档",
      "模拟上传不出网，必交审核未通过阻断阶段，质量检查整改关联"
    ]
  },
  {
    "id": "JS-01",
    "title": "内部验收",
    "route": "/projects/:id/internal-acceptance",
    "kind": "表单/评审",
    "roles": "项目经理、交付/技术/测试",
    "phase": 7,
    "feature_ids": [
      "JS-001",
      "JS-002",
      "JS-003",
      "JS-004",
      "JS-005"
    ],
    "upstream_feature_scope": "内部交付条件、质量检查、整改",
    "source_lines": {
      "pages": 148,
      "brief": 452
    },
    "criteria": [
      "内部功能性能安全文档条件和质量检查清单",
      "不通过生成整改复验轮次，条件不足不可通过"
    ]
  },
  {
    "id": "JS-02",
    "title": "供应商验收",
    "route": "/projects/:id/supplier-acceptance",
    "kind": "表单/评审",
    "roles": "采购、项目经理、专家",
    "phase": 7,
    "feature_ids": [
      "JS-006",
      "JS-007",
      "JS-008",
      "JS-009",
      "JS-010"
    ],
    "upstream_feature_scope": "履约验收、整改",
    "source_lines": {
      "pages": 149,
      "brief": 453
    },
    "criteria": [
      "采购外包供应商合同履约数量质量时间验收",
      "无供应商明确不适用；整改后复验，关联履约节点"
    ]
  },
  {
    "id": "JS-03",
    "title": "客户验收",
    "route": "/projects/:id/customer-acceptance",
    "kind": "表单/流程",
    "roles": "项目经理、项目主办部门",
    "phase": 7,
    "feature_ids": [
      "JS-011",
      "JS-012",
      "JS-013",
      "JS-014",
      "JS-015",
      "JS-016",
      "JS-017"
    ],
    "upstream_feature_scope": "验收准备、客户验收、整改、报告",
    "source_lines": {
      "pages": 150,
      "brief": 454
    },
    "criteria": [
      "准备材料客户会议验收问题结果及报告确认",
      "准备→待验收→整改→通过，轮次追加，累计金额校验"
    ]
  },
  {
    "id": "JS-04",
    "title": "项目报验",
    "route": "/projects/:id/report-acceptance",
    "kind": "表单",
    "roles": "项目经理",
    "phase": 7,
    "feature_ids": [
      "JS-016"
    ],
    "upstream_feature_scope": "报验类型、金额、分税点、验收材料",
    "source_lines": {
      "pages": 151,
      "brief": 455
    },
    "criteria": [
      "报验类型、本次/累计金额、分税点及验收材料",
      "金额按统一口径汇总，超合同规则阻断并解释"
    ]
  },
  {
    "id": "JS-05",
    "title": "项目结算申请",
    "route": "/projects/:id/settlement/apply",
    "kind": "表单",
    "roles": "项目主办部门、项目经理",
    "phase": 7,
    "feature_ids": [
      "JS-018",
      "JS-019",
      "JS-020",
      "JS-021"
    ],
    "upstream_feature_scope": "结算条件校验、结算提交",
    "source_lines": {
      "pages": 152,
      "brief": 456
    },
    "criteria": [
      "最终验收/待决成本/未重复结算三类校验与收支汇总",
      "全部通过才提交；提交冻结建设期成本入口"
    ]
  },
  {
    "id": "JS-06",
    "title": "项目结算详情",
    "route": "/projects/:id/settlement",
    "kind": "专题/审批",
    "roles": "财务、PMO、项目主办部门",
    "phase": 7,
    "feature_ids": [
      "JS-020",
      "JS-021",
      "JS-022",
      "JS-023",
      "JS-024",
      "JS-025",
      "JS-026"
    ],
    "upstream_feature_scope": "实际成本、收支核算、评审、整改",
    "source_lines": {
      "pages": 153,
      "brief": 457
    },
    "criteria": [
      "自动收支来源、财务核算、PMO评审、补充整改及版本",
      "确认冻结结果，保留补充前后材料，实施成本锁定"
    ]
  },
  {
    "id": "JS-07",
    "title": "四算对比分析",
    "route": "/projects/:id/four-calculations",
    "kind": "专题分析",
    "roles": "PMO、财务、管理层",
    "phase": 7,
    "feature_ids": [
      "JS-027",
      "JS-028",
      "JS-029",
      "JS-030",
      "JS-031"
    ],
    "upstream_feature_scope": "概算/预算/核算/结算横向对比",
    "source_lines": {
      "pages": 154,
      "brief": 458
    },
    "criteria": [
      "概算预算核算结算总额/科目/毛利/差异原因/版本",
      "使用冻结及有效快照，差异下钻科目/变更，未结算不填零"
    ]
  },
  {
    "id": "JS-08",
    "title": "项目经营结果",
    "route": "/projects/:id/business-result",
    "kind": "专题分析",
    "roles": "财务、经营管理、管理层",
    "phase": 7,
    "feature_ids": [
      "JS-032",
      "JS-033",
      "JS-034"
    ],
    "upstream_feature_scope": "毛利、收入、成本、回款、效益",
    "source_lines": {
      "pages": 155,
      "brief": 459
    },
    "criteria": [
      "收入成本毛利回款周期与经营目标达成",
      "财务口径和结算一致，回款计划/实收/逾期来源可查"
    ]
  },
  {
    "id": "JS-09",
    "title": "项目后评价",
    "route": "/projects/:id/post-evaluation",
    "kind": "表单/专题",
    "roles": "PMO、项目主办、项目经理",
    "phase": 7,
    "feature_ids": [
      "JS-035",
      "JS-036",
      "JS-037",
      "JS-038",
      "JS-039",
      "JS-040"
    ],
    "upstream_feature_scope": "目标达成、质量、成本、经验教训",
    "source_lines": {
      "pages": 156,
      "brief": 460
    },
    "criteria": [
      "目标质量成本风险变更复盘、铁三角人员评价与经验",
      "基于项目数据，权限内评分并留痕，经验与项目关联"
    ]
  },
  {
    "id": "JS-10",
    "title": "项目资料归档",
    "route": "/projects/:id/archive",
    "kind": "文档",
    "roles": "PMO、综合部、项目经理",
    "phase": 7,
    "feature_ids": [
      "JS-041"
    ],
    "upstream_feature_scope": "资料归档、经验沉淀",
    "source_lines": {
      "pages": 157,
      "brief": 461
    },
    "criteria": [
      "方案合同基线过程验收结算后评价目录完整性",
      "确认归档后正式文件只读，缺资料可回源补齐"
    ]
  },
  {
    "id": "JS-11",
    "title": "运维衔接",
    "route": "/projects/:id/operation-handover",
    "kind": "表单/详情",
    "roles": "项目经理、运维团队",
    "phase": 7,
    "feature_ids": [
      "JS-042",
      "JS-043",
      "JS-044"
    ],
    "upstream_feature_scope": "运维交接、服务期、责任人",
    "source_lines": {
      "pages": 158,
      "brief": 462
    },
    "criteria": [
      "运维判断、范围周期SLA团队资料遗留问题交接",
      "接收人确认后生效，建设与运维口径分离"
    ]
  },
  {
    "id": "JS-12",
    "title": "运维项目详情",
    "route": "/operations/:id",
    "kind": "详情",
    "roles": "运维团队、主办部门",
    "phase": 7,
    "feature_ids": [
      "JS-044",
      "JS-045",
      "JS-046",
      "JS-047",
      "JS-048"
    ],
    "upstream_feature_scope": "监控、问题、客户沟通、续约",
    "source_lines": {
      "pages": 159,
      "brief": 463
    },
    "criteria": [
      "运维监控服务故障客户沟通成本及SLA",
      "到期/续约/退出可模拟，新周期保留原项目合同关联"
    ]
  },
  {
    "id": "JS-13",
    "title": "项目关闭",
    "route": "/projects/:id/close",
    "kind": "表单/校验",
    "roles": "PMO、项目主管部门",
    "phase": 7,
    "feature_ids": [
      "JS-049",
      "JS-050"
    ],
    "upstream_feature_scope": "关闭条件、最终归档",
    "source_lines": {
      "pages": 160,
      "brief": 464
    },
    "criteria": [
      "后评价归档未结事项重大问题及运维状态检查",
      "阻断项不可关闭；通过只读并保留审计和最终归档"
    ]
  },
  {
    "id": "GL-01",
    "title": "项目经营驾驶舱",
    "route": "/executive/dashboard",
    "kind": "工作台/分析",
    "roles": "管理层、PMO",
    "phase": 2,
    "feature_ids": [
      "BI-001",
      "BI-002",
      "BI-003",
      "BI-004",
      "BI-005",
      "BI-006",
      "BI-007",
      "BI-008",
      "BI-009",
      "BI-014",
      "BI-015",
      "BI-016",
      "BI-017",
      "BI-029",
      "BI-030",
      "BI-031",
      "BI-032",
      "BI-033",
      "BI-034",
      "BI-035"
    ],
    "upstream_feature_scope": "全局项目规模、经营、健康度、异常与待决策事项",
    "source_lines": {
      "pages": 161,
      "brief": 470
    },
    "criteria": [
      "规模经营回款KPI、四阶段数量金额、健康度、分析Tabs、异常与待决策",
      "KPI→同筛选清单→项目→明细；六种数据状态、口径时间和返回上下文"
    ]
  },
  {
    "id": "GL-02",
    "title": "四算经营专题",
    "route": "/executive/four-calculations",
    "kind": "专题分析",
    "roles": "管理层、PMO、财务",
    "phase": 2,
    "feature_ids": [
      "BI-023",
      "BI-024",
      "BI-025",
      "BI-026",
      "BI-027",
      "BI-028"
    ],
    "upstream_feature_scope": "概算→预算→核算→结算、毛利与成本偏差",
    "source_lines": {
      "pages": 162,
      "brief": 471
    },
    "criteria": [
      "组合四算/毛利轨迹、预算核算结算差异、科目偏差",
      "比较相同样本及有效版本，未结算不当零，偏差可到项目来源"
    ]
  },
  {
    "id": "GL-03",
    "title": "项目穿透分析",
    "route": "/executive/project-drilldown",
    "kind": "专题分析",
    "roles": "管理层、PMO",
    "phase": 2,
    "feature_ids": [
      "BI-032",
      "BI-033",
      "BI-034",
      "BI-035"
    ],
    "upstream_feature_scope": "从集团/部门/指标下钻至项目及原始业务明细",
    "source_lines": {
      "pages": 163,
      "brief": 472
    },
    "criteria": [
      "组织/指标→项目清单→单项目→异常/成本/里程碑原始明细",
      "筛选权限和责任链贯通，返回恢复条件与滚动位置"
    ]
  },
  {
    "id": "GL-04",
    "title": "项目组合分析",
    "route": "/executive/portfolio",
    "kind": "专题分析",
    "roles": "管理层、PMO",
    "phase": 2,
    "feature_ids": [
      "BI-009",
      "BI-010",
      "BI-011",
      "BI-012",
      "BI-013"
    ],
    "upstream_feature_scope": "按组织、区域、类型、等级、客户、行业分析项目组合",
    "source_lines": {
      "pages": 164,
      "brief": 473
    },
    "criteria": [
      "组织区域类型等级行业客户等组合数量金额成本毛利健康回款",
      "集团→业务群→部门→项目，项目去重且比率按金额汇总"
    ]
  },
  {
    "id": "GL-05",
    "title": "项目异常中心",
    "route": "/executive/exceptions",
    "kind": "台账/分析",
    "roles": "管理层、PMO",
    "phase": 2,
    "feature_ids": [
      "BI-014",
      "BI-015",
      "BI-016",
      "BI-017",
      "BI-018",
      "BI-019",
      "BI-020",
      "BI-021",
      "BI-022"
    ],
    "upstream_feature_scope": "高风险、进度、成本、毛利、回款、未签投入异常",
    "source_lines": {
      "pages": 165,
      "brief": 474
    },
    "criteria": [
      "七种异常Tabs，项目金额组织阶段健康原因首次触发时长偏差责任人",
      "可看项目/原因/明细/责任链，继承筛选且不直接改业务"
    ]
  },
  {
    "id": "GL-06",
    "title": "领导待决策事项",
    "route": "/executive/decisions",
    "kind": "工作台/列表",
    "roles": "管理层、PMO",
    "phase": 2,
    "feature_ids": [
      "BI-029",
      "BI-030",
      "BI-031"
    ],
    "upstream_feature_scope": "重大变更、超概算、重大风险、未签超限、验收结算异常",
    "source_lines": {
      "pages": 166,
      "brief": 475
    },
    "criteria": [
      "重大变更预算风险未签验收结算事项及影响节点等待建议",
      "只聚合原事项，进入原审批处理后数量同步，不复制审批"
    ]
  },
  {
    "id": "CF-01",
    "title": "交付物模板配置",
    "route": "/settings/deliverables",
    "kind": "配置",
    "roles": "PMO/管理员",
    "phase": 8,
    "feature_ids": [
      "PT-015",
      "PT-016",
      "PT-017",
      "PT-018",
      "PT-019",
      "PT-020",
      "PT-041",
      "PT-042",
      "PT-043"
    ],
    "upstream_feature_scope": "项目类型、阶段、必交文档配置",
    "source_lines": {
      "pages": 167,
      "brief": 481
    },
    "criteria": [
      "项目类型阶段必交文档及评审/后评价模板、版本发布",
      "修改形成版本，已生成历史目录不被覆盖，必交规则受控"
    ]
  },
  {
    "id": "CF-02",
    "title": "项目分级规则",
    "route": "/settings/project-grading",
    "kind": "配置",
    "roles": "PMO/管理员",
    "phase": 8,
    "feature_ids": [
      "PT-034",
      "PT-035",
      "PT-037",
      "PT-038"
    ],
    "upstream_feature_scope": "项目金额、战略属性、风险分级",
    "source_lines": {
      "pages": 168,
      "brief": 482
    },
    "criteria": [
      "金额战略风险等级、毛利/未签/预算释放演示规则及审批路径",
      "启停生效时间/版本完整，业务判定读取规则并展示原因"
    ]
  },
  {
    "id": "CF-03",
    "title": "审批规则配置",
    "route": "/settings/approval-rules",
    "kind": "配置",
    "roles": "PMO/管理员",
    "phase": 8,
    "feature_ids": [
      "PT-012",
      "PT-013",
      "PT-014",
      "PT-036"
    ],
    "upstream_feature_scope": "会签、PMO、PMC、管理层路径",
    "source_lines": {
      "pages": 169,
      "brief": 483
    },
    "criteria": [
      "业务条件流程节点、会签/或签、时限、启停和版本",
      "变更规则不改写历史审批，演示路径能命中并解释"
    ]
  },
  {
    "id": "CF-04",
    "title": "四算科目与映射",
    "route": "/settings/cost-mapping",
    "kind": "配置",
    "roles": "财务/管理员",
    "phase": 8,
    "feature_ids": [
      "HS-056",
      "PT-040"
    ],
    "upstream_feature_scope": "概算、预算、核算、结算科目映射",
    "source_lines": {
      "pages": 170,
      "brief": 484
    },
    "criteria": [
      "四算统一叶子科目、来源映射及版本",
      "已用科目不能物理删，父子不重复计费，历史映射留存"
    ]
  },
  {
    "id": "CF-05",
    "title": "成本基准配置",
    "route": "/settings/cost-baseline",
    "kind": "配置",
    "roles": "财务/人资/管理员",
    "phase": 8,
    "feature_ids": [
      "HS-043",
      "YS-032"
    ],
    "upstream_feature_scope": "人力成本、费用标准等",
    "source_lines": {
      "pages": 171,
      "brief": 485
    },
    "criteria": [
      "职级/岗位/地域人力单价及费用标准版本生效时间",
      "基准变更不回写历史工时预算，敏感单价权限受控"
    ]
  },
  {
    "id": "CF-06",
    "title": "预警规则配置",
    "route": "/settings/alerts",
    "kind": "配置",
    "roles": "PMO/管理员",
    "phase": 8,
    "feature_ids": [
      "PT-026",
      "PT-027",
      "PT-028",
      "PT-029",
      "PT-030",
      "PT-031",
      "PT-032",
      "PT-033",
      "PT-039"
    ],
    "upstream_feature_scope": "里程碑、成本、未签、风险等提醒",
    "source_lines": {
      "pages": 172,
      "brief": 486
    },
    "criteria": [
      "预警类型条件提前天数责任升级渠道启停版本",
      "标注演示规则，修改会影响演示预警，消息不真实发送"
    ]
  },
  {
    "id": "CF-07",
    "title": "项目权限配置",
    "route": "/settings/permissions",
    "kind": "配置",
    "roles": "管理员",
    "phase": 8,
    "feature_ids": [
      "PT-044",
      "PT-045",
      "PT-046",
      "PT-047",
      "PT-048",
      "PT-049"
    ],
    "upstream_feature_scope": "项目角色、数据范围、敏感字段",
    "source_lines": {
      "pages": 173,
      "brief": 487
    },
    "criteria": [
      "角色菜单页面按钮组织项目关系敏感字段权限",
      "角色切换实际反映范围与字段，历史责任保留；不宣称后端安全"
    ]
  },
  {
    "id": "CF-08",
    "title": "操作审计日志",
    "route": "/settings/audit-log",
    "kind": "查询",
    "roles": "管理员/审计",
    "phase": 8,
    "feature_ids": [
      "PT-050",
      "PT-051",
      "PT-052",
      "PT-053"
    ],
    "upstream_feature_scope": "关键数据及流程操作留痕",
    "source_lines": {
      "pages": 174,
      "brief": 488
    },
    "criteria": [
      "操作人时间对象动作前后值流程轨迹筛选",
      "关键业务动作产生日志，正式历史不可删，敏感字段脱敏"
    ]
  }
];

export const PAGE_MAP = new Map<string, RouteItem>(
  PAGE_MANIFEST.map((item) => [item.id, item])
);
