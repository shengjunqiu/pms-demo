# 项目原型开发进度

<!-- pms-loop:begin -->
## Loop 当前进度

已验收：**0 / 72 页面**

状态：`in_progress`；更新时间：2026-09-09T15:06:13+00:00

| 模块 | 已验收 | 待办/活动/阻塞 |
|---|---:|---|
| WK | 0/2 | WK-01(pending)、WK-02(pending) |
| GS | 0/11 | GS-01(pending)、GS-02(pending)、GS-03(pending)、GS-04(pending)、GS-05(pending)、GS-06(pending)、GS-07(pending)、GS-08(pending)、GS-09(pending)、GS-10(pending)、GS-11(pending) |
| YS | 0/15 | YS-01(pending)、YS-02(pending)、YS-03(pending)、YS-04(pending)、YS-05(pending)、YS-06(pending)、YS-07(pending)、YS-08(pending)、YS-09(pending)、YS-10(pending)、YS-11(pending)、YS-12(pending)、YS-13(pending)、YS-14(pending)、YS-15(pending) |
| HS | 0/17 | HS-01(pending)、HS-02(pending)、HS-03(pending)、HS-04(pending)、HS-05(pending)、HS-06(pending)、HS-07(pending)、HS-08(pending)、HS-09(pending)、HS-10(pending)、HS-11(pending)、HS-12(pending)、HS-13(pending)、HS-14(pending)、HS-15(pending)、HS-16(pending)、HS-17(pending) |
| JS | 0/13 | JS-01(pending)、JS-02(pending)、JS-03(pending)、JS-04(pending)、JS-05(pending)、JS-06(pending)、JS-07(pending)、JS-08(pending)、JS-09(pending)、JS-10(pending)、JS-11(pending)、JS-12(pending)、JS-13(pending) |
| GL | 0/6 | GL-01(pending)、GL-02(pending)、GL-03(pending)、GL-04(pending)、GL-05(pending)、GL-06(pending) |
| CF | 0/8 | CF-01(pending)、CF-02(pending)、CF-03(pending)、CF-04(pending)、CF-05(pending)、CF-06(pending)、CF-07(pending)、CF-08(pending) |

公共能力：FND-01=done；FND-02=pending

活动轮次：无

### 最近轮次与验证

- R0001：FND-01；accepted；证据目录 `.pms-loop/runs/R0001/`
  验证：typecheck=pass，lint=pass，build=pass
- R0002：FND-02；accepted；证据目录 `.pms-loop/runs/R0002/`
  验证：typecheck=pass，lint=pass，build=pass，test:domain=pass
- R0003：GL-01, GL-02, GL-03, GL-04, GL-05；deferred；证据目录 `.pms-loop/runs/R0003/`
  验证：typecheck=pass，lint=pass，build=pass，test:domain=pass
- R0004：FND-01；accepted；证据目录 `.pms-loop/runs/R0004/`
  验证：typecheck=pass，lint=pass，build=pass

### 假设、已知问题与恢复说明

- 2026-09-09T15:01:06+00:00：R0003阻塞: 恢复验证发现 FND-02 数据不变量失败：未签金额计入合同、流水与摘要不符、版本科目合计不符、来源商机复用；先修复基础层再恢复 GL 验收。
- 2026-09-09T15:01:06+00:00：reopen CF-01, CF-02, CF-03, CF-04, CF-05, CF-06, CF-07, CF-08, FINAL, FND-01, FND-02, GL-01, GL-02, GL-03, GL-04, GL-05, GL-06, GS-01, GS-02, GS-03, GS-04, GS-05, GS-06, GS-07, GS-08, GS-09, GS-10, GS-11, HS-01, HS-02, HS-03, HS-04, HS-05, HS-06, HS-07, HS-08, HS-09, HS-10, HS-11, HS-12, HS-13, HS-14, HS-15, HS-16, HS-17, JS-01, JS-02, JS-03, JS-04, JS-05, JS-06, JS-07, JS-08, JS-09, JS-10, JS-11, JS-12, JS-13, WK-01, WK-02, YS-01, YS-02, YS-03, YS-04, YS-05, YS-06, YS-07, YS-08, YS-09, YS-10, YS-11, YS-12, YS-13, YS-14, YS-15: 新增回归测试复现四类数据契约失败，旧验收证据不足。

完整任务状态、历史和证据索引见 `.pms-loop/state.json`。
<!-- pms-loop:end -->
