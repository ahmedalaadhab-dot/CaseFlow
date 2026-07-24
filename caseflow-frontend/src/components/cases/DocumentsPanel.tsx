import * as React from "react";
import { Upload, FileText, Trash2, Download, Folder, FolderPlus, MoreHorizontal, Pencil } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  useCaseDocuments,
  useUploadDocument,
  useDeleteDocument,
  useMoveDocument,
  useDocumentFolders,
  useCreateDocumentFolder,
  useRenameDocumentFolder,
  useDeleteDocumentFolder,
} from "@/hooks/useDomain";
import { useToast } from "@/components/ui/toast";
import { getApiErrorMessage } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import type { DocumentCategory } from "@/lib/types";

const CATEGORIES: DocumentCategory[] = [
  "PASSPORT", "CPR", "PHOTOS", "MEDICAL", "CONTRACTS", "INVOICES", "GOVERNMENT_FORMS", "OTHER",
];

const UNFILED = "__unfiled__";

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DocumentsPanel({ caseId }: { caseId: string }) {
  const { data: documents } = useCaseDocuments(caseId);
  const { data: folders } = useDocumentFolders(caseId);
  const upload = useUploadDocument();
  const remove = useDeleteDocument();
  const moveDocument = useMoveDocument();
  const createFolder = useCreateDocumentFolder();
  const renameFolder = useRenameDocumentFolder();
  const deleteFolder = useDeleteDocumentFolder();
  const { toast } = useToast();
  const [category, setCategory] = React.useState<DocumentCategory>("OTHER");
  const [dragOver, setDragOver] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // null = "All documents" view. Otherwise a folder id, or UNFILED.
  const [activeFolder, setActiveFolder] = React.useState<string | null>(null);
  const [newFolderOpen, setNewFolderOpen] = React.useState(false);
  const [newFolderName, setNewFolderName] = React.useState("");
  const [renamingFolder, setRenamingFolder] = React.useState<{ id: string; name: string } | null>(null);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const folderId = activeFolder && activeFolder !== UNFILED ? activeFolder : undefined;
    for (const file of Array.from(files)) {
      try {
        await upload.mutateAsync({ caseId, file, category, folderId });
        toast({ title: `Uploaded ${file.name}`, variant: "success" });
      } catch (err) {
        toast({ title: `Couldn't upload ${file.name}`, description: getApiErrorMessage(err), variant: "destructive" });
      }
    }
  }

  async function handleCreateFolder() {
    const name = newFolderName.trim();
    if (!name) return;
    try {
      const folder = await createFolder.mutateAsync({ caseId, name });
      setActiveFolder(folder.id);
      setNewFolderName("");
      setNewFolderOpen(false);
    } catch (err) {
      toast({ title: "Couldn't create folder", description: getApiErrorMessage(err), variant: "destructive" });
    }
  }

  async function handleRenameFolder() {
    if (!renamingFolder) return;
    const name = renamingFolder.name.trim();
    if (!name) return;
    try {
      await renameFolder.mutateAsync({ id: renamingFolder.id, caseId, name });
      setRenamingFolder(null);
    } catch (err) {
      toast({ title: "Couldn't rename folder", description: getApiErrorMessage(err), variant: "destructive" });
    }
  }

  async function handleDeleteFolder(id: string) {
    try {
      await deleteFolder.mutateAsync({ id, caseId });
      if (activeFolder === id) setActiveFolder(null);
      toast({ title: "Folder deleted", description: "Its documents were kept and marked unfiled.", variant: "success" });
    } catch (err) {
      toast({ title: "Couldn't delete folder", description: getApiErrorMessage(err), variant: "destructive" });
    }
  }

  const visibleDocuments = (documents ?? []).filter((doc) => {
    if (activeFolder === null) return true;
    if (activeFolder === UNFILED) return !doc.folderId;
    return doc.folderId === activeFolder;
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Documents</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveFolder(null)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              activeFolder === null ? "border-accent bg-accent/10 text-accent" : "border-border text-muted-foreground hover:bg-secondary/50"
            )}
          >
            All documents
          </button>
          <button
            type="button"
            onClick={() => setActiveFolder(UNFILED)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              activeFolder === UNFILED ? "border-accent bg-accent/10 text-accent" : "border-border text-muted-foreground hover:bg-secondary/50"
            )}
          >
            Unfiled
          </button>
          {folders?.map((folder) => (
            <div
              key={folder.id}
              className={cn(
                "flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                activeFolder === folder.id ? "border-accent bg-accent/10 text-accent" : "border-border text-muted-foreground hover:bg-secondary/50"
              )}
            >
              <button type="button" className="flex items-center gap-1" onClick={() => setActiveFolder(folder.id)}>
                <Folder className="h-3 w-3" /> {folder.name}
              </button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button type="button" className="ml-0.5 rounded p-0.5 hover:bg-secondary" aria-label={`${folder.name} options`}>
                    <MoreHorizontal className="h-3 w-3" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem onClick={() => setRenamingFolder({ id: folder.id, name: folder.name })}>
                    <Pencil className="h-3.5 w-3.5" /> Rename
                  </DropdownMenuItem>
                  <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteFolder(folder.id)}>
                    <Trash2 className="h-3.5 w-3.5" /> Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}

          {newFolderOpen ? (
            <div className="flex items-center gap-1">
              <Input
                autoFocus
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreateFolder();
                  if (e.key === "Escape") {
                    setNewFolderOpen(false);
                    setNewFolderName("");
                  }
                }}
                placeholder="Folder name"
                className="h-7 w-36 text-xs"
              />
              <Button size="sm" className="h-7 px-2" isLoading={createFolder.isPending} onClick={handleCreateFolder}>
                Add
              </Button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setNewFolderOpen(true)}
              className="flex items-center gap-1 rounded-full border border-dashed border-border px-3 py-1 text-xs font-medium text-muted-foreground hover:bg-secondary/50"
            >
              <FolderPlus className="h-3 w-3" /> New folder
            </button>
          )}
        </div>

        {renamingFolder && (
          <div className="flex items-center gap-2 rounded-lg border border-border p-2">
            <Input
              autoFocus
              value={renamingFolder.name}
              onChange={(e) => setRenamingFolder({ ...renamingFolder, name: e.target.value })}
              onKeyDown={(e) => e.key === "Enter" && handleRenameFolder()}
              className="h-8 max-w-xs"
            />
            <Button size="sm" isLoading={renameFolder.isPending} onClick={handleRenameFolder}>
              Save
            </Button>
            <Button size="sm" variant="outline" onClick={() => setRenamingFolder(null)}>
              Cancel
            </Button>
          </div>
        )}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Select value={category} onValueChange={(v) => setCategory(v as DocumentCategory)}>
            <SelectTrigger className="sm:w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c.replace(/_/g, " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div
            className={cn(
              "flex flex-1 items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border p-4 text-sm text-muted-foreground transition-colors",
              dragOver && "border-accent bg-accent/5"
            )}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              handleFiles(e.dataTransfer.files);
            }}
          >
            <Upload className="h-4 w-4" />
            Drag files here, or{" "}
            <button type="button" className="text-accent underline" onClick={() => fileInputRef.current?.click()}>
              browse
            </button>
            <span className="hidden sm:inline">
              (PDF, JPG, PNG, DOCX{activeFolder && activeFolder !== UNFILED ? " · into selected folder" : ""})
            </span>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.jpg,.jpeg,.png,.docx"
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
            />
          </div>
        </div>

        <div className="space-y-2">
          {visibleDocuments.length === 0 && <p className="text-sm text-muted-foreground">No documents here yet.</p>}
          {visibleDocuments.map((doc) => (
            <div key={doc.id} className="flex items-center justify-between rounded-lg border border-border p-3">
              <div className="flex items-center gap-3 min-w-0">
                <FileText className="h-5 w-5 shrink-0 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{doc.fileName}</p>
                  <p className="text-xs text-muted-foreground">
                    {doc.category.replace(/_/g, " ")} · {formatSize(doc.sizeBytes)} · v{doc.version}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Select
                  value={doc.folderId ?? UNFILED}
                  onValueChange={(v) =>
                    moveDocument.mutate({ id: doc.id, caseId, folderId: v === UNFILED ? null : v })
                  }
                >
                  <SelectTrigger className="h-8 w-36 text-xs [&>span]:truncate" aria-label="Move to folder">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={UNFILED}>Unfiled</SelectItem>
                    {folders?.map((folder) => (
                      <SelectItem key={folder.id} value={folder.id}>
                        {folder.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <a href={doc.url} target="_blank" rel="noreferrer" download>
                  <Button variant="ghost" size="icon">
                    <Download className="h-4 w-4" />
                  </Button>
                </a>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => remove.mutate({ id: doc.id, caseId })}
                  className="text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
