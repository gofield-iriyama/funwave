import { SurfDashboard } from "@/components/surf-dashboard";
import { getDashboardData } from "@/lib/repository";

export const dynamic = "force-dynamic";

export default async function Home() {
  const data = await getDashboardData();

  return <SurfDashboard data={data} />;
}
