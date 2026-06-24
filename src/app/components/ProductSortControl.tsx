import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { ArrowDownUp, X } from 'lucide-react';
import {
  SORT_FIELDS,
  SortField,
  SortOption,
  fieldOf,
  dirOf,
} from '../utils/sortProducts';

interface Props {
  value: SortOption[];
  onChange: (value: SortOption[]) => void;
  className?: string;
}

/**
 * "Ordenar por" control that supports ordering by several parameters at once.
 * Each chosen field shows its priority (1, 2, 3…) — the order in which it was
 * selected — and its direction can be flipped. Selecting a field's active
 * direction again removes it from the sort.
 */
export function ProductSortControl({ value, onChange, className }: Props) {
  const indexOfField = (field: SortField) => value.findIndex((o) => fieldOf(o) === field);

  const setDirection = (field: SortField, dir: 'asc' | 'desc') => {
    const option = `${field}-${dir}` as SortOption;
    const idx = indexOfField(field);
    if (idx === -1) {
      onChange([...value, option]); // add as the lowest-priority criterion
    } else if (value[idx] === option) {
      onChange(value.filter((_, i) => i !== idx)); // toggling the active dir removes it
    } else {
      onChange(value.map((o, i) => (i === idx ? option : o))); // flip direction, keep priority
    }
  };

  const summary =
    value.length === 0
      ? 'Ordenar por'
      : value
          .map((o) => {
            const meta = SORT_FIELDS.find((f) => f.field === fieldOf(o))!;
            return meta.label;
          })
          .join(' › ');

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className={`justify-start font-normal ${className || ''}`}>
          <ArrowDownUp className="w-4 h-4 mr-2 shrink-0" />
          <span className="truncate">{summary}</span>
          {value.length > 0 && (
            <span className="ml-2 shrink-0 rounded-full bg-amber-500 text-slate-900 text-xs font-semibold min-w-[20px] h-5 px-1 flex items-center justify-center">
              {value.length}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-2">
        <div className="flex items-center justify-between px-2 py-1.5">
          <span className="text-sm font-semibold text-slate-700">Ordenar por</span>
          {value.length > 0 && (
            <button
              type="button"
              onClick={() => onChange([])}
              className="text-xs text-slate-500 hover:text-slate-700 inline-flex items-center gap-1"
            >
              <X className="w-3 h-3" />
              Limpiar
            </button>
          )}
        </div>
        <p className="px-2 pb-1.5 text-xs text-slate-400">
          El orden de selección define la prioridad.
        </p>
        <div className="space-y-1">
          {SORT_FIELDS.map((f) => {
            const idx = indexOfField(f.field);
            const active = idx !== -1;
            const dir = active ? dirOf(value[idx]) : undefined;
            return (
              <div
                key={f.field}
                className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-slate-50"
              >
                <span
                  className={`flex items-center justify-center w-5 h-5 rounded-full text-xs font-semibold shrink-0 ${
                    active ? 'bg-amber-500 text-slate-900' : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  {active ? idx + 1 : '·'}
                </span>
                <span className="flex-1 text-sm text-slate-700">{f.label}</span>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => setDirection(f.field, 'asc')}
                    className={`text-xs px-2 py-1 rounded border ${
                      active && dir === 'asc'
                        ? 'bg-amber-500 border-amber-500 text-slate-900 font-medium'
                        : 'border-slate-200 text-slate-500 hover:bg-slate-100'
                    }`}
                  >
                    {f.ascLabel}
                  </button>
                  <button
                    type="button"
                    onClick={() => setDirection(f.field, 'desc')}
                    className={`text-xs px-2 py-1 rounded border ${
                      active && dir === 'desc'
                        ? 'bg-amber-500 border-amber-500 text-slate-900 font-medium'
                        : 'border-slate-200 text-slate-500 hover:bg-slate-100'
                    }`}
                  >
                    {f.descLabel}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
