import { useState, useEffect, useMemo } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  createColumnHelper,
  type SortingState,
} from "@tanstack/react-table";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/PageHeader";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, Plus, Mail, Phone, Calendar, Pencil, Check, X, Trash2, ArrowUpDown, ArrowUp, ArrowDown, Download } from "lucide-react";
import JSZip from "jszip";
import Papa from "papaparse";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { DuplicateReviewDialog } from "@/components/duplicates/DuplicateReviewDialog";
import { useNavigate } from "react-router-dom";


interface Contact {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  created_at: string;
}

const columnHelper = createColumnHelper<Contact>();

const SortIcon = ({ sorted }: { sorted: false | "asc" | "desc" }) => {
  if (!sorted) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-50" />;
  return sorted === "asc"
    ? <ArrowUp className="h-3 w-3 ml-1" />
    : <ArrowDown className="h-3 w-3 ml-1" />;
};

const Contacts = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 50;
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<Contact>>({});
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [contactToDelete, setContactToDelete] = useState<string | null>(null);
  const [duplicatesDialogOpen, setDuplicatesDialogOpen] = useState(false);
  const [sorting, setSorting] = useState<SortingState>([]);
  const { toast } = useToast();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
  });

  const fetchContacts = async () => {
    setLoading(true);
    
    // Get total count
    const { count } = await supabase
      .from("contacts" as any)
      .select("*", { count: 'exact', head: true });
    
    setTotalCount(count || 0);

    // Fetch paginated data
    const { data, error } = await supabase
      .from("contacts" as any)
      .select("*")
      .order("created_at", { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1);

    if (error) {
      console.error("Error fetching contacts:", error);
      toast({
        title: "Error",
        description: "Failed to load contacts",
        variant: "destructive",
      });
    } else {
      setContacts((data as any) || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchContacts();
  }, [page]);

  useEffect(() => {
    // Set up real-time subscription for contacts
    const channel = supabase
      .channel('contacts-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'contacts'
        },
        () => {
          fetchContacts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const { error } = await supabase.from("contacts" as any).insert({
      name: formData.name,
      email: formData.email || null,
      phone: formData.phone || null,
      company: formData.company || null,
    });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to add contact",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Contact added successfully",
      });
      setFormData({ name: "", email: "", phone: "", company: "" });
      setDialogOpen(false);
      fetchContacts();
    }
  };

  const startEditing = (contact: Contact) => {
    setEditingId(contact.id);
    setEditData({
      name: contact.name,
      email: contact.email || "",
      phone: contact.phone || "",
      company: contact.company || "",
    });
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditData({});
  };

  const saveEdit = async (contactId: string) => {
    const { error } = await supabase
      .from("contacts" as any)
      .update(editData)
      .eq("id", contactId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update contact",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Contact updated successfully",
      });
      setEditingId(null);
      setEditData({});
      fetchContacts();
    }
  };

  const openDeleteDialog = (contactId: string) => {
    setContactToDelete(contactId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteContact = async () => {
    if (!contactToDelete) return;
    
    setLoading(true);
    try {
      // Delete the contact - cascading will handle related records based on FK constraints
      const { error } = await supabase
        .from("contacts" as any)
        .delete()
        .eq("id", contactToDelete);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Contact deleted successfully",
      });
      setDeleteDialogOpen(false);
      setContactToDelete(null);
      fetchContacts();
    } catch (error) {
      console.error("Error deleting contact:", error);
      toast({
        title: "Error",
        description: "Failed to delete contact",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredContacts = contacts.filter(
    (contact) =>
      contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.phone?.includes(searchQuery) ||
      contact.company?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const columns = useMemo(
    () => [
      columnHelper.accessor("name", {
        header: "Name",
        cell: (info) => info.getValue(),
      }),
      columnHelper.accessor("email", {
        header: "Email",
        cell: (info) => info.getValue() ?? "",
      }),
      columnHelper.accessor("phone", {
        header: "Phone",
        cell: (info) => info.getValue() ?? "",
      }),
      columnHelper.accessor("company", {
        header: "Company",
        cell: (info) => info.getValue() ?? "",
      }),
      columnHelper.accessor("created_at", {
        header: "Created",
        cell: (info) => info.getValue(),
      }),
    ],
    []
  );

  const table = useReactTable({
    data: filteredContacts,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  const sortedContacts = table.getRowModel().rows.map((row) => row.original);

  const handleFindDuplicates = () => setDuplicatesDialogOpen(true);

  const handleExportZip = async () => {
    if (!sortedContacts.length) return;

    const zip = new JSZip();
    zip.file(
      "contacts.csv",
      Papa.unparse(
        sortedContacts.map((contact) => ({
          name: contact.name,
          email: contact.email || "",
          phone: contact.phone || "",
          company: contact.company || "",
          created_at: contact.created_at,
        }))
      )
    );
    zip.file(
      "summary.json",
      JSON.stringify(
        {
          exportedAt: new Date().toISOString(),
          count: sortedContacts.length,
          searchQuery,
        },
        null,
        2
      )
    );

    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `contacts-${new Date().toISOString().slice(0, 10)}.zip`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <PageHeader
        eyebrow="Relationships"
        title="Contacts"
        description="Manage your contact database — every person you've ever interacted with."
        actions={
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" onClick={handleFindDuplicates} disabled={loading} size="sm">
              <Search className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Find Duplicates</span>
              <span className="sm:hidden">Dupes</span>
            </Button>
            <Button variant="outline" onClick={handleExportZip} disabled={!sortedContacts.length} size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export ZIP
            </Button>
            <Button size="sm" onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Contact
            </Button>
          </div>
        }
      />
      {/* Add-contact dialog (trigger lives in the PageHeader above) */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Contact</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="company">Company</Label>
                <Input
                  id="company"
                  value={formData.company}
                  onChange={(e) =>
                    setFormData({ ...formData, company: e.target.value })
                  }
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">Add Contact</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

      <Card className="p-4 md:p-6">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-4 md:mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search contacts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 w-full"
            />
          </div>
          <div className="text-sm text-muted-foreground text-center sm:text-left">
            Total {sortedContacts.length} records
          </div>
        </div>

        {loading ? (
          <div className="space-y-2">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="h-16 bg-muted/50 animate-pulse rounded" />
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto -mx-4 md:mx-0">
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header, idx) => {
                      const canSort = header.column.getCanSort();
                      const sorted = header.column.getIsSorted();
                      const responsiveClass =
                        idx === 2 ? "hidden md:table-cell min-w-[120px]" :
                        idx === 3 ? "hidden lg:table-cell min-w-[120px]" :
                        idx === 4 ? "hidden xl:table-cell" :
                        idx === 0 ? "min-w-[120px]" :
                        idx === 1 ? "min-w-[150px]" : "";
                      return (
                        <TableHead
                          key={header.id}
                          className={responsiveClass}
                          onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                          style={canSort ? { cursor: "pointer", userSelect: "none" } : undefined}
                        >
                          <span className="inline-flex items-center">
                            {flexRender(header.column.columnDef.header, header.getContext())}
                            {canSort && <SortIcon sorted={sorted} />}
                          </span>
                        </TableHead>
                      );
                    })}
                    <TableHead className="w-24">Actions</TableHead>
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {sortedContacts.map((contact) => {
                  const isEditing = editingId === contact.id;
                  
                  return (
                    <TableRow key={contact.id} className="hover:bg-muted/50">
                      <TableCell className="font-medium">
                        {isEditing ? (
                          <Input
                            value={editData.name}
                            onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                            className="h-8"
                          />
                        ) : (
                          <div 
                            className="cursor-pointer rounded-md px-1 py-0.5 transition-colors hover:bg-primary/10 hover:text-primary"
                            onClick={() => navigate(`/contacts/${contact.id}`)}
                          >
                            {contact.name}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <Input
                            type="email"
                            value={editData.email}
                            onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                            className="h-8"
                          />
                        ) : (
                          contact.email && (
                            <div className="flex items-center gap-2 text-muted-foreground truncate max-w-[200px]">
                              <Mail className="h-3 w-3 flex-shrink-0" />
                              {contact.email}
                            </div>
                          )
                        )}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {isEditing ? (
                          <Input
                            value={editData.phone}
                            onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                            className="h-8"
                          />
                        ) : (
                          contact.phone && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Phone className="h-3 w-3" />
                              {contact.phone}
                            </div>
                          )
                        )}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {isEditing ? (
                          <Input
                            value={editData.company}
                            onChange={(e) => setEditData({ ...editData, company: e.target.value })}
                            className="h-8"
                          />
                        ) : (
                          <div className="text-muted-foreground">{contact.company || "-"}</div>
                        )}
                      </TableCell>
                      <TableCell className="hidden xl:table-cell">
                        <div className="flex items-center gap-2 text-muted-foreground text-sm">
                          <Calendar className="h-3 w-3" />
                          {new Date(contact.created_at).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell>
                      {isEditing ? (
                        <div className="flex gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={() => saveEdit(contact.id)}
                          >
                            <Check className="h-4 w-4 text-green-600" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={cancelEditing}
                          >
                            <X className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={(e) => {
                              e.stopPropagation();
                              startEditing(contact);
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={(e) => {
                              e.stopPropagation();
                              openDeleteDialog(contact.id);
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          </div>
        )}
        
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Contact</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this contact? All associated activities, tasks, and call logs will be preserved but unlinked from this contact.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteContact}>Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <DuplicateReviewDialog
          open={duplicatesDialogOpen}
          onOpenChange={(o) => { setDuplicatesDialogOpen(o); if (!o) fetchContacts(); }}
          table="contacts"
        />
        
        {!loading && totalCount > pageSize && (
          <div className="flex items-center justify-between px-2 py-4 border-t mt-4">
            <div className="text-sm text-muted-foreground">
              Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, totalCount)} of {totalCount} contacts
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => p + 1)}
                disabled={page * pageSize >= totalCount}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default Contacts;
