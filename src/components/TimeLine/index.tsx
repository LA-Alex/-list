import React, { useCallback, useState } from "react";
import { Typography, Tag, Button, message, Modal } from "antd";
import { CalendarOutlined, FlagOutlined, UserOutlined } from "@ant-design/icons";
import { addDays, format, subDays } from "date-fns";
import { zhTW } from "date-fns/locale";
import DOMPurify from "dompurify";
import { fieldCodes, colors, buttonConfigs } from "../../config/fieldCodes";

import { putRequests } from "../../service/api";
import Swal from "sweetalert2";
import "./TimelineStyles.css";

const { Text } = Typography;

const Timeline: React.FC<{
    record: any;
    show: boolean;
    onClose?: () => void;
}> = ({ record, show, onClose }) => {

    const [isModalShow, setIsModalShow] = useState(show);

    const dateOrder = [
        fieldCodes.發行日,
        fieldCodes.開始時間,
        fieldCodes.更新時間,
        fieldCodes.提醒時間,
        fieldCodes.到期日,
    ];

	const setStartTime = async (
        currentTime: Date, 
        id: string, 
        record: any = {}, 
        WFO: number = 0, 
        WFH: number = 0, 
        workDescription: string = "") => {
			try {
				const now = new Date();
				now.setHours(now.getHours() + 8);

				const formattedTime = new Date(currentTime.getTime() + 8 * 60 * 60 * 1000).toISOString().replace("Z", "+08:00");
				const updateRecord = {
					[fieldCodes.提醒時間]: { value: formattedTime },
                    [fieldCodes.最新作業異動日]: { value:  now.toISOString().split("T")[0] },
					[fieldCodes.作業狀態_完成度]: { value: record[fieldCodes.作業狀態_完成度].value == 'A-發行' ? 'B-進行中' : record[fieldCodes.作業狀態_完成度].value },
				};

				const newEntry = {
					value: {
						[fieldCodes.事件時間]: { value: now.toISOString().replace("Z", "+08:00") },
						[fieldCodes.事件類型]: { value: '作業規劃/提醒時間' },
						[fieldCodes.作業時間]: { value: formattedTime },
						[fieldCodes.作業帳]: { value: [{ code: kintone.getLoginUser().code }] },
						[fieldCodes.作業狀態]: { value: record[fieldCodes.作業狀態_完成度].value == 'A-發行' ? 'B-進行中' : record[fieldCodes.作業狀態_完成度].value },
						[fieldCodes.作業工時說明]: { value: workDescription },
						[fieldCodes.工數_WFO]: { value: WFO },
						[fieldCodes.工數_WFH]: { value: WFH },
					},
				};

				if (record[fieldCodes.作業工數明細表格].value.length === 1 && 
                    !record[fieldCodes.作業工數明細表格].value[0].value[fieldCodes.作業時間].value) record[fieldCodes.作業工數明細表格].value = [newEntry];
				else record[fieldCodes.作業工數明細表格].value.push(newEntry);

				if (!record[fieldCodes.開始時間_初始].value) updateRecord[fieldCodes.開始時間_初始] = { value: formattedTime };
                
				updateRecord[fieldCodes.工數合計] = {
					value:
						Number(WFO) +
						Number(WFH) +
						Number(record[fieldCodes.工數合計].value),
				};

				updateRecord[fieldCodes.作業工數明細表格] = {value: record[fieldCodes.作業工數明細表格].value };
                await putRequests(1093, id, updateRecord);

                updateRecord[fieldCodes.更新時間] = { value: now.toISOString().replace("Z", "+08:00") }

				message.success(`作業規劃/提醒時間已記錄：${formatDateTime(currentTime)}`);
			} catch (error) {
				console.error(`更新作業規劃/提醒時間失敗`, error);
				message.error(`更新作業規劃/提醒時間失敗`);
			}
	}

	/* ---------------------------------------------------------------*/
	/*                     按鈕或點擊事件處理                           */
	/* -------------------------------------------------------------- */

	const handleStartWork = async (id: string) => {
        const now = new Date();
        const tomorrow = addDays(now, 1);
        const dayAfterTomorrow = addDays(now, 2);
        dayAfterTomorrow.setHours(10, 0, 0, 0);

        let selectedDate: Date | undefined;

        const formatDateWithWeekday = (date: Date) => format(date, "yyyy/MM/dd (EEEE)", { locale: zhTW });

        const { isConfirmed, value } = await Swal.fire({
            title: "請選擇作業規劃/提醒時間",
            icon: "info",
            html: `
            <div class="radio-group-container">
                <div class="custom-radio-group">
                    <label>
                        <input type="radio" name="dateChoice" value="today" checked>今天 ${formatDateWithWeekday(now)}
                        <input type="time" id="timeToday" style="border: none" value="10:00">
                    </label>
                    <label>
                        <input type="radio" name="dateChoice" value="tomorrow">明天 ${formatDateWithWeekday(tomorrow)}
                        <input type="time" id="timeTomorrow"  style="border: none"  value="10:00">
                    </label>
                    <label>
                        <input type="radio" name="dateChoice" value="custom"> 其他
                        <input type="datetime-local" id="customDate" style = "border: none" value="${format(dayAfterTomorrow, "yyyy-MM-dd")}T10:00"
                            min="${format(now, "yyyy-MM-dd")}T00:00">
                    </label>
                </div>
            </div>
            `,
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonText: "確定",
            cancelButtonText: "取消",
            customClass: {
                popup: "custom-popup",
                title: "custom-title",
                actions: "custom-actions",
                confirmButton: "custom-confirm-button",
                cancelButton: "custom-cancel-button",
            },
            preConfirm: () => {
                const choiceElement = document.querySelector('input[name="dateChoice"]:checked');
                if (!choiceElement) {
                    Swal.showValidationMessage("請選擇一個選項");
                    return;
                }
        
                const choice = (choiceElement as HTMLInputElement).value;
                let selectedDateTime: Date | null = null;
        
                if (choice === "today") {
                    const timeToday = (document.getElementById("timeToday") as HTMLInputElement)?.value || "10:00";
                    console.log(timeToday)
                    selectedDateTime = new Date(`${format(now, "yyyy-MM-dd")}T${timeToday}`);
                } else if (choice === "tomorrow") {
                    const timeTomorrow = (document.getElementById("timeTomorrow") as HTMLInputElement)?.value || "10:00";
                    selectedDateTime = new Date(`${format(tomorrow, "yyyy-MM-dd")}T${timeTomorrow}`);
                } else if (choice === "custom") {
                    const customDateInput = document.getElementById("customDate") as HTMLInputElement;
                    if (!customDateInput || !customDateInput.value) {
                        Swal.showValidationMessage("請選擇一個有效的日期和時間");
                        return;
                    }
                    selectedDateTime = new Date(customDateInput.value);
                }
        
                if (!selectedDateTime || isNaN(selectedDateTime.getTime())) {
                    Swal.showValidationMessage("無效的日期時間");
                    return;
                }
        
                selectedDate = selectedDateTime;
            },
        });

        if (isConfirmed && value) {
            if (selectedDate) {
                await setStartTime(selectedDate, id, record);
            } else {
                message.error("請選擇一個有效的日期");
            }

            await Swal.fire({
                title: "已設置作業規劃/提醒時間",
                text: `作業規劃/提醒時間已設置為 ${selectedDate ? formatDateWithWeekday(selectedDate) : "無效的日期"}`,
                icon: "success",
                confirmButtonText: "確定",
                customClass: {
                    popup: "custom-popup",
                    title: "custom-title",
                    confirmButton: "custom-confirm-button",
                },
            });

            window.location.reload();
        }
    }

	const handleStartWorkNow = async (id:string ) => {
        const now = new Date();
        const dayAfterTomorrow = subDays(now, 1);
        dayAfterTomorrow.setHours(10, 0, 0, 0);

        const formatDateWithWeekday = (date: Date) => format(date, "yyyy/MM/dd HH:mm (EEEE)", { locale: zhTW });

        const { isConfirmed, value } = await Swal.fire({
            title: "請選擇開始時間的時間",
            icon: "info",
            html: `
            <div class="radio-group-container">
                <div class="custom-radio-group">
                    <label><input type="radio" name="dateChoice" value="today" checked> 當前時間 ${formatDateWithWeekday(
                        now
                    )}</label>
                    <label><input type="radio" name="dateChoice" value="custom"> 其他時間
                        <input type="datetime-local" id="customDate" style="border: none" value="${format(
                            dayAfterTomorrow,
                            "yyyy-MM-dd hh:mm"
                        )}" max="${format(now, "yyyy-MM-dd hh:mm")}">
                    </label>
                    <label class="input-with-unit">
                        WFO(公司) <input type="number" id="WFO" name="WFO" min="0" step="0.5" value="0.0">
                    </label>
                    <label class="input-with-unit">
                        WFH(自宅) <input type="number" id="WFH" name="WFH" min="0" step="0.5" value="0.0">
                    </label>
                    <label>
                        作業工時說明：<input type="text" id="workDescription" placeholder="輸入說明">
                    </label>
                    <label>
                        歷史工數合計：${record[fieldCodes.工數合計].value || 0} 人時
                    </label>
                </div>
            </div>
        `,
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonText: "確定",
            cancelButtonText: "取消",
            customClass: {
                popup: "custom-popup",
                title: "custom-title",
                actions: "custom-actions",
                confirmButton: "custom-confirm-button",
                cancelButton: "custom-cancel-button",
            },
            preConfirm: () => {
                const choiceElement = document.querySelector(
                    'input[name="dateChoice"]:checked'
                );
                if (!choiceElement) {
                    Swal.showValidationMessage("請選擇一個選項");
                    return;
                }
                const choice = (choiceElement as HTMLInputElement).value;
            
                const customDateInput = document.getElementById("customDate") as HTMLInputElement | null;
                const wfoElement = document.getElementById("WFO") as HTMLInputElement | null;
                const wfhElement = document.getElementById("WFH") as HTMLInputElement | null;
                const workDescriptionElement = document.getElementById("workDescription") as HTMLInputElement | null;
            
                const wfoValue = wfoElement?.value || "0";
                const wfhValue = wfhElement?.value || "0";
                const workDescription = workDescriptionElement?.value || "";
            
                let selectedDate: Date | null = null;
                switch (choice) {
                    case "today":
                        selectedDate = now;
                        break;
                    case "custom":
                        if (!customDateInput || !customDateInput.value) {
                            Swal.showValidationMessage("請輸入有效的自定義日期");
                            return;
                        }
                        selectedDate = new Date(customDateInput.value);
                        selectedDate.setHours(10, 0, 0, 0);
                        break;
                }
            
                if (!selectedDate) {
                    Swal.showValidationMessage("請選擇或輸入有效的日期");
                    return;
                }
            
                return { selectedDate, wfoValue, wfhValue, workDescription };
            },
        });

        if (isConfirmed && value) {
            const { selectedDate, wfoValue, wfhValue, workDescription } = value;

            await setStartTime(
                selectedDate,
                id,
                record,
                wfoValue || 0,
                wfhValue || 0,
                workDescription
            );

            // 顯示確認訊息，包括 WFO、WFH 和作業工時說明
            await Swal.fire({
                title: "已設置開始時間",
                html: `開始時間已設置為 ${formatDateWithWeekday(
                    selectedDate
                )}<br/>WFO: ${wfoValue || 0} 人時<br/>WFH: ${
                    wfhValue || 0
                } 人時<br/>說明: ${workDescription || "無"}`,
                icon: "success",
                confirmButtonText: "確定",
                customClass: {
                    popup: "custom-popup",
                    title: "custom-title",
                    confirmButton: "custom-confirm-button",
                },
            });

            window.location.reload();
        }
    }

    const handleChangeState = async (id: string, state:string) => {
        const { isConfirmed } = await Swal.fire({
            title: `是否要更改狀態為 ${state} ？`,
            icon: "question",
            showCancelButton: true,
            confirmButtonText: "是的",
            cancelButtonText: "取消",
        });

        if (isConfirmed) {
            try {
                const now = new Date();
                now.setHours(now.getHours() + 8);
                const year = now.getFullYear();
                const month = String(now.getMonth() + 1).padStart(2, '0');
                const day = String(now.getDate()).padStart(2, '0');
                const updateData = { [fieldCodes.作業狀態_完成度]: { value: state } };
                const newEntry = {
                    value: {
                        [fieldCodes.事件時間]: {
                            value: now.toISOString().replace("Z", "+08:00"),
                        },
                        [fieldCodes.事件類型]: { value: "狀態更新" },
                        [fieldCodes.作業時間]: {
                            value: now.toISOString().replace("Z", "+08:00"),
                        },
                        [fieldCodes.作業帳]: {
                            value: [{ code: kintone.getLoginUser().code }],
                        },
                        [fieldCodes.作業狀態]: { value: state },
                        [fieldCodes.作業工時說明]: { value: "" },
                        [fieldCodes.工數_WFO]: { value: 0 },
                        [fieldCodes.工數_WFH]: { value: 0 },
                    },
                };
                if (
                    record[fieldCodes.作業工數明細表格].value.length === 1 &&
                    !record[fieldCodes.作業工數明細表格].value[0].value[
                        fieldCodes.作業時間
                    ].value
                ) {
                    record[fieldCodes.作業工數明細表格].value = [newEntry];
                } else {
                    record[fieldCodes.作業工數明細表格].value.push(newEntry);
                }
                if(state == 'C-驗收( V&V )'){
                    updateData[fieldCodes.最新驗收日] = { value: `${year}-${month}-${day}` };
                }
                if(state == 'F-結案'){
                    updateData[fieldCodes.結案日] = { value: `${year}-${month}-${day}` };
                }
                if (!record[fieldCodes.開始時間_初始].value)
                    updateData[fieldCodes.開始時間_初始] = {
                        value: now.toISOString().replace("Z", "+08:00"),
                    };
                updateData[fieldCodes.作業工數明細表格] = {
                    value: record[fieldCodes.作業工數明細表格].value,
                };

                updateData[fieldCodes.最新作業異動日] = { value:  now.toISOString().split("T")[0] },


                await putRequests(1093, id, updateData);

                await Swal.fire({
                    title: "狀態已更新",
                    text: `狀態已更新為 ${state}`,
                    icon: "success",
                    confirmButtonText: "確定",
                });

                window.location.reload();
                
                message.success(`狀態已更新為：${state}`);
            } catch (error) {
                console.error("Kintone 更新失敗:", error);
                message.error("更新狀態失敗");
            }
        }
    }


    const formatDateTime = useCallback((date: string | Date | null): string => {
        if (date) {
            const d = typeof date === "string" ? new Date(date) : date;

            if (isNaN(d.getTime())) {
                return "無效的日期";
            }

            const hasTime = date.toString().includes("T");

            if (!hasTime) return format(d, "yyyy/MM/dd", { locale: zhTW });
            return format(d, "yyyy/MM/dd HH:mm", { locale: zhTW });
        } else {
            return "無設定";
        }
    }, []);

    const handleOpen = useCallback((id: any, edit: any) => {
        window.open(`https://${window.location.hostname}/k/1093/show#record=${id}${edit ? "&mode=edit" : ""}`, '_blank');
      }, []);

    const convertUrlsToLinks = (text: string): string => {
        const urlRegex = /(https?:\/\/[^\s<>\u4e00-\u9fff]+)/g;
        return text.replace(urlRegex, (url) => {
            return `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`;
        });
    };

    const renderText = () => {
        const 說明 = record[fieldCodes.說明]?.value || "";
        const sanitizedText = DOMPurify.sanitize(說明);
        const textWithLinks = convertUrlsToLinks(sanitizedText);
    
        const strippedText = textWithLinks
            .replace(/<br\s*\/?>/g, "")
            .replace(/<div\b[^>]*>(.*?)<\/div>/gi, "$1")
            .trim();
    
        if (!strippedText || strippedText === "<div></div>") {
            return <div className="collapsible-text-section">無內容</div>;
        }
    
        return (
            <div className="collapsible-text-section">
                <div
                    dangerouslySetInnerHTML={{ __html: textWithLinks }}
                    style={{
                        wordWrap: "break-word",
                        wordBreak: "break-all",
                        whiteSpace: "pre-wrap",
                    }}
                />
            </div>
        );
    };

    const 問題標題 = record[fieldCodes.問題標題]?.value || "無標題";
    const 處理人員 = record[fieldCodes.處理人員]?.value
        .map((person: { name: string }) => person.name.trim()) || [];
    const 狀態 = record[fieldCodes.作業狀態_完成度]?.value || "無";
    const 日期 = record[fieldCodes.發行日]?.value;
    const statusColor = colors(狀態);
    const 標籤 = record[fieldCodes.標籤]?.value.split(",")?.map((tag: string) => tag.trim()) || [];

    if (!日期) return null;

    return (
        <Modal
            open={isModalShow}
            onCancel={() => {
                setIsModalShow(false);
                onClose?.();
            }}
            footer={null}
            className="timeline-modal"
            width={1400}
            destroyOnClose
        >
            <div key={record.$id.value} className="timeline-item" style={{ "--status-color": statusColor } as React.CSSProperties}>
                <div className="timeline-status-bar"></div>
                <div className="timeline-content">
                    <div className="timeline-header">
                        <div className="timeline-title-section">
                            <div className="timeline-status">
                                <FlagOutlined /> {狀態}
                            </div>
                            <Text className="timeline-title">{問題標題}</Text>
                        </div>
                        <div className="timeline-info">
                            <Tag className={`timeline-tag timeline-priority ${record[fieldCodes.優先度]?.value || "default"}`}>
                                {record[fieldCodes.優先度]?.value}
                            </Tag>
                            <Tag className="timeline-tag timeline-date">
                                <CalendarOutlined /> {fieldCodes.發行日} {formatDateTime(日期)}
                            </Tag>
                            <Tag className="timeline-tag timeline-number">#{record[fieldCodes.問題編號]?.value}</Tag>
                        </div>
                    </div>
                    <div className="timeline-detail">
                        <div className="collapsible-text-section">{renderText()}</div>
                        <div className="timeline-users">
                            {處理人員.length > 0 ? (
                                處理人員.map((person: string, index: number) => (
                                    <Tag key={index} className="timeline-tag timeline-user">
                                        <UserOutlined /> {person}
                                    </Tag>
                                ))
                            ) : (
                                <Tag className="timeline-tag timeline-user">
                                    <UserOutlined /> 無人員
                                </Tag>
                            )}

                        </div>
                        <div className="timeline-users">
                            {record[fieldCodes.主要執行者].value.length > 0 ? (
                                <Tag><UserOutlined /> 主要人員：{record[fieldCodes.主要執行者].value[0].name}</Tag>
                            ) : (
                                null
                            )}
                        </div>
                        <div className="timeline-allTag">
                            {標籤.map((tag: string, index: number) => (
                                <Tag
                                    key={index}
                                    className="timeline-tag timeline-otherTag"
                                    style={{ cursor: "pointer", color: "#3498db" }}
    /*                                 onClick={() => handleTagClick(tag)} */
                                >
                                    #{tag}
                                </Tag>
                            ))}
                        </div>
                        <div className="timeline-allDate">
                            {dateOrder
                                .filter((recordDate) => fieldCodes.發行日 !== recordDate)
                                .map((recordDate, index) => (
                                    <Tag key={index} className="timeline-tag timeline-otherDate">
                                        <CalendarOutlined /> {recordDate === "提醒時間" ? "作業規劃/提醒時間" : recordDate} {formatDateTime(record[recordDate]?.value)}
                                    </Tag>
                                ))}
                        </div>
                        <div className='timeline-footer'>
                            <div className="timeline-actions">
                                <div className="timeline-actions-state">
                                    {buttonConfigs.map((config: { currentStatus: string | string[], nextStatus: string }, btnIndex) => {
                                        const shouldRender = Array.isArray(config.currentStatus)
                                            ? config.currentStatus.includes(狀態)
                                            : 狀態 === config.currentStatus;

                                        return (
                                            shouldRender && (
                                                <Button
                                                    type="primary"
                                                    key={btnIndex}
                                                    className={`state-button state-button-${config.nextStatus}`}
                                                    onClick={() => handleChangeState(record.$id.value, config.nextStatus)}
                                                    style={{ backgroundColor: colors(config.nextStatus) }}
                                                >
                                                    {config.nextStatus}
                                                </Button>
                                            )
                                        );
                                    })}
                                </div>
                                <Button type="primary" className="now-start-button" style={{ backgroundColor: "#EF6B6B", width: "200px" }} onClick={() => handleStartWorkNow(record.$id.value)}>開始作業、工數</Button>
                                <Button type="primary" className="view-button" style={{backgroundColor: "#52c41a"}} onClick={() => handleOpen(record.$id.value, false)}>查看資料</Button>
                                <Button type="primary" className="edit-button" style={{backgroundColor: "#1890ff"}} onClick={() => handleOpen(record.$id.value, true)}>編輯資料</Button>
                                <Button type="primary"className="start-button" style={{ backgroundColor: "#faad14" }} onClick={() => handleStartWork(record.$id.value)}> 作業規劃/提醒時間 </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </Modal>

    );
};

export default Timeline;
