import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Pencil, Trash2, Package, FolderTree, Users } from "lucide-react";
import { toast } from "sonner";
import { ProgramRosterSheet } from "@/components/rosters/ProgramRosterSheet";

// More flexible item types to handle various business scenarios
const ITEM_TYPES = [
  { value: "product", label: "Product" },
  { value: "service", label: "Service" },
  { value: "fee", label: "Fee" },
  { value: "class", label: "Class" },
  { value: "clinic", label: "Clinic" },
  { value: "lesson", label: "Lesson (Private)" },
  { value: "membership", label: "Membership" },
  { value: "drop-in", label: "Drop-In" },
  { value: "camp", label: "Camp" },
  { value: "tournament", label: "Tournament" },
  { value: "adjustment", label: "Adjustment" },
  { value: "gift-certificate", label: "Gift Certificate" },
  { value: "other", label: "Other" },
];

interface ItemCategory {
  id: string;
  name: string;
  description: string | null;
  category_number: string | null;
  parent_category: string | null;
  is_active: boolean;
}

interface Item {
  id: string;
  title: string;
  description: string | null;
  price: number;
  item_type: string;
  category_id: string | null;
  is_active: boolean;
  created_at: string;
}

export function ItemsManager() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("items");
  const [rosterFor, setRosterFor] = useState<{ id: string; title: string } | null>(null);
  const [currentWorkspaceId, setCurrentWorkspaceId] = useState<string | null>(null);
  // Item dialog state
  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [itemFormData, setItemFormData] = useState({
    title: "",
    description: "",
    price: "",
    item_type: "product",
    category_id: "",
  });

  // Category dialog state
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ItemCategory | null>(null);
  const [categoryFormData, setCategoryFormData] = useState({
    name: "",
    description: "",
    category_number: "",
    parent_category: "",
  });

  // Fetch workspace ID helper
  const getWorkspaceId = async () => {
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .single();
    
    if (!profile) throw new Error("No profile found");

    const { data: workspace } = await supabase
      .from('workspace_members')
      .select('workspace_id')
      .eq('user_id', profile.id)
      .single();

    if (!workspace) throw new Error("No workspace found");
    return workspace.workspace_id;
  };

  // Cache workspace id for child sheets
  useQuery({
    queryKey: ['items-manager-ws'],
    queryFn: async () => {
      const id = await getWorkspaceId();
      setCurrentWorkspaceId(id);
      return id;
    },
  });

  // Fetch categories
  const { data: categories, isLoading: categoriesLoading } = useQuery({
    queryKey: ['item-categories'],
    queryFn: async () => {
      const workspaceId = await getWorkspaceId();
      const { data, error } = await supabase
        .from('item_categories')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('name');

      if (error) throw error;
      return data as ItemCategory[];
    }
  });

  // Fetch items
  const { data: items, isLoading: itemsLoading } = useQuery({
    queryKey: ['items'],
    queryFn: async () => {
      const workspaceId = await getWorkspaceId();
      const { data, error } = await supabase
        .from('items')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Item[];
    }
  });

  // Create item mutation
  const createItem = useMutation({
    mutationFn: async (data: typeof itemFormData) => {
      const workspaceId = await getWorkspaceId();
      const { error } = await supabase
        .from('items')
        .insert({
          workspace_id: workspaceId,
          title: data.title,
          description: data.description || null,
          price: parseFloat(data.price) || 0,
          item_type: data.item_type,
          category_id: data.category_id && data.category_id !== 'none' ? data.category_id : null,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items'] });
      toast.success("Item created successfully");
      resetItemForm();
    },
    onError: (error) => {
      toast.error("Failed to create item: " + error.message);
    }
  });

  // Update item mutation
  const updateItem = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Item> }) => {
      const { error } = await supabase
        .from('items')
        .update(data)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items'] });
      toast.success("Item updated successfully");
      resetItemForm();
    },
    onError: (error) => {
      toast.error("Failed to update item: " + error.message);
    }
  });

  // Delete item mutation
  const deleteItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('items')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items'] });
      toast.success("Item deleted");
    },
    onError: (error) => {
      toast.error("Failed to delete item: " + error.message);
    }
  });

  // Create category mutation
  const createCategory = useMutation({
    mutationFn: async (data: typeof categoryFormData) => {
      const workspaceId = await getWorkspaceId();
      const { error } = await supabase
        .from('item_categories')
        .insert({
          workspace_id: workspaceId,
          name: data.name,
          description: data.description || null,
          category_number: data.category_number || null,
          parent_category: data.parent_category || null,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['item-categories'] });
      toast.success("Category created successfully");
      resetCategoryForm();
    },
    onError: (error) => {
      toast.error("Failed to create category: " + error.message);
    }
  });

  // Update category mutation
  const updateCategory = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<ItemCategory> }) => {
      const { error } = await supabase
        .from('item_categories')
        .update(data)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['item-categories'] });
      toast.success("Category updated successfully");
      resetCategoryForm();
    },
    onError: (error) => {
      toast.error("Failed to update category: " + error.message);
    }
  });

  // Delete category mutation
  const deleteCategory = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('item_categories')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['item-categories'] });
      toast.success("Category deleted");
    },
    onError: (error) => {
      toast.error("Failed to delete category: " + error.message);
    }
  });

  const resetItemForm = () => {
    setItemFormData({ title: "", description: "", price: "", item_type: "product", category_id: "" });
    setEditingItem(null);
    setItemDialogOpen(false);
  };

  const resetCategoryForm = () => {
    setCategoryFormData({ name: "", description: "", category_number: "", parent_category: "" });
    setEditingCategory(null);
    setCategoryDialogOpen(false);
  };

  const handleItemSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemFormData.title.trim()) {
      toast.error("Title is required");
      return;
    }
    if (editingItem) {
      updateItem.mutate({
        id: editingItem.id,
        data: {
          title: itemFormData.title,
          description: itemFormData.description || null,
          price: parseFloat(itemFormData.price) || 0,
          item_type: itemFormData.item_type,
          category_id: itemFormData.category_id || null,
        }
      });
    } else {
      createItem.mutate(itemFormData);
    }
  };

  const handleCategorySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryFormData.name.trim()) {
      toast.error("Name is required");
      return;
    }
    if (editingCategory) {
      updateCategory.mutate({
        id: editingCategory.id,
        data: {
          name: categoryFormData.name,
          description: categoryFormData.description || null,
          category_number: categoryFormData.category_number || null,
          parent_category: categoryFormData.parent_category || null,
        }
      });
    } else {
      createCategory.mutate(categoryFormData);
    }
  };

  const openEditItem = (item: Item) => {
    setEditingItem(item);
    setItemFormData({
      title: item.title,
      description: item.description || "",
      price: item.price.toString(),
      item_type: item.item_type,
      category_id: item.category_id || "",
    });
    setItemDialogOpen(true);
  };

  const openEditCategory = (category: ItemCategory) => {
    setEditingCategory(category);
    setCategoryFormData({
      name: category.name,
      description: category.description || "",
      category_number: category.category_number || "",
      parent_category: category.parent_category || "",
    });
    setCategoryDialogOpen(true);
  };

  const toggleItemActive = (item: Item) => {
    updateItem.mutate({
      id: item.id,
      data: { is_active: !item.is_active }
    });
  };

  const toggleCategoryActive = (category: ItemCategory) => {
    updateCategory.mutate({
      id: category.id,
      data: { is_active: !category.is_active }
    });
  };

  const getCategoryName = (categoryId: string | null) => {
    if (!categoryId || !categories) return null;
    return categories.find(c => c.id === categoryId)?.name;
  };

  const getItemTypeLabel = (type: string) => {
    return ITEM_TYPES.find(t => t.value === type)?.label || type;
  };

  return (
    <>
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Products & Services</CardTitle>
        <p className="text-sm text-muted-foreground">
          Manage items and categories for point of sale
        </p>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="items">Items</TabsTrigger>
            <TabsTrigger value="categories">Categories</TabsTrigger>
          </TabsList>

          {/* Items Tab */}
          <TabsContent value="items" className="space-y-4">
            <div className="flex justify-end">
              <Dialog open={itemDialogOpen} onOpenChange={(open) => {
                setItemDialogOpen(open);
                if (!open) resetItemForm();
              }}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Item
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{editingItem ? "Edit Item" : "Add New Item"}</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleItemSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="title">Title *</Label>
                      <Input
                        id="title"
                        value={itemFormData.title}
                        onChange={(e) => setItemFormData({ ...itemFormData, title: e.target.value })}
                        placeholder="e.g., Group Session, Private Lesson, Membership"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description">Description</Label>
                      <Input
                        id="description"
                        value={itemFormData.description}
                        onChange={(e) => setItemFormData({ ...itemFormData, description: e.target.value })}
                        placeholder="Optional description"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="price">Price ($)</Label>
                        <Input
                          id="price"
                          type="number"
                          step="0.01"
                          min="0"
                          value={itemFormData.price}
                          onChange={(e) => setItemFormData({ ...itemFormData, price: e.target.value })}
                          placeholder="0.00"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="type">Type</Label>
                        <Select
                          value={itemFormData.item_type}
                          onValueChange={(value) => setItemFormData({ ...itemFormData, item_type: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ITEM_TYPES.map(type => (
                              <SelectItem key={type.value} value={type.value}>
                                {type.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="category">Category (Optional)</Label>
                      <Select
                        value={itemFormData.category_id}
                        onValueChange={(value) => setItemFormData({ ...itemFormData, category_id: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No Category</SelectItem>
                          {categories?.filter(c => c.is_active).map(category => (
                            <SelectItem key={category.id} value={category.id}>
                              {category.name}
                              {category.category_number && ` (${category.category_number})`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex justify-end gap-2 pt-4">
                      <Button type="button" variant="outline" onClick={resetItemForm}>
                        Cancel
                      </Button>
                      <Button type="submit" disabled={createItem.isPending || updateItem.isPending}>
                        {editingItem ? "Update" : "Create"} Item
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            {itemsLoading ? (
              <p className="text-muted-foreground text-center py-8">Loading items...</p>
            ) : !items || items.length === 0 ? (
              <div className="text-center py-12">
                <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-medium mb-2">No items yet</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Add products, services, classes, fees, or lessons to sell
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-center">Active</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{item.title}</div>
                          {item.description && (
                            <div className="text-xs text-muted-foreground">{item.description}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {getItemTypeLabel(item.item_type)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {getCategoryName(item.category_id) || (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        ${item.price.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Switch
                          checked={item.is_active}
                          onCheckedChange={() => toggleItemActive(item)}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {["class", "clinic", "camp", "membership", "lesson", "tournament"].includes(item.item_type) && (
                            <Button
                              size="icon"
                              variant="ghost"
                              title="View roster"
                              onClick={() => setRosterFor({ id: item.id, title: item.title })}
                            >
                              <Users className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => openEditItem(item)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="text-destructive hover:text-destructive"
                            onClick={() => deleteItem.mutate(item.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </TabsContent>

          {/* Categories Tab */}
          <TabsContent value="categories" className="space-y-4">
            <div className="flex justify-end">
              <Dialog open={categoryDialogOpen} onOpenChange={(open) => {
                setCategoryDialogOpen(open);
                if (!open) resetCategoryForm();
              }}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Category
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{editingCategory ? "Edit Category" : "Add New Category"}</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleCategorySubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="cat-name">Name *</Label>
                      <Input
                        id="cat-name"
                        value={categoryFormData.name}
                        onChange={(e) => setCategoryFormData({ ...categoryFormData, name: e.target.value })}
                        placeholder="e.g., Group Programs"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cat-description">Description</Label>
                      <Input
                        id="cat-description"
                        value={categoryFormData.description}
                        onChange={(e) => setCategoryFormData({ ...categoryFormData, description: e.target.value })}
                        placeholder="Optional description"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="cat-number">Category Number</Label>
                        <Input
                          id="cat-number"
                          value={categoryFormData.category_number}
                          onChange={(e) => setCategoryFormData({ ...categoryFormData, category_number: e.target.value })}
                          placeholder="e.g., 421"
                        />
                        <p className="text-xs text-muted-foreground">For accounting reference</p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="cat-parent">Parent Category</Label>
                        <Input
                          id="cat-parent"
                          value={categoryFormData.parent_category}
                          onChange={(e) => setCategoryFormData({ ...categoryFormData, parent_category: e.target.value })}
                          placeholder="e.g., PROGRAMS"
                        />
                        <p className="text-xs text-muted-foreground">For grouping</p>
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-4">
                      <Button type="button" variant="outline" onClick={resetCategoryForm}>
                        Cancel
                      </Button>
                      <Button type="submit" disabled={createCategory.isPending || updateCategory.isPending}>
                        {editingCategory ? "Update" : "Create"} Category
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            {categoriesLoading ? (
              <p className="text-muted-foreground text-center py-8">Loading categories...</p>
            ) : !categories || categories.length === 0 ? (
              <div className="text-center py-12">
                <FolderTree className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-medium mb-2">No categories yet</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Create categories to organize your items (e.g., Services, Products, Memberships)
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Number</TableHead>
                    <TableHead>Parent</TableHead>
                    <TableHead className="text-center">Active</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categories.map((category) => (
                    <TableRow key={category.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{category.name}</div>
                          {category.description && (
                            <div className="text-xs text-muted-foreground">{category.description}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {category.category_number || <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell>
                        {category.parent_category || <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="text-center">
                        <Switch
                          checked={category.is_active}
                          onCheckedChange={() => toggleCategoryActive(category)}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => openEditCategory(category)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="text-destructive hover:text-destructive"
                            onClick={() => deleteCategory.mutate(category.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
    {rosterFor && currentWorkspaceId && (
      <ProgramRosterSheet
        open={!!rosterFor}
        onOpenChange={(o) => !o && setRosterFor(null)}
        workspaceId={currentWorkspaceId}
        itemId={rosterFor.id}
        itemTitle={rosterFor.title}
      />
    )}
    </>
  );
}
