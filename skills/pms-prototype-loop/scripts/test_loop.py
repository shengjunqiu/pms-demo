#!/usr/bin/env python3
"""Controller tests, not application/UI acceptance. Uses isolated temporary projects."""
import contextlib
import io
import json
import os
from pathlib import Path
import shutil
import struct
import sys
import tempfile
import unittest
from unittest.mock import patch
import zlib

import loop


PROJECT = Path(os.environ.get('PMS_TEST_PROJECT_ROOT', Path.cwd())).resolve()


def png(width, height=900):
    def chunk(kind, data):
        return struct.pack('>I', len(data)) + kind + data + struct.pack('>I', zlib.crc32(kind + data))
    pixels = (b'\0' + b'\xff\xff\xff' * width) * height
    return (b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', width, height, 8, 2, 0, 0, 0))
            + chunk(b'IDAT', zlib.compress(pixels)) + chunk(b'IEND', b''))


class ControllerTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix='pms-loop-test-')
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name).resolve()
        self.catalog = loop.load_catalog()
        for source in self.catalog['sources'].values():
            target = self.root / source['path']
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(PROJECT / source['path'], target)
        self.command('init')
        self.package = {'packageManager': 'pnpm@10.0.0', 'scripts': {
            name: 'fixture-command' for name in ('typecheck', 'lint', 'build', 'test:domain', 'test:e2e')}}
        loop.write_json(self.root / 'package.json', self.package)
        (self.root / 'src').mkdir()
        (self.root / 'src/main.ts').write_text('export const fixture = 1;\n')

    def command(self, *args, expected=0):
        output = io.StringIO()
        with contextlib.redirect_stdout(output), contextlib.redirect_stderr(output):
            code = loop.main(['--root', str(self.root), *args])
        self.assertEqual(code, expected, output.getvalue())
        return output.getvalue()

    def state(self):
        return loop.read_json(self.root / '.pms-loop/state.json')

    def save_state_fixture(self, state):
        loop.write_json(self.root / '.pms-loop/state.json', state)

    def active_dir(self):
        return self.root / '.pms-loop/runs' / self.state()['active']

    def check_fixture(self, fail=None):
        calls = []

        def fake_command(argv, root, log, timeout, env):
            calls.append(argv[-1])
            log.write_text('Controller test subprocess fixture, not real application validation.\n')
            self.assertEqual(env['PMS_LOOP_REVISION'], loop.revision(self.root))
            self.assertEqual(root, self.root)
            return 7 if argv[-1] == fail else 0

        with patch.object(loop.shutil, 'which', return_value='/fixture/pnpm'), patch.object(loop, 'run_command', fake_command):
            self.command('check', expected=1 if fail else 0)
        return calls

    def fill_evidence_fixture(self):
        directory = self.active_dir()
        receipt = loop.read_json(directory / 'evidence.json')
        definitions = loop.specs(self.catalog)
        artifacts = directory / 'artifacts'
        artifacts.mkdir(exist_ok=True)
        observation = artifacts / 'controller-fixture.txt'
        observation.write_text('Synthetic fixtures for controller validation only. No UI was tested.\n')
        for key, item in receipt['items'].items():
            item['entry'] = definitions[key].get('route', '/fixture').replace(':id', 'fixture-id')
            item['covered_features'] = definitions[key].get('feature_ids', [])
            for check in item['checks'].values():
                check.update(passed=True, observation='Synthetic controller test observation.')
            item['scenarios'] = [{'action': 'fixture action', 'expected': 'fixture expected', 'observed': 'fixture observed'}]
            item['artifacts'] = [observation.relative_to(self.root).as_posix()]
            for width in item.get('screenshots', {}):
                image = artifacts / f'{key}-fixture-{width}.png'
                image.write_bytes(png(int(width)))
                item['screenshots'][width] = image.relative_to(self.root).as_posix()
        loop.write_json(directory / 'evidence.json', receipt)
        return receipt

    def complete_foundations_fixture(self):
        for key in loop.FOUNDATIONS:
            self.command('begin', '--items', key)
            self.check_fixture()
            self.fill_evidence_fixture()
            self.command('accept')

    def test_catalog_covers_72_pages_317_features_and_20_scoped_items(self):
        mapped = {f for p in self.catalog['pages'] for f in p['feature_ids']}
        self.assertEqual(len(mapped), 317)
        self.assertEqual(set(self.catalog['cross_cutting_features']), self.catalog['features'].keys() - mapped)
        self.assertEqual(self.catalog['mock_minimums']['正式项目'], 60)
        self.command('inspect')

    def test_init_preserves_handwritten_progress_and_active_round(self):
        path = self.root / 'DEV_PROGRESS.md'
        path.write_text('我的计划：先讨论预算。\n' + path.read_text() + '\n人工记录：保留。\n')
        self.command('begin', '--items', 'FND-01')
        active = self.state()['active']
        self.command('init')
        self.assertEqual(self.state()['active'], active)
        self.assertIn('我的计划：先讨论预算。', path.read_text())
        self.assertIn('人工记录：保留。', path.read_text())
        self.assertEqual(path.read_text().count(loop.START), 1)

    def test_bad_progress_markers_do_not_change_state(self):
        before = self.state()
        (self.root / 'DEV_PROGRESS.md').write_text(loop.START + '\nIncomplete manual edit')
        self.command('note', '--text', 'must not save', expected=1)
        self.assertEqual(self.state(), before)

    def test_cannot_skip_foundations_or_finish_early(self):
        self.command('begin', '--items', 'GL-01', expected=1)
        self.command('begin', '--items', 'FINAL', expected=1)
        self.command('begin', '--items', 'FND-01', 'FND-01', expected=1)
        self.command('begin', '--items', 'UNKNOWN', expected=1)
        self.assertIsNone(self.state()['active'])

    def test_active_round_resumes_without_duplicate_work(self):
        self.command('begin', '--items', 'FND-01')
        active = self.state()['active']
        self.assertIn(active, self.command('next'))
        self.command('begin', '--items', 'FND-01', expected=1)
        self.assertEqual(len(self.state()['runs']), 1)

    def test_orphaned_plan_from_interruption_is_not_overwritten(self):
        orphan = self.root / '.pms-loop/runs/R0001'
        orphan.mkdir(parents=True)
        (orphan / 'plan.json').write_text('preserve orphan')
        self.command('begin', '--items', 'FND-01')
        self.assertEqual(self.state()['active'], 'R0002')
        self.assertEqual((orphan / 'plan.json').read_text(), 'preserve orphan')

    def test_build_pass_alone_does_not_accept_ui(self):
        self.command('begin', '--items', 'FND-01')
        calls = self.check_fixture()
        self.assertEqual(calls, ['typecheck', 'lint', 'build'])
        self.command('accept', expected=1)
        self.assertEqual(self.state()['items']['FND-01']['status'], 'active')

    def test_domain_check_required_after_foundation(self):
        self.complete_foundations_fixture()
        self.command('begin', '--items', 'GL-01')
        self.assertEqual(self.check_fixture(), ['typecheck', 'lint', 'build', 'test:domain'])

    def test_failed_checks_cannot_be_overridden_with_receipt(self):
        self.command('begin', '--items', 'FND-01')
        self.check_fixture(fail='lint')
        self.fill_evidence_fixture()
        self.command('accept', expected=1)
        self.assertEqual(self.state()['runs'][-1]['checks']['lint'], 'fail')

    def test_receipt_requires_existing_valid_screenshots_and_feature_coverage(self):
        self.complete_foundations_fixture()
        self.command('begin', '--items', 'GL-01')
        self.check_fixture()
        receipt = self.fill_evidence_fixture()
        target = self.active_dir() / 'evidence.json'
        receipt['items']['GL-01']['covered_features'] = []
        loop.write_json(target, receipt)
        self.command('accept', expected=1)
        receipt = self.fill_evidence_fixture()
        image = self.root / receipt['items']['GL-01']['screenshots']['1280']
        image.write_bytes(png(800))
        self.command('accept', expected=1)
        image.write_bytes(png(1280))
        self.command('accept')
        self.assertEqual(self.state()['items']['GL-01']['status'], 'done')
        self.assertIn('1 / 72', (self.root / 'DEV_PROGRESS.md').read_text())

    def test_source_changes_stale_receipt_and_logs_are_integrity_checked(self):
        self.command('begin', '--items', 'FND-01')
        self.check_fixture()
        self.fill_evidence_fixture()
        (self.root / 'src/main.ts').write_text('export const fixture = 2;\n')
        self.command('accept', expected=1)
        self.check_fixture()
        self.command('accept', expected=1)  # check does not silently renew the old receipt
        receipt = self.fill_evidence_fixture()
        receipt['revision'] = loop.revision(self.root)
        loop.write_json(self.active_dir() / 'evidence.json', receipt)
        (self.active_dir() / 'lint.log').write_text('tampered')
        self.command('accept', expected=1)

    def test_defer_reopen_preserve_history(self):
        self.command('begin', '--items', 'FND-01')
        self.command('note', '--text', '浏览器尚未准备好；下一步先验证布局')
        active = self.state()['active']
        self.command('defer', '--reason', 'fixture missing browser')
        self.command('next', expected=1)
        self.command('reopen', '--items', 'FND-01', '--reason', 'browser restored')
        self.assertEqual(self.state()['items']['FND-01']['status'], 'pending')
        self.assertTrue((self.root / '.pms-loop/runs' / active / 'plan.json').is_file())
        self.assertEqual(self.state()['runs'][0]['reason'], 'fixture missing browser')

    def test_doc_drift_blocks_checks_but_allows_checkpoint(self):
        source = self.root / self.catalog['sources']['prd']['path']
        source.write_text(source.read_text() + '\n需求改变\n')
        self.command('inspect', expected=1)
        self.command('begin', '--items', 'FND-01', expected=1)
        self.command('note', '--text', '需要审查PRD差异')
        self.assertIn('需要审查PRD差异', self.state()['notes'][-1]['text'])

    def test_paths_cannot_escape_project(self):
        with self.assertRaises(loop.LoopError):
            loop.local_path(self.root, '../outside')
        with self.assertRaises(loop.LoopError):
            loop.local_path(self.root, str(PROJECT))
        (self.root / 'escape').symlink_to(PROJECT, target_is_directory=True)
        with self.assertRaises(loop.LoopError):
            loop.local_path(self.root, 'escape/docs', exists=True)

    def test_package_manager_uses_existing_lock_and_rejects_conflict(self):
        package = {'scripts': self.package['scripts']}
        loop.write_json(self.root / 'package.json', package)
        (self.root / 'package-lock.json').write_text('{}')
        self.assertEqual(loop.package_manager(self.root)[0], 'npm')
        (self.root / 'yarn.lock').write_text('fixture')
        with self.assertRaises(loop.LoopError):
            loop.package_manager(self.root)

    def test_read_commands_do_not_rewrite_state_or_progress(self):
        paths = [self.root / '.pms-loop/state.json', self.root / 'DEV_PROGRESS.md']
        before = [path.read_bytes() for path in paths]
        for command in ('status', 'inspect', 'next'):
            self.command(command)
        self.assertEqual(before, [path.read_bytes() for path in paths])

    def test_final_report_requires_all_routes_viewports_roles_and_journeys(self):
        rev = loop.revision(self.root)
        report = {'revision': rev,
                  'pages': [{'id': p['id'], 'entry': p['route'].replace(':id', 'fixture-id'), 'passed': True,
                             'viewports': [1280, 1440]} for p in self.catalog['pages']],
                  'journeys': {k: True for k in loop.JOURNEYS}, 'roles': {k: True for k in loop.ROLES}}
        path = self.root / '.pms-loop/route-report.json'
        loop.write_json(path, report)
        loop.check_route_report(self.root, path, self.catalog, rev)
        for fault in ('duplicate', 'viewport', 'role', 'journey', 'revision', 'parameter'):
            with self.subTest(fault=fault):
                broken = json.loads(json.dumps(report))
                if fault == 'duplicate':
                    broken['pages'][-1] = broken['pages'][0]
                elif fault == 'viewport':
                    broken['pages'][0]['viewports'] = [1440]
                elif fault == 'role':
                    broken['roles']['finance'] = False
                elif fault == 'journey':
                    broken['journeys']['accounting'] = False
                elif fault == 'revision':
                    broken['revision'] = 'old'
                else:
                    broken['pages'][0]['entry'] = '/projects/:id'
                loop.write_json(path, broken)
                with self.assertRaises(loop.LoopError):
                    loop.check_route_report(self.root, path, self.catalog, rev)

    def test_final_acceptance_requires_e2e_report_and_documents(self):
        state = self.state()
        for key, item in state['items'].items():
            if key != 'FINAL':
                item['status'] = 'done'  # isolated prerequisite fixture, not an app completion claim
        self.save_state_fixture(state)
        for path in ('README.md', 'docs/routes-fixture.md', 'docs/mock-fixture.md'):
            (self.root / path).write_text('Controller test document fixture.\n')
        self.command('begin', '--items', 'FINAL')
        self.assertEqual(self.check_fixture(), ['typecheck', 'lint', 'build', 'test:domain', 'test:e2e'])
        receipt = self.fill_evidence_fixture()
        self.command('accept', expected=1)
        item = receipt['items']['FINAL']
        item['documents'] = {'readme': 'README.md', 'routes': 'docs/routes-fixture.md', 'mock': 'docs/mock-fixture.md'}
        report = {'revision': loop.revision(self.root),
                  'pages': [{'id': p['id'], 'entry': p['route'].replace(':id', 'fixture-id'),
                             'passed': True, 'viewports': [1280, 1440]} for p in self.catalog['pages']],
                  'journeys': {k: True for k in loop.JOURNEYS}, 'roles': {k: True for k in loop.ROLES}}
        path = self.active_dir() / 'artifacts/route-report.json'
        loop.write_json(path, report)
        item['route_report'] = path.relative_to(self.root).as_posix()
        loop.write_json(self.active_dir() / 'evidence.json', receipt)
        self.command('accept')
        self.assertEqual(self.state()['status'], 'complete')
        self.assertIn('"status": "complete"', self.command('status'))

    def test_reconcile_requires_updated_sources_and_preserves_previous_records(self):
        self.command('note', '--text', 'previous history')
        updated = json.loads(json.dumps(self.catalog))
        source = self.root / updated['sources']['prd']['path']
        source.write_text(source.read_text() + '\nReviewed fixture change\n')
        updated['sources']['prd']['sha256'] = loop.digest(source)
        alternate = self.root / '.pms-loop/catalog-fixture.json'
        loop.write_json(alternate, updated)
        with patch.object(loop, 'CATALOG', alternate):
            self.command('status', expected=1)
            self.command('reconcile', '--items', 'GL-01', '--reason', 'reviewed source fixture delta')
            self.command('status')
        self.assertEqual(self.state()['catalog_sha256'], loop.digest(alternate))
        self.assertEqual(self.state()['notes'][0]['text'], 'previous history')

    def test_complete_state_is_invalidated_when_source_changes(self):
        state = self.state()
        state.update(status='complete', completion_revision=loop.revision(self.root))
        for item in state['items'].values():
            item['status'] = 'done'
        self.save_state_fixture(state)
        self.assertIn('"status": "complete"', self.command('status'))
        (self.root / 'src/main.ts').write_text('export const changed = true;\n')
        self.assertIn('needs_revalidation', self.command('status'))
        self.assertIn('FINAL', self.command('next'))

    def test_real_subprocess_exit_and_timeout_are_recorded(self):
        log = self.root / '.pms-loop/process.log'
        result = loop.run_command([sys.executable, '-c', 'print("failure fixture"); raise SystemExit(9)'],
                                  self.root, log, 5, os.environ.copy())
        self.assertEqual(result, 9)
        self.assertIn('failure fixture', log.read_text())
        result = loop.run_command([sys.executable, '-c', 'import time; time.sleep(10)'],
                                  self.root, log, 0.1, os.environ.copy())
        self.assertEqual(result, 124)
        self.assertIn('timed out', log.read_text())


if __name__ == '__main__':
    unittest.main(verbosity=2)
