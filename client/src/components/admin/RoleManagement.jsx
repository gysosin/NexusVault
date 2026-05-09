import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { requestJson } from '@/api/client';

const PERMISSIONS = [
    { id: 'manage_users', label: 'Manage Users' },
    { id: 'manage_roles', label: 'Manage Roles' },
    { id: 'manage_connections', label: 'Manage Connections' },
    { id: 'share_connections', label: 'Share Connections' },
    { id: 'view_audit', label: 'View Audit Logs' },
];

export function RoleManagement() {
    const [roles, setRoles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isAddRoleOpen, setIsAddRoleOpen] = useState(false);
    const [newRole, setNewRole] = useState({ name: '', description: '', permissions: [] });

    useEffect(() => {
        fetchRoles();
    }, []);

    const fetchRoles = async () => {
        try {
            const data = await requestJson('/api/admin/roles');
            setRoles(data);
        } catch (err) {
            console.error('Failed to fetch roles', err);
        } finally {
            setLoading(false);
        }
    };

    const handleAddRole = async () => {
        try {
            const id = newRole.name.toLowerCase().replace(/\s+/g, '_');
            await requestJson('/api/admin/roles', {
                method: 'POST',
                body: { ...newRole, id }
            });
            fetchRoles();
            setIsAddRoleOpen(false);
            setNewRole({ name: '', description: '', permissions: [] });
        } catch (err) {
            console.error('Failed to create role', err);
        }
    };

    const handleDeleteRole = async (id) => {
        if (!confirm('Are you sure you want to delete this role?')) return;
        try {
            await requestJson(`/api/admin/roles/${id}`, {
                method: 'DELETE'
            });
            fetchRoles();
        } catch (err) {
            console.error('Failed to delete role', err);
        }
    };

    const togglePermission = (permId) => {
        setNewRole(prev => {
            const perms = prev.permissions.includes(permId)
                ? prev.permissions.filter(p => p !== permId)
                : [...prev.permissions, permId];
            return { ...prev, permissions: perms };
        });
    };

    if (loading) return <div className="text-white p-4">Loading roles...</div>;

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-white">Roles & Permissions</h2>
                <Button onClick={() => setIsAddRoleOpen(true)} className="bg-brand-primary hover:bg-brand-primary/90 flex items-center gap-2">
                    <Plus className="h-4 w-4" /> Create Role
                </Button>
            </div>
            <div className="rounded-md border border-white/10 bg-black/20">
                <Table>
                    <TableHeader>
                        <TableRow className="border-white/10 hover:bg-white/5">
                            <TableHead className="w-[200px] text-gray-400">Role Name</TableHead>
                            <TableHead className="text-gray-400">Description</TableHead>
                            <TableHead className="text-gray-400">Permissions</TableHead>
                            <TableHead className="text-right text-gray-400">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {roles.map((role) => (
                            <TableRow key={role.id} className="border-white/10 hover:bg-white/5">
                                <TableCell className="font-medium text-white">
                                    <div className="flex items-center gap-2">
                                        {role.name}
                                        {['admin', 'user', 'viewer'].includes(role.id) && <Badge variant="outline" className="text-xs border-blue-500/20 text-blue-400">System</Badge>}
                                    </div>
                                </TableCell>
                                <TableCell className="text-gray-300">{role.description}</TableCell>
                                <TableCell>
                                    <div className="flex flex-wrap gap-1">
                                        {role.permissions.map(p => (
                                            <Badge key={p} variant="secondary" className="text-xs bg-white/10 text-gray-300 hover:bg-white/20">
                                                {PERMISSIONS.find(perm => perm.id === p)?.label || p}
                                            </Badge>
                                        ))}
                                        {role.permissions.length === 0 && <span className="text-gray-500 text-sm italic">No permissions</span>}
                                    </div>
                                </TableCell>
                                <TableCell className="text-right">
                                    {!['admin', 'user', 'viewer'].includes(role.id) && (
                                        <Button variant="ghost" size="icon" onClick={() => handleDeleteRole(role.id)} className="text-red-400 hover:text-red-300 hover:bg-red-500/10">
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    )}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            <Dialog open={isAddRoleOpen} onOpenChange={setIsAddRoleOpen}>
                <DialogContent className="bg-[#1a1f2e] border-white/10 text-white">
                    <DialogHeader>
                        <DialogTitle>Create New Role</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Role Name</Label>
                            <Input
                                value={newRole.name}
                                onChange={(e) => setNewRole({ ...newRole, name: e.target.value })}
                                className="bg-black/20 border-white/10"
                                placeholder="e.g. Editor"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Description</Label>
                            <Input
                                value={newRole.description}
                                onChange={(e) => setNewRole({ ...newRole, description: e.target.value })}
                                className="bg-black/20 border-white/10"
                                placeholder="Role description"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Permissions</Label>
                            <div className="grid grid-cols-2 gap-2 border border-white/10 rounded-md p-4 bg-black/20">
                                {PERMISSIONS.map((perm) => (
                                    <div key={perm.id} className="flex items-center space-x-2">
                                        <Checkbox
                                            id={perm.id}
                                            checked={newRole.permissions.includes(perm.id)}
                                            onCheckedChange={() => togglePermission(perm.id)}
                                            className="border-white/20 data-[state=checked]:bg-brand-primary"
                                        />
                                        <label
                                            htmlFor={perm.id}
                                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-gray-300"
                                        >
                                            {perm.label}
                                        </label>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsAddRoleOpen(false)} className="border-white/10 hover:bg-white/5 text-gray-300">
                            Cancel
                        </Button>
                        <Button onClick={handleAddRole} className="bg-brand-primary hover:bg-brand-primary/90">
                            Create Role
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
