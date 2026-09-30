"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Settings, User, Building, Bell, Shield, Paintbrush, Globe } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4 items-start sm:items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">Manage your account, organization, and preferences.</p>
        </div>
      </div>
      
      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="profile"><User className="mr-2 h-4 w-4" /> Profile</TabsTrigger>
          <TabsTrigger value="organization"><Building className="mr-2 h-4 w-4" /> Organization</TabsTrigger>
          <TabsTrigger value="notifications"><Bell className="mr-2 h-4 w-4" /> Notifications</TabsTrigger>
        </TabsList>
        
        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>Update your personal details and contact information.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 max-w-xl">
                <div className="space-y-2">
                  <Label>First Name</Label>
                  <Input defaultValue="John" />
                </div>
                <div className="space-y-2">
                  <Label>Last Name</Label>
                  <Input defaultValue="Doe" />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label>Email Address</Label>
                  <Input defaultValue="john.doe@example.com" type="email" />
                </div>
              </div>
              <Button>Save Changes</Button>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="organization">
          <Card>
            <CardHeader>
              <CardTitle>Organization Details</CardTitle>
              <CardDescription>Manage your company profile and billing.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 max-w-xl">
               <div className="space-y-2">
                  <Label>Company Name</Label>
                  <Input defaultValue="Acme Logistics" />
                </div>
                <div className="space-y-2">
                  <Label>Subscription Plan</Label>
                  <div className="flex items-center justify-between p-3 border rounded-md bg-muted/50">
                    <span className="font-medium">Business Tier</span>
                    <Button variant="outline" size="sm">Upgrade</Button>
                  </div>
                </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Alert Preferences</CardTitle>
              <CardDescription>Choose how you want to be notified of fleet events.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 max-w-xl">
               <div className="flex items-center justify-between">
                 <div className="space-y-0.5">
                   <Label className="text-base">Email Notifications</Label>
                   <p className="text-sm text-muted-foreground">Receive daily summaries and critical alerts via email.</p>
                 </div>
                 <Switch defaultChecked />
               </div>
               <div className="flex items-center justify-between">
                 <div className="space-y-0.5">
                   <Label className="text-base">Push Notifications</Label>
                   <p className="text-sm text-muted-foreground">Receive real-time alerts in your browser.</p>
                 </div>
                 <Switch defaultChecked />
               </div>
               <div className="flex items-center justify-between">
                 <div className="space-y-0.5">
                   <Label className="text-base">SMS Alerts</Label>
                   <p className="text-sm text-muted-foreground">Get text messages for critical security events only.</p>
                 </div>
                 <Switch />
               </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
