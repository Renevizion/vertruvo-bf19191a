import { Card } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { usePerformanceData } from "@/hooks/usePerformanceData";
import { Skeleton } from "@/components/ui/skeleton";

export const PerformanceChart = () => {
  const { data, isLoading } = usePerformanceData();

  if (isLoading) {
    return (
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-6">Performance Overview</h3>
        <Skeleton className="h-[300px] w-full" />
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-6">Performance Overview (Last 30 Days)</h3>
        <div className="flex flex-col items-center justify-center h-[200px] text-center">
          <p className="text-muted-foreground text-sm">No activity yet</p>
          <p className="text-muted-foreground text-xs mt-1">
            Lead and conversion data will appear here as you add leads to your pipeline.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-6">Performance Overview (Last 30 Days)</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis 
            dataKey="month" 
            stroke="hsl(var(--muted-foreground))"
            style={{ fontSize: '12px' }}
            interval="preserveStartEnd"
            tick={{ fontSize: 10 }}
          />
          <YAxis 
            stroke="hsl(var(--muted-foreground))"
            style={{ fontSize: '12px' }}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px'
            }}
          />
          <Legend />
          <Line 
            type="monotone" 
            dataKey="leads" 
            stroke="hsl(var(--primary))" 
            strokeWidth={2}
            dot={{ fill: 'hsl(var(--primary))', r: 2 }}
          />
          <Line 
            type="monotone" 
            dataKey="conversions" 
            stroke="hsl(var(--success))" 
            strokeWidth={2}
            dot={{ fill: 'hsl(var(--success))', r: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </Card>
  );
};
