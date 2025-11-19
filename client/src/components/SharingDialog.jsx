import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Check, Search, User, Shield } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

const MOCK_RECIPIENTS = [
    { id: 1, name: 'John Doe', type: 'user', avatar: 'JD' },
    { id: 2, name: 'Alice Smith', type: 'user', avatar: 'AS' },
    { id: 3, name: 'Dev Team', type: 'role', avatar: 'DT' },
    { id: 4, name: 'QA Team', type: 'role', avatar: 'QA' },
];

export function SharingDialog({ open, onOpenChange, connectionName }) {
    const [search, setSearch] = useState('');
    const [selected, setSelected] = useState([]);

    const toggleSelection = (id) => {
        setSelected(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const filteredRecipients = MOCK_RECIPIENTS.filter(r =>
        r.name.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Share "{connectionName}"</DialogTitle>
                    <DialogDescription>
                        Share this connection with other users or roles.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="flex items-center gap-2">
                        <Search className="h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search users or roles..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="flex-1"
                        />
                    </div>
                    <ScrollArea className="h-[200px] rounded-md border p-2">
                        <div className="space-y-2">
                            {filteredRecipients.map((recipient) => (
                                <div
                                    key={recipient.id}
                                    className={`flex items-center justify-between p-2 rounded-md cursor-pointer transition-colors ${selected.includes(recipient.id) ? 'bg-accent' : 'hover:bg-muted'}`}
                                    onClick={() => toggleSelection(recipient.id)}
                                >
                                    <div className="flex items-center gap-3">
                                        <Avatar className="h-8 w-8">
                                            <AvatarFallback>{recipient.avatar}</AvatarFallback>
                                        </Avatar>
                                        <div className="flex flex-col">
                                            <span className="text-sm font-medium">{recipient.name}</span>
                                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                                                {recipient.type === 'user' ? <User className="h-3 w-3" /> : <Shield className="h-3 w-3" />}
                                                {recipient.type}
                                            </span>
                                        </div>
                                    </div>
                                    {selected.includes(recipient.id) && <Check className="h-4 w-4 text-primary" />}
                                </div>
                            ))}
                            {filteredRecipients.length === 0 && (
                                <div className="text-center text-sm text-muted-foreground py-4">
                                    No users or roles found.
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={() => onOpenChange(false)} disabled={selected.length === 0}>
                        Share with {selected.length} recipient{selected.length !== 1 && 's'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
