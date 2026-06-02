import { EmptyState } from "@/components/ui/empty-state";
import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, FileText, Link as LinkIcon, Upload, Database, X } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { CreateKnowledgeBaseDialog } from "@/components/knowledge-base/CreateKnowledgeBaseDialog";
import { KnowledgeBaseCard } from "@/components/knowledge-base/KnowledgeBaseCard";

const KnowledgeBases = () => {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [addContentDialogOpen, setAddContentDialogOpen] = useState(false);
  const [selectedKnowledgeBase, setSelectedKnowledgeBase] = useState<string | null>(null);
  const [contentType, setContentType] = useState<"text" | "url" | "file">("text");
  const [textContent, setTextContent] = useState("");
  const [urlContent, setUrlContent] = useState("");
  const [fileContent, setFileContent] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setFileContent(acceptedFiles[0]);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "text/plain": [".txt"],
      "text/markdown": [".md"],
      "application/pdf": [".pdf"],
      "application/msword": [".doc"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
    },
    maxFiles: 1,
  });

  const { data: knowledgeBases, refetch } = useQuery({
    queryKey: ["knowledge-bases"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from("knowledge_bases")
        .select("*")
        .eq("workspace_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const handleAddContent = async () => {
    if (!selectedKnowledgeBase) return;
    if (!title.trim()) {
      toast.error("Please enter a title");
      return;
    }

    setLoading(true);
    try {
      let content = "";
      let type = contentType;
      let metadata: any = {};

      if (contentType === "text") {
        if (!textContent.trim()) {
          toast.error("Please enter content");
          return;
        }
        content = textContent;
      } else if (contentType === "url") {
        if (!urlContent.trim()) {
          toast.error("Please enter a URL");
          return;
        }
        content = ""; // Will be scraped later
        metadata = { url: urlContent };
        type = "url";
      } else if (contentType === "file") {
        if (!fileContent) {
          toast.error("Please select a file");
          return;
        }
        // Handle file upload
        const fileText = await fileContent.text();
        content = fileText;
        metadata = { filename: fileContent.name, type: fileContent.type };
        type = "file";
      }

      const { error } = await supabase.from("knowledge_sources").insert({
        knowledge_base_id: selectedKnowledgeBase,
        title,
        content,
        type,
        metadata,
        url: contentType === "url" ? urlContent : null,
      });

      if (error) throw error;

      toast.success("Content added successfully");
      setAddContentDialogOpen(false);
      setTextContent("");
      setUrlContent("");
      setFileContent(null);
      setTitle("");
    } catch (error) {
      console.error("Error adding content:", error);
      toast.error("Failed to add content");
    } finally {
      setLoading(false);
    }
  };

  const openAddContentDialog = (knowledgeBaseId: string) => {
    setSelectedKnowledgeBase(knowledgeBaseId);
    setAddContentDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Operations"
        title="Knowledge Bases"
        description="Manage your AI knowledge bases and content sources."
        actions={
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Knowledge Base
          </Button>
        }
      />
      <CreateKnowledgeBaseDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={refetch}
      />

      {!knowledgeBases || knowledgeBases.length === 0 ? (
        <EmptyState
          icon={Database}
          title="No knowledge bases yet"
          description="Create your first knowledge base to give your AI agents grounded context to work from."
          action={
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create knowledge base
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {knowledgeBases.map((kb) => (
            <div key={kb.id} className="relative">
              <KnowledgeBaseCard knowledgeBase={kb} onUpdate={refetch} />
              <Button
                className="absolute top-4 right-4"
                size="sm"
                onClick={() => openAddContentDialog(kb.id)}
              >
                <Plus className="h-3 w-3 mr-1" />
                Add Content
              </Button>
            </div>
          ))}
        </div>
      )}

      <Dialog open={addContentDialogOpen} onOpenChange={setAddContentDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Content to Knowledge Base</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter content title"
              />
            </div>

            <Tabs value={contentType} onValueChange={(v) => setContentType(v as any)}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="text">
                  <FileText className="h-4 w-4 mr-2" />
                  Text
                </TabsTrigger>
                <TabsTrigger value="url">
                  <LinkIcon className="h-4 w-4 mr-2" />
                  URL
                </TabsTrigger>
                <TabsTrigger value="file">
                  <Upload className="h-4 w-4 mr-2" />
                  File
                </TabsTrigger>
              </TabsList>

              <TabsContent value="text" className="space-y-4">
                <div>
                  <Label htmlFor="text-content">Content</Label>
                  <Textarea
                    id="text-content"
                    value={textContent}
                    onChange={(e) => setTextContent(e.target.value)}
                    placeholder="Enter your content here..."
                    rows={10}
                  />
                </div>
              </TabsContent>

              <TabsContent value="url" className="space-y-4">
                <div>
                  <Label htmlFor="url-content">URL to Scrape</Label>
                  <Input
                    id="url-content"
                    type="url"
                    value={urlContent}
                    onChange={(e) => setUrlContent(e.target.value)}
                    placeholder="https://example.com/page"
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    Content from this URL will be automatically extracted and added to your knowledge base
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="file" className="space-y-4">
                <div>
                  <Label>Upload File</Label>
                  <div
                    {...getRootProps()}
                    className={`mt-1.5 flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-6 py-8 cursor-pointer transition-colors ${
                      isDragActive
                        ? "border-primary bg-primary/5"
                        : "border-muted-foreground/30 hover:border-primary/50 hover:bg-muted/30"
                    }`}
                  >
                    <input {...getInputProps()} />
                    <Upload className="h-8 w-8 text-muted-foreground" />
                    {isDragActive ? (
                      <p className="text-sm text-primary font-medium">Drop the file here</p>
                    ) : (
                      <>
                        <p className="text-sm font-medium">Drag & drop a file, or click to browse</p>
                        <p className="text-xs text-muted-foreground">TXT, MD, PDF, DOC, DOCX</p>
                      </>
                    )}
                  </div>
                  {fileContent && (
                    <div className="mt-2 flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-2 text-sm">
                      <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="flex-1 truncate">{fileContent.name}</span>
                      <button
                        type="button"
                        onClick={() => setFileContent(null)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddContentDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddContent} disabled={loading}>
              {loading ? "Adding..." : "Add Content"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default KnowledgeBases;
