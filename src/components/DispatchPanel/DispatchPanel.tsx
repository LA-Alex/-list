import { useState } from 'react';
import { DispatchedTask } from '../../types';
import MultiSelectDropdown from '../common/MultiSelectDropdown';
import './DispatchPanel.css';

type DeadlineStatus = 'green' | 'orange' | 'red';

const getDeadlineStatus = (due: string): DeadlineStatus => {
  const today = new Date().toISOString().slice(0, 10);
  if (!due || due >= today) return 'green';
  const daysLate = Math.floor((new Date(today).getTime() - new Date(due).getTime()) / 86400000);
  return daysLate <= 3 ? 'orange' : 'red';
};

type Props = {
  tasks: DispatchedTask[];
  onConfirm: (task: DispatchedTask) => void;
};

const WORK_DAY_APP_ID = 1525;

const openRecord = (recordId: string) => {
  const url = `${window.location.origin}/k/${WORK_DAY_APP_ID}/show#record=${recordId}`;
  window.open(url, '_blank');
};

const DispatchPanel = ({ tasks, onConfirm }: Props) => {
  const [filter, setFilter] = useState<'all' | DeadlineStatus>('all');
  const [assigneeFilter, setAssigneeFilter] = useState<string[]>([]);

  const greenCount = tasks.filter(t => getDeadlineStatus(t.交辦到期日) === 'green').length;
  const orangeCount = tasks.filter(t => getDeadlineStatus(t.交辦到期日) === 'orange').length;
  const redCount = tasks.filter(t => getDeadlineStatus(t.交辦到期日) === 'red').length;

  const assigneeOptions = Array.from(
    new Map(
      tasks.flatMap(t => t.關聯者).map(u => [u.code, { code: u.code, name: u.name }]),
    ).values(),
  );

  const visibleTasks = tasks
    .filter(t => filter === 'all' || getDeadlineStatus(t.交辦到期日) === filter)
    .filter(t => assigneeFilter.length === 0 || t.關聯者.some(u => assigneeFilter.includes(u.code)));

  const toggle = (s: DeadlineStatus) => setFilter(f => f === s ? 'all' : s);

  return (
    <div className="dispatch-panel">
      <div className="dispatch-panel__header">
        <span>指派任務</span>
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
      {assigneeOptions.length > 0 && (
        <div className="dispatch-panel__filterbar">
          <MultiSelectDropdown
            label="指派給"
            options={assigneeOptions}
            selected={assigneeFilter}
            onChange={setAssigneeFilter}
          />
        </div>
      )}
      <div className="dispatch-panel__list">
        {visibleTasks.length === 0 ? (
          <div className="dispatch-panel__empty">{filter === 'all' ? '無指派中任務' : '此分類無資料'}</div>
        ) : (
          visibleTasks.map((task, idx) => (
            <div
              key={task.subtableId}
              className={`dispatch-card ${task.交辦 === '完成' ? 'reported' : ''}`}
            >
              <div className="dispatch-card__top">
                <span className="dispatch-card__num">{idx + 1}.</span>
                <span
                  className="dispatch-card__label dispatch-card__label--link"
                  onClick={() => openRecord(task.recordId)}
                  title="開啟記錄頁面"
                >
                  {task.來源標籤} →
                </span>
              </div>
              <div className="dispatch-card__to">
                👤 {task.關聯者.map(u => u.name).join('、')}
              </div>
              {task.交辦MEMO && (
                <div className="dispatch-card__date">📋 {task.交辦MEMO}</div>
              )}
              {task.內容 && (
                <div className="dispatch-card__content">
                  {task.內容.split('\n').map((line, i) => (
                    <div key={i} className={line.trim() ? '' : 'dispatch-card__content-gap'}>{line || ' '}</div>
                  ))}
                </div>
              )}
              {task.交辦日 && (
                <div className="dispatch-card__date">交辦日：{task.交辦日}</div>
              )}
              {task.交辦到期日 && (
                <div className={`dispatch-card__date ${getDeadlineStatus(task.交辦到期日) !== 'green' ? `overdue-${getDeadlineStatus(task.交辦到期日)}` : ''}`}>
                  到期：{task.交辦到期日}
                </div>
              )}
              {task.交辦完成日 && (
                <div className="dispatch-card__date dispatch-card__done-date">✅ 完成日：{task.交辦完成日}</div>
              )}
              <div className="dispatch-card__footer">
                {task.交辦 === '完成' ? (
                  <>
                    <span className="dispatch-card__done-badge">✅ 完成</span>
                    <button
                      className="dispatch-card__confirm"
                      onClick={() => onConfirm(task)}
                    >交辦=結案</button>
                  </>
                ) : (
                  <span className="dispatch-card__badge">待回報</span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default DispatchPanel;
