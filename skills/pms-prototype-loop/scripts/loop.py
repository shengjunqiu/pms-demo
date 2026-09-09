#!/usr/bin/env python3
"""Local, evidence-gated PMS task controller. Python 3.10+, standard library only."""
from __future__ import annotations

import argparse
from contextlib import contextmanager
from datetime import datetime, timezone
import fcntl
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import signal
import struct
import subprocess
import sys
import tempfile
import time

CATALOG = Path(__file__).resolve().parent.parent / 'references/catalog.json'
START = '<!-- pms-loop:begin -->'
END = '<!-- pms-loop:end -->'
GROUPS = {'WK': 2, 'GS': 11, 'YS': 15, 'HS': 17, 'JS': 13, 'GL': 6, 'CF': 8}
BASE_CHECKS = {
    'traceability': '原文功能范围与页面独有要求落实，注明原文定位',
    'navigation': '路由、导航/关联入口、下钻与返回上下文可用',
    'content': '真实感中文数据、字段、状态、规则，无占位内容',
    'interaction': '关键动作有正确且可观察的业务结果',
    'data': '跨页面实体、金额、数量和筛选口径一致',
    'states': '加载、空态、无权限及适用的异常状态可演示',
    'visual': '已查看1440×900、1280×900截图，无明显破版',
    'console': '实际检查浏览器控制台，无错误及严重警告',
}
FOUNDATIONS = {
    'FND-01': {
        'id': 'FND-01', 'title': '工程与设计系统', 'phase': 0,
        'criteria': ['技术栈、包管理器、开发及检查命令完整',
                     '布局、中文主题、72页Route Manifest、角色切换与统一加载/空态完成；路由占位不算页面完成'],
    },
    'FND-02': {
        'id': 'FND-02', 'title': '统一 Mock 与业务计算', 'phase': 1,
        'criteria': ['31类数据达到最低量、ID唯一、关联完整、固定seed/asOf可重现',
                     '8个固定故事及健康度/数量可从关联明细复算',
                     '四算科目、互斥成本桶、零分母及组合聚合通过不变量测试',
                     '版本、审批、阶段门、权限和成本锁定模拟具有实际状态变化'],
    },
}
FINAL_CHECKS = {
    'page-coverage': '72页可达且逐页交互/状态完整，未用通用空壳冒充',
    'visual-quality': '全局高保真视觉一致，1440/1280检查与修复完成',
    'mock-contract': '最低数据量、8故事、四算、权限与聚合不变量通过',
    'interactions': '菜单、面包屑、表格、表单、Drawer/Modal、下钻和返回可用',
    'journeys': '五条业务链路及项目经理/领导两条路线完整演示',
    'roles': '六种模拟身份的首页、菜单、数据与字段范围验证',
    'console': '全量浏览器检查无明显错误和严重警告',
    'documentation': 'README、进度、任务书、路由说明、Mock说明齐全',
    'feature-scope': '317个业务/公共/BI功能映射已核对；20项集成/NFR的模拟或边界已说明',
}
JOURNEYS = ('estimate', 'budget', 'accounting', 'settlement', 'leadership', 'manager-demo', 'executive-demo')
ROLES = ('executive', 'pmo', 'project-manager', 'market', 'finance', 'solution-tech')
EXCLUDED_DIRS = {'.git', '.agents', '.codex', '.pms-loop', 'skills', 'node_modules',
                 'dist', 'build', 'coverage', 'playwright-report', 'test-results',
                 'output', 'artifacts', '__pycache__', '.vite', '.cache'}


class LoopError(Exception):
    pass


def require(condition, message):
    if not condition:
        raise LoopError(message)


def now():
    return datetime.now(timezone.utc).isoformat(timespec='seconds')


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def read_json(path):
    try:
        return json.loads(path.read_text(encoding='utf-8'))
    except (OSError, ValueError) as exc:
        raise LoopError(f'无法读取JSON {path}: {exc}') from exc


def atomic_write(path, content):
    path.parent.mkdir(parents=True, exist_ok=True)
    require(not path.is_symlink(), f'不覆盖符号链接: {path}')
    fd, temp = tempfile.mkstemp(prefix=path.name + '.', dir=path.parent)
    try:
        with os.fdopen(fd, 'w', encoding='utf-8') as stream:
            stream.write(content)
        os.replace(temp, path)
    finally:
        if os.path.exists(temp):
            os.unlink(temp)


def write_json(path, value):
    atomic_write(path, json.dumps(value, ensure_ascii=False, indent=2) + '\n')


def local_path(root, relative, exists=False):
    require(isinstance(relative, str) and relative.strip(), '证据/文件路径不能为空')
    candidate = Path(relative)
    require(not candidate.is_absolute(), f'需要项目相对路径: {relative}')
    resolved = (root / candidate).resolve()
    require(resolved.is_relative_to(root), f'路径超出项目目录: {relative}')
    if exists:
        require(resolved.is_file() and resolved.stat().st_size > 0, f'文件不存在或为空: {relative}')
    return resolved


def load_catalog(path=None):
    value = read_json(path or CATALOG)
    pages = value.get('pages', [])
    expected = {f'{g}-{n:02d}' for g, count in GROUPS.items() for n in range(1, count + 1)}
    require(len(pages) == 72 and {p['id'] for p in pages} == expected, '目录必须且只能包含72个约定页面ID')
    require(len({p['route'] for p in pages}) == 72, '建议路由重复')
    require(len(value.get('features', {})) == 337, '功能目录数量应为337')
    require(len(value.get('mock_minimums', {})) == 31, 'Mock最低数量表应包含31类')
    for page in pages:
        require(page.get('criteria') and page.get('feature_ids'), f'{page["id"]}缺验收项或功能映射')
        require(set(page['feature_ids']) <= value['features'].keys(), f'{page["id"]}引用未知功能')
    return value


def inspect_sources(root, catalog):
    issues = []
    for alias, source in catalog['sources'].items():
        path = local_path(root, source['path'])
        if not path.is_file():
            issues.append(f'{alias}: 缺少 {source["path"]}')
        elif digest(path) != source['sha256']:
            issues.append(f'{alias}: 原文已变化，请先阅读差异并更新技能目录/契约: {source["path"]}')
    require(not issues, '\n'.join(issues))


def revision(root):
    """Hash application inputs, not generated reports, credentials or loop/skill files."""
    result = hashlib.sha256()
    for parent, directories, files in os.walk(root, followlinks=False):
        directories[:] = sorted(d for d in directories if d not in EXCLUDED_DIRS)
        for directory in directories:
            require(not (Path(parent) / directory).is_symlink(), f'源码目录不能是符号链接: {directory}')
        for name in sorted(files):
            if (name in {'DEV_PROGRESS.md', '.DS_Store', '.eslintcache'} or name.startswith('.env')
                    or name.endswith(('.log', '.tsbuildinfo', '.pyc'))):
                continue
            path = Path(parent) / name
            require(not path.is_symlink(), f'源码文件不能是符号链接: {path}')
            relative = path.relative_to(root).as_posix()
            result.update(relative.encode() + b'\0' + path.read_bytes() + b'\0')
    return result.hexdigest()


def specs(catalog):
    return {**FOUNDATIONS, **{p['id']: p for p in catalog['pages']},
            'FINAL': {'id': 'FINAL', 'title': '全量验收与交付', 'phase': 9, 'criteria': []}}


def checks_for(item):
    key = item['id']
    if key == 'FINAL':
        return FINAL_CHECKS
    common = {} if key == 'FND-02' else BASE_CHECKS
    return {**common, **{f'business-{i}': text for i, text in enumerate(item['criteria'], 1)}}


def evidence_template(run, catalog, rev=None):
    definitions = specs(catalog)
    items = {}
    for key in run['items']:
        item = definitions[key]
        items[key] = {
            'entry': '', 'covered_features': [],
            'checks': {k: {'requirement': text, 'passed': False, 'observation': ''}
                       for k, text in checks_for(item).items()},
            'scenarios': [{'action': '', 'expected': '', 'observed': ''}],
            'artifacts': [],
        }
        if key not in {'FND-02', 'FINAL'}:
            items[key]['screenshots'] = {'1440': '', '1280': ''}
        if key == 'FINAL':
            items[key]['route_report'] = ''
            items[key]['documents'] = {'readme': 'README.md', 'routes': '', 'mock': ''}
    return {'schema_version': 1, 'round': run['id'], 'revision': rev, 'items': items}


def load_state(root, catalog, allow_catalog_change=False):
    state = read_json(root / '.pms-loop/state.json')
    require(state.get('schema_version') == 1, '不支持的状态版本')
    require(set(state.get('items', {})) == set(specs(catalog)), '状态任务集合与技能目录不一致，需要人工迁移')
    if not allow_catalog_change:
        require(state.get('catalog_sha256') == digest(CATALOG), '技能目录已变化：先审查，再执行reconcile')
    return state


def effective_status(root, state):
    if state.get('status') == 'complete' and state.get('completion_revision') != revision(root):
        return 'needs_revalidation'
    return state['status']


def save(root, state, catalog):
    path = root / 'DEV_PROGRESS.md'
    require(not path.is_symlink(), 'DEV_PROGRESS不能是符号链接')
    old = path.read_text(encoding='utf-8') if path.exists() else '# 项目原型开发进度\n'
    require(old.count(START) == old.count(END) and old.count(START) <= 1, 'DEV_PROGRESS受管标记不完整，请先修复；不覆盖原文')
    if START in old:
        require(old.index(START) < old.index(END), 'DEV_PROGRESS标记顺序错误')
    completed = sum(state['items'][p['id']]['status'] == 'done' for p in catalog['pages'])
    lines = [START, '## Loop 当前进度', '', f'已验收：**{completed} / 72 页面**', '',
             f'状态：`{state["status"]}`；更新时间：{now()}', '',
             '| 模块 | 已验收 | 待办/活动/阻塞 |', '|---|---:|---|']
    for group, count in GROUPS.items():
        keys = [p['id'] for p in catalog['pages'] if p['id'].startswith(group + '-')]
        done = sum(state['items'][k]['status'] == 'done' for k in keys)
        remaining = '、'.join(k + '(' + state['items'][k]['status'] + ')' for k in keys if state['items'][k]['status'] != 'done') or '无'
        lines.append(f'| {group} | {done}/{count} | {remaining} |')
    lines += ['', '公共能力：' + '；'.join(k + '=' + state['items'][k]['status'] for k in FOUNDATIONS), '',
              '活动轮次：' + (state['active'] or '无'), '', '### 最近轮次与验证', '']
    for run in state['runs'][-5:]:
        lines.append(f'- {run["id"]}：{", ".join(run["items"])}；{run["status"]}；证据目录 `.pms-loop/runs/{run["id"]}/`')
        if run.get('checks'):
            lines.append('  验证：' + '，'.join(f'{k}={v}' for k, v in run['checks'].items()))
    lines += ['', '### 假设、已知问题与恢复说明', '']
    lines += [f'- {v["at"]}：{v["text"]}' for v in state['notes'][-10:]] or ['- 暂无。']
    lines += ['', '完整任务状态、历史和证据索引见 `.pms-loop/state.json`。', END]
    section = '\n'.join(lines)
    if START in old:
        updated = old[:old.index(START)] + section + old[old.index(END) + len(END):]
    else:
        updated = old.rstrip() + '\n\n' + section + '\n'
    write_json(root / '.pms-loop/state.json', state)
    atomic_write(path, updated)


@contextmanager
def mutation_lock(root):
    directory = root / '.pms-loop'
    require(not directory.is_symlink(), '.pms-loop不能是符号链接')
    directory.mkdir(exist_ok=True)
    lock = directory / '.lock'
    require(not lock.is_symlink(), '锁文件不能是符号链接')
    with lock.open('a') as stream:
        try:
            fcntl.flock(stream, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError as exc:
            raise LoopError('另一个Loop命令正在修改状态，请等其完成') from exc
        try:
            yield
        finally:
            fcntl.flock(stream, fcntl.LOCK_UN)


def active_run(state):
    require(state['active'], '没有活动轮次，请先begin')
    return next(run for run in state['runs'] if run['id'] == state['active'])


def pick_next(root, state, catalog, limit):
    if state['active']:
        return {'resume': state['active'], 'items': active_run(state)['items']}
    for key in FOUNDATIONS:
        if state['items'][key]['status'] != 'done':
            require(state['items'][key]['status'] != 'blocked', f'公共依赖{key}阻塞；先reopen并解决原因')
            return {'items': [key]}
    pages = [p for p in catalog['pages'] if state['items'][p['id']]['status'] == 'pending']
    if pages:
        pages.sort(key=lambda p: (p['phase'], p['id']))
        phase = pages[0]['phase']
        return {'items': [p['id'] for p in pages if p['phase'] == phase][:limit],
                'hint': '建议顺序；可用begin改选1–5个依赖关联项，不能把跳往占位的链路验收通过'}
    blocked = [p['id'] for p in catalog['pages'] if state['items'][p['id']]['status'] == 'blocked']
    require(not blocked, '尚有阻塞页面：' + ', '.join(blocked))
    if effective_status(root, state) != 'complete':
        require(state['items']['FINAL']['status'] != 'blocked', 'FINAL被阻塞，先reopen')
        return {'items': ['FINAL']}
    return {'items': [], 'status': 'complete'}


def package_manager(root):
    package = read_json(root / 'package.json')
    locks = {'pnpm': ['pnpm-lock.yaml'], 'npm': ['package-lock.json', 'npm-shrinkwrap.json'],
             'yarn': ['yarn.lock'], 'bun': ['bun.lock', 'bun.lockb']}
    detected = [pm for pm, files in locks.items() if any((root / f).exists() for f in files)]
    declared = package.get('packageManager', '').split('@')[0]
    require(len(detected) <= 1, '检测到多种包管理器锁文件；保留正确的一种后重试')
    require(not declared or declared in locks, '不支持packageManager声明')
    require(not declared or not detected or declared == detected[0], 'packageManager声明与锁文件不一致')
    return declared or (detected[0] if detected else 'pnpm'), package


def stop_process(process):
    if process.poll() is not None:
        return
    try:
        os.killpg(process.pid, signal.SIGTERM)
        process.wait(timeout=2)
    except subprocess.TimeoutExpired:
        os.killpg(process.pid, signal.SIGKILL)
        process.wait()
    except ProcessLookupError:
        pass


def run_command(argv, root, log, timeout, env):
    with log.open('w', encoding='utf-8') as stream:
        process = subprocess.Popen(argv, cwd=root, stdout=stream, stderr=subprocess.STDOUT,
                                   env=env, start_new_session=True)
        try:
            return process.wait(timeout=timeout)
        except subprocess.TimeoutExpired:
            stop_process(process)
            stream.write('\nLoop: command timed out\n')
            return 124
        except BaseException:
            stop_process(process)
            raise


def run_checks(root, state, catalog, timeout):
    run = active_run(state)
    directory = local_path(root, f'.pms-loop/runs/{run["id"]}')
    before = revision(root)
    record = {'round': run['id'], 'revision': before, 'status': 'running', 'started_at': now(), 'commands': {}}
    write_json(directory / 'checks.json', record)  # invalidate any old passing report first
    run.update(status='checking', checks={})
    save(root, state, catalog)
    required = ['typecheck', 'lint', 'build']
    if 'FND-02' in run['items'] or state['items']['FND-02']['status'] == 'done':
        required.append('test:domain')
    if run['items'] == ['FINAL']:
        required.append('test:e2e')
    pm, package = package_manager(root)
    executable = shutil.which(pm)
    artifact_dir = directory / 'artifacts'
    artifact_dir.mkdir(exist_ok=True)
    environment = {**os.environ, 'PMS_LOOP_REVISION': before, 'PMS_LOOP_ARTIFACT_DIR': str(artifact_dir)}
    for name in required:
        log = directory / (name.replace(':', '-') + '.log')
        started = time.monotonic()
        command = [executable or pm, 'run', name]
        if not executable or not package.get('scripts', {}).get(name):
            log.write_text(f'缺少可执行包管理器{pm}或package.json脚本{name}\n')
            code = 127
        else:
            print(f'检查 {pm} run {name} ...', flush=True)
            code = run_command(command, root, log, timeout, environment)
            if log.stat().st_size == 0:
                log.write_text(f'command finished with exit code {code}; no output\n')
        record['commands'][name] = {'argv': command, 'exit_code': code,
                                    'log': log.relative_to(root).as_posix(), 'sha256': digest(log),
                                    'seconds': round(time.monotonic() - started, 2)}
        write_json(directory / 'checks.json', record)
    require(before == revision(root), '检查期间源码发生变化，本轮结果不可用于验收；重跑check')
    passed = all(v['exit_code'] == 0 for v in record['commands'].values())
    record.update(status='passed' if passed else 'failed', finished_at=now())
    write_json(directory / 'checks.json', record)
    run['checks'] = {k: 'pass' if v['exit_code'] == 0 else 'fail' for k, v in record['commands'].items()}
    run['status'] = 'awaiting_evidence' if passed else 'checks_failed'
    save(root, state, catalog)
    receipt = read_json(directory / 'evidence.json')
    if receipt.get('revision') is None:
        receipt['revision'] = before
        write_json(directory / 'evidence.json', receipt)
    print(json.dumps({'revision': before, 'status': record['status'],
                      'evidence': str(directory / 'evidence.json')}, ensure_ascii=False))
    require(passed, '存在失败检查；查看日志并修复后重跑check')


def check_png(path, width):
    with path.open('rb') as stream:
        header = stream.read(24)
    require(len(header) == 24 and header[:8] == b'\x89PNG\r\n\x1a\n' and header[12:16] == b'IHDR', f'不是PNG截图: {path}')
    actual_width, height = struct.unpack('>II', header[16:24])
    scale = actual_width / width
    require(scale in {1, 2} and height >= 900 * scale, f'截图应为{width}×900视口（可完整长图或2倍DPR）: {path}')


def check_route_report(root, path, catalog, rev):
    report = read_json(path)
    require(report.get('revision') == rev, '全量路由报告revision过期')
    rows = report.get('pages', [])
    require(len(rows) == 72 and {v.get('id') for v in rows} == {p['id'] for p in catalog['pages']}, '全量路由报告必须逐项覆盖72页且无重复')
    for row in rows:
        require(row.get('passed') is True and set(row.get('viewports', [])) == {1280, 1440}, f'{row.get("id")}未通过两种视口')
        require(valid_entry(row.get('entry')), f'{row.get("id")}需要实际可访问URL路径')
    for section, keys in [('journeys', JOURNEYS), ('roles', ROLES)]:
        require(all(report.get(section, {}).get(k) is True for k in keys), f'全量报告缺{section}通过证据')


def valid_entry(value):
    return (isinstance(value, str) and value.startswith('/') and not value.startswith('//')
            and not re.search(r'(^|/):|\s', value))


def validate_evidence(root, state, catalog):
    run = active_run(state)
    directory = local_path(root, f'.pms-loop/runs/{run["id"]}')
    checks = read_json(directory / 'checks.json')
    receipt = read_json(directory / 'evidence.json')
    current = revision(root)
    require(checks.get('status') == 'passed' and checks.get('round') == run['id'], '工程检查未全部通过')
    require(checks.get('revision') == receipt.get('revision') == current, '源码或证据已过期；重新check和浏览器验证，不可沿用旧证据')
    require(receipt.get('round') == run['id'] and set(receipt.get('items', {})) == set(run['items']), '验收证据与活动轮次不匹配')
    required = {'typecheck', 'lint', 'build'}
    if 'FND-02' in run['items'] or state['items']['FND-02']['status'] == 'done':
        required.add('test:domain')
    if run['items'] == ['FINAL']:
        required.add('test:e2e')
    require(required <= checks.get('commands', {}).keys(), '缺少本轮必需检查命令')
    proof = {}

    def artifact(relative):
        path = local_path(root, relative, exists=True)
        proof[relative] = digest(path)
        return path

    for name in required:
        command = checks['commands'][name]
        require(command.get('exit_code') == 0, f'{name}未通过')
        path = artifact(command['log'])
        require(digest(path) == command['sha256'], f'{name}日志已修改，请重新check')
    definitions = specs(catalog)
    for key in run['items']:
        expected = definitions[key]
        item = receipt['items'][key]
        for check in checks_for(expected):
            observed = item.get('checks', {}).get(check, {})
            require(observed.get('passed') is True and str(observed.get('observation', '')).strip(), f'{key}/{check}缺少实际通过记录')
        require(set(item.get('covered_features', [])) == set(expected.get('feature_ids', [])), f'{key}功能覆盖声明与目录不一致')
        scenarios = item.get('scenarios', [])
        require(scenarios and all(all(isinstance(v.get(k), str) and v[k].strip() for k in ('action', 'expected', 'observed')) for v in scenarios), f'{key}缺实际操作/预期/观察结果')
        require(item.get('artifacts'), f'{key}缺本地验证证据')
        for relative in item['artifacts']:
            artifact(relative)
        if key not in {'FND-02', 'FINAL'}:
            require(valid_entry(item.get('entry')), f'{key}缺实际访问路径（不能含:id）')
            for width in (1440, 1280):
                check_png(artifact(item.get('screenshots', {}).get(str(width))), width)
        if key == 'FINAL':
            check_route_report(root, artifact(item.get('route_report')), catalog, current)
            documents = item.get('documents', {})
            require(documents.get('readme') == 'README.md', '最终README应在项目根目录')
            for name in ('readme', 'routes', 'mock'):
                artifact(documents.get(name))
            local_path(root, 'DEV_PROGRESS.md', exists=True)  # its managed block changes on accept
    artifact(f'.pms-loop/runs/{run["id"]}/checks.json')
    artifact(f'.pms-loop/runs/{run["id"]}/evidence.json')
    return current, proof


def execute(args, root, catalog):
    action = args.command
    if action == 'inspect':
        inspect_sources(root, catalog)
        return {'sources': 'match', 'pages': 72, 'features': 337, 'mock_types': 31,
                'documents': {key: value['path'] for key, value in catalog['sources'].items()}}
    if action == 'init':
        inspect_sources(root, catalog)
        if (root / '.pms-loop/state.json').exists():
            state = load_state(root, catalog)
            save(root, state, catalog)
            return {'initialized': False, 'active': state['active'], 'message': '沿用已有进度，不重置'}
        state = {'schema_version': 1, 'catalog_sha256': digest(CATALOG), 'status': 'in_progress',
                 'active': None, 'completion_revision': None, 'created_at': now(),
                 'items': {key: {'status': 'pending'} for key in specs(catalog)}, 'runs': [], 'notes': []}
        save(root, state, catalog)
        return {'initialized': True, 'pages': '0/72', 'next': 'FND-01'}
    state = load_state(root, catalog, allow_catalog_change=action == 'reconcile')
    if action == 'status':
        return {'status': effective_status(root, state), 'active': state['active'],
                'pages_done': sum(state['items'][p['id']]['status'] == 'done' for p in catalog['pages']),
                'pages_total': 72, 'foundations': {k: state['items'][k]['status'] for k in FOUNDATIONS},
                'blocked': [k for k, v in state['items'].items() if v['status'] == 'blocked']}
    if action == 'note':
        state['notes'].append({'at': now(), 'text': args.text})
        save(root, state, catalog)
        return {'recorded': True}
    if action in {'next', 'begin', 'check', 'accept', 'reconcile'}:
        inspect_sources(root, catalog)
    if action == 'next':
        return pick_next(root, state, catalog, args.limit)
    if action in {'reopen', 'reconcile'}:
        require(not state['active'], '当前有活动轮次；先完成或defer，避免丢失现场')
        require(set(args.items) <= state['items'].keys(), '包含未知任务ID')
        affected = set(args.items) | {'FINAL'}
        if 'FND-01' in affected or 'FND-02' in affected:
            affected = set(state['items'])  # shared foundation changes need a full revalidation
        for key in affected:
            state['items'][key] = {'status': 'pending', 'reason': args.reason}
        if action == 'reconcile':
            state['catalog_sha256'] = digest(CATALOG)
        state.update(status='in_progress', completion_revision=None)
        state['notes'].append({'at': now(), 'text': f'{action} {", ".join(sorted(affected))}: {args.reason}'})
        save(root, state, catalog)
        return {'reopened': sorted(affected), 'history_preserved': True}
    if action == 'begin':
        require(not state['active'], '已有活动轮次，请恢复该轮或defer')
        selected = args.items
        require(1 <= len(selected) <= 5 and len(set(selected)) == len(selected), '每轮选择1–5个不重复任务')
        require(set(selected) <= state['items'].keys(), '包含未知任务ID')
        for key in selected:
            is_final_refresh = key == 'FINAL' and effective_status(root, state) == 'needs_revalidation'
            require(state['items'][key]['status'] == 'pending' or is_final_refresh, f'{key}不是待办；已完成/阻塞项应先reopen')
        for key in FOUNDATIONS:
            if state['items'][key]['status'] != 'done':
                require(selected == [key], f'先单独完成公共依赖{key}')
                break
        if 'FINAL' in selected:
            require(selected == ['FINAL'] and all(v['status'] == 'done' for k, v in state['items'].items() if k != 'FINAL'), '最终验收要求72页及公共能力全部完成')
        number = len(state['runs']) + 1
        while local_path(root, f'.pms-loop/runs/R{number:04d}').exists():
            number += 1  # preserve artifacts orphaned by interruption before the atomic state write
        run = {'id': f'R{number:04d}', 'items': selected, 'started_at': now(), 'status': 'active'}
        directory = local_path(root, f'.pms-loop/runs/{run["id"]}')
        require(not directory.exists(), f'轮次目录已存在，检查中断现场后恢复: {directory}')
        directory.mkdir(parents=True)
        selected_specs = [specs(catalog)[k] for k in selected]
        feature_ids = {f for item in selected_specs for f in item.get('feature_ids', [])}
        plan = {'round': run['id'], 'items': selected_specs, 'sources': catalog['sources'],
                'feature_references': {key: catalog['features'][key] for key in sorted(feature_ids)}}
        if selected == ['FND-02']:
            plan['mock_minimums'] = catalog['mock_minimums']
        if selected == ['FINAL']:
            plan['scope'] = catalog['scope']
            plan['cross_cutting_features'] = catalog['cross_cutting_features']
        write_json(directory / 'plan.json', plan)
        write_json(directory / 'evidence.json', evidence_template(run, catalog))
        state['runs'].append(run)
        state.update(active=run['id'], status='in_progress', completion_revision=None)
        for key in selected:
            state['items'][key] = {'status': 'active', 'round': run['id']}
        save(root, state, catalog)
        return {'round': run['id'], 'plan': str(directory / 'plan.json'), 'evidence': str(directory / 'evidence.json')}
    if action == 'check':
        run_checks(root, state, catalog, args.timeout)
        return {'message': '工程检查通过；完成实际浏览器验证并填写证据后accept'}
    if action == 'defer':
        run = active_run(state)
        run.update(status='deferred', reason=args.reason, ended_at=now())
        for key in run['items']:
            state['items'][key] = {'status': 'blocked', 'round': run['id'], 'reason': args.reason}
        state['active'] = None
        state['notes'].append({'at': now(), 'text': f'{run["id"]}阻塞: {args.reason}'})
        save(root, state, catalog)
        return {'deferred': run['id'], 'items': run['items']}
    if action == 'accept':
        current, proof = validate_evidence(root, state, catalog)
        run = active_run(state)
        run.update(status='accepted', accepted_at=now(), revision=current, proof=proof)
        for key in run['items']:
            state['items'][key] = {'status': 'done', 'round': run['id']}
        state['active'] = None
        if run['items'] == ['FINAL']:
            state.update(status='complete', completion_revision=current)
        save(root, state, catalog)
        return {'accepted': run['items'], 'status': state['status']}
    raise LoopError('未知命令')


def parser():
    result = argparse.ArgumentParser(description=__doc__)
    result.add_argument('--root', type=Path, default=Path.cwd(), help='项目根目录')
    sub = result.add_subparsers(dest='command', required=True)
    for name in ('inspect', 'init', 'status', 'accept'):
        sub.add_parser(name)
    next_parser = sub.add_parser('next')
    next_parser.add_argument('--limit', type=int, choices=range(1, 6), default=3)
    begin = sub.add_parser('begin')
    begin.add_argument('--items', nargs='+', required=True)
    check = sub.add_parser('check')
    check.add_argument('--timeout', type=int, default=900, help='每个检查命令超时秒数')
    sub.add_parser('note').add_argument('--text', required=True)
    sub.add_parser('defer').add_argument('--reason', required=True)
    for name in ('reopen', 'reconcile'):
        command = sub.add_parser(name)
        command.add_argument('--items', nargs='+', required=True)
        command.add_argument('--reason', required=True)
    return result


def main(argv=None):
    args = parser().parse_args(argv)
    root = args.root.resolve()
    try:
        require(root.is_dir(), f'项目目录不存在: {root}')
        require(not (root / '.pms-loop').is_symlink(), '.pms-loop不能是符号链接')
        if hasattr(args, 'timeout'):
            require(args.timeout > 0, 'timeout必须大于0')
        for field in ('reason', 'text'):
            if hasattr(args, field):
                require(getattr(args, field).strip(), f'{field}不能为空')
        catalog = load_catalog()
        if args.command in {'inspect', 'status', 'next'}:
            result = execute(args, root, catalog)
        else:
            with mutation_lock(root):
                result = execute(args, root, catalog)
        print(json.dumps(result, ensure_ascii=False, indent=2))
        return 0
    except (LoopError, OSError, KeyError, TypeError, ValueError) as exc:
        print(f'Loop error: {exc}', file=sys.stderr)
        return 1
    except KeyboardInterrupt:
        print('Loop已中断，保留活动轮次；下次status/next恢复。', file=sys.stderr)
        return 130


if __name__ == '__main__':
    sys.exit(main())
