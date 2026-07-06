const APP_ID = 1477;

export type App1477Record = {
  id: string;
  標籤_公司: string;
  Site_APPID: string;
  應用程式連結: string;
  應用程式名稱: string;
};

export const fetchApp1477ByLabel = async (label: string): Promise<App1477Record[]> => {
  const resp = await kintone.api(
    kintone.api.url("/k/v1/records.json", true),
    "GET",
    {
      app: APP_ID,
      fields: ["$id", "標籤_公司", "Site_APPID", "應用程式連結", "應用程式名稱"],
      query: `標籤_公司 = "${label}" limit 100`,
    },
  );
  return resp.records.map((r: any) => ({
    id: r.$id.value,
    標籤_公司: r.標籤_公司?.value || "",
    Site_APPID: r.Site_APPID?.value || "",
    應用程式連結: r.應用程式連結?.value || "",
    應用程式名稱: r.應用程式名稱?.value || "",
  }));
};
