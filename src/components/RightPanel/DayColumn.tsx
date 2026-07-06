import { useState, useEffect } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { WorkRow, DayType } from '../../types';
import { fetchAppFieldOptions } from '../../api/fieldOptionsApi';

const WORK_DAY_APP_ID = 1525;
import WorkCard from './WorkCard';
import './DayColumn.css';

type Props = {
  dayKey: DayType;
  date: string;
  rows: WorkRow[];
  recordId: string | null;
  selectedSourceIds: string[];
  scheduledTime?: string;
  clockInTime?: string;
  scheduledOutTime?: string;
  clockOutTime?: string;
  isToday?: boolean;
  onAdd?: (dayKey: DayType) => void;
  onDelete?: (dayKey: DayType, subtableId: string) => void;
  onSave?: (dayKey: DayType, updatedRow: WorkRow) => void;
  onCopy?: (row: WorkRow) => void;
  onClockIn?: () => Promise<void>;
  onClockOut?: () => Promise<void>;
  workLocation?: string;
  onWorkLocationChange?: (location: string) => void;
};

const DOW = ['週日', '週一', '週二', '週三', '週四', '週五', '週六'];

const DayColumn = ({ dayKey, date, rows, recordId, selectedSourceIds, scheduledTime, clockInTime, scheduledOutTime, clockOutTime, isToday, onAdd, onDelete, onSave, onCopy, onClockIn, onClockOut, workLocation, onWorkLocationChange }: Props) => {
  const [isClocking, setIsClocking] = useState(false);
  const [isClockingOut, setIsClockingOut] = useState(false);
  const [locationOptions, setLocationOptions] = useState<string[]>([]);

  useEffect(() => {
    fetchAppFieldOptions(WORK_DAY_APP_ID)
      .then(opts => { if (opts['工作地點']) setLocationOptions(opts['工作地點']); })
      .catch(() => {});
  }, []);
  const { setNodeRef, isOver } = useDroppable({ id: `droppable-${dayKey}` });
  const sortableIds = rows.map(r => `work-${dayKey}-${r.subtableId}`);

  const dowLabel = DOW[new Date(date).getDay()];

  const handleDateClick = () => {
    if (!recordId) return;
    const url = `${window.location.protocol}//${window.location.host}${window.location.pathname}show#record=${recordId}`;
    window.open(url, '_blank');
  };

  const handleClockIn = async () => {
    if (!onClockIn) return;
    setIsClocking(true);
    try { await onClockIn(); } finally { setIsClocking(false); }
  };

  const handleClockOut = async () => {
    if (!onClockOut) return;
    setIsClockingOut(true);
    try { await onClockOut(); } finally { setIsClockingOut(false); }
  };

  return (
    <div className={`day-column ${isOver ? 'over' : ''} ${isToday ? 'today' : ''}`}>
      <div className="day-column__header">
        <span className="day-column__dow">{dowLabel}</span>
        <span
          className={`day-column__date ${recordId ? 'clickable' : ''}`}
          onClick={handleDateClick}
        >
          {date}
        </span>
        {isToday && <span className="day-column__today-badge">今</span>}

        {scheduledTime && (
          <span className="day-column__clocked">
            {scheduledTime}&nbsp;
            {clockInTime
              ? <span style={{ color: '#389e0d' }}>({clockInTime})</span>
              : isToday
                ? <button className="day-column__clockin" onClick={handleClockIn} disabled={isClocking}>
                    {isClocking ? '定位中...' : '上班打卡'}
                  </button>
                : null
            }
          </span>
        )}
        {!scheduledTime && isToday && !clockInTime && (
          <button className="day-column__clockin" onClick={handleClockIn} disabled={isClocking}>
            {isClocking ? '定位中...' : '上班打卡'}
          </button>
        )}

        {isToday && onWorkLocationChange && (
          <span className="day-column__location-wrap">
            <span className="day-column__location-label">工作地點:</span>
            <select
              className="day-column__location"
              value={workLocation || ''}
              onChange={e => onWorkLocationChange(e.target.value)}
            >
              <option value=""></option>
              {locationOptions.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </span>
        )}

        {scheduledOutTime && (
          <span className="day-column__clocked">
            {scheduledOutTime}&nbsp;
            {clockOutTime
              ? <span style={{ color: '#1677ff' }}>({clockOutTime})</span>
              : isToday
                ? <button className="day-column__clockout" onClick={handleClockOut} disabled={isClockingOut}>
                    {isClockingOut ? '記錄中...' : '下班打卡'}
                  </button>
                : null
            }
          </span>
        )}
        {!scheduledOutTime && isToday && !clockOutTime && (
          <button className="day-column__clockout" onClick={handleClockOut} disabled={isClockingOut}>
            {isClockingOut ? '記錄中...' : '下班打卡'}
          </button>
        )}

        {onAdd && (
          <button
            className={`day-column__add ${selectedSourceIds.length === 0 ? 'disabled' : ''}`}
            onClick={() => onAdd(dayKey)}
            title={selectedSourceIds.length === 0 ? '請先在左邊選取項目' : '新增'}
          >＋</button>
        )}

        <span style={{ flex: 1 }} />
        {recordId && <span className="day-column__link" onClick={handleDateClick}>→</span>}
      </div>

      <div ref={setNodeRef} className="day-column__body">
        <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
          {rows.map(row => (
            <WorkCard
              key={row.subtableId}
              row={row}
              dayKey={dayKey}
              onDelete={onDelete ? (id) => onDelete(dayKey, id) : undefined}
              onSave={onSave ? (updated) => onSave(dayKey, updated) : undefined}
              onCopy={onCopy ? () => onCopy(row) : undefined}
            />
          ))}
        </SortableContext>
        {rows.length === 0 && (
          <div className="day-column__empty">拖拉或點選左邊項目新增</div>
        )}
      </div>
    </div>
  );
};

export default DayColumn;
