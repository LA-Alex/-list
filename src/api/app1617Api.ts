const APP_ID = 1617;

export type App1617Record = {
  id: string;
  測試No: string;
  專案名稱: string;
  測試項目: string;
  審查與稽核類型: string;
  VV驗證狀態: string;
  結案日期: string;
};

export const fetchApp1617Records = async (): Promise<App1617Record[]> => {
  const all: App1617Record[] = [];
  let offset = 0;
  while (true) {
    const resp = await kintone.api(
      kintone.api.url("/k/v1/records.json", true),
      "GET",
      {
        app: APP_ID,
        fields: ["$id", "測試No", "專案名稱", "測試項目", "審查與稽核類型", "V_V驗證狀態", "結案日期"],
        query: `order by 更新時間 desc limit 100 offset ${offset}`,
      },
    );
    const chunk = resp.records.map((r: any) => ({
      id: r.$id.value,
      測試No: r.測試No?.value || "",
      專案名稱: r.專案名稱?.value || "",
      測試項目: r.測試項目?.value || "",
      審查與稽核類型: r.審查與稽核類型?.value || "",
      VV驗證狀態: r.V_V驗證狀態?.value || "",
      結案日期: r.結案日期?.value || "",
    }));
    all.push(...chunk);
    if (chunk.length < 100) break;
    offset += 100;
  }
  return all;
};
