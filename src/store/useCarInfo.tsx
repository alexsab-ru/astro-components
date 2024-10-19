import axios from 'axios';
import { create } from 'zustand';
import { localBrands } from '@/store/local.brands';

import type { TCarState, TCarInfoActions, TBrand } from './types';

export const useCarInfo = create<TCarState & TCarInfoActions>((set, get) => ({
	loading: true,
	vinState: "",
	mileageState: "",
	bodyNumber: "",
	step: 0,
	error: "",
	noResultFetchMessage: "Ничего не выбрано",
	avtoInfo: {},
	brands: [],
	models: [],
	years: [],
	generations: [],
	bodyConfigurations: [], 
	modifications: [], 
	selfSale: 0,
	dealerPrice: 0,
	setVIN: (vin) => set({ vinState: vin }),
	setMileage: (mileage) => set({ mileageState: mileage.replace(/[^0-9\.]/g, '') }),
	setError: () => set({ error: 'Извините, сервис временно недоступен. Мы уже работает над этим, повторите попыку позже.' }),
	clearError: () => set({ error: '' }),
	setMessage: (mes) => set({ noResultFetchMessage: mes }),
	recalculate: () => set({ 
		// step: 0, 
		bodyNumber: '', 
		// mileageState: '',
		avtoInfo: {},
		models: [],
		years: [],
		generations: [],
		bodyConfigurations: [], 
		modifications: [],
		// selfSale: 0,
		// dealerPrice: 0,
	}),
	incrementStep: () => set((state) => ({ step: state.step + 1 })),
	decrimentStep: () => set((state) => ({ step: state.step - 1 })),
	setBodyNumber: (vin) => set({ bodyNumber: vin }),
	setStep: (step) => set({ step }),
	setAvtoInfo: (data) => set({ avtoInfo: data }),
	showLoader: () => set({ loading: true }),
	hideLoader: () => set({ loading: false }),
	setSelfSale: async (num) => set({ selfSale: num }),
	setDealerPrice: async (num) => set({ dealerPrice: num }),
	fetchCarsInfo: async (data) => {
		data.params.categoryId = 1; // 1 - легковые автомобили
		get().setVIN('');
		get().setBodyNumber('');
		const url = new URL(data.url);
		Object.keys(data.params).forEach(key => url.searchParams.append(key, data.params[key])) // добавляем GET параметры	
		get().showLoader(); // показываем загрузку
		try {
			const response = await axios.get(url.href);
			const fetchData = response.data; // получаем данные
			if(fetchData.status === 'success'){
				switch (data.name) {
					case 'brands':
						const filteredBrands = fetchData.data.vehicleBrands.filter((brand: TBrand) => {
							const b = localBrands.find(b => b.name.toLowerCase() === brand.name.toLowerCase());
							if (!b) return false; // Убедитесь, что возвращаете true/false для корректной фильтрации
							brand.popular = b.popular;
							return true;
						});
						set({ brands: filteredBrands });
						break;
					case 'models':
						get().recalculate();
						const currentBrand = get().brands.find(b => b.id === Number(data.params.brandId));
						if(!currentBrand){ get().setError() }			
						get().setAvtoInfo({ brand: currentBrand });
						set({ models: fetchData.data.vehicleModels });
						break;
					case 'years':
						set({ generations: [] });
						set({ bodyConfigurations: [] });
						set({ modifications: [] });
						const currentModel = get().models.find(m => m.id === Number(data.params.modelId));
						if(!currentModel){ get().setError() }
						delete currentModel.category;			
						get().setAvtoInfo({ ...get().avtoInfo, model: currentModel });
						set({ years: fetchData.data.vehicleYears });
						break;
					case 'generations':
						set({ bodyConfigurations: [] });
						set({ modifications: [] });
						if(!data.params.year){ get().setError() }
						get().setAvtoInfo({ ...get().avtoInfo, year: Number(data.params.year) });
						let generations = fetchData.data.vehicleGenerations;
						if(generations.length == 1){
							generations[0].name = "Без поколения";
						}
						set({ generations: generations });
						break;
					case 'bodyConf':
						set({ modifications: [] });
						const currentGeneration = get().generations.find(g => g.id === Number(data.params.generationId));
						if(!currentGeneration){ get().setError() }		
						get().setAvtoInfo({ ...get().avtoInfo, generation: currentGeneration });
						set({ bodyConfigurations: fetchData.data.vehicleBodyConfigurations });
						break;
					case 'modifications':
						const currentBodyConfiguration = get().bodyConfigurations.find(b => b.id === Number(data.params.bodyConfigurationId));
						if(!currentBodyConfiguration){ get().setError() }		
						get().setAvtoInfo({ ...get().avtoInfo, bodyConfiguration: currentBodyConfiguration });
						set({ modifications: fetchData.data.vehicleModifications });
						break;
					default:
						break;
				}
			} else {
				get().setError(); // если не удача, выводим ошибку
				console.log("fetch-"+data.name, fetchData);
			}	
		} catch (error) {
			get().setError(); // если не удача, выводим ошибку
			console.error("fetch-"+data.name, error);
		} finally {
			get().hideLoader();
		}
	}
}))