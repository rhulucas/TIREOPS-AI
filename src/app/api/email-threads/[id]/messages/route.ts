import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

const CUSTOMER_REPLIES: Record<number, string[]> = {
  1: [
    "Thanks for the quote. Can you do better on the price? We were expecting something closer to {lower}.",
    "Received, thank you. We need the delivery within 3 weeks — is that feasible?",
    "Thanks! We're interested but need approval from management. Can you hold this quote for 5 days?",
    "Price looks reasonable. Can you confirm the warranty terms and what happens if there are defects?",
  ],
  2: [
    "That works for us. Can you confirm the exact delivery date?",
    "We can accept the price if you can guarantee delivery by the 15th. Can you commit to that?",
    "Management approved. We'll need a formal PO — can you send the final invoice details?",
    "Warranty terms confirmed, thank you. Let's move forward at the quoted price.",
  ],
  3: [
    "Confirmed. Please go ahead and create the order. We'll wire the deposit this week.",
    "Agreed on all terms. You can proceed with the order.",
    "Perfect. We're good to go — please initiate production.",
    "All agreed. Looking forward to receiving the shipment.",
  ],
};

function getCustomerReply(roundIndex: number, unitPrice?: number | null): string {
  const replies = CUSTOMER_REPLIES[Math.min(roundIndex, 3)] || CUSTOMER_REPLIES[3]!;
  const reply = replies[Math.floor(Math.random() * replies.length)]!;
  const lower = unitPrice ? `$${Math.round(unitPrice * 0.88).toLocaleString()}` : "$80";
  return reply.replace("{lower}", lower);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  try {
    const body = await req.json();
    const { content, sender } = body;
    if (!content || !sender) {
      return NextResponse.json({ error: "content and sender required" }, { status: 400 });
    }

    // Save the sales message
    const message = await prisma.emailMessage.create({
      data: { threadId: id, sender, content },
    });

    // Update thread updatedAt
    await prisma.emailThread.update({
      where: { id },
      data: { updatedAt: new Date() },
    });

    // If sales sent, simulate a customer reply after a short delay
    let customerReply = null;
    if (sender === "sales") {
      const thread = await prisma.emailThread.findUnique({
        where: { id },
        include: { messages: true },
      });
      const salesRound = (thread?.messages || []).filter((m) => m.sender === "sales").length;
      const replyText = getCustomerReply(salesRound, thread?.unitPrice);

      // Simulate delay by saving immediately (in real app you'd use a queue/webhook)
      customerReply = await prisma.emailMessage.create({
        data: { threadId: id, sender: "customer", content: replyText },
      });
      await prisma.emailThread.update({
        where: { id },
        data: { updatedAt: new Date() },
      });
    }

    return NextResponse.json({ message, customerReply });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
