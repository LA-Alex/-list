import { SourceRecord } from "../types";

const APP_ID = 1094;

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
  }));
};
// export type SourceRecord = {
//   id: string;

//   標籤: string;

//   標籤類別: string;

//   更新時間: string;
// };
