import dayjs from "dayjs";
import { WorkDayRecord, WorkRow, DayType, AssignedRow, DispatchedTask } from "../types";

const APP_ID = 1525;

// 清除不可見字元（Kintone 欄位代碼可能夾帶）
const cleanCode = (s: string) => s.replace(/[​‌‍﻿­]/g, '');

// 實際欄位代碼快取：clean → actual（含不可見字元的原始代碼）
let _fieldCodeMap: Record<string, string> = {};

const ensureFieldCodeMap = async (): Promise<void> => {
  if (Object.keys(_fieldCodeMap).length > 0) return;
  try {
    const resp = await kintone.api(kintone.api.url('/k/v1/app/form/fields', true), 'GET', { app: APP_ID });
    const extract = (props: Record<string, any>) => {
      for (const field of Object.values(props)) {
        if (field.code) _fieldCodeMap[cleanCode(field.code)] = field.code;
        if (field.type === 'SUBTABLE' && field.fields) extract(field.fields);
      }
    };
    extract(resp.properties);
  } catch {}
};

// 取得含不可見字元的實際欄位代碼，找不到時回傳原本傳入的字串
const fc = (clean: string) => _fieldCodeMap[clean] || clean;

export const getDayDate = (day: DayType): string => {
  const offset = day === "yesterday" ? -1 : day === "today" ? 0 : 1;
  return dayjs().add(offset, "day").format("YYYY-MM-DD");
};

export const getTodayDate = (): string => dayjs().format("YYYY-MM-DD");

export const getWeekDates = (weekOffset: number): string[] => {
  const today = dayjs();
  const dow = today.day(); // 0=Sun
  const daysFromMonday = dow === 0 ? 6 : dow - 1;
  const monday = today.subtract(daysFromMonday, "day").add(weekOffset * 7, "day");
  return Array.from({ length: 7 }, (_, i) => monday.add(i, "day").format("YYYY-MM-DD"));
};

// kintone 記錄 → WorkRow（先 normalize 欄位代碼 key，避免不可見字元）
const parseRow = (row: any): WorkRow => {
  const v: Record<string, any> = {};
  for (const [k, val] of Object.entries(row.value as Record<string, any>)) {
    v[cleanCode(k)] = val;
  }
  return {
    subtableId: row.id,
    來源標籤: v.來源標籤?.value || "",
    內容: v.內容?.value || "",
    連結: v.連結?.value || "",
    地點: v.地點?.value || "",
    交辦MEMO: v.交辦MEMO?.value || "",
    排序: Number(v.排序?.value) || 0,
    時段: v.時段?.value || "",
    工作性質: v.工作性質?.value || [],
    產品大類: v.產品大類?.value || "",
    關聯者: (v.關聯者?.value || []).map((u: any) => ({ code: u.code, name: u.name })),
    交辦: v.交辦?.value || "",
    交辦日: v.交辦日?.value || "",
    交辦到期日: v.交辦到期日?.value || "",
    交辦完成日: v.交辦完成日?.value || "",
    完成: v.完成?.value || "",
    來源列ID: v.來源列ID?.value || "",
    重要程度: v.重要程度?.value || [],
    工作時數: v.工作時數?.value || "",
    記錄號碼: "", // 記錄號碼是記錄本身的欄位（非子表格欄位），由 parseRecord/呼叫端補上
  };
};

// kintone 記錄 → WorkDayRecord（記錄號碼屬於記錄本身，所有子表格列共用同一個值）
const parseRecord = (r: any): WorkDayRecord => {
  const 記錄號碼 = r.記錄號碼?.value || "";
  return {
    id: r.$id.value,
    工作日: r.工作日?.value || "",
    rows: (r.工作表格?.value || [])
      .map(parseRow)
      .map((row: WorkRow) => ({ ...row, 記錄號碼 }))
      .sort((a: WorkRow, b: WorkRow) => a.排序 - b.排序),
    上班時間: r.上班時間?.value || "",
    上班打卡: r.上班時間打卡時間?.value || "",
    下班時間: r.下班時間?.value || "",
    下班打卡: r.下班時間打卡時間?.value || "",
    工作地點: r.工作地點?.value || "",
    記錄號碼,
  };
};

// WorkRow → kintone 格式（用 fc() 查出含不可見字元的實際代碼）
const rowToKintone = (r: WorkRow, index: number) => ({
  id: r.subtableId || undefined,
  value: {
    [fc('來源標籤')]: { value: r.來源標籤 },
    [fc('內容')]: { value: r.內容 },
    [fc('連結')]: { value: r.連結 },
    [fc('地點')]: { value: r.地點 },
    [fc('交辦MEMO')]: { value: r.交辦MEMO },
    [fc('排序')]: { value: String(index + 1) },
    [fc('時段')]: { value: r.時段 },
    [fc('工作性質')]: { value: r.工作性質 },
    [fc('產品大類')]: { value: r.產品大類 },
    [fc('關聯者')]: { value: r.關聯者.map((u) => ({ code: u.code })) },
    [fc('交辦')]: { value: r.交辦 },
    [fc('交辦日')]: { value: r.交辦日 || null },
    [fc('交辦到期日')]: { value: r.交辦到期日 || null },
    [fc('交辦完成日')]: { value: r.交辦完成日 || null },
    [fc('完成')]: { value: r.完成 || "" },
    [fc('來源列ID')]: { value: r.來源列ID || "" },
    [fc('重要程度')]: { value: r.重要程度 || [] },
    [fc('工作時數')]: { value: r.工作時數 || "" },
    // 記錄號碼是 kintone 系統自動編號的記錄本身欄位，不屬於子表格、也不可寫入
  },
});

// 轉自交辦任務的列，記錄號碼要顯示「原本任務條」（來源記錄）的號碼，不是目前所在記錄的號碼。
// 來源列ID 格式是 "來源recordId|來源subtableId"，用它去查出正確的來源記錄號碼。
const fetchSourceRecordNumbers = async (rows: WorkRow[]): Promise<Record<string, string>> => {
  const sourceIds = new Set<string>();
  for (const row of rows) {
    const srcId = row.來源列ID?.split('|')[0];
    if (srcId) sourceIds.add(srcId);
  }
  if (sourceIds.size === 0) return {};

  const resp = await kintone.api(kintone.api.url("/k/v1/records.json", true), "GET", {
    app: APP_ID,
    query: `$id in (${Array.from(sourceIds).join(',')})`,
    fields: ['$id', '記錄號碼'],
  });
  const numberMap: Record<string, string> = {};
  resp.records.forEach((r: any) => { numberMap[r.$id.value] = r.記錄號碼?.value || ''; });
  return numberMap;
};

const applySourceRecordNumbers = (rows: WorkRow[], numberMap: Record<string, string>): WorkRow[] =>
  rows.map((row) => {
    const srcId = row.來源列ID?.split('|')[0];
    return srcId && numberMap[srcId] ? { ...row, 記錄號碼: numberMap[srcId] } : row;
  });

const enrichTransferredRecordNumbers = async (
  result: Record<string, WorkDayRecord>,
): Promise<void> => {
  const allRows = Object.values(result).flatMap((day) => day.rows);
  const numberMap = await fetchSourceRecordNumbers(allRows);
  if (Object.keys(numberMap).length === 0) return;
  for (const day of Object.values(result)) {
    day.rows = applySourceRecordNumbers(day.rows, numberMap);
  }
};

// 抓指定日期的工作記錄（5天）
export const fetchWorkDayRecords = async (
  dates: string[],
  userCode?: string,
): Promise<Record<string, WorkDayRecord>> => {
  const loginUser = kintone.getLoginUser();
  const code = userCode ?? loginUser.code;
  const isOwn = code === loginUser.code;

  const cond = dates.map((d) => `工作日 = "${d}"`).join(" or ");
  const query = `(${cond}) and 使用者 in ("${code}")`;

  const [resp] = await Promise.all([
    kintone.api(kintone.api.url("/k/v1/records.json", true), "GET", { app: APP_ID, query }),
    ensureFieldCodeMap(),
  ]);

  const recordMap: Record<string, WorkDayRecord> = {};
  resp.records.forEach((r: any) => {
    recordMap[r.工作日.value] = parseRecord(r);
  });

  const result: Record<string, WorkDayRecord> = {};
  for (const date of dates) {
    if (recordMap[date]) {
      result[date] = recordMap[date];
    } else if (isOwn) {
      result[date] = await createWorkDayRecord(date, code);
    } else {
      result[date] = { id: null, 工作日: date, rows: [], 上班時間: '', 上班打卡: '', 下班時間: '', 下班打卡: '', 工作地點: '', 記錄號碼: '' };
    }
  }
  await enrichTransferredRecordNumbers(result);
  return result;
};

// 新增空記錄
const createWorkDayRecord = async (
  date: string,
  userCode: string,
): Promise<WorkDayRecord> => {
  const resp = await kintone.api(
    kintone.api.url("/k/v1/record.json", true),
    "POST",
    {
      app: APP_ID,
      record: {
        工作日: { value: date },
        使用者: { value: [{ code: userCode }] },
        工作表格: { value: [] },
      },
    },
  );
  return { id: resp.id, 工作日: date, rows: [], 上班時間: "", 上班打卡: "", 下班時間: "", 下班打卡: "", 工作地點: "", 記錄號碼: "" };
};

// 新增一列（左邊拖入）
export const addRowToWorkDay = async (
  record: WorkDayRecord,
  sourceLabel: string,
  currentRows: WorkRow[],
  modalData?: {
    交辦: string;
    交辦日: string;
    交辦到期日: string;
    交辦完成日: string;
  },
  sourceRowRef?: string,
  sourceRow?: Partial<WorkRow>,
): Promise<WorkRow[]> => {
  const nextOrder =
    currentRows.length > 0
      ? Math.max(...currentRows.map((r) => Number(r.排序))) + 1
      : 1;

  // 用 rowToKintone 組新列，跟既有列走同一套 fc() 轉換，避免欄位代碼含不可見字元時
  // 寫入用的 key 對不上實際代碼、被 kintone 忽略、退回欄位的預設值（例如 產品大類）。
  const newRow: WorkRow = {
    subtableId: "",
    來源標籤: sourceLabel,
    內容: sourceRow?.內容 || "",
    連結: sourceRow?.連結 || "",
    地點: sourceRow?.地點 || "",
    交辦MEMO: sourceRow?.交辦MEMO || "",
    排序: nextOrder,
    時段: sourceRow?.時段 || "",
    工作性質: sourceRow?.工作性質 || [],
    產品大類: sourceRow?.產品大類 || "",
    關聯者: sourceRow?.關聯者 || [],
    交辦: sourceRow?.交辦 || modalData?.交辦 || "",
    交辦日: sourceRow?.交辦日 || modalData?.交辦日 || "",
    交辦到期日: sourceRow?.交辦到期日 || modalData?.交辦到期日 || "",
    交辦完成日: sourceRow?.交辦完成日 || "",
    完成: sourceRow?.完成 || "預定",
    來源列ID: sourceRowRef || "",
    重要程度: sourceRow?.重要程度 || [],
    工作時數: sourceRow?.工作時數 || "",
    記錄號碼: "",
  };

  const updatedRows = [
    ...currentRows.map((r, i) => rowToKintone(r, i)),
    { value: rowToKintone(newRow, currentRows.length).value },
  ];

  await kintone.api(kintone.api.url("/k/v1/record.json", true), "PUT", {
    app: APP_ID,
    id: record.id,
    record: { 工作表格: { value: updatedRows } },
  });

  const fresh = await kintone.api(
    kintone.api.url("/k/v1/record.json", true),
    "GET",
    { app: APP_ID, id: record.id },
  );

  const rows = parseRecord(fresh.record).rows;
  const numberMap = await fetchSourceRecordNumbers(rows);
  return Object.keys(numberMap).length === 0 ? rows : applySourceRecordNumbers(rows, numberMap);
};

// 刪除一列
export const deleteRow = async (
  record: WorkDayRecord,
  subtableId: string,
  currentRows: WorkRow[],
): Promise<WorkRow[]> => {
  const newRows = currentRows.filter((r) => r.subtableId !== subtableId);

  await kintone.api(kintone.api.url("/k/v1/record.json", true), "PUT", {
    app: APP_ID,
    id: record.id,
    record: { 工作表格: { value: newRows.map((r, i) => rowToKintone(r, i)) } },
  });

  return newRows;
};

// 更新一列（編輯儲存）
export const updateRow = async (
  record: WorkDayRecord,
  updatedRow: WorkRow,
  currentRows: WorkRow[],
): Promise<void> => {
  const newRows = currentRows.map((r) =>
    r.subtableId === updatedRow.subtableId ? updatedRow : r,
  );

  await kintone.api(kintone.api.url("/k/v1/record.json", true), "PUT", {
    app: APP_ID,
    id: record.id,
    record: { 工作表格: { value: newRows.map((r, i) => rowToKintone(r, i)) } },
  });
};

// 更新排序
export const updateRowOrder = async (
  record: WorkDayRecord,
  rows: WorkRow[],
): Promise<void> => {
  await kintone.api(kintone.api.url("/k/v1/record.json", true), "PUT", {
    app: APP_ID,
    id: record.id,
    record: { 工作表格: { value: rows.map((r, i) => rowToKintone(r, i)) } },
  });
};

// 跨欄移動
export const moveRowBetweenDays = async (
  sourceRecord: WorkDayRecord,
  targetRecord: WorkDayRecord,
  movingRow: WorkRow,
  newSourceRows: WorkRow[],
  newTargetRows: WorkRow[],
): Promise<void> => {
  await kintone.api(kintone.api.url("/k/v1/record.json", true), "PUT", {
    app: APP_ID,
    id: sourceRecord.id,
    record: {
      工作表格: { value: newSourceRows.map((r, i) => rowToKintone(r, i)) },
    },
  });

  await kintone.api(kintone.api.url("/k/v1/record.json", true), "PUT", {
    app: APP_ID,
    id: targetRecord.id,
    record: {
      工作表格: {
        value: newTargetRows.map((r, i) => ({
          id: r.subtableId === movingRow.subtableId ? undefined : r.subtableId,
          value: rowToKintone(r, i).value,
        })),
      },
    },
  });
};
// 指派任務面板：抓出指定使用者派給別人的所有任務
export const fetchDispatchedTasks = async (userCode?: string): Promise<DispatchedTask[]> => {
  const user = kintone.getLoginUser();
  const targetCode = userCode ?? user.code;
  const query = `使用者 in ("${targetCode}") order by 工作日 desc limit 100`;

  const resp = await kintone.api(
    kintone.api.url("/k/v1/records.json", true),
    "GET",
    { app: APP_ID, query },
  );

  const tasks: DispatchedTask[] = [];
  for (const record of resp.records) {
    const recordId: string = record.$id.value;
    const 記錄號碼 = record.記錄號碼?.value || "";
    const rows: WorkRow[] = (record.工作表格?.value || []).map(parseRow);
    const matching = rows
      .filter((r) => r.關聯者.length > 0 && r.交辦 !== "結案")
      .map((r): DispatchedTask => ({ ...r, recordId, 記錄號碼 }));
    tasks.push(...matching);
  }
  return tasks;
};

// 指派任務確認完成：把指定 row 的 交辦 改成 完成
export const confirmTask = async (
  recordId: string,
  subtableId: string,
): Promise<void> => {
  const fresh = await kintone.api(
    kintone.api.url("/k/v1/record.json", true),
    "GET",
    { app: APP_ID, id: recordId },
  );
  const rows: WorkRow[] = (fresh.record.工作表格?.value || []).map(parseRow);
  const updatedRows = rows.map((r) =>
    r.subtableId === subtableId ? { ...r, 交辦: "結案" } : r,
  );
  await kintone.api(kintone.api.url("/k/v1/record.json", true), "PUT", {
    app: APP_ID,
    id: recordId,
    record: {
      工作表格: { value: updatedRows.map((r, i) => rowToKintone(r, i)) },
    },
  });
};

// 指派任務面板編輯彈窗存檔：直接用 recordId 更新該筆記錄裡的一列
export const updateRowByRecordId = async (
  recordId: string,
  updatedRow: WorkRow,
): Promise<void> => {
  const fresh = await kintone.api(
    kintone.api.url("/k/v1/record.json", true),
    "GET",
    { app: APP_ID, id: recordId },
  );
  const rows: WorkRow[] = (fresh.record.工作表格?.value || []).map(parseRow);
  const newRows = rows.map((r) =>
    r.subtableId === updatedRow.subtableId ? updatedRow : r,
  );
  await kintone.api(kintone.api.url("/k/v1/record.json", true), "PUT", {
    app: APP_ID,
    id: recordId,
    record: { 工作表格: { value: newRows.map((r, i) => rowToKintone(r, i)) } },
  });
};

// 抓交辦給指定使用者的任務（不限日期，交辦未完成就持續顯示）
export const fetchAssignedRows = async (userCode?: string): Promise<AssignedRow[]> => {
  const user = kintone.getLoginUser();
  const targetCode = userCode ?? user.code;
  await ensureFieldCodeMap();

  const result: AssignedRow[] = [];
  let offset = 0;
  const PAGE_SIZE = 500; // kintone records.json 單次上限，減少來回次數

  while (true) {
    const resp = await kintone.api(
      kintone.api.url("/k/v1/records.json", true),
      "GET",
      {
        app: APP_ID,
        // 先在伺服器端篩掉「關聯者不含此使用者」的記錄，避免整個 app 撈回來再用前端過濾
        query: `${fc('關聯者')} in ("${targetCode}") order by 工作日 desc limit ${PAGE_SIZE} offset ${offset}`,
        fields: ['$id', '記錄號碼', '使用者', '工作表格'],
      },
    );

    for (const record of resp.records) {
      const sourceRecordId: string = record.$id.value;
      const 記錄號碼 = record.記錄號碼?.value || "";
      const assigners: any[] = record.使用者?.value || [];
      const rows = (record.工作表格?.value || []).map(parseRow);
      const matching = rows
        .filter(
          (r: WorkRow) =>
            r.關聯者.some((u) => u.code === targetCode) &&
            r.交辦 !== "結案",
        )
        .map((r: WorkRow): AssignedRow => ({
          ...r,
          記錄號碼,
          sourceRecordId,
          assignerCode: assigners.map((u) => u.code).join(','),
          assignerName: assigners.map((u) => u.name).join('、'),
        }));
      result.push(...matching);
    }

    if (resp.records.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  return result;
};

// B 回報完成：在 A 的記錄上把指定 row 的「完成」設為 ['Y']
export const setRowComplete = async (
  sourceRecordId: string,
  subtableId: string,
): Promise<void> => {
  const fresh = await kintone.api(
    kintone.api.url("/k/v1/record.json", true),
    "GET",
    { app: APP_ID, id: sourceRecordId },
  );
  const rows: WorkRow[] = (fresh.record.工作表格?.value || []).map(parseRow);
  const today = new Date().toISOString().slice(0, 10);
  const updatedRows = rows.map((r) =>
    r.subtableId === subtableId ? { ...r, 交辦: "完成", 交辦完成日: today } : r,
  );
  await kintone.api(kintone.api.url("/k/v1/record.json", true), "PUT", {
    app: APP_ID,
    id: sourceRecordId,
    record: {
      工作表格: { value: updatedRows.map((r, i) => rowToKintone(r, i)) },
    },
  });
};

// 更新工作地點欄位
export const updateWorkLocation = async (
  recordId: string,
  location: string,
): Promise<void> => {
  await kintone.api(kintone.api.url("/k/v1/record.json", true), "PUT", {
    app: APP_ID,
    id: recordId,
    record: { 工作地點: { value: location } },
  });
};

// 抓 Kintone 使用者列表（只取使用中 valid=true，依 id 排序，分頁上限 100）
export const fetchKintoneUsers = async (): Promise<{ code: string; name: string }[]> => {
  const all: any[] = [];
  let offset = 0;
  while (true) {
    const resp = await kintone.api(
      kintone.api.url("/v1/users.json", true),
      "GET",
      { size: 100, offset },
    );
    const page: any[] = resp.users || [];
    all.push(...page);
    if (page.length < 100) break;
    offset += 100;
  }
  return all
    .filter((u: any) => u.valid === true)
    .sort((a: any, b: any) => Number(a.sortOrder) - Number(b.sortOrder))
    .map((u: any) => ({ code: u.code, name: u.name }));
};

// 只抓在 App 1525 有記錄的使用者（使用中帳號）
export const fetchActiveUsers = async (): Promise<{ code: string; name: string }[]> => {
  const [recordsResp, usersResp] = await Promise.all([
    kintone.api(kintone.api.url('/k/v1/records.json', true), 'GET', {
      app: APP_ID,
      query: 'limit 500',
      fields: ['使用者'],
    }),
    kintone.api(kintone.api.url('/v1/users.json', true), 'GET', { size: 100 }),
  ]);
  const activeCodes = new Set<string>(
    recordsResp.records.flatMap((r: any) => (r.使用者?.value || []).map((u: any) => u.code))
  );
  return (usersResp.users || [])
    .filter((u: any) => u.valid === true && activeCodes.has(u.code))
    .sort((a: any, b: any) => Number(a.id) - Number(b.id))
    .map((u: any) => ({ code: u.code, name: u.name }));
};

// 地址判斷是否在公司（Nominatim 反向地理編碼結果比對，地址：300號, 內湖路一段, 西湖里, 內湖區, 下塔悠, 臺北市, 114, 臺灣）
const COMPANY_ADDRESS_KEYS = ['內湖路一段', '300號', '西湖里', '內湖區'];
const isCompanyAddress = (addr: string): boolean =>
  COMPANY_ADDRESS_KEYS.every(k => addr.includes(k));

// GPS + 反向地理編碼，回傳 display_name 或座標字串
const getLocationAddress = async (): Promise<string> => {
  const position = await new Promise<GeolocationPosition>((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      timeout: 12000,
      enableHighAccuracy: true,
    });
  });
  const { latitude, longitude } = position.coords;
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    const resp = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
      { signal: ctrl.signal },
    );
    clearTimeout(timer);
    const data = await resp.json();
    return data.display_name || `${latitude},${longitude}`;
  } catch {
    return `${latitude},${longitude}`;
  }
};

// 下班打卡：先存時間（避免頁面跑掉），再偵測位置
export const clockOut = async (
  record: WorkDayRecord,
): Promise<{ time: string; isCompany: boolean }> => {
  const now = dayjs().format("HH:mm");

  await kintone.api(kintone.api.url("/k/v1/record.json", true), "PUT", {
    app: APP_ID,
    id: record.id,
    record: {
      下班時間打卡時間: { value: now },
    },
  });

  try {
    const location = await getLocationAddress();
    return { time: now, isCompany: isCompanyAddress(location) };
  } catch {
    return { time: now, isCompany: false };
  }
};

// 上班打卡：GPS 反向地理編碼，用地址判斷是否在公司
export const clockIn = async (
  record: WorkDayRecord,
): Promise<{ time: string; location: string; isCompany: boolean }> => {
  const now = dayjs().format("HH:mm");

  const location = await getLocationAddress();
  const isCompany = isCompanyAddress(location);

  await kintone.api(kintone.api.url("/k/v1/record.json", true), "PUT", {
    app: APP_ID,
    id: record.id,
    record: {
      上班時間打卡時間: { value: now },
      打卡位置: { value: location },
    },
  });

  return { time: now, location, isCompany };
};
