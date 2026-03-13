export interface DemoVehicle {
  id: string;
  year: string;
  make: string;
  model: string;
  trim: string;
  price: string;
  mileage: string;
  vin: string;
  stockNumber: string;
  exteriorColor: string;
  transmission: string;
  fuelType: string;
  condition: string;
  description: string;
}

export const demoVehicles: DemoVehicle[] = [
  {
    id: "demo_1",
    year: "2021",
    make: "Toyota",
    model: "Camry",
    trim: "SE",
    price: "24995",
    mileage: "32450",
    vin: "4T1G11AK5MU123456",
    stockNumber: "T2145",
    exteriorColor: "Midnight Black",
    transmission: "Automatic",
    fuelType: "Gasoline",
    condition: "Used - Excellent",
    description: "One-owner 2021 Toyota Camry SE with low miles. Features include Apple CarPlay, lane departure alert, and pre-collision system. Clean title, no accidents.",
  },
  {
    id: "demo_2",
    year: "2022",
    make: "Honda",
    model: "CR-V",
    trim: "EX-L",
    price: "31500",
    mileage: "18700",
    vin: "7FARW2H93NE234567",
    stockNumber: "H3387",
    exteriorColor: "Radiant Red",
    transmission: "CVT",
    fuelType: "Gasoline",
    condition: "Used - Excellent",
    description: "2022 Honda CR-V EX-L AWD with leather seats, sunroof, and Honda Sensing suite. Only 18k miles. Excellent condition inside and out.",
  },
  {
    id: "demo_3",
    year: "2020",
    make: "Ford",
    model: "F-150",
    trim: "XLT",
    price: "38900",
    mileage: "41200",
    vin: "1FTEW1EP5LFA34567",
    stockNumber: "F9012",
    exteriorColor: "Oxford White",
    transmission: "Automatic",
    fuelType: "Gasoline",
    condition: "Used - Good",
    description: "2020 Ford F-150 XLT SuperCrew 4x4. 5.0L V8, tow package, spray-in bed liner, SYNC 3 infotainment. Ready for work or play.",
  },
  {
    id: "demo_4",
    year: "2023",
    make: "Tesla",
    model: "Model 3",
    trim: "Long Range",
    price: "35750",
    mileage: "12100",
    vin: "5YJ3E1EA1PF456789",
    stockNumber: "E4521",
    exteriorColor: "Pearl White",
    transmission: "Electric",
    fuelType: "Electric",
    condition: "Used - Like New",
    description: "2023 Tesla Model 3 Long Range AWD. Full self-driving capability, premium interior, glass roof. Under 13k miles with remaining factory warranty.",
  },
];
