import { redirect } from "next/navigation";

export default async function DashboardRoot({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  redirect(`/${slug}/dashboard/invitations`);
}
