import { AssignedRow } from '../../types';
import AssignedCard from './AssignedCard';
import './AssignedPanel.css';

type Props = {
  rows: AssignedRow[];
  onComplete: (row: AssignedRow) => void;
};

const AssignedPanel = ({ rows, onComplete }: Props) => {
  const pendingCount = rows.filter(r => r.交辦 !== '完成').length;

  return (
    <div className="assigned-panel">
      <div className="assigned-panel__header">
        交辦任務
        {pendingCount > 0 && (
          <span className="assigned-panel__count">{pendingCount}</span>
        )}
      </div>
      <div className="assigned-panel__list">
        {rows.length === 0 ? (
          <div className="assigned-panel__empty">無待辦交辦</div>
        ) : (
          rows.map((row, i) => (
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
