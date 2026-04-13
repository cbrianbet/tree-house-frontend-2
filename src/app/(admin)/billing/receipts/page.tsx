"use client";
import React, { useEffect, useState } from "react";
import { listReceipts } from "@/lib/api/billing";
import type { Receipt } from "@/types/api";
import Alert from "@/components/ui/alert/Alert";

export default function ReceiptsPage() {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listReceipts()
      .then(setReceipts)
      .catch(() => setError("Failed to load receipts."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-6 text-xl font-semibold text-gray-800 dark:text-white/90">
        Receipts
      </h1>

      {error && (
        <div className="mb-4">
          <Alert variant="error" title="Error" message={error} />
        </div>
      )}

      {receipts.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center dark:border-gray-800 dark:bg-white/[0.03]">
          <p className="text-gray-500 dark:text-gray-400">No receipts found.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-800">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50">
              <tr>
                <th className="px-5 py-3 font-medium text-gray-500 dark:text-gray-400">
                  Receipt #
                </th>
                <th className="px-5 py-3 font-medium text-gray-500 dark:text-gray-400">
                  Payment ID
                </th>
                <th className="px-5 py-3 font-medium text-gray-500 dark:text-gray-400">
                  Issued At
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-white/[0.03]">
              {receipts.map((r) => (
                <tr key={r.id}>
                  <td className="whitespace-nowrap px-5 py-4 font-medium text-gray-800 dark:text-white/90">
                    {r.receipt_number}
                  </td>
                  <td className="whitespace-nowrap px-5 py-4 text-gray-500 dark:text-gray-400">
                    {r.payment}
                  </td>
                  <td className="whitespace-nowrap px-5 py-4 text-gray-500 dark:text-gray-400">
                    {new Date(r.issued_at).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
