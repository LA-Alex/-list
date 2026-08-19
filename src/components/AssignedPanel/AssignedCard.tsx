import { useDraggable } from '@dnd-kit/core';
import { AssignedRow } from '../../types';
import './AssignedPanel.css';

type Props = {
  row: AssignedRow;
  onComplete: (row: AssignedRow) => void;
};

// 有些資料存的是字面上的「\n」兩個字元而不是真正換行，兩種都要處理
const renderMultiline = (text: string) =>
  text.replace(/\\n/g, '\n').split('\n').map((line, i) => (
    <div key={i}>{line || ' '}</div>
  ));

const AssignedCard = ({ row, onComplete }: Props) => {
  const isDone = row.交辦 === '完成';

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `assigned-${row.subtableId}`,
    data: { type: 'assigned', row },
  });

  const style = transform
    ? { transform: `translate(${transform.x}px, ${transform.y}px)` }
    : undefined;

  const isOverdue =
    row.交辦到期日 !== '' &&
    row.交辦到期日 < new Date().toISOString().slice(0, 10);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`assigned-card ${isDragging ? 'dragging' : ''} ${isDone ? 'done' : ''}`}
      {...listeners}
      {...attributes}
    >
      <div className="assigned-card__header">
        <span className="assigned-card__label">{row.來源標籤}</span>
        {row.記錄號碼 && row.交辦 !== '結案' && (
          <span className={`assigned-card__record-no ${(isDone || row.完成 === '完成') ? 'dimmed' : ''}`}>
            {row.記錄號碼}
          </span>
        )}
        {!isDone && (
          <button
            className="assigned-card__done-btn"
            onPointerDown={e => e.stopPropagation()}
            onClick={e => { e.stopPropagation(); onComplete(row); }}
            title="交辦完成"
          >交辦完成</button>
        )}
        {isDone && <span className="assigned-card__reported">已回報</span>}
      </div>
      {row.交辦MEMO && (
        <div className="assigned-card__memo">📋 {row.交辦MEMO}</div>
      )}
      {row.內容 && (
        <div className="assigned-card__memo">{renderMultiline(row.內容)}</div>
      )}
      <div className="assigned-card__footer">
        {row.交辦 && (
          <span className="assigned-card__badge pending">{row.交辦}</span>
        )}
        {row.交辦日 && (
          <span className="assigned-card__due">交辦 {row.交辦日}</span>
        )}
        {row.交辦到期日 && (
          <span className={`assigned-card__due ${isOverdue ? 'overdue' : ''}`}>
            到期 {row.交辦到期日}
          </span>
        )}
        {row.assignerName && (
          <span className="assigned-card__assigner">指派人：{row.assignerName}</span>
        )}
      </div>
    </div>
  );
};

export default AssignedCard;
