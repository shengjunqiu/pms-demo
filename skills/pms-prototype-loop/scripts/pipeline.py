#!/usr/bin/env python3
"""Read-only acceptance-pipeline status, WIP audit, and readiness report."""
import argparse
from collections import defaultdict
import json
from pathlib import Path
import sys


PAGE_PREFIXES = ('WK-', 'GS-', 'YS-', 'HS-', 'JS-', 'GL-', 'CF-')
INTEGRATED_STATUSES = {'integrated', 'integrated_pending_acceptance'}
DEVELOPMENT_STATUSES = {'assigned', 'in_progress', 'needs_revision', 'blocked'}
SUBMITTED_STATUSES = {'submitted'}
TERMINAL_STATUSES = {'accepted', 'archived', 'superseded'}
PAGE_STATUSES = {'pending', 'active', 'done', 'blocked'}
STATUS_RANK = {
    'blocked': 0,
    'needs_revision': 1,
    'assigned': 2,
    'in_progress': 3,
    'submitted': 4,
    'integrated': 5,
    'integrated_pending_acceptance': 6,
    'accepted': 7,
    'superseded': 8,
    'archived': 9,
}
DEFAULT_WIP = {'development': 3, 'submitted': 2, 'integrated': 2}


class PipelineError(RuntimeError):
    pass


def read_object(path):
    try:
        value = json.loads(path.read_text(encoding='utf-8'))
    except FileNotFoundError as exc:
        raise PipelineError(f'缺少文件: {path}') from exc
    except json.JSONDecodeError as exc:
        raise PipelineError(f'JSON 无效: {path}: {exc}') from exc
    if not isinstance(value, dict):
        raise PipelineError(f'JSON 顶层必须是对象: {path}')
    return value


def string_list(value, label):
    if value is None:
        return []
    if not isinstance(value, list) or any(not isinstance(item, str) or not item for item in value):
        raise PipelineError(f'{label} 必须是非空字符串数组')
    if len(value) != len(set(value)):
        raise PipelineError(f'{label} 不能包含重复项')
    return value


def package_status(assignment, delivery, label):
    statuses = [value for value in (assignment.get('status'), delivery.get('status')) if value is not None]
    if not statuses:
        raise PipelineError(f'{label}: 缺少 status')
    for status in statuses:
        if not isinstance(status, str) or status not in STATUS_RANK:
            raise PipelineError(f'{label}: 未知 status {status!r}')
    # A coordinator's return-for-fix must not be hidden by an older delivery.
    if assignment.get('status') in {'needs_revision', 'blocked'}:
        return assignment['status']
    return max(statuses, key=lambda value: STATUS_RANK[value])


def optional_bool(assignment, delivery, key, label):
    values = [value for value in (assignment.get(key), delivery.get(key)) if value is not None]
    if any(not isinstance(value, bool) for value in values):
        raise PipelineError(f'{label}: {key} 必须是布尔值')
    if len(set(values)) > 1:
        raise PipelineError(f'{label}: assignment 与 delivery 的 {key} 冲突')
    return values[0] if values else None


def load_packages(root):
    directory = root / '.pms-loop' / 'parallel'
    if not directory.exists():
        return []
    packages = []
    for child in sorted(directory.iterdir(), key=lambda value: value.name):
        if not child.is_dir():
            continue
        assignment_path = child / 'assignment.json'
        delivery_path = child / 'delivery.json'
        assignment = read_object(assignment_path) if assignment_path.exists() else {}
        delivery = read_object(delivery_path) if delivery_path.exists() else {}
        if not assignment and not delivery:
            continue
        label = child.relative_to(root).as_posix()
        identifiers = [value for value in (assignment.get('package_id'), delivery.get('package_id')) if value is not None]
        if any(not isinstance(value, str) or not value for value in identifiers):
            raise PipelineError(f'{label}: package_id 必须是非空字符串')
        if len(set(identifiers)) > 1:
            raise PipelineError(f'{label}: assignment 与 delivery 的 package_id 冲突')
        package_id = identifiers[0] if identifiers else child.name
        assignment_items = string_list(assignment.get('items'), f'{package_id}.assignment.items')
        delivery_items = string_list(delivery.get('items'), f'{package_id}.delivery.items')
        if assignment_items and delivery_items and assignment_items != delivery_items:
            raise PipelineError(f'{package_id}: assignment 与 delivery 的 items 冲突')
        items = assignment_items or delivery_items
        planned_dependencies = string_list(
            assignment.get('acceptance_dependencies'), f'{package_id}.acceptance_dependencies')
        remaining = string_list(
            delivery.get('remaining_dependencies'), f'{package_id}.remaining_dependencies')
        dependencies = remaining if 'remaining_dependencies' in delivery else planned_dependencies
        readiness = optional_bool(assignment, delivery, 'acceptance_ready', package_id)
        group_values = [value for value in (assignment.get('acceptance_group'), delivery.get('acceptance_group')) if value is not None]
        if any(not isinstance(value, str) or not value.strip() for value in group_values):
            raise PipelineError(f'{package_id}: acceptance_group 必须是非空字符串')
        if len(set(group_values)) > 1:
            raise PipelineError(f'{package_id}: assignment 与 delivery 的 acceptance_group 冲突')
        packages.append({
            'id': package_id,
            'path': label,
            'items': items,
            'status': package_status(assignment, delivery, package_id),
            'owner': assignment.get('owner', ''),
            'writer': assignment.get('writer', ''),
            'workdir': assignment.get('workdir', ''),
            'branch': assignment.get('branch', ''),
            'last_confirmed_at': assignment.get('last_confirmed_at') or '',
            'next_action': assignment.get('next_action', ''),
            'delivery_commit': delivery.get('delivery_commit', ''),
            'integration_commit': delivery.get('integration_commit', ''),
            'formal_rounds': string_list(delivery.get('formal_rounds'), f'{package_id}.formal_rounds'),
            'acceptance_ready': readiness,
            'acceptance_group': group_values[0].strip() if group_values else '',
            'acceptance_dependencies': dependencies,
        })
    return packages


def page_items(state):
    items = state.get('items')
    if not isinstance(items, dict):
        raise PipelineError('state.items 必须是对象')
    pages = {}
    for key, value in items.items():
        if not isinstance(key, str) or not isinstance(value, dict):
            raise PipelineError('state.items 的键和值必须分别是字符串和对象')
        if key.startswith(PAGE_PREFIXES):
            status = value.get('status')
            if not isinstance(status, str) or status not in PAGE_STATUSES:
                raise PipelineError(f'state.items.{key}.status 无效: {status!r}')
            pages[key] = value
    return pages


def package_score(package):
    return (
        STATUS_RANK[package['status']],
        bool(package['integration_commit']),
        bool(package['delivery_commit']),
        package['last_confirmed_at'],
        package['id'],
    )


def chunk(values, size):
    return [values[index:index + size] for index in range(0, len(values), size)]


def build_report(root, batch_size=5, wip=None):
    if not isinstance(batch_size, int) or not 1 <= batch_size <= 5:
        raise PipelineError('批次大小必须在 1 到 5 之间')
    wip = {**DEFAULT_WIP, **(wip or {})}
    if set(wip) != set(DEFAULT_WIP) or any(not isinstance(value, int) or value < 0 for value in wip.values()):
        raise PipelineError('WIP 上限必须是 development/submitted/integrated 的非负整数')
    state = read_object(root / '.pms-loop' / 'state.json')
    runs = state.get('runs', [])
    if not isinstance(runs, list) or any(not isinstance(run, dict) for run in runs):
        raise PipelineError('state.runs 必须是对象数组')
    pages = page_items(state)
    packages = load_packages(root)
    pending = [key for key, value in pages.items() if value.get('status') != 'done']
    done = {key for key, value in pages.items() if value.get('status') == 'done'}
    active_items = [key for key in pending if pages[key].get('status') == 'active']

    owners = defaultdict(list)
    for package in packages:
        for item in package['items']:
            if item in pages:
                owners[item].append(package)
    live_owners = {
        item: [package for package in owners.get(item, []) if package['status'] not in TERMINAL_STATUSES]
        for item in pending
    }
    duplicates = [
        {'item': item, 'packages': [package['id'] for package in live_owners[item]]}
        for item in pending if len(live_owners[item]) > 1
    ]

    package_done_items = []
    empty_packages = []
    for package in packages:
        stale = [item for item in package['items'] if item in done]
        if stale and package['status'] not in TERMINAL_STATUSES:
            package_done_items.append({'package': package['id'], 'items': stale})
        if not package['items'] and package['status'] in DEVELOPMENT_STATUSES | SUBMITTED_STATUSES:
            empty_packages.append(package['id'])

    covered = [item for item in pending if live_owners[item]]
    uncovered = [item for item in pending if not live_owners[item]]
    integrated_packages = [
        package for package in packages
        if package['status'] in INTEGRATED_STATUSES
        and any(item in pending for item in package['items'])
    ]
    development_packages = [package for package in packages if package['status'] in DEVELOPMENT_STATUSES]
    submitted_packages = [package for package in packages if package['status'] in SUBMITTED_STATUSES]

    canonical = {}
    for item in pending:
        candidates = [package for package in live_owners[item] if package['status'] in INTEGRATED_STATUSES]
        if candidates:
            canonical[item] = max(candidates, key=package_score)

    grouped = defaultdict(list)
    for item in pending:
        if item in active_items or item not in canonical:
            continue
        package = canonical[item]
        grouped[package['id']].append(item)
    package_by_id = {package['id']: package for package in packages}
    status_priority = {'integrated_pending_acceptance': 0, 'integrated': 1}
    inventory = []
    readiness_blockers = []
    group_records = defaultdict(list)
    for package_id, items in sorted(
        grouped.items(), key=lambda pair: (status_priority.get(package_by_id[pair[0]]['status'], 9), pair[0])
    ):
        package = package_by_id[package_id]
        blockers = []
        if package['acceptance_ready'] is not True:
            blockers.append('缺少 acceptance_ready=true')
        if not package['acceptance_group']:
            blockers.append('缺少 acceptance_group')
        blockers.extend(package['acceptance_dependencies'])
        if any(len(live_owners[item]) > 1 for item in items):
            blockers.append('页面存在重复归属，先确定唯一当前包')
        for index, part in enumerate(chunk(items, batch_size), 1):
            inventory.append({
                'package': package_id,
                'status': package['status'],
                'items': part,
                'part': index,
                'acceptance_ready': not blockers,
                'blockers': blockers,
            })
        if blockers:
            readiness_blockers.append({'package': package_id, 'items': items, 'reasons': blockers})
        if package['acceptance_group']:
            group_records[package['acceptance_group']].append({
                'package': package_id,
                'items': items,
                'blockers': blockers,
            })

    ready_batches = []
    oversized_groups = []
    blocked_groups = []
    for group, records in sorted(group_records.items()):
        unique_items = list(dict.fromkeys(
            item for record in records for item in record['items']))
        packages_in_group = sorted(record['package'] for record in records)
        group_blockers = [
            f'{record["package"]}: {reason}'
            for record in records for reason in record['blockers']
        ]
        if len(unique_items) > 5:
            oversized_groups.append({
                'group': group,
                'packages': packages_in_group,
                'items': unique_items,
            })
            continue
        if group_blockers:
            blocked_groups.append({
                'group': group,
                'packages': packages_in_group,
                'items': unique_items,
                'reasons': group_blockers,
            })
            continue
        ready_batches.append({
            'acceptance_group': group,
            'packages': packages_in_group,
            'items': unique_items,
        })

    warnings = []
    active_round = state.get('active')
    if active_round is not None and (not isinstance(active_round, str) or not active_round):
        raise PipelineError('state.active 必须是非空字符串或 null')
    active_run = next((run for run in runs if run.get('id') == active_round), None) if active_round else None
    active_run_status = active_run.get('status') if active_run else None
    if active_run_status is not None and not isinstance(active_run_status, str):
        raise PipelineError('活动轮次 status 必须是字符串')
    if not active_round:
        freeze_integration = False
    elif active_run is None:
        freeze_integration = None
        warnings.append({
            'code': 'ACTIVE_FREEZE_UNKNOWN',
            'severity': 'warning',
            'message': f'{active_round} 找不到对应run，无法判断是否已进入check冻结窗口。',
        })
    elif active_run_status in {'checking', 'awaiting_evidence'}:
        freeze_integration = True
        warnings.append({
            'code': 'ACTIVE_FREEZE',
            'severity': 'info',
            'message': f'{active_round} 正在check或等待证据；本轮验证完成前禁止修改集成目录输入。',
        })
    else:
        freeze_integration = False
        warnings.append({
            'code': 'ACTIVE_ROUND',
            'severity': 'info',
            'message': f'{active_round} 为活动轮次（{active_run_status or "unknown"}）；修复可继续，但下一次check开始后必须冻结。',
        })
    if duplicates:
        warnings.append({'code': 'DUPLICATE_OWNERSHIP', 'severity': 'error',
                         'message': f'{len(duplicates)} 个未完成页面被多个活跃包覆盖。'})
    if uncovered:
        warnings.append({'code': 'UNCOVERED_PAGE', 'severity': 'error',
                         'message': f'{len(uncovered)} 个未完成页面没有调度包。'})
    if package_done_items:
        warnings.append({'code': 'DONE_ITEM_IN_LIVE_PACKAGE', 'severity': 'error',
                         'message': f'{len(package_done_items)} 个活跃包仍包含已正式验收页面。'})
    if empty_packages:
        warnings.append({'code': 'EMPTY_LIVE_PACKAGE', 'severity': 'error',
                         'message': f'{len(empty_packages)} 个活跃包没有页面项。'})
    if readiness_blockers:
        warnings.append({'code': 'ACCEPTANCE_READINESS_UNCONFIRMED', 'severity': 'warning',
                         'message': f'{len(readiness_blockers)} 个已集成包尚未显式确认验收分组和依赖已清空。'})
    if oversized_groups:
        warnings.append({'code': 'ACCEPTANCE_GROUP_TOO_LARGE', 'severity': 'error',
                         'message': f'{len(oversized_groups)} 个验收分组超过5页，必须按业务闭环重新分组。'})

    counts = {
        'development': len(development_packages),
        'submitted': len(submitted_packages),
        'integrated': len(integrated_packages),
    }
    for stage, count in counts.items():
        if count > wip[stage]:
            warnings.append({'code': f'WIP_{stage.upper()}', 'severity': 'warning',
                             'message': f'{stage} WIP={count}，超过上限 {wip[stage]}。'})

    mode = 'acceptance_sprint' if counts['integrated'] > wip['integrated'] else 'balanced'
    if active_round and freeze_integration is True:
        next_action = f'先恢复并完成 {active_round}，集成目录保持冻结；其他工作区只准备下一轮。'
    elif active_round:
        next_action = f'先恢复 {active_round}；当前尚未确认进入check冻结，可修复本轮，check后立即冻结。'
    elif ready_batches:
        first = ready_batches[0]
        next_action = f'可为显式就绪分组 {first["acceptance_group"]} 建立正式轮次：{", ".join(first["items"])}。'
    elif inventory:
        first = inventory[0]
        next_action = f'先核对 {first["package"]} 的业务闭环、验收依赖和acceptance_group；确认后才能begin。'
    elif uncovered:
        next_action = f'先为未覆盖页面建立唯一调度包：{", ".join(uncovered)}。'
    else:
        next_action = '没有可调度的验收库存；检查阻塞依赖或 FINAL 条件。'

    return {
        'schema_version': 1,
        'mode': mode,
        'active_round': active_round,
        'active_run_status': active_run_status,
        'freeze_integration': freeze_integration,
        'counts': {
            'accepted_pages': len(done),
            'total_pages': len(pages),
            'remaining_pages': len(pending),
            'active_pages': len(active_items),
            'covered_remaining_pages': len(covered),
            'uncovered_remaining_pages': len(uncovered),
            'packages': len(packages),
            'development_wip': counts['development'],
            'submitted_wip': counts['submitted'],
            'integrated_wip': counts['integrated'],
            'ready_acceptance_groups': len(ready_batches),
        },
        'wip_limits': wip,
        'active_items': active_items,
        'next_action': next_action,
        'ready_acceptance_batches': ready_batches,
        'integrated_inventory': inventory,
        'readiness_blockers': readiness_blockers,
        'blocked_acceptance_groups': blocked_groups,
        'oversized_acceptance_groups': oversized_groups,
        'duplicates': duplicates,
        'uncovered_items': uncovered,
        'live_packages_with_done_items': package_done_items,
        'empty_live_packages': empty_packages,
        'warnings': warnings,
    }


def print_text(report):
    counts = report['counts']
    print(f'模式: {report["mode"]}')
    print(f'正式进度: {counts["accepted_pages"]}/{counts["total_pages"]}；剩余 {counts["remaining_pages"]}；活动 {counts["active_pages"]}')
    print(f'调度覆盖: {counts["covered_remaining_pages"]}/{counts["remaining_pages"]}；未覆盖 {counts["uncovered_remaining_pages"]}')
    print('WIP: '
          f'开发 {counts["development_wip"]}/{report["wip_limits"]["development"]}，'
          f'待集成 {counts["submitted_wip"]}/{report["wip_limits"]["submitted"]}，'
          f'已集成待验收 {counts["integrated_wip"]}/{report["wip_limits"]["integrated"]}')
    if report['active_round']:
        freeze = {True: '已冻结', False: '未进入冻结', None: '冻结状态未知'}[report['freeze_integration']]
        print(f'活动轮次: {report["active_round"]} ({", ".join(report["active_items"])})；{freeze}')
    print(f'下一步: {report["next_action"]}')
    if report['ready_acceptance_batches']:
        print('\n显式就绪的验收分组:')
        for number, batch in enumerate(report['ready_acceptance_batches'], 1):
            print(f'  {number}. {batch["acceptance_group"]}: {", ".join(batch["items"])} ({", ".join(batch["packages"])})')
    if report['integrated_inventory']:
        print('\n已集成库存切片（不是begin建议）:')
        for number, item in enumerate(report['integrated_inventory'], 1):
            blockers = '；'.join(item['blockers']) if item['blockers'] else '显式就绪'
            print(f'  {number}. {item["package"]}: {", ".join(item["items"])} [{blockers}]')
    if report['duplicates']:
        print('\n重复归属:')
        for item in report['duplicates']:
            print(f'  - {item["item"]}: {", ".join(item["packages"])}')
    if report['uncovered_items']:
        print(f'\n未覆盖页面: {", ".join(report["uncovered_items"])}')
    if report['live_packages_with_done_items']:
        print('\n活跃包包含已验收页面:')
        for item in report['live_packages_with_done_items']:
            print(f'  - {item["package"]}: {", ".join(item["items"])}')
    if report['empty_live_packages']:
        print(f'\n空活跃包: {", ".join(report["empty_live_packages"])}')
    if report['warnings']:
        print('\n告警:')
        for warning in report['warnings']:
            print(f'  [{warning["severity"]}] {warning["code"]}: {warning["message"]}')


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', type=Path, default=Path.cwd())
    parser.add_argument('--format', choices=('text', 'json'), default='text')
    parser.add_argument('--batch-size', type=int, default=5,
                        help='仅控制库存输出切片大小，不自动决定正式验收闭环')
    parser.add_argument('--development-wip', type=int, default=DEFAULT_WIP['development'])
    parser.add_argument('--submitted-wip', type=int, default=DEFAULT_WIP['submitted'])
    parser.add_argument('--integrated-wip', type=int, default=DEFAULT_WIP['integrated'])
    parser.add_argument('--strict', action='store_true', help='error/warning 告警存在时返回非零')
    args = parser.parse_args(argv)
    try:
        report = build_report(args.root.resolve(), args.batch_size, {
            'development': args.development_wip,
            'submitted': args.submitted_wip,
            'integrated': args.integrated_wip,
        })
        if args.format == 'json':
            print(json.dumps(report, ensure_ascii=False, indent=2))
        else:
            print_text(report)
        if args.strict and any(item['severity'] in {'error', 'warning'} for item in report['warnings']):
            return 1
        return 0
    except (PipelineError, OSError, ValueError) as exc:
        print(f'Pipeline invalid: {exc}', file=sys.stderr)
        return 2


if __name__ == '__main__':
    sys.exit(main())
