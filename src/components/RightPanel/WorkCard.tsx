import { useState, useRef, useCallback } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { WorkRow, DayType } from '../../types';
import TaskEditModal from '../common/TaskEditModal';
import Timeline from '../TimeLine';
import { ContentHtml } from '../../utils/richContent';
import './WorkCard.css';

type Props = {
  row: WorkRow;
  dayKey: DayType;
  labelCategory?: string;
  labelSourceId?: string;
  allTags: string[];
  onDelete?: (subtableId: string) => void;
  onSave?: (updatedRow: WorkRow) => void;
  onCopy?: () => void;
};

const isCompleted = (row: WorkRow) => row.完成 === '完成';

const WorkCard = ({ row, dayKey, labelCategory, labelSourceId, allTags, onDelete, onSave, onCopy }: Props) => {
  const [showModal, setShowModal] = useState(false);
  const [timelineRecord, setTimelineRecord] = useState<Record<string, unknown> | null>(null);
  const localRef = useRef<HTMLDivElement | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ bottom: number; left: number } | null>(null);
  const [modalMode, setModalMode] = useState<'edit' | 'view'>('edit');

  const completed = isCompleted(row);
  const isImportant = row.重要程度?.includes('重要');

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `work-${dayKey}-${row.subtableId}`,
    data: { type: 'work', row, dayKey },
    disabled: completed,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const mergedRef = useCallback((el: HTMLDivElement | null) => {
    setNodeRef(el);
    localRef.current = el;
  }, [setNodeRef]);

  const handleMouseEnter = () => {
    if (isDragging || (!row.內容 && !row.交辦MEMO)) return;
    if (!localRef.current) return;
    const rect = localRef.current.getBoundingClientRect();
    const tooltipWidth = 320;
    let left = rect.left;
    if (left + tooltipWidth > window.innerWidth) left = window.innerWidth - tooltipWidth - 8;
    if (left < 8) left = 8;
    setTooltipPos({ bottom: window.innerHeight - rect.top + 8, left });
  };

  const openModal = (mode: 'edit' | 'view') => {
    setTooltipPos(null);
    setModalMode(mode);
    setShowModal(true);
  };

  const handleOpenModal = () => openModal('edit');
  const handleOpenViewModal = () => openModal('view');

  const handleSave = (updatedRow: WorkRow) => {
    onSave?.(updatedRow);
    setShowModal(false);
  };

  const handleLinkClick = async (event: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    const match = href.match(/^https:\/\/kensystem-dev\.cybozu\.com\/k\/1093\/show#record=(\d+)(?:&.*)?$/);
    if (!match) return;

    event.preventDefault();
    event.stopPropagation();
    try {
      const response = await kintone.api(
        kintone.api.url('/k/v1/record.json', true),
        'GET',
        { app: 1093, id: match[1] },
      );
      setTimelineRecord(response.record);
    } catch (error) {
      console.error('Failed to load timeline record:', error);
      alert('無法讀取此 Timeline 資料。');
    }
  };

  return (
    <div
      ref={mergedRef}
      style={style}
      className={`work-card ${completed && row.交辦 !== '完成' ? 'reported' : ''} ${completed ? 'locked' : ''} ${isImportant ? 'important' : ''}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => setTooltipPos(null)}
    >
      {tooltipPos && !isDragging && !showModal && (row.內容 || row.交辦MEMO) && (
        <div className="work-card__tooltip" style={{ bottom: tooltipPos.bottom, left: tooltipPos.left }}>
          {row.內容 && (
            <>
              <div className="work-card__tooltip-header">內容</div>
              <ContentHtml text={row.內容} className="work-card__tooltip-item" />
            </>
          )}
          {row.交辦MEMO && (
            <>
              <div className="work-card__tooltip-header" style={row.內容 ? { marginTop: '10px' } : undefined}>交辦MEMO</div>
              <div className="work-card__tooltip-item">{row.交辦MEMO}</div>
            </>
          )}
        </div>
      )}

      <div className="work-card__header" {...(completed ? {} : { ...attributes, ...listeners })}>
        <span className="work-card__label">
          {labelSourceId ? (
            <span
              className="work-card__label-text clickable"
              onPointerDown={e => e.stopPropagation()}
              onClick={e => { e.stopPropagation(); window.open(`https://${window.location.hostname}/k/1094/show#record=${labelSourceId}`, '_blank'); }}
              title="到 1094 標籤資料"
            >
              {row.來源標籤 || '（未命名）'}
            </span>
          ) : (
            row.來源標籤 || '（未命名）'
          )}
          {labelCategory && <span className="work-card__label-category">{labelCategory}</span>}
          {row.來源列ID && <span className="work-card__source-id">轉自交辦任務</span>}
          {row.來源列ID && row.記錄號碼 && row.交辦 !== '結案' && (
            <span className={`work-card__record-no ${(completed || row.交辦 === '完成') ? 'dimmed' : ''}`}>
              {row.記錄號碼}
            </span>
          )}
        </span>
        <div className="work-card__actions" onPointerDown={e => e.stopPropagation()}>
          {onSave && (
            <button
              className="work-card__btn work-card__btn--important"
              onClick={() => onSave({ ...row, 重要程度: isImportant ? [] : ['重要'] })}
              title="重要"
            >{isImportant ? '🔴' : '⚪'}</button>
          )}
          {!completed && onSave && (
            <button className="work-card__btn work-card__btn--done" onClick={() => onSave({ ...row, 完成: '完成' })} title="完成">✅</button>
          )}
          {row.完成 !== '部分' && !completed && onSave && (
            <button className="work-card__btn work-card__btn--partial" onClick={() => onSave({ ...row, 完成: '部分' })} title="部分完成">▲</button>
          )}
          {onSave && (
            <button className="work-card__btn" onClick={handleOpenModal} title="編輯">✏️</button>
          )}
          <button className="work-card__btn" onClick={handleOpenViewModal} title="預覽">👁️</button>
          <span className="work-card__btn-gap" />
          {onCopy && (
            <button className="work-card__btn work-card__btn--copy" onClick={onCopy} title="複製到今天">⧉</button>
          )}
          {onDelete && (
            <button className="work-card__btn work-card__btn--delete" onClick={() => onDelete(row.subtableId)} title="刪除">🗑️</button>
          )}
        </div>
      </div>

      {row.內容 && <ContentHtml text={row.內容} className="work-card__content" maxLen={50} />}

      <div className="work-card__preview">
        {row.產品大類 && <span className="work-card__tag">{row.產品大類}</span>}
        {row.交辦 && <span className="work-card__tag">交辦：{row.交辦}</span>}
        {row.交辦日 && <span className="work-card__tag">交辦日：{row.交辦日}</span>}
        {row.交辦到期日 && <span className="work-card__tag">到期：{row.交辦到期日}</span>}
        {row.完成 === '完成' && <span className="work-card__tag work-card__tag--done">已完成</span>}
        {row.完成 === '部分' && <span className="work-card__tag work-card__tag--partial">部分完成</span>}
        {row.工作時數 && <span className="work-card__tag">工時：{row.工作時數}</span>}
        {row.關聯者?.length > 0 && <span className="work-card__tag">👤 {row.關聯者.map(u => u.name).join('、')}</span>}
        {row.連結 && row.連結.split('\n').filter(l => l.trim()).map((line, i) => {
          const m = line.match(/https?:\/\/[^\s]+/);
          const href = m ? m[0] : null;
          const label = line.replace(/https?:\/\/[^\s]+/, '').replace(/:\s*$/, '').trim();
          return href ? (
            <a key={i} href={href} target="_blank" rel="noopener noreferrer"
              className="work-card__tag work-card__tag--link"
              onClick={e => handleLinkClick(e, href)}>
              🔗 {label || href.replace(/^https?:\/\//, '').slice(0, 25) + (href.length > 32 ? '…' : '')}
            </a>
          ) : null;
        })}
      </div>

      {(row.時段 || row.工作性質?.length > 0) && (
        <div className="work-card__bottom-row">
          {row.時段 && <span className="work-card__tag">{row.時段}</span>}
          {row.工作性質?.length > 0 && <span className="work-card__tag">{row.工作性質.join('、')}</span>}
        </div>
      )}

      {showModal && (
        <TaskEditModal
          row={row}
          title={row.來源標籤}
          mode={modalMode}
          allTags={allTags}
          onSave={handleSave}
          onClose={() => setShowModal(false)}
        />
      )}
      {timelineRecord && (
        <Timeline
          record={timelineRecord}
          show={true}
          onClose={() => setTimelineRecord(null)}
        />
      )}
    </div>
  );
};

export default WorkCard;
