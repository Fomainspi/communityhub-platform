import { prisma } from "../src/db.js";

async function main() {
  const slug = process.env.COMMUNITYHUB_SEED_ORG_SLUG?.trim().toLowerCase();
  const name = process.env.COMMUNITYHUB_SEED_ORG_NAME?.trim();

  if (!slug || !name) {
    throw new Error(
      "Set COMMUNITYHUB_SEED_ORG_SLUG and COMMUNITYHUB_SEED_ORG_NAME before running the seed command.",
    );
  }

  const organization = await prisma.organization.upsert({
    where: { slug },
    create: { slug, name },
    update: { name },
  });

  console.info(`Organization ready: ${organization.name} (${organization.slug})`);

  const adminEmail = process.env.COMMUNITYHUB_BOOTSTRAP_ADMIN_EMAIL?.trim().toLowerCase();
  if (!adminEmail) {
    console.info("No bootstrap admin email supplied; organization created without assigning an admin.");
    return;
  }

  const user = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!user) {
    throw new Error(
      `No CommunityHub user exists for ${adminEmail}. Sign in once through Cognito before assigning community administration.`,
    );
  }

  const membership = await prisma.membership.upsert({
    where: {
      userId_organizationId: {
        userId: user.id,
        organizationId: organization.id,
      },
    },
    create: {
      userId: user.id,
      organizationId: organization.id,
      role: "COMMUNITY_ADMIN",
      status: "ACTIVE",
      joinedAt: new Date(),
    },
    update: {
      role: "COMMUNITY_ADMIN",
      status: "ACTIVE",
      joinedAt: new Date(),
    },
  });

  console.info(
    `Community administrator assigned: ${user.email} → ${organization.slug} (${membership.role})`,
  );
}

main()
  .catch((error: unknown) => {
    console.error("CommunityHub seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
