import { useState } from 'react';
import { AssignedRow } from '../../types';
import AssignedCard from './AssignedCard';
import MultiSelectDropdown from '../common/MultiSelectDropdown';
import './AssignedPanel.css';

type DeadlineStatus = 'green' | 'orange' | 'red';

const getDeadlineStatus = (due: string): DeadlineStatus => {
  const today = new Date().toISOString().slice(0, 10);
  if (!due || due >= today) return 'green';
  const daysLate = Math.floor((new Date(today).getTime() - new Date(due).getTime()) / 86400000);
  return daysLate <= 3 ? 'orange' : 'red';
};

type Props = {
  rows: AssignedRow[];
  onComplete: (row: AssignedRow) => void;
};

const AssignedPanel = ({ rows, onComplete }: Props) => {
  const [filter, setFilter] = useState<'all' | DeadlineStatus>('all');
  const [assignerFilter, setAssignerFilter] = useState<string[]>([]);

  const greenCount = rows.filter(r => getDeadlineStatus(r.交辦到期日) === 'green').length;
  const orangeCount = rows.filter(r => getDeadlineStatus(r.交辦到期日) === 'orange').length;
  const redCount = rows.filter(r => getDeadlineStatus(r.交辦到期日) === 'red').length;

  const assignerOptions = Array.from(
    new Map(rows.map(r => [r.assignerCode, { code: r.assignerCode, name: r.assignerName }])).values(),
  ).filter(o => o.code);

  const visibleRows = rows
    .filter(r => filter === 'all' || getDeadlineStatus(r.交辦到期日) === filter)
    .filter(r => assignerFilter.length === 0 || assignerFilter.includes(r.assignerCode));

  const toggle = (s: DeadlineStatus) => setFilter(f => f === s ? 'all' : s);

  return (
    <div className="assigned-panel">
      <div className="assigned-panel__header">
        <span>交辦任務</span>
        <div className="panel-filter-group">
          {greenCount > 0 && (
            <button className={`panel-filter-btn green ${filter === 'green' ? 'active' : ''}`} onClick={() => toggle('green')}>{greenCount}</button>
          )}
          {orangeCount > 0 && (
            <button className={`panel-filter-btn orange ${filter === 'orange' ? 'active' : ''}`} onClick={() => toggle('orange')}>{orangeCount}</button>
          )}
          {redCount > 0 && (
            <button className={`panel-filter-btn red ${filter === 'red' ? 'active' : ''}`} onClick={() => toggle('red')}>{redCount}</button>
          )}
        </div>
      </div>
      {assignerOptions.length > 0 && (
        <div className="assigned-panel__filterbar">
          <MultiSelectDropdown
            label="交辦人"
            options={assignerOptions}
            selected={assignerFilter}
            onChange={setAssignerFilter}
          />
        </div>
      )}
      <div className="assigned-panel__list">
        {visibleRows.length === 0 ? (
          <div className="assigned-panel__empty">{filter === 'all' ? '無待辦交辦' : '此分類無資料'}</div>
        ) : (
          visibleRows.map((row, i) => (
            <AssignedCard
              key={row.subtableId || i}
              row={row}
              onComplete={onComplete}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default AssignedPanel;
