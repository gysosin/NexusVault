import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Save } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function Settings({ settings, onSave }) {
    const [localSettings, setLocalSettings] = useState(settings);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        setLocalSettings(settings);
    }, [settings]);

    const handleSave = () => {
        setSaving(true);
        // Simulate async save or just direct update
        setTimeout(() => {
            onSave(localSettings);
            setSaving(false);
        }, 500);
    };

    return (
        <div className="h-full p-6 animate-in fade-in duration-500 overflow-y-auto">
            <h1 className="text-3xl font-bold tracking-tight text-foreground mb-6">Settings</h1>

            <div className="grid gap-6 max-w-2xl">
                <Card className="bg-[#0d1117]/60 backdrop-blur-md border-white/10">
                    <CardHeader>
                        <CardTitle className="text-gray-100">Session Previews</CardTitle>
                        <CardDescription className="text-gray-400">
                            Configure how active sessions are previewed in the dashboard.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-4">
                            <Label className="text-gray-200">Preview Mode</Label>
                            <RadioGroup
                                value={localSettings.sessionPreviewMode}
                                onValueChange={(val) => setLocalSettings({ ...localSettings, sessionPreviewMode: val })}
                                className="grid gap-4"
                            >
                                <div className="flex items-center space-x-2 border border-white/10 rounded-lg p-4 hover:bg-white/5 transition-colors cursor-pointer">
                                    <RadioGroupItem value="hover" id="hover" className="border-white/20 text-primary" />
                                    <Label htmlFor="hover" className="flex-1 cursor-pointer">
                                        <span className="block font-medium text-gray-200">Hover Only</span>
                                        <span className="block text-xs text-gray-500 mt-1">
                                            Previews only animate when you hover over the card. Better performance.
                                        </span>
                                    </Label>
                                </div>
                                <div className="flex items-center space-x-2 border border-white/10 rounded-lg p-4 hover:bg-white/5 transition-colors cursor-pointer">
                                    <RadioGroupItem value="always" id="always" className="border-white/20 text-primary" />
                                    <Label htmlFor="always" className="flex-1 cursor-pointer">
                                        <span className="block font-medium text-gray-200">Always On</span>
                                        <span className="block text-xs text-gray-500 mt-1">
                                            All visible session cards show live terminal updates. Higher resource usage.
                                        </span>
                                    </Label>
                                </div>
                            </RadioGroup>
                        </div>

                        <div className="pt-4 flex justify-end">
                            <Button
                                onClick={handleSave}
                                disabled={saving}
                                className="bg-primary hover:bg-primary/90 text-white"
                            >
                                <Save className="mr-2 h-4 w-4" />
                                {saving ? 'Saving...' : 'Save Changes'}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
