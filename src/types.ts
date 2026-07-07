export type SourceRecord = {
  id: string;
  標籤: string;
  標籤類別: string;
  更新時間: string;
  最後取用時間: string;
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

// 交辦面板用，帶有來源 record ID（用於 B 回報完成時更新 A 的記錄）與交辦人資訊
export type AssignedRow = WorkRow & {
  sourceRecordId: string;
  assignerCode: string;
  assignerName: string;
};

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



