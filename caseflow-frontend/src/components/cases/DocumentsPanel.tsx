import * as React from "react";
import { Upload, FileText, Trash2, Download } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { useCaseDocuments, useUploadDocument, useDeleteDocument } from "@/hooks/useDomain";
import { useToast } from "@/components/ui/toast";
import { getApiErrorMessage } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import type { DocumentCategory } from "@/lib/types";

const CATEGORIES: DocumentCategory[] = [
  "PASSPORT", "CPR", "PHOTOS", "MEDICAL", "CONTRACTS", "INVOICES", "GOVERNMENT_FORMS", "OTHER",
];

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DocumentsPanel({ caseId }: { caseId: string }) {
  const { data: documents } = useCaseDocuments(caseId);
  const upload = useUploadDocument();
  const remove = useDeleteDocument();
  const { toast } = useToast();
  const [category, setCategory] = React.useState<DocumentCategory>("OTHER");
  const [dragOver, setDragOver] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    for (const file of Array.from(files)) {
      try {
        await upload.mutateAsync({ caseId, file, category });
        toast({ title: `Uploaded ${file.name}`, variant: "success" });
      } catch (err) {
        toast({ title: `Couldn't upload ${file.name}`, description: getApiErrorMessage(err), variant: "destructive" });
      }
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Documents</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
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
            <span className="hidden sm:inline">(PDF, JPG, PNG, DOCX)</span>
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
          {documents?.length === 0 && <p className="text-sm text-muted-foreground">No documents uploaded yet.</p>}
          {documents?.map((doc) => (
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
