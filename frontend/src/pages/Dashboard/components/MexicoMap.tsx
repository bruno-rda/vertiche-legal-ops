import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import type { CumplimientoEstado } from '@/client/types.gen';
import { MapTooltip } from './MapTooltip';

export const MAP_CONTAINER_CLASSES = 'relative w-full max-h-[650px]';

interface MexicoMapProps {
  data: CumplimientoEstado[];
}

export function MexicoMap({ data }: MexicoMapProps) {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);

  const [paths, setPaths] = useState<Array<{ id: string; name: string; d: string }>>([]);
  const [hoveredState, setHoveredState] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    fetch('/mx.svg')
      .then((res) => res.text())
      .then((text) => {
        const parser = new DOMParser();
        const doc = parser.parseFromString(text, 'image/svg+xml');
        const pathEls = Array.from(doc.querySelectorAll('path'));
        setPaths(
          pathEls.map((p) => ({
            id: p.getAttribute('id') || '',
            name: p.getAttribute('name') || '',
            d: p.getAttribute('d') || '',
          })),
        );
      })
      .catch((err) => console.error('Error loading SVG map:', err));
  }, []);

  const dataMap = useMemo(() => {
    const map = new Map<string, CumplimientoEstado>();
    data.forEach((d) => map.set(d.estado, d));
    return map;
  }, [data]);

  const getColor = (estadoName: string) => {
    const stateData = dataMap.get(estadoName);
    if (!stateData || stateData.total_tiendas === 0) return 'var(--color-neutral-light)';
    if (stateData.cumplimiento >= 85) return 'var(--color-success)';
    if (stateData.cumplimiento >= 60) return 'var(--color-warning)';
    return 'var(--color-danger)';
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    setMousePos({ x: e.clientX, y: e.clientY });
  };

  const activeData = hoveredState ? dataMap.get(hoveredState) : null;

  return (
    <div
      className={`${MAP_CONTAINER_CLASSES} aspect-[1000/630] flex items-center justify-center bg-surface rounded-xl p-4 overflow-hidden`}
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setHoveredState(null)}
    >
      {paths.length === 0 ? (
        <div className="animate-shimmer w-full h-full rounded-xl" />
      ) : (
        <svg
          viewBox="0 0 1000 630"
          className="w-full h-full drop-shadow-md"
          style={{
            stroke: 'var(--color-surface-card)',
            strokeWidth: 1,
            strokeLinecap: 'round',
            strokeLinejoin: 'round',
          }}
        >
          <g>
            {paths.map((p) => {
              const stateData = dataMap.get(p.name);
              const hasTiendas = stateData && stateData.total_tiendas > 0;
              return (
                <path
                  key={p.id}
                  d={p.d}
                  fill={getColor(p.name)}
                  className={`transition-colors duration-300 ${hasTiendas ? 'cursor-pointer hover:brightness-110' : 'cursor-default'}`}
                  onMouseEnter={() => setHoveredState(p.name)}
                  onMouseLeave={() => setHoveredState(null)}
                  onClick={() => {
                    if (hasTiendas) {
                      navigate(`/tiendas?estado=${encodeURIComponent(p.name)}`);
                    }
                  }}
                />
              );
            })}
          </g>
        </svg>
      )}

      <MapTooltip
        visible={!!hoveredState}
        x={mousePos.x}
        y={mousePos.y}
        estado={hoveredState || ''}
        tiendasCount={activeData?.total_tiendas || 0}
        cumplimiento={activeData?.cumplimiento || 0}
        criticalCount={activeData?.tramites_criticos || 0}
      />
    </div>
  );
}
