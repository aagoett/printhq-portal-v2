import { applyOverridesToList, CustomerPricingOverride } from '@/utils/pricing';

export type PricingComponent = {
  id: string;
  name: string;
  type?: string;
  price_amount?: number | null;
  cost_amount?: number | null;
  parent_sheet_width?: number;
  parent_sheet_height?: number;
  max_sheet_width?: number;
  cost_unit?: string;
  setup_minutes?: number;
  run_speed_per_hour?: number;
  sku?: string | null;
  brand?: string | null;
  weight?: number | null;
  caliper?: number | null;
  price_unit?: string | null;
  price_override?: number | null;
};

export type PricingProfileKey = 'wholesale' | 'competitive' | 'retail';
export const PRICING_PROFILES: Record<PricingProfileKey, number> = {
  wholesale: 0.88, // lean margin for trade partners
  competitive: 1, // default house pricing
  retail: 1.15, // walk-in / retail lift
};

export type EstimatorInputs = {
  finishW: number;
  finishH: number;
  qtyList: number[];
  selectedPaperId?: string;
  selectedPaperIds?: string[];
  selectedFinishingIds?: string[];
  selectedMailingId?: string | null;
  templateKey?: string;
  pricingProfile?: PricingProfileKey;
  bleed?: number;
  gutter?: number;
};

export type Proposal = {
  quantity: number;
  winner: RouteOption;
  routes: RouteOption[];
};

export type RouteOption = {
  paperId?: string;
  paperSku?: string | null;
  paperBrand?: string | null;
  paperWeight?: number | null;
  paperCaliper?: number | null;
  method: string;
  pricingProfile?: PricingProfileKey;
  profileFactor?: number;
  sheet: string;
  nUp: number;
  totalSheets: number;
  sheetsNeeded: number;
  overs: number;
  usableSheet: string;
  paperName: string;
  paperPrice: number;
  paperCost: number;
  pressPrice: number;
  pressCost: number;
  finishingPrice: number;
  finishingCost: number;
  mailingPrice: number;
  mailingCost: number;
  mailingName?: string | null;
  totalPrice: number;
  totalCost: number;
  unitCost: number;
  detail: string;
  finishingDetail?: string;
  mailingDetail?: string;
  breakdown?: { name: string; cost: number; price: number; detail: string }[];
  basePrice?: number;
  baseUnitPrice?: number;
  paperUsesOverride?: boolean;
  paperPriceBase?: number;
  pressPriceBase?: number;
  finishingPriceBase?: number;
  mailingPriceBase?: number;
};

export type EstimatorContext = {
  papers: PricingComponent[];
  presses: PricingComponent[];
  finishing: PricingComponent[];
  mailing: PricingComponent[];
  overrides?: CustomerPricingOverride[];
};

const OVERAGE_PCT = 0.05;
const MIN_OVERS = 50;
const DEFAULT_BLEED = 0.125;
const DEFAULT_GUTTER = 0.125;
const DIGITAL_RATE_PER_SIDE = 0.05;
const DIGITAL_MIN_PRICE = 25;
const DIGITAL_USABLE_W = 13;
const DIGITAL_USABLE_H = 19;
const OFFSET_SETUP_PRICE = 350;
const OFFSET_MAKE_READY_MIN = 350;
const OFFSET_RUN_RATE = 550;
const OFFSET_SPEED = 7000;
const OFFSET_COST_FACTOR = 0.6; // assume 40% gross margin
const DIGITAL_COST_FACTOR = 0.7;
const SANITY_UNIT_PRICE_THRESHOLD = 2; // flag if above $2 each

const applyOverrides = (
  list: PricingComponent[],
  overrides: CustomerPricingOverride[] | undefined,
  templateKey: string | undefined,
  componentType: string
) => applyOverridesToList(list, overrides || [], { templateKey, componentType });

const normalizePaper = (paper: PricingComponent) => {
  const needsPerThousand =
    paper.cost_unit === 'per_1000' || (paper.price_override ?? paper.price_amount ?? 0) > 1 || (paper.cost_amount || 0) > 1;
  const divisor = needsPerThousand ? 1000 : 1;
  return {
    ...paper,
    price_amount: (paper.price_amount || 0) / divisor,
    price_override: paper.price_override != null ? paper.price_override / divisor : paper.price_override,
    cost_amount: (paper.cost_amount || 0) / divisor,
    cost_unit: needsPerThousand ? 'per_1000' : paper.cost_unit || 'per_sheet',
    price_unit: paper.price_unit || (needsPerThousand ? 'per_1000' : 'per_sheet'),
  };
};

const normalizePress = (press: PricingComponent) => {
  const isDigital = press.type === 'press_digital';
  const needsPerThousand = press.cost_unit === 'per_1000' || (isDigital && (press.price_amount || 0) > 5);
  const divisor = needsPerThousand ? 1000 : 1;
  return {
    ...press,
    price_amount: (press.price_amount || 0) / divisor,
    cost_amount: (press.cost_amount || 0) / divisor,
    cost_unit: needsPerThousand ? 'per_1000' : press.cost_unit || (isDigital ? 'per_sheet' : 'per_hour'),
  };
};

const ensureDefaults = (presses: PricingComponent[]) => {
  const hasOffset = presses.some((p) => p.type === 'press_offset');
  const hasDigital = presses.some((p) => p.type === 'press_digital');
  const next = [...presses];

  if (!hasOffset) {
    next.push({
      id: 'fallback-offset',
      name: 'RMGT Offset',
      type: 'press_offset',
      price_amount: OFFSET_RUN_RATE,
      cost_amount: OFFSET_RUN_RATE * OFFSET_COST_FACTOR,
      run_speed_per_hour: OFFSET_SPEED,
      setup_minutes: 0,
      cost_unit: 'per_hour',
    } as PricingComponent);
  }

  if (!hasDigital) {
    next.push({
      id: 'fallback-digital',
      name: 'Digital Press',
      type: 'press_digital',
      price_amount: DIGITAL_RATE_PER_SIDE * 2, // assume 2-sided
      cost_amount: DIGITAL_RATE_PER_SIDE * 2 * DIGITAL_COST_FACTOR,
      cost_unit: 'per_sheet',
      max_sheet_width: DIGITAL_USABLE_W,
    } as PricingComponent);
  }

  return next;
};

const calculateNUpWithBleed = (
  sheetW: number,
  sheetH: number,
  finishW: number,
  finishH: number,
  bleed: number,
  gutter: number
) => {
  const pieceW = finishW + bleed * 2;
  const pieceH = finishH + bleed * 2;
  const across = Math.floor((sheetW + gutter) / (pieceW + gutter));
  const down = Math.floor((sheetH + gutter) / (pieceH + gutter));

  const acrossRot = Math.floor((sheetW + gutter) / (pieceH + gutter));
  const downRot = Math.floor((sheetH + gutter) / (pieceW + gutter));

  return Math.max(across * down, acrossRot * downRot);
};

export function applyPricingProfileToRoute(
  route: RouteOption,
  profile: PricingProfileKey,
  quantity?: number
): RouteOption {
  const factor = PRICING_PROFILES[profile] ?? 1;
  const qty = quantity || (route as any).quantity || 1;

  const basePaper = (route as any).paperPriceBase ?? route.paperPrice ?? 0;
  const basePress = (route as any).pressPriceBase ?? route.pressPrice ?? 0;
  const baseFinishing = (route as any).finishingPriceBase ?? route.finishingPrice ?? 0;
  const baseMailing = (route as any).mailingPriceBase ?? route.mailingPrice ?? 0;
  const paperUsesOverride = Boolean((route as any).paperUsesOverride);

  const paperPrice = paperUsesOverride ? basePaper : basePaper * factor;
  const pressPrice = basePress * factor;
  const finishingPrice = baseFinishing * factor;
  const mailingPrice = baseMailing * factor;
  const totalPrice = paperPrice + pressPrice + finishingPrice + mailingPrice;
  const basePrice = (route as any).basePrice ?? basePaper + basePress + baseFinishing + baseMailing;

  const profiledBreakdown = route.breakdown?.map((b) => {
    const base = (b as any).basePrice ?? b.price ?? 0;
    const isPaper = (b.name || '').toLowerCase() === 'paper';
    const price = isPaper && paperUsesOverride ? base : base * factor;
    return { ...b, price };
  });

  return {
    ...route,
    pricingProfile: profile,
    profileFactor: factor,
    basePrice,
    baseUnitPrice: route.baseUnitPrice ?? basePrice / qty,
    paperPrice,
    pressPrice,
    finishingPrice,
    mailingPrice,
    totalPrice,
    unitCost: totalPrice / qty,
    breakdown: profiledBreakdown,
  };
}

export function calculateProposals(
  inputs: EstimatorInputs,
  context: EstimatorContext
): Proposal[] {
  const {
    finishW,
    finishH,
    qtyList,
    selectedPaperId,
    selectedPaperIds,
    selectedFinishingIds = [],
    selectedMailingId = null,
    templateKey,
    pricingProfile,
    bleed = DEFAULT_BLEED,
    gutter = DEFAULT_GUTTER,
  } = inputs;
  const { papers, presses, finishing, mailing, overrides } = context;

  if (!finishW || !finishH || qtyList.length === 0) return [];

  const paperOptions = applyOverrides(papers, overrides, templateKey, 'paper').map(normalizePaper);
  const pressOptions = ensureDefaults(applyOverrides(presses, overrides, templateKey, 'press').map(normalizePress));
  const finishingOptions = applyOverrides(finishing, overrides, templateKey, 'finishing');
  const mailingOptions = applyOverrides(mailing, overrides, templateKey, 'mailing');

  const paperCandidates = (() => {
    if (selectedPaperIds && selectedPaperIds.length > 0) return paperOptions.filter((p) => selectedPaperIds.includes(p.id));
    if (selectedPaperId) {
      const found = paperOptions.find((p) => p.id === selectedPaperId);
      return found ? [found] : [];
    }
    return paperOptions;
  })();

  if (paperCandidates.length === 0) return [];

  const proposals: Proposal[] = [];

  qtyList.forEach((quantity) => {
    if (!quantity || quantity <= 0) return;

    let best: RouteOption | null = null;
    const routes: RouteOption[] = [];

    const selectedFinishes = finishingOptions.filter((f) => selectedFinishingIds.includes(f.id));
    const finishingDetail = selectedFinishes.map((f) => f.name).join(', ') || 'None';

    paperCandidates.forEach((paper) => {
      const sheetW = paper.parent_sheet_width || DIGITAL_USABLE_W;
      const sheetH = paper.parent_sheet_height || DIGITAL_USABLE_H;

      pressOptions.forEach((press) => {
        const isDigital = press.type === 'press_digital';
        const maxWidth = (press as any).max_sheet_width || press.parent_sheet_width;

        let usableW = sheetW;
        let usableH = sheetH;

        if (maxWidth) {
          usableW = Math.min(usableW, maxWidth);
        }

        if (isDigital) {
          usableW = Math.min(usableW, DIGITAL_USABLE_W);
          usableH = Math.min(usableH, DIGITAL_USABLE_H);
        }

        const nUp = calculateNUpWithBleed(usableW, usableH, finishW, finishH, bleed, gutter);
        if (nUp === 0) return;

        const sheetsNeeded = Math.ceil(quantity / nUp);
        const overs = Math.max(Math.ceil(sheetsNeeded * OVERAGE_PCT), MIN_OVERS);
        const sheetsWithWaste = sheetsNeeded + overs;
        const hasExplicitPrice = paper.price_override != null || paper.price_amount != null;
        const paperSellRate = hasExplicitPrice ? (paper.price_override ?? paper.price_amount ?? 0) : (paper.cost_amount || 0);
        const paperUsesOverride = hasExplicitPrice;
        const paperCost = sheetsWithWaste * (paper.cost_amount || 0);
        const paperPriceBase = sheetsWithWaste * paperSellRate;

        const finishingCost = selectedFinishes.reduce((acc, f) => {
          const unit = f.cost_unit || 'flat';
          if (unit === 'per_sheet') return acc + sheetsWithWaste * (f.cost_amount || 0);
          if (unit === 'per_1000') return acc + (sheetsWithWaste / 1000) * (f.cost_amount || 0);
          if (unit === 'per_item' || unit === 'per_piece') return acc + quantity * (f.cost_amount || 0);
          return acc + (f.cost_amount || 0);
        }, 0);
        const finishingPrice = selectedFinishes.reduce((acc, f) => {
          if (f.price_amount === undefined) return acc;
          const unit = f.cost_unit || 'flat';
          if (unit === 'per_sheet') return acc + sheetsWithWaste * (f.price_amount || 0);
          if (unit === 'per_1000') return acc + (sheetsWithWaste / 1000) * (f.price_amount || 0);
          if (unit === 'per_item' || unit === 'per_piece') return acc + quantity * (f.price_amount || 0);
          return acc + (f.price_amount || 0);
        }, 0);

        let mailingCost = 0;
        let mailingPrice = 0;
        let mailDetail = '';
        let mailingName: string | null = null;
        if (selectedMailingId) {
          const mail = mailingOptions.find((m) => m.id === selectedMailingId);
          if (mail) {
            const unit = mail.cost_unit || 'flat';
            if (unit === 'per_piece' || unit === 'per_item') {
              mailingCost = quantity * (mail.cost_amount || 0);
              mailingPrice = quantity * (mail.price_amount || 0);
              mailDetail = `${mail.name} • ${quantity} pieces`;
            } else if (unit === 'per_1000') {
              mailingCost = (quantity / 1000) * (mail.cost_amount || 0);
              mailingPrice = (quantity / 1000) * (mail.price_amount || 0);
              mailDetail = `${mail.name} • per M`;
            } else if (unit === 'per_sheet') {
              mailingCost = sheetsWithWaste * (mail.cost_amount || 0);
              mailingPrice = sheetsWithWaste * (mail.price_amount || 0);
              mailDetail = `${mail.name} • by sheet`;
            } else {
              mailingCost = mail.cost_amount || 0;
              mailingPrice = mail.price_amount || 0;
              mailDetail = `${mail.name} • flat`;
            }
            mailingName = mail.name;
          }
        }

        let pressCost = 0;
        let pressPrice = 0;
        let detail = '';

        if (press.type === 'press_digital') {
          const ratePerSheet = press.price_amount || DIGITAL_RATE_PER_SIDE * 2; // assume duplex
          const costRate = press.cost_amount || ratePerSheet * DIGITAL_COST_FACTOR;
          pressPrice = Math.max(DIGITAL_MIN_PRICE, sheetsWithWaste * ratePerSheet);
          pressCost = Math.max(DIGITAL_MIN_PRICE * 0.5, sheetsWithWaste * costRate);
          detail = `Digital • ${nUp}-up • ${sheetsWithWaste} sheets (includes ${overs} overs) @ $${ratePerSheet.toFixed(4)}/sht`;
        } else {
          const speed = press.run_speed_per_hour || OFFSET_SPEED;
          const runRatePrice = press.price_amount && press.price_amount > 0 ? press.price_amount : OFFSET_RUN_RATE;
          const runRateCost = press.cost_amount && press.cost_amount > 0 ? press.cost_amount : runRatePrice * OFFSET_COST_FACTOR;
          const setupPrice = press.setup_minutes && press.setup_minutes > 0 ? (press.setup_minutes / 60) * runRatePrice : OFFSET_SETUP_PRICE;
          const setupCost = press.setup_minutes && press.setup_minutes > 0 ? (press.setup_minutes / 60) * runRateCost : OFFSET_SETUP_PRICE * OFFSET_COST_FACTOR;

          const runHr = sheetsWithWaste / speed;
          pressPrice = Math.max(OFFSET_MAKE_READY_MIN, setupPrice + runHr * runRatePrice);
          pressCost = setupCost + runHr * runRateCost;
          detail = `Offset • ${nUp}-up • ${sheetsWithWaste} sheets (includes ${overs} overs) • ${runHr.toFixed(2)} hrs @ $${runRatePrice}/hr`;
        }

        const totalCost = paperCost + pressCost + finishingCost + mailingCost;
        const basePrice = paperPriceBase + pressPrice + finishingPrice + mailingPrice;
        const totalPrice = basePrice;
        const safeDetail = totalPrice / quantity > SANITY_UNIT_PRICE_THRESHOLD ? `${detail} • check pricing (> $${SANITY_UNIT_PRICE_THRESHOLD.toFixed(2)}/ea)` : detail;

        const breakdown = [
          { name: 'Paper', cost: paperCost, price: paperPriceBase, detail: `${sheetsWithWaste} sheets (${sheetsNeeded} + ${overs} overs)`, basePrice: paperPriceBase },
          { name: 'Press', cost: pressCost, price: pressPrice, detail: safeDetail, basePrice: pressPrice },
          { name: 'Finishing', cost: finishingCost, price: finishingPrice, detail: finishingDetail || 'None', basePrice: finishingPrice },
          { name: 'Mailing', cost: mailingCost, price: mailingPrice, detail: mailDetail || 'None', basePrice: mailingPrice },
        ];

        let candidate: RouteOption = {
          paperId: paper.id,
          paperSku: paper.sku || null,
          paperBrand: paper.brand || null,
          paperWeight: paper.weight ?? null,
          paperCaliper: paper.caliper ?? null,
          method: press.name,
          sheet: `${paper.parent_sheet_width || sheetW}x${paper.parent_sheet_height || sheetH}`,
          usableSheet: `${usableW.toFixed(2)}x${usableH.toFixed(2)}`,
          nUp,
          totalSheets: sheetsWithWaste,
          sheetsNeeded,
          overs,
          paperName: paper.name,
          paperPrice: paperPriceBase,
          paperCost,
          pressPrice,
          pressCost,
          finishingPrice,
          finishingCost,
          mailingPrice,
          mailingCost,
          mailingName,
          totalPrice,
          totalCost,
          unitCost: totalPrice / quantity,
          detail: safeDetail,
          finishingDetail,
          mailingDetail: mailDetail || 'None',
          breakdown,
          basePrice,
          baseUnitPrice: basePrice / quantity,
          paperUsesOverride,
          paperPriceBase,
          pressPriceBase: pressPrice,
          finishingPriceBase: finishingPrice,
          mailingPriceBase: mailingPrice,
        };

        if (pricingProfile) {
          candidate = applyPricingProfileToRoute(candidate, pricingProfile, quantity);
        }

        routes.push(candidate);

        if (!best || candidate.totalPrice < best.totalPrice) {
          best = candidate;
        }
      });
    });

    routes.sort((a, b) => a.totalPrice - b.totalPrice);
    if (best) {
      proposals.push({ quantity, winner: best, routes });
    }
  });

  proposals.sort((a, b) => a.quantity - b.quantity);
  return proposals;
}
