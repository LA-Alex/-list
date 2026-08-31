import DOMPurify from 'dompurify';

// 舊資料的「內容」是純文字，可能含 < > 等字元；直接當 HTML 解析的話瀏覽器會把它當成標籤起點，
// 把後面的文字整段吞掉當成 bogus comment。這裡判斷字串是否已經是 HTML（不管是我們編輯器存的，
// 還是 kintone 原生 Rich Editor、外部工具貼過來的，標籤名稱不固定），不是的話才跳脫特殊字元、
// 把換行轉成 <br>，確保舊的純文字內容不會被誤判成 HTML 標籤而消失，也不會漏放行沒列到的標籤而被誤escape。
const looksLikeRichHtml = (text: string): boolean =>
  /<\/?[a-z][a-z0-9]*(\s[^<>]*)?>/i.test(text);

const escapeHtml = (text: string): string =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// 有些資料存的是字面上的「\n」兩個字元而不是真正換行，兩種都要處理
const normalizeLiteralNewlines = (text: string): string => text.replace(/\\n/g, '\n');

export const toSafeContentHtml = (text: string): string => {
  const normalized = normalizeLiteralNewlines(text);
  return looksLikeRichHtml(normalized) ? normalized : escapeHtml(normalized).replace(/\n/g, '<br>');
};

// 內容可能是從別的地方（Excel/Word、kintone 原生欄位）貼過來的 HTML，除了顏色/大小以外
// 常會夾帶 position/width/height/margin 等版面用的行內樣式，會把任務條版面撐壞、甚至互相疊在一起。
// DOMPurify 只擋安全性風險，不會擋這些，所以另外把 style 屬性收斂成只留顏色/大小/粗細這幾個安全欄位。
const ALLOWED_STYLE_PROPS = ['color', 'background-color', 'font-size', 'font-weight', 'text-decoration'];

const stripLayoutBreakingStyles = (html: string): string => {
  const container = document.createElement('div');
  container.innerHTML = html;

  const clean = (node: Node) => {
    for (const child of Array.from(node.childNodes)) {
      if (child.nodeType === Node.ELEMENT_NODE) {
        const el = child as HTMLElement;
        if (el.hasAttribute('style')) {
          const kept = ALLOWED_STYLE_PROPS
            .map(prop => [prop, el.style.getPropertyValue(prop)] as const)
            .filter(([, v]) => v)
            .map(([prop, v]) => `${prop}: ${v}`)
            .join('; ');
          if (kept) el.setAttribute('style', kept);
          else el.removeAttribute('style');
        }
        el.removeAttribute('width');
        el.removeAttribute('height');
        clean(el);
      }
    }
  };

  clean(container);
  return container.innerHTML;
};

// 只留我們編輯器實際會產生的標籤/屬性。從別的網頁（例如這次看到的 Google 頁面
// breadcrumb 元件）複製貼上時，常會夾帶一堆無關的包裝標籤（像 <ol> 麵包屑清單）跟 class，
// 限制在這個清單內，這些雜訊會直接被拆掉（保留文字內容），不會留在畫面上造成版面問題。
const ALLOWED_TAGS = ['b', 'strong', 'i', 'em', 'u', 's', 'strike', 'span', 'br', 'div', 'font'];
const ALLOWED_ATTR = ['style', 'color', 'size'];

export const sanitizeContentHtml = (text: string): string =>
  stripLayoutBreakingStyles(DOMPurify.sanitize(toSafeContentHtml(text), { ALLOWED_TAGS, ALLOWED_ATTR }));

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
