import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const MOCK_THREADS = [
  {
    customerName: "Fleet Solutions Ltd",
    tireSpec: "315/80R22.5 · TBR",
    quantity: 800,
    unitPrice: 142,
    status: "CLOSED",
    subject: "Quote for 315/80R22.5 TBR × 800 units — Fleet Solutions Ltd",
    messages: [
      { sender: "sales", content: "Dear Fleet Solutions Ltd,\n\nThank you for your inquiry. Please find below our quote for 315/80R22.5 TBR tires:\n\n• Quantity: 800 units\n• Unit Price: $142.00\n• Estimated Total: $113,600\n• Lead Time: 4–5 weeks\n• Payment Terms: Net 30\n\nAll tires are DOT/ECE compliant with full load rating certification. Please let us know if you'd like to proceed or have any questions.\n\nBest regards,\nTireOps Sales Team", daysAgo: 14 },
      { sender: "customer", content: "Thanks for the quick quote. We need these by end of month — that's in 3 weeks. Can you commit to that timeline?", daysAgo: 13 },
      { sender: "sales", content: "Dear Fleet Solutions,\n\nWe've checked with our production team and can confirm a 3-week delivery for 800 units. We'd expedite the order given your deadline.\n\nWe'd need a 30% deposit ($34,080) to lock in production priority. Would that work on your end?\n\nBest regards,\nTireOps Sales Team", daysAgo: 13 },
      { sender: "customer", content: "That works. We'll process the deposit wire today. Please confirm once you receive it.", daysAgo: 12 },
      { sender: "sales", content: "Deposit confirmed, thank you! Production has been scheduled. We'll send tracking information once the shipment is dispatched.\n\nBest regards,\nTireOps Sales Team", daysAgo: 12 },
      { sender: "customer", content: "Perfect. Looking forward to receiving the order.", daysAgo: 11 },
    ],
  },
  {
    customerName: "Midwest Logistics Group",
    tireSpec: "275/70R22.5 · TBR",
    quantity: 400,
    unitPrice: 128,
    status: "AGREED",
    subject: "Quote for 275/70R22.5 TBR × 400 units — Midwest Logistics Group",
    messages: [
      { sender: "sales", content: "Dear Midwest Logistics Group,\n\nFollowing up on our recent conversation, here is the formal quote:\n\n• Tire Spec: 275/70R22.5 TBR\n• Quantity: 400 units\n• Unit Price: $128.00\n• Total: $51,200\n• Lead Time: 3–4 weeks\n• Payment Terms: Net 30\n\nLooking forward to your confirmation.\n\nBest regards,\nTireOps Sales Team", daysAgo: 7 },
      { sender: "customer", content: "We reviewed the quote. Can you do $120/unit? That's closer to what we paid last time with another supplier.", daysAgo: 6 },
      { sender: "sales", content: "Dear Midwest Logistics,\n\nWe appreciate your feedback. The best we can offer is $124/unit — that's $49,600 total. This reflects the current raw material costs.\n\nWe can also extend payment terms to Net 45 to help with your cash flow.\n\nWould you like to move forward on those terms?\n\nBest regards,\nTireOps Sales Team", daysAgo: 6 },
      { sender: "customer", content: "$124 with Net 45 — we can work with that. Let's do it.", daysAgo: 5 },
      { sender: "sales", content: "Excellent! We'll prepare the purchase order confirmation and send it over today. Please review and sign to officially kick off production.\n\nBest regards,\nTireOps Sales Team", daysAgo: 5 },
      { sender: "customer", content: "Signed and returned. Thanks for working with us on the pricing.", daysAgo: 4 },
    ],
  },
  {
    customerName: "Pacific Trucking LLC",
    tireSpec: "225/75R17.5 · LT",
    quantity: 200,
    unitPrice: 98,
    status: "OPEN",
    subject: "Quote for 225/75R17.5 LT × 200 units — Pacific Trucking LLC",
    messages: [
      { sender: "sales", content: "Dear Pacific Trucking LLC,\n\nThank you for reaching out. Please find our quote below:\n\n• Tire Spec: 225/75R17.5 LT\n• Quantity: 200 units\n• Unit Price: $98.00\n• Total: $19,600\n• Lead Time: 2–3 weeks\n• Payment Terms: Net 30\n\nBest regards,\nTireOps Sales Team", daysAgo: 3 },
      { sender: "customer", content: "Thanks. We might want to increase the quantity to 350 units. Would the price per unit change?", daysAgo: 2 },
      { sender: "sales", content: "Great news — yes! For 350 units we can offer $93/unit, bringing the total to $32,550. Volume discounts apply at 300+ units.\n\nWould you like us to update the quote to 350 units?\n\nBest regards,\nTireOps Sales Team", daysAgo: 2 },
      { sender: "customer", content: "Let us confirm internally. We'll get back to you by end of week.", daysAgo: 1 },
    ],
  },
  {
    customerName: "Apex Logistics Group",
    tireSpec: "205/75R17.5 · LT",
    quantity: 150,
    unitPrice: 87,
    status: "OPEN",
    subject: "Quote for 205/75R17.5 LT × 150 units — Apex Logistics Group",
    messages: [
      { sender: "sales", content: "Dear Apex Logistics Group,\n\nFollowing your inquiry, please see our competitive quote:\n\n• Tire Spec: 205/75R17.5 LT\n• Quantity: 150 units\n• Unit Price: $87.00\n• Total: $13,050\n• Lead Time: 2 weeks\n• Payment Terms: Net 30\n\nBest regards,\nTireOps Sales Team", daysAgo: 5 },
      { sender: "customer", content: "Could you send me the technical spec sheet for this tire? Our compliance team needs it before we can approve the purchase.", daysAgo: 4 },
      { sender: "sales", content: "Of course! I've attached the full technical specification sheet including:\n\n• Load index & speed rating certifications\n• DOT/ECE compliance documents\n• Tread depth specifications\n• Temperature and traction ratings\n\nPlease forward to your compliance team. Typically approvals take 2–3 days. We can hold this pricing for 7 days.\n\nBest regards,\nTireOps Sales Team", daysAgo: 4 },
      { sender: "customer", content: "Got it, thanks. Our compliance team is reviewing. We'll follow up early next week.", daysAgo: 3 },
    ],
  },
  {
    customerName: "National Trucking Co",
    tireSpec: "385/65R22.5 · TBR",
    quantity: 1200,
    unitPrice: 187,
    status: "CLOSED",
    subject: "Quote for 385/65R22.5 TBR × 1200 units — National Trucking Co",
    messages: [
      { sender: "sales", content: "Dear National Trucking Co,\n\nThank you for the large volume inquiry. Our quote for 385/65R22.5 TBR:\n\n• Quantity: 1,200 units\n• Unit Price: $187.00 (volume pricing applied)\n• Total: $224,400\n• Lead Time: 6–7 weeks\n• Payment Terms: 30% deposit, balance before shipment\n\nThis is one of our flagship long-haul tire models with a 3-year warranty.\n\nBest regards,\nTireOps Sales Team", daysAgo: 21 },
      { sender: "customer", content: "We'd like to split the order across two deliveries — 600 now and 600 in 6 weeks. Is that possible?", daysAgo: 20 },
      { sender: "sales", content: "Yes, we can accommodate split deliveries. First batch of 600 in 4 weeks, second batch 6 weeks after that. The unit price remains $187 for the full order.\n\nWe'd require a single PO for the full 1,200 units to lock in pricing.\n\nBest regards,\nTireOps Sales Team", daysAgo: 20 },
      { sender: "customer", content: "That works. We also need custom sidewall branding on all tires — is that an option?", daysAgo: 19 },
      { sender: "sales", content: "Custom sidewall branding is available for orders over 1,000 units. Setup fee is $3,500 for the mold, then no additional cost per tire. The artwork file (vector format) would be needed 2 weeks before production start.\n\nWould you like to include this in the order?\n\nBest regards,\nTireOps Sales Team", daysAgo: 18 },
      { sender: "customer", content: "Yes, include the custom branding. We'll send the artwork file this week. Please proceed with the order.", daysAgo: 17 },
      { sender: "sales", content: "Excellent! Order confirmed. Artwork received and sent to our design team for review. Production start is scheduled for next Monday.\n\nWe'll keep you updated at each milestone.\n\nBest regards,\nTireOps Sales Team", daysAgo: 16 },
    ],
  },
  {
    customerName: "City Delivery Inc",
    tireSpec: "195/65R15 · PCR",
    quantity: 500,
    unitPrice: 62,
    status: "CLOSED",
    subject: "Quote for 195/65R15 PCR × 500 units — City Delivery Inc",
    messages: [
      { sender: "sales", content: "Dear City Delivery Inc,\n\nHere's our quote for your fleet replenishment:\n\n• Tire Spec: 195/65R15 PCR\n• Quantity: 500 units\n• Unit Price: $62.00\n• Total: $31,000\n• Lead Time: 2 weeks\n• Payment Terms: Net 30\n\nBest regards,\nTireOps Sales Team", daysAgo: 30 },
      { sender: "customer", content: "Good pricing. Can you guarantee same specs as our last order from 3 months ago?", daysAgo: 29 },
      { sender: "sales", content: "Yes — same compound, same mold spec as your previous order (Ref: T0-8821). We have your spec on file and will match it exactly.\n\nBest regards,\nTireOps Sales Team", daysAgo: 29 },
      { sender: "customer", content: "Great, let's go ahead with 500 units.", daysAgo: 28 },
    ],
  },
  {
    customerName: "Summit Freight Co",
    tireSpec: "265/70R19.5 · TBR",
    quantity: 300,
    unitPrice: 118,
    status: "OPEN",
    subject: "Delay Notice — Order T0-2241 — Summit Freight Co",
    messages: [
      { sender: "sales", content: "Dear Summit Freight Co,\n\nWe regret to inform you that order T0-2241 (265/70R19.5 × 300 units) is experiencing a production delay of approximately 5 days due to a compound batch quality issue that did not pass QC.\n\nWe are re-running the batch and anticipate shipping by this Friday. We sincerely apologize for the inconvenience.\n\nBest regards,\nTireOps Sales Team", daysAgo: 2 },
      { sender: "customer", content: "This is problematic — we have fleet maintenance scheduled for next Monday. Can you expedite shipping once ready?", daysAgo: 1 },
      { sender: "sales", content: "Understood. We've arranged priority expedited freight — once the batch clears QC (expected Thursday), we'll ship via overnight freight at our cost to meet your Monday schedule.\n\nWe'll also apply a 5% discount on this order as a goodwill gesture for the inconvenience.\n\nBest regards,\nTireOps Sales Team", daysAgo: 1 },
      { sender: "customer", content: "We appreciate the expedited shipping and the discount. Please keep us updated Thursday on QC results.", daysAgo: 0 },
    ],
  },
  {
    customerName: "Horizon Fleet Services",
    tireSpec: "235/65R16 · PCR",
    quantity: 120,
    unitPrice: 71,
    status: "OPEN",
    subject: "Reorder Reminder — 235/65R16 PCR — Horizon Fleet Services",
    messages: [
      { sender: "sales", content: "Dear Horizon Fleet Services,\n\nBased on your typical replenishment cycle, we wanted to reach out regarding your next order of 235/65R16 PCR tires.\n\nYour last order was 5 months ago (120 units). Current pricing:\n\n• Unit Price: $71.00\n• Minimum order: 100 units\n• Lead Time: 2 weeks\n• Payment Terms: Net 30\n\nPrices are expected to increase ~4% next quarter due to raw material costs.\n\nBest regards,\nTireOps Sales Team", daysAgo: 4 },
      { sender: "customer", content: "Good timing — we were just about to reach out. Same specs as before, same quantity. Please send the invoice.", daysAgo: 3 },
      { sender: "sales", content: "Perfect! We'll prepare the order for 120 units of 235/65R16 PCR at $71/unit ($8,520 total). Invoice and PO confirmation will be in your inbox within the hour.\n\nBest regards,\nTireOps Sales Team", daysAgo: 3 },
      { sender: "customer", content: "Invoice received. Payment processing now.", daysAgo: 2 },
    ],
  },
  {
    customerName: "Atlas Transport",
    tireSpec: "295/80R22.5 · TBR",
    quantity: 600,
    unitPrice: 156,
    status: "AGREED",
    subject: "Quote for 295/80R22.5 TBR × 600 units — Atlas Transport",
    messages: [
      { sender: "sales", content: "Dear Atlas Transport,\n\nThank you for requesting a quote. Here are the details:\n\n• Tire Spec: 295/80R22.5 TBR (all-position)\n• Quantity: 600 units\n• Unit Price: $156.00\n• Total: $93,600\n• Lead Time: 5 weeks\n• Payment Terms: Net 45\n\nThese tires meet all US DOT and EU ECE R117 regulations.\n\nBest regards,\nTireOps Sales Team", daysAgo: 10 },
      { sender: "customer", content: "Can you do Net 60 on payment terms? We're restructuring our AP cycle.", daysAgo: 9 },
      { sender: "sales", content: "We can offer Net 60 for orders over $80,000 with an approved credit line. Your order qualifies. I'll flag this for our finance team for a quick credit review — typically 24 hours.\n\nBest regards,\nTireOps Sales Team", daysAgo: 9 },
      { sender: "customer", content: "Sounds good. Let me know when credit is approved.", daysAgo: 8 },
      { sender: "sales", content: "Credit approved! Net 60 terms confirmed. We can start production upon receipt of your signed PO.\n\nBest regards,\nTireOps Sales Team", daysAgo: 7 },
      { sender: "customer", content: "PO signed and emailed. Let's get this moving.", daysAgo: 6 },
    ],
  },
  {
    customerName: "Coastal Express Freight",
    tireSpec: "245/70R17.5 · LT",
    quantity: 250,
    unitPrice: 104,
    status: "OPEN",
    subject: "Quote for 245/70R17.5 LT × 250 units — Coastal Express Freight",
    messages: [
      { sender: "sales", content: "Dear Coastal Express Freight,\n\nPlease find your requested quote:\n\n• Tire Spec: 245/70R17.5 LT\n• Quantity: 250 units\n• Unit Price: $104.00\n• Total: $26,000\n• Lead Time: 3 weeks\n• Payment Terms: Net 30\n\nBest regards,\nTireOps Sales Team", daysAgo: 1 },
      { sender: "customer", content: "We need these to be winter-rated (M+S marked). Can you confirm this spec meets that requirement?", daysAgo: 0 },
    ],
  },
  {
    customerName: "Pinnacle Haulers Inc",
    tireSpec: "315/70R22.5 · TBR",
    quantity: 1000,
    unitPrice: 168,
    status: "CLOSED",
    subject: "Quote for 315/70R22.5 TBR × 1000 units — Pinnacle Haulers Inc",
    messages: [
      { sender: "sales", content: "Dear Pinnacle Haulers Inc,\n\nLarge volume quote as requested:\n\n• Tire Spec: 315/70R22.5 TBR (drive axle)\n• Quantity: 1,000 units\n• Unit Price: $168.00 (volume discount applied)\n• Total: $168,000\n• Lead Time: 6 weeks\n• Payment Terms: 30% deposit, balance on delivery\n\nBest regards,\nTireOps Sales Team", daysAgo: 45 },
      { sender: "customer", content: "We've done business before and always paid on time. Can we get full Net 30 instead of deposit?", daysAgo: 44 },
      { sender: "sales", content: "Given your payment history with us, absolutely — full Net 30 approved. Same price applies.\n\nBest regards,\nTireOps Sales Team", daysAgo: 44 },
      { sender: "customer", content: "Great. Confirmed. Send the order confirmation.", daysAgo: 43 },
      { sender: "sales", content: "Order confirmed. Production begins Monday. You'll receive weekly updates.\n\nBest regards,\nTireOps Sales Team", daysAgo: 43 },
    ],
  },
  {
    customerName: "Delta Fleet Management",
    tireSpec: "225/65R17 · PCR",
    quantity: 80,
    unitPrice: 79,
    status: "OPEN",
    subject: "Customer Inquiry — 225/65R17 PCR availability — Delta Fleet",
    messages: [
      { sender: "sales", content: "Dear Delta Fleet Management,\n\nThank you for your inquiry about 225/65R17 PCR availability.\n\nWe currently have stock available:\n\n• Quantity available: 200+ units\n• Unit Price: $79.00\n• Can ship within 5 business days\n• Payment Terms: Net 30\n\nWould 80 units work for your current need?\n\nBest regards,\nTireOps Sales Team", daysAgo: 6 },
      { sender: "customer", content: "Yes, 80 units is what we need. Do you offer fleet account discounts?", daysAgo: 5 },
      { sender: "sales", content: "Yes! For registered fleet accounts with annual volume over $50,000, we offer:\n\n• 5% discount on all orders\n• Priority stock reservation\n• Dedicated account manager\n• Net 45 terms\n\nYour current order of $6,320 is below the annual threshold, but if you plan to order regularly, we can enroll you now and apply the discount retroactively once you hit the threshold.\n\nBest regards,\nTireOps Sales Team", daysAgo: 5 },
      { sender: "customer", content: "We plan to order quarterly — roughly 80 units each time. That should put us over the threshold annually.", daysAgo: 4 },
      { sender: "sales", content: "Perfect — 4 orders × 80 units × $79 = ~$25,280/year. With our fleet discount enrollment, I can offer you the 5% discount starting with this order as a courtesy.\n\nSo: 80 units × $75.05 = $6,004. Shall I send the formal quote?\n\nBest regards,\nTireOps Sales Team", daysAgo: 3 },
      { sender: "customer", content: "Yes please send it over.", daysAgo: 2 },
    ],
  },
];

async function main() {
  console.log("Seeding email threads...");

  // Find or create a user to assign threads to
  const user = await prisma.user.findFirst();
  if (!user) {
    console.error("No user found. Please seed users first.");
    process.exit(1);
  }

  // Clear existing threads
  await prisma.emailMessage.deleteMany();
  await prisma.emailThread.deleteMany();
  console.log("Cleared existing email threads.");

  for (const t of MOCK_THREADS) {
    const now = new Date();
    const lastMsgDaysAgo = t.messages[t.messages.length - 1]?.daysAgo ?? 0;
    const updatedAt = new Date(now.getTime() - lastMsgDaysAgo * 24 * 60 * 60 * 1000);

    const thread = await prisma.emailThread.create({
      data: {
        subject: t.subject,
        customerName: t.customerName,
        tireSpec: t.tireSpec,
        quantity: t.quantity,
        unitPrice: t.unitPrice,
        status: t.status,
        userId: user.id,
        updatedAt,
        messages: {
          create: t.messages.map((m, i) => {
            const msgDate = new Date(now.getTime() - m.daysAgo * 24 * 60 * 60 * 1000 + i * 5 * 60 * 1000);
            return {
              sender: m.sender,
              content: m.content,
              createdAt: msgDate,
            };
          }),
        },
      },
    });
    console.log(`✓ Created thread: ${thread.customerName} (${thread.status})`);
  }

  console.log(`\nDone! Created ${MOCK_THREADS.length} email threads.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
