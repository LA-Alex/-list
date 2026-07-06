import { useState } from 'react';
import { DispatchedTask } from '../../types';
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

const openRecord = (recordId: string) => {
  const url = `${window.location.protocol}//${window.location.host}${window.location.pathname}show#record=${recordId}`;
  window.open(url, '_blank');
};

const DispatchPanel = ({ tasks, onConfirm }: Props) => {
  const [filter, setFilter] = useState<'all' | DeadlineStatus>('all');

  const greenCount = tasks.filter(t => getDeadlineStatus(t.交辦到期日) === 'green').length;
  const orangeCount = tasks.filter(t => getDeadlineStatus(t.交辦到期日) === 'orange').length;
  const redCount = tasks.filter(t => getDeadlineStatus(t.交辦到期日) === 'red').length;

  const visibleTasks = filter === 'all'
    ? tasks
    : tasks.filter(t => getDeadlineStatus(t.交辦到期日) === filter);

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
      <div className="dispatch-panel__list">
        {visibleTasks.length === 0 ? (
          <div className="dispatch-panel__empty">{filter === 'all' ? '無指派中任務' : '此分類無資料'}</div>
        ) : (
          visibleTasks.map((task) => (
            <div
              key={task.subtableId}
              className={`dispatch-card ${task.交辦 === '完成' ? 'reported' : ''}`}
            >
              <div className="dispatch-card__top">
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
                <div className="dispatch-card__date">{task.內容}</div>
              )}
              {task.交辦日 && (
                <div className="dispatch-card__date">交辦日：{task.交辦日}</div>
              )}
              {task.交辦到期日 && (
                <div className={`dispatch-card__date ${getDeadlineStatus(task.交辦到期日) !== 'green' ? `overdue-${getDeadlineStatus(task.交辦到期日)}` : ''}`}>
                  到期：{task.交辦到期日}
                </div>
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
