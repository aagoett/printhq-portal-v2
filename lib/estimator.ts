export type Press = {
  id: string;
  name: string;
  type: 'digital' | 'offset' | string;
  impressions_per_hour: number;
  max_sheet_width?: number | null;
  max_sheet_height?: number | null;
  setup_minutes?: number | null;
  makeready_waste_sheets?: number | null;
  hourly_rate?: number | null;
  click_rate?: number | null;
};

export type Stock = {
  id: string;
  name: string;
  sheet_width?: number | null;
  sheet_height?: number | null;
  basis_weight?: number | null;
  cost_per_sheet?: number | null;
  price_per_sheet?: number | null;
};

export type FinishingOp = {
  id: string;
  name: string;
  setup_minutes?: number | null;
  run_minutes_per_thousand?: number | null;
  cost_per_hour?: number | null;
  price_per_hour?: number | null;
};

export type Markup = {
  id: string;
  name: string;
  percent: number;
  applies_to?: string | null;
};

export type ProductTemplate = {
  id: string;
  name: string;
  finished_width?: number | null;
  finished_height?: number | null;
  pages?: number | null;
  default_press_id?: string | null;
  default_stock_id?: string | null;
  default_markup_id?: string | null;
  finishing_op_ids?: string[] | null;
  waste_percent?: number | null;
  setup_waste_sheets?: number | null;
};

export type EstimateInput = {
  quantity: number;
  template: ProductTemplate;
  press: Press;
  stock: Stock;
  finishingOps: FinishingOp[];
  markup: Markup | null;
};

export type EstimateBreakdown = {
  label: string;
  cost: number;
  price: number;
  detail?: string;
};

export type EstimateResult = {
  quantity: number;
  sheets: number;
  pressHours: number;
  stockCost: number;
  pressCost: number;
  finishingCost: number;
  markupAmount: number;
  totalCost: number;
  totalPrice: number;
  breakdown: EstimateBreakdown[];
};

function safeNum(value?: number | null, fallback = 0) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return fallback;
  return Number(value);
}

export function calculateNUp(sheetW = 0, sheetH = 0, finishW = 0, finishH = 0) {
  if (!sheetW || !sheetH || !finishW || !finishH) return 1;
  const fitNormal = Math.floor(sheetW / finishW) * Math.floor(sheetH / finishH);
  const fitRotated = Math.floor(sheetW / finishH) * Math.floor(sheetH / finishW);
  return Math.max(fitNormal, fitRotated, 1);
}

export function calculateEstimate(input: EstimateInput): EstimateResult {
  const { quantity, template, press, stock, finishingOps, markup } = input;

  const finishW = safeNum(template.finished_width, 0);
  const finishH = safeNum(template.finished_height, 0);
  const sheetW = safeNum(stock.sheet_width, finishW);
  const sheetH = safeNum(stock.sheet_height, finishH);

  const nUp = calculateNUp(sheetW, sheetH, finishW, finishH);
  const baseSheets = Math.ceil(quantity / nUp);

  const wastePercent = safeNum(template.waste_percent, 5) / 100;
  const setupWaste = safeNum(template.setup_waste_sheets, 50) + safeNum(press.makeready_waste_sheets, 0);
  const wasteSheets = Math.ceil(baseSheets * wastePercent) + setupWaste;
  const totalSheets = baseSheets + wasteSheets;

  const stockCostPer = safeNum(stock.cost_per_sheet, 0);
  const stockPricePer = safeNum(stock.price_per_sheet, stockCostPer * 1.3);
  const stockCost = totalSheets * stockCostPer;
  const stockPrice = totalSheets * stockPricePer;

  const impressionsPerHour = safeNum(press.impressions_per_hour, 8000);
  const setupMinutes = safeNum(press.setup_minutes, 20);
  const pressHours = setupMinutes / 60 + totalSheets / impressionsPerHour;

  const clickRate = safeNum(press.click_rate, 0);
  const pressHourlyRate = safeNum(press.hourly_rate, 200);

  let pressCost = 0;
  if (press.type === 'digital' && clickRate > 0) {
    pressCost = totalSheets * clickRate;
  } else {
    pressCost = pressHours * pressHourlyRate;
  }
  const pressPrice = pressCost * 1.35; // simple uplift if no explicit price fields

  let finishingCost = 0;
  let finishingPrice = 0;
  const finishingBreakdown: EstimateBreakdown[] = [];
  finishingOps.forEach((op) => {
    const setupHr = safeNum(op.setup_minutes, 0) / 60;
    const runHr = (safeNum(op.run_minutes_per_thousand, 0) / 60) * (quantity / 1000);
    const hours = setupHr + runHr;
    const cost = hours * safeNum(op.cost_per_hour, 70);
    const price = hours * safeNum(op.price_per_hour, 110);
    finishingCost += cost;
    finishingPrice += price;
    finishingBreakdown.push({
      label: op.name,
      cost,
      price,
      detail: `${hours.toFixed(2)} hrs`
    });
  });

  const totalCost = stockCost + pressCost + finishingCost;
  const preMarkupPrice = stockPrice + pressPrice + finishingPrice;
  const markupPercent = safeNum(markup?.percent, 0) / 100;
  const markupAmount = preMarkupPrice * markupPercent;
  const totalPrice = preMarkupPrice + markupAmount;

  const breakdown: EstimateBreakdown[] = [
    { label: 'Stock', cost: stockCost, price: stockPrice, detail: `${totalSheets} sheets (${nUp}-up)` },
    { label: 'Press', cost: pressCost, price: pressPrice, detail: `${pressHours.toFixed(2)} hrs` },
    ...finishingBreakdown,
  ];
  if (markupPercent) {
    breakdown.push({ label: markup?.name || 'Markup', cost: 0, price: markupAmount, detail: `${(markupPercent * 100).toFixed(1)}%` });
  }

  return {
    quantity,
    sheets: totalSheets,
    pressHours,
    stockCost,
    pressCost,
    finishingCost,
    markupAmount,
    totalCost,
    totalPrice,
    breakdown,
  };
}

export function estimateQuantities(input: Omit<EstimateInput, 'quantity'>, quantities: number[]): EstimateResult[] {
  return quantities.map((q) => calculateEstimate({ ...input, quantity: q }));
}
