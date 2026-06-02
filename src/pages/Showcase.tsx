import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Calendar,
  Phone,
  Mail,
  MessageSquare,
  CheckCircle2,
  Clock,
  DollarSign,
  Zap
} from "lucide-react";

const Showcase = () => {
  return (
    <div className="min-h-screen bg-background p-8 space-y-12">
      
      {/* Dashboard Overview - Screenshot 1 */}
      <div className="max-w-7xl mx-auto">
        <div className="mb-4">
          <Badge variant="secondary">Dashboard Overview</Badge>
        </div>
        <div className="grid grid-cols-4 gap-4 mb-6">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Total Leads</span>
              <Users className="w-4 h-4 text-primary" />
            </div>
            <div className="text-3xl font-bold">1,234</div>
            <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
              <TrendingUp className="w-3 h-3" />
              +12% from last month
            </p>
          </Card>
          <Card className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Revenue</span>
              <DollarSign className="w-4 h-4 text-primary" />
            </div>
            <div className="text-3xl font-bold">$45.2K</div>
            <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
              <TrendingUp className="w-3 h-3" />
              +28% from last month
            </p>
          </Card>
          <Card className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Conversion Rate</span>
              <BarChart3 className="w-4 h-4 text-primary" />
            </div>
            <div className="text-3xl font-bold">24.8%</div>
            <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
              <TrendingUp className="w-3 h-3" />
              +5.2% from last month
            </p>
          </Card>
          <Card className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Active Tasks</span>
              <Clock className="w-4 h-4 text-primary" />
            </div>
            <div className="text-3xl font-bold">42</div>
            <p className="text-xs text-muted-foreground mt-1">
              18 due today
            </p>
          </Card>
        </div>

        <Card className="p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Performance Trends
          </h3>
          <div className="h-64 bg-muted/20 rounded-lg flex items-center justify-center border-2 border-dashed">
            <span className="text-muted-foreground">Chart Visualization Area</span>
          </div>
        </Card>
      </div>

      {/* Pipeline View - Screenshot 2 */}
      <div className="max-w-7xl mx-auto">
        <div className="mb-4">
          <Badge variant="secondary">Pipeline Management</Badge>
        </div>
        <div className="grid grid-cols-4 gap-4">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-sm">New Leads</h4>
              <Badge>12</Badge>
            </div>
            <div className="space-y-2">
              <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-medium text-sm">Acme Corp</p>
                    <p className="text-xs text-muted-foreground">Sarah Johnson</p>
                  </div>
                  <Badge variant="secondary" className="text-xs">Hot</Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-2">Enterprise plan interest</p>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-primary">$12,000</span>
                  <span className="text-muted-foreground">2 days ago</span>
                </div>
              </Card>
              <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-medium text-sm">TechStart Inc</p>
                    <p className="text-xs text-muted-foreground">Mike Chen</p>
                  </div>
                  <Badge variant="secondary" className="text-xs">Warm</Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-2">Pro plan inquiry</p>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-primary">$8,500</span>
                  <span className="text-muted-foreground">1 week ago</span>
                </div>
              </Card>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-sm">Qualified</h4>
              <Badge>8</Badge>
            </div>
            <div className="space-y-2">
              <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-medium text-sm">Global Solutions</p>
                    <p className="text-xs text-muted-foreground">Emma Davis</p>
                  </div>
                  <Badge variant="secondary" className="text-xs">Hot</Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-2">Demo scheduled</p>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-primary">$15,000</span>
                  <span className="text-muted-foreground">Tomorrow</span>
                </div>
              </Card>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-sm">Proposal</h4>
              <Badge>5</Badge>
            </div>
            <div className="space-y-2">
              <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-medium text-sm">Innovate Labs</p>
                    <p className="text-xs text-muted-foreground">Alex Turner</p>
                  </div>
                  <Badge variant="secondary" className="text-xs">Hot</Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-2">Reviewing proposal</p>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-primary">$22,000</span>
                  <span className="text-muted-foreground">In review</span>
                </div>
              </Card>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-sm">Closed Won</h4>
              <Badge variant="default">3</Badge>
            </div>
            <div className="space-y-2">
              <Card className="p-4 bg-primary/5 border-primary/20">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-medium text-sm">Success Co</p>
                    <p className="text-xs text-muted-foreground">James Wilson</p>
                  </div>
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                </div>
                <p className="text-sm text-muted-foreground mb-2">Contract signed</p>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-primary">$18,500</span>
                  <span className="text-muted-foreground">Closed today</span>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* AI Assistant View - Screenshot 3 */}
      <div className="max-w-4xl mx-auto">
        <div className="mb-4">
          <Badge variant="secondary">AI-Powered Insights</Badge>
        </div>
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Zap className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">AI Assistant</h3>
              <p className="text-sm text-muted-foreground">Your intelligent business companion</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex gap-3">
              <Avatar className="w-8 h-8">
                <AvatarFallback className="bg-primary/10 text-primary text-xs">AI</AvatarFallback>
              </Avatar>
              <Card className="flex-1 p-4 bg-muted/50">
                <p className="text-sm mb-3">
                  I've analyzed your pipeline and identified 3 high-priority opportunities that need attention:
                </p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-primary" />
                    <span><strong>Acme Corp</strong> - Follow up within 24 hours (high close probability)</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-primary" />
                    <span><strong>Global Solutions</strong> - Demo prep needed for tomorrow</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-primary" />
                    <span><strong>Innovate Labs</strong> - Proposal review deadline approaching</span>
                  </div>
                </div>
              </Card>
            </div>

            <div className="flex gap-3 justify-end">
              <div className="flex gap-3 items-end max-w-md">
                <Card className="p-4 bg-primary text-primary-foreground">
                  <p className="text-sm">What's my conversion rate trend for Q1?</p>
                </Card>
                <Avatar className="w-8 h-8">
                  <AvatarFallback className="text-xs">You</AvatarFallback>
                </Avatar>
              </div>
            </div>

            <div className="flex gap-3">
              <Avatar className="w-8 h-8">
                <AvatarFallback className="bg-primary/10 text-primary text-xs">AI</AvatarFallback>
              </Avatar>
              <Card className="flex-1 p-4 bg-muted/50">
                <p className="text-sm mb-3">
                  Your Q1 conversion rate shows strong improvement:
                </p>
                <div className="bg-background p-3 rounded-lg text-sm space-y-1">
                  <div className="flex justify-between">
                    <span>January:</span>
                    <span className="font-semibold">18.2%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>February:</span>
                    <span className="font-semibold">21.5%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>March:</span>
                    <span className="font-semibold text-green-600">24.8% ↑</span>
                  </div>
                </div>
                <p className="text-sm mt-3 text-muted-foreground">
                  That's a 36% improvement quarter-over-quarter! Your AI-powered follow-ups are making a significant impact.
                </p>
              </Card>
            </div>
          </div>
        </Card>
      </div>

      {/* Activity Feed - Screenshot 4 */}
      <div className="max-w-5xl mx-auto">
        <div className="mb-4">
          <Badge variant="secondary">Activity Timeline</Badge>
        </div>
        <Card className="p-6">
          <h3 className="font-semibold mb-6">Recent Activity</h3>
          <div className="space-y-4">
            <div className="flex gap-4 items-start">
              <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center flex-shrink-0">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm"><strong>Deal Closed:</strong> Success Co - $18,500</p>
                <p className="text-xs text-muted-foreground">2 hours ago</p>
              </div>
            </div>

            <div className="flex gap-4 items-start">
              <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center flex-shrink-0">
                <Phone className="w-5 h-5 text-blue-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm"><strong>Call Scheduled:</strong> Demo with Global Solutions</p>
                <p className="text-xs text-muted-foreground">4 hours ago • Tomorrow at 2:00 PM</p>
              </div>
            </div>

            <div className="flex gap-4 items-start">
              <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center flex-shrink-0">
                <Mail className="w-5 h-5 text-purple-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm"><strong>Email Sent:</strong> Follow-up to Acme Corp</p>
                <p className="text-xs text-muted-foreground">6 hours ago • Opened 3 times</p>
              </div>
            </div>

            <div className="flex gap-4 items-start">
              <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/20 flex items-center justify-center flex-shrink-0">
                <MessageSquare className="w-5 h-5 text-orange-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm"><strong>Note Added:</strong> Product requirements discussion - TechStart Inc</p>
                <p className="text-xs text-muted-foreground">Yesterday at 3:45 PM</p>
              </div>
            </div>

            <div className="flex gap-4 items-start">
              <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/20 flex items-center justify-center flex-shrink-0">
                <Calendar className="w-5 h-5 text-indigo-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm"><strong>Task Completed:</strong> Proposal sent to Innovate Labs</p>
                <p className="text-xs text-muted-foreground">Yesterday at 11:20 AM</p>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Contacts Section - Screenshot 5 */}
      <div className="max-w-5xl mx-auto">
        <div className="mb-4">
          <Badge variant="secondary">Contact Management</Badge>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer">
            <div className="flex items-center gap-3 mb-3">
              <Avatar className="w-12 h-12">
                <AvatarFallback className="bg-primary/10 text-primary">SJ</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">Sarah Johnson</p>
                <p className="text-xs text-muted-foreground">Acme Corp</p>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Mail className="w-3 h-3" />
                <span className="text-xs">sarah.j@acme.com</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Phone className="w-3 h-3" />
                <span className="text-xs">+1 (555) 123-4567</span>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t">
              <p className="text-xs text-muted-foreground">Last contact: 2 days ago</p>
            </div>
          </Card>

          <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer">
            <div className="flex items-center gap-3 mb-3">
              <Avatar className="w-12 h-12">
                <AvatarFallback className="bg-primary/10 text-primary">MC</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">Mike Chen</p>
                <p className="text-xs text-muted-foreground">TechStart Inc</p>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Mail className="w-3 h-3" />
                <span className="text-xs">mike@techstart.io</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Phone className="w-3 h-3" />
                <span className="text-xs">+1 (555) 234-5678</span>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t">
              <p className="text-xs text-muted-foreground">Last contact: 1 week ago</p>
            </div>
          </Card>

          <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer">
            <div className="flex items-center gap-3 mb-3">
              <Avatar className="w-12 h-12">
                <AvatarFallback className="bg-primary/10 text-primary">ED</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">Emma Davis</p>
                <p className="text-xs text-muted-foreground">Global Solutions</p>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Mail className="w-3 h-3" />
                <span className="text-xs">e.davis@global.com</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Phone className="w-3 h-3" />
                <span className="text-xs">+1 (555) 345-6789</span>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t">
              <p className="text-xs text-muted-foreground">Last contact: Today</p>
            </div>
          </Card>
        </div>
      </div>

      {/* Analytics Section - Screenshot 6 */}
      <div className="max-w-7xl mx-auto">
        <div className="mb-4">
          <Badge variant="secondary">Sales Analytics</Badge>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Card className="p-6">
            <h3 className="font-semibold mb-4">Lead Sources</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Website</span>
                <div className="flex items-center gap-2">
                  <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary" style={{ width: '45%' }}></div>
                  </div>
                  <span className="text-sm font-medium w-12 text-right">45%</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Referral</span>
                <div className="flex items-center gap-2">
                  <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary" style={{ width: '30%' }}></div>
                  </div>
                  <span className="text-sm font-medium w-12 text-right">30%</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Social Media</span>
                <div className="flex items-center gap-2">
                  <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary" style={{ width: '15%' }}></div>
                  </div>
                  <span className="text-sm font-medium w-12 text-right">15%</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Direct</span>
                <div className="flex items-center gap-2">
                  <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary" style={{ width: '10%' }}></div>
                  </div>
                  <span className="text-sm font-medium w-12 text-right">10%</span>
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="font-semibold mb-4">Pipeline Health</h3>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Average Deal Size</span>
                  <span className="text-lg font-bold text-primary">$14,250</span>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Average Sales Cycle</span>
                  <span className="text-lg font-bold text-primary">28 days</span>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Win Rate</span>
                  <span className="text-lg font-bold text-green-600">24.8%</span>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Workflow Automation - Screenshot 7 */}
      <div className="max-w-7xl mx-auto">
        <div className="mb-4">
          <Badge variant="secondary">Workflow Automation</Badge>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Card className="p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Zap className="w-5 h-5 text-primary" />
              Active Automations
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Lead Auto-Assignment</p>
                    <p className="text-xs text-muted-foreground">Trigger: New lead created</p>
                  </div>
                </div>
                <Badge variant="default" className="text-xs">Active</Badge>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                    <Mail className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Follow-up Reminder</p>
                    <p className="text-xs text-muted-foreground">Trigger: 3 days no contact</p>
                  </div>
                </div>
                <Badge variant="default" className="text-xs">Active</Badge>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center">
                    <MessageSquare className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Welcome Sequence</p>
                    <p className="text-xs text-muted-foreground">Trigger: Lead stage changed</p>
                  </div>
                </div>
                <Badge variant="default" className="text-xs">Active</Badge>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="font-semibold mb-4">Automation Performance</h3>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm">Tasks Automated</span>
                  <span className="text-2xl font-bold text-primary">342</span>
                </div>
                <p className="text-xs text-muted-foreground">This month</p>
              </div>
              <div className="h-px bg-border" />
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm">Time Saved</span>
                  <span className="text-2xl font-bold text-primary">28.5h</span>
                </div>
                <p className="text-xs text-muted-foreground">Estimated hours saved</p>
              </div>
              <div className="h-px bg-border" />
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm">Success Rate</span>
                  <span className="text-2xl font-bold text-green-600">98.2%</span>
                </div>
                <p className="text-xs text-muted-foreground">Completed without errors</p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Email Campaigns - Screenshot 8 */}
      <div className="max-w-7xl mx-auto">
        <div className="mb-4">
          <Badge variant="secondary">Email Campaign Performance</Badge>
        </div>
        <Card className="p-6">
          <div className="grid grid-cols-4 gap-6 mb-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-foreground mb-1">2,847</div>
              <div className="text-sm text-muted-foreground">Sent</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-primary mb-1">68.4%</div>
              <div className="text-sm text-muted-foreground">Open Rate</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600 mb-1">24.2%</div>
              <div className="text-sm text-muted-foreground">Click Rate</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-orange-600 mb-1">0.8%</div>
              <div className="text-sm text-muted-foreground">Unsubscribe</div>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="font-semibold text-sm">Recent Campaigns</h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                <div>
                  <p className="font-medium text-sm">Q1 Product Launch</p>
                  <p className="text-xs text-muted-foreground">Sent 2 days ago</p>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <div className="text-center">
                    <div className="font-semibold">72%</div>
                    <div className="text-xs text-muted-foreground">Open</div>
                  </div>
                  <div className="text-center">
                    <div className="font-semibold">28%</div>
                    <div className="text-xs text-muted-foreground">Click</div>
                  </div>
                  <Badge variant="default" className="text-xs">Active</Badge>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                <div>
                  <p className="font-medium text-sm">Customer Success Stories</p>
                  <p className="text-xs text-muted-foreground">Sent 1 week ago</p>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <div className="text-center">
                    <div className="font-semibold">65%</div>
                    <div className="text-xs text-muted-foreground">Open</div>
                  </div>
                  <div className="text-center">
                    <div className="font-semibold">19%</div>
                    <div className="text-xs text-muted-foreground">Click</div>
                  </div>
                  <Badge variant="secondary" className="text-xs">Completed</Badge>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Team Collaboration - Screenshot 9 */}
      <div className="max-w-7xl mx-auto">
        <div className="mb-4">
          <Badge variant="secondary">Team Collaboration</Badge>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <Card className="p-6">
            <h3 className="font-semibold mb-4">Team Performance</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="w-10 h-10">
                    <AvatarFallback className="bg-primary/10 text-primary">AM</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-sm">Alice Martinez</p>
                    <p className="text-xs text-muted-foreground">12 deals closed</p>
                  </div>
                </div>
                <span className="text-sm font-semibold text-primary">$145K</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="w-10 h-10">
                    <AvatarFallback className="bg-primary/10 text-primary">BT</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-sm">Ben Thompson</p>
                    <p className="text-xs text-muted-foreground">9 deals closed</p>
                  </div>
                </div>
                <span className="text-sm font-semibold text-primary">$112K</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="w-10 h-10">
                    <AvatarFallback className="bg-primary/10 text-primary">CR</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-sm">Clara Rodriguez</p>
                    <p className="text-xs text-muted-foreground">8 deals closed</p>
                  </div>
                </div>
                <span className="text-sm font-semibold text-primary">$98K</span>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="font-semibold mb-4">Shared Notes</h3>
            <div className="space-y-3">
              <div className="p-3 bg-muted/30 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground">Alice M. • 2h ago</span>
                  <Badge variant="secondary" className="text-xs">Hot Lead</Badge>
                </div>
                <p className="text-sm">Acme Corp wants demo next week - interested in Enterprise plan</p>
              </div>
              <div className="p-3 bg-muted/30 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground">Ben T. • 5h ago</span>
                  <Badge variant="secondary" className="text-xs">Follow-up</Badge>
                </div>
                <p className="text-sm">Global Solutions asked about integration options</p>
              </div>
              <div className="p-3 bg-muted/30 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground">Clara R. • 1d ago</span>
                  <Badge variant="default" className="text-xs">Closed</Badge>
                </div>
                <p className="text-sm">Success Co signed! Contract processed ✅</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="font-semibold mb-4">Task Distribution</h3>
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm">Alice Martinez</span>
                  <span className="text-sm font-semibold">18 tasks</span>
                </div>
                <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary" style={{ width: '72%' }}></div>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm">Ben Thompson</span>
                  <span className="text-sm font-semibold">15 tasks</span>
                </div>
                <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary" style={{ width: '60%' }}></div>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm">Clara Rodriguez</span>
                  <span className="text-sm font-semibold">12 tasks</span>
                </div>
                <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary" style={{ width: '48%' }}></div>
                </div>
              </div>
              <div className="pt-3 mt-3 border-t">
                <p className="text-xs text-muted-foreground">
                  Team workload is well balanced across members
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <div className="text-center py-12">
        <p className="text-muted-foreground">
          Screenshot these sections individually for your marketing materials
        </p>
      </div>

      {/* Smart Lead Scoring */}
      <div className="max-w-7xl mx-auto">
        <div className="mb-4">
          <Badge variant="secondary">Smart Lead Scoring</Badge>
        </div>
        <Card className="p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5 text-yellow-600" />
            AI-Powered Lead Qualification
          </h3>
          <div className="grid grid-cols-3 gap-6">
            <div>
              <div className="mb-4">
                <h4 className="text-sm font-medium mb-2">Hot Leads (Score 80+)</h4>
                <div className="space-y-2">
                  {[
                    { name: "Enterprise Solutions Co", score: 95, reason: "High engagement, budget confirmed" },
                    { name: "Tech Innovators Inc", score: 88, reason: "Decision maker engaged, urgent timeline" },
                    { name: "Global Systems LLC", score: 82, reason: "Multiple touchpoints, strong fit" },
                  ].map((lead, idx) => (
                    <div key={idx} className="p-3 border rounded-lg bg-red-50 dark:bg-red-950/20">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium">{lead.name}</span>
                        <Badge className="bg-red-600">{lead.score}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{lead.reason}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            <div>
              <div className="mb-4">
                <h4 className="text-sm font-medium mb-2">Warm Leads (Score 50-79)</h4>
                <div className="space-y-2">
                  {[
                    { name: "Digital Solutions", score: 72, reason: "Actively evaluating options" },
                    { name: "Smart Business Group", score: 65, reason: "Good engagement, needs nurturing" },
                  ].map((lead, idx) => (
                    <div key={idx} className="p-3 border rounded-lg bg-orange-50 dark:bg-orange-950/20">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium">{lead.name}</span>
                        <Badge className="bg-orange-600">{lead.score}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{lead.reason}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="text-sm font-medium mb-2">Scoring Factors</h4>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Engagement Level</span>
                    <span className="font-medium">35%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary" style={{ width: '35%' }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Company Fit</span>
                    <span className="font-medium">25%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary" style={{ width: '25%' }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Budget Indication</span>
                    <span className="font-medium">20%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary" style={{ width: '20%' }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Timeline</span>
                    <span className="font-medium">20%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary" style={{ width: '20%' }}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Call Recording Analytics */}
      <div className="max-w-7xl mx-auto">
        <div className="mb-4">
          <Badge variant="secondary">Call Analytics</Badge>
        </div>
        <Card className="p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Phone className="w-5 h-5" />
            AI Call Intelligence
          </h3>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <h4 className="text-sm font-medium mb-4">Recent Call Insights</h4>
              <div className="space-y-3">
                {[
                  { 
                    contact: "Sarah Johnson - TechCorp", 
                    duration: "24:15", 
                    sentiment: "Positive",
                    keyPoints: ["Discussed pricing", "Demo scheduled", "Decision by Q1"]
                  },
                  { 
                    contact: "Mike Chen - StartupXYZ", 
                    duration: "18:42", 
                    sentiment: "Neutral",
                    keyPoints: ["Feature questions", "Competitor comparison", "Follow-up needed"]
                  },
                  { 
                    contact: "Emma Davis - Enterprise Co", 
                    duration: "31:08", 
                    sentiment: "Very Positive",
                    keyPoints: ["Contract terms agreed", "Implementation timeline", "Pilot program approved"]
                  },
                ].map((call, idx) => (
                  <div key={idx} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">{call.contact}</span>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">{call.duration}</Badge>
                        <Badge 
                          className={
                            call.sentiment === "Very Positive" ? "bg-green-600" :
                            call.sentiment === "Positive" ? "bg-blue-600" : 
                            "bg-gray-600"
                          }
                        >
                          {call.sentiment}
                        </Badge>
                      </div>
                    </div>
                    <div className="space-y-1">
                      {call.keyPoints.map((point, i) => (
                        <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                          <CheckCircle2 className="w-3 h-3 mt-0.5 flex-shrink-0" />
                          <span>{point}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div>
              <h4 className="text-sm font-medium mb-4">Call Metrics</h4>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <Card className="p-4 bg-muted/30">
                  <div className="text-2xl font-bold">187</div>
                  <div className="text-xs text-muted-foreground">Total Calls</div>
                </Card>
                <Card className="p-4 bg-muted/30">
                  <div className="text-2xl font-bold">18:24</div>
                  <div className="text-xs text-muted-foreground">Avg Duration</div>
                </Card>
                <Card className="p-4 bg-muted/30">
                  <div className="text-2xl font-bold text-green-600">76%</div>
                  <div className="text-xs text-muted-foreground">Positive Sentiment</div>
                </Card>
                <Card className="p-4 bg-muted/30">
                  <div className="text-2xl font-bold text-blue-600">42</div>
                  <div className="text-xs text-muted-foreground">Demos Booked</div>
                </Card>
              </div>
              
              <div>
                <h4 className="text-sm font-medium mb-3">Top Talk Tracks</h4>
                <div className="space-y-2">
                  {[
                    { topic: "Product Features", mentions: 89 },
                    { topic: "Pricing Discussion", mentions: 67 },
                    { topic: "Implementation", mentions: 54 },
                    { topic: "ROI & Value", mentions: 48 },
                  ].map((track, idx) => (
                    <div key={idx} className="flex items-center justify-between">
                      <span className="text-sm">{track.topic}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-primary" 
                            style={{ width: `${(track.mentions / 89) * 100}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-medium w-8 text-right">{track.mentions}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Deal Forecasting */}
      <div className="max-w-7xl mx-auto">
        <div className="mb-4">
          <Badge variant="secondary">Revenue Forecasting</Badge>
        </div>
        <Card className="p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-green-600" />
            Predictive Deal Analytics
          </h3>
          <div className="grid grid-cols-3 gap-6">
            <div className="col-span-2">
              <div className="grid grid-cols-3 gap-4 mb-6">
                <Card className="p-4 bg-green-50 dark:bg-green-950/20">
                  <div className="text-2xl font-bold text-green-600">$284K</div>
                  <div className="text-sm text-muted-foreground">Expected This Quarter</div>
                  <div className="text-xs text-green-600 mt-1">94% confidence</div>
                </Card>
                <Card className="p-4 bg-blue-50 dark:bg-blue-950/20">
                  <div className="text-2xl font-bold text-blue-600">$127K</div>
                  <div className="text-sm text-muted-foreground">Pipeline Value</div>
                  <div className="text-xs text-blue-600 mt-1">18 opportunities</div>
                </Card>
                <Card className="p-4 bg-purple-50 dark:bg-purple-950/20">
                  <div className="text-2xl font-bold text-purple-600">67%</div>
                  <div className="text-sm text-muted-foreground">Win Rate</div>
                  <div className="text-xs text-purple-600 mt-1">Above target</div>
                </Card>
              </div>
              
              <div>
                <h4 className="text-sm font-medium mb-3">High-Value Deals Closing Soon</h4>
                <div className="space-y-2">
                  {[
                    { name: "Enterprise Solutions Co", value: 125000, stage: "Negotiation", probability: 85, closeDate: "Dec 15" },
                    { name: "Tech Innovators Inc", value: 89000, stage: "Proposal", probability: 72, closeDate: "Dec 22" },
                    { name: "Digital Dynamics", value: 64000, stage: "Demo", probability: 45, closeDate: "Jan 5" },
                  ].map((deal, idx) => (
                    <div key={idx} className="p-3 border rounded-lg flex items-center justify-between">
                      <div className="flex-1">
                        <div className="font-medium text-sm">{deal.name}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">{deal.stage}</div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="font-semibold text-sm">${(deal.value / 1000).toFixed(0)}K</div>
                          <div className="text-xs text-muted-foreground">{deal.closeDate}</div>
                        </div>
                        <Badge 
                          className={
                            deal.probability >= 70 ? "bg-green-600" :
                            deal.probability >= 50 ? "bg-blue-600" :
                            "bg-orange-600"
                          }
                        >
                          {deal.probability}%
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="text-sm font-medium mb-3">Monthly Trend</h4>
              <div className="space-y-3">
                {["Oct", "Nov", "Dec", "Jan (Proj)"].map((month, idx) => {
                  const values = [185, 212, 247, 284];
                  const value = values[idx];
                  const isProjected = month.includes("Proj");
                  return (
                    <div key={idx}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className={isProjected ? "text-muted-foreground" : ""}>{month}</span>
                        <span className={`font-semibold ${isProjected ? "text-green-600" : ""}`}>
                          ${value}K
                        </span>
                      </div>
                      <div className="h-3 bg-muted rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${isProjected ? "bg-green-600" : "bg-primary"}`}
                          style={{ width: `${(value / 284) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              <div className="mt-6 p-4 bg-muted/30 rounded-lg">
                <h4 className="text-sm font-medium mb-2">Insights</h4>
                <div className="space-y-2 text-xs text-muted-foreground">
                  <p>• Q4 trending 23% above target</p>
                  <p>• Enterprise deals converting faster</p>
                  <p>• 3 at-risk deals need attention</p>
                  <p>• Best quarter on record projected</p>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Customer Segmentation */}
      <div className="max-w-7xl mx-auto">
        <div className="mb-4">
          <Badge variant="secondary">Customer Segmentation</Badge>
        </div>
        <Card className="p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Users className="w-5 h-5" />
            Smart Audience Targeting
          </h3>
          <div className="grid grid-cols-4 gap-4">
            {[
              { 
                name: "Enterprise", 
                count: 24, 
                value: "$845K", 
                growth: "+18%",
                color: "bg-purple-100 dark:bg-purple-950/20 border-purple-300",
                textColor: "text-purple-600"
              },
              { 
                name: "Mid-Market", 
                count: 67, 
                value: "$423K", 
                growth: "+24%",
                color: "bg-blue-100 dark:bg-blue-950/20 border-blue-300",
                textColor: "text-blue-600"
              },
              { 
                name: "Small Business", 
                count: 142, 
                value: "$178K", 
                growth: "+31%",
                color: "bg-green-100 dark:bg-green-950/20 border-green-300",
                textColor: "text-green-600"
              },
              { 
                name: "Startups", 
                count: 89, 
                value: "$94K", 
                growth: "+42%",
                color: "bg-orange-100 dark:bg-orange-950/20 border-orange-300",
                textColor: "text-orange-600"
              },
            ].map((segment, idx) => (
              <Card key={idx} className={`p-4 ${segment.color} border-2`}>
                <div className={`text-xl font-bold ${segment.textColor} mb-1`}>{segment.name}</div>
                <div className="text-2xl font-bold mb-2">{segment.count}</div>
                <div className="text-sm text-muted-foreground mb-1">{segment.value} revenue</div>
                <div className={`text-sm font-medium ${segment.textColor}`}>{segment.growth} growth</div>
              </Card>
            ))}
          </div>
          
          <div className="grid grid-cols-2 gap-6 mt-6">
            <div>
              <h4 className="text-sm font-medium mb-3">Behavioral Segments</h4>
              <div className="space-y-2">
                {[
                  { name: "High Engagement", contacts: 156, avgValue: "$12.4K" },
                  { name: "Price Sensitive", contacts: 94, avgValue: "$3.2K" },
                  { name: "Feature Seekers", contacts: 78, avgValue: "$8.7K" },
                  { name: "Long Sales Cycle", contacts: 45, avgValue: "$24.1K" },
                ].map((segment, idx) => (
                  <div key={idx} className="p-3 border rounded-lg flex items-center justify-between">
                    <div>
                      <div className="font-medium text-sm">{segment.name}</div>
                      <div className="text-xs text-muted-foreground">{segment.contacts} contacts</div>
                    </div>
                    <div className="text-sm font-semibold">{segment.avgValue}</div>
                  </div>
                ))}
              </div>
            </div>
            
            <div>
              <h4 className="text-sm font-medium mb-3">Industry Breakdown</h4>
              <div className="space-y-2">
                {[
                  { industry: "Technology", percentage: 34 },
                  { industry: "Healthcare", percentage: 22 },
                  { industry: "Finance", percentage: 18 },
                  { industry: "Retail", percentage: 15 },
                  { industry: "Other", percentage: 11 },
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <span className="text-sm w-24">{item.industry}</span>
                    <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary" 
                        style={{ width: `${item.percentage}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium w-12 text-right">{item.percentage}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Integration Ecosystem */}
      <div className="max-w-7xl mx-auto">
        <div className="mb-4">
          <Badge variant="secondary">Integration Ecosystem</Badge>
        </div>
        <Card className="p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5" />
            Connected Workspace
          </h3>
          <div className="grid grid-cols-3 gap-6">
            <div>
              <h4 className="text-sm font-medium mb-3">Communication</h4>
              <div className="space-y-2">
                {[
                  { name: "Twilio", status: "Active", syncs: "2.4K calls" },
                  { name: "SendGrid", status: "Active", syncs: "12.8K emails" },
                  { name: "Slack", status: "Active", syncs: "Real-time" },
                ].map((integration, idx) => (
                  <div key={idx} className="p-3 border rounded-lg flex items-center justify-between">
                    <div>
                      <div className="font-medium text-sm">{integration.name}</div>
                      <div className="text-xs text-muted-foreground">{integration.syncs}</div>
                    </div>
                    <Badge className="bg-green-600">{integration.status}</Badge>
                  </div>
                ))}
              </div>
            </div>
            
            <div>
              <h4 className="text-sm font-medium mb-3">Data & Analytics</h4>
              <div className="space-y-2">
                {[
                  { name: "Google Sheets", status: "Active", syncs: "Bi-directional" },
                  { name: "Zapier", status: "Active", syncs: "450 workflows" },
                  { name: "Webhooks", status: "Active", syncs: "Real-time events" },
                ].map((integration, idx) => (
                  <div key={idx} className="p-3 border rounded-lg flex items-center justify-between">
                    <div>
                      <div className="font-medium text-sm">{integration.name}</div>
                      <div className="text-xs text-muted-foreground">{integration.syncs}</div>
                    </div>
                    <Badge className="bg-green-600">{integration.status}</Badge>
                  </div>
                ))}
              </div>
            </div>
            
            <div>
              <h4 className="text-sm font-medium mb-3">Workflow Automation</h4>
              <div className="space-y-2">
                {[
                  { name: "Custom Workflows", status: "24 Active", syncs: "Auto-routing" },
                  { name: "AI Assistants", status: "6 Deployed", syncs: "Smart actions" },
                  { name: "API Access", status: "Enabled", syncs: "Full control" },
                ].map((integration, idx) => (
                  <div key={idx} className="p-3 border rounded-lg flex items-center justify-between">
                    <div>
                      <div className="font-medium text-sm">{integration.name}</div>
                      <div className="text-xs text-muted-foreground">{integration.syncs}</div>
                    </div>
                    <Badge className="bg-blue-600">{integration.status}</Badge>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          <div className="mt-6 p-4 bg-primary/5 rounded-lg border border-primary/20">
            <div className="flex items-start gap-3">
              <Zap className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-sm mb-1">Seamless Data Flow</h4>
                <p className="text-xs text-muted-foreground">
                  All your tools work together automatically. Data syncs in real-time across platforms, 
                  triggers workflows based on events, and keeps your team productive without manual work.
                </p>
              </div>
            </div>
          </div>
        </Card>
      </div>

    </div>
  );
};

export default Showcase;
