import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Download, Eye, ExternalLink, Share2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import ExportModal from "./export-modal";
import type { Vehicle } from "@shared/schema";

interface VehicleTableProps {
  vehicles?: Vehicle[];
  showFbExport?: boolean;
}

export default function VehicleTable({ vehicles = [], showFbExport }: VehicleTableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedVehicles, setSelectedVehicles] = useState<Set<string>>(new Set());
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportDefaultFormat, setExportDefaultFormat] = useState("facebook");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const { data: searchResults } = useQuery({
    queryKey: ["/api/vehicles", { search: searchQuery }],
    enabled: !!searchQuery,
  });

  const displayVehicles = searchQuery ? (searchResults as Vehicle[] || []) : (vehicles || []);
  const totalPages = Math.ceil(displayVehicles.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedVehicles = displayVehicles.slice(startIndex, startIndex + itemsPerPage);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedVehicles(new Set(paginatedVehicles.map((v: Vehicle) => v.id)));
    } else {
      setSelectedVehicles(new Set());
    }
  };

  const handleSelectVehicle = (vehicleId: string, checked: boolean) => {
    const newSelected = new Set(selectedVehicles);
    if (checked) {
      newSelected.add(vehicleId);
    } else {
      newSelected.delete(vehicleId);
    }
    setSelectedVehicles(newSelected);
  };

  const openExport = (format: string) => {
    setExportDefaultFormat(format);
    setShowExportModal(true);
  };

  if (displayVehicles.length === 0) return null;

  return (
    <>
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="p-4 border-b border-border">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold">Scraped Inventory</h3>
                <p className="text-sm text-muted-foreground">
                  <span data-testid="vehicle-count">{displayVehicles.length}</span> vehicles
                </p>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
                  <Input
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                    className="pl-8 h-8 w-48 text-sm"
                    data-testid="input-search-vehicles"
                  />
                </div>
                {showFbExport && (
                  <Button
                    size="sm"
                    className="bg-[#1877f2] hover:bg-[#1664d9] text-white h-8 text-xs gap-1.5"
                    onClick={() => openExport("facebook")}
                    data-testid="button-fb-export"
                  >
                    <Share2 size={13} />
                    Export for Facebook
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs gap-1.5"
                  onClick={() => openExport("csv")}
                  data-testid="button-export"
                >
                  <Download size={13} />
                  Export
                </Button>
              </div>
            </div>
          </div>

          <div className="bg-muted/40 border-b border-border px-4 py-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <Checkbox
                    checked={selectedVehicles.size === paginatedVehicles.length && paginatedVehicles.length > 0}
                    onCheckedChange={handleSelectAll}
                    data-testid="checkbox-select-all"
                  />
                  <span className="text-xs text-muted-foreground">Select All</span>
                </div>
                {selectedVehicles.size > 0 && (
                  <span className="text-xs text-muted-foreground" data-testid="selected-count">
                    {selectedVehicles.size} selected
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/20">
                  <TableHead className="w-[40px]"><Checkbox /></TableHead>
                  <TableHead className="w-[56px]">Image</TableHead>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Mileage</TableHead>
                  <TableHead>VIN</TableHead>
                  <TableHead className="w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedVehicles.map((vehicle: Vehicle) => (
                  <TableRow key={vehicle.id} data-testid={`vehicle-row-${vehicle.id}`}>
                    <TableCell>
                      <Checkbox
                        checked={selectedVehicles.has(vehicle.id)}
                        onCheckedChange={(checked) => handleSelectVehicle(vehicle.id, checked as boolean)}
                      />
                    </TableCell>
                    <TableCell>
                      {vehicle.imageUrl ? (
                        <img
                          src={vehicle.imageUrl.split(',')[0].trim()}
                          alt={vehicle.title}
                          className="w-12 h-9 object-cover rounded border border-border"
                        />
                      ) : (
                        <div className="w-12 h-9 bg-muted rounded border border-border flex items-center justify-center">
                          <span className="text-[10px] text-muted-foreground">N/A</span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-sm" data-testid={`title-vehicle-${vehicle.id}`}>{vehicle.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {[vehicle.type, vehicle.transmission, vehicle.drivetrain].filter(Boolean).join(" · ")}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-semibold text-sm" data-testid={`price-vehicle-${vehicle.id}`}>
                        {vehicle.price || "N/A"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm" data-testid={`mileage-vehicle-${vehicle.id}`}>
                        {vehicle.mileage || "N/A"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-xs text-muted-foreground" data-testid={`vin-vehicle-${vehicle.id}`}>
                        {vehicle.vin}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                          <Eye size={14} />
                        </Button>
                        {vehicle.dealershipUrl && (
                          <a href={vehicle.dealershipUrl} target="_blank" rel="noopener noreferrer">
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                              <ExternalLink size={14} />
                            </Button>
                          </a>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {totalPages > 1 && (
            <div className="border-t border-border px-4 py-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground" data-testid="pagination-info">
                  {startIndex + 1}–{Math.min(startIndex + itemsPerPage, displayVehicles.length)} of {displayVehicles.length}
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setCurrentPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    data-testid="button-previous-page"
                  >
                    Prev
                  </Button>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => i + 1).map((page) => (
                    <Button
                      key={page}
                      variant={currentPage === page ? "default" : "outline"}
                      size="sm"
                      className="h-7 w-7 p-0 text-xs"
                      onClick={() => setCurrentPage(page)}
                    >
                      {page}
                    </Button>
                  ))}
                  {totalPages > 5 && (
                    <>
                      <span className="text-muted-foreground text-xs">...</span>
                      <Button variant="outline" size="sm" className="h-7 w-7 p-0 text-xs" onClick={() => setCurrentPage(totalPages)}>
                        {totalPages}
                      </Button>
                    </>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setCurrentPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    data-testid="button-next-page"
                  >
                    Next
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        selectedVehicleIds={Array.from(selectedVehicles)}
        defaultFormat={exportDefaultFormat}
      />
    </>
  );
}
