import { apiClient } from "./api-client";

export interface StaffCompensation {
  userId: string;
  name: string;
  email: string;
  role: "mechanic" | "cashier" | "admin" | "manager" | string;
  commissionRate: number; // For mechanics, e.g. 40.0 (%)
  baseWage: number;       // For cashiers, e.g. 650.0 (PHP)
}

const DEFAULT_MECHANIC_RATES: Record<string, number> = {};
const DEFAULT_CASHIER_WAGES: Record<string, number> = {};

/**
 * Fetch staff compensation records from PostgreSQL database via /auth/users API.
 * Synchronizes and updates local fallback cache.
 */
export async function fetchStaffCompensationFromDB(): Promise<{
  mechanicRates: Record<string, number>;
  cashierWages: Record<string, number>;
  staffList: StaffCompensation[];
}> {
  const mechanicRates: Record<string, number> = { ...DEFAULT_MECHANIC_RATES };
  const cashierWages: Record<string, number> = { ...DEFAULT_CASHIER_WAGES };
  const staffList: StaffCompensation[] = [];

  // 1. Load any locally stored custom overrides first
  if (typeof window !== "undefined") {
    try {
      const storedM = localStorage.getItem("versiklo_mechanic_rates");
      if (storedM) Object.assign(mechanicRates, JSON.parse(storedM));
      const storedC = localStorage.getItem("versiklo_cashier_wages");
      if (storedC) Object.assign(cashierWages, JSON.parse(storedC));
    } catch (e) {}
  }

  // 2. Query database for live user attributes
  try {
    const res = await apiClient.get<{ items: any[] }>("/auth/users?page=1&page_size=100");
    if (res.data && Array.isArray(res.data.items)) {
      res.data.items.forEach((u) => {
        const fullName = `${u.first_name || ""} ${u.last_name || ""}`.trim() || u.email;
        const commRate = u.commission_rate !== undefined && u.commission_rate !== null ? Number(u.commission_rate) : (mechanicRates[fullName] || 40);
        const wage = u.base_wage !== undefined && u.base_wage !== null ? Number(u.base_wage) : (cashierWages[fullName] || 650);

        if (u.role === "mechanic") {
          mechanicRates[fullName] = commRate;
          mechanicRates[u.email] = commRate;
          mechanicRates[u.id] = commRate;
        } else if (u.role === "cashier") {
          cashierWages[fullName] = wage;
          cashierWages[u.email] = wage;
          cashierWages[u.id] = wage;
        }

        staffList.push({
          userId: u.id,
          name: fullName,
          email: u.email,
          role: u.role,
          commissionRate: commRate,
          baseWage: wage,
        });
      });

      // Update local storage cache
      if (typeof window !== "undefined") {
        localStorage.setItem("versiklo_mechanic_rates", JSON.stringify(mechanicRates));
        localStorage.setItem("versiklo_cashier_wages", JSON.stringify(cashierWages));
      }
    }
  } catch (err) {
    // Graceful fallback to local cache
  }

  return { mechanicRates, cashierWages, staffList };
}

/**
 * Persist updated compensation parameters directly to the database for a user.
 */
export async function saveStaffCompensationToDB(
  user: { id: string; first_name: string; last_name: string; email: string; role: string },
  commissionRate?: number,
  baseWage?: number
): Promise<boolean> {
  try {
    await apiClient.put(`/auth/users/${user.id}`, {
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
      role: user.role,
      commission_rate: commissionRate !== undefined ? Number(commissionRate) : undefined,
      base_wage: baseWage !== undefined ? Number(baseWage) : undefined,
    });

    const fullName = `${user.first_name || ""} ${user.last_name || ""}`.trim() || user.email;

    if (typeof window !== "undefined") {
      if (commissionRate !== undefined) {
        const current = JSON.parse(localStorage.getItem("versiklo_mechanic_rates") || "{}");
        current[fullName] = Number(commissionRate);
        current[user.email] = Number(commissionRate);
        current[user.id] = Number(commissionRate);
        localStorage.setItem("versiklo_mechanic_rates", JSON.stringify(current));
      }

      if (baseWage !== undefined) {
        const current = JSON.parse(localStorage.getItem("versiklo_cashier_wages") || "{}");
        current[fullName] = Number(baseWage);
        current[user.email] = Number(baseWage);
        current[user.id] = Number(baseWage);
        localStorage.setItem("versiklo_cashier_wages", JSON.stringify(current));
      }
    }

    return true;
  } catch (e) {
    console.error("Failed to save compensation to DB:", e);
    return false;
  }
}

/**
 * Calculate labor charges, mechanic commission deduction, and net shop labor retention for an invoice.
 */
export function extractInvoiceLaborAndCommission(
  items: Array<{ name: string; qty: number; price: number; type?: string }> | undefined,
  mechanicName?: string,
  mechanicRatesMap?: Record<string, number>
) {
  const safeItems = items || [];
  
  // Detect labor services
  const laborKeywords = ["labor", "service", "tune-up", "tune up", "cleaning", "flush", "mounting", "rebuild", "inspection", "install"];
  
  let grossLabor = 0;
  let partsTotal = 0;

  safeItems.forEach((item) => {
    const isLabor = item.type === "LABOR" || laborKeywords.some((k) => item.name.toLowerCase().includes(k));
    const itemTotal = Number(item.price || 0) * Number(item.qty || 1);
    if (isLabor) {
      grossLabor += itemTotal;
    } else {
      partsTotal += itemTotal;
    }
  });

  // If no items were categorized as labor but there's a mechanic assigned, fallback to 40% of subtotal as labor
  if (grossLabor === 0 && safeItems.length > 0 && mechanicName && mechanicName !== "N/A") {
    const total = safeItems.reduce((acc, i) => acc + (Number(i.price || 0) * Number(i.qty || 1)), 0);
    grossLabor = Number((total * 0.45).toFixed(2));
    partsTotal = total - grossLabor;
  }

  // Determine mechanic commission rate
  const name = mechanicName || "Mike Smith";
  const rate = mechanicRatesMap?.[name] ?? (typeof window !== "undefined" ? JSON.parse(localStorage.getItem("versiklo_mechanic_rates") || "{}")[name] : null) ?? 40;
  
  const commissionDeduction = Number((grossLabor * (rate / 100)).toFixed(2));
  const netShopLabor = Math.max(0, Number((grossLabor - commissionDeduction).toFixed(2)));

  return {
    grossLabor,
    partsTotal,
    mechanicName: name,
    commissionRate: rate,
    commissionDeduction,
    netShopLabor,
  };
}
