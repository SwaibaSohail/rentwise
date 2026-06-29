import { prisma } from "../lib/prisma";
import { stripe } from "../lib/stripe";
import { env } from "../config/env";
import { ConflictError, NotFoundError, ForbiddenError } from "../lib/errors";

export async function createCheckout(tenantId: string) {
  const tenancy = await prisma.tenancy.findFirst({
    where: { tenantId, status: "ACTIVE" },
    include: { property: true },
  });
  if (!tenancy) throw new ConflictError("No active tenancy to pay rent for");
  const amount = tenancy.property.rentAmount * 100; // cents
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: { name: `Rent — ${tenancy.property.title}` },
          unit_amount: amount,
        },
        quantity: 1,
      },
    ],
    success_url: `${env.CLIENT_URL}/payments/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${env.CLIENT_URL}/payments/cancel`,
  });
  await prisma.payment.create({
    data: { tenancyId: tenancy.id, tenantId, amount, currency: "usd", status: "PENDING", stripeSessionId: session.id },
  });
  return { url: session.url };
}

export async function confirm(tenantId: string, sessionId: string) {
  const payment = await prisma.payment.findUnique({
    where: { stripeSessionId: sessionId },
    include: { tenancy: { include: { property: true } } },
  });
  if (!payment) throw new NotFoundError("Payment not found");
  if (payment.tenantId !== tenantId) throw new ForbiddenError("Not your payment");
  const landlordId = payment.tenancy.property.landlordId;
  if (payment.status === "PAID") return { payment, landlordId, becamePaid: false };
  const session = await stripe.checkout.sessions.retrieve(sessionId);
  if (session.payment_status === "paid") {
    const updated = await prisma.payment.update({ where: { id: payment.id }, data: { status: "PAID", paidAt: new Date() } });
    return { payment: updated, landlordId, becamePaid: true };
  }
  return { payment, landlordId, becamePaid: false };
}

export function listForTenant(tenantId: string) {
  return prisma.payment.findMany({
    where: { tenantId },
    include: { tenancy: { include: { property: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export function listForLandlord(landlordId: string) {
  return prisma.payment.findMany({
    where: { tenancy: { property: { landlordId } } },
    include: { tenant: true, tenancy: { include: { property: true } } },
    orderBy: { createdAt: "desc" },
  });
}
