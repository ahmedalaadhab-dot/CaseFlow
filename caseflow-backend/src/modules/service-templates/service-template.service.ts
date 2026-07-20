import { serviceTemplateRepository } from "./service-template.repository";
import { NotFoundError } from "../../common/errors/AppError";
import { CreateServiceTemplateDto, UpdateServiceTemplateDto } from "./service-template.dto";

export const serviceTemplateService = {
  list(activeOnly: boolean) {
    return serviceTemplateRepository.findMany(activeOnly);
  },

  async getById(id: string) {
    const found = await serviceTemplateRepository.findById(id);
    if (!found) throw new NotFoundError("Service template");
    return found;
  },

  create(dto: CreateServiceTemplateDto) {
    return serviceTemplateRepository.create(dto);
  },

  async update(id: string, dto: UpdateServiceTemplateDto) {
    await this.getById(id);
    return serviceTemplateRepository.replaceStages(id, dto);
  },

  async setActive(id: string, isActive: boolean) {
    await this.getById(id);
    return serviceTemplateRepository.setActive(id, isActive);
  },

  async remove(id: string) {
    await this.getById(id);
    return serviceTemplateRepository.softDelete(id);
  },
};
