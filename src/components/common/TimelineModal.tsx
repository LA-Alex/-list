import { useEffect } from 'react';
import './TimelineModal.css';

type Props = {
  record: Record<string, unknown>;
  onClose: () => void;
};

const TimelineModal = ({ record, onClose }: Props) => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const values = Object.values(record).map(value =>
    typeof value === 'object' && value !== null && 'value' in value
      ? (value as { value: unknown }).value
      : value
  );
  const textValues = values
    .filter((value): value is string => typeof value === 'string' && value.trim().length > 0);
  const title = textValues.find(value => value.length > 4) || textValues[0] || '工作項目';
  const details = textValues.filter(value => value !== title);
  const tags = values.filter((value): value is string[] => Array.isArray(value) && value.every(item => typeof item === 'string'));
  const people = values
    .filter((value): value is { code: string; name: string }[] => Array.isArray(value) && value.every(item => typeof item === 'object' && item !== null && 'name' in item))
    .flat();
  const links = textValues.flatMap(value => value.match(/https?:\/\/[^\s]+/g) || []);

  return (
    <div className="timeline-modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="timeline-modal" role="dialog" aria-modal="true" aria-labelledby="timeline-modal-title" onMouseDown={event => event.stopPropagation()}>
        <button className="timeline-modal__close" type="button" onClick={onClose} aria-label="關閉">×</button>
        <div className="timeline-modal__status-bar" />
        <div className="timeline-modal__content">
          <header className="timeline-modal__header">
            <div>
              <p className="timeline-modal__eyebrow">工作項目</p>
              <h2 id="timeline-modal-title">{title}</h2>
            </div>
          </header>

          {details.length > 0 && (
            <div className="timeline-modal__section">
              <h3>詳細資料</h3>
              {details.map((value, index) => <p className="timeline-modal__text" key={`${value}-${index}`}>{value}</p>)}
            </div>
          )}

          {(tags.length > 0 || people.length > 0) && (
            <div className="timeline-modal__section">
              <h3>標籤與負責人</h3>
              <div className="timeline-modal__chips">
                {tags.flat().map((tag, index) => <span className="timeline-modal__chip" key={`${tag}-${index}`}>{tag}</span>)}
                {people.map(person => <span className="timeline-modal__chip timeline-modal__chip--user" key={person.code}>👤 {person.name}</span>)}
              </div>
            </div>
          )}

          {links.length > 0 && (
            <div className="timeline-modal__section">
              <h3>相關連結</h3>
              <div className="timeline-modal__links">
                {links.map(link => <a href={link} target="_blank" rel="noreferrer" key={link}>{link}</a>)}
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default TimelineModal;
