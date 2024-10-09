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
	const {step, error, brands, loading, fetchCarsInfo} = useCarInfo();
	useEffect(() => {
		const data = {
			url: `${import.meta.env.PUBLIC_MAXPOSTER_URL}/dynamic-directories/vehicle-brands`,
			name: 'brands',
			params: {}
		}	 
		if (!brands.length) {
			fetchCarsInfo(data);
		}
	}, [brands]); // Следим за изменением brands
	return ( 
		<>
			<StrictMode>
				{loading && <Loader />}
				{error ? <div className="py-10 text-center sm:text-lg">{error}</div> : 
					brands.length > 0 && (
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
					)
				}
			</StrictMode>
		</> 
	);
}