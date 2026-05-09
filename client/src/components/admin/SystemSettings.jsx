import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Save } from 'lucide-react';
import { requestJson } from '@/api/client';

const defaultMaintenanceBanner = {
    enabled: false,
    message: '',
    severity: 'info',
};

const defaultSystemSettings = {
    allowRegistration: true,
    maintenanceMode: false,
    defaultRole: 'user',
    maintenanceBanner: defaultMaintenanceBanner,
};

const normalizeSystemSettings = (data = {}) => ({
    ...defaultSystemSettings,
    ...data,
    maintenanceBanner: {
        ...defaultMaintenanceBanner,
        ...(typeof data.maintenanceBanner === 'object' && data.maintenanceBanner !== null ? data.maintenanceBanner : {}),
    },
});

export function SystemSettings() {
    const [settings, setSettings] = useState(defaultSystemSettings);
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const data = await requestJson('/api/admin/settings');
            setSettings(normalizeSystemSettings(data));
        } catch (err) {
            console.error('Failed to fetch settings', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        const trimmedBannerMessage = settings.maintenanceBanner.message.trim();
        if (settings.maintenanceBanner.enabled && trimmedBannerMessage.length === 0) {
            toast({
                title: "Banner message required",
                description: "Add a maintenance message or turn the banner off.",
                variant: "destructive"
            });
            return;
        }

        setSaving(true);
        try {
            const payload = {
                ...settings,
                maintenanceBanner: {
                    ...settings.maintenanceBanner,
                    message: trimmedBannerMessage,
                },
            };
            await requestJson('/api/admin/settings', {
                method: 'PUT',
                body: payload
            });
            setSettings(normalizeSystemSettings(payload));
            toast({
                title: "Settings saved",
                description: "System settings have been updated successfully.",
                variant: "success"
            });
        } catch (err) {
            console.error('Failed to save settings', err);
            toast({
                title: "Error",
                description: err.message || "Failed to save settings.",
                variant: "destructive"
            });
        } finally {
            setSaving(false);
        }
    };

    const updateMaintenanceBanner = (updates) => {
        setSettings((current) => ({
            ...current,
            maintenanceBanner: {
                ...current.maintenanceBanner,
                ...updates,
            },
        }));
    };

    if (loading) return <div className="text-white p-4">Loading settings...</div>;

    return (
        <Card className="bg-black/20 border-white/10">
            <CardHeader>
                <CardTitle className="text-white">System Settings</CardTitle>
                <CardDescription className="text-gray-400">Configure global application settings.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="flex items-center justify-between space-x-2">
                    <div className="space-y-0.5">
                        <Label className="text-white">Allow Registration</Label>
                        <p className="text-sm text-gray-400">Enable or disable new user sign-ups.</p>
                    </div>
                    <Switch
                        checked={settings.allowRegistration}
                        onCheckedChange={(checked) => setSettings({ ...settings, allowRegistration: checked })}
                        className="data-[state=checked]:bg-brand-primary"
                    />
                </div>
                <div className="flex items-center justify-between space-x-2">
                    <div className="space-y-0.5">
                        <Label className="text-white">Maintenance Mode</Label>
                        <p className="text-sm text-gray-400">Prevent non-admin users from logging in.</p>
                    </div>
                    <Switch
                        checked={settings.maintenanceMode}
                        onCheckedChange={(checked) => setSettings({ ...settings, maintenanceMode: checked })}
                        className="data-[state=checked]:bg-brand-primary"
                    />
                </div>
                <div className="space-y-2">
                    <Label className="text-white">Default User Role</Label>
                    <p className="text-sm text-gray-400 mb-2">Role assigned to newly registered users.</p>
                    <Select
                        value={settings.defaultRole}
                        onValueChange={(val) => setSettings({ ...settings, defaultRole: val })}
                    >
                        <SelectTrigger className="w-[200px] bg-black/20 border-white/10 text-white">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-[#1a1f2e] border-white/10 text-white">
                            <SelectItem value="user">User</SelectItem>
                            <SelectItem value="viewer">Viewer</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="rounded-md border border-white/10 bg-white/[0.03] p-4">
                    <div className="flex items-center justify-between gap-4">
                        <div className="space-y-0.5">
                            <Label className="text-white">Maintenance Banner</Label>
                            <p className="text-sm text-gray-400">Show a global notice at the top of the dashboard.</p>
                        </div>
                        <Switch
                            checked={settings.maintenanceBanner.enabled}
                            onCheckedChange={(checked) => updateMaintenanceBanner({ enabled: checked })}
                            className="data-[state=checked]:bg-brand-primary"
                        />
                    </div>

                    <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_12rem]">
                        <div className="space-y-2">
                            <Label className="text-white" htmlFor="maintenance-banner-message">Banner Message</Label>
                            <Input
                                id="maintenance-banner-message"
                                value={settings.maintenanceBanner.message}
                                onChange={(event) => updateMaintenanceBanner({ message: event.target.value })}
                                placeholder="Planned maintenance tonight at 22:00 UTC"
                                maxLength={180}
                                disabled={!settings.maintenanceBanner.enabled}
                                className="bg-black/20 border-white/10 text-white placeholder:text-gray-500"
                            />
                            {settings.maintenanceBanner.enabled && settings.maintenanceBanner.message.trim().length === 0 && (
                                <p className="text-xs text-amber-300">A message is required before enabling the banner.</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label className="text-white">Severity</Label>
                            <Select
                                value={settings.maintenanceBanner.severity}
                                onValueChange={(val) => updateMaintenanceBanner({ severity: val })}
                                disabled={!settings.maintenanceBanner.enabled}
                            >
                                <SelectTrigger className="bg-black/20 border-white/10 text-white">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-[#1a1f2e] border-white/10 text-white">
                                    <SelectItem value="info">Info</SelectItem>
                                    <SelectItem value="warning">Warning</SelectItem>
                                    <SelectItem value="critical">Critical</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>
                <div className="pt-4">
                    <Button onClick={handleSave} disabled={saving} className="bg-brand-primary hover:bg-brand-primary/90">
                        <Save className="mr-2 h-4 w-4" />
                        {saving ? 'Saving...' : 'Save Changes'}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
