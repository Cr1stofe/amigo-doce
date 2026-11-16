'use client';

import * as Popover from '@radix-ui/react-popover';
import { DayPicker } from 'react-day-picker';
import { ptBR } from 'date-fns/locale';
import 'react-day-picker/style.css';

export function DateTimePicker({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const selected = value ? new Date(`${value.slice(0, 10)}T12:00:00`) : undefined;
  const date = selected && !Number.isNaN(selected.getTime()) ? selected : undefined;
  const time = value.slice(11, 16) || '12:00';
  const setDate = (day: Date | undefined) => {
    if (!day) return onChange('');
    const localDate = [day.getFullYear(), String(day.getMonth() + 1).padStart(2, '0'), String(day.getDate()).padStart(2, '0')].join('-');
    onChange(`${localDate}T${time}`);
  };
  return <div className="date-picker">
    <Popover.Root>
      <Popover.Trigger asChild><button type="button" className="date-trigger"><svg className="date-trigger-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="3.5" y="5.5" width="17" height="15" rx="2.5" stroke="currentColor" strokeWidth="1.6"/><path d="M7.5 3.5v4M16.5 3.5v4M3.5 10h17" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg><span className="date-trigger-text">{date ? date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }) : 'Escolher data'}</span><svg className="date-trigger-chevron" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="m4.5 6 3.5 3.5L11.5 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg></button></Popover.Trigger>
      <Popover.Portal><Popover.Content className="calendar-popover" sideOffset={8} align="start">
        <DayPicker mode="single" selected={date} onSelect={setDate} locale={ptBR} defaultMonth={date} showOutsideDays />
        {date && <button type="button" className="calendar-clear" onClick={() => onChange('')}>Limpar data</button>}
      </Popover.Content></Popover.Portal>
    </Popover.Root>
    {date && <div className="time-selects"><span className="time-label">Horário</span><TimePart label="Hora" value={time.slice(0, 2)} count={24} onChange={hour => onChange(`${value.slice(0, 10)}T${hour}:${time.slice(3, 5)}`)} /><span className="time-divider">:</span><TimePart label="Minuto" value={time.slice(3, 5)} count={60} onChange={minute => onChange(`${value.slice(0, 10)}T${time.slice(0, 2)}:${minute}`)} /></div>}
  </div>;
}

function TimePart({ label, value, count, onChange }: { label: string; value: string; count: number; onChange: (value: string) => void }) {
  return <Popover.Root><Popover.Trigger asChild><button type="button" className="time-trigger" aria-label={`${label}: ${value}`}>{value}<svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="m3 4.5 3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg></button></Popover.Trigger><Popover.Portal><Popover.Content className="time-popover" sideOffset={6} align="start" aria-label={`Escolher ${label.toLowerCase()}`}><div className="time-options">{Array.from({ length: count }, (_, i) => { const option = String(i).padStart(2, '0'); return <Popover.Close asChild key={option}><button type="button" className={option === value ? 'selected' : ''} onClick={() => onChange(option)} aria-label={`${label} ${option}`} aria-pressed={option === value}>{option}</button></Popover.Close>; })}</div></Popover.Content></Popover.Portal></Popover.Root>;
}
