import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { X, FileText, Code, FileSpreadsheet } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedVehicleIds: string[];
}

interface ExportFormat {
  id: string;
  name: string;
  icon: React.ReactNode;
  color: string;
}

const formats: ExportFormat[] = [
  {
    id: "csv",
    name: "CSV",
    icon: <FileText className="text-emerald-600" size={20} />,
    color: "border-emerald-200 hover:bg-emerald-50",
  },
  {
    id: "json",
    name: "JSON",
    icon: <Code className="text-blue-600" size={20} />,
    color: "border-blue-200 hover:bg-blue-50",
  },
  {
    id: "excel",
    name: "Excel",
    icon: <FileSpreadsheet className="text-green-600" size={20} />,
    color: "border-green-200 hover:bg-green-50",
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

export default function ExportModal({ isOpen, onClose, selectedVehicleIds }: ExportModalProps) {
  const [selectedFormat, setSelectedFormat] = useState("csv");
  const [selectedFields, setSelectedFields] = useState(
    availableFields.filter(field => field.checked).map(field => field.id)
  );
  const { toast } = useToast();

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

      if (!response.ok) {
        throw new Error("Export failed");
      }

      // Handle file download
      const contentDisposition = response.headers.get("content-disposition");
      const filename = contentDisposition?.split("filename=")[1]?.replace(/"/g, "") || `vehicles.${format}`;
      
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
      toast({
        title: "Export Successful",
        description: "Your data has been exported successfully.",
      });
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Export Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleFieldToggle = (fieldId: string, checked: boolean) => {
    if (checked) {
      setSelectedFields([...selectedFields, fieldId]);
    } else {
      setSelectedFields(selectedFields.filter(id => id !== fieldId));
    }
  };

  const handleExport = () => {
    exportMutation.mutate({
      format: selectedFormat,
      fields: selectedFields,
      vehicleIds: selectedVehicleIds,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md" data-testid="export-modal">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            Export Data
            <Button variant="ghost" size="sm" onClick={onClose} data-testid="button-close-export">
              <X size={16} />
            </Button>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label className="text-sm font-medium mb-2 block">Export Format</Label>
            <div className="grid grid-cols-3 gap-2">
              {formats.map((format) => (
                <button
                  key={format.id}
                  onClick={() => setSelectedFormat(format.id)}
                  className={`p-3 border rounded-md text-center transition-colors ${format.color} ${
                    selectedFormat === format.id ? "ring-2 ring-primary" : ""
                  }`}
                  data-testid={`format-${format.id}`}
                >
                  <div className="flex flex-col items-center space-y-1">
                    {format.icon}
                    <span className="text-xs font-medium">{format.name}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-sm font-medium mb-2 block">Include Fields</Label>
            <div className="space-y-2 max-h-32 overflow-y-auto border rounded-md p-2">
              {availableFields.map((field) => (
                <div key={field.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={field.id}
                    checked={selectedFields.includes(field.id)}
                    onCheckedChange={(checked) => handleFieldToggle(field.id, checked as boolean)}
                    data-testid={`field-${field.id}`}
                  />
                  <Label htmlFor={field.id} className="text-sm cursor-pointer">
                    {field.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button variant="outline" onClick={onClose} data-testid="button-cancel-export">
              Cancel
            </Button>
            <Button
              onClick={handleExport}
              disabled={exportMutation.isPending || selectedFields.length === 0}
              data-testid="button-confirm-export"
            >
              {exportMutation.isPending ? "Exporting..." : "Export Data"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
