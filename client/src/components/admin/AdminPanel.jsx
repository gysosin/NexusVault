import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UserManagement } from './UserManagement';
import { RoleManagement } from './RoleManagement';
import { ActivityLog } from './ActivityLog';
import { AdminDashboard } from './AdminDashboard';
import { SystemSettings } from './SystemSettings';
import { SessionManagement } from './SessionManagement';
import { Shield, Users, Activity, LayoutDashboard, Settings, Power } from 'lucide-react';

export function AdminPanel() {
    const [activeTab, setActiveTab] = useState('overview');

    return (
        <div className="container mx-auto p-6 space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col space-y-2">
                <h1 className="text-3xl font-bold tracking-tight text-foreground">Admin Panel</h1>
                <p className="text-muted-foreground">
                    Manage users, roles, and view system activity.
                </p>
            </div>

            <Tabs defaultValue="overview" className="space-y-4" onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-6 lg:w-[800px]">
                    <TabsTrigger value="overview" className="flex items-center gap-2">
                        <LayoutDashboard className="h-4 w-4" />
                        Overview
                    </TabsTrigger>
                    <TabsTrigger value="users" className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Users
                    </TabsTrigger>
                    <TabsTrigger value="roles" className="flex items-center gap-2">
                        <Shield className="h-4 w-4" />
                        Roles
                    </TabsTrigger>
                    <TabsTrigger value="activity" className="flex items-center gap-2">
                        <Activity className="h-4 w-4" />
                        Activity
                    </TabsTrigger>
                    <TabsTrigger value="sessions" className="flex items-center gap-2">
                        <Power className="h-4 w-4" />
                        Sessions
                    </TabsTrigger>
                    <TabsTrigger value="settings" className="flex items-center gap-2">
                        <Settings className="h-4 w-4" />
                        Settings
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4">
                    <AdminDashboard />
                </TabsContent>

                <TabsContent value="users" className="space-y-4">
                    <UserManagement />
                </TabsContent>

                <TabsContent value="roles" className="space-y-4">
                    <RoleManagement />
                </TabsContent>

                <TabsContent value="activity" className="space-y-4">
                    <ActivityLog />
                </TabsContent>

                <TabsContent value="sessions" className="space-y-4">
                    <SessionManagement />
                </TabsContent>

                <TabsContent value="settings" className="space-y-4">
                    <SystemSettings />
                </TabsContent>
            </Tabs>
        </div>
    );
}
