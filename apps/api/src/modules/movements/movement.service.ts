/**
 * Implement stock-changing operations here.
 *
 * Required invariants:
 * - The client supplies a positive quantity; the server chooses the movement type/sign.
 * - All balance reads and movement inserts happen in one transaction.
 * - Lock the product row (PostgreSQL SELECT ... FOR UPDATE) before calculating stock.
 * - Calculate balance from SUM of movements; do not trust a client-supplied balance.
 * - If available stock is insufficient, throw and roll back.
 * - Enforce role permissions in the route/service layer.
 *
 * Keep the transaction short and never perform network calls inside it.
 */
export {};
