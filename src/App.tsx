import { useState, useEffect } from 'react';
import { clockIn, clockOut, updateWorkLocation } from './api/workDayApi';
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';

import { SourceRecord, WorkDayRecord, WorkRow, DayType, AssignedRow, DispatchedTask } from './types';
import { getSourceRecords } from './api/app1094Api';
import {
  fetchWorkDayRecords, getWeekDates, getTodayDate, addRowToWorkDay,
  updateRowOrder, moveRowBetweenDays, deleteRow, updateRow,
  fetchAssignedRows, setRowComplete,
  fetchDispatchedTasks, confirmTask,
} from './api/workDayApi';

import LeftPanel from './components/LeftPanel/LeftPanel';
import DayColumn from './components/RightPanel/DayColumn';
import DispatchPanel from './components/DispatchPanel/DispatchPanel';
import AssignedPanel from './components/AssignedPanel/AssignedPanel';
import './App.css';

const App = () => {
  const [sourceRecords, setSourceRecords] = useState<SourceRecord[]>([]);
  const [workDays, setWorkDays] = useState<Record<string, WorkDayRecord> | null>(null);
  const [assignedRows, setAssignedRows] = useState<AssignedRow[]>([]);
  const [dispatchedTasks, setDispatchedTasks] = useState<DispatchedTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSourceIds, setSelectedSourceIds] = useState<string[]>([]);
  const [activeSource, setActiveSource] = useState<SourceRecord | null>(null);
  const [activeWorkRow, setActiveWorkRow] = useState<{ row: WorkRow; dayKey: DayType } | null>(null);
  const [clockInTime, setClockInTime] = useState<string>('');
  const [clockOutTime, setClockOutTime] = useState<string>('');
  const [workLocation, setWorkLocation] = useState<string>('');
  const [weekOffset, setWeekOffset] = useState(0);
  const todayDate = getTodayDate();
  const displayDates = getWeekDates(weekOffset);
  const userName = kintone.getLoginUser().name;

  const sensors = useSensors(useSensor(PointerSensor, {
    activationConstraint: { distance: 5 },
  }));

  useEffect(() => {
    const init = async () => {
      try {
        const [sources, days, assigned, dispatched] = await Promise.all([
          getSourceRecords(),
          fetchWorkDayRecords(getWeekDates(weekOffset)),
          fetchAssignedRows(),
          fetchDispatchedTasks(),
        ]);
        setSourceRecords(sources);
        setWorkDays(days);
        setAssignedRows(assigned);
        setDispatchedTasks(dispatched);
        setWorkLocation(days[todayDate]?.工作地點 || '');
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  // 週切換時重新載入資料
  useEffect(() => {
    if (loading) return;
    const load = async () => {
      try {
        const days = await fetchWorkDayRecords(getWeekDates(weekOffset));
        setWorkDays(days);
      } catch (e) {
        console.error(e);
      }
    };
    load();
  }, [weekOffset]);

  const handleToggleSelect = (id: string) => {
    setSelectedSourceIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleClockIn = async () => {
    if (!workDays?.[todayDate]) return;
    try {
      const { time } = await clockIn(workDays[todayDate]);
      setClockInTime(time);
    } catch (e) {
      console.error(e);
      alert('打卡失敗，請確認是否允許位置存取！');
    }
  };

  const handleClockOut = async () => {
    if (!workDays?.[todayDate]) return;
    try {
      const { time } = await clockOut(workDays[todayDate]);
      setClockOutTime(time);
    } catch (e) {
      console.error(e);
      alert('下班打卡失敗！');
    }
  };

  const handleWorkLocationChange = async (location: string) => {
    if (!workDays?.[todayDate]?.id) return;
    setWorkLocation(location);
    try {
      await updateWorkLocation(workDays[todayDate].id!, location);
    } catch (e) {
      console.error(e);
    }
  };

  const handleConfirmDispatch = async (task: DispatchedTask) => {
    try {
      await confirmTask(task.recordId, task.subtableId);
      setDispatchedTasks(prev => prev.filter(t => t.subtableId !== task.subtableId));
    } catch (e) {
      console.error(e);
    }
  };

  const handleCompleteAssigned = async (row: AssignedRow) => {
    try {
      await setRowComplete(row.sourceRecordId, row.subtableId);
      const freshDays = await fetchWorkDayRecords(getWeekDates(weekOffset));
      setWorkDays(freshDays);
      setAssignedRows(prev =>
        prev.map(r => r.subtableId === row.subtableId ? { ...r, 交辦: '完成' } : r)
      );
    } catch (e) {
      console.error(e);
    }
  };

  const handleCopy = async (fromDayKey: DayType, row: WorkRow, toDayKey: DayType) => {
    if (!workDays?.[toDayKey]) return;
    const copyFields: Partial<WorkRow> = {
      產品大類: row.產品大類,
      來源標籤: row.來源標籤,
      工作性質: row.工作性質,
      交辦MEMO: row.交辦MEMO,
      內容: row.內容,
      關聯者: row.關聯者,
      交辦: row.交辦,
    };
    try {
      const newRows = await addRowToWorkDay(workDays[toDayKey], row.來源標籤, workDays[toDayKey].rows, undefined, undefined, copyFields);
      setWorkDays(prev => prev ? { ...prev, [toDayKey]: { ...prev[toDayKey], rows: newRows } } : prev);
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddDirect = async (dayKey: DayType, label: string, sourceRowRef?: string, sourceRow?: WorkRow) => {
    if (!workDays) return;
    const record = workDays[dayKey];
    if (!record) return;
    // 允許重複標籤（老闆說可以重複）
    try {
      const newRows = await addRowToWorkDay(record, label, record.rows, undefined, sourceRowRef, sourceRow);
      setWorkDays(prev => prev ? {
        ...prev,
        [dayKey]: { ...prev[dayKey], rows: newRows },
      } : prev);
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddSelected = async (dayKey: DayType) => {
    if (!workDays || selectedSourceIds.length === 0) return;
    const record = workDays[dayKey];
    if (!record) return;
    const selectedRecords = sourceRecords.filter(r => selectedSourceIds.includes(r.id));
    let currentRows = record.rows;
    for (const src of selectedRecords) {
      const newRows = await addRowToWorkDay(record, src.標籤, currentRows);
      currentRows = newRows;
    }
    setWorkDays(prev => prev ? {
      ...prev,
      [dayKey]: { ...prev[dayKey], rows: currentRows },
    } : prev);
    setSelectedSourceIds([]);
  };

  const handleDelete = async (dayKey: DayType, subtableId: string) => {
    if (!workDays) return;
    const record = workDays[dayKey];
    try {
      const newRows = await deleteRow(record, subtableId, record.rows);
      setWorkDays(prev => prev ? {
        ...prev,
        [dayKey]: { ...prev[dayKey], rows: newRows },
      } : prev);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSave = async (dayKey: DayType, updatedRow: WorkRow) => {
    if (!workDays) return;
    const record = workDays[dayKey];
    try {
      await updateRow(record, updatedRow, record.rows);
      setWorkDays(prev => prev ? {
        ...prev,
        [dayKey]: {
          ...prev[dayKey],
          rows: prev[dayKey].rows.map(r =>
            r.subtableId === updatedRow.subtableId ? updatedRow : r
          ),
        },
      } : prev);
      if (updatedRow.完成 === '完成' && updatedRow.來源列ID) {
        const [srcRecordId, srcSubtableId] = updatedRow.來源列ID.split('|');
        if (srcRecordId && srcSubtableId) {
          await setRowComplete(srcRecordId, srcSubtableId);
          setWorkDays(prev => {
            if (!prev) return prev;
            const updated = { ...prev };
            for (const d of Object.keys(prev)) {
              if (prev[d].rows.some(r => r.subtableId === srcSubtableId)) {
                updated[d] = {
                  ...prev[d],
                  rows: prev[d].rows.map(r =>
                    r.subtableId === srcSubtableId ? { ...r, 交辦: '完成' } : r
                  ),
                };
              }
            }
            return updated;
          });
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDragStart = (event: any) => {
    const { data } = event.active;
    if (data.current?.type === 'source') {
      setActiveSource(data.current.record);
    } else if (data.current?.type === 'assigned') {
      const row = data.current.row;
      setActiveSource({ id: row.subtableId, 標籤: row.來源標籤, 標籤類別: '交辦', 更新時間: '' });
    } else if (data.current?.type === 'work') {
      setActiveWorkRow({ row: data.current.row, dayKey: data.current.dayKey });
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveSource(null);
    setActiveWorkRow(null);
    const { active, over } = event;
    if (!over || !workDays) return;

    const activeData = (active.data as any).current;
    const overId = over.id as string;

    if (activeData?.type === 'source' || activeData?.type === 'assigned') {
      const targetDay = displayDates.find(d =>
        overId === `droppable-${d}` || overId.startsWith(`work-${d}-`)
      );
      if (!targetDay) return;
      const label = activeData.type === 'source'
        ? (activeData.record as SourceRecord).標籤
        : activeData.row.來源標籤;
      const sourceRowRef = activeData.type === 'assigned'
        ? `${activeData.row.sourceRecordId}|${activeData.row.subtableId}`
        : undefined;
      const sourceRow = activeData.type === 'assigned' ? activeData.row as WorkRow : undefined;
      await handleAddDirect(targetDay, label, sourceRowRef, sourceRow);
      return;
    }

    if (activeData?.type === 'work') {
      const sourceDayKey = activeData.dayKey as DayType;
      const targetDay = displayDates.find(d =>
        overId === `droppable-${d}` || overId.startsWith(`work-${d}-`)
      );
      if (!targetDay) return;

      const sourceRows = workDays[sourceDayKey].rows;
      const activeId = active.id as string;

      if (sourceDayKey !== targetDay) {
        const movingRow = sourceRows.find(r => `work-${sourceDayKey}-${r.subtableId}` === activeId);
        if (!movingRow) return;

        const newSourceRows = sourceRows.filter(r => `work-${sourceDayKey}-${r.subtableId}` !== activeId);
        const newTargetRows = [...workDays[targetDay].rows, movingRow];

        setWorkDays(prev => prev ? {
          ...prev,
          [sourceDayKey]: { ...prev[sourceDayKey], rows: newSourceRows },
          [targetDay]: { ...prev[targetDay], rows: newTargetRows },
        } : prev);

        try {
          await moveRowBetweenDays(workDays[sourceDayKey], workDays[targetDay], movingRow, newSourceRows, newTargetRows);
        } catch (e) {
          console.error(e);
        }
        return;
      }

      if (activeId === overId) return;
      const oldIndex = sourceRows.findIndex(r => `work-${sourceDayKey}-${r.subtableId}` === activeId);
      const newIndex = sourceRows.findIndex(r => `work-${sourceDayKey}-${r.subtableId}` === overId);
      if (oldIndex === -1 || newIndex === -1) return;

      const newRows = arrayMove(sourceRows, oldIndex, newIndex);
      setWorkDays(prev => prev ? {
        ...prev,
        [sourceDayKey]: { ...prev[sourceDayKey], rows: newRows },
      } : prev);

      try {
        await updateRowOrder(workDays[sourceDayKey], newRows);
      } catch (e) {
        console.error(e);
      }
    }
  };

  if (loading) return <div className="app-loading">載入中...</div>;

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="app-layout">
        <LeftPanel
          records={sourceRecords}
          loading={loading}
          selectedIds={selectedSourceIds}
          onToggleSelect={handleToggleSelect}
        />
        <div className="right-panel">
          <div className="week-nav">
            <button className="week-nav__btn" onClick={() => setWeekOffset(w => w - 1)}>‹</button>
            <span className="week-nav__user" onClick={() => setWeekOffset(0)} title="回到本週">{userName}</span>
            <button className="week-nav__btn" onClick={() => setWeekOffset(w => w + 1)}>›</button>
          </div>
          {displayDates.map(date => (
            <DayColumn
              key={date}
              dayKey={date}
              date={date}
              rows={workDays?.[date]?.rows || []}
              recordId={workDays?.[date]?.id || null}
              selectedSourceIds={selectedSourceIds}
              scheduledTime={workDays?.[date]?.上班時間 || ''}
              clockInTime={
                date === todayDate
                  ? (clockInTime || workDays?.[todayDate]?.上班打卡 || '')
                  : (workDays?.[date]?.上班打卡 || '')
              }
              scheduledOutTime={workDays?.[date]?.下班時間 || ''}
              clockOutTime={
                date === todayDate
                  ? (clockOutTime || workDays?.[todayDate]?.下班打卡 || '')
                  : (workDays?.[date]?.下班打卡 || '')
              }
              isToday={date === todayDate}
              onAdd={handleAddSelected}
              onDelete={handleDelete}
              onSave={handleSave}
              onCopy={(row) => handleCopy(date, row, todayDate)}
              onClockIn={date === todayDate ? handleClockIn : undefined}
              onClockOut={date === todayDate ? handleClockOut : undefined}
              workLocation={date === todayDate ? workLocation : undefined}
              onWorkLocationChange={date === todayDate ? handleWorkLocationChange : undefined}
            />
          ))}
        </div>
        <DispatchPanel tasks={dispatchedTasks} onConfirm={handleConfirmDispatch} />
        <AssignedPanel rows={assignedRows} onComplete={handleCompleteAssigned} />
      </div>

      <DragOverlay>
        {activeSource && (
          <div className="drag-overlay-card">
            <div>{activeSource.標籤}</div>
            <div style={{ fontSize: 11, color: '#888' }}>{activeSource.標籤類別}</div>
          </div>
        )}
        {activeWorkRow && (
          <div className="drag-overlay-card">{activeWorkRow.row.來源標籤}</div>
        )}
      </DragOverlay>
    </DndContext>
  );
};

export default App;
