import React, { useState, useEffect, StrictMode } from 'react';
import VinForm from './VinForm';
import StepPanel from './StepPanel';
import { useCarInfo } from '@/store/useCarInfo';
import { localBrands } from '@/store/local.brands'
import axios from 'axios';
import Loader from '../Loader/Loader';
import BrandsList from './brands/List';
import AvtoInfo from './avto/Info';
axios.defaults.headers.common['Authorization'] = `Basic ${import.meta.env.PUBLIC_MAXPOSTER_TOKEN}`;

export default function TradeInCalc() {
	const {step, error, setError, brands, setBrands, loading, hideLoader} = useCarInfo();
	useEffect(() => {
		const fetchBrands = async () => {
			try {
				const response = await axios.get(`${import.meta.env.PUBLIC_MAXPOSTER_URL}/dynamic-directories/vehicle-brands`);
				const filteredBrands = response.data.data.vehicleBrands.filter(brand => {
					const b = localBrands.find(b => b.name === brand.name);
					if (!b) return false; // Убедитесь, что возвращаете true/false для корректной фильтрации
					brand.popular = b.popular;
					return true;
				});	 
				setBrands(filteredBrands);
		  	} catch (error) {
				setError();
				console.error("fetch-brands-error", error);
		  	} finally {
				hideLoader();
		  	}
		};
	 
		if (!brands.length) {
		  fetchBrands(); // Вызываем асинхронную функцию
		}
	}, [brands]); // Следим за изменением brands
	return ( 
		<>
			<StrictMode>
				{loading ? <Loader /> : error && <div className="py-10 text-center sm:text-lg">{error}</div>}
				{brands.length > 0 && (
					<>
						<StepPanel />
						{step === 0 && 
							<>
								<VinForm />
								<BrandsList />
							</>
						}
						{step === 1 && 
							<>
								<AvtoInfo />
							</>
						}
					</>
				)}
			</StrictMode>
		</> 
	);
}