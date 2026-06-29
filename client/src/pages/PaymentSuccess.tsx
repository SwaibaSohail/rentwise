import { useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { paymentsApi } from "../lib/payments";

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id") ?? "";
  const qc = useQueryClient();

  const { data: payment, isLoading, isError } = useQuery({
    queryKey: ["payments", "confirm", sessionId],
    queryFn: () => paymentsApi.confirm(sessionId),
    enabled: !!sessionId,
    retry: false,
  });

  useEffect(() => {
    if (payment) {
      qc.invalidateQueries({ queryKey: ["payments"] });
      qc.invalidateQueries({ queryKey: ["stats"] });
    }
  }, [payment, qc]);

  return (
    <main className="mx-auto max-w-lg p-8 text-center">
      {isLoading && <p className="text-muted-foreground">Confirming your payment…</p>}
      {isError && (
        <div>
          <p className="text-red-600">Could not confirm payment. Please contact support.</p>
          <Link to="/" className="mt-4 inline-block text-sm underline">
            Back to dashboard
          </Link>
        </div>
      )}
      {payment && (
        <div>
          {payment.status === "PAID" ? (
            <>
              <h1 className="text-2xl font-bold text-green-700">Payment successful</h1>
              <p className="mt-2 text-muted-foreground">
                Your rent payment of ${(payment.amount / 100).toLocaleString()} has been received.
              </p>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-bold">Processing…</h1>
              <p className="mt-2 text-muted-foreground">
                Your payment is being processed. Check back shortly.
              </p>
            </>
          )}
          <Link to="/" className="mt-6 inline-block text-sm underline">
            Back to dashboard
          </Link>
        </div>
      )}
      {!isLoading && !isError && !payment && !sessionId && (
        <div>
          <p className="text-muted-foreground">No session found.</p>
          <Link to="/" className="mt-4 inline-block text-sm underline">
            Back to dashboard
          </Link>
        </div>
      )}
    </main>
  );
}
