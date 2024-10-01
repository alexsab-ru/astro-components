import axios from 'axios';
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

export type TCarState = {
	loading: boolean;
	vinState: string;
	bodyNumber: string;
	step: number;
	error: string;
	noResultFetchMessage: string;
	avtoInfo: any;
	brands: any;
}

export type TCarInfoActions = {
	incrementStep: () => void;
	decrimentStep: () => void;
	setVIN: (vin: string) => void;
	setError: () => void;
	clearError: () => void;
	setMessage: (mes: string) => void;
	recalculate: () => void;
	setBodyNumber: (vin2: string) => void;
	setAvtoInfo: (data: any) => void;
	setBrands: (data: any) => void;
	showLoader: () => void;
	hideLoader: () => void;
}

export const useCarInfo = create<TCarState & TCarInfoActions>()(devtools((set) => ({
	loading: true,
	vinState: "",
	bodyNumber: "",
	step: 0,
	error: "",
	noResultFetchMessage: "Ничего не выбрано",
	avtoInfo: {},
	brands: [],
	setVIN: (vin) => set({ vinState: vin }),
	setError: () => set({ error: 'Извините, сервис временно недоступен. Мы уже работает над этим, повторите попыку позже.' }),
	clearError: () => set({ error: '' }),
	setMessage: (mes) => set({ noResultFetchMessage: mes }),
	recalculate: () => set({ step: 0, bodyNumber: '', avtoInfo: {} }),
	incrementStep: () => set((state) => ({ step: state.step + 1 })),
	decrimentStep: () => set((state) => ({ step: state.step - 1 })),
	setBodyNumber: (vin) => set({ bodyNumber: vin }),
	setAvtoInfo: (data) => set({ avtoInfo: data }),
	setBrands: (data) => set({ brands: data }),
	showLoader: () => set({ loading: true }),
	hideLoader: () => set({ loading: false }),
})))