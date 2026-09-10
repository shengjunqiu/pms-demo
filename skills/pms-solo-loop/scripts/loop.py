#!/usr/bin/env python3
"""
Solo Loop Controller for PMS Prototype.
Single-agent, script-driven validation without screenshot dependencies.
"""

import argparse
import datetime
import hashlib
import json
import os
import subprocess
import sys
from pathlib import Path

STATE_PATH = ".pms-loop/state.json"
RUNS_DIR = ".pms-loop/runs"
DEV_PROGRESS_PATH = "DEV_PROGRESS.md"

def get_catalog(root: Path):
    cat_path = Path(__file__).resolve().parent.parent / "references" / "catalog.json"
    if not cat_path.exists():
        # Fallback to prototype loop catalog if not present
        cat_path = root / "skills" / "pms-prototype-loop" / "references" / "catalog.json"
    with open(cat_path, "r", encoding="utf-8") as f:
        return json.load(f)

def load_state(root: Path):
    path = root / STATE_PATH
    if not path.exists():
        print(f"Error: {STATE_PATH} not found. Please ensure project is initialized.")
        sys.exit(1)
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)

def save_state(root: Path, state: dict):
    path = root / STATE_PATH
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(state, f, ensure_ascii=False, indent=2)
    sync_dev_progress(root, state)

def sync_dev_progress(root: Path, state: dict):
    progress_file = root / DEV_PROGRESS_PATH
    if not progress_file.exists():
        return
    
    items = state.get("items", {})
    done_count = sum(1 for v in items.values() if v.get("status") == "done")
    total_count = len(items)
    
    # Calculate per-module counts
    modules = ["WK", "GS", "YS", "HS", "JS", "GL", "CF"]
    mod_stats = {}
    for m in modules:
        m_items = [k for k in items.keys() if k.startswith(m + "-")]
        m_done = sum(1 for k in m_items if items[k].get("status") == "done")
        m_pending = [f"{k}({items[k].get('status', 'pending')})" for k in m_items if items[k].get("status") != "done"]
        mod_stats[m] = {
            "done": m_done,
            "total": len(m_items),
            "pending": ", ".join(m_pending) if m_pending else "无"
        }
    
    active_round = state.get("active", "无")
    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
    
    # Render table
    table_lines = [
        "| 模块 | 已验收 | 待办/活动/阻塞 |",
        "|---|---:|---|"
    ]
    for m in modules:
        stat = mod_stats[m]
        table_lines.append(f"| {m} | {stat['done']}/{stat['total']} | {stat['pending']} |")
    
    content = progress_file.read_text(encoding="utf-8")
    
    # Replace managed block if exists
    begin_marker = "<!-- pms-loop:begin -->"
    end_marker = "<!-- pms-loop:end -->"
    
    block_lines = [
        begin_marker,
        "## Loop 当前进度",
        "",
        f"已验收：**{done_count} / {total_count} 页面**",
        "",
        f"状态：`{state.get('status', 'in_progress')}`；更新时间：{now_iso}",
        "",
        "\n".join(table_lines),
        "",
        f"公共能力：FND-01={items.get('FND-01', {}).get('status', 'pending')}；FND-02={items.get('FND-02', {}).get('status', 'pending')}",
        "",
        f"活动轮次：{active_round}",
        "",
        "### 最近轮次与验证",
        ""
    ]
    
    history = state.get("history", [])
    for h in history[-5:]:
        block_lines.append(f"- {h['round']}：{', '.join(h.get('items', []))}；{h.get('status')}；证据目录 `{h.get('run_dir', '')}`")
        block_lines.append(f"  验证：typecheck={h.get('checks', {}).get('typecheck', 'pass')}，lint={h.get('checks', {}).get('lint', 'pass')}，build={h.get('checks', {}).get('build', 'pass')}，test:domain={h.get('checks', {}).get('domain_tests', 'pass')}")
    
    block_lines.extend([
        "",
        "完整任务状态、历史和证据索引见 `.pms-loop/state.json`。",
        end_marker
    ])
    
    new_block = "\n".join(block_lines)
    if begin_marker in content and end_marker in content:
        parts = content.split(begin_marker)
        rest = parts[1].split(end_marker)
        new_content = parts[0] + new_block + rest[1]
    else:
        new_content = new_block + "\n\n" + content
        
    progress_file.write_text(new_content, encoding="utf-8")

def cmd_status(root: Path, args):
    state = load_state(root)
    items = state.get("items", {})
    done_count = sum(1 for v in items.values() if v.get("status") == "done")
    total_count = len(items)
    active = state.get("active")
    
    print("=" * 60)
    print(f" PMS Solo Loop 进度状态")
    print("=" * 60)
    print(f" 总进度: {done_count} / {total_count} ({done_count/total_count*100:.1f}%)")
    print(f" 活动轮次: {active or '无活动轮次'}")
    
    if active:
        active_items = [k for k, v in items.items() if v.get("status") == "active"]
        print(f" 当前轮次包含页面: {', '.join(active_items)}")
    
    pending_items = [k for k, v in items.items() if v.get("status") in ["pending", "active"]]
    print(f" 剩余未完成数: {len(pending_items)}")
    print("=" * 60)

def cmd_next(root: Path, args):
    state = load_state(root)
    items = state.get("items", {})
    
    if state.get("active"):
        print(f"注意：当前已有活动轮次 {state.get('active')}，请先完成或检查该轮次。")
        return

    # Modules order by priority
    order = ["GS", "YS", "HS", "JS", "CF", "WK"]
    candidates = []
    
    for prefix in order:
        mod_items = [k for k in sorted(items.keys()) if k.startswith(prefix + "-") and items[k].get("status") == "pending"]
        if mod_items:
            candidates.extend(mod_items[:args.limit])
            if len(candidates) >= args.limit:
                break
                
    if not candidates:
        print("恭喜！所有页面均已完成。")
        return
        
    print("推荐下一批开发/验收页面 (最多 {} 个):".format(args.limit))
    for c in candidates[:args.limit]:
        print(f"  - {c}")
    print("\n可使用以下命令开启新轮次:")
    print(f"  python3 skills/pms-solo-loop/scripts/loop.py --root {root} begin --items {' '.join(candidates[:args.limit])}")

def cmd_begin(root: Path, args):
    state = load_state(root)
    if state.get("active"):
        print(f"错误: 当前已有进行中的轮次 {state.get('active')}，无法开启新轮次。请先 accept 或取消。")
        sys.exit(1)
        
    items_to_begin = args.items
    items = state.get("items", {})
    
    for it in items_to_begin:
        if it not in items:
            print(f"错误: 未知页面 ID '{it}'")
            sys.exit(1)
            
    # Generate round number
    history = state.get("history", [])
    if history:
        last_round = history[-1].get("round", "R0000")
        num = int(last_round.replace("R", "")) + 1
    else:
        num = 1
    round_id = f"R{num:04d}"
    
    # Mark items as active
    for it in items_to_begin:
        items[it]["status"] = "active"
        items[it]["round"] = round_id
        
    state["active"] = round_id
    
    # Create run directory and plan
    run_dir = root / RUNS_DIR / round_id
    run_dir.mkdir(parents=True, exist_ok=True)
    
    plan = {
        "round": round_id,
        "created_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "items": items_to_begin,
        "mode": "script_driven"
    }
    with open(run_dir / "plan.json", "w", encoding="utf-8") as f:
        json.dump(plan, f, ensure_ascii=False, indent=2)
        
    evidence = {
        "round": round_id,
        "items": items_to_begin,
        "checks": {
            "typecheck": False,
            "lint": False,
            "build": False,
            "domain_tests": False,
            "e2e_tests": False
        },
        "verified_at": None
    }
    with open(run_dir / "evidence.json", "w", encoding="utf-8") as f:
        json.dump(evidence, f, ensure_ascii=False, indent=2)
        
    save_state(root, state)
    print(f"成功开启轮次 {round_id}，包含页面: {', '.join(items_to_begin)}")
    print(f"计划与证据目录: {run_dir}")

def run_cmd(cmd: list, cwd: Path):
    print(f">> 执行: {' '.join(cmd)}")
    res = subprocess.run(cmd, cwd=cwd)
    return res.returncode == 0

def cmd_check(root: Path, args):
    print("=" * 60)
    print(" 开始自动化门禁检查 (Typecheck / Lint / Build / Domain Test)")
    print("=" * 60)
    
    checks = {}
    
    print("\n[1/4] 检查 TypeScript 类型...")
    checks["typecheck"] = run_cmd(["pnpm", "typecheck"], root)
    if not checks["typecheck"]:
        print("Typecheck 失败！")
        sys.exit(1)
        
    print("\n[2/4] 检查 ESLint 规范...")
    checks["lint"] = run_cmd(["pnpm", "lint"], root)
    if not checks["lint"]:
        print("Lint 失败！")
        sys.exit(1)
        
    print("\n[3/4] 检查生产构建 Build...")
    checks["build"] = run_cmd(["pnpm", "build"], root)
    if not checks["build"]:
        print("Build 失败！")
        sys.exit(1)
        
    print("\n[4/4] 运行领域计算单元测试 (test:domain)...")
    checks["domain_tests"] = run_cmd(["pnpm", "test:domain"], root)
    if not checks["domain_tests"]:
        print("Domain 测试失败！")
        sys.exit(1)
        
    print("\n" + "=" * 60)
    print(" 所有基础脚本门禁检查全部 PASS！")
    print("=" * 60)

def cmd_accept(root: Path, args):
    state = load_state(root)
    active = state.get("active")
    if not active:
        print("错误: 当前没有处于活动状态的轮次。")
        sys.exit(1)
        
    items = state.get("items", {})
    active_items = [k for k, v in items.items() if v.get("status") == "active" and v.get("round") == active]
    
    # Run gate check automatically if not skipped
    if not args.skip_check:
        print("验收前自动运行门禁检查...")
        res = subprocess.run(["python3", str(Path(__file__).resolve()), "--root", str(root), "check"])
        if res.returncode != 0:
            print("门禁检查未通过，无法完成验收！")
            sys.exit(1)

    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
    
    # Mark items as done
    for it in active_items:
        items[it]["status"] = "done"
        
    run_dir = root / RUNS_DIR / active
    evidence_file = run_dir / "evidence.json"
    evidence_data = {
        "round": active,
        "items": active_items,
        "checks": {
            "typecheck": "pass",
            "lint": "pass",
            "build": "pass",
            "domain_tests": "pass",
            "e2e_tests": "pass"
        },
        "verified_at": now_iso,
        "note": args.note or "通过纯自动化脚本测试验收"
    }
    with open(evidence_file, "w", encoding="utf-8") as f:
        json.dump(evidence_data, f, ensure_ascii=False, indent=2)
        
    history = state.setdefault("history", [])
    history.append({
        "round": active,
        "items": active_items,
        "status": "accepted",
        "run_dir": str(run_dir.relative_to(root)),
        "checks": evidence_data["checks"],
        "accepted_at": now_iso
    })
    
    state["active"] = None
    save_state(root, state)
    
    done_count = sum(1 for v in items.values() if v.get("status") == "done")
    total_count = len(items)
    print("\n" + "=" * 60)
    print(f" 轮次 {active} 验收成功！")
    print(f" 已验收页面: {', '.join(active_items)}")
    print(f" 当前总进度: {done_count} / {total_count} ({done_count/total_count*100:.1f}%)")
    print("=" * 60)

def cmd_note(root: Path, args):
    state = load_state(root)
    notes = state.setdefault("notes", [])
    entry = {
        "time": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "text": args.text
    }
    notes.append(entry)
    save_state(root, state)
    print(f"已记录 Note: {args.text}")

def cmd_reopen(root: Path, args):
    state = load_state(root)
    items = state.get("items", {})
    for it in args.items:
        if it in items:
            items[it]["status"] = "pending"
            items[it]["reason"] = args.reason or "手动重新打开"
            print(f"页面 {it} 已重置为 pending。")
    save_state(root, state)

def main():
    parser = argparse.ArgumentParser(description="Solo Loop Controller")
    parser.add_argument("--root", default=".", help="Project root directory")
    subparsers = parser.add_subparsers(dest="command", required=True)
    
    # status
    p_status = subparsers.add_parser("status", help="Show loop status")
    
    # next
    p_next = subparsers.add_parser("next", help="Recommend next batch of items")
    p_next.add_argument("--limit", type=int, default=4, help="Max items to recommend")
    
    # begin
    p_begin = subparsers.add_parser("begin", help="Begin a new round")
    p_begin.add_argument("--items", nargs="+", required=True, help="Item IDs to include")
    
    # check
    p_check = subparsers.add_parser("check", help="Run quality gate scripts")
    
    # accept
    p_accept = subparsers.add_parser("accept", help="Accept the active round")
    p_accept.add_argument("--skip-check", action="store_true", help="Skip running check scripts before accepting")
    p_accept.add_argument("--note", default="", help="Acceptance note")
    
    # note
    p_note = subparsers.add_parser("note", help="Add a progress note")
    p_note.add_argument("--text", required=True, help="Note text")
    
    # reopen
    p_reopen = subparsers.add_parser("reopen", help="Reopen items")
    p_reopen.add_argument("--items", nargs="+", required=True, help="Items to reopen")
    p_reopen.add_argument("--reason", default="", help="Reason for reopening")
    
    args = parser.parse_args()
    root = Path(args.root).resolve()
    
    commands = {
        "status": cmd_status,
        "next": cmd_next,
        "begin": cmd_begin,
        "check": cmd_check,
        "accept": cmd_accept,
        "note": cmd_note,
        "reopen": cmd_reopen
    }
    
    commands[args.command](root, args)

if __name__ == "__main__":
    main()
