# Solo Loop 轮次与状态机协议

## 1. 状态机流转

项目采用单一且透明的状态机管理进度：

```
[ pending (未开始) ]
       │
       ▼ (loop.py begin --items PAGE_1 PAGE_2)
[ active (当轮进行中) ]
       │
       ▼ (开发、修复、编写测试)
[ checking (loop.py check) ]
       │
       ├── 测试失败 ──> 修复并重跑
       │
       ▼ (测试全部通过)
[ accept (loop.py accept) ]
       │
       ▼
[ done (已验收完成) ]
```

---

## 2. 轮次目录规范

每次 `begin` 会在 `.pms-loop/runs/Rxxxx/` 下创建轮次归档：
- `plan.json`：本轮包含的页面 ID 及其需求摘要。
- `evidence.json`：自动记录自动化测试结果、检查项状态及时间戳。

---

## 3. 回归与重开机制

若后续修改公共模块导致已验收页面失效，可随时使用：
```bash
python3 skills/pms-solo-loop/scripts/loop.py --root . reopen --items PAGE_ID --reason "xxx"
```
将其状态重置为 `pending`，以便重新纳入后续轮次修复并验证。
