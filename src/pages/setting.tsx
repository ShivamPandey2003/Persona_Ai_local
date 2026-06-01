import { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import {
  Plus,
  RotateCcw,
  Save,
  X,
} from "lucide-react";

export default function SettingsPage() {
  const [assumptions, setAssumptions] = useState([
    "Market conditions remain relatively stable",
    "No major regulatory changes expected",
  ]);

  const [newAssumption, setNewAssumption] = useState("");

  const addAssumption = () => {
    if (!newAssumption.trim()) return;

    setAssumptions((prev) => [...prev, newAssumption.trim()]);
    setNewAssumption("");
  };

  const removeAssumption = (index: number) => {
    setAssumptions((prev) =>
      prev.filter((_, i) => i !== index)
    );
  };

  return (
    <div className="min-h-screen">
      <div className="container mx-auto max-w-4xl px-4 py-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold tracking-tight">
            Settings
          </h1>

          <p className="mt-2 text-muted-foreground">
            Configure your analysis context and display
            preferences
          </p>
        </div>

        <div className="space-y-6">
          {/* Scenario Mode */}
          <Card>
            <CardHeader>
              <CardTitle>Scenario Mode</CardTitle>

              <p className="text-sm text-muted-foreground">
                Choose the default analysis perspective
                for AI responses
              </p>
            </CardHeader>

            <CardContent className="space-y-4">
              <Tabs defaultValue="optimistic">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="optimistic">
                    Optimistic
                  </TabsTrigger>

                  <TabsTrigger value="realistic">
                    Realistic
                  </TabsTrigger>

                  <TabsTrigger value="pessimistic">
                    Pessimistic
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              <p className="text-sm text-muted-foreground">
                Emphasizes growth opportunities,
                favorable market conditions, and
                potential upsides.
              </p>
            </CardContent>
          </Card>

          {/* Time Horizon */}
          <Card>
            <CardHeader>
              <CardTitle>Time Horizon</CardTitle>

              <p className="text-sm text-muted-foreground">
                Set the default planning timeframe for
                predictions
              </p>
            </CardHeader>

            <CardContent>
              <Select defaultValue="3">
                <SelectTrigger className="max-w-xs">
                  <SelectValue placeholder="Select horizon" />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value="1">
                    1 Year
                  </SelectItem>
                  <SelectItem value="3">
                    3 Years
                  </SelectItem>
                  <SelectItem value="5">
                    5 Years
                  </SelectItem>
                  <SelectItem value="10">
                    10 Years
                  </SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Industry Context */}
          <Card>
            <CardHeader>
              <CardTitle>Industry Context</CardTitle>

              <p className="text-sm text-muted-foreground">
                Provide context about your industry and
                domain for more relevant insights
              </p>
            </CardHeader>

            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Industry
                  </label>

                  <Input
                    defaultValue="Technology"
                    placeholder="Industry"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Domain
                  </label>

                  <Input
                    defaultValue="B2B SaaS"
                    placeholder="Domain"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Current Assumptions */}
          <Card>
            <CardHeader>
              <CardTitle>Current Assumptions</CardTitle>

              <p className="text-sm text-muted-foreground">
                Define base assumptions the AI should
                consider in all analyses
              </p>
            </CardHeader>

            <CardContent className="space-y-3">
              {assumptions.map((assumption, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between rounded-md border px-3 py-2"
                >
                  <span className="text-sm">
                    {assumption}
                  </span>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      removeAssumption(index)
                    }
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}

              <div className="flex gap-2">
                <Input
                  value={newAssumption}
                  onChange={(e) =>
                    setNewAssumption(e.target.value)
                  }
                  placeholder="Add a new assumption..."
                />

                <Button onClick={addAssumption}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Display Preferences */}
          <Card>
            <CardHeader>
              <CardTitle>
                Display Preferences
              </CardTitle>

              <p className="text-sm text-muted-foreground">
                Customize how AI responses are displayed
              </p>
            </CardHeader>

            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">
                    Show Confidence Scores
                  </h4>

                  <p className="text-sm text-muted-foreground">
                    Display confidence percentages on AI
                    responses
                  </p>
                </div>

                <Switch defaultChecked />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">
                    Show Data Badges
                  </h4>

                  <p className="text-sm text-muted-foreground">
                    Display data range badges on
                    responses
                  </p>
                </div>

                <Switch defaultChecked />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">
                    Auto-expand Details
                  </h4>

                  <p className="text-sm text-muted-foreground">
                    Automatically show assumptions and
                    data signals
                  </p>
                </div>

                <Switch />
              </div>
            </CardContent>
          </Card>

          {/* Footer Actions */}
          <div className="flex justify-end gap-3">
            <Button variant="outline">
              <RotateCcw className="mr-2 h-4 w-4" />
              Reset to Defaults
            </Button>

            <Button>
              <Save className="mr-2 h-4 w-4" />
              Save Settings
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}