export const viewId = 6481387

export const fieldCodes = {
    關聯問題編號: '關聯問題編號',
    最新驗收日: '最新驗收日',
    結案日: '結案日',
    最新作業異動日: '最新作業異動日',

    問題編號: '問題編號',
    問題標題: '問題標題',
    更新時間: "更新時間",
    開始時間: '開始時間',
    提醒時間: '提醒時間',
    發行日: '發行日',
    到期日: '到期日',
    說明: '說明',
    優先度: "優先度",
    主要執行者: '主要執行者',
    處理人員: '處理人員',
    作業狀態_完成度: '作業狀態_完成度',
    標籤: '標籤',

    變更發行日: '變更發行日',
    變更到期日: '變更到期日',

    標籤類別: '標籤類別',
    最後取用時間: '最後取用時間',

    作業工數明細表格: '作業工數明細表格',
    事件時間: '事件時間',
    事件類型: '事件類型',
    作業時間: '作業時間',
    作業帳: '作業帳',
    作業狀態: '作業狀態',
    作業工時說明: '作業工時說明',

    工數合計: '工數合計',
    工數合計_WFO: '工數合計_WFO',
    工數合計_WFH: '工數合計_WFH',

    工數_WFO: '工數_WFO',
    工數_WFH: '工數_WFH',
    開始時間_初始: '開始時間_初始',
};

export const buttonConfigs = [
    { currentStatus: "A-發行", nextStatus: "B-進行中" },
    { currentStatus: ["B-進行中", "R-返工"], nextStatus: "C-驗收( V&V )" },
    { currentStatus: "C-驗收( V&V )", nextStatus: "F-結案" },
    {
        currentStatus: ["B-進行", "C-驗收( V&V )", "R-返工"],
        nextStatus: "P-暫緩",
    },
    {
        currentStatus: ["F-結案", "C-驗收( V&V )", "P-暫緩"],
        nextStatus: "R-返工",
    },
];


export const colors = (color: string) => {
    switch(color){
        case 'A-發行':
            return '#91BBF7';
        case 'B-進行中':
            return '#72d766';
        case 'C-驗收( V&V )':
            return '#D1C4E9';
        case 'F-結案':
            return '#a6adb3';
        case 'P-暫緩':
            return '#EF6B6B';
        case 'R-返工':
            return '#FFA500';
        default:
            return '#ffffff';
    }
};