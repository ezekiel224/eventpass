import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authorizeApi } from "@/lib/authorization";
import { prisma } from "@/lib/db";
import { generateOpaqueToken, hashOpaqueToken } from "@/lib/session";

export async function GET(request: NextRequest) {
  const access = await authorizeApi(request, "settings:manage");
  if (!access.ok) return access.response;
  const credentials = await prisma.apiCredential.findMany({ where: { organizationId: access.authorization.organization.id }, select: { id: true, name: true, prefix: true, scopes: true, lastUsedAt: true, expiresAt: true, revokedAt: true, createdAt: true }, orderBy: { createdAt: "desc" } });
  return NextResponse.json({ credentials });
}

export async function POST(request: NextRequest) {
  const access = await authorizeApi(request, "settings:manage");
  if (!access.ok) return access.response;
  const parsed = z.object({ name: z.string().trim().min(2).max(80), scopes: z.array(z.string().min(1)).max(30).default([]), expiresAt: z.coerce.date().optional() }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid credential request" }, { status: 400 });
  const secret = `ep_${generateOpaqueToken()}`;
  const credential = await prisma.apiCredential.create({ data: { organizationId: access.authorization.organization.id, name: parsed.data.name, prefix: secret.slice(0, 11), secretHash: hashOpaqueToken(secret), scopes: JSON.stringify(parsed.data.scopes), expiresAt: parsed.data.expiresAt } });
  return NextResponse.json({ credential: { id: credential.id, name: credential.name, prefix: credential.prefix, scopes: parsed.data.scopes }, secret }, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const access = await authorizeApi(request, "settings:manage");
  if (!access.ok) return access.response;
  const parsed = z.object({ id: z.string().min(1) }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Credential ID required" }, { status: 400 });
  const result = await prisma.apiCredential.updateMany({ where: { id: parsed.data.id, organizationId: access.authorization.organization.id, revokedAt: null }, data: { revokedAt: new Date() } });
  if (!result.count) return NextResponse.json({ error: "Credential not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}

export async function PATCH(request: NextRequest) {
  const access = await authorizeApi(request, "settings:manage");
  if (!access.ok) return access.response;
  const parsed = z.object({ id: z.string().min(1) }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Credential ID required" }, { status: 400 });
  const secret = `ep_${generateOpaqueToken()}`;
  const result = await prisma.apiCredential.updateMany({ where: { id: parsed.data.id, organizationId: access.authorization.organization.id, revokedAt: null }, data: { prefix: secret.slice(0, 11), secretHash: hashOpaqueToken(secret), lastUsedAt: null } });
  if (!result.count) return NextResponse.json({ error: "Credential not found" }, { status: 404 });
  return NextResponse.json({ id: parsed.data.id, prefix: secret.slice(0, 11), secret });
}
