export type SourceRecord = {
  id: string;
  標籤: string;
  標籤類別: string;
  更新時間: string;
};

export type WorkRow = {
  subtableId: string;
  來源標籤: string;
  內容: string;
  地點: string;
  交辦MEMO: string;
  排序: number;
  時段: string;
  工作性質: string[];
  產品大類: string;
  關聯者: { code: string; name: string }[];
  交辦: string;
  交辦日: string;
  交辦到期日: string;
  交辦完成日: string;
  完成: string;
  來源列ID: string;
};

// 交辦面板用，帶有來源 record ID（用於 B 回報完成時更新 A 的記錄）
export type AssignedRow = WorkRow & { sourceRecordId: string };

// 指派任務面板用，帶有所屬 record ID
export type DispatchedTask = WorkRow & { recordId: string };

export type WorkDayRecord = {
  id: string | null;
  工作日: string;
  rows: WorkRow[];
  上班時間: string;
  上班打卡: string;
  下班時間: string;
  下班打卡: string;
  工作地點: string;
};

export type DayType = string; // YYYY-MM-DD

export const 時段Options = ['AM', 'PM'];
export const 地點Options = ['公司', 'WFH', 'OnSite'];
export const 工作性質Options = [
  '會議、視訊',
  '業助、連絡',
  '業務、電訪',
  '報價、合約',
  '外訪、來訪',
  '行銷、企劃',
  '需求·POC',
  '顧問、客製、技研',
  '驗證及確認(V&V)',
  '總務、財務',
  '其他',
];
export const 產品大類Options = ['ASPROVA', 'KINTONE', 'QLIK', 'OTRS', 'ERWIN', 'SI開發'];
export const 交辦Options = ['交辦中', '完成', '結案'];
export const 完成Options = ['預定', '部分', '完成'];