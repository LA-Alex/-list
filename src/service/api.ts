import Swal from 'sweetalert2';

export const fetchAllData = async (appId: string, query: string = ''): Promise<any[] | null> => {
    let records: any[] | null = [];
    let offset = 0;
    const limit = 500;
    try {
        while (true) {
            const response = await kintone.api(kintone.api.url('/k/v1/records', true), 'GET', {
                app: appId,
                query: `${query} limit ${limit} offset ${offset}`,
            });
            records = records.concat(response.records);
            offset += limit;
            if (response.records.length < limit) break;
        }
        return records;
    } catch (error) {
        console.error(`fetchData: ${error}`);
        return null;
    }
};

export const fetchAllUser = async (): Promise<any[] | null> =>{
    try {
        const resp = await kintone.api(kintone.api.url('/v1/users', true), 'GET', {});
        const users = resp.users.map((user: { code: string; name: string; sortOrder: number }) => ({
            code: user.code,
            name: user.name,
            order: user.sortOrder
        }));
        const sortedUsers = users.sort((a: { order: number }, b: { order: number }) => a.order - b.order);
        return sortedUsers;
    } catch (error) {
        console.error('Error fetching users:', error);
        return null;
    }
}

export const putRequests = async (appId: string | number, id: string, record: Record<string, any>): Promise<void> => {
    try{
        await kintone.api(kintone.api.url('/k/v1/record', true), 'PUT', {
            app: appId,
            id: id,
            record: record
        });
    }catch(error){
        console.error('putRequests', error);
    }
}

export const sendBulkRequests = async (requests: Array<Record<string, any>>): Promise<void> => {
    // 一個batch最多數量
    const batchSize = 20;
    // 控制並行數量
    const concurrency = 3;

    const totalBatches = Math.ceil(requests.length / batchSize);

    // 將所有請求分割成批次
    const batches: Array<Array<Record<string, any>>> = [];
    for (let i = 0; i < totalBatches; i++) {
        batches.push(requests.slice(i * batchSize, (i + 1) * batchSize));
    }

    let currentBatch = 0;
    let currentIndex = 0;

    async function processBatch(batch: Array<Record<string, any>>, index: number): Promise<void> {
        try {
            await kintone.api(kintone.api.url('/k/v1/bulkRequest.json', true),'POST',{ requests: batch });
            const spinnerTextElement = document.getElementById('spinner-text');
            if (spinnerTextElement) spinnerTextElement.innerHTML = `<b>${++currentIndex}/${totalBatches} 請勿關閉畫面</b>`;
        } catch (error) {
            console.error(error);
            console.error('Failed batch requests:', batch);
            Swal.fire('發生錯誤', `批次 ${index + 1} 處理失敗，請通知管理員處理！`, 'error');
        }
    }
    const promises: Array<Promise<void>> = [];
    while (currentBatch < totalBatches) {
        while (promises.length < concurrency && currentBatch < totalBatches) {
            promises.push(processBatch(batches[currentBatch], currentBatch));
            currentBatch++;
        }
        await Promise.all(promises);
        promises.length = 0;
    }
    Swal.close();
};
