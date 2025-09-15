import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Filter, Download, Eye, ExternalLink, MoreHorizontal } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
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
}

export default function VehicleTable({ vehicles = [] }: VehicleTableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedVehicles, setSelectedVehicles] = useState<Set<string>>(new Set());
  const [showExportModal, setShowExportModal] = useState(false);
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

  const formatPrice = (price: string) => {
    if (!price || price === "N/A") return "N/A";
    return price;
  };

  const formatMileage = (mileage: string) => {
    if (!mileage || mileage === "N/A") return "N/A";
    return mileage;
  };

  return (
    <>
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="p-6 border-b border-border">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
              <div>
                <h3 className="text-lg font-semibold">Scraped Inventory</h3>
                <p className="text-muted-foreground">
                  <span data-testid="vehicle-count">{displayVehicles.length}</span> vehicles found • Last updated 2 minutes ago
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={16} />
                  <Input
                    placeholder="Search vehicles..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 w-full sm:w-64"
                    data-testid="input-search-vehicles"
                  />
                </div>
                <Button variant="secondary" className="flex items-center space-x-2" data-testid="button-filters">
                  <Filter size={16} />
                  <span>Filters</span>
                </Button>
              </div>
            </div>

            {/* Filter Tags */}
            <div className="flex flex-wrap gap-2 mt-4">
              <Badge variant="secondary" className="filter-chip bg-primary/10 text-primary">
                BMW
                <button className="ml-1 text-xs">×</button>
              </Badge>
              <Badge variant="secondary" className="filter-chip bg-emerald-50 text-emerald-700">
                2020-2024
                <button className="ml-1 text-xs">×</button>
              </Badge>
              <Badge variant="secondary" className="filter-chip bg-yellow-50 text-yellow-700">
                Under $50k
                <button className="ml-1 text-xs">×</button>
              </Badge>
            </div>
          </div>

          {/* Table Header Controls */}
          <div className="bg-muted/50 border-b border-border p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={selectedVehicles.size === paginatedVehicles.length && paginatedVehicles.length > 0}
                    onCheckedChange={handleSelectAll}
                    data-testid="checkbox-select-all"
                  />
                  <span className="text-sm font-medium">Select All</span>
                </div>
                <span className="text-sm text-muted-foreground" data-testid="selected-count">
                  {selectedVehicles.size} selected
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <Button 
                  className="bg-emerald-600 text-white hover:bg-emerald-700 flex items-center space-x-2"
                  onClick={() => setShowExportModal(true)}
                  data-testid="button-export"
                >
                  <Download size={16} />
                  <span>Export</span>
                </Button>
                <Button variant="secondary" size="sm" data-testid="button-more">
                  <MoreHorizontal size={16} />
                </Button>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="w-[50px]">
                    <Checkbox />
                  </TableHead>
                  <TableHead>Image</TableHead>
                  <TableHead className="cursor-pointer hover:text-foreground">
                    Vehicle
                  </TableHead>
                  <TableHead className="cursor-pointer hover:text-foreground">
                    Price
                  </TableHead>
                  <TableHead className="cursor-pointer hover:text-foreground">
                    Mileage
                  </TableHead>
                  <TableHead className="cursor-pointer hover:text-foreground">
                    VIN
                  </TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedVehicles.map((vehicle: Vehicle) => (
                  <TableRow key={vehicle.id} className="table-hover-row" data-testid={`vehicle-row-${vehicle.id}`}>
                    <TableCell>
                      <Checkbox
                        checked={selectedVehicles.has(vehicle.id)}
                        onCheckedChange={(checked) => handleSelectVehicle(vehicle.id, checked as boolean)}
                        data-testid={`checkbox-vehicle-${vehicle.id}`}
                      />
                    </TableCell>
                    <TableCell>
                      {vehicle.imageUrl ? (
                        <img
                          src={vehicle.imageUrl}
                          alt={vehicle.title}
                          className="w-12 h-9 object-cover rounded-md border border-border"
                          data-testid={`image-vehicle-${vehicle.id}`}
                        />
                      ) : (
                        <div className="w-12 h-9 bg-muted rounded-md border border-border flex items-center justify-center">
                          <span className="text-xs text-muted-foreground">No Image</span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium text-foreground" data-testid={`title-vehicle-${vehicle.id}`}>
                          {vehicle.title}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {vehicle.type} • {vehicle.transmission} • {vehicle.drivetrain}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-semibold text-foreground" data-testid={`price-vehicle-${vehicle.id}`}>
                        {formatPrice(vehicle.price || '')}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-foreground" data-testid={`mileage-vehicle-${vehicle.id}`}>
                        {formatMileage(vehicle.mileage || '')}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-sm text-muted-foreground" data-testid={`vin-vehicle-${vehicle.id}`}>
                        {vehicle.vin}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80" data-testid={`button-view-${vehicle.id}`}>
                          <Eye size={16} />
                        </Button>
                        <Button variant="ghost" size="sm" className="text-emerald-600 hover:text-emerald-700" data-testid={`button-external-${vehicle.id}`}>
                          <ExternalLink size={16} />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Table Footer */}
          <div className="bg-muted/30 border-t border-border p-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
              <div className="text-sm text-muted-foreground" data-testid="pagination-info">
                Showing <span className="font-medium">{startIndex + 1}</span> to{" "}
                <span className="font-medium">{Math.min(startIndex + itemsPerPage, displayVehicles.length)}</span> of{" "}
                <span className="font-medium">{displayVehicles.length}</span> results
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  data-testid="button-previous-page"
                >
                  Previous
                </Button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => i + 1).map((page) => (
                  <Button
                    key={page}
                    variant={currentPage === page ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentPage(page)}
                    data-testid={`button-page-${page}`}
                  >
                    {page}
                  </Button>
                ))}
                {totalPages > 5 && (
                  <>
                    <span className="text-muted-foreground">...</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(totalPages)}
                      data-testid={`button-page-${totalPages}`}
                    >
                      {totalPages}
                    </Button>
                  </>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  data-testid="button-next-page"
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        selectedVehicleIds={Array.from(selectedVehicles)}
      />
    </>
  );
}
