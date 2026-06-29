// 取得 APP 1094 的資料
export const fetchRecords = async () => {
  const params = {
    app: 1094,
    query: 'order by $id asc'
  };
  const resp = await kintone.api(kintone.api.url('/k/v1/records.json', true), 'GET', params);
  return resp.records;
};

// 更新日期欄位 (丟資料回後台)
export const updateRecordDate = async (recordId: string, newDate: string) => {
  const params = {
    app: 1094,
    id: recordId,
    record: {
      '你的日期欄位代碼': { value: newDate }
    }
  };
  return await kintone.api(kintone.api.url('/k/v1/record.json', true), 'PUT', params);
};