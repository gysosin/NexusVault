import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Plus } from 'lucide-react';

export function AddConnectionDialog({ onAdd }) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState({
        name: '',
        host: '',
        port: '22',
        username: '',
        password: '',
        type: 'ssh',
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await onAdd({ ...form, password: form.password });
            setOpen(false);
            setForm({ name: '', host: '', port: '22', username: '', password: '', type: 'ssh' });
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleTypeChange = (value) => {
        setForm(prev => ({
            ...prev,
            type: value,
            port: value === 'rdp' ? '3389' : '22'
        }));
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="gap-2 bg-purple-600 hover:bg-purple-700 text-white">
                    <Plus size={16} />
                    Add Connection
                </Button>
            </DialogTrigger>
            <DialogContent className="bg-brand-surface border-brand-border text-white sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Add New Connection</DialogTitle>
                    <DialogDescription className="text-gray-400">
                        Save connection details for quick access.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="type">Connection Type</Label>
                            <Select value={form.type} onValueChange={handleTypeChange}>
                                <SelectTrigger className="bg-white/5 border-white/10">
                                    <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                                <SelectContent className="bg-[#161b22] border-white/10 text-white">
                                    <SelectItem value="ssh">SSH (Secure Shell)</SelectItem>
                                    <SelectItem value="rdp">RDP (Remote Desktop)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="name">Name (Label)</Label>
                            <Input
                                id="name"
                                value={form.name}
                                onChange={(e) => setForm({ ...form, name: e.target.value })}
                                placeholder="e.g. Production Server"
                                className="bg-white/5 border-white/10"
                                required
                            />
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                            <div className="col-span-2 grid gap-2">
                                <Label htmlFor="host">Host</Label>
                                <Input
                                    id="host"
                                    value={form.host}
                                    onChange={(e) => setForm({ ...form, host: e.target.value })}
                                    placeholder="192.168.1.1"
                                    className="bg-white/5 border-white/10"
                                    required
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="port">Port</Label>
                                <Input
                                    id="port"
                                    value={form.port}
                                    onChange={(e) => setForm({ ...form, port: e.target.value })}
                                    placeholder={form.type === 'rdp' ? '3389' : '22'}
                                    className="bg-white/5 border-white/10"
                                    required
                                />
                            </div>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="username">Username</Label>
                            <Input
                                id="username"
                                value={form.username}
                                onChange={(e) => setForm({ ...form, username: e.target.value })}
                                placeholder="root"
                                className="bg-white/5 border-white/10"
                                required
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="password">Password (Optional)</Label>
                            <Input
                                id="password"
                                type="password"
                                value={form.password || ''}
                                onChange={(e) => setForm({ ...form, password: e.target.value })}
                                placeholder="••••••••"
                                className="bg-white/5 border-white/10"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="submit" disabled={loading} className="bg-purple-600 hover:bg-purple-700">
                            {loading ? 'Saving...' : 'Save Connection'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
