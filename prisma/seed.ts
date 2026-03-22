import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";

const prisma = new PrismaClient();

type SeedProfile = "small" | "large";

type SeedConfig = {
  customers: number;
  orders: number;
  quotes: number;
  invoices: number;
  emailDrafts: number;
  compoundSpecs: number;
  treadDesigns: number;
  productionLines: number;
};

type CustomerSeed = {
  name: string;
  company: string;
  email: string;
  phone: string;
  address: string;
};

type LineItem = {
  description: string;
  quantity: number;
  unitPrice: number;
};

const PROFILE_CONFIG: Record<SeedProfile, SeedConfig> = {
  small: {
    customers: 40,
    orders: 120,
    quotes: 90,
    invoices: 70,
    emailDrafts: 60,
    compoundSpecs: 40,
    treadDesigns: 35,
    productionLines: 6,
  },
  large: {
    customers: 320,
    orders: 2400,
    quotes: 1600,
    invoices: 1200,
    emailDrafts: 900,
    compoundSpecs: 450,
    treadDesigns: 320,
    productionLines: 12,
  },
};

const LOCATIONS = [
  ["Detroit", "MI"],
  ["Chicago", "IL"],
  ["Dallas", "TX"],
  ["Atlanta", "GA"],
  ["Houston", "TX"],
  ["Miami", "FL"],
  ["Los Angeles", "CA"],
  ["Minneapolis", "MN"],
  ["Philadelphia", "PA"],
  ["Seattle", "WA"],
  ["Nashville", "TN"],
  ["Boston", "MA"],
  ["Phoenix", "AZ"],
  ["San Diego", "CA"],
  ["Denver", "CO"],
  ["Cleveland", "OH"],
  ["Tulsa", "OK"],
  ["Cincinnati", "OH"],
  ["Raleigh", "NC"],
  ["Indianapolis", "IN"],
  ["Memphis", "TN"],
  ["Kansas City", "MO"],
  ["Salt Lake City", "UT"],
  ["Charlotte", "NC"],
];

const COMPANY_PREFIXES = [
  "Atlas",
  "Apex",
  "Summit",
  "Pioneer",
  "Meridian",
  "Titan",
  "BlueLine",
  "NorthStar",
  "Coastal",
  "Great Lakes",
  "Prime",
  "Frontier",
  "Metro",
  "Western",
  "Eastern",
  "RedRock",
  "Valley",
  "Evergreen",
  "Sunbelt",
  "Ironhorse",
];

const COMPANY_SUFFIXES = [
  "Fleet",
  "Logistics",
  "Transport",
  "Carriers",
  "Tire Supply",
  "Distribution",
  "Hauling",
  "Freight",
  "Mobility",
  "Industrial Rubber",
  "Commercial Tire",
  "Delivery",
];

const CONTACT_FIRST_NAMES = [
  "Mason",
  "Olivia",
  "Ethan",
  "Sophia",
  "Liam",
  "Charlotte",
  "Noah",
  "Amelia",
  "James",
  "Ava",
  "Lucas",
  "Isabella",
  "Elijah",
  "Mia",
  "Benjamin",
  "Harper",
];

const CONTACT_LAST_NAMES = [
  "Turner",
  "Brooks",
  "Coleman",
  "Parker",
  "Foster",
  "Jenkins",
  "Ramirez",
  "Patel",
  "Carter",
  "Powell",
  "Murphy",
  "Nguyen",
  "Sanders",
  "Reed",
  "Kim",
  "Bennett",
];

const TIRE_SPECS = [
  "195/65R15 91H Compact",
  "205/55R16 91V All-Season",
  "215/60R17 96H Touring",
  "225/65R17 95H TireOps Premium",
  "235/55R19 101V Touring",
  "245/40R18 93W UHP",
  "255/70R18 113S All-Terrain",
  "265/70R18 116L SUV",
  "275/70R18 116L LT",
  "285/45R22 114Y Performance",
  "315/80R22.5 TBR Regional",
  "11R22.5 TBR Long Haul",
];

const ORDER_STATUSES = ["PENDING", "PRODUCTION", "QC_CHECK", "SHIPPED", "URGENT"] as const;
const QUOTE_CATEGORIES = ["Passenger Car (PCR)", "SUV / Light Truck (LT)", "Commercial Truck (TBR)", "Off-The-Road (OTR)", "Ultra High Performance (UHP)", "Winter / All-Season"];
const INQUIRY_TYPES = ["Technical spec / fitment question", "Lead time & delivery inquiry", "Bulk / fleet pricing", "Warranty or complaint", "OEM certification", "Product availability"];
const EMAIL_TONES = ["Professional & technical", "Friendly & casual", "Formal & corporate", "Concise & direct"];
const APPLICATIONS = ["Passenger - Standard Touring", "Passenger - All Season", "Passenger - Winter", "SUV / Light Truck", "Commercial Truck", "OTR / Industrial", "UHP / Performance"];
const POLYMERS = ["SBR (Styrene-Butadiene)", "NR (Natural Rubber)", "BR (Polybutadiene)", "EPDM"];
const FILLERS = ["Carbon Black N330", "Carbon Black N550", "Silica", "Calcium Carbonate", "Carbon Black N660"];
const CURING = ["Sulfur - Conventional", "Sulfur - EV", "Peroxide"];
const TREAD_APPS = ["Passenger - All Season", "Passenger - Summer", "SUV / Light Truck", "Commercial Truck", "UHP / Performance"];
const TREAD_CATEGORIES = ["PCR", "PCR", "PCR", "SUV", "SUV", "TBR", "TBR", "OTR", "AGR", "MCR"] as const;
const TREAD_SEASONS = ["ALL_SEASON", "ALL_SEASON", "SUMMER", "WINTER", "PERFORMANCE", "OFF_ROAD"] as const;
const TREAD_STATUSES = ["ACTIVE", "ACTIVE", "ACTIVE", "DRAFT", "DISCONTINUED"] as const;
const NOISE_RATINGS = ["A", "A", "B", "B", "C"] as const;
const GRIP_RATINGS = ["A", "A", "B", "B", "C", "D"] as const;
const RR_RATINGS = ["A", "B", "B", "C", "C"] as const;
const CR_TYPES = ["UPDATE", "DEPRECATE", "NEW_VERSION"] as const;
const CR_DESCRIPTIONS = [
  "Increase groove depth for improved winter traction",
  "Reduce sipe density to lower rolling resistance",
  "Update compound compatibility notes",
  "Widen center rib for highway stability",
  "Deprecate — replaced by newer generation design",
  "New version with optimized block stiffness",
  "Adjust noise rating after lab validation",
  "Refine wet grip parameters per EU label update",
];
const PRODUCTION_LINE_NAMES = ["Line A", "Line B", "Line C", "Line D", "Line E", "Line F", "Line G", "Line H", "Line I", "Line J", "Line K", "Line L"];
const EXTRA_LINE_ITEMS = [
  { description: "Freight & handling", prices: [300, 500, 750, 950] },
  { description: "Custom fleet sidewall branding", prices: [800, 1200, 1500] },
  { description: "ECE-R30 certification documentation", prices: [200, 300, 400] },
  { description: "Quality inspection report", prices: [100, 150, 250] },
  { description: "Priority production surcharge", prices: [350, 500, 800] },
];

function getProfile(): SeedProfile {
  return process.env.SEED_PROFILE === "large" ? "large" : "small";
}

function shouldReset() {
  return ["1", "true", "yes"].includes((process.env.SEED_RESET || "").toLowerCase());
}

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)] as T;
}

function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function chunk<T>(items: T[], size: number) {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

function daysAgo(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}

function randomDateBetween(start: Date, end: Date) {
  const startMs = start.getTime();
  const endMs = end.getTime();
  return new Date(startMs + Math.floor(Math.random() * (endMs - startMs + 1)));
}

function daysFrom(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function fmtCurrency(n: number) {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatInvoicePreview(opts: {
  invoiceNumber: string;
  customerName: string;
  address: string;
  orderRef: string;
  lineItems: LineItem[];
  paymentTerms: string;
  taxRate: number;
  invoiceDate: Date;
}) {
  const { invoiceNumber, customerName, address, orderRef, lineItems, paymentTerms, taxRate, invoiceDate } = opts;
  const rate = taxRate / 100;
  let subtotal = 0;
  const lines = lineItems.map((r) => {
    const total = r.quantity * r.unitPrice;
    subtotal += total;
    return { ...r, total };
  });
  const tax = subtotal * rate;
  const total = subtotal + tax;
  const date = invoiceDate.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  let out = "INVOICE\n";
  out += `Invoice Number: ${invoiceNumber}\n`;
  out += `Invoice Date: ${date}\n\n`;
  out += `Bill To:\n${customerName}\n${address}\n\n`;
  out += `Order Reference: ${orderRef || "—"}\n\n`;
  out += "Item Description          Qty      Unit Price (USD)      Total (USD)\n";
  out += `${"—".repeat(70)}\n`;
  for (const l of lines) {
    out += `${l.description.slice(0, 30).padEnd(30)} ${String(l.quantity).padStart(6)} ${fmtCurrency(l.unitPrice).padStart(18)} ${fmtCurrency(l.total).padStart(18)}\n`;
  }
  out += `${"—".repeat(70)}\n`;
  out += `Subtotal:                                                ${fmtCurrency(subtotal).padStart(18)}\n`;
  out += `Tax (${taxRate}%):                                             ${fmtCurrency(tax).padStart(18)}\n`;
  out += `Total:                                                  ${fmtCurrency(total).padStart(18)}\n\n`;
  out += `Payment Terms: ${paymentTerms}\n\n`;
  out += "Thank you for your business!";
  return out;
}

function makeCustomer(index: number): CustomerSeed {
  const [city, state] = LOCATIONS[index % LOCATIONS.length]!;
  const company = `${COMPANY_PREFIXES[index % COMPANY_PREFIXES.length]} ${COMPANY_SUFFIXES[(index * 3) % COMPANY_SUFFIXES.length]}`;
  const first = CONTACT_FIRST_NAMES[index % CONTACT_FIRST_NAMES.length]!;
  const last = CONTACT_LAST_NAMES[(index * 5) % CONTACT_LAST_NAMES.length]!;
  const slug = company.toLowerCase().replace(/[^a-z0-9]+/g, "");
  return {
    name: `${first} ${last}`,
    company,
    email: `ops+${slug}${index}@example.com`,
    phone: `+1-${randInt(201, 989)}-555-${String(1000 + (index % 9000)).padStart(4, "0")}`,
    address: `${200 + index} ${pick(["Industrial", "Commerce", "Logistics", "Freight", "Warehouse", "Trade"])} ${pick(["Way", "Blvd", "Dr", "St", "Ave", "Rd"])}\n${city}, ${state} ${String(10000 + ((index * 137) % 89999)).padStart(5, "0")}`,
  };
}

async function createManyInBatches<T>(items: T[], run: (batch: T[]) => Promise<unknown>, batchSize = 250) {
  for (const batch of chunk(items, batchSize)) {
    await run(batch);
  }
}

async function resetBusinessData() {
  console.log("Resetting business tables...");
  await prisma.changeRequest.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.quote.deleteMany();
  await prisma.order.deleteMany();
  await prisma.emailDraft.deleteMany();
  await prisma.compoundSpec.deleteMany();
  await prisma.treadDesign.deleteMany();
  await prisma.productionLine.deleteMany();
  await prisma.customer.deleteMany();
}

async function main() {
  const profile = getProfile();
  const config = PROFILE_CONFIG[profile];
  const reset = shouldReset();

  console.log(`Seed profile: ${profile}`);
  console.log(`Reset mode: ${reset ? "enabled" : "disabled"}`);

  if (reset) {
    await resetBusinessData();
  }

  const passwordHash = await bcrypt.hash("admin123", 12);
  const admin = await prisma.user.upsert({
    where: { email: "admin@tireops.com" },
    create: {
      email: "admin@tireops.com",
      passwordHash,
      name: "Admin",
      role: "ADMIN",
    },
    update: {
      passwordHash,
      name: "Admin",
      role: "ADMIN",
    },
  });
  console.log("Admin user:", admin.email);

  const engineer = await prisma.user.upsert({
    where: { email: "engineer@tireops.com" },
    create: {
      email: "engineer@tireops.com",
      passwordHash,
      name: "Engineer",
      role: "ENGINEER",
    },
    update: {
      passwordHash,
      name: "Engineer",
      role: "ENGINEER",
    },
  });
  console.log("Engineer user:", engineer.email);

  const customerData = Array.from({ length: config.customers }, (_, index) => makeCustomer(index));
  await createManyInBatches(customerData, (batch) =>
    prisma.customer.createMany({
      data: batch,
    })
  );

  const customers = await prisma.customer.findMany({
    orderBy: { createdAt: "asc" },
    take: config.customers,
  });
  console.log("Customers:", customers.length);

  const seededYears = [2021, 2022, 2023, 2024, 2025, 2026];
  const yearWindows = seededYears.map((year) => ({
    year,
    start: new Date(`${year}-01-01T00:00:00.000Z`),
    end: new Date(`${year}-12-31T23:59:59.999Z`),
  }));

  const orderData = Array.from({ length: config.orders }, (_, index) => {
    const customer = customers[index % customers.length]!;
    const spec = TIRE_SPECS[index % TIRE_SPECS.length]!;
    const quantity = [80, 100, 120, 150, 180, 220, 250, 300, 400, 500, 750, 1000][index % 12]!;
    const unitPrice = randInt(68, 128);
    const yearWindow = yearWindows[index % yearWindows.length]!;
    const createdAt = randomDateBetween(yearWindow.start, yearWindow.end);
    const dueDate = daysFrom(createdAt, randInt(10, 45));
    return {
      orderNumber: `ORD-${profile === "large" ? "L" : "S"}-${String(index + 1000).padStart(6, "0")}`,
      status: pick(ORDER_STATUSES),
      customerId: customer.id,
      customerName: customer.company ?? customer.name,
      tireSpec: spec,
      quantity,
      value: quantity * unitPrice,
      dueDate,
      createdAt,
      updatedAt: createdAt,
      userId: admin.id,
    };
  });
  await createManyInBatches(orderData, (batch) =>
    prisma.order.createMany({
      data: batch,
    })
  );

  const orders = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    take: config.orders,
  });
  console.log("Orders:", orders.length);

  const quoteData = Array.from({ length: config.quotes }, (_, index) => {
    const customer = customers[index % customers.length]!;
    const size = TIRE_SPECS[index % TIRE_SPECS.length]!.split(" ")[0] || "225/65R17";
    const quantity = [100, 150, 200, 250, 300, 400, 500, 750][index % 8]!;
    const yearWindow = yearWindows[index % yearWindows.length]!;
    const createdAt = randomDateBetween(yearWindow.start, yearWindow.end);
    return {
      customerName: customer.company ?? customer.name,
      category: pick(QUOTE_CATEGORIES),
      size,
      loadIndex: String(randInt(88, 126)),
      speedRating: pick(["H", "V", "W", "Y", "L"] as const),
      quantity,
      compound: pick(["Standard SBR Blend", "Silica Wet Grip Blend", "NR Heavy Duty Blend", "Low RR Eco Blend"]),
      notes: index % 7 === 0 ? "Customer requested EU label optimization and DOT paperwork." : index % 11 === 0 ? "Priority fleet tender. Validate lead time before issuing." : null,
      result: `[Seed Quote] ${size} | ${customer.company ?? customer.name} | Qty ${quantity} | Est. $${randInt(72, 104)}/unit`,
      customerId: customer.id,
      userId: admin.id,
      createdAt,
    };
  });
  await createManyInBatches(quoteData, (batch) =>
    prisma.quote.createMany({
      data: batch,
    })
  );
  console.log("Quotes:", config.quotes);

  const invoiceData = Array.from({ length: config.invoices }, (_, index) => {
    const customer = customers[index % customers.length]!;
    const order = orders[index % orders.length]!;
    const invoiceNumber = `INV-${profile === "large" ? "L" : "S"}-${String(index + 5000).padStart(6, "0")}`;
    const baseItem: LineItem = {
      description: order.tireSpec || TIRE_SPECS[index % TIRE_SPECS.length]!,
      quantity: order.quantity,
      unitPrice: order.value && order.quantity > 0 ? Math.round((order.value / order.quantity) * 100) / 100 : randInt(70, 120),
    };
    const lineItems: LineItem[] = [baseItem];
    if (order.quantity >= 250) {
      const charge = EXTRA_LINE_ITEMS[0]!;
      lineItems.push({ description: charge.description, quantity: 1, unitPrice: pick(charge.prices) });
    }
    if (order.status === "URGENT") {
      const charge = EXTRA_LINE_ITEMS[4]!;
      lineItems.push({ description: charge.description, quantity: 1, unitPrice: pick(charge.prices) });
    }
    if (index % 4 === 0) {
      const charge = pick(EXTRA_LINE_ITEMS.slice(1, 4));
      lineItems.push({ description: charge.description, quantity: 1, unitPrice: pick(charge.prices) });
    }
    const paymentTerms = pick(["Net 15", "Net 30", "Net 45", "Net 60", "Due on receipt"]);
    const taxRate = [0, 5, 7.5, 8, 8.25, 9.5][index % 6]!;
    const yearWindow = yearWindows[index % yearWindows.length]!;
    const createdAt = randomDateBetween(yearWindow.start, yearWindow.end);
    return {
      invoiceNumber,
      customerId: customer.id,
      customerName: customer.company ?? customer.name ?? "Unknown customer",
      customerAddress: customer.address ?? "Address pending",
      orderRef: order.orderNumber,
      items: JSON.stringify(lineItems),
      paymentTerms,
      taxRate,
      preview: formatInvoicePreview({
        invoiceNumber,
        customerName: customer.company ?? customer.name ?? "Unknown customer",
        address: customer.address ?? "Address pending",
        orderRef: order.orderNumber,
        lineItems,
        paymentTerms,
        taxRate,
        invoiceDate: createdAt,
      }),
      userId: admin.id,
      createdAt,
    };
  });
  await createManyInBatches(invoiceData, (batch) =>
    prisma.invoice.createMany({
      data: batch,
    })
  );
  console.log("Invoices:", config.invoices);

  const emailDraftData = Array.from({ length: config.emailDrafts }, (_, index) => {
    const customer = customers[index % customers.length]!;
    const order = orders[index % orders.length]!;
    const inquiryType = pick(INQUIRY_TYPES);
    const yearWindow = yearWindows[index % yearWindows.length]!;
    const createdAt = randomDateBetween(yearWindow.start, yearWindow.end);
    return {
      inquiryType,
      emailText: `Customer ${customer.company ?? customer.name} asked about order ${order.orderNumber} for ${order.tireSpec || "tire supply"}. Quantity ${order.quantity}. Please confirm ${inquiryType.toLowerCase()}.`,
      tone: pick(EMAIL_TONES),
      result: `Thank you for contacting TireOps regarding ${order.orderNumber}. We have reviewed your request for ${order.tireSpec || "the requested tire"} and will confirm pricing, lead time, and any compliance documents shortly.`,
      userId: admin.id,
      createdAt,
    };
  });
  await createManyInBatches(emailDraftData, (batch) =>
    prisma.emailDraft.createMany({
      data: batch,
    })
  );
  console.log("EmailDrafts:", config.emailDrafts);

  const compoundData = Array.from({ length: config.compoundSpecs }, (_, index) => ({
    applicationType: pick(APPLICATIONS),
    primaryPolymer: pick(POLYMERS),
    fillerSystem: pick(FILLERS),
    shoreA: `${randInt(55, 68)}-${randInt(62, 74)}`,
    tensileStrength: String(randInt(14, 24)),
    curingSystem: pick(CURING),
    cureTemp: `${randInt(150, 165)}-${randInt(166, 185)}`,
    notes: index % 5 === 0 ? "Targeting lower rolling resistance for fleet demand." : index % 9 === 0 ? "Prioritize wet grip and wear stability." : null,
    result: `[Seed Formula] NR ${randInt(35, 70)}, SBR ${randInt(20, 50)}, CB ${randInt(45, 65)}, Silica ${randInt(8, 22)}. EU prediction: Wet ${pick(["A", "B", "B", "C"])} | RR ${pick(["B", "C", "C", "D"])}.`,
    userId: admin.id,
    createdAt: randomDateBetween(yearWindows[index % yearWindows.length]!.start, yearWindows[index % yearWindows.length]!.end),
  }));
  await createManyInBatches(compoundData, (batch) =>
    prisma.compoundSpec.createMany({
      data: batch,
    })
  );
  console.log("CompoundSpecs:", config.compoundSpecs);

  const widths = [195, 205, 215, 225, 235, 245, 265, 275];
  const heights = [45, 50, 55, 60, 65, 70];
  const grooveDepths = [7, 7.5, 8, 8.5, 9, 9.5, 10, 10.5, 11, 12, 13, 14];
  const treadData = Array.from({ length: config.treadDesigns }, (_, index) => {
    const cat = TREAD_CATEGORIES[index % TREAD_CATEGORIES.length]!;
    const season = TREAD_SEASONS[index % TREAD_SEASONS.length]!;
    const w = widths[index % widths.length]!;
    const h = heights[index % heights.length]!;
    const groove = grooveDepths[index % grooveDepths.length]!;
    const createdAt = randomDateBetween(yearWindows[index % yearWindows.length]!.start, yearWindows[index % yearWindows.length]!.end);
    return {
      name: `TRD-${profile === "large" ? "L" : "S"}-${String(index + 1).padStart(4, "0")}`,
      category: cat,
      season,
      status: TREAD_STATUSES[index % TREAD_STATUSES.length]!,
      version: index % 5 === 0 ? 2 : 1,
      application: pick(TREAD_APPS),
      widthMm: w,
      heightMm: h,
      grooveDepthMm: groove,
      noiseRating: pick(NOISE_RATINGS),
      wetGripRating: pick(GRIP_RATINGS),
      rollingResistance: pick(RR_RATINGS),
      notes: index % 4 === 0 ? "Validated per EU 2020/740 label requirements" : null,
      moldSpec: `TREAD_WIDTH ${w}mm\nSECTION_HEIGHT ${h}mm\nGROOVE_DEPTH ${groove}mm\nEXPORT_CNC`,
      userId: admin.id,
      createdAt,
      updatedAt: createdAt,
    };
  });
  await createManyInBatches(treadData, (batch) =>
    prisma.treadDesign.createMany({ data: batch })
  );
  console.log("TreadDesigns:", config.treadDesigns);

  // Seed change requests
  const allDesigns = await prisma.treadDesign.findMany({ select: { id: true }, take: 30 });
  const crData = allDesigns.slice(0, Math.min(20, allDesigns.length)).map((d, index) => {
    const status = index < 8 ? "PENDING" : index < 14 ? "APPROVED" : "REJECTED";
    const type = CR_TYPES[index % CR_TYPES.length]!;
    const createdAt = randomDateBetween(yearWindows[4]!.start, yearWindows[5]!.end);
    return {
      designId: d.id,
      requesterId: engineer.id,
      reviewerId: status !== "PENDING" ? admin.id : null,
      type,
      description: CR_DESCRIPTIONS[index % CR_DESCRIPTIONS.length]!,
      proposedChanges: JSON.stringify({ grooveDepthMm: 9.5, noiseRating: "A" }),
      status,
      reviewNote: status === "REJECTED" ? "Insufficient test data to support this change." : null,
      aiAssessment: `Based on ${index + 3} similar designs in the library, this change is ${index % 3 === 0 ? "low" : "medium"} risk. Recommend reviewing wet grip test data before approval.`,
      createdAt,
      updatedAt: createdAt,
    };
  });
  await prisma.changeRequest.createMany({ data: crData });
  console.log("ChangeRequests:", crData.length);

  const lineData = PRODUCTION_LINE_NAMES.slice(0, config.productionLines).map((name, index) => ({
    name,
    status: index % 6 === 4 ? "MAINTENANCE" : index % 6 === 5 ? "STOPPED" : "RUNNING",
    efficiency: index % 6 === 5 ? 0 : randInt(84, 98),
    qcFails: randInt(0, 18),
  }));
  await prisma.productionLine.createMany({ data: lineData });
  console.log("ProductionLines:", config.productionLines);

  console.log("\nSeed completed. Data summary:");
  console.log("  Customers:", await prisma.customer.count());
  console.log("  Orders:", await prisma.order.count());
  console.log("  Quotes:", await prisma.quote.count());
  console.log("  Invoices:", await prisma.invoice.count());
  console.log("  EmailDrafts:", await prisma.emailDraft.count());
  console.log("  CompoundSpecs:", await prisma.compoundSpec.count());
  console.log("  TreadDesigns:", await prisma.treadDesign.count());
  console.log("  ChangeRequests:", await prisma.changeRequest.count());
  console.log("  ProductionLines:", await prisma.productionLine.count());
}

main()
  .then(() => prisma.$disconnect())
  .catch((error) => {
    console.error(error);
    prisma.$disconnect();
    process.exit(1);
  });
