#!/usr/bin/env python3
"""Read-only validation of an independent agent's delivery range."""
import argparse
import fnmatch
import json
import subprocess
import sys

SHARED = (
    'src/hooks/*', 'src/mock/access.ts', 'src/mock/access-scope.ts',
    'src/mock/configuration-access.ts', 'src/models/configuration-access.ts',
    'src/mock/configuration.ts', 'src/models/configuration.ts',
    'src/mock/configuration-finance.ts', 'src/models/configuration-finance.ts',
    'src/mock/business.ts', 'src/mock/index.ts', 'src/models/types.ts',
    'src/mock/selectors.ts', 'src/mock/todos.ts', 'src/mock/exceptions.ts',
    'src/mock/archive-lock.ts', 'src/mock/construction-lock.ts',
    'src/utils/*', 'src/store/*', 'src/components/*', 'src/styles/*',
    'src/routes/index.tsx', 'src/routes/manifest*', 'src/routes/navigation*',
    'package.json', '*lock*', '*config.*', 'AGENTS.md', 'DEV_PROGRESS.md',
    'docs/*', 'skills/*', '.pms-loop/*', '.agents/*', '.codex/*',
)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--workdir', required=True)
    parser.add_argument('--base', required=True)
    parser.add_argument('--head', default='HEAD')
    parser.add_argument('--allow', action='append', required=True)
    args = parser.parse_args()

    def git(*argv):
        return subprocess.check_output(['git', '-C', args.workdir, *argv])

    try:
        base = git('rev-parse', '--verify', args.base + '^{commit}').decode().strip()
        head = git('rev-parse', '--verify', args.head + '^{commit}').decode().strip()
        git('merge-base', '--is-ancestor', base, head)
        revision = f'{base}..{head}'
        merges = git('rev-list', '--merges', revision).decode().splitlines()
        # Inspect every commit, including paths later reverted and rename origins.
        raw = git('log', '--format=', '--name-only', '--no-renames', '-z', revision)
        paths = sorted({p.decode().strip('\n') for p in raw.split(b'\0') if p.strip(b'\n')})
        shared = [p for p in paths if any(fnmatch.fnmatchcase(p, pat) for pat in SHARED)]
        outside = [p for p in paths if not any(fnmatch.fnmatchcase(p, pat) for pat in args.allow)]
        conflicts = git('diff', '--name-only', '--diff-filter=U').decode().splitlines()
        passed = bool(paths) and not (shared or outside or merges or conflicts)
        print(json.dumps(dict(passed=passed, base=base, head=head, paths=paths,
                              shared_paths=shared, outside_owned_paths=outside,
                              merge_commits=merges, unresolved_conflicts=conflicts),
                         ensure_ascii=False, indent=2))
        return 0 if passed else 1
    except subprocess.CalledProcessError as error:
        print(f'Invalid delivery range or repository: {error}', file=sys.stderr)
        return 2


if __name__ == '__main__':
    sys.exit(main())
