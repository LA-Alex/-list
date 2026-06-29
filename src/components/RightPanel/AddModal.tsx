import { useState } from 'react';
import { 交辦Options } from '../../types';
import './AddModal.css';

type FormData = {
  交辦: string;
  交辦日: string;
  交辦到期日: string;
  交辦完成日: string;
};

type Props = {
  onConfirm: (data: FormData) => void;
  onCancel: () => void;
};

const today = new Date().toISOString().slice(0, 10);

const AddModal = ({ onConfirm, onCancel }: Props) => {
  const [form, setForm] = useState<FormData>({
    交辦: '交辦中',
    交辦日: today,
    交辦到期日: '',
    交辦完成日: '',
  });

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div className="modal-title">新增前填寫</div>

        <div className="modal-field">
          <label>交辦</label>
          <select value={form.交辦} onChange={e => setForm(f => ({ ...f, 交辦: e.target.value }))}>
            <option value="">請選擇</option>
            {交辦Options.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>

        <div className="modal-field">
          <label>交辦日</label>
          <input
            type="date"
            value={form.交辦日}
            onChange={e => setForm(f => ({ ...f, 交辦日: e.target.value }))}
          />
        </div>

        <div className="modal-field">
          <label>交辦到期日</label>
          <input
            type="date"
            value={form.交辦到期日}
            onChange={e => setForm(f => ({ ...f, 交辦到期日: e.target.value }))}
          />
        </div>

        <div className="modal-field">
          <label>交辦完成日</label>
          <input
            type="date"
            value={form.交辦完成日}
            onChange={e => setForm(f => ({ ...f, 交辦完成日: e.target.value }))}
          />
        </div>

        <div className="modal-footer">
          <button className="modal-cancel" onClick={onCancel}>取消</button>
          <button className="modal-confirm" onClick={() => onConfirm(form)}>確認新增</button>
        </div>
      </div>
    </div>
  );
};

export default AddModal;