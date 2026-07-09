import { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { WorkRow, DayType } from '../../types';
import { fetchKintoneUsers } from '../../api/workDayApi';
import { fetchApp1477ByLabel, App1477Record } from '../../api/app1477Api';
import { fetchApp1093ByLabel, App1093Record } from '../../api/app1093Api';
import { fetchAppFieldOptions } from '../../api/fieldOptionsApi';

const WORK_DAY_APP_ID = 1525;
import './WorkCard.css';

type Props = {
  row: WorkRow;
  dayKey: DayType;
  onDelete?: (subtableId: string) => void;
  onSave?: (updatedRow: WorkRow) => void;
  onCopy?: () => void;
};

const isCompleted = (row: WorkRow) => row.完成 === '完成';

const renderWithLinks = (text: string): React.ReactNode[] =>
  text.split(/(https?:\/\/[^\s]+)/g).map((part, i) =>
    i % 2 === 1
      ? <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="modal-content-link">{part}</a>
      : part
  );

const WorkCard = ({ row, dayKey, onDelete, onSave, onCopy }: Props) => {
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'edit' | 'view'>('edit');
  const [form, setForm] = useState<WorkRow>({ ...row });
  const [allUsers, setAllUsers] = useState<{ code: string; name: string }[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [app1477Records, setApp1477Records] = useState<App1477Record[]>([]);
  const [app1093Records, setApp1093Records] = useState<App1093Record[]>([]);
  const [loading1477, setLoading1477] = useState(false);
  const [loading1093, setLoading1093] = useState(false);
  const [search1477, setSearch1477] = useState('');
  const [search1093, setSearch1093] = useState('');
  const [focused1477, setFocused1477] = useState(false);
  const [focused1093, setFocused1093] = useState(false);
  const [fieldOptions, setFieldOptions] = useState<Record<string, string[]>>({});

  const completed = isCompleted(row);
  const ro = modalMode === 'view';

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

  const openModal = (mode: 'edit' | 'view') => {
    setForm({ ...row });
    setModalMode(mode);
    setUserSearch('');
    setSearch1477('');
    setSearch1093('');
    setApp1477Records([]);
    setApp1093Records([]);
    setShowModal(true);
    fetchKintoneUsers().then(setAllUsers).catch(() => {});
    fetchAppFieldOptions(WORK_DAY_APP_ID).then(setFieldOptions).catch(() => {});
    if (row.來源標籤) {
      setLoading1477(true);
      fetchApp1477ByLabel(row.來源標籤)
        .then(setApp1477Records)
        .catch(e => console.error('App1477 fetch error:', e))
        .finally(() => setLoading1477(false));
      setLoading1093(true);
      fetchApp1093ByLabel(row.來源標籤)
        .then(setApp1093Records)
        .catch(e => console.error('App1093 fetch error:', e))
        .finally(() => setLoading1093(false));
    }
  };

  const handleOpenModal = () => openModal('edit');
  const handleOpenViewModal = () => openModal('view');

  const handleSave = () => {
    onSave?.({ ...row, ...form });
    setShowModal(false);
  };

  const add工作性質 = (opt: string) => {
    if (opt && !form.工作性質.includes(opt)) {
      setForm(f => ({ ...f, 工作性質: [...f.工作性質, opt] }));
    }
  };

  const remove工作性質 = (opt: string) => {
    setForm(f => ({ ...f, 工作性質: f.工作性質.filter(x => x !== opt) }));
  };

  return (
    <div ref={setNodeRef} style={style} className={`work-card ${completed && row.交辦 !== '完成' ? 'reported' : ''} ${completed ? 'locked' : ''}`}>

      <div className="work-card__header" {...(completed ? {} : { ...attributes, ...listeners })}>
        <span className="work-card__label">{row.來源標籤 || '（未命名）'}</span>
        <div className="work-card__actions" onPointerDown={e => e.stopPropagation()}>
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

      <div className="work-card__preview">
        {row.時段 && <span className="work-card__tag">{row.時段}</span>}
        {row.產品大類 && <span className="work-card__tag">{row.產品大類}</span>}
        {row.交辦MEMO && <span className="work-card__tag">交辦MEMO：{row.交辦MEMO}</span>}
        {row.內容 && <span className="work-card__tag work-card__tag--content" title={row.內容}>內容：{row.內容.length > 30 ? row.內容.slice(0, 30) + '…' : row.內容}</span>}
        {row.工作性質?.length > 0 && <span className="work-card__tag">{row.工作性質.join('、')}</span>}
        {row.交辦 && <span className="work-card__tag">交辦：{row.交辦}</span>}
        {row.交辦日 && <span className="work-card__tag">交辦日：{row.交辦日}</span>}
        {row.交辦到期日 && <span className="work-card__tag">到期：{row.交辦到期日}</span>}
        {row.完成 === '完成' && <span className="work-card__tag work-card__tag--done">已完成</span>}
        {row.完成 === '部分' && <span className="work-card__tag work-card__tag--partial">部分完成</span>}
        {row.關聯者?.length > 0 && <span className="work-card__tag">👤 {row.關聯者.map(u => u.name).join('、')}</span>}
        {row.連結 && row.連結.split('\n').filter(l => l.trim()).map((line, i) => {
          const m = line.match(/https?:\/\/[^\s]+/);
          const href = m ? m[0] : null;
          const label = line.replace(/https?:\/\/[^\s]+/, '').replace(/:\s*$/, '').trim();
          return href ? (
            <a key={i} href={href} target="_blank" rel="noopener noreferrer"
              className="work-card__tag work-card__tag--link"
              onClick={e => e.stopPropagation()}>
              🔗 {label || href.replace(/^https?:\/\//, '').slice(0, 25) + (href.length > 32 ? '…' : '')}
            </a>
          ) : null;
        })}
      </div>

      {showModal && (
        <div className="edit-modal-overlay">
          <div className="edit-modal-box" onClick={e => e.stopPropagation()}>
            <div className="edit-modal-title">{ro ? '👁️' : '✏️'} {row.來源標籤}</div>
            <div className="edit-modal-scroll">

              <div className="modal-field-row">
                <div className="modal-field">
                  <label>時段</label>
                  <select value={form.時段} disabled={ro} onChange={e => setForm(f => ({ ...f, 時段: e.target.value }))}>
                    <option value="">請選擇</option>
                    {(fieldOptions['時段'] ?? []).map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>

                <div className="modal-field">
                  <label>產品大類</label>
                  <select value={form.產品大類} disabled={ro} onChange={e => setForm(f => ({ ...f, 產品大類: e.target.value }))}>
                    <option value="">請選擇</option>
                    {(fieldOptions['產品大類'] ?? []).map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
              </div>

              <div className="modal-field">
                <label>工作性質</label>
                <div className="work-card__assignee-list">
                  {form.工作性質.map(opt => (
                    <span key={opt} className="work-card__assignee">
                      {opt}
                      {!ro && (
                        <button type="button" className="work-card__assignee-remove" onClick={() => remove工作性質(opt)}>✕</button>
                      )}
                    </span>
                  ))}
                </div>
                {!ro && (
                  <select value="" onChange={e => { add工作性質(e.target.value); e.target.value = ''; }} className="modal-field-select-add">
                    <option value="">＋ 新增工作性質...</option>
                    {(fieldOptions['工作性質'] ?? []).filter(opt => !form.工作性質.includes(opt)).map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                )}
              </div>

              {!ro && (
                <div className="modal-field">
                  <label>相關應用程式（Leaf Process List）</label>
                  {loading1477 ? (
                    <div className="modal-ref-status">載入中...</div>
                  ) : (
                    <>
                      <input
                        type="text"
                        placeholder="搜尋應用程式名稱..."
                        value={search1477}
                        onChange={e => setSearch1477(e.target.value)}
                        onFocus={() => setFocused1477(true)}
                        onBlur={() => setTimeout(() => setFocused1477(false), 150)}
                        className="work-card__user-search"
                      />
                      {focused1477 && (
                        <div className="work-card__user-dropdown">
                          {(search1477
                            ? app1477Records.filter(r => r.應用程式名稱.includes(search1477) || r.Site_APPID.includes(search1477))
                            : app1477Records
                          ).slice(0, 20).map(r => (
                            <div key={r.id} className="work-card__user-option"
                              onClick={() => {
                                const line = r.應用程式連結
                                  ? `${r.應用程式名稱}: ${r.應用程式連結}`
                                  : r.應用程式名稱;
                                setForm(f => ({ ...f, 連結: f.連結 ? `${f.連結}\n${line}` : line }));
                                setSearch1477('');
                                setFocused1477(false);
                              }}>
                              {r.應用程式名稱}{r.Site_APPID ? ` (${r.Site_APPID})` : ''}
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {!ro && (
                <div className="modal-field">
                  <label>ToDo Z000 Issues List</label>
                  {loading1093 ? (
                    <div className="modal-ref-status">載入中...</div>
                  ) : (
                    <>
                      <input
                        type="text"
                        placeholder="搜尋 Issue No 或標題..."
                        value={search1093}
                        onChange={e => setSearch1093(e.target.value)}
                        onFocus={() => setFocused1093(true)}
                        onBlur={() => setTimeout(() => setFocused1093(false), 150)}
                        className="work-card__user-search"
                      />
                      {focused1093 && (
                        <div className="work-card__user-dropdown">
                          {(search1093
                            ? app1093Records.filter(r => r.問題標題.includes(search1093) || `${r.L_P前置詞}${r.Issue_No}`.includes(search1093))
                            : app1093Records
                          ).slice(0, 20).map(r => (
                            <div key={r.id} className="work-card__user-option"
                              onClick={() => {
                                const url = `${window.location.origin}/k/1093/show#record=${r.id}`;
                                const line = `[${r.L_P前置詞}${r.Issue_No}] ${r.問題標題}: ${url}`;
                                setForm(f => ({ ...f, 連結: f.連結 ? `${f.連結}\n${line}` : line }));
                                setSearch1093('');
                                setFocused1093(false);
                              }}>
                              [{r.L_P前置詞}{r.Issue_No}] {r.問題標題}
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              <div className="modal-field">
                <label>連結</label>
                {ro ? (
                  <div className="modal-content-view">
                    {form.連結.split('\n').map((line, i) => (
                      <div key={i} style={{ minHeight: '1.2em' }}>{line ? renderWithLinks(line) : ' '}</div>
                    ))}
                  </div>
                ) : (
                  <textarea
                    value={form.連結}
                    onChange={e => setForm(f => ({ ...f, 連結: e.target.value }))}
                    rows={3}
                    placeholder="每行一個連結"
                  />
                )}
              </div>

              <div className="modal-field">
                <label>內容</label>
                {ro ? (
                  <div className="modal-content-view">
                    {form.內容.split('\n').map((line, i) => (
                      <div key={i} style={{ minHeight: '1.2em' }}>{line ? renderWithLinks(line) : ' '}</div>
                    ))}
                  </div>
                ) : (
                  <textarea value={form.內容} onChange={e => setForm(f => ({ ...f, 內容: e.target.value }))} rows={3} />
                )}
              </div>

              <div className="modal-field">
                <label>交辦MEMO</label>
                <input type="text" disabled={ro} value={form.交辦MEMO} onChange={e => setForm(f => ({ ...f, 交辦MEMO: e.target.value }))} />
              </div>

              <div className="modal-field-row">
                <div className="modal-field">
                  <label>交辦</label>
                  <select value={form.交辦} disabled={ro} onChange={e => setForm(f => ({ ...f, 交辦: e.target.value }))}>
                    <option value="">請選擇</option>
                    {(fieldOptions['交辦'] ?? []).map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>

                <div className="modal-field">
                  <label>完成</label>
                  <select value={form.完成} disabled={ro} onChange={e => setForm(f => ({ ...f, 完成: e.target.value }))}>
                    <option value="">請選擇</option>
                    {(fieldOptions['完成'] ?? []).map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
              </div>

              <div className="modal-field-row">
                <div className="modal-field">
                  <label>交辦日</label>
                  <input type="date" disabled={ro} value={form.交辦日} onChange={e => setForm(f => ({ ...f, 交辦日: e.target.value }))} />
                </div>

                <div className="modal-field">
                  <label>交辦到期日</label>
                  <input type="date" disabled={ro} value={form.交辦到期日} onChange={e => setForm(f => ({ ...f, 交辦到期日: e.target.value }))} />
                </div>

                <div className="modal-field">
                  <label>交辦完成日</label>
                  <input type="date" disabled={ro} value={form.交辦完成日} onChange={e => setForm(f => ({ ...f, 交辦完成日: e.target.value }))} />
                </div>
              </div>

              <div className="modal-field">
                <label>關聯人</label>
                <div className="work-card__assignee-list">
                  {form.關聯者.map(u => (
                    <span key={u.code} className="work-card__assignee">
                      {u.name}
                      {!ro && (
                        <button type="button" className="work-card__assignee-remove"
                          onClick={() => setForm(f => ({ ...f, 關聯者: f.關聯者.filter(x => x.code !== u.code) }))}>✕</button>
                      )}
                    </span>
                  ))}
                </div>
                {!ro && (
                  <>
                    <input
                      type="text"
                      placeholder="搜尋使用者..."
                      value={userSearch}
                      onChange={e => setUserSearch(e.target.value)}
                      className="work-card__user-search"
                    />
                    {userSearch && (
                      <div className="work-card__user-dropdown">
                        {allUsers
                          .filter(u => (u.name.includes(userSearch) || u.code.includes(userSearch)) && !form.關聯者.some(x => x.code === u.code))
                          .slice(0, 8)
                          .map(u => (
                            <div key={u.code} className="work-card__user-option"
                              onClick={() => { setForm(f => ({ ...f, 關聯者: [...f.關聯者, { code: u.code, name: u.name }] })); setUserSearch(''); }}>
                              {u.name} <span className="work-card__user-code">({u.code})</span>
                            </div>
                          ))
                        }
                      </div>
                    )}
                  </>
                )}
              </div>

            </div>

            <div className="modal-footer">
              {ro ? (
                <button className="modal-cancel" onClick={() => setShowModal(false)}>關閉</button>
              ) : (
                <>
                  <button className="modal-cancel" onClick={() => setShowModal(false)}>取消</button>
                  <button className="modal-confirm" onClick={handleSave}>儲存</button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkCard;
