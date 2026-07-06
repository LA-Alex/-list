import { SourceRecord } from "../types";

const APP_ID = 1094;

export const updateSourceLastUsed = async (recordId: string): Promise<void> => {
  const now = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
  console.log('[updateSourceLastUsed] id:', recordId, 'time:', now);
  try {
    await kintone.api(kintone.api.url("/k/v1/record.json", true), "PUT", {
      app: APP_ID,
      id: recordId,
      record: { 最後取用時間: { value: now } },
    });
    console.log('[updateSourceLastUsed] 成功');
  } catch (e: any) {
    const msg = e?.message || JSON.stringify(e);
    console.error('[updateSourceLastUsed] 失敗:', msg);
    alert('最後取用時間更新失敗：' + msg);
    throw e;
  }
};

export const getSourceRecords = async (): Promise<SourceRecord[]> => {
  const resp = await kintone.api(
    kintone.api.url("/k/v1/records.json", true),
    "GET",
    {
      app: APP_ID,
      fields: ["$id", "標籤", "標籤類別", "更新時間"],
      query: 'PM_FLAG in ("列入") order by 更新時間 desc limit 500',
    },
  );

  return resp.records.map((r: any) => ({
    id: r.$id.value,
    標籤: r.標籤?.value || "",
    標籤類別: r.標籤類別?.value || "",
    更新時間: r.更新時間?.value || "",
    最後取用時間: "",
  }));
};
