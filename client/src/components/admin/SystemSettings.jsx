import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Save } from 'lucide-react';

export function SystemSettings() {
    const [settings, setSettings] = useState({
        allowRegistration: true,
        maintenanceMode: false,
        defaultRole: 'user'
    });
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const token = localStorage.getItem('auth_token');
            const res = await fetch('/api/admin/settings', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setSettings(prev => ({ ...prev, ...data }));
            }
        } catch (err) {
            console.error('Failed to fetch settings', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const token = localStorage.getItem('auth_token');
            const res = await fetch('/api/admin/settings', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(settings)
            });
            if (res.ok) {
                toast({
                    title: "Settings saved",
                    description: "System settings have been updated successfully.",
                    variant: "success"
                });
            }
        } catch (err) {
            console.error('Failed to save settings', err);
            toast({
                title: "Error",
                description: "Failed to save settings.",
                variant: "destructive"
            });
        } finally {
            setSaving(false);
        }
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
