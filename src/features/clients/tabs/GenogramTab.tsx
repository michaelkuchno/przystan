import { useRef, useState, type PointerEvent as RPointerEvent, type KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Link2, Trash2, Network, X } from 'lucide-react';
import { Card, Button, EmptyState, Badge } from '@/components/ui/core';
import { TextInput, Chips, Switch } from '@/components/ui/form';
import { SaveStatus } from '@/components/SaveStatus';
import { useStore, forClient, save, uid } from '@/lib/store';
import { useEditable } from '@/lib/useEditable';
import { haptic } from '@/lib/platform';
import type { Client, GenoEdge, GenoEdgeType, GenoNode, GenoNodeKind, Genogram } from '@/domain/types';

const W = 600;
const H = 400;
const R = 22;
const KINDS: GenoNodeKind[] = ['female', 'male', 'person', 'institution', 'group'];
const EDGES: GenoEdgeType[] = ['family', 'strong', 'weak', 'conflict', 'stressful', 'support', 'cutoff'];

const edgeStyle: Record<GenoEdgeType, { stroke: string; width: number; dash?: string }> = {
  family: { stroke: 'var(--muted)', width: 2 },
  strong: { stroke: 'var(--chart-1)', width: 5 },
  weak: { stroke: 'var(--chart-1)', width: 2, dash: '3 5' },
  conflict: { stroke: 'var(--danger)', width: 2.5 },
  stressful: { stroke: 'var(--chart-2)', width: 2.5, dash: '9 5' },
  support: { stroke: 'var(--chart-3)', width: 3 },
  cutoff: { stroke: 'var(--muted)', width: 2 },
};

function zigzag(x1: number, y1: number, x2: number, y2: number) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const n = Math.max(4, Math.floor(len / 14));
  const nx = -dy / len;
  const ny = dx / len;
  let d = `M${x1},${y1}`;
  for (let i = 1; i < n; i++) {
    const s = i % 2 ? 6 : -6;
    d += ` L${x1 + (dx * i) / n + nx * s},${y1 + (dy * i) / n + ny * s}`;
  }
  return `${d} L${x2},${y2}`;
}

/** Shortens a label on a word boundary so the visible text stays part of the accessible name. */
function shortLabel(label: string, max = 20): string {
  if (label.length <= max) return label;
  const cut = label.slice(0, max);
  const i = cut.lastIndexOf(' ');
  return `${i > 6 ? cut.slice(0, i) : cut}…`;
}

function NodeShape({ n, selected }: { n: GenoNode; selected: boolean }) {
  const fill = n.substance ? 'url(#half)' : 'var(--surface)';
  const stroke = selected ? 'var(--focus)' : n.isClient ? 'var(--primary)' : 'var(--fg)';
  const sw = selected ? 3.5 : 2;
  const shape =
    n.kind === 'male' ? (
      <rect x={-R} y={-R} width={R * 2} height={R * 2} fill={fill} stroke={stroke} strokeWidth={sw} />
    ) : n.kind === 'female' ? (
      <circle r={R} fill={fill} stroke={stroke} strokeWidth={sw} />
    ) : n.kind === 'person' ? (
      <path d={`M0,${-R} L${R},0 L0,${R} L${-R},0 Z`} fill={fill} stroke={stroke} strokeWidth={sw} />
    ) : n.kind === 'institution' ? (
      <rect
        x={-R * 1.4}
        y={-R * 0.8}
        width={R * 2.8}
        height={R * 1.6}
        rx={6}
        fill="var(--blue-soft)"
        stroke={stroke}
        strokeWidth={sw}
      />
    ) : (
      <ellipse rx={R * 1.5} ry={R * 0.95} fill="var(--accent-soft)" stroke={stroke} strokeWidth={sw} />
    );
  return (
    <>
      {n.isClient && <circle r={R + 7} fill="none" stroke="var(--primary)" strokeWidth={2} strokeDasharray="2 3" />}
      {shape}
      {n.deceased && (
        <g stroke="var(--fg)" strokeWidth={2}>
          <line x1={-R + 4} y1={-R + 4} x2={R - 4} y2={R - 4} />
          <line x1={R - 4} y1={-R + 4} x2={-R + 4} y2={R - 4} />
        </g>
      )}
      <text y={R + 16} textAnchor="middle" fontSize={12} fill="var(--fg)" className="pii select-none" style={{ fontWeight: 600 }}>
        {shortLabel(n.label)}
      </text>
    </>
  );
}

function Editor({ geno }: { geno: Genogram }) {
  const { t } = useTranslation('clients');
  const { draft, update, status } = useEditable('genogram', geno);
  const [selected, setSelected] = useState<string | null>(null);
  const [connectFrom, setConnectFrom] = useState<string | null>(null);
  const [edgeType, setEdgeType] = useState<GenoEdgeType>('family');
  const [selectedEdge, setSelectedEdge] = useState<string | null>(null);
  const svg = useRef<SVGSVGElement>(null);
  const drag = useRef<{ id: string; moved: boolean } | null>(null);

  const node = draft.nodes.find((n) => n.id === selected);
  const edge = draft.edges.find((e) => e.id === selectedEdge);
  const toLocal = (e: RPointerEvent) => {
    const r = svg.current!.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H };
  };
  const setNode = (id: string, patch: Partial<GenoNode>) =>
    update((d) => ({ ...d, nodes: d.nodes.map((n) => (n.id === id ? { ...n, ...patch } : n)) }));

  const tapNode = (id: string) => {
    setSelectedEdge(null);
    if (connectFrom && connectFrom !== id) {
      const exists = draft.edges.some((e) => (e.from === connectFrom && e.to === id) || (e.from === id && e.to === connectFrom));
      if (!exists) {
        const e: GenoEdge = { id: uid(), from: connectFrom, to: id, type: edgeType };
        update((d) => ({ ...d, edges: [...d.edges, e] }));
        void haptic('light');
      }
      setConnectFrom(null);
      setSelected(id);
      return;
    }
    setSelected(id);
  };

  const addNode = (kind: GenoNodeKind) => {
    const n: GenoNode = {
      id: uid(),
      label: t(`genogram.kind.${kind}`),
      kind,
      // place new nodes on a spiral around the centre
      x: (Math.round(W / 2 + Math.cos(draft.nodes.length * 2.4) * (60 + draft.nodes.length * 14)) % (W - 2 * R)) + R,
      y: (Math.round(H / 2 + Math.sin(draft.nodes.length * 2.4) * (50 + draft.nodes.length * 9)) % (H - 2 * R)) + R,
    };
    update((d) => ({ ...d, nodes: [...d.nodes, n] }));
    setSelected(n.id);
    void haptic('light');
  };

  const onKey = (e: KeyboardEvent, n: GenoNode) => {
    const step = e.shiftKey ? 20 : 6;
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    };
    const mv = moves[e.key];
    if (mv) {
      e.preventDefault();
      setNode(n.id, { x: Math.min(W - R, Math.max(R, n.x + mv[0])), y: Math.min(H - R, Math.max(R, n.y + mv[1])) });
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      tapNode(n.id);
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
      <Card className="p-2 sm:p-3">
        <div className="mb-2 flex flex-wrap items-center gap-2 px-1">
          {KINDS.map((k) => (
            <Button key={k} size="sm" variant="secondary" onClick={() => addNode(k)} icon={<Plus className="size-4" />}>
              {t(`genogram.kind.${k}`)}
            </Button>
          ))}
          <div className="flex-1" />
          <SaveStatus status={status} />
        </div>
        {connectFrom && (
          <div className="mb-2 flex items-center gap-2 rounded-xl bg-blue-soft px-3 py-2 text-sm" role="status">
            <Link2 className="size-4" aria-hidden />
            {t('genogram.connectHint')}
            <button
              type="button"
              className="ml-auto inline-flex size-9 items-center justify-center"
              aria-label={t('common:cancel')}
              onClick={() => setConnectFrom(null)}
            >
              <X className="size-4" />
            </button>
          </div>
        )}
        <svg
          ref={svg}
          viewBox={`0 0 ${W} ${H}`}
          className="w-full touch-none rounded-2xl bg-surface-2/50"
          role="application"
          aria-label={t('genogram.canvas')}
          onPointerMove={(e) => {
            if (!drag.current) return;
            const p = toLocal(e);
            drag.current.moved = true;
            setNode(drag.current.id, {
              x: Math.round(Math.min(W - R, Math.max(R, p.x))),
              y: Math.round(Math.min(H - R, Math.max(R, p.y))),
            });
          }}
          onPointerUp={() => {
            if (drag.current && !drag.current.moved) tapNode(drag.current.id);
            drag.current = null;
          }}
          onPointerLeave={() => (drag.current = null)}
          onClick={(e) => {
            if (e.target === svg.current) {
              setSelected(null);
              setSelectedEdge(null);
            }
          }}
        >
          <defs>
            <linearGradient id="half" x1="0" y1="0" x2="0" y2="1">
              <stop offset="50%" stopColor="var(--surface)" />
              <stop offset="50%" stopColor="var(--fg)" stopOpacity="0.55" />
            </linearGradient>
          </defs>
          {draft.edges.map((e) => {
            const a = draft.nodes.find((n) => n.id === e.from);
            const b = draft.nodes.find((n) => n.id === e.to);
            if (!a || !b) return null;
            const s = edgeStyle[e.type];
            const mx = (a.x + b.x) / 2;
            const my = (a.y + b.y) / 2;
            return (
              <g
                key={e.id}
                onClick={() => {
                  setSelectedEdge(e.id);
                  setSelected(null);
                }}
                className="cursor-pointer"
              >
                <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="transparent" strokeWidth={18} />
                {e.type === 'conflict' ? (
                  <path d={zigzag(a.x, a.y, b.x, b.y)} fill="none" stroke={s.stroke} strokeWidth={s.width} />
                ) : (
                  <line
                    x1={a.x}
                    y1={a.y}
                    x2={b.x}
                    y2={b.y}
                    stroke={selectedEdge === e.id ? 'var(--focus)' : s.stroke}
                    strokeWidth={s.width}
                    strokeDasharray={s.dash}
                  />
                )}
                {e.type === 'cutoff' && (
                  <g stroke="var(--fg)" strokeWidth={2.5}>
                    <line x1={mx - 6} y1={my - 9} x2={mx - 2} y2={my + 9} />
                    <line x1={mx + 2} y1={my - 9} x2={mx + 6} y2={my + 9} />
                  </g>
                )}
                {e.type === 'support' && <circle cx={mx} cy={my} r={5} fill={s.stroke} />}
              </g>
            );
          })}
          {draft.nodes.map((n) => (
            <g
              key={n.id}
              transform={`translate(${n.x},${n.y})`}
              tabIndex={0}
              role="button"
              aria-label={`${n.label} – ${t(`genogram.kind.${n.kind}`)}`}
              aria-pressed={selected === n.id}
              className="cursor-grab outline-none focus-visible:[&>*]:stroke-[var(--focus)]"
              onPointerDown={(e) => {
                (e.target as Element).setPointerCapture?.(e.pointerId);
                drag.current = { id: n.id, moved: false };
              }}
              onKeyDown={(e) => onKey(e, n)}
            >
              <NodeShape n={n} selected={selected === n.id || connectFrom === n.id} />
            </g>
          ))}
        </svg>
        <p className="mt-2 px-1 text-xs text-muted">{t('genogram.help')}</p>
      </Card>

      <div className="space-y-4">
        {node ? (
          <Card className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">{t('genogram.selected')}</h3>
              <Badge>{t(`genogram.kind.${node.kind}`)}</Badge>
            </div>
            <label className="block text-sm font-medium" htmlFor="geno-label">
              {t('genogram.label')}
            </label>
            <TextInput id="geno-label" value={node.label} onChange={(e) => setNode(node.id, { label: e.target.value })} />
            <Chips
              value={node.kind}
              onChange={(v) => v[0] && setNode(node.id, { kind: v[0] })}
              options={KINDS.map((k) => ({ value: k, label: t(`genogram.kind.${k}`) }))}
            />
            <Switch
              label={t('genogram.isClient')}
              checked={!!node.isClient}
              onChange={(v) => setNode(node.id, { isClient: v })}
            />
            <Switch
              label={t('genogram.substance')}
              checked={!!node.substance}
              onChange={(v) => setNode(node.id, { substance: v })}
            />
            <Switch
              label={t('genogram.deceased')}
              checked={!!node.deceased}
              onChange={(v) => setNode(node.id, { deceased: v })}
            />
            <div className="border-t border-line pt-3">
              <label className="mb-1.5 block text-sm font-medium">{t('genogram.relation')}</label>
              <Chips
                value={edgeType}
                onChange={(v) => v[0] && setEdgeType(v[0])}
                options={EDGES.map((k) => ({ value: k, label: t(`genogram.edge.${k}`) }))}
              />
              <Button
                className="mt-3 w-full"
                variant="soft"
                icon={<Link2 className="size-4" />}
                onClick={() => setConnectFrom(node.id)}
              >
                {t('genogram.connect')}
              </Button>
            </div>
            <Button
              variant="ghost"
              className="w-full text-danger"
              icon={<Trash2 className="size-4" />}
              onClick={() => {
                update((d) => ({
                  ...d,
                  nodes: d.nodes.filter((n) => n.id !== node.id),
                  edges: d.edges.filter((e) => e.from !== node.id && e.to !== node.id),
                }));
                setSelected(null);
              }}
            >
              {t('genogram.deleteNode')}
            </Button>
          </Card>
        ) : edge ? (
          <Card className="space-y-3">
            <h3 className="font-semibold">{t('genogram.relation')}</h3>
            <Chips
              value={edge.type}
              onChange={(v) =>
                v[0] && update((d) => ({ ...d, edges: d.edges.map((x) => (x.id === edge.id ? { ...x, type: v[0]! } : x)) }))
              }
              options={EDGES.map((k) => ({ value: k, label: t(`genogram.edge.${k}`) }))}
            />
            <Button
              variant="ghost"
              className="w-full text-danger"
              icon={<Trash2 className="size-4" />}
              onClick={() => {
                update((d) => ({ ...d, edges: d.edges.filter((x) => x.id !== edge.id) }));
                setSelectedEdge(null);
              }}
            >
              {t('genogram.deleteEdge')}
            </Button>
          </Card>
        ) : (
          <Card>
            <p className="text-sm text-muted">{t('genogram.selectHint')}</p>
          </Card>
        )}
        <Card>
          <h3 className="mb-2 font-semibold">{t('genogram.legend')}</h3>
          <ul className="space-y-1.5 text-sm">
            {EDGES.map((k) => {
              const s = edgeStyle[k];
              return (
                <li key={k} className="flex items-center gap-3">
                  <svg width="44" height="14" aria-hidden>
                    {k === 'conflict' ? (
                      <path d={zigzag(2, 7, 42, 7)} stroke={s.stroke} strokeWidth={s.width} fill="none" />
                    ) : (
                      <line x1="2" y1="7" x2="42" y2="7" stroke={s.stroke} strokeWidth={s.width} strokeDasharray={s.dash} />
                    )}
                    {k === 'cutoff' && <line x1="20" y1="1" x2="24" y2="13" stroke="var(--fg)" strokeWidth={2} />}
                    {k === 'support' && <circle cx="22" cy="7" r="4" fill={s.stroke} />}
                  </svg>
                  {t(`genogram.edge.${k}`)}
                </li>
              );
            })}
          </ul>
          <p className="mt-3 text-xs text-muted">{t('genogram.legendSymbols')}</p>
        </Card>
      </div>
    </div>
  );
}

export default function GenogramTab({ client }: { client: Client }) {
  const { t } = useTranslation('clients');
  const geno = useStore(() => forClient('genogram', client.id))[0];
  if (!geno)
    return (
      <EmptyState
        icon={<Network />}
        title={t('genogram.emptyTitle')}
        text={t('genogram.emptyText')}
        action={
          <Button
            icon={<Plus className="size-4" />}
            onClick={() =>
              void save('genogram', {
                id: uid(),
                clientId: client.id,
                nodes: [
                  {
                    id: uid(),
                    label: client.code,
                    kind: client.sex === 'female' ? 'female' : client.sex === 'male' ? 'male' : 'person',
                    x: W / 2,
                    y: H / 2,
                    isClient: true,
                  },
                ],
                edges: [],
                updatedAt: new Date().toISOString(),
              })
            }
          >
            {t('genogram.create')}
          </Button>
        }
      />
    );
  return <Editor key={geno.id} geno={geno} />;
}
