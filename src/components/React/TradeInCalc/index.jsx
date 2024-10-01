import React, { useState, useEffect, StrictMode } from 'react';
import VinForm from './VinForm';
import StepPanel from './StepPanel';
import { useCarInfo } from '@/store/useCarInfo';
import {localBrands} from '@/store/local.brands'
import axios from 'axios';
import Loader from '../Loader/Loader';
axios.defaults.headers.common['Authorization'] = `Basic ${import.meta.env.PUBLIC_MAXPOSTER_TOKEN}`;

export default function TradeInCalc() {
	const {step, avtoInfo, brands, setBrands, loading, hideLoader} = useCarInfo();	
	useEffect(() => {
		if (!brands.length) {
		  axios.get('http://127.0.0.1:8321/api/trade-in/dynamic-directories/vehicle-brands')
				.then((res) => {
					setBrands(res.data.data.vehicleBrands.filter( brand => {
						const b = localBrands.find(b => b.name == brand.name)
						if(!b){
							return;
						}
						brand.popular = b.popular;
						return brand;
					}));
				},
				(error) => {
					console.log("brands-error", error);
				}
			)
			hideLoader();
		}
	 }, [brands]);
	return ( 
		<>
			<StrictMode>
				{loading && <Loader />}
				<StepPanel />
				{step === 0 && <VinForm /> }
			</StrictMode>
		</> 
	);
}