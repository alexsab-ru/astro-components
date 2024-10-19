import React, { useEffect, StrictMode } from 'react';
import VinForm from './VinForm';
import StepPanel from './StepPanel';
import { useCarInfo } from '@/store/useCarInfo';
import Loader from '../Loader/Loader';
import BrandsList from './brands/List';
import AvtoInfo from './avto/Info';
import AvtoInfoResult from './avto/InfoResult';
// axios.defaults.headers.common['Authorization'] = `Basic ${import.meta.env.PUBLIC_MAXPOSTER_TOKEN}`;

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
		<div id="trade-in-calc">
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
							{step === 2 &&
								<>
									<AvtoInfoResult />
								</>
							}
						</>
					)
				}
			</StrictMode>
		</div> 
	);
}