import React, {useState} from 'react';
import { useCarInfo } from '@/store/useCarInfo';
import { scroll } from '@/js/modules/scroll';
import { BRAND } from '@/const';
import './styles.scss';

function BrandsList() {
	const tabs = ['Популярные', 'Все марки'];
	const [activeTab, setActiveTab] = useState(0);
	const {brands, incrementStep, setAvtoInfo, fetchCarsInfo} = useCarInfo();
	const allBrands = brands.reduce((acc, obj) => {
		let key = 'a';
		if( key != obj.name[0].toLowerCase() ){
			key = obj.name[0].toLowerCase();
		}
		if (!acc[key]) {
			acc[key] = [];
		}
		acc[key].push(obj);
		return acc;
	}, {});
	const handleBrand = async (brand) => {
		setAvtoInfo({ brand });
		const data = {
			url: `${import.meta.env.PUBLIC_MAXPOSTER_URL}/dynamic-directories/vehicle-models`,
			name: 'models',
			params: {brandId: brand.id}
		};
		await fetchCarsInfo(data);
		incrementStep(); 
		scroll('trade-in-calc');
	}
	return ( 
		<>
			<div className="flex items-end mb-8">
				<span className="flex-shrink-1 !leading-none text-gray-600">Или выберите из списка</span>
				<span className="flex-grow bg-gray-400 h-[1px] ml-2"></span>
			</div>

			<nav className="flex gap-6 font-medium mb-4">
				{tabs.map((tab, idx) => <div className={`trade-in-nav-tab${activeTab === idx ? ' active' : ''}`} onClick={() => setActiveTab(idx)} key={idx+tab}>{tab}</div>)}
			</nav>

			{activeTab === 0 ? (
				<ul className="columns-2 sm:columns-4 md:columns-5 lg:columns-6 space-y-2.5 font-medium mb-16">
					{ brands.filter(b => b.popular).map(brand => (
						<li className="relative cursor-pointer" key={brand.id} onClick={() => handleBrand(brand)}>
							{brand.name.toLowerCase() == BRAND.toLowerCase() ? (
								<svg width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid" className="text-greenBrand absolute top-1.5 -left-4 w-2.5"><path d="M5 0l1.123 3.455h3.632L6.816 5.59 7.94 9.045 5 6.91 2.061 9.045 3.184 5.59.244 3.455h3.633L5 0z" fill="currentColor"></path></svg>
							) : ('')}
							{ brand.name }
						</li>
					)) }
					<li className="cursor-pointer font-bold">
						<div className="flex items-center" onClick={() => setActiveTab(1)}>
							Все марки
							<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid" className=""><path d="M8.5 14l4-4-4-4" stroke="currentColor" strokeWidth="2"></path></svg>
						</div>
					</li>
				</ul>
			) : (
				<div className="columns-2 sm:columns-4 md:columns-5 lg:columns-6 font-medium mb-16">

					{Object.keys(allBrands).length > 0 && Object.keys(allBrands).map((key) => (
						<div className="inline-block w-full mb-8" key={key}>
							<span className="inline-block text-4xl text-gray-300 mb-3">{ key.toUpperCase() }</span>
							<ul className="space-y-2.5">
								{allBrands[key].map(brand => (
									<li className="cursor-pointer" key={brand.id} onClick={() => handleBrand(brand)}>
										{brand.name}
									</li>
								))}
							</ul>
						</div>
					))}

				</div>
			)}

		</>
	);
}

export default BrandsList;