#!/usr/bin/env python3
"""Validate PMS catalog against its raw sources, plus local skill resource links."""
import argparse
from pathlib import Path
import re
import sys

import loop


def validate(root):
    catalog = loop.load_catalog()
    loop.inspect_sources(root, catalog)
    documents = {key: (root / value['path']).read_text(encoding='utf-8').splitlines()
                 for key, value in catalog['sources'].items()}
    routes = {}
    for number, raw in enumerate(documents['brief'], 1):
        match = re.fullmatch(r'\| ((?:WK|GS|YS|HS|JS|GL|CF)-\d{2}) \| (.*?) \| `([^`]+)` \|', raw)
        if match:
            key, title, route = match.groups()
            loop.require(key not in routes, f'原文路由重复: {key}')
            routes[key] = (title, route, number)
    page_rows = {}
    for number, raw in enumerate(documents['pages'], 1):
        if re.match(r'^\| (WK|GS|YS|HS|JS|GL|CF)-\d{2} \|', raw):
            cells = [v.strip() for v in raw.strip('|').split('|')]
            key, title, kind, roles, scope = cells
            page_rows[key] = (title, kind, roles, scope, number)
    features = {}
    for number, raw in enumerate(documents['features'], 1):
        if re.match(r'^\| (GS|YS|HS|JS|PT|BI|IN|NFR)-\d{3} \|', raw):
            cells = [v.strip() for v in raw.strip('|').split('|')]
            features[cells[0]] = {'title': cells[3], 'line': number}
    loop.require(features == catalog['features'], '功能ID、标题或来源行与原文不符')
    expected = {page['id'] for page in catalog['pages']}
    loop.require(expected == routes.keys() == page_rows.keys(), '页面清单、路由与目录ID不一致')
    for page in catalog['pages']:
        key = page['id']
        loop.require(routes[key] == (page['title'], page['route'], page['source_lines']['brief']), f'{key}任务书路由映射错误')
        loop.require(page_rows[key] == (page['title'], page['kind'], page['roles'], page['upstream_feature_scope'],
                                       page['source_lines']['pages']), f'{key}页面文档映射错误')
        loop.require(len(page['criteria']) >= 2 and all(v.strip() for v in page['criteria']), f'{key}缺专属验收条件')
    mapped = {key for page in catalog['pages'] for key in page['feature_ids']}
    loop.require(len(mapped) == 317, '业务/公共/BI功能应全部映射到页面（317项）')
    loop.require(set(catalog['cross_cutting_features']) == features.keys() - mapped, '集成及NFR边界清单错误')
    source = '\n'.join(documents['brief']).split('## 7.2 ')[1].split('## 7.3 ')[0]
    minimums = {m[1]: int(m[2]) for row in source.splitlines()
                if (m := re.fullmatch(r'\| (.+?) \| (\d+) \|', row))}
    loop.require(minimums == catalog['mock_minimums'], '31类Mock最低数量与原文不符')
    skill = Path(__file__).resolve().parent.parent
    for path in [skill / 'SKILL.md', *sorted((skill / 'references').glob('*.md'))]:
        body = path.read_text(encoding='utf-8')
        for target in re.findall(r'\]\(([^)]+)\)', body):
            if '://' not in target and not target.startswith('#'):
                resolved = (path.parent / target.split('#')[0]).resolve()
                loop.require(resolved.is_relative_to(skill) and resolved.is_file(), f'{path.name}: 资源链接无效 {target}')
        loop.require(not re.search(r'\[TODO:|\[INSERT|Coming Soon', body), f'{path.name}: 有脚手架占位内容')
    print('Bundle valid: 4 original sources, 72 routes, 317 mapped + 20 scoped features, 31 Mock minimums, local references.')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', type=Path, default=Path.cwd())
    args = parser.parse_args()
    try:
        validate(args.root.resolve())
        return 0
    except (loop.LoopError, OSError, KeyError, ValueError, IndexError) as exc:
        print(f'Bundle invalid: {exc}', file=sys.stderr)
        return 1


if __name__ == '__main__':
    sys.exit(main())
