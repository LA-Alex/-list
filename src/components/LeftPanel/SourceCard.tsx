import { useDraggable } from '@dnd-kit/core';
import { SourceRecord } from '../../types';
import './SourceCard.css';

type Props = {
  record: SourceRecord;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
};

const SourceCard = ({ record, isSelected, onToggleSelect }: Props) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `source-${record.id}`,
    data: { type: 'source', record },
  });

  const style = transform
    ? { transform: `translate(${transform.x}px, ${transform.y}px)` }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`source-card ${isDragging ? 'dragging' : ''} ${isSelected ? 'selected' : ''}`}
      onClick={() => onToggleSelect(record.id)}
      {...listeners}
      {...attributes}
    >
      <div className="source-card__label">{record.標籤}</div>
      <div className="source-card__category">{record.標籤類別}</div>
    </div>
  );
};

export default SourceCard;