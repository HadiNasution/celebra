"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type CustomerDetail = {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  users: Array<{ id: string; name: string; email: string; role: string }>;
  subscription: { plan: string; status: string; expiredAt: string } | null;
};

function formatPlan(plan: string): string {
  return plan
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export default function CustomerDetailPage() {
  const params = useParams();
  const [data, setData] = useState<CustomerDetail | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";
    fetch(`${apiUrl}/admin/customers/${params.id}`, { credentials: "include" })
      .then(async (r) => {
        if (!r.ok) {
          const body = await r.json().catch(() => null);
          throw new Error((body as { message?: string } | null)?.message ?? "Customer not found");
        }
        return r.json();
      })
      .then(setData)
      .catch((e: Error) => setError(e.message));
  }, [params.id]);

  if (error) {
    return (
      <section className="admin-customer-detail">
        <p className="text-sm text-dash-destructive">{error}</p>
        <Link
          href="/admin/customers"
          className="admin-customer-detail__back mt-4 inline-flex items-center gap-1 text-sm text-dash-muted-foreground transition-colors duration-200 hover:text-dash-foreground"
        >
          <ArrowLeft className="size-4" /> Back to customers
        </Link>
      </section>
    );
  }

  if (!data) return <p className="animate-pulse text-sm text-dash-muted-foreground">Loading...</p>;

  return (
    <section className="admin-customer-detail">
      <Link
        href="/admin/customers"
        className="admin-customer-detail__back inline-flex items-center gap-1 text-sm text-dash-muted-foreground transition-colors duration-200 hover:text-dash-foreground"
      >
        <ArrowLeft className="size-4" /> Back to customers
      </Link>
      <h1 className="admin-customer-detail__heading mt-3 text-2xl font-bold tracking-tight">{data.name}</h1>
      <p className="admin-customer-detail__slug mt-1 text-sm text-dash-muted-foreground">Slug: {data.slug}</p>

      <Card className="admin-customer-detail__users-card mt-6">
        <CardHeader>
          <CardTitle>Users</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="admin-customer-detail__users-table w-full min-w-[450px] text-left text-sm">
            <thead>
              <tr className="border-b border-dash-border text-dash-muted-foreground">
                <th className="pb-2 pr-4 font-medium">Name</th>
                <th className="pb-2 pr-4 font-medium">Email</th>
                <th className="pb-2 font-medium">Role</th>
              </tr>
            </thead>
            <tbody>
              {data.users.map((u) => (
                <tr key={u.id} className="admin-customer-detail__user-row border-b border-dash-border last:border-0">
                  <td className="py-2 pr-4">{u.name}</td>
                  <td className="py-2 pr-4 text-dash-muted-foreground">{u.email}</td>
                  <td className="py-2">
                    <Badge variant="secondary">{u.role}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {data.subscription && (
        <Card className="admin-customer-detail__subscription-card mt-6">
          <CardHeader>
            <CardTitle>Subscription</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p className="flex items-center gap-2">
              Plan: <span className="font-medium">{formatPlan(data.subscription.plan)}</span>
            </p>
            <p className="flex items-center gap-2">
              Status:{" "}
              <Badge variant={data.subscription.status === "active" ? "success" : "destructive"}>
                {data.subscription.status}
              </Badge>
            </p>
            <p>
              Expires:{" "}
              <span className="font-medium">
                {new Date(data.subscription.expiredAt).toLocaleDateString()}
              </span>
            </p>
          </CardContent>
        </Card>
      )}
    </section>
  );
}
