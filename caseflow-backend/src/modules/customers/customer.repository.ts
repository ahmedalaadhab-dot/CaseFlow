import { Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { CreateCustomerDto, UpdateCustomerDto, CustomerQueryDto } from "./customer.dto";

export const customerRepository = {
  async findMany(query: CustomerQueryDto) {
    const where: Prisma.CustomerWhereInput = {
      deletedAt: null,
      ...(query.search
        ? {
            OR: [
              { fullName: { contains: query.search, mode: "insensitive" } },
              { cpr: { contains: query.search, mode: "insensitive" } },
              { passportNumber: { contains: query.search, mode: "insensitive" } },
              { phone: { contains: query.search, mode: "insensitive" } },
              { employer: { contains: query.search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const [items, totalCount] = await Promise.all([
      prisma.customer.findMany({
        where,
        orderBy: { [query.sortBy]: query.sortDir },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        include: { _count: { select: { cases: true } } },
      }),
      prisma.customer.count({ where }),
    ]);

    return { items, totalCount };
  },

  findById(id: string) {
    return prisma.customer.findFirst({
      where: { id, deletedAt: null },
      include: {
        cases: {
          where: { deletedAt: null },
          orderBy: { createdAt: "desc" },
          include: { serviceTemplate: true, assignedEmployee: true },
        },
      },
    });
  },

  findByCpr(cpr: string) {
    return prisma.customer.findFirst({ where: { cpr, deletedAt: null } });
  },

  create(data: CreateCustomerDto) {
    return prisma.customer.create({ data: { ...data, email: data.email || null } });
  },

  update(id: string, data: UpdateCustomerDto) {
    return prisma.customer.update({ where: { id }, data });
  },

  softDelete(id: string) {
    return prisma.customer.update({ where: { id }, data: { deletedAt: new Date() } });
  },
};
