import { parse as convertFromCSV, ParseConfig } from "papaparse";
import lensPath from "ramda/src/lensPath.js";
import over from "ramda/src/over.js";
import * as XLSX from 'xlsx';


type PapaString = string | null | number;

const setObjectValue = (object: any, path: PapaString, value: any): any => {
  const lensPathFunction = lensPath((!!path ? path+'' : '').split("."));
  return over(lensPathFunction, () => value, object || {});
};

export async function processFile(file: File | any, parseConfig: ParseConfig = {}) {
  if (!file) {
    return;
  }
  if (file.name.endsWith('.xlsx')) {
    return processXlsxFile(file);
  } else {
    const csvData = await getCsvData(file, parseConfig);
    return processCsvData(csvData);
  }
}

export async function processXlsxFile(file: File) {
  return new Promise<any[]>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target?.result as ArrayBuffer);
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const json = XLSX.utils.sheet_to_json(worksheet, {
        blankrows: false,
        defval: null,
      });
      resolve(json);
    };
    reader.onerror = (error) => reject(error);
    reader.readAsArrayBuffer(file);
  });
}

export async function processCsvFile(
  file: File | any,
  parseConfig: ParseConfig = {}
) {
  if (!file) {
    return;
  }
  const csvData = await getCsvData(file, parseConfig);
  return processCsvData(csvData);
}

export async function getCsvData(
  file: File | any,
  inputConfig: ParseConfig = {}
) {
  let config = {};
  const isObject = !!inputConfig && typeof inputConfig === "object";
  if (isObject) {
    config = inputConfig;
  }
  return new Promise<PapaString[][]>((resolve, reject) =>
    convertFromCSV(file, {
      // Defaults
      delimiter: ",",
      skipEmptyLines: true,
      // Configs (overwrites)
      ...config,
      // Callbacks
      complete: (result) => resolve(result.data as PapaString[][]),
      error: (error) => reject(error),
    })
  );
}

export function processCsvData(data: PapaString[][]): any[] {

  if (Array.isArray(data[0])) {
    const topRowKeys: PapaString[] = data[0];

    const dataRows = data.slice(1).map((row) => {
      let value: any = {};

      topRowKeys.forEach((key, index) => {
        value = setObjectValue(value, key, row[index]);
      });

      return value;
    });
    return dataRows;
  }
  else {
    const dataRows: any[] = [];
    data.forEach( (obj) => {
        let value: any = {}
        for (let key in obj) value = setObjectValue(value, key, obj[key]);
        dataRows.push(value);
    });
    return dataRows;
  }
}
