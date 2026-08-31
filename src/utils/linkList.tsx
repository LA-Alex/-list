type LinkListProps = {
  text: string;
  tagClassName: string;
  onLinkClick?: (e: React.MouseEvent<HTMLAnchorElement>, href: string) => void;
};

// 「連結」欄位每行一筆，格式通常是「標籤: https://...」或單純一個網址。統一在這裡解析，
// 任務條、轉自交辦任務、指派任務都用同一套規則渲染成可點的 🔗 連結。
export const LinkList = ({ text, tagClassName, onLinkClick }: LinkListProps) => (
  <>
    {text.split('\n').filter(l => l.trim()).map((line, i) => {
      const m = line.match(/https?:\/\/[^\s]+/);
      const href = m ? m[0] : null;
      const label = line.replace(/https?:\/\/[^\s]+/, '').replace(/:\s*$/, '').trim();
      return href ? (
        <a
          key={i}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className={tagClassName}
          onClick={onLinkClick ? (e) => onLinkClick(e, href) : undefined}
        >
          🔗 {label || href.replace(/^https?:\/\//, '').slice(0, 25) + (href.length > 32 ? '…' : '')}
        </a>
      ) : null;
    })}
  </>
);
