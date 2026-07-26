import { AttributeModel, type Attribute } from "../../models/Attribute.js";
import { ApiError } from "../../utils/ApiError.js";
import { paginate, type PaginatedResult, type PaginationQuery } from "../../utils/pagination.js";
import type { HydratedDocument } from "mongoose";
import type { CreateAttributeInput, UpdateAttributeInput } from "./attributes.schema.js";

export function listAttributes(
  pagination: PaginationQuery,
): Promise<PaginatedResult<HydratedDocument<Attribute>>> {
  return paginate(AttributeModel, {}, pagination);
}

export function createAttribute(input: CreateAttributeInput): Promise<HydratedDocument<Attribute>> {
  return AttributeModel.create(input);
}

export async function updateAttribute(
  id: string,
  input: UpdateAttributeInput,
): Promise<HydratedDocument<Attribute>> {
  const attribute = await AttributeModel.findById(id);
  if (!attribute) {
    throw new ApiError(404, "ویژگی یافت نشد");
  }
  Object.assign(attribute, input);
  await attribute.save();
  return attribute;
}

export async function deleteAttribute(id: string): Promise<void> {
  const attribute = await AttributeModel.findById(id);
  if (!attribute) {
    throw new ApiError(404, "ویژگی یافت نشد");
  }
  await attribute.softDelete();
}
