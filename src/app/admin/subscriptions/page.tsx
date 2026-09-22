import { createClient } from "@/lib/supabase/server";

export default async function SubscriptionsPage() {
  const supabase = createClient();

  const { data: subscriptions, error } = await supabase
    .from("subscriptions")
    .select(`
      id,
      user_id,
      plan,
      status,
      amount_paise,
      current_period_end,
      cancel_at_period_end,
      created_at,
      profiles (
        full_name,
        email
      )
    `)
    .order("created_at", { ascending: false });

  if (error) {
    console.error(
      "[admin/subscriptions] Failed to load subscriptions:",
      error
    );

    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">Subscriptions</h1>

        <p className="rounded-xl bg-red-50 p-4 text-sm text-red-600">
          Couldn&apos;t load subscriptions: {error.message}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Subscriptions</h1>
        <p className="mt-1 text-sm text-ink-500">
          View subscriber plans, payment status and renewal information.
        </p>
      </div>

      <div className="rounded-2xl border border-ink-100 bg-white shadow-sm overflow-hidden">
        {subscriptions && subscriptions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-ink-100 bg-ink-50">
                <tr>
                  <th className="px-5 py-4 text-left font-semibold">
                    User
                  </th>
                  <th className="px-5 py-4 text-left font-semibold">
                    Plan
                  </th>
                  <th className="px-5 py-4 text-left font-semibold">
                    Amount
                  </th>
                  <th className="px-5 py-4 text-left font-semibold">
                    Status
                  </th>
                  <th className="px-5 py-4 text-left font-semibold">
                    Period end
                  </th>
                  <th className="px-5 py-4 text-left font-semibold">
                    Created
                  </th>
                </tr>
              </thead>

              <tbody>
                {subscriptions.map((subscription) => {
                  const profile = subscription.profiles as unknown as {
                    full_name: string;
                    email: string;
                  } | null;

                  return (
                    <tr
                      key={subscription.id}
                      className="border-b border-ink-100 last:border-0"
                    >
                      <td className="px-5 py-4">
                        <p className="font-semibold">
                          {profile?.full_name || "Unnamed user"}
                        </p>

                        <p className="mt-1 text-xs text-ink-500">
                          {profile?.email || "No email"}
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        <span className="capitalize">
                          {subscription.plan}
                        </span>
                      </td>

                      <td className="px-5 py-4 font-medium">
                        ₹
                        {(
                          (subscription.amount_paise ?? 0) / 100
                        ).toLocaleString("en-IN")}
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${
                            subscription.status === "active"
                              ? "bg-lagoon-100 text-lagoon-700"
                              : subscription.status === "past_due"
                              ? "bg-sun-100 text-sun-700"
                              : subscription.status === "cancelled" ||
                                subscription.status === "expired"
                              ? "bg-danger-100 text-danger"
                              : "bg-ink-100 text-ink-700"
                          }`}
                        >
                          {subscription.status.replace("_", " ")}
                        </span>

                        {subscription.cancel_at_period_end && (
                          <p className="mt-2 text-xs text-ink-500">
                            Cancels at period end
                          </p>
                        )}
                      </td>

                      <td className="px-5 py-4 text-xs text-ink-500">
                        {subscription.current_period_end
                          ? new Date(
                              subscription.current_period_end
                            ).toLocaleDateString("en-IN")
                          : "—"}
                      </td>

                      <td className="px-5 py-4 text-xs text-ink-500">
                        {new Date(
                          subscription.created_at
                        ).toLocaleDateString("en-IN")}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-10 text-center">
            <h2 className="text-lg font-semibold">
              No subscriptions yet
            </h2>

            <p className="mt-2 text-sm text-ink-500">
              Subscriptions will appear here when users subscribe.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}