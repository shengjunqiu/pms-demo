#!/usr/bin/env python3
"""Tests for the read-only acceptance pipeline helper."""
import contextlib
import io
import json
from pathlib import Path
import tempfile
import unittest

import pipeline


class PipelineTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix='pms-pipeline-test-')
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        (self.root / '.pms-loop/parallel').mkdir(parents=True)
        self.state({
            'active': None,
            'items': {
                'FND-01': {'status': 'done'},
                'GS-01': {'status': 'pending'},
                'GS-02': {'status': 'pending'},
                'GS-03': {'status': 'pending'},
                'YS-01': {'status': 'pending'},
                'CF-01': {'status': 'done'},
                'FINAL': {'status': 'pending'},
            },
            'runs': [],
        })

    def test_invalid_package_kind_returns_controlled_error(self):
        self.package('A', [], status='assigned', assignment={'package_kind': []})
        with contextlib.redirect_stderr(io.StringIO()):
            self.assertEqual(pipeline.main(['--root', str(self.root)]), 2)

    def test_checklist_is_not_a_readiness_dependency(self):
        self.package('A', ['GS-01'], assignment={
            'acceptance_ready': True, 'acceptance_group': 'A',
            'acceptance_checklist': ['正式工程检查', '浏览器观察与accept'],
        })
        self.assertEqual(pipeline.build_report(self.root)['ready_acceptance_batches'][0]['items'], ['GS-01'])

    def test_nonintegrated_member_blocks_whole_group(self):
        self.package('A', ['GS-01'], assignment={'acceptance_ready': True, 'acceptance_group': 'chain'})
        self.package('B', ['GS-02'], status='in_progress', assignment={'acceptance_group': 'chain'})
        report = pipeline.build_report(self.root)
        self.assertEqual(report['ready_acceptance_batches'], [])
        self.assertIn('GS-02', report['blocked_acceptance_groups'][0]['items'])

    def test_dispatch_stops_at_capacity_without_blocking_diagnostics(self):
        self.package('A', ['GS-01', 'GS-02'], assignment={'acceptance_ready': True, 'acceptance_group': 'A'})
        self.package('B', ['GS-03', 'YS-01'], assignment={'acceptance_ready': True, 'acceptance_group': 'B'})
        report = pipeline.build_report(self.root)
        self.assertFalse(report['dispatch']['ordinary_development_allowed'])
        self.assertEqual(report['mode'], 'balanced')
        with contextlib.redirect_stdout(io.StringIO()):
            self.assertEqual(pipeline.main(['--root', str(self.root), '--check-dispatch']), 1)
            self.assertEqual(pipeline.main(['--root', str(self.root)]), 0)

    def test_support_package_can_have_no_page_ownership(self):
        self.package('QA', [], status='assigned', assignment={'package_kind': 'acceptance-test-support'})
        report = pipeline.build_report(self.root)
        self.assertEqual(report['empty_live_packages'], [])
        self.assertEqual(report['counts']['development_wip'], 1)

    def test_returned_delivery_is_not_still_ready(self):
        self.package('A', ['GS-01'], status='needs_revision', assignment={
            'acceptance_ready': True, 'acceptance_group': 'A',
        }, delivery={'status': 'integrated', 'remaining_dependencies': []})
        report = pipeline.build_report(self.root)
        self.assertEqual([], report['ready_acceptance_batches'])
        self.assertEqual(1, report['counts']['development_wip'])

    def test_checking_freezes_integration(self):
        self.activate('checking')
        report = pipeline.build_report(self.root)
        self.assertTrue(report['freeze_integration'])
        self.assertIn('保持冻结', report['next_action'])

    def test_duplicate_ready_packages_cannot_begin(self):
        for name in ['A', 'B']:
            self.package(name, ['GS-01'], assignment={
                'acceptance_ready': True, 'acceptance_group': name,
                'acceptance_dependencies': [],
            })
        report = pipeline.build_report(self.root)
        self.assertEqual([], report['ready_acceptance_batches'])
        self.assertTrue(report['duplicates'])

    def state(self, value):
        path = self.root / '.pms-loop/state.json'
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(value), encoding='utf-8')

    def package(self, package_id, items, status='integrated', assignment=None, delivery=None):
        directory = self.root / '.pms-loop/parallel' / package_id
        directory.mkdir(parents=True)
        assignment_value = {
            'package_id': package_id,
            'items': items,
            'status': status,
            'owner': 'fixture-agent',
            'last_confirmed_at': '2026-09-10',
            **(assignment or {}),
        }
        (directory / 'assignment.json').write_text(json.dumps(assignment_value), encoding='utf-8')
        if delivery is not None:
            (directory / 'delivery.json').write_text(json.dumps({
                'package_id': package_id,
                **delivery,
            }), encoding='utf-8')

    def activate(self, run_status):
        state = json.loads((self.root / '.pms-loop/state.json').read_text())
        state['active'] = 'R0008'
        state['items']['GS-01'] = {'status': 'active', 'round': 'R0008'}
        state['runs'] = [{'id': 'R0008', 'status': run_status}]
        self.state(state)

    def test_begin_before_check_does_not_freeze_but_checked_round_does(self):
        self.package('A01', ['GS-01'], assignment={
            'acceptance_ready': True, 'acceptance_group': 'estimate-review'})
        self.activate('active')
        report = pipeline.build_report(self.root)
        self.assertFalse(report['freeze_integration'])
        self.assertEqual(report['counts']['integrated_wip'], 1)
        self.assertIn('当前尚未确认进入check冻结', report['next_action'])
        self.activate('awaiting_evidence')
        report = pipeline.build_report(self.root)
        self.assertTrue(report['freeze_integration'])
        self.assertEqual(report['counts']['integrated_wip'], 1)
        self.assertIn('ACTIVE_FREEZE', {item['code'] for item in report['warnings']})

    def test_only_explicit_dependency_free_group_becomes_ready_batch(self):
        self.package('A01', ['GS-01', 'GS-02'], status='integrated_pending_acceptance', assignment={
            'acceptance_ready': True,
            'acceptance_group': 'presales-loop',
            'acceptance_dependencies': [],
        }, delivery={'remaining_dependencies': []})
        report = pipeline.build_report(self.root)
        self.assertEqual(report['ready_acceptance_batches'], [{
            'acceptance_group': 'presales-loop',
            'packages': ['A01'],
            'items': ['GS-01', 'GS-02'],
        }])
        self.assertIn('显式就绪分组', report['next_action'])

    def test_dependencies_or_missing_group_keep_inventory_out_of_ready_batches(self):
        self.package('A01', ['GS-01'], assignment={
            'acceptance_ready': True,
            'acceptance_group': 'estimate',
            'acceptance_dependencies': ['YS真实入口尚未集成'],
        })
        self.package('A02', ['GS-02'], assignment={'acceptance_ready': True})
        report = pipeline.build_report(self.root)
        self.assertEqual(report['ready_acceptance_batches'], [])
        blockers = {item['package']: item['reasons'] for item in report['readiness_blockers']}
        self.assertIn('YS真实入口尚未集成', blockers['A01'])
        self.assertIn('缺少 acceptance_group', blockers['A02'])
        self.assertIn('确认后才能begin', report['next_action'])

    def test_delivery_remaining_dependencies_override_historical_assignment_plan(self):
        self.package('A01', ['GS-01'], assignment={
            'acceptance_ready': True,
            'acceptance_group': 'estimate',
            'acceptance_dependencies': ['YS入口原计划依赖'],
        }, delivery={'remaining_dependencies': []})
        report = pipeline.build_report(self.root)
        self.assertEqual(report['ready_acceptance_batches'][0]['items'], ['GS-01'])
        self.assertEqual(report['readiness_blockers'], [])

    def test_cross_package_group_is_atomic_when_one_package_is_blocked(self):
        self.package('A01', ['GS-01', 'GS-02'], assignment={
            'acceptance_ready': True,
            'acceptance_group': 'cross-page-loop',
        }, delivery={'remaining_dependencies': []})
        self.package('B01', ['YS-01'], assignment={
            'acceptance_ready': True,
            'acceptance_group': 'cross-page-loop',
        }, delivery={'remaining_dependencies': ['预算入口未集成']})
        report = pipeline.build_report(self.root)
        self.assertEqual(report['ready_acceptance_batches'], [])
        self.assertEqual(report['blocked_acceptance_groups'][0]['items'], ['GS-01', 'GS-02', 'YS-01'])
        self.assertIn('B01: 预算入口未集成', report['blocked_acceptance_groups'][0]['reasons'])

    def test_explicit_group_over_five_is_not_mechanically_split(self):
        state = json.loads((self.root / '.pms-loop/state.json').read_text())
        for number in range(4, 7):
            state['items'][f'GS-{number:02d}'] = {'status': 'pending'}
        self.state(state)
        items = [f'GS-{number:02d}' for number in range(1, 7)]
        self.package('A01', items[:4], assignment={
            'acceptance_ready': True, 'acceptance_group': 'oversized-loop'})
        self.package('A02', items[4:], assignment={
            'acceptance_ready': False,
            'acceptance_group': 'oversized-loop',
            'acceptance_dependencies': ['仍在等待'],
        })
        report = pipeline.build_report(self.root)
        self.assertEqual(report['ready_acceptance_batches'], [])
        self.assertEqual(report['oversized_acceptance_groups'][0]['items'], items)
        self.assertIn('ACCEPTANCE_GROUP_TOO_LARGE', {item['code'] for item in report['warnings']})

    def test_audit_finds_duplicates_uncovered_done_and_empty_packages(self):
        self.package('A01', ['GS-01', 'CF-01'])
        self.package('A02', ['GS-01'], status='integrated_pending_acceptance', delivery={
            'status': 'integrated_pending_acceptance',
            'delivery_commit': 'abc',
            'integration_commit': 'def',
        })
        self.package('EMPTY', [], status='assigned')
        report = pipeline.build_report(self.root)
        self.assertEqual(report['duplicates'], [{'item': 'GS-01', 'packages': ['A01', 'A02']}])
        self.assertEqual(report['uncovered_items'], ['GS-02', 'GS-03', 'YS-01'])
        self.assertEqual(report['live_packages_with_done_items'], [{'package': 'A01', 'items': ['CF-01']}])
        self.assertEqual(report['empty_live_packages'], ['EMPTY'])
        codes = {item['code'] for item in report['warnings']}
        self.assertTrue({'DUPLICATE_OWNERSHIP', 'UNCOVERED_PAGE', 'DONE_ITEM_IN_LIVE_PACKAGE', 'EMPTY_LIVE_PACKAGE'} <= codes)
        with contextlib.redirect_stdout(io.StringIO()):
            self.assertEqual(pipeline.main(['--root', str(self.root), '--strict']), 1)

    def test_terminal_package_does_not_cover_reopened_page(self):
        self.package('OLD', ['GS-01'], status='archived')
        report = pipeline.build_report(self.root)
        self.assertIn('GS-01', report['uncovered_items'])
        self.assertNotIn('GS-01', [
            item for entry in report['integrated_inventory'] for item in entry['items']
        ])

    def test_delivery_status_can_advance_stale_assignment(self):
        self.package('A01', ['GS-01'], status='submitted', assignment={
            'acceptance_ready': True, 'acceptance_group': 'estimate'}, delivery={
            'status': 'integrated_pending_acceptance',
            'delivery_commit': 'abc',
            'integration_commit': 'def',
            'remaining_dependencies': [],
        })
        report = pipeline.build_report(self.root)
        self.assertEqual(report['ready_acceptance_batches'][0]['items'], ['GS-01'])
        self.assertEqual(report['counts']['submitted_wip'], 0)
        self.assertEqual(report['counts']['integrated_wip'], 1)

    def test_invalid_structures_and_limits_return_controlled_errors(self):
        with self.assertRaises(pipeline.PipelineError):
            pipeline.build_report(self.root, batch_size=6)
        with self.assertRaises(pipeline.PipelineError):
            pipeline.build_report(self.root, wip={'development': -1})
        assignment = self.root / '.pms-loop/parallel/BAD/assignment.json'
        assignment.parent.mkdir()
        assignment.write_text('[]', encoding='utf-8')
        stderr = io.StringIO()
        with contextlib.redirect_stderr(stderr):
            self.assertEqual(pipeline.main(['--root', str(self.root)]), 2)
        self.assertIn('JSON 顶层必须是对象', stderr.getvalue())


if __name__ == '__main__':
    unittest.main(verbosity=2)
