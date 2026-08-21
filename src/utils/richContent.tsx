import DOMPurify from 'dompurify';

// 舊資料的「內容」是純文字，可能含 < > 等字元；直接當 HTML 解析的話瀏覽器會把它當成標籤起點，
// 把後面的文字整段吞掉當成 bogus comment。這裡判斷字串是否已經是編輯器存的 HTML，
// 不是的話就跳脫特殊字元、把換行轉成 <br>，確保舊的純文字內容不會被誤判成 HTML 標籤而消失。
const looksLikeRichHtml = (text: string): boolean =>
  /<(b|strong|i|em|u|ul|ol|li|span|br|div|font)[\s/>]/i.test(text);

const escapeHtml = (text: string): string =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export const toSafeContentHtml = (text: string): string =>
  looksLikeRichHtml(text) ? text : escapeHtml(text).replace(/\n/g, '<br>');

export const sanitizeContentHtml = (text: string): string =>
  DOMPurify.sanitize(toSafeContentHtml(text));

// 任務條空間有限，內容太長時只留前 maxLen 個字，但用 DOM 節點裁切（不是直接切字串），
// 這樣被保留的部分還是能維持顏色/大小/粗體等格式，不會因為硬切字串而切斷標籤。
const truncateHtml = (html: string, maxLen: number): string => {
  const container = document.createElement('div');
  container.innerHTML = html;
  let remaining = maxLen;

  const walk = (node: Node) => {
    for (const child of Array.from(node.childNodes)) {
      if (remaining <= 0) {
        child.remove();
        continue;
      }
      if (child.nodeType === Node.TEXT_NODE) {
        const t = child.textContent || '';
        if (t.length > remaining) {
          child.textContent = t.slice(0, remaining) + '…';
          remaining = 0;
        } else {
          remaining -= t.length;
        }
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        walk(child);
      }
    }
  };

  walk(container);
  return container.innerHTML;
};

type ContentHtmlProps = { text: string; className?: string; maxLen?: number };

// 統一的「內容」渲染元件：任務條、hint、彈窗都用這個，確保有 HTML 格式（顏色/大小/粗體）時能正確顯示。
// 傳 maxLen 的話（任務條用，避免內容太長把版面撐爆），只顯示前面那幾個字，格式仍會保留。
export const ContentHtml = ({ text, className, maxLen }: ContentHtmlProps) => {
  const safeHtml = sanitizeContentHtml(text);
  const html = maxLen ? truncateHtml(safeHtml, maxLen) : safeHtml;
  return <div className={className} dangerouslySetInnerHTML={{ __html: html }} />;
};
