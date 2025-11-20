import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Circle, Clock, ArrowRight } from 'lucide-react';

export const PlanPage = () => {
    const roadmap = [
        {
            phase: "Phase 1: Foundation",
            status: "completed",
            items: [
                "Initial Project Setup",
                "Basic Authentication (Login/Register)",
                "SSH Connection Handling",
                "Basic Terminal Interface"
            ]
        },
        {
            phase: "Phase 2: Core Features",
            status: "completed",
            items: [
                "RDP Protocol Support",
                "Session Management Dashboard",
                "Live Session Previews",
                "Persistent Terminal Sessions"
            ]
        },
        {
            phase: "Phase 3: Advanced Monitoring & Analytics",
            status: "planned",
            items: [
                "System Telemetry & Logging",
                "Real-time Performance Graphs",
                "AI-Powered Anomaly Detection",
                "Mobile Responsive Layout Optimization"
            ]
        },
        {
            phase: "Phase 4: AI Revolution",
            status: "planned",
            items: [
                "AI Session Assistant",
                "Automated Plan Generation",
                "Natural Language Command Interface",
                "Intelligent Security Auditing"
            ]
        }
    ];

    const getStatusIcon = (status) => {
        switch (status) {
            case 'completed':
                return <CheckCircle2 className="w-5 h-5 text-green-500" />;
            case 'in-progress':
                return <Clock className="w-5 h-5 text-blue-500 animate-pulse" />;
            default:
                return <Circle className="w-5 h-5 text-gray-500" />;
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'completed':
                return "border-green-500/20 bg-green-500/5";
            case 'in-progress':
                return "border-blue-500/20 bg-blue-500/5";
            default:
                return "border-white/5 bg-white/5";
        }
    };

    return (
        <div className="h-full p-8 overflow-y-auto animate-in fade-in duration-500">
            <div className="max-w-4xl mx-auto space-y-8">
                <div className="space-y-2">
                    <h1 className="text-3xl font-bold tracking-tight text-white">Implementation Plan</h1>
                    <p className="text-gray-400">Project roadmap and future development goals.</p>
                </div>

                <div className="grid gap-6">
                    {roadmap.map((phase, index) => (
                        <Card key={index} className={`border ${getStatusColor(phase.status)} backdrop-blur-sm`}>
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        {getStatusIcon(phase.status)}
                                        <CardTitle className="text-xl text-gray-200">{phase.phase}</CardTitle>
                                    </div>
                                    <Badge variant="outline" className="capitalize bg-black/20 border-white/10">
                                        {phase.status.replace('-', ' ')}
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <ul className="space-y-3">
                                    {phase.items.map((item, i) => (
                                        <li key={i} className="flex items-center gap-3 text-gray-300">
                                            <ArrowRight className="w-4 h-4 text-gray-500" />
                                            <span>{item}</span>
                                        </li>
                                    ))}
                                </ul>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        </div>
    );
};
