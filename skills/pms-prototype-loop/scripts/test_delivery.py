"""Delivery ownership must protect shared interfaces even when accidentally allowed."""
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

SCRIPT = Path(__file__).with_name('check_delivery.py')

class DeliveryTests(unittest.TestCase):
    def test_shared_interfaces_cannot_be_whitelisted(self):
        self.check_paths(['src/hooks/useActionAccess.ts', 'src/mock/access.ts',
                          'src/mock/configuration-access.ts', 'src/models/configuration-access.ts'], False)

    def test_owned_domain_delivery_is_allowed(self):
        self.check_paths(['src/pages/settlement/OperationsPage.tsx'], True)

    def check_paths(self, paths, allowed):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            def git(*args):
                return subprocess.check_output(['git', '-C', str(root), *args], stderr=subprocess.DEVNULL).decode().strip()
            git('init', '-q')
            git('config', 'user.email', 'test@example.invalid')
            git('config', 'user.name', 'Test')
            git('commit', '--allow-empty', '-qm', 'base')
            base = git('rev-parse', 'HEAD')
            for path in paths:
                target = root / path
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_text('export {};\n')
            git('add', '.')
            git('commit', '-qm', 'delivery')
            command = [sys.executable, str(SCRIPT), '--workdir', str(root), '--base', base]
            for path in paths:
                command += ['--allow', path]
            result = subprocess.run(command, text=True, capture_output=True)
            self.assertEqual(result.returncode, 0 if allowed else 1, result.stderr)
            report = json.loads(result.stdout)
            self.assertEqual(report['passed'], allowed)
            self.assertEqual(report['shared_paths'], [] if allowed else sorted(paths))

if __name__ == '__main__':
    unittest.main()
