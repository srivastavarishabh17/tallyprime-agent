import axios from "axios";
import { loadConfig } from "../config";

export interface PendingInvoice {
  id?: string | number;
  customer: string;
  amount?: number;
  voucher_no?: string;
}

export async function syncToServer(
  module: string,
  action: "push" | "pull",
  payload: unknown
) {
  const config = loadConfig();

  const response = await axios.post(
    config.server.api,
    {
      device_id: config.server.device_id,
      company_id: config.server.company_id,
      module,
      action,
      payload
    },
    {
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${config.server.token}`
      },
      timeout: 30000
    }
  );

  return response.data;
}

export async function uploadLedgers(ledgers: unknown[]) {
  return syncToServer("ledgers", "push", { data: ledgers });
}

export async function uploadCustomers(customers: unknown[]) {
  return syncToServer("customers", "push", { data: customers });
}

export async function uploadSales(sales: unknown[]) {
  return syncToServer("sales", "push", { data: sales });
}

export async function fetchPendingInvoices(): Promise<PendingInvoice[]> {
  const response = await syncToServer("sales", "pull", {});

  if (
    !response ||
    !response.success ||
    !Array.isArray(response.pending_tasks)
  ) {
    return [];
  }

  return response.pending_tasks as PendingInvoice[];
}
