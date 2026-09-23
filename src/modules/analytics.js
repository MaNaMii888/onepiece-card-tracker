/**
 * Portfolio Analytics & Monthly Performance Charting Module
 * Powered by Chart.js
 */

const THAI_MONTH_NAMES = [
  'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
];

let performanceChartInstance = null;

export function formatMonthLabel(yearMonthKey) {
  if (!yearMonthKey || !yearMonthKey.includes('-')) return yearMonthKey;
  const segments = yearMonthKey.split('-');
  const monthIndex = parseInt(segments[1], 10) - 1;
  const shortYear = segments[0].slice(-2);
  const thaiMonth = THAI_MONTH_NAMES[monthIndex] || segments[1];
  return `${thaiMonth} ${shortYear}`;
}

export function aggregateMonthlyMetrics(cardRecords, monthLimit = 6) {
  const monthlyBuckets = new Map();

  cardRecords.forEach(singleCard => {
    const transactionDate = singleCard.sellDate || singleCard.buyDate;
    if (!transactionDate) return;

    const monthKey = String(transactionDate).slice(0, 7);
    if (monthKey.length !== 7) return;

    if (!monthlyBuckets.has(monthKey)) {
      monthlyBuckets.set(monthKey, { costSum: 0, salesSum: 0, count: 0 });
    }

    const bucketRecord = monthlyBuckets.get(monthKey);
    bucketRecord.costSum += Number(singleCard.buyPrice) || 0;
    bucketRecord.salesSum += Number(singleCard.sellPrice) || 0;
    bucketRecord.count += 1;
  });

  const sortedMonthKeys = Array.from(monthlyBuckets.keys()).sort();
  const targetedKeys = monthLimit > 0 ? sortedMonthKeys.slice(-monthLimit) : sortedMonthKeys;

  const monthLabels = targetedKeys.map(key => formatMonthLabel(key));
  const costSeries = targetedKeys.map(key => monthlyBuckets.get(key).costSum);
  const salesSeries = targetedKeys.map(key => monthlyBuckets.get(key).salesSum);
  const profitSeries = targetedKeys.map(key => {
    const bucket = monthlyBuckets.get(key);
    return bucket.salesSum - bucket.costSum;
  });

  return {
    labels: monthLabels,
    costSeries: costSeries,
    salesSeries: salesSeries,
    profitSeries: profitSeries
  };
}

export function renderPerformanceComboChart(canvasElement, performanceMetrics) {
  if (!canvasElement || typeof Chart === 'undefined') return;

  if (performanceChartInstance) {
    performanceChartInstance.destroy();
  }

  const chartConfiguration = {
    type: 'bar',
    data: {
      labels: performanceMetrics.labels,
      datasets: [
        {
          type: 'line',
          label: 'กำไรสุทธิ (฿)',
          data: performanceMetrics.profitSeries,
          borderColor: '#10B981',
          backgroundColor: 'rgba(16, 185, 129, 0.2)',
          borderWidth: 3,
          tension: 0.35,
          pointRadius: 5,
          pointHoverRadius: 7,
          pointBackgroundColor: '#10B981',
          pointBorderColor: '#0B132B',
          pointBorderWidth: 2,
          yAxisID: 'y'
        },
        {
          type: 'bar',
          label: 'ยอดขายรวม (฿)',
          data: performanceMetrics.salesSeries,
          backgroundColor: 'rgba(0, 240, 255, 0.75)',
          borderRadius: 6,
          barPercentage: 0.65,
          yAxisID: 'y'
        },
        {
          type: 'bar',
          label: 'ต้นทุนรวม (฿)',
          data: performanceMetrics.costSeries,
          backgroundColor: 'rgba(245, 158, 11, 0.75)',
          borderRadius: 6,
          barPercentage: 0.65,
          yAxisID: 'y'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false
      },
      plugins: {
        legend: {
          labels: {
            color: '#94A3B8',
            font: { family: 'Prompt', size: 12, weight: '500' },
            boxWidth: 14,
            usePointStyle: true
          }
        },
        tooltip: {
          backgroundColor: '#0B132B',
          borderColor: '#3A506B',
          borderWidth: 1,
          titleColor: '#F8FAFC',
          bodyColor: '#CBD5E1',
          titleFont: { family: 'Prompt', size: 13, weight: 'bold' },
          bodyFont: { family: 'Prompt', size: 12 },
          padding: 12,
          callbacks: {
            label: function(tooltipContext) {
              const seriesLabel = tooltipContext.dataset.label || '';
              const valueNum = Number(tooltipContext.parsed.y || 0).toLocaleString('th-TH');
              return ` ${seriesLabel}: ฿${valueNum}`;
            }
          }
        }
      },
      scales: {
        x: {
          grid: { color: 'rgba(51, 65, 85, 0.25)' },
          ticks: { color: '#94A3B8', font: { family: 'Prompt', size: 11 } }
        },
        y: {
          grid: { color: 'rgba(51, 65, 85, 0.35)' },
          ticks: {
            color: '#94A3B8',
            font: { family: 'Prompt', size: 11 },
            callback: function(numericValue) {
              return '฿' + Number(numericValue).toLocaleString('th-TH');
            }
          }
        }
      }
    }
  };

  performanceChartInstance = new Chart(canvasElement, chartConfiguration);
}

let allocationDonutInstance = null;

const ALLOCATION_PALETTE = [
  '#00F0FF',
  '#10B981',
  '#F59E0B',
  '#8B5CF6',
  '#EC4899',
  '#64748B'
];

export function aggregateSetDistribution(cardRecords, maxLimit = 5) {
  const setBuckets = new Map();

  cardRecords.forEach(singleCard => {
    const rawSetName = singleCard.cardSet ? singleCard.cardSet.trim() : '';
    const groupKey = rawSetName.length > 0 ? rawSetName : 'ไม่ระบุชุด';
    const cardCost = Number(singleCard.buyPrice) || 0;

    if (!setBuckets.has(groupKey)) {
      setBuckets.set(groupKey, { totalCost: 0, cardCount: 0 });
    }

    const bucketEntry = setBuckets.get(groupKey);
    bucketEntry.totalCost += cardCost;
    bucketEntry.cardCount += 1;
  });

  const sortedSetEntries = Array.from(setBuckets.entries())
    .sort((entryA, entryB) => entryB[1].totalCost - entryA[1].totalCost);

  if (sortedSetEntries.length <= maxLimit) {
    return {
      labels: sortedSetEntries.map(entry => entry[0]),
      costValues: sortedSetEntries.map(entry => entry[1].totalCost),
      cardCounts: sortedSetEntries.map(entry => entry[1].cardCount)
    };
  }

  const primaryEntries = sortedSetEntries.slice(0, maxLimit);
  const remainderEntries = sortedSetEntries.slice(maxLimit);

  let remainderCostSum = 0;
  let remainderCountSum = 0;
  remainderEntries.forEach(entry => {
    remainderCostSum += entry[1].totalCost;
    remainderCountSum += entry[1].cardCount;
  });

  const finalLabels = primaryEntries.map(entry => entry[0]).concat(['ชุดอื่นๆ']);
  const finalCostValues = primaryEntries.map(entry => entry[1].totalCost).concat([remainderCostSum]);
  const finalCardCounts = primaryEntries.map(entry => entry[1].cardCount).concat([remainderCountSum]);

  return {
    labels: finalLabels,
    costValues: finalCostValues,
    cardCounts: finalCardCounts
  };
}

export function renderAllocationDonutChart(canvasElement, allocationMetrics) {
  if (!canvasElement || typeof Chart === 'undefined') return;

  if (allocationDonutInstance) {
    allocationDonutInstance.destroy();
  }

  const hasCapital = allocationMetrics.costValues.some(costNumber => costNumber > 0);
  const displayValues = hasCapital ? allocationMetrics.costValues : [1];
  const displayLabels = hasCapital ? allocationMetrics.labels : ['ไม่มีข้อมูลต้นทุน'];
  const displayPalette = hasCapital ? ALLOCATION_PALETTE.slice(0, displayLabels.length) : ['#334155'];

  const chartConfiguration = {
    type: 'doughnut',
    data: {
      labels: displayLabels,
      datasets: [
        {
          data: displayValues,
          backgroundColor: displayPalette,
          borderColor: '#1C2541',
          borderWidth: 2,
          hoverOffset: 6
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '70%',
      plugins: {
        legend: {
          position: 'right',
          labels: {
            color: '#94A3B8',
            font: { family: 'Prompt', size: 11, weight: '500' },
            boxWidth: 12,
            usePointStyle: true
          }
        },
        tooltip: {
          backgroundColor: '#0B132B',
          borderColor: '#3A506B',
          borderWidth: 1,
          titleColor: '#F8FAFC',
          bodyColor: '#CBD5E1',
          titleFont: { family: 'Prompt', size: 12, weight: 'bold' },
          bodyFont: { family: 'Prompt', size: 11 },
          padding: 10,
          callbacks: {
            label: function(tooltipContext) {
              const setLabel = tooltipContext.label || '';
              const costAmount = Number(tooltipContext.parsed || 0);
              const totalSum = tooltipContext.dataset.data.reduce((acc, curr) => acc + curr, 0);
              const percentage = totalSum > 0 ? ((costAmount / totalSum) * 100).toFixed(1) : '0';
              return ` ${setLabel}: ฿${costAmount.toLocaleString('th-TH')} (${percentage}%)`;
            }
          }
        }
      }
    }
  };

  allocationDonutInstance = new Chart(canvasElement, chartConfiguration);
}
