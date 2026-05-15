import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { DataTableClient, type DataCenterTable } from "./DataTableClient";

export const dynamic = "force-dynamic";

function formatDate(value: Date | null | undefined) {
  if (!value) return null;
  return value.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function money(value: number | null | undefined) {
  if (value === null || value === undefined) return null;
  return `$${value.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

export default async function AdminDataPage() {
  const session = await auth();
  if (!session?.user) redirect("/login?callbackUrl=/data-center");

  const [
    customers,
    orders,
    quotes,
    invoices,
    treadDesigns,
    compoundSpecs,
    changeRequests,
    emailThreads,
    productionLines,
    counts,
  ] = await Promise.all([
    prisma.customer.findMany({
      orderBy: { createdAt: "desc" },
      take: 75,
      include: { _count: { select: { orders: true, quotes: true, invoices: true } } },
    }),
    prisma.order.findMany({
      orderBy: { createdAt: "desc" },
      take: 75,
      include: { customer: true },
    }),
    prisma.quote.findMany({
      orderBy: { createdAt: "desc" },
      take: 75,
      include: { customer: true },
    }),
    prisma.invoice.findMany({
      orderBy: { createdAt: "desc" },
      take: 75,
      include: { customer: true },
    }),
    prisma.treadDesign.findMany({
      orderBy: { updatedAt: "desc" },
      take: 75,
      include: { user: true },
    }),
    prisma.compoundSpec.findMany({
      orderBy: { createdAt: "desc" },
      take: 75,
      include: { user: true },
    }),
    prisma.changeRequest.findMany({
      orderBy: { createdAt: "desc" },
      take: 75,
      include: { design: true, requester: true },
    }),
    prisma.emailThread.findMany({
      orderBy: { updatedAt: "desc" },
      take: 75,
      include: { _count: { select: { messages: true } } },
    }),
    prisma.productionLine.findMany({
      orderBy: { name: "asc" },
    }),
    Promise.all([
      prisma.customer.count(),
      prisma.order.count(),
      prisma.quote.count(),
      prisma.invoice.count(),
      prisma.treadDesign.count(),
      prisma.compoundSpec.count(),
      prisma.changeRequest.count(),
      prisma.emailThread.count(),
      prisma.productionLine.count(),
    ]),
  ]);

  const [
    customerCount,
    orderCount,
    quoteCount,
    invoiceCount,
    treadDesignCount,
    compoundSpecCount,
    changeRequestCount,
    emailThreadCount,
    productionLineCount,
  ] = counts;

  const tables: DataCenterTable[] = [
    {
      key: "customers",
      label: "Customers",
      description: "Seeded customer accounts used by orders, quotes, and invoices.",
      audience: "Sales, Finance, Admin",
      count: customerCount,
      columns: ["name", "company", "email", "phone", "orders", "quotes", "invoices", "created_at"],
      rows: customers.map((customer) => ({
        name: customer.name,
        company: customer.company,
        email: customer.email,
        phone: customer.phone,
        orders: customer._count.orders,
        quotes: customer._count.quotes,
        invoices: customer._count.invoices,
        created_at: formatDate(customer.createdAt),
      })),
    },
    {
      key: "orders",
      label: "Orders",
      description: "Production orders generated from demo tire operations data.",
      audience: "Sales, Finance, Admin",
      count: orderCount,
      columns: ["order_number", "customer", "status", "tire_spec", "quantity", "value", "due_date", "created_at"],
      rows: orders.map((order) => ({
        order_number: order.orderNumber,
        customer: order.customerName || order.customer?.company || order.customer?.name || null,
        status: order.status,
        tire_spec: order.tireSpec,
        quantity: order.quantity,
        value: money(order.value),
        due_date: formatDate(order.dueDate),
        created_at: formatDate(order.createdAt),
      })),
    },
    {
      key: "quotes",
      label: "Quotes",
      description: "AI quote assistant records and sales quote pipeline data.",
      audience: "Sales, Admin",
      count: quoteCount,
      columns: ["customer", "status", "size", "category", "compound", "quantity", "delivery_date", "created_at"],
      rows: quotes.map((quote) => ({
        customer: quote.customerName || quote.customer?.company || quote.customer?.name || null,
        status: quote.status,
        size: quote.size,
        category: quote.category,
        compound: quote.compound,
        quantity: quote.quantity,
        delivery_date: formatDate(quote.deliveryDate),
        created_at: formatDate(quote.createdAt),
      })),
    },
    {
      key: "invoices",
      label: "Invoices",
      description: "Generated invoice records connected to customer and order data.",
      audience: "Finance, Admin",
      count: invoiceCount,
      columns: ["invoice_number", "customer", "order_ref", "status", "payment_terms", "tax_rate", "paid_at", "created_at"],
      rows: invoices.map((invoice) => ({
        invoice_number: invoice.invoiceNumber,
        customer: invoice.customerName || invoice.customer?.company || invoice.customer?.name || null,
        order_ref: invoice.orderRef,
        status: invoice.status,
        payment_terms: invoice.paymentTerms,
        tax_rate: `${invoice.taxRate}%`,
        paid_at: formatDate(invoice.paidAt),
        created_at: formatDate(invoice.createdAt),
      })),
    },
    {
      key: "tread-designs",
      label: "Tread Designs",
      description: "Manufacturing design records for tire tread patterns and specs.",
      audience: "Engineering, Admin",
      count: treadDesignCount,
      columns: ["name", "application", "category", "season", "status", "version", "width_mm", "updated_at"],
      rows: treadDesigns.map((design) => ({
        name: design.name,
        application: design.application,
        category: design.category,
        season: design.season,
        status: design.status,
        version: design.version,
        width_mm: design.widthMm,
        updated_at: formatDate(design.updatedAt),
      })),
    },
    {
      key: "compounds",
      label: "Compounds",
      description: "Compound specification records produced by the material AI module.",
      audience: "Engineering, Admin",
      count: compoundSpecCount,
      columns: ["application_type", "primary_polymer", "filler_system", "shore_a", "curing_system", "user", "created_at"],
      rows: compoundSpecs.map((spec) => ({
        application_type: spec.applicationType,
        primary_polymer: spec.primaryPolymer,
        filler_system: spec.fillerSystem,
        shore_a: spec.shoreA,
        curing_system: spec.curingSystem,
        user: spec.user?.email || null,
        created_at: formatDate(spec.createdAt),
      })),
    },
    {
      key: "change-requests",
      label: "Change Requests",
      description: "Engineering workflow requests for tread design review and approval.",
      audience: "Engineering, Admin",
      count: changeRequestCount,
      columns: ["design", "type", "status", "requester", "description", "created_at", "updated_at"],
      rows: changeRequests.map((request) => ({
        design: request.design.name,
        type: request.type,
        status: request.status,
        requester: request.requester.email,
        description: request.description,
        created_at: formatDate(request.createdAt),
        updated_at: formatDate(request.updatedAt),
      })),
    },
    {
      key: "email-threads",
      label: "Email Threads",
      description: "Customer communication threads used by the email AI workflow.",
      audience: "Sales, Admin",
      count: emailThreadCount,
      columns: ["subject", "customer", "status", "tire_spec", "quantity", "messages", "updated_at"],
      rows: emailThreads.map((thread) => ({
        subject: thread.subject,
        customer: thread.customerName,
        status: thread.status,
        tire_spec: thread.tireSpec,
        quantity: thread.quantity,
        messages: thread._count.messages,
        updated_at: formatDate(thread.updatedAt),
      })),
    },
    {
      key: "production-lines",
      label: "Production Lines",
      description: "Factory line status, efficiency, and QC failure metrics.",
      audience: "Engineering, Admin",
      count: productionLineCount,
      columns: ["name", "status", "efficiency", "qc_fails"],
      rows: productionLines.map((line) => ({
        name: line.name,
        status: line.status,
        efficiency: `${line.efficiency}%`,
        qc_fails: line.qcFails,
      })),
    },
  ];

  return <DataTableClient generatedAt={new Date().toISOString()} tables={tables} />;
}
