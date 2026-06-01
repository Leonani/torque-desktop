import vehicleBrandsData from '../data/vehicleBrands.json';

export interface VehicleBrand {
  name: string;
  models: string[];
}

export interface VehicleYears {
  years: number[];
}

// Type assertion for the JSON data
const vehicleBrands: VehicleBrand[] = vehicleBrandsData as VehicleBrand[];

// Current year
const CURRENT_YEAR = new Date().getFullYear();

// Get all vehicle brands from local JSON data
export const getVehicleBrands = async (): Promise<VehicleBrand[]> => {
  return vehicleBrands;
};

// Get models for a specific brand from local data
export const getModelsForBrand = (brandName: string): string[] => {
  const brand = vehicleBrands.find(
    (b) => b.name.toUpperCase() === brandName.toUpperCase()
  );
  return brand?.models || [];
};

// Get available years
export const getVehicleYears = async (): Promise<number[]> => {
  const years: number[] = [];
  for (let year = CURRENT_YEAR + 1; year >= 1995; year--) {
    years.push(year);
  }
  return years;
};

// Fallback data (same as local JSON)
export const DEFAULT_BRANDS: VehicleBrand[] = vehicleBrands;
