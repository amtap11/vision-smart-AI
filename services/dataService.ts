
import Papa from 'papaparse';
import { PatientRecord, DataQualityReport, ColumnProfile, ColumnStatistics, Dataset, TransformationSuggestion, RegressionModel, CorrelationMatrix, ClusterResult, ForecastResult } from '../types';

export const parseCSV = (file: File): Promise<PatientRecord[]> => {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true,
      complete: (results) => {
        if (results.data && results.data.length > 0) {
          resolve(results.data as PatientRecord[]);
        } else {
          reject(new Error("No data found in file"));
        }
      },
      error: (error: Error) => {
        reject(error);
      }
    });
  });
};

export const exportToCSV = (data: PatientRecord[], filename: string) => {
  const csv = Papa.unparse(data);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};

// --- DATA CLEANING UTILITIES ---

export const detectDuplicates = (data: PatientRecord[]): number => {
    const seen = new Set();
    let duplicates = 0;
    for (const row of data) {
        // Simple serialization to detect exact row matches
        const signature = JSON.stringify(row);
        if (seen.has(signature)) {
            duplicates++;
        } else {
            seen.add(signature);
        }
    }
    return duplicates;
};

export const removeDuplicates = (data: PatientRecord[]): PatientRecord[] => {
    const seen = new Set();
    return data.filter(row => {
        const signature = JSON.stringify(row);
        if (seen.has(signature)) return false;
        seen.add(signature);
        return true;
    });
};

export const detectOutliers = (data: PatientRecord[], column: string): number => {
    const values = data.map(d => Number(d[column])).filter(v => !isNaN(v) && v !== null);
    if (values.length < 4) return 0;
    
    values.sort((a, b) => a - b);
    const q1 = values[Math.floor((values.length / 4))];
    const q3 = values[Math.floor((values.length * (3 / 4)))];
    const iqr = q3 - q1;
    const lower = q1 - 1.5 * iqr;
    const upper = q3 + 1.5 * iqr;
    
    return values.filter(v => v < lower || v > upper).length;
};

export const removeOutliers = (data: PatientRecord[], column: string): PatientRecord[] => {
    const values = data.map(d => Number(d[column])).filter(v => !isNaN(v) && v !== null);
    if (values.length < 4) return data;
    
    values.sort((a, b) => a - b);
    const q1 = values[Math.floor((values.length / 4))];
    const q3 = values[Math.floor((values.length * (3 / 4)))];
    const iqr = q3 - q1;
    const lower = q1 - 1.5 * iqr;
    const upper = q3 + 1.5 * iqr;

    return data.filter(d => {
        const v = Number(d[column]);
        // Keep non-numeric or nulls, only filter if it is a number and is an outlier
        if (typeof d[column] !== 'number' || d[column] === null) return true;
        return v >= lower && v <= upper;
    });
};

export const renameColumnInDataset = (data: PatientRecord[], oldName: string, newName: string): PatientRecord[] => {
    return data.map(row => {
        const newRow: PatientRecord = {};
        Object.keys(row).forEach(key => {
            if (key === oldName) {
                newRow[newName] = row[key];
            } else {
                newRow[key] = row[key];
            }
        });
        return newRow;
    });
};

export const imputeMissingValues = (data: PatientRecord[], column: string, strategy: 'mean' | 'mode' | 'custom', customValue?: string | number): PatientRecord[] => {
    // 1. Calculate Mean or Mode if needed
    let fillValue: string | number = customValue || '';
    
    if (strategy === 'mean') {
        const values = data.map(d => d[column]).filter(v => typeof v === 'number') as number[];
        const sum = values.reduce((a, b) => a + b, 0);
        fillValue = values.length ? sum / values.length : 0;
    } else if (strategy === 'mode') {
        const counts: Record<string, number> = {};
        data.forEach(d => {
            const val = d[column];
            if (val !== null && val !== undefined && val !== '') {
                const s = String(val);
                counts[s] = (counts[s] || 0) + 1;
            }
        });
        const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
        fillValue = sorted.length > 0 ? sorted[0][0] : 'Unknown';
    }

    // 2. Apply
    return data.map(row => {
        const val = row[column];
        if (val === null || val === undefined || val === '') {
            return { ...row, [column]: fillValue };
        }
        return row;
    });
};

export const removeRowsWithMissing = (data: PatientRecord[], column: string): PatientRecord[] => {
    return data.filter(row => {
        const val = row[column];
        return val !== null && val !== undefined && val !== '';
    });
};

export const dropColumn = (data: PatientRecord[], column: string): PatientRecord[] => {
    return data.map(row => {
        const newRow = { ...row };
        delete newRow[column];
        return newRow;
    });
};

export const createSample = (data: PatientRecord[], size: number, type: 'random' | 'first'): PatientRecord[] => {
  if (size >= data.length) return [...data];
  if (type === 'first') return data.slice(0, size);
  
  // Fisher-Yates shuffle for random sampling
  const shuffled = [...data];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, size);
};

export const filterDataset = (data: PatientRecord[], column: string, value: string, mode: 'equals' | 'not_equals' | 'contains' | 'is_empty'): PatientRecord[] => {
    return data.filter(row => {
        const cell = row[column];
        const strCell = String(cell === null || cell === undefined ? '' : cell);
        
        switch(mode) {
            case 'equals': return strCell === value;
            case 'not_equals': return strCell !== value;
            case 'contains': return strCell.includes(value);
            case 'is_empty': return strCell === '';
            default: return true;
        }
    });
};

export const generateQualityReport = (data: PatientRecord[]): DataQualityReport => {
  if (data.length === 0) {
    return {
      totalRows: 0,
      totalColumns: 0,
      columns: [],
      score: 0,
      issues: ['Dataset is empty']
    };
  }

  const headers = Object.keys(data[0]);
  const totalRows = data.length;
  const issues: string[] = [];

  const columns: ColumnProfile[] = headers.map(header => {
    let missingCount = 0;
    const values: any[] = [];
    let dateCount = 0;
    let boolCount = 0;
    let numCount = 0;

    data.forEach(row => {
      const val = row[header];
      if (val === null || val === undefined || val === '') {
        missingCount++;
      } else {
        values.push(val);
        if (typeof val === 'number') {
            numCount++;
        } else if (typeof val === 'boolean') {
            boolCount++;
        } else {
            const strVal = String(val).trim();
            if (['true', 'false', 'yes', 'no', '0', '1'].includes(strVal.toLowerCase())) {
                boolCount++;
            }
            else if (!isNaN(Date.parse(strVal)) && strVal.length > 5 && /\d/.test(strVal)) {
                dateCount++;
            }
        }
      }
    });

    const uniqueCount = new Set(values).size;
    const missingPercentage = (missingCount / totalRows) * 100;
    const valueCount = values.length;

    let type: 'string' | 'number' | 'date' | 'boolean' | 'unknown' = 'string';
    if (valueCount > 0) {
        if (numCount / valueCount > 0.9) type = 'number';
        else if (boolCount / valueCount > 0.9) type = 'boolean';
        else if (dateCount / valueCount > 0.9) type = 'date';
        else type = 'string';
    }

    if (missingPercentage > 20) {
      issues.push(`Column '${header}' has ${missingPercentage.toFixed(1)}% missing data.`);
    }

    return {
      name: header,
      type,
      missingCount,
      missingPercentage,
      uniqueCount,
      exampleValues: values.slice(0, 3).map(String)
    };
  });

  const missingPenalty = columns.reduce((acc, col) => acc + (col.missingPercentage / 100), 0) / columns.length;
  const score = Math.max(0, Math.round(100 - (missingPenalty * 50)));

  return {
    totalRows,
    totalColumns: headers.length,
    columns,
    score,
    issues
  };
};

export const generateDatasetSummary = (data: PatientRecord[]): string => {
  if (data.length === 0) return "Dataset is empty.";
  const totalRows = data.length;
  const headers = Object.keys(data[0]);
  let summary = `Dataset Overview:\n- Total Rows: ${totalRows}\n- Columns: ${headers.join(', ')}\n\nField Statistics:\n`;

  headers.slice(0, 10).forEach(header => { 
    const values = data.map(d => d[header]).filter(v => v !== null && v !== undefined && v !== '');
    if (values.length === 0) return;
    const sample = values[0];
    if (typeof sample === 'number') {
      const sum = (values as number[]).reduce((a, b) => a + b, 0);
      const avg = sum / values.length;
      const min = Math.min(...(values as number[]));
      const max = Math.max(...(values as number[]));
      summary += `- ${header} (Numeric): Avg=${avg.toFixed(2)}, Min=${min}, Max=${max}\n`;
    } else {
      const counts: Record<string, number> = {};
      values.forEach(v => {
        const s = String(v);
        counts[s] = (counts[s] || 0) + 1;
      });
      const top3 = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k, v]) => `${k} (${Math.round(v/totalRows*100)}%)`).join(', ');
      summary += `- ${header} (Categorical): Top values: [${top3}]\n`;
    }
  });
  return summary;
};

export const generateColumnStatistics = (data: PatientRecord[]): ColumnStatistics[] => {
  if (data.length === 0) return [];
  const headers = Object.keys(data[0]);
  return headers.slice(0, 16).map(header => { 
    const values = data.map(d => d[header]).filter(v => v !== null && v !== undefined && v !== '');
    const isNumeric = values.length > 0 && values.every(v => !isNaN(Number(v)));

    if (isNumeric && values.length > 0) {
      const nums = values.map(v => Number(v));
      const sum = nums.reduce((a, b) => a + b, 0);
      return {
        name: header,
        type: 'numeric',
        uniqueCount: new Set(nums).size,
        min: Math.min(...nums),
        max: Math.max(...nums),
        avg: sum / nums.length
      };
    } else {
      const counts: Record<string, number> = {};
      values.forEach(v => {
        const s = String(v);
        counts[s] = (counts[s] || 0) + 1;
      });
      const topValues = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([value, count]) => ({ value, count }));
      return {
        name: header,
        type: 'categorical',
        uniqueCount: new Set(values).size,
        topValues
      };
    }
  });
};

export const getFilterableColumns = (data: PatientRecord[]): string[] => {
    if (data.length === 0) return [];
    const headers = Object.keys(data[0]);
    return headers.filter(header => {
        const values = new Set(data.map(d => d[header]));
        const sample = data[0][header];
        return (typeof sample === 'string' || typeof sample === 'boolean') && values.size > 1 && values.size < 20;
    });
};

export const calculatePearsonCorrelation = (x: number[], y: number[]): number | null => {
  if (x.length !== y.length || x.length === 0) return null;
  const n = x.length;
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
  const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
  const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0);
  const numerator = (n * sumXY) - (sumX * sumY);
  const denominator = Math.sqrt(((n * sumX2) - sumX * sumX) * ((n * sumY2) - sumY * sumY));
  if (denominator === 0) return 0;
  return numerator / denominator;
};

// --- MULTI-VARIABLE REGRESSION UTILS ---

const transpose = (matrix: number[][]): number[][] => matrix[0].map((_, colIndex) => matrix.map(row => row[colIndex]));

const multiply = (a: number[][], b: number[][]): number[][] => {
  const result = new Array(a.length).fill(0).map(() => new Array(b[0].length).fill(0));
  return result.map((row, i) => row.map((val, j) => a[i].reduce((sum, elm, k) => sum + (elm * b[k][j]), 0)));
};

const invert = (matrix: number[][]): number[][] => {
  const size = matrix.length;
  const x = new Array(size).fill(0).map(() => new Array(size).fill(0));
  const m = matrix.map(row => [...row]);
  for (let i = 0; i < size; i++) x[i][i] = 1;
  for (let i = 0; i < size; i++) {
    let pivot = m[i][i];
    if (pivot === 0) {
        for (let k = i + 1; k < size; k++) {
            if (m[k][i] !== 0) {
                [m[i], m[k]] = [m[k], m[i]];
                [x[i], x[k]] = [x[k], x[i]];
                pivot = m[i][i];
                break;
            }
        }
    }
    for (let j = 0; j < size; j++) {
      m[i][j] /= pivot;
      x[i][j] /= pivot;
    }
    for (let k = 0; k < size; k++) {
      if (k !== i) {
        const factor = m[k][i];
        for (let j = 0; j < size; j++) {
          m[k][j] -= factor * m[i][j];
          x[k][j] -= factor * x[i][j];
        }
      }
    }
  }
  return x;
};

export const prepareMultiSourceData = (datasets: Dataset[], target: { datasetId: string; col: string }, features: { datasetId: string; col: string }[], joinKey: string): any[] | null => {
  const targetDs = datasets.find(d => d.id === target.datasetId);
  if (!targetDs) return null;
  const featureDatasetIds = Array.from(new Set(features.map(f => f.datasetId)));
  const isMultiFile = featureDatasetIds.some(id => id !== target.datasetId);

  if (!isMultiFile) {
      return targetDs.data.map(row => {
          const newRow: any = { [target.col]: row[target.col] };
          features.forEach(f => {
              newRow[f.col] = row[f.col];
          });
          return newRow;
      });
  }

  if (!joinKey) return null;
  const featureMaps: Record<string, Map<string, any>> = {};
  featureDatasetIds.forEach(dsId => {
      if (dsId === target.datasetId) return;
      const ds = datasets.find(d => d.id === dsId);
      if (!ds) return;
      const map = new Map<string, any>();
      ds.data.forEach(row => {
          const key = String(row[joinKey]);
          if(key && key !== 'undefined') map.set(key, row);
      });
      featureMaps[dsId] = map;
  });

  const joinedRows: any[] = [];
  targetDs.data.forEach(row => {
      const keyVal = String(row[joinKey]);
      let isValid = true;
      const targetVal = row[target.col];
      if (typeof targetVal !== 'number' || targetVal === null) isValid = false;
      const flatRow: any = { [target.col]: targetVal };
      for (const feature of features) {
          let val;
          if (feature.datasetId === target.datasetId) {
              val = row[feature.col];
          } else {
              const otherRow = featureMaps[feature.datasetId]?.get(keyVal);
              if (!otherRow) { isValid = false; break; }
              val = otherRow[feature.col];
          }
          const numVal = Number(val);
          if (isNaN(numVal) || val === null || val === undefined || val === '') { 
              isValid = false; 
              break; 
          }
          flatRow[`${feature.datasetId}_${feature.col}`] = numVal;
      }
      if (isValid) joinedRows.push(flatRow);
  });
  return joinedRows;
};

export const trainRegressionModel = (data: any[], targetCol: string, featureKeys: string[]): RegressionModel | null => {
  try {
    if (data.length < featureKeys.length + 2) return null;
    const Y = data.map(row => [row[targetCol] as number]);
    const X = data.map(row => [1, ...featureKeys.map(f => row[f] as number)]);
    const XT = transpose(X);
    const XTX = multiply(XT, X);
    const XTX_Inv = invert(XTX);
    const XTY = multiply(XT, Y);
    const Beta = multiply(XTX_Inv, XTY);
    const intercept = Beta[0][0];
    const coefficients: Record<string, number> = {};
    featureKeys.forEach((f, i) => { coefficients[f] = Beta[i + 1][0]; });
    const predictions = data.map(row => {
      let yPred = intercept;
      featureKeys.forEach(f => { yPred += (row[f] as number) * coefficients[f]; });
      return { actual: row[targetCol] as number, predicted: yPred };
    });
    const yMean = predictions.reduce((sum, p) => sum + p.actual, 0) / predictions.length;
    const ssTotal = predictions.reduce((sum, p) => sum + Math.pow(p.actual - yMean, 2), 0);
    const ssRes = predictions.reduce((sum, p) => sum + Math.pow(p.actual - p.predicted, 2), 0);
    const rSquared = 1 - (ssRes / ssTotal);
    const mae = predictions.reduce((sum, p) => sum + Math.abs(p.actual - p.predicted), 0) / predictions.length;
    return {
      datasetId: 'mixed',
      targetColumn: targetCol,
      featureColumns: featureKeys,
      coefficients,
      intercept,
      rSquared,
      mae,
      predictionData: predictions
    };
  } catch (error) {
    console.error("Regression failed", error);
    return null;
  }
};

export const calculateCorrelationMatrix = (data: any[], columns: string[]): CorrelationMatrix | null => {
    if (data.length < 2 || columns.length < 2) return null;
    const matrix: number[][] = [];
    
    for (let i = 0; i < columns.length; i++) {
        const row: number[] = [];
        for (let j = 0; j < columns.length; j++) {
            if (i === j) {
                row.push(1);
            } else {
                const x = data.map(d => d[columns[i]]);
                const y = data.map(d => d[columns[j]]);
                const corr = calculatePearsonCorrelation(x, y) || 0;
                row.push(corr);
            }
        }
        matrix.push(row);
    }
    return { columns, matrix };
};

export const computeKMeans = (data: any[], xCol: string, yCol: string, k: number): ClusterResult | null => {
    // Basic K-Means Implementation
    const points = data.map(d => ({ 
        x: Number(d[xCol]), 
        y: Number(d[yCol]), 
        label: d.label 
    })).filter(p => !isNaN(p.x) && !isNaN(p.y));

    if (points.length < k) return null;

    // 1. Initialize Centroids (Randomly select k points)
    let centroids = points.slice(0, k).map(p => ({ x: p.x, y: p.y }));
    let clusters: { id: number; centroid: {x:number, y:number}; points: typeof points }[] = [];
    
    // Iterations
    for (let iter = 0; iter < 10; iter++) {
        // Reset clusters
        clusters = centroids.map((c, i) => ({ id: i, centroid: c, points: [] }));

        // 2. Assign points to nearest centroid
        points.forEach(p => {
            let minDist = Infinity;
            let closestIdx = 0;
            centroids.forEach((c, idx) => {
                const dist = Math.sqrt(Math.pow(p.x - c.x, 2) + Math.pow(p.y - c.y, 2));
                if (dist < minDist) {
                    minDist = dist;
                    closestIdx = idx;
                }
            });
            clusters[closestIdx].points.push(p);
        });

        // 3. Recompute Centroids
        let changed = false;
        centroids = clusters.map((cluster, idx) => {
            if (cluster.points.length === 0) return centroids[idx]; // Keep old if empty
            const sumX = cluster.points.reduce((s, p) => s + p.x, 0);
            const sumY = cluster.points.reduce((s, p) => s + p.y, 0);
            const newX = sumX / cluster.points.length;
            const newY = sumY / cluster.points.length;
            
            if (Math.abs(newX - centroids[idx].x) > 0.001 || Math.abs(newY - centroids[idx].y) > 0.001) {
                changed = true;
            }
            return { x: newX, y: newY };
        });

        if (!changed) break;
    }

    return { k, clusters, xAxis: xCol, yAxis: yCol };
};

export const computeForecast = (data: any[], dateCol: string, valueCol: string, periods: number = 3): ForecastResult | null => {
    // Convert to time series
    const series = data
        .map(d => ({ 
            date: d[dateCol], 
            ts: new Date(d[dateCol]).getTime(), 
            value: Number(d[valueCol]) 
        }))
        .filter(d => !isNaN(d.ts) && !isNaN(d.value))
        .sort((a, b) => a.ts - b.ts);

    if (series.length < 5) return null;

    // Simple Linear Trend (y = mx + b) using timestamps as x
    const x = series.map((_, i) => i); // Use index for equal spacing assumption
    const y = series.map(d => d.value);
    
    const n = x.length;
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((s, xi, i) => s + xi * y[i], 0);
    const sumX2 = x.reduce((s, xi) => s + xi * xi, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Generate Forecast
    const forecast: { date: string | number; value: number; lowerBound: number; upperBound: number }[] = [];
    const lastDate = new Date(series[series.length - 1].ts);
    
    // Estimate standard error for confidence intervals
    const predictedY = x.map(xi => slope * xi + intercept);
    const residuals = y.map((yi, i) => yi - predictedY[i]);
    const stdError = Math.sqrt(residuals.reduce((s, r) => s + r * r, 0) / (n - 2));

    for (let i = 1; i <= periods; i++) {
        const nextIdx = n - 1 + i;
        const nextVal = slope * nextIdx + intercept;
        
        // Basic increment: Month or Day?
        const nextDate = new Date(lastDate);
        nextDate.setDate(lastDate.getDate() + (30 * i)); // Assume monthly roughly

        forecast.push({
            date: nextDate.toISOString().split('T')[0],
            value: nextVal,
            lowerBound: nextVal - (1.96 * stdError), // 95% CI
            upperBound: nextVal + (1.96 * stdError)
        });
    }

    const growthRate = ((forecast[forecast.length - 1].value - series[series.length - 1].value) / series[series.length - 1].value);

    return {
        historical: series.map(s => ({ date: s.date as string, value: s.value })),
        forecast,
        trend: slope > 0 ? 'up' : slope < 0 ? 'down' : 'stable',
        growthRate
    };
};

export const joinDatasets = (datasetA: Dataset, datasetB: Dataset, keyA: string, keyB: string): { joinedData: any[], matchedCount: number } => {
    const mapB = new Map<string, any>();
    datasetB.data.forEach(row => {
        const key = String(row[keyB]).trim();
        if(key) mapB.set(key, row);
    });
    const joinedData: any[] = [];
    datasetA.data.forEach(rowA => {
        const keyVal = String(rowA[keyA]).trim();
        if (mapB.has(keyVal)) {
            const rowB = mapB.get(keyVal);
            const merged: any = { ...rowA };
            Object.keys(rowB).forEach(k => {
                if (k !== keyB) { merged[`${datasetB.name}_${k}`] = rowB[k]; }
            });
            joinedData.push(merged);
        }
    });
    return { joinedData, matchedCount: joinedData.length };
};

export const unionDatasets = (datasets: Dataset[], newColumnName: string, mappings: Record<string, string>): { joinedData: any[], matchedCount: number } => {
    let joinedData: any[] = [];
    let totalCount = 0;
    datasets.forEach(ds => {
        const valueForColumn = mappings[ds.id] || ds.name;
        const modifiedData = ds.data.map(row => ({ ...row, [newColumnName]: valueForColumn }));
        joinedData = [...joinedData, ...modifiedData];
        totalCount += modifiedData.length;
    });
    return { joinedData, matchedCount: totalCount };
};

export const applyTransformation = (data: PatientRecord[], transformation: TransformationSuggestion): PatientRecord[] => {
    return data.map(row => {
        const newRow = { ...row };
        const val = newRow[transformation.targetColumn];
        
        if (transformation.action === 'math' && transformation.parameters?.expression) {
             // Safe execution of math expressions without eval
             // Supports basic column ops like "colA + colB"
             try {
                 const expr = transformation.parameters.expression;
                 // Replace "row['col']" or "col" with actual values
                 // This is a simplified parser for demonstration.
                 // Ideally use a math library like math.js
                 // Here we assume expression is like "row['A'] + 10" and use Function safely-ish
                 const func = new Function('row', `return ${expr}`);
                 const res = func(row);
                 newRow[transformation.targetColumn] = res;
             } catch(e) { 
                 console.warn("Math transform error", e);
             }
        }
        else if (transformation.action === 'map' && transformation.parameters) {
             const key = String(val);
             if (transformation.parameters[key] !== undefined) {
                 newRow[`${transformation.targetColumn}_encoded`] = transformation.parameters[key];
             }
        }
        else if (transformation.action === 'uppercase' && typeof val === 'string') {
             newRow[transformation.targetColumn] = val.toUpperCase();
        }
        else if (transformation.action === 'to_numeric') {
             const num = Number(val);
             newRow[`${transformation.targetColumn}_num`] = isNaN(num) ? null : num;
        }
        else if (transformation.action === 'extract_year') {
             const date = new Date(String(val));
             if (!isNaN(date.getTime())) {
                 newRow[`${transformation.targetColumn}_year`] = date.getFullYear();
             }
        }
        return newRow;
    });
};

export const generateDemoData = (): string => {
  const regions = ['North', 'South', 'East', 'West'];
  const categories = ['Electronics', 'Furniture', 'Clothing', 'Office Supplies'];
  const products = ['Laptop', 'Chair', 'Desk', 'Monitor', 'T-Shirt', 'Jacket', 'Pen Set', 'Notebook'];
  const segments = ['Consumer', 'Corporate', 'Home Office'];
  const statuses = ['Delivered', 'Shipped', 'Pending', 'Returned'];
  let csvContent = "order_date,region,category,product_name,customer_segment,sales_amount,quantity,profit,status\n";
  for (let i = 0; i < 200; i++) {
    const date = new Date(2023, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1).toISOString().split('T')[0];
    const region = regions[Math.floor(Math.random() * regions.length)];
    const category = categories[Math.floor(Math.random() * categories.length)];
    const product = products[Math.floor(Math.random() * products.length)];
    const segment = segments[Math.floor(Math.random() * segments.length)];
    const sales = Math.floor(Math.random() * 500) + 20;
    const quantity = Math.floor(Math.random() * 10) + 1;
    const profit = Math.floor(sales * (Math.random() * 0.4 - 0.1));
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    csvContent += `${date},${region},${category},${product},${segment},${sales},${quantity},${profit},${status}\n`;
  }
  return csvContent;
};
