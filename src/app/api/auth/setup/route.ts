import { hash } from "bcryptjs";
import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { initialAdminSetupSchema } from "@/lib/admin-validation";
import { auditLogData } from "@/lib/audit";
import { setSessionCookie } from "@/lib/auth";
import { validateCsrf } from "@/lib/csrf";
import { prisma } from "@/lib/db";
import { ensureSystemRbac } from "@/lib/rbac-bootstrap";
import { INSTALLATION_ID, isInitialSetupAvailable } from "@/lib/setup";
import { rateLimit } from "@/services/rate-limit";

class SetupUnavailableError extends Error {}

export async function POST(request: NextRequest) {
  const limited = rateLimit(`initial-setup:${request.headers.get("x-forwarded-for") ?? "local"}`, 6, 15 * 60_000);
  if (!limited.ok) {
    return NextResponse.json({ error: "Too many setup attempts" }, { status: 429 });
  }

  const csrfFailure = validateCsrf(request);
  if (csrfFailure) return csrfFailure;

  if (!(await isInitialSetupAvailable())) {
    return NextResponse.json({ error: "Initial setup has already been completed" }, { status: 409 });
  }

  const parsed = initialAdminSetupSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid administrator account" },
      { status: 400 }
    );
  }

  const passwordHash = await hash(parsed.data.password, 12);
  try {
    const user = await prisma.$transaction(async (transaction) => {
      const [userCount, installation] = await Promise.all([
        transaction.user.count(),
        transaction.appInstallation.findUnique({
          where: { id: INSTALLATION_ID },
          select: { id: true }
        })
      ]);
      if (userCount > 0 || installation) throw new SetupUnavailableError();

      await transaction.appInstallation.create({
        data: { id: INSTALLATION_ID }
      });
      const { adminRole } = await ensureSystemRbac(transaction, { migrateLegacyAdmins: false });
      const created = await transaction.user.create({
        data: {
          email: parsed.data.email,
          username: parsed.data.username,
          name: parsed.data.name,
          passwordHash,
          role: "ADMIN",
          active: true,
          mustChangePassword: false,
          passwordChangedAt: new Date(),
          emailVerified: new Date(),
          roles: {
            create: { roleId: adminRole.id }
          }
        }
      });
      await transaction.appInstallation.update({
        where: { id: INSTALLATION_ID },
        data: { initializedById: created.id }
      });
      await transaction.auditLog.create({
        data: auditLogData({
          request,
          actorUserId: created.id,
          action: "installation.admin_created",
          targetType: "User",
          targetId: created.id,
          metadata: { email: created.email, username: created.username }
        })
      });
      return created;
    }, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      maxWait: 5_000,
      timeout: 20_000
    });

    await setSessionCookie(user);
    return NextResponse.json({ ok: true }, {
      status: 201,
      headers: { "Cache-Control": "no-store" }
    });
  } catch (error) {
    if (
      error instanceof SetupUnavailableError
      || (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")
    ) {
      return NextResponse.json({ error: "Initial setup has already been completed" }, { status: 409 });
    }
    throw error;
  }
}
