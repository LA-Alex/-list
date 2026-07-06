const APP_ID = 1093;

export type App1093Record = {
  id: string;
  標籤_公司: string;
  Issue_No: string;
  問題標題: string;
  L_P前置詞: string;
};

export const fetchApp1093ByLabel = async (label: string): Promise<App1093Record[]> => {
  const resp = await kintone.api(
    kintone.api.url("/k/v1/records.json", true),
    "GET",
    {
      app: APP_ID,
      fields: ["$id", "標籤_公司", "Issue_No", "問題標題", "L_P前置詞"],
      query: `標籤_公司 = "${label}" limit 100`,
    },
  );
  return resp.records.map((r: any) => ({
    id: r.$id.value,
    標籤_公司: r.標籤_公司?.value || "",
    Issue_No: r.Issue_No?.value || "",
    問題標題: r.問題標題?.value || "",
    L_P前置詞: r.L_P前置詞?.value || "",
  }));
};
