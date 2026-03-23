import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const CUSTOMERS = [
  "Fleet Solutions Ltd", "Midwest Logistics Group", "Pacific Trucking LLC",
  "Apex Logistics Group", "National Trucking Co", "City Delivery Inc",
  "Summit Freight Co", "Horizon Fleet Services", "Atlas Transport",
  "Coastal Express Freight", "Pinnacle Haulers Inc", "Delta Fleet Management",
  "Western Transport Inc", "Eagle Freight Systems", "Ironhorse Industrial Rubber",
  "NorthStar Industrial Rubber", "BlueStar Logistics", "Titan Trucking Corp",
  "Crossroads Fleet Services", "Riverside Cargo Co",
];

const TIRE_SPECS = [
  { spec: "315/80R22.5 · TBR", price: 142, category: "Long-haul" },
  { spec: "275/70R22.5 · TBR", price: 128, category: "Regional" },
  { spec: "295/80R22.5 · TBR", price: 156, category: "Drive axle" },
  { spec: "385/65R22.5 · TBR", price: 187, category: "Wide-base" },
  { spec: "315/70R22.5 · TBR", price: 168, category: "Drive axle" },
  { spec: "225/75R17.5 · LT",  price: 98,  category: "Light truck" },
  { spec: "245/70R17.5 · LT",  price: 104, category: "Light truck" },
  { spec: "265/70R19.5 · TBR", price: 118, category: "Regional" },
  { spec: "195/65R15 · PCR",   price: 62,  category: "Passenger" },
  { spec: "225/65R17 · PCR",   price: 79,  category: "Passenger" },
  { spec: "235/65R16 · PCR",   price: 71,  category: "Passenger" },
  { spec: "205/75R17.5 · LT",  price: 87,  category: "Light truck" },
];

const QUANTITIES = [80, 100, 120, 150, 200, 250, 300, 400, 500, 600, 800, 1000, 1200];

const STATUSES = ["OPEN", "OPEN", "OPEN", "AGREED", "AGREED", "CLOSED", "CLOSED", "CLOSED"];

// Conversation templates by round
const SALES_OPENING = (customer: string, spec: string, qty: number, price: number, terms: string) =>
  `Dear ${customer},\n\nThank you for your inquiry. Please find our quote below:\n\n• Tire Spec: ${spec}\n• Quantity: ${qty.toLocaleString()} units\n• Unit Price: $${price.toFixed(2)}\n• Estimated Total: $${(qty * price).toLocaleString()}\n• Lead Time: ${Math.floor(Math.random() * 3) + 2}–${Math.floor(Math.random() * 2) + 5} weeks\n• Payment Terms: ${terms}\n\nAll tires meet DOT/ECE compliance standards. Please let us know if you have any questions.\n\nBest regards,\nTireOps Sales Team`;

const CUSTOMER_REPLIES_1 = [
  (price: number) => `Thanks for the quote. We need to discuss pricing — can you come down to $${Math.round(price * 0.9)}/unit?`,
  () => `Received. Can you confirm the exact delivery date? We have a fleet maintenance window coming up.`,
  () => `Thanks. We need to get compliance documentation approved internally first. Can you hold this price for 10 days?`,
  (price: number) => `The price looks good but we expected Net 60 terms. Can you accommodate that for an order this size? Current offer is $${price}/unit.`,
  () => `We're comparing a few suppliers right now. What's your best final price for this volume?`,
  () => `Can you split this order into two deliveries — half now and half in 6 weeks?`,
];

const SALES_REPLIES_1 = [
  (price: number) => `Dear Customer,\n\nWe've reviewed your request. We can offer $${Math.round(price * 0.93)}/unit — that's our best volume price given current material costs. We can also extend payment terms to Net 45 to help with cash flow.\n\nWould you like to proceed on these terms?\n\nBest regards,\nTireOps Sales Team`,
  () => `Dear Customer,\n\nOur production team has confirmed your timeline. We can commit to shipping within your window. We'd need a signed PO within 48 hours to lock in the schedule.\n\nBest regards,\nTireOps Sales Team`,
  () => `Dear Customer,\n\nAbsolutely — we can hold this pricing for 10 business days. Please send over the PO once your compliance team approves.\n\nBest regards,\nTireOps Sales Team`,
  () => `Dear Customer,\n\nNet 60 is approved for orders over $50,000. Your order qualifies. We can proceed on Net 60 terms at the quoted price.\n\nBest regards,\nTireOps Sales Team`,
  (price: number) => `Dear Customer,\n\nOur final best offer is $${Math.round(price * 0.91)}/unit — this includes volume discount and priority production scheduling. We cannot go lower without compromising quality standards.\n\nBest regards,\nTireOps Sales Team`,
  () => `Dear Customer,\n\nSplit delivery is possible. First batch in 3 weeks, second batch 5 weeks after. We'd require a single PO for the full quantity to lock in pricing.\n\nBest regards,\nTireOps Sales Team`,
];

const CUSTOMER_REPLIES_2 = [
  () => `That works for us. We'll send the PO over today.`,
  () => `Agreed. Net 45 terms accepted. Please confirm production start date.`,
  () => `Compliance approved. We're ready to move forward. Please send the order confirmation.`,
  () => `Final price accepted. Let's proceed. We'll wire the deposit by end of day.`,
  () => `Split delivery works perfectly. Same spec for both batches?`,
  () => `We can do that. What documents do we need to sign to get started?`,
];

const SALES_REPLIES_2 = [
  () => `Dear Customer,\n\nPO received — thank you! Production has been scheduled. You'll receive a shipment notification with tracking details once dispatched.\n\nBest regards,\nTireOps Sales Team`,
  () => `Dear Customer,\n\nProduction start confirmed for this Monday. Expected dispatch in 4 weeks. We'll send weekly production updates.\n\nBest regards,\nTireOps Sales Team`,
  () => `Dear Customer,\n\nOrder confirmed. We'll send you the formal PO acknowledgment and production schedule within 24 hours.\n\nBest regards,\nTireOps Sales Team`,
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

function buildThread(
  customer: string,
  tire: typeof TIRE_SPECS[0],
  qty: number,
  status: string,
  daysAgoBase: number,
): { messages: { sender: string; content: string; daysAgo: number }[] } {
  const price = tire.price + Math.floor(Math.random() * 20) - 10;
  const terms = pick(["Net 30", "Net 45", "Net 60", "30% deposit, balance before shipment"]);
  const msgs: { sender: string; content: string; daysAgo: number }[] = [];

  // Opening
  msgs.push({ sender: "sales", content: SALES_OPENING(customer, tire.spec, qty, price, terms), daysAgo: daysAgoBase });

  if (status === "OPEN" && Math.random() < 0.5) {
    // Just opening, waiting
    const reply1Fn = pick(CUSTOMER_REPLIES_1);
    msgs.push({ sender: "customer", content: reply1Fn(price), daysAgo: daysAgoBase - 1 });
    return { messages: msgs };
  }

  if (status === "OPEN") {
    // Opening + customer reply
    const reply1Fn = pick(CUSTOMER_REPLIES_1);
    msgs.push({ sender: "customer", content: reply1Fn(price), daysAgo: daysAgoBase - 1 });
    const sales1Fn = pick(SALES_REPLIES_1);
    msgs.push({ sender: "sales", content: sales1Fn(price), daysAgo: daysAgoBase - 2 });
    const reply2Fn = pick(CUSTOMER_REPLIES_2);
    msgs.push({ sender: "customer", content: reply2Fn(), daysAgo: daysAgoBase - 3 });
    return { messages: msgs };
  }

  // AGREED or CLOSED — full negotiation
  const reply1Fn = pick(CUSTOMER_REPLIES_1);
  msgs.push({ sender: "customer", content: reply1Fn(price), daysAgo: daysAgoBase - 2 });
  const sales1Fn = pick(SALES_REPLIES_1);
  msgs.push({ sender: "sales", content: sales1Fn(price), daysAgo: daysAgoBase - 3 });
  const reply2Fn = pick(CUSTOMER_REPLIES_2);
  msgs.push({ sender: "customer", content: reply2Fn(), daysAgo: daysAgoBase - 4 });

  if (status === "CLOSED") {
    const sales2Fn = pick(SALES_REPLIES_2);
    msgs.push({ sender: "sales", content: sales2Fn(), daysAgo: daysAgoBase - 5 });
  }

  return { messages: msgs };
}

async function main() {
  console.log("Seeding 100 email threads across 2021–2026...");

  const user = await prisma.user.findFirst();
  if (!user) { console.error("No user found."); process.exit(1); }

  await prisma.emailMessage.deleteMany();
  await prisma.emailThread.deleteMany();
  console.log("Cleared existing threads.");

  // Distribute: ~15 per year for 2021-2025, ~25 for 2026
  const distribution: { year: number; count: number }[] = [
    { year: 2021, count: 12 },
    { year: 2022, count: 14 },
    { year: 2023, count: 16 },
    { year: 2024, count: 18 },
    { year: 2025, count: 20 },
    { year: 2026, count: 20 },
  ];

  let created = 0;

  for (const { year, count } of distribution) {
    for (let i = 0; i < count; i++) {
      const customer = pick(CUSTOMERS);
      const tire = pick(TIRE_SPECS);
      const qty = pick(QUANTITIES);
      const status = pick(STATUSES);

      // Random date within the year
      const startOfYear = new Date(`${year}-01-01`);
      const endOfYear = new Date(`${year}-12-31`);
      const randomDayOffset = Math.floor(Math.random() * (endOfYear.getTime() - startOfYear.getTime()) / 86400000);
      const baseDate = new Date(startOfYear.getTime() + randomDayOffset * 86400000);
      const daysAgoFromNow = Math.floor((Date.now() - baseDate.getTime()) / 86400000);

      const { messages } = buildThread(customer, tire, qty, status, daysAgoFromNow);
      const subject = `Quote for ${tire.spec} × ${qty} units — ${customer}`;
      const lastMsgOffset = messages[messages.length - 1]?.daysAgo ?? daysAgoFromNow;
      const updatedAt = new Date(Date.now() - lastMsgOffset * 86400000);

      await prisma.emailThread.create({
        data: {
          subject,
          customerName: customer,
          tireSpec: tire.spec,
          quantity: qty,
          unitPrice: tire.price,
          status,
          userId: user.id,
          updatedAt,
          messages: {
            create: messages.map((m, idx) => ({
              sender: m.sender,
              content: m.content,
              createdAt: new Date(Date.now() - m.daysAgo * 86400000 + idx * 5 * 60000),
            })),
          },
        },
      });

      created++;
      process.stdout.write(`\r✓ Created ${created} threads...`);
    }
  }

  console.log(`\n\nDone! Created ${created} email threads across 2021–2026.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
