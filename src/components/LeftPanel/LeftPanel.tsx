import { useState } from 'react';
import { SourceRecord } from '../../types';
import SourceCard from './SourceCard';
import './LeftPanel.css';

type Props = {
  records: SourceRecord[];
  loading: boolean;
  selectedIds: string[];
  onToggleSelect: (id: string) => void;
};

const LeftPanel = ({ records, loading, selectedIds, onToggleSelect }: Props) => {
  const [search, setSearch] = useState('');

  const filtered = records.filter(r =>
    r.標籤.toLowerCase().includes(search.toLowerCase()) ||
    r.標籤類別.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="left-panel">
      <div className="left-panel__header">
        工作項目
        {selectedIds.length > 0 && (
          <span className="left-panel__count">{selectedIds.length} 已選</span>
        )}
      </div>
      <div className="left-panel__search">
        <input
          type="text"
          placeholder="搜尋標籤..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="left-panel__input"
        />
      </div>
      <div className="left-panel__list">
        {loading ? (
          <div className="left-panel__loading">載入中...</div>
        ) : filtered.length === 0 ? (
          <div className="left-panel__empty">沒有符合的資料</div>
        ) : (
          filtered.map(record => (
            <SourceCard
              key={record.id}
              record={record}
              isSelected={selectedIds.includes(record.id)}
              onToggleSelect={onToggleSelect}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default LeftPanel;