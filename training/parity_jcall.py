# -*- coding: utf-8 -*-
"""조커콜 증류 교사 ↔ 배포 가드 판정 일치 검사.

파이썬 conv_target(act_jcall=True)와 JS jokerCallGuard가 같은 국면에서 같은
결정을 내려야 한다. 어긋나면 모델이 배포와 다른 규칙을 배운다.

JS 쪽 판정은 tools/research/dump_jcall_states.js가 뽑아 둔 jsonl을 읽는다.
사용: python parity_jcall.py <states.jsonl>
"""
import json, sys
from mighty_engine import MightyGame, JOKER, is_joker, same
from mighty_encode import conv_target


def pyc(c):
    """JS 카드 표기({suit,rank} / 'JOKER') → 파이썬 표기(('S',14) / 'JOKER')"""
    if c is None:
        return None
    if isinstance(c, str):
        return JOKER if c == 'JOKER' else c
    if isinstance(c, dict):
        return JOKER if c.get('suit') is None else (c['suit'], c['rank'])
    if isinstance(c, (list, tuple)):
        return (c[0], c[1])
    return c


def pya(a):
    """액션 안의 카드 표기를 전부 변환"""
    a = dict(a)
    if 'card' in a:
        a['card'] = pyc(a['card'])
    if 'discard' in a and a['discard']:
        a['discard'] = [pyc(c) for c in a['discard']]
    return a


def rebuild(rec, upto):
    g = MightyGame(rec['cfg'])
    g.start(rec['dealer'])
    for a in rec['actions'][:upto]:
        g.act(pya(a))
    return g


def main(path):
    n = ok = 0
    mism = []
    for line in open(path, encoding='utf-8'):
        rec = json.loads(line)
        g = rebuild(rec, rec['upto'])
        seat = rec['seat']
        tc = conv_target(g, seat, None, act_jcall=True)
        py_fires = tc is not None
        js_fires = rec['jsFires']
        n += 1
        js_card = pyc(rec['jsCard']) if rec['jsCard'] else None
        if py_fires == js_fires and (not py_fires or same(tc, js_card)):
            ok += 1
        else:
            mism.append((rec.get('seed'), rec['upto'], py_fires, js_fires,
                         tc, rec.get('jsCard')))
    print(f'조커콜 교사·가드 일치 {ok}/{n}')
    for m in mism[:10]:
        print('  불일치:', m)
    sys.exit(0 if ok == n else 1)


if __name__ == '__main__':
    main(sys.argv[1] if len(sys.argv) > 1 else 'jcall_states.jsonl')
