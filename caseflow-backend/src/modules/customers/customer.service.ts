import { customerRepository } from "./customer.repository";
import { CreateCustomerDto, UpdateCustomerDto, CustomerQueryDto } from "./customer.dto";
import { NotFoundError, ConflictError } from "../../common/errors/AppError";
import { buildMeta } from "../../common/utils/pagination";

export const customerService = {
  async list(query: CustomerQueryDto) {
    const { items, totalCount } = await customerRepository.findMany(query);
    return { items, meta: buildMeta(query, totalCount) };
  },

  async getById(id: string) {
    const customer = await customerRepository.findById(id);
    if (!customer) throw new NotFoundError("Customer");
    return customer;
  },

  async create(dto: CreateCustomerDto) {
    if (dto.cpr) {
      const existing = await customerRepository.findByCpr(dto.cpr);
      if (existing) throw new ConflictError("A customer with this CPR already exists");
    }
    return customerRepository.create(dto);
  },

  async update(id: string, dto: UpdateCustomerDto) {
    await this.getById(id); // 404s if missing
    if (dto.cpr) {
      const existing = await customerRepository.findByCpr(dto.cpr);
      if (existing && existing.id !== id) {
        throw new ConflictError("A customer with this CPR already exists");
      }
    }
    return customerRepository.update(id, dto);
  },

  async remove(id: string) {
    await this.getById(id);
    return customerRepository.softDelete(id);
  },
};
