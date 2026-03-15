import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { FileText, Code, FileSpreadsheet, Share2, Info } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedVehicleIds: string[];
  defaultFormat?: string;
}

interface ExportFormat {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
}

const formats: ExportFormat[] = [
  {
    id: "facebook",
    name: "Facebook Marketplace",
    description: "Official Bulk Upload Template (.xlsx)",
    icon: <Share2 className="text-[#1877f2]" size={18} />,
  },
  {
    id: "csv",
    name: "CSV",
    description: "Comma-separated values",
    icon: <FileText className="text-emerald-600" size={18} />,
  },
  {
    id: "json",
    name: "JSON",
    description: "Structured data format",
    icon: <Code className="text-blue-600" size={18} />,
  },
  {
    id: "excel",
    name: "Excel",
    description: "Spreadsheet (.xlsx)",
    icon: <FileSpreadsheet className="text-green-600" size={18} />,
  },
];

const availableFields = [
  { id: "vin", label: "VIN", checked: true },
  { id: "title", label: "Vehicle Title", checked: true },
  { id: "price", label: "Price", checked: true },
  { id: "mileage", label: "Mileage", checked: true },
  { id: "make", label: "Make", checked: false },
  { id: "model", label: "Model", checked: false },
  { id: "year", label: "Year", checked: false },
  { id: "type", label: "Type", checked: false },
  { id: "imageUrl", label: "Images", checked: false },
];

export default function ExportModal({ isOpen, onClose, selectedVehicleIds, defaultFormat = "facebook" }: ExportModalProps) {
  const [selectedFormat, setSelectedFormat] = useState(defaultFormat);
  const [selectedFields, setSelectedFields] = useState(
    availableFields.filter(field => field.checked).map(field => field.id)
  );
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) setSelectedFormat(defaultFormat);
  }, [isOpen, defaultFormat]);

  const exportMutation = useMutation({
    mutationFn: async ({ format, fields, vehicleIds }: {
      format: string;
      fields: string[];
      vehicleIds: string[];
    }) => {
      const response = await fetch("/api/vehicles/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ format, fields, vehicleIds }),
      });

      if (!response.ok) throw new Error("Export failed");

      const contentDisposition = response.headers.get("content-disposition");
      const filename = contentDisposition?.split("filename=")[1]?.replace(/"/g, "") || `vehicles.${format === "facebook" ? "xlsx" : format}`;

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    },
    onSuccess: () => {
      toast({ title: "Export Successful", description: "Your file has been downloaded." });
      onClose();
    },
    onError: (error) => {
      toast({ title: "Export Failed", description: error.message, variant: "destructive" });
    },
  });

  const handleExport = () => {
    exportMutation.mutate({
      format: selectedFormat,
      fields: selectedFormat === "facebook" ? [] : selectedFields,
      vehicleIds: selectedVehicleIds,
    });
  };

  const isFacebook = selectedFormat === "facebook";

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md" data-testid="export-modal">
        <DialogHeader>
          <DialogTitle>Export Inventory</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            {formats.map((fmt) => (
              <button
                key={fmt.id}
                onClick={() => setSelectedFormat(fmt.id)}
                className={`p-3 border rounded-lg text-left transition-all ${
                  selectedFormat === fmt.id
                    ? "border-primary bg-primary/5 ring-1 ring-primary"
                    : "border-border hover:border-muted-foreground/30"
                }`}
                data-testid={`format-${fmt.id}`}
              >
                <div className="flex items-center gap-2 mb-0.5">
                  {fmt.icon}
                  <span className="text-sm font-medium">{fmt.name}</span>
                </div>
                <span className="text-[11px] text-muted-foreground">{fmt.description}</span>
              </button>
            ))}
          </div>

          {isFacebook && (
            <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <Info size={14} className="text-[#1877f2] mt-0.5 shrink-0" />
                <div className="text-xs text-muted-foreground">
                  <p className="font-medium text-foreground mb-1">Facebook Marketplace Bulk Upload</p>
                  <p>Generates the official template with columns: TITLE, PRICE, CONDITION, DESCRIPTION, CATEGORY, OFFER SHIPPING. Ready to upload directly.</p>
                </div>
              </div>
            </div>
          )}

          {!isFacebook && (
            <div>
              <Label className="text-sm font-medium mb-2 block">Include Fields</Label>
              <div className="space-y-1.5 max-h-32 overflow-y-auto border rounded-md p-2">
                {availableFields.map((field) => (
                  <div key={field.id} className="flex items-center gap-2">
                    <Checkbox
                      id={field.id}
                      checked={selectedFields.includes(field.id)}
                      onCheckedChange={(checked) => {
                        if (checked) setSelectedFields([...selectedFields, field.id]);
                        else setSelectedFields(selectedFields.filter(id => id !== field.id));
                      }}
                      data-testid={`field-${field.id}`}
                    />
                    <Label htmlFor={field.id} className="text-sm cursor-pointer">{field.label}</Label>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose} data-testid="button-cancel-export">Cancel</Button>
            <Button
              onClick={handleExport}
              disabled={exportMutation.isPending || (!isFacebook && selectedFields.length === 0)}
              className={isFacebook ? "bg-[#1877f2] hover:bg-[#1664d9] text-white" : ""}
              data-testid="button-confirm-export"
            >
              {exportMutation.isPending ? "Exporting..." : isFacebook ? "Download for Facebook" : "Export Data"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
