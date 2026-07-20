import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding CaseFlow database...");

  const passwordHash = await bcrypt.hash("Password123!", 12);

  const [owner, manager, employee, reception, viewer] = await Promise.all([
    prisma.user.upsert({
      where: { email: "owner@caseflow.test" },
      update: {},
      create: { email: "owner@caseflow.test", passwordHash, firstName: "Sara", lastName: "Al Khalifa", role: "OWNER" },
    }),
    prisma.user.upsert({
      where: { email: "manager@caseflow.test" },
      update: {},
      create: { email: "manager@caseflow.test", passwordHash, firstName: "Yousif", lastName: "Ahmed", role: "MANAGER" },
    }),
    prisma.user.upsert({
      where: { email: "employee@caseflow.test" },
      update: {},
      create: { email: "employee@caseflow.test", passwordHash, firstName: "Fatima", lastName: "Hassan", role: "EMPLOYEE" },
    }),
    prisma.user.upsert({
      where: { email: "reception@caseflow.test" },
      update: {},
      create: { email: "reception@caseflow.test", passwordHash, firstName: "Mariam", lastName: "Saleh", role: "RECEPTION" },
    }),
    prisma.user.upsert({
      where: { email: "viewer@caseflow.test" },
      update: {},
      create: { email: "viewer@caseflow.test", passwordHash, firstName: "Ali", lastName: "Jassim", role: "VIEWER" },
    }),
  ]);

  const residenceRenewal = await prisma.serviceTemplate.create({
    data: {
      name: "Residence Renewal",
      description: "Renewal of residence permit for expatriate employees",
      estimatedDays: 14,
      defaultPriority: "NORMAL",
      templateStages: {
        create: [
          {
            name: "Collect Documents",
            order: 0,
            color: "#2563eb",
            checklistItems: {
              create: [
                { label: "Passport", isMandatory: true, order: 0 },
                { label: "CPR", isMandatory: true, order: 1 },
                { label: "Photo", isMandatory: true, order: 2 },
                { label: "Employer Letter", isMandatory: true, order: 3 },
              ],
            },
          },
          { name: "Verify Documents", order: 1, color: "#7c3aed" },
          { name: "Medical", order: 2, color: "#db2777" },
          { name: "Submit Application", order: 3, color: "#ea580c" },
          { name: "Government Review", order: 4, color: "#ca8a04" },
          { name: "Payment", order: 5, color: "#16a34a" },
          { name: "Printing", order: 6, color: "#0891b2" },
          { name: "Delivered", order: 7, color: "#1e3a5f" },
          { name: "Archived", order: 8, color: "#64748b" },
        ],
      },
    },
  });

  const customer = await prisma.customer.create({
    data: {
      fullName: "Mohammed Abdulla",
      nationality: "India",
      cpr: "900101234",
      passportNumber: "P1234567",
      gender: "Male",
      phone: "+97333123456",
      whatsapp: "+97333123456",
      email: "mohammed.abdulla@example.com",
      employer: "Gulf Trading Co.",
    },
  });

  const template = await prisma.serviceTemplate.findUniqueOrThrow({
    where: { id: residenceRenewal.id },
    include: { templateStages: { orderBy: { order: "asc" }, include: { checklistItems: true } } },
  });

  const createdCase = await prisma.case.create({
    data: {
      caseNumber: "CF-2026-000001",
      customerId: customer.id,
      assignedEmployeeId: employee.id,
      createdByUserId: reception.id,
      serviceTemplateId: template.id,
      priority: "HIGH",
      status: "IN_PROGRESS",
      dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
      description: "Standard residence renewal, employer-sponsored",
      caseCost: 45.5,
      customerPrice: 80,
    },
  });

  let firstStageId: string | null = null;
  for (const stage of template.templateStages) {
    const caseStage = await prisma.caseStage.create({
      data: {
        caseId: createdCase.id,
        templateStageId: stage.id,
        name: stage.name,
        order: stage.order,
        color: stage.color,
        enteredAt: firstStageId === null ? new Date() : null,
        checklistItems: {
          create: stage.checklistItems.map((i) => ({ label: i.label, isMandatory: i.isMandatory, order: i.order })),
        },
      },
    });
    if (firstStageId === null) firstStageId = caseStage.id;
  }

  await prisma.case.update({ where: { id: createdCase.id }, data: { currentCaseStageId: firstStageId } });

  await prisma.timelineEvent.create({
    data: { caseId: createdCase.id, actorId: reception.id, type: "CASE_CREATED", message: `Case ${createdCase.caseNumber} created` },
  });

  console.log("✅ Seed complete.");
  console.log("   Sample login: owner@caseflow.test / Password123!");
  console.log(`   Users created: ${[owner, manager, employee, reception, viewer].length}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
