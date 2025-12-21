import {
  Users,
  Calendar,
  FileText,
  CheckCircle2,
  TrendingUp,
  Activity
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import type { ChartConfig } from '@/components/ui/chart';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from 'recharts';
import { useEffect, useState } from 'react';
import { getAnalytics } from '@/services/admin.service';

// Chart configurations
const userGrowthConfig: ChartConfig = {
  users: {
    label: 'Total Users',
    color: 'hsl(var(--chart-1))',
  },
};

const eventsConfig: ChartConfig = {
  events: {
    label: 'Events',
    color: 'hsl(var(--chart-2))',
  },
};

const volunteerConfig: ChartConfig = {
  volunteers: {
    label: 'Active Volunteers',
    color: 'hsl(var(--chart-3))',
  },
};

const categoriesConfig: ChartConfig = {
  count: {
    label: 'Count',
    color: 'hsl(var(--chart-4))',
  },
};

const reportsConfig: ChartConfig = {
  count: {
    label: 'Reports',
    color: 'hsl(var(--chart-5))',
  },
};

const COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

function StatCard({
  title,
  value,
  description,
  icon: Icon,
  trend
}: {
  title: string;
  value: string | number;
  description: string;
  icon: React.ElementType;
  trend?: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          {trend && <TrendingUp className="h-3 w-3 text-green-500" />}
          {description}
        </p>
      </CardContent>
    </Card>
  );
}

interface AnalyticsChartData {
  userGrowth: Array<{ month: string; users: number }>;
  eventsPerMonth: Array<{ month: string; events: number }>;
  eventsByStatus: Array<{ name: string; value: number }>;
  volunteerParticipation: Array<{ month: string; volunteers: number }>;
  topEventCategories: Array<{ category: string; count: number }>;
  reportsDistribution: Array<{ type: string; count: number }>;
}

interface AnalyticsStats {
  totalUsers: number;
  totalEvents: number;
  activeVolunteers: number;
  completedEvents: number;
  pendingReports: number;
  totalPosts: number;
}

interface AnalyticsData {
  statistics: AnalyticsStats;
  userGrowth: AnalyticsChartData['userGrowth'];
  eventsPerMonth: AnalyticsChartData['eventsPerMonth'];
  eventsByStatus: AnalyticsChartData['eventsByStatus'];
  volunteerParticipation: AnalyticsChartData['volunteerParticipation'];
  topEventCategories: AnalyticsChartData['topEventCategories'];
  reportsDistribution: AnalyticsChartData['reportsDistribution'];
}

export default function AnalyticsDashboard() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        setLoading(true);
        const response = await getAnalytics();
        setData(response.data);
        setError(null);
      } catch (err: any) {
        console.error('Failed to fetch analytics:', err);
        setError(err.message || 'Failed to load analytics data');
      } finally {
        setLoading(false);
      }
    }

    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics Dashboard</h1>
          <p className="text-muted-foreground">Overview of your volunteer platform performance.</p>
        </div>
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Loading analytics data...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics Dashboard</h1>
          <p className="text-muted-foreground">Overview of your volunteer platform performance.</p>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-destructive font-semibold mb-2">Error loading analytics</p>
            <p className="text-muted-foreground">{error || 'Unknown error occurred'}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Analytics Dashboard</h1>
        <p className="text-muted-foreground">Overview of your volunteer platform performance.</p>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Users"
          value={data.statistics.totalUsers.toLocaleString()}
          description="Registered users"
          icon={Users}
        />
        <StatCard
          title="Total Events"
          value={data.statistics.totalEvents}
          description="All events"
          icon={Calendar}
        />
        <StatCard
          title="Active Volunteers"
          value={data.statistics.activeVolunteers}
          description="Currently participating"
          icon={Activity}
        />
        <StatCard
          title="Completed Events"
          value={data.statistics.completedEvents}
          description="Finished events"
          icon={CheckCircle2}
        />
      </div>

      {/* Additional Stats Row */}
      <div className="grid gap-4 md:grid-cols-2">
        <StatCard
          title="Pending Reports"
          value={data.statistics.pendingReports}
          description="Requires attention"
          icon={TrendingUp}
        />
        <StatCard
          title="Total Posts"
          value={data.statistics.totalPosts.toLocaleString()}
          description="Posts created"
          icon={FileText}
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* User Growth Chart */}
        <Card>
          <CardHeader>
            <CardTitle>User Growth</CardTitle>
            <CardDescription>Monthly user registrations over the year</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={userGrowthConfig} className="h-[300px] w-full">
              <AreaChart data={data.userGrowth} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0.1} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area
                  type="monotone"
                  dataKey="users"
                  stroke="hsl(var(--chart-1))"
                  fillOpacity={1}
                  fill="url(#colorUsers)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Events Per Month Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Events Per Month</CardTitle>
            <CardDescription>Number of events organized each month</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={eventsConfig} className="h-[300px] w-full">
              <BarChart data={data.eventsPerMonth} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar
                  dataKey="events"
                  fill="hsl(var(--chart-2))"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Event Status Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Events by Status</CardTitle>
            <CardDescription>Distribution of event statuses</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{}} className="h-[300px] w-full">
              <PieChart>
                <Pie
                  data={data.eventsByStatus}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {data.eventsByStatus.map((entry, index) => {
                    // Assign specific colors for each status
                    const statusColors: Record<string, string> = {
                      'Active': '#22c55e', // Green for active events
                      'Completed': '#3b82f6', // Blue for completed events
                      'Pending': '#f59e0b', // Orange for pending events
                    };
                    const color = statusColors[entry.name] || COLORS[index % COLORS.length];

                    return (
                      <Cell
                        key={`cell-${index}`}
                        fill={color}
                        stroke="hsl(var(--background))"
                        strokeWidth={2}
                      />
                    );
                  })}
                </Pie>
                <ChartTooltip content={<ChartTooltipContent />} />
                <Legend />
              </PieChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Volunteer Participation */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Volunteer Participation</CardTitle>
            <CardDescription>Active volunteers trend over the year</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={volunteerConfig} className="h-[300px] w-full">
              <LineChart data={data.volunteerParticipation} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line
                  type="monotone"
                  dataKey="volunteers"
                  stroke="hsl(var(--chart-3))"
                  strokeWidth={3}
                  dot={{ fill: 'hsl(var(--chart-3))', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, strokeWidth: 0 }}
                />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 3 */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Top Event Categories */}
        <Card>
          <CardHeader>
            <CardTitle>Top Event Categories</CardTitle>
            <CardDescription>Most popular event categories</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={categoriesConfig} className="h-[300px] w-full">
              <BarChart
                data={data.topEventCategories}
                layout="vertical"
                margin={{ top: 10, right: 30, left: 80, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={true} vertical={false} />
                <XAxis type="number" className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis
                  type="category"
                  dataKey="category"
                  className="text-xs"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  width={70}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar
                  dataKey="count"
                  radius={[0, 4, 4, 0]}
                >
                  {data.topEventCategories.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Reports Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Reports by Type</CardTitle>
            <CardDescription>Distribution of report reasons</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={reportsConfig} className="h-[300px] w-full">
              <BarChart
                data={data.reportsDistribution}
                layout="vertical"
                margin={{ top: 10, right: 30, left: 80, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={true} vertical={false} />
                <XAxis type="number" className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis
                  type="category"
                  dataKey="type"
                  className="text-xs"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  width={70}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar
                  dataKey="count"
                  fill="hsl(var(--chart-5))"
                  radius={[0, 4, 4, 0]}
                >
                  {data.reportsDistribution.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div >
  );
}
