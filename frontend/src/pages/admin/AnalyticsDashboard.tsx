import { 
  Users, 
  Calendar, 
  Clock, 
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
import { analyticsData } from '@/data/admin-mock';

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

export default function AnalyticsDashboard() {
  const { statistics } = analyticsData;

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
          value={statistics.totalUsers.toLocaleString()}
          description="+12% from last month"
          icon={Users}
          trend="up"
        />
        <StatCard
          title="Total Events"
          value={statistics.totalEvents}
          description="+8% from last month"
          icon={Calendar}
          trend="up"
        />
        <StatCard
          title="Active Volunteers"
          value={statistics.activeVolunteers}
          description="Currently participating"
          icon={Activity}
        />
        <StatCard
          title="Completed Events"
          value={statistics.completedEvents}
          description="+15% from last month"
          icon={CheckCircle2}
          trend="up"
        />
      </div>

      {/* Additional Stats Row */}
      <div className="grid gap-4 md:grid-cols-2">
        <StatCard
          title="Pending Reports"
          value={statistics.pendingReports}
          description="Requires attention"
          icon={Clock}
        />
        <StatCard
          title="Total Volunteer Hours"
          value={statistics.totalHoursVolunteered.toLocaleString()}
          description="Hours contributed"
          icon={TrendingUp}
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
              <AreaChart data={analyticsData.userGrowth} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0.1}/>
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
              <BarChart data={analyticsData.eventsPerMonth} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
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
                  data={analyticsData.eventsByStatus}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {analyticsData.eventsByStatus.map((_, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={COLORS[index % COLORS.length]}
                      stroke="hsl(var(--background))"
                      strokeWidth={2}
                    />
                  ))}
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
              <LineChart data={analyticsData.volunteerParticipation} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
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
                data={analyticsData.topEventCategories} 
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
                  {analyticsData.topEventCategories.map((_, index) => (
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
                data={analyticsData.reportsDistribution} 
                margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="type" className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar 
                  dataKey="count" 
                  fill="hsl(var(--chart-5))" 
                  radius={[4, 4, 0, 0]}
                >
                  {analyticsData.reportsDistribution.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
