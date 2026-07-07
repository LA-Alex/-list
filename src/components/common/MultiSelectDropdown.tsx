import { useEffect, useRef, useState } from 'react';
import './MultiSelectDropdown.css';

type Option = { code: string; name: string };

type Props = {
  label: string;
  options: Option[];
  selected: string[];
  onChange: (codes: string[]) => void;
};

const MultiSelectDropdown = ({ label, options, selected, onChange }: Props) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleCode = (code: string) => {
    onChange(
      selected.includes(code)
        ? selected.filter(c => c !== code)
        : [...selected, code],
    );
  };

  if (options.length === 0) return null;

  return (
    <div className="multi-select-dropdown" ref={ref}>
      <button
        type="button"
        className={`multi-select-dropdown__btn ${selected.length > 0 ? 'active' : ''}`}
        onClick={() => setOpen(o => !o)}
      >
        {label}{selected.length > 0 ? ` (${selected.length})` : ''} ▾
      </button>
      {open && (
        <div className="multi-select-dropdown__panel">
          {selected.length > 0 && (
            <button
              type="button"
              className="multi-select-dropdown__clear"
              onClick={() => onChange([])}
            >清除篩選</button>
          )}
          {options.map(opt => (
            <label key={opt.code} className="multi-select-dropdown__option">
              <input
                type="checkbox"
                checked={selected.includes(opt.code)}
                onChange={() => toggleCode(opt.code)}
              />
              {opt.name}
            </label>
          ))}
        </div>
      )}
    </div>
  );
};

export default MultiSelectDropdown;
