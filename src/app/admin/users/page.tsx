import { createClient } from "@/lib/supabase/server";

export default async function UsersPage() {
  const supabase = createClient();

  const { data: users, error } = await supabase
    .from("profiles")
    .select(`
      id,
      email,
      full_name,
      role,
      charity_percent,
      created_at,
      charities (
        name
      ),
      subscriptions (
        plan,
        status,
        amount_paise,
        current_period_end
      )
    `)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[admin/users] Failed to load users:", error);

    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">Users</h1>

        <p className="rounded-xl bg-red-50 p-4 text-sm text-red-600">
          Couldn&apos;t load users: {error.message}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Users</h1>
        <p className="mt-1 text-sm text-ink-500">
          View registered users, subscriptions and charity choices.
        </p>
      </div>

      <div className="rounded-2xl border border-ink-100 bg-white shadow-sm overflow-hidden">
        {users && users.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-ink-100 bg-ink-50">
                <tr>
                  <th className="px-5 py-4 text-left font-semibold">
                    User
                  </th>
                  <th className="px-5 py-4 text-left font-semibold">
                    Role
                  </th>
                  <th className="px-5 py-4 text-left font-semibold">
                    Subscription
                  </th>
                  <th className="px-5 py-4 text-left font-semibold">
                    Charity
                  </th>
                  <th className="px-5 py-4 text-left font-semibold">
                    Joined
                  </th>
                </tr>
              </thead>

              <tbody>
                {users.map((user) => {
                  const charity = user.charities as unknown as {
                    name: string;
                  } | null;

                  const subscriptions =
                    (user.subscriptions as unknown as {
                      plan: string;
                      status: string;
                      amount_paise: number;
                      current_period_end: string | null;
                    }[]) ?? [];

                  const subscription = subscriptions[0];

                  return (
                    <tr
                      key={user.id}
                      className="border-b border-ink-100 last:border-0"
                    >
                      <td className="px-5 py-4">
                        <p className="font-semibold">
                          {user.full_name || "Unnamed user"}
                        </p>
                        <p className="mt-1 text-xs text-ink-500">
                          {user.email}
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        <span className="rounded-full bg-ink-100 px-3 py-1 text-xs font-medium capitalize">
                          {user.role}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        {subscription ? (
                          <div>
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${
                                subscription.status === "active"
                                  ? "bg-lagoon-100 text-lagoon-700"
                                  : subscription.status === "past_due"
                                  ? "bg-sun-100 text-sun-700"
                                  : "bg-ink-100 text-ink-700"
                              }`}
                            >
                              {subscription.status.replace("_", " ")}
                            </span>

                            <p className="mt-2 text-xs text-ink-500">
                              {subscription.plan} · ₹
                              {(
                                (subscription.amount_paise ?? 0) / 100
                              ).toLocaleString("en-IN")}
                            </p>
                          </div>
                        ) : (
                          <span className="text-xs text-ink-500">
                            No subscription
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-4">
                        {charity ? (
                          <div>
                            <p className="font-medium">
                              {charity.name}
                            </p>
                            <p className="mt-1 text-xs text-ink-500">
                              {user.charity_percent}% contribution
                            </p>
                          </div>
                        ) : (
                          <span className="text-xs text-ink-500">
                            Not selected
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-4 text-xs text-ink-500">
                        {new Date(user.created_at).toLocaleDateString(
                          "en-IN"
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-10 text-center">
            <h2 className="text-lg font-semibold">No users yet</h2>
            <p className="mt-2 text-sm text-ink-500">
              Registered users will appear here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}