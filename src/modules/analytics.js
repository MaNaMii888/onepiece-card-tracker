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
