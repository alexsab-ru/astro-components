import Select from '@/components/React/Select';
import { useCarInfo } from '@/store/useCarInfo';
import React, { useEffect } from 'react';

function AvtoInfoForm() {
	const { vinState, avtoInfo, brands, models, years, generations, fetchCarsInfo } = useCarInfo();
	const selectBrand = (brandId) => fetchCarsInfo({ url: `${import.meta.env.PUBLIC_MAXPOSTER_URL}/dynamic-directories/vehicle-models`, name: 'models', params: { brandId } });
	const selectModel = (modelId) => fetchCarsInfo({ url: `${import.meta.env.PUBLIC_MAXPOSTER_URL}/dynamic-directories/vehicle-years`, name: 'years', params: { brandId: avtoInfo?.brand?.id, modelId } });
	const selectYear = (year) => fetchCarsInfo({ url: `${import.meta.env.PUBLIC_MAXPOSTER_URL}/dynamic-directories/vehicle-generations`, name: 'generations', params: { modelId: avtoInfo?.model?.id, year } });
	const selectGeneration = (generationId) => fetchCarsInfo({ url: `${import.meta.env.PUBLIC_MAXPOSTER_URL}/dynamic-directories/vehicle-body-configurations`, name: 'bodyConf', params: { modelId: avtoInfo?.model?.id, year: avtoInfo?.year, generationId } });
	
	useEffect(() => {
		if(models.length === 1) { selectModel(models[0].id) }
		if(years.length === 1 && years[0] !== avtoInfo?.year) { selectYear(years[0]) }
		if(generations.length === 1 && generations[0].id !== avtoInfo?.generation?.id) { selectGeneration(generations[0].id) }
	}, [models, years, generations])

	return ( 
		<div className="w-full lg:w-2/3 lg:pl-10 py-8 lg:py-16">
			<h3 className="text-xl font-bold mb-2">Характеристики вашего авто</h3>
			<p className="mb-4">Параметры, необходимые для оценки автомобиля</p>

			<form className="vue-form grid grid-cols-6 gap-5">
				<input type="hidden" name="form" value="Онлайн-оценка автомобиля" />
				<input type="hidden" name="email" tabIndex="-1" placeholder="mail@example.com" />
				<input type="hidden" name="VIN" value={vinState} />

				{!Object.keys(avtoInfo).length || vinState === '' && 
					<>
						<div className="col-span-6 lg:col-span-3">					
							<Select
								placeholder="Марка автомобиля *"
								options={brands}
								id={true}
								search={true}
								onChanged={ selectBrand }
								className="w-full"
								select={avtoInfo?.brand?.id || ''}
							/>
							<input type="hidden" name="brand" value={avtoInfo?.brand?.name || ''} />
						</div>
						<div className="col-span-6 lg:col-span-3">					
							<Select
								placeholder="Модель *"
								options={models}
								id={true}
								search={true}
								onChanged={ selectModel }
								data-block={!models.length || models.length == 1}
								className="w-full"
							/>
							<input type="hidden" name="model" value={avtoInfo?.model?.name || ''} />
						</div>
						<div className="col-span-6 lg:col-span-3">					
							<Select
								placeholder="Год выпуска *"
								options={years}
								onChanged={ selectYear }
								data-block={!years.length || years.length == 1}
								className="w-full"
								select={years.length == 1 ? years[0] : null}
							/>
							<input type="hidden" name="year-of-issue" value={avtoInfo?.year || ''} />
						</div>
						<div className="col-span-6 lg:col-span-3">					
							<Select
								placeholder="Поколение"
								options={generations}
								id={true}
								onChanged={ selectGeneration }
								data-block={!generations.length || generations.length == 1}
								className="w-full"
								select={generations.length == 1 ? generations[0].name : null}
							/>
							<input type="hidden" name="generation" value={avtoInfo?.generation?.name || ''} />
						</div>
					</>
				}

			</form>
		</div>
	);
}

export default AvtoInfoForm;