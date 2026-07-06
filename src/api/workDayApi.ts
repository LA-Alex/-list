import dayjs from "dayjs";
import { WorkDayRecord, WorkRow, DayType, AssignedRow, DispatchedTask } from "../types";

const APP_ID = 1525;

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

// kintone 記錄 → WorkRow
const parseRow = (row: any): WorkRow => ({
  subtableId: row.id,
  來源標籤: row.value.來源標籤?.value || "",
  內容: row.value.內容?.value || "",
  地點: row.value.地點?.value || "",
  交辦MEMO: row.value.交辦MEMO?.value || "",
  排序: Number(row.value.排序?.value) || 0,
  時段: row.value.時段?.value || "",
  工作性質: row.value.工作性質?.value || [],
  產品大類: row.value.產品大類?.value || "",
  關聯者: (row.value.關聯者?.value || []).map((u: any) => ({
    code: u.code,
    name: u.name,
  })),
  交辦: row.value.交辦?.value || "",
  交辦日: row.value.交辦日?.value || "",
  交辦到期日: row.value.交辦到期日?.value || "",
  交辦完成日: row.value.交辦完成日?.value || "",
  完成: row.value.完成?.value || "",
  來源列ID: row.value.來源列ID?.value || "",
});

// kintone 記錄 → WorkDayRecord
const parseRecord = (r: any): WorkDayRecord => ({
  id: r.$id.value,
  工作日: r.工作日?.value || "",
  rows: (r.工作表格?.value || [])
    .map(parseRow)
    .sort((a: WorkRow, b: WorkRow) => a.排序 - b.排序),
  上班時間: r.上班時間?.value || "",
  上班打卡: r.上班時間打卡時間?.value || "",
  下班時間: r.下班時間?.value || "",
  下班打卡: r.下班時間打卡時間?.value || "",
  工作地點: r.工作地點?.value || "",
});

// WorkRow → kintone 格式
const rowToKintone = (r: WorkRow, index: number) => ({
  id: r.subtableId || undefined,
  value: {
    來源標籤: { value: r.來源標籤 },
    內容: { value: r.內容 },
    地點: { value: r.地點 },
    交辦MEMO: { value: r.交辦MEMO },
    排序: { value: String(index + 1) },
    時段: { value: r.時段 },
    工作性質: { value: r.工作性質 },
    產品大類: { value: r.產品大類 },
    關聯者: { value: r.關聯者.map((u) => ({ code: u.code })) },
    交辦: { value: r.交辦 },
    交辦日: { value: r.交辦日 || null },
    交辦到期日: { value: r.交辦到期日 || null },
    交辦完成日: { value: r.交辦完成日 || null },
    完成: { value: r.完成 || "" },
    來源列ID: { value: r.來源列ID || "" },
  },
});

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

  const resp = await kintone.api(
    kintone.api.url("/k/v1/records.json", true),
    "GET",
    { app: APP_ID, query },
  );

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
      result[date] = { id: null, 工作日: date, rows: [], 上班時間: '', 上班打卡: '', 下班時間: '', 下班打卡: '', 工作地點: '' };
    }
  }
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
  return { id: resp.id, 工作日: date, rows: [], 上班時間: "", 上班打卡: "", 下班時間: "", 下班打卡: "", 工作地點: "" };
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

  const updatedRows = [
    ...currentRows.map((r, i) => rowToKintone(r, i)),
    {
      value: {
        來源標籤: { value: sourceLabel },
        內容: { value: sourceRow?.內容 || "" },
        地點: { value: sourceRow?.地點 || "" },
        交辦MEMO: { value: sourceRow?.交辦MEMO || "" },
        排序: { value: String(nextOrder) },
        時段: { value: sourceRow?.時段 || "" },
        工作性質: { value: sourceRow?.工作性質 || [] },
        產品大類: { value: sourceRow?.產品大類 || "" },
        關聯者: { value: (sourceRow?.關聯者 || []).map((u) => ({ code: u.code })) },
        交辦: { value: sourceRow?.交辦 || modalData?.交辦 || "" },
        交辦日: { value: sourceRow?.交辦日 || modalData?.交辦日 || null },
        交辦到期日: { value: sourceRow?.交辦到期日 || modalData?.交辦到期日 || null },
        交辦完成日: { value: sourceRow?.交辦完成日 || null },
        完成: { value: sourceRow?.完成 || "預定" },
        來源列ID: { value: sourceRowRef || "" },
      },
    },
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

  return parseRecord(fresh.record).rows;
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
    const rows: WorkRow[] = (record.工作表格?.value || []).map(parseRow);
    const matching = rows
      .filter((r) => r.關聯者.length > 0 && r.交辦 !== "結案")
      .map((r): DispatchedTask => ({ ...r, recordId }));
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

// 抓交辦給指定使用者的任務（不限日期，交辦未完成就持續顯示）
export const fetchAssignedRows = async (userCode?: string): Promise<AssignedRow[]> => {
  const user = kintone.getLoginUser();
  const targetCode = userCode ?? user.code;
  const query = `order by 工作日 desc limit 100`;

  const resp = await kintone.api(
    kintone.api.url("/k/v1/records.json", true),
    "GET",
    { app: APP_ID, query },
  );

  const result: AssignedRow[] = [];

  for (const record of resp.records) {
    const sourceRecordId: string = record.$id.value;
    const rows = (record.工作表格?.value || []).map(parseRow);
    const matching = rows
      .filter(
        (r: WorkRow) =>
          r.關聯者.some((u) => u.code === targetCode) &&
          r.交辦 !== "完成" &&
          r.交辦 !== "結案",
      )
      .map((r: WorkRow): AssignedRow => ({ ...r, sourceRecordId }));
    result.push(...matching);
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
  const updatedRows = rows.map((r) =>
    r.subtableId === subtableId ? { ...r, 交辦: "完成" } : r,
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

// 下班打卡
export const clockOut = async (
  record: WorkDayRecord,
): Promise<{ time: string }> => {
  const now = dayjs().format("HH:mm");

  await kintone.api(kintone.api.url("/k/v1/record.json", true), "PUT", {
    app: APP_ID,
    id: record.id,
    record: {
      下班時間打卡時間: { value: now },
    },
  });

  return { time: now };
};

// 上班打卡
const COMPANY_IP = "61.219.118.205";

const detectCompanyNetwork = async (): Promise<boolean> => {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 3000);
    const resp = await fetch("https://api.ipify.org?format=json", { signal: ctrl.signal });
    clearTimeout(timer);
    const data = await resp.json();
    return data.ip === COMPANY_IP;
  } catch {
    return false;
  }
};

export const clockIn = async (
  record: WorkDayRecord,
): Promise<{ time: string; location: string; isCompany: boolean }> => {
  const now = dayjs().format("HH:mm");

  // 並行：偵測公司 IP + 抓 GPS
  const [isCompany, position] = await Promise.all([
    detectCompanyNetwork(),
    new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        timeout: 10000,
        enableHighAccuracy: true,
      });
    }),
  ]);

  const { latitude, longitude } = position.coords;

  const geoResp = await fetch(
    `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
  );
  const geoData = await geoResp.json();
  const location = geoData.display_name || `${latitude},${longitude}`;

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
