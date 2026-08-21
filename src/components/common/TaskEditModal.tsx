import { useState, useEffect, useRef } from 'react';
import DOMPurify from 'dompurify';
import { WorkRow } from '../../types';
import { fetchKintoneUsers } from '../../api/workDayApi';
import { fetchApp1477ByLabel, App1477Record } from '../../api/app1477Api';
import { fetchApp1093ByLabel, App1093Record } from '../../api/app1093Api';
import { fetchApp1617Records, App1617Record } from '../../api/app1617Api';
import { fetchAppFieldOptions } from '../../api/fieldOptionsApi';
import { toSafeContentHtml } from '../../utils/richContent';
import '../RightPanel/WorkCard.css';

const WORK_DAY_APP_ID = 1525;
const ALL_TAG = '全部';

// 沿用 kintone Rich Editor 原生的預設色盤，紅/藍/黑（標記 V 的常用色）排前面
const TEXT_COLORS = ['#ff0000', '#0000ff', '#000000', '#ff9900', '#00ff00'];
const BG_COLORS = ['rgb(255,0,0)', 'rgb(255,255,0)', 'rgb(0,255,0)', 'rgb(0,255,255)'];

type Props = {
  row: WorkRow;
  title: string;
  mode: 'edit' | 'view';
  allTags: string[];
  onSave: (updatedRow: WorkRow) => void;
  onClose: () => void;
};

const renderWithLinks = (text: string): React.ReactNode[] =>
  text.split(/(https?:\/\/[^\s]+)/g).map((part, i) =>
    i % 2 === 1
      ? <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="modal-content-link">{part}</a>
      : part
  );

const TaskEditModal = ({ row, title, mode, allTags, onSave, onClose }: Props) => {
  const ro = mode === 'view';
  const [form, setForm] = useState<WorkRow>({ ...row });
  const [allUsers, setAllUsers] = useState<{ code: string; name: string }[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [app1477Records, setApp1477Records] = useState<App1477Record[]>([]);
  const [app1093Records, setApp1093Records] = useState<App1093Record[]>([]);
  const [app1617Records, setApp1617Records] = useState<App1617Record[]>([]);
  const [loading1477, setLoading1477] = useState(false);
  const [loading1093, setLoading1093] = useState(false);
  const [loading1617, setLoading1617] = useState(false);
  const [search1477, setSearch1477] = useState('');
  const [search1093, setSearch1093] = useState('');
  const [search1617, setSearch1617] = useState('');
  const [focused1477, setFocused1477] = useState(false);
  const [focused1093, setFocused1093] = useState(false);
  const [focused1617, setFocused1617] = useState(false);
  const [fieldOptions, setFieldOptions] = useState<Record<string, string[]>>({});
  const [selectedTag1477, setSelectedTag1477] = useState(row.來源標籤 || ALL_TAG);
  const [selectedTag1093, setSelectedTag1093] = useState(row.來源標籤 || ALL_TAG);
  const [selectedProject1617, setSelectedProject1617] = useState(ALL_TAG);
  const contentEditorRef = useRef<HTMLDivElement>(null);

  // PMO 記錄沒有標籤欄位，改用資料裡實際出現過的專案名稱當篩選選項
  const project1617Options = Array.from(new Set(app1617Records.map(r => r.專案名稱).filter(Boolean))).sort();

  const loadApp1477 = (tag: string) => {
    setLoading1477(true);
    fetchApp1477ByLabel(tag === ALL_TAG ? '' : tag)
      .then(setApp1477Records)
      .catch(e => console.error('App1477 fetch error:', e))
      .finally(() => setLoading1477(false));
  };

  const loadApp1093 = (tag: string) => {
    setLoading1093(true);
    fetchApp1093ByLabel(tag === ALL_TAG ? '' : tag)
      .then(setApp1093Records)
      .catch(e => console.error('App1093 fetch error:', e))
      .finally(() => setLoading1093(false));
  };

  const loadApp1617 = () => {
    setLoading1617(true);
    fetchApp1617Records()
      .then(setApp1617Records)
      .catch(e => console.error('App1617 fetch error:', e))
      .finally(() => setLoading1617(false));
  };

  useEffect(() => {
    fetchKintoneUsers().then(setAllUsers).catch(() => {});
    fetchAppFieldOptions(WORK_DAY_APP_ID).then(setFieldOptions).catch(() => {});
    loadApp1477(selectedTag1477);
    loadApp1093(selectedTag1093);
    loadApp1617();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (contentEditorRef.current) {
      const html = toSafeContentHtml(row.內容 || '');
      contentEditorRef.current.innerHTML = html;
      setForm(f => ({ ...f, 內容: html }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const savedContentRangeRef = useRef<Range | null>(null);

  // 記住編輯區裡目前的選取範圍：套用字級/顏色的 select、color input 會讓 focus 離開編輯區，
  // 沒存起來的話再點回來時瀏覽器的選取狀態會不見，套用的格式會跑掉位置。
  const saveContentSelection = () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && contentEditorRef.current?.contains(sel.anchorNode)) {
      savedContentRangeRef.current = sel.getRangeAt(0).cloneRange();
    }
  };

  const execContentCommand = (cmd: string, value?: string) => {
    contentEditorRef.current?.focus();
    const sel = window.getSelection();
    if (sel && savedContentRangeRef.current) {
      sel.removeAllRanges();
      sel.addRange(savedContentRangeRef.current);
    }
    document.execCommand('styleWithCSS', false, 'true');
    document.execCommand(cmd, false, value);
    if (contentEditorRef.current) {
      setForm(f => ({ ...f, 內容: contentEditorRef.current!.innerHTML }));
    }
  };

  const add工作性質 = (opt: string) => {
    if (opt && !form.工作性質.includes(opt)) {
      setForm(f => ({ ...f, 工作性質: [...f.工作性質, opt] }));
    }
  };

  const remove工作性質 = (opt: string) => {
    setForm(f => ({ ...f, 工作性質: f.工作性質.filter(x => x !== opt) }));
  };

  const handleSave = () => {
    onSave({ ...row, ...form, 內容: DOMPurify.sanitize(form.內容) });
  };

  return (
    <div className="edit-modal-overlay">
      <div className="edit-modal-box" onClick={e => e.stopPropagation()}>
        <div className="edit-modal-title">{ro ? '👁️' : '✏️'} {title}</div>
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
                <div className="modal-ref-search-wrap">
                  <div className="modal-ref-search-row">
                    <input
                      type="text"
                      placeholder="搜尋應用程式名稱..."
                      value={search1477}
                      onChange={e => setSearch1477(e.target.value)}
                      onFocus={() => setFocused1477(true)}
                      onBlur={() => setTimeout(() => setFocused1477(false), 150)}
                      className="work-card__user-search modal-ref-search-input"
                    />
                    <select
                      className="modal-ref-tag-select"
                      value={selectedTag1477}
                      onChange={e => { setSelectedTag1477(e.target.value); loadApp1477(e.target.value); }}
                      title="篩選標籤"
                    >
                      <option value={ALL_TAG}>{ALL_TAG}</option>
                      {allTags.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  {focused1477 && (
                    <div className="work-card__user-dropdown work-card__user-dropdown--floating" onMouseDown={e => e.preventDefault()}>
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
                </div>
              )}
            </div>
          )}

          {!ro && (
            <div className="modal-field">
              <label>ToDo Z000 Issues List</label>
              {loading1093 ? (
                <div className="modal-ref-status">載入中...</div>
              ) : (
                <div className="modal-ref-search-wrap">
                  <div className="modal-ref-search-row">
                    <input
                      type="text"
                      placeholder="搜尋 Issue No 或標題..."
                      value={search1093}
                      onChange={e => setSearch1093(e.target.value)}
                      onFocus={() => setFocused1093(true)}
                      onBlur={() => setTimeout(() => setFocused1093(false), 150)}
                      className="work-card__user-search modal-ref-search-input"
                    />
                    <select
                      className="modal-ref-tag-select"
                      value={selectedTag1093}
                      onChange={e => { setSelectedTag1093(e.target.value); loadApp1093(e.target.value); }}
                      title="篩選標籤"
                    >
                      <option value={ALL_TAG}>{ALL_TAG}</option>
                      {allTags.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  {focused1093 && (
                    <div className="work-card__user-dropdown work-card__user-dropdown--floating" onMouseDown={e => e.preventDefault()}>
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
                </div>
              )}
            </div>
          )}

          {!ro && (
            <div className="modal-field">
              <label>PMO測試規格、結果報告</label>
              {loading1617 ? (
                <div className="modal-ref-status">載入中...</div>
              ) : (
                <div className="modal-ref-search-wrap">
                  <div className="modal-ref-search-row">
                    <input
                      type="text"
                      placeholder="搜尋專案名稱、測試No或測試項目..."
                      value={search1617}
                      onChange={e => setSearch1617(e.target.value)}
                      onFocus={() => setFocused1617(true)}
                      onBlur={() => setTimeout(() => setFocused1617(false), 150)}
                      className="work-card__user-search modal-ref-search-input"
                    />
                    <select
                      className="modal-ref-tag-select"
                      value={selectedProject1617}
                      onChange={e => setSelectedProject1617(e.target.value)}
                      title="篩選專案名稱"
                    >
                      <option value={ALL_TAG}>{ALL_TAG}</option>
                      {project1617Options.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                  {focused1617 && (
                    <div className="work-card__user-dropdown work-card__user-dropdown--floating" onMouseDown={e => e.preventDefault()}>
                      {app1617Records
                        .filter(r => selectedProject1617 === ALL_TAG || r.專案名稱 === selectedProject1617)
                        .filter(r => !search1617 || r.專案名稱.includes(search1617) || r.測試No.includes(search1617) || r.測試項目.includes(search1617))
                        .slice(0, 20).map(r => (
                        <div key={r.id} className="work-card__user-option"
                          onClick={() => {
                            const url = `${window.location.origin}/k/1617/show#record=${r.id}`;
                            const line = `[${r.測試No}] ${r.專案名稱} / ${r.測試項目 || '-'} / ${r.審查與稽核類型} / V&V:${r.VV驗證狀態 || '-'} / 結案:${r.結案日期 || '未結案'}: ${url}`;
                            setForm(f => ({ ...f, 連結: f.連結 ? `${f.連結}\n${line}` : line }));
                            setSearch1617('');
                            setFocused1617(false);
                          }}>
                          [{r.測試No}] {r.專案名稱} / {r.測試項目 || '-'} / {r.審查與稽核類型} / V&V:{r.VV驗證狀態 || '-'} / 結案:{r.結案日期 || '未結案'}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
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
              <div
                className="modal-content-view"
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(toSafeContentHtml(form.內容)) }}
              />
            ) : (
              <>
                <div className="modal-rich-toolbar">
                  <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => execContentCommand('bold')}><b>B</b></button>
                  <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => execContentCommand('strikeThrough')}><s>刪除線</s></button>
                  <select
                    className="modal-rich-toolbar-select"
                    defaultValue=""
                    onMouseDown={saveContentSelection}
                    onChange={e => { if (e.target.value) execContentCommand('fontSize', e.target.value); e.target.value = ''; }}
                    title="文字大小"
                  >
                    <option value="">字級</option>
                    <option value="2">小</option>
                    <option value="3">正常</option>
                    <option value="4">中</option>
                    <option value="5">大</option>
                    <option value="6">特大</option>
                    <option value="7">巨大</option>
                  </select>
                  <div className="modal-rich-toolbar-swatches">
                    <span className="modal-rich-toolbar-swatch-label">文字色</span>
                    {TEXT_COLORS.map(c => (
                      <button
                        key={c}
                        type="button"
                        className="modal-rich-toolbar-swatch"
                        style={{ background: c }}
                        onMouseDown={e => e.preventDefault()}
                        onClick={() => execContentCommand('foreColor', c)}
                        title={c}
                      />
                    ))}
                  </div>
                  <div className="modal-rich-toolbar-swatches">
                    <span className="modal-rich-toolbar-swatch-label">背景色</span>
                    {BG_COLORS.map(c => (
                      <button
                        key={c}
                        type="button"
                        className="modal-rich-toolbar-swatch"
                        style={{ background: c }}
                        onMouseDown={e => e.preventDefault()}
                        onClick={() => execContentCommand('backColor', c)}
                        title={c}
                      />
                    ))}
                  </div>
                </div>
                <div
                  ref={contentEditorRef}
                  className="modal-rich-editor"
                  contentEditable
                  onInput={() => setForm(f => ({ ...f, 內容: contentEditorRef.current?.innerHTML || '' }))}
                  onMouseUp={saveContentSelection}
                  onKeyUp={saveContentSelection}
                />
              </>
            )}
          </div>

          <div className="modal-field-row">
            <div className="modal-field">
              <label>交辦MEMO</label>
              <input type="text" disabled={ro} value={form.交辦MEMO} onChange={e => setForm(f => ({ ...f, 交辦MEMO: e.target.value }))} />
            </div>

            <div className="modal-field modal-field--narrow">
              <label>重要程度</label>
              <label className="modal-checkbox-item">
                <input
                  type="checkbox"
                  disabled={ro}
                  checked={form.重要程度.includes('重要')}
                  onChange={e => setForm(f => ({ ...f, 重要程度: e.target.checked ? ['重要'] : [] }))}
                />
                重要
              </label>
            </div>

            <div className="modal-field modal-field--narrow">
              <label>工作時數</label>
              {ro ? (
                <div className="modal-content-view">{form.工作時數 || '-'}</div>
              ) : (
                <input
                  type="number"
                  step="0.1"
                  value={form.工作時數}
                  onChange={e => setForm(f => ({ ...f, 工作時數: e.target.value }))}
                />
              )}
            </div>
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
            <button className="modal-cancel" onClick={onClose}>關閉</button>
          ) : (
            <>
              <button className="modal-cancel" onClick={onClose}>取消</button>
              <button className="modal-confirm" onClick={handleSave}>儲存</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default TaskEditModal;
