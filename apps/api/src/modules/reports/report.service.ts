import { csvFilename, escapeCsvCell } from "../../utils/csv.js";
import { stockStatus } from "../../utils/stock.js";
import * as movementRepository from "../movements/movement.repository.js";
import * as productRepository from "../products/product.repository.js";
import { serializeProduct } from "../products/product.service.js";

export async function getDashboard() {
  const [totals, lowStock, recent, activity] = await Promise.all([
    productRepository.inventoryTotals(),
    productRepository.listLowStockProducts(6),
    movementRepository.recentMovements(8),
    movementRepository.dailyActivity(14)
  ]);

  return {
    totals,
    lowStock: lowStock.map(serializeProduct),
    recentMovements: recent.map(movementRepository.serializeMovement),
    activity
  };
}

export async function getLowStockReport() {
  const products = await productRepository.listLowStockProducts(500);
  return {
    items: products.map((product) => ({
      ...serializeProduct(product),
      deficit: Math.max(0, product.lowStockThreshold - product.stock),
      status: stockStatus(product.stock, product.lowStockThreshold)
    })),
    total: products.length
  };
}

const CSV_HEADERS = [
  "SKU",
  "Name",
  "Category",
  "Unit",
  "Price",
  "Current Stock",
  "Low-Stock Threshold",
  "Status"
];

/**
 * Produces the CSV in pages of at most 100 products so a large catalogue is not
 * loaded into memory at once. The caller streams each chunk with res.write().
 * Totals are page-derived: an inventory changing during the export can shift
 * rows between pages, which is acceptable for a report snapshot.
 */
export async function* streamStockCsv(): AsyncGenerator<string> {
  yield `${CSV_HEADERS.map(escapeCsvCell).join(",")}\r\n`;

  let page = 1;
  for (;;) {
    const { items, total } = await productRepository.listProducts({
      page,
      pageSize: 100,
      stockStatus: "all",
      includeArchived: false,
      sort: "sku",
      order: "asc"
    });

    if (items.length === 0) break;

    const rows = items.map((product) =>
      [
        product.sku,
        product.name,
        product.category,
        product.unit,
        product.price,
        product.stock,
        product.lowStockThreshold,
        stockStatus(product.stock, product.lowStockThreshold)
      ]
        .map(escapeCsvCell)
        .join(",")
    );
    yield `${rows.join("\r\n")}\r\n`;

    if (page * 100 >= total) break;
    page += 1;
  }
}

export function stockCsvFilename(): string {
  return csvFilename("stockledger-stock");
}
