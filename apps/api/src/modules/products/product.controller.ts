import type { Request, Response } from "express";
import { ApiError } from "../../utils/api-error.js";
import type { ProductListQuery } from "./product.schemas.js";
import * as productService from "./product.service.js";

function actorRole(req: Request) {
  if (!req.user) throw ApiError.unauthorized();
  return req.user.role;
}

export async function list(req: Request, res: Response): Promise<void> {
  const query = req.validatedQuery as ProductListQuery;
  const result = await productService.listProducts(query, actorRole(req));
  res.status(200).json(result);
}

export async function detail(req: Request, res: Response): Promise<void> {
  const product = await productService.getProduct(req.params.id as string);
  res.status(200).json({ product });
}

export async function create(req: Request, res: Response): Promise<void> {
  const product = await productService.createProduct(req.body);
  res.status(201).json({ product });
}

export async function update(req: Request, res: Response): Promise<void> {
  const product = await productService.updateProduct(req.params.id as string, req.body);
  res.status(200).json({ product });
}

export async function archive(req: Request, res: Response): Promise<void> {
  const product = await productService.archiveProduct(req.params.id as string);
  res.status(200).json({ product });
}

export async function categories(_req: Request, res: Response): Promise<void> {
  const categories = await productService.listCategories();
  res.status(200).json({ categories });
}
