const _cache: Record<number, Record<string, string[]>> = {};

// 移除 Kintone 欄位代碼裡可能夾雜的不可見字元（零寬空格 U+200B 等）
const cleanKey = (key: string) => key.replace(/[​‌‍﻿­]/g, '');

const parseOptions = (optionsObj: Record<string, { label: string; index: string }>): string[] =>
  Object.values(optionsObj)
    .sort((a, b) => Number(a.index) - Number(b.index))
    .map(o => o.label);

const extractFields = (properties: Record<string, any>, result: Record<string, string[]>) => {
  for (const field of Object.values(properties)) {
    if (field.type === 'SUBTABLE' && field.fields) {
      extractFields(field.fields, result);
    } else if (field.options && field.code) {
      result[cleanKey(field.code)] = parseOptions(field.options);
    }
  }
};

export const fetchAppFieldOptions = async (appId: number): Promise<Record<string, string[]>> => {
  if (_cache[appId]) return _cache[appId];
  const resp = await kintone.api(kintone.api.url('/k/v1/app/form/fields', true), 'GET', { app: appId });
  const result: Record<string, string[]> = {};
  extractFields(resp.properties, result);
  _cache[appId] = result;
  return result;
};
