export type TBrand = {
	id: number; 
	name: string; 
	popular?: boolean;
}

export type TCarState = {
	loading: boolean;
	vinState: string;
	mileageState: string;
	bodyNumber: string;
	step: number;
	error: string;
	noResultFetchMessage: string;
	avtoInfo: any;
	brands: TBrand[];
	models: any;
	years: any;
	generations: any;
	bodyConfigurations: any;
	modifications: any;
	selfSale: number;
	dealerPrice: number;
}

export type TCarInfoActions = {
	incrementStep: () => void;
	decrimentStep: () => void;
	setVIN: (vin: string) => void;
	setMileage: (mileage: string) => void;
	setError: () => void;
	clearError: () => void;
	setMessage: (mes: string) => void;
	recalculate: () => void;
	setBodyNumber: (vin: string) => void;
	setStep: (step: number) => void;
	setAvtoInfo: (data: any) => void;
	showLoader: () => void;
	hideLoader: () => void;
	fetchCarsInfo: (data: any) => void;
	setSelfSale: (num: number) => void;
	setDealerPrice: (num: number) => void;
}