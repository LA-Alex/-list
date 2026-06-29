import { DispatchedTask } from '../../types';
import './DispatchPanel.css';

type Props = {
  tasks: DispatchedTask[];
  onConfirm: (task: DispatchedTask) => void;
};

const openRecord = (recordId: string) => {
  const url = `${window.location.protocol}//${window.location.host}${window.location.pathname}show#record=${recordId}`;
  window.open(url, '_blank');
};

const DispatchPanel = ({ tasks, onConfirm }: Props) => {
  const pendingCount = tasks.filter(t => t.交辦 !== '完成').length;

  return (
    <div className="dispatch-panel">
      <div className="dispatch-panel__header">
        指派任務
        {pendingCount > 0 && <span className="dispatch-panel__count">{pendingCount}</span>}
      </div>
      <div className="dispatch-panel__list">
        {tasks.length === 0 ? (
          <div className="dispatch-panel__empty">無指派中任務</div>
        ) : (
          tasks.map((task) => (
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
                <div className="dispatch-card__date">到期：{task.交辦到期日}</div>
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
