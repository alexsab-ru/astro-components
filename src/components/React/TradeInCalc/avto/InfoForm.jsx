import Select from '@/components/React/Select';
import { useCarInfo } from '@/store/useCarInfo';
import { useTranslit } from '@/js/utils/translit';
import React, { useEffect, useState } from 'react';
import ShowErrors from '../../ShowErrors';

import { useForm } from 'react-hook-form';
import * as yup from 'yup';
import { yupResolver } from '@hookform/resolvers/yup';
import axios from 'axios';

const schema = yup.object().shape({
	brand: yup
		.string()
		.required('Чтобы продолжить, выберите марку авто'),
	model: yup
		.string()
		.required('Чтобы продолжить, выберите модель'),
	'year-of-issue': yup
		.string()
		.required('Чтобы продолжить, выберите год выпуска'),
	mileage: yup
		.string()
		.required('Поле обязательно для заполнения'),
	phone: yup
		.string()
		.required('Укажите номер телефона в формате +7 999 999-99-99')
		.matches(/^\+7 \d{3} \d{3}-\d{2}-\d{2}$/, 'Введен некорректный номер телефона'),
	agree: yup
		.boolean()
		.oneOf([true], 'Вы должны согласиться с условиями использования')
		.required('Чтобы продолжить, установите этот флажок'),
});

function AvtoInfoForm() {

	const { vinState, mileageState, recalculate, decrimentStep, setMileage, avtoInfo, setAvtoInfo, brands, models, years, generations, bodyConfigurations, modifications, fetchCarsInfo, showLoader, hideLoader, setError } = useCarInfo();

	const {
		register,
		handleSubmit,
		formState: { errors, isSubmitting },
		trigger,
		setValue
	} = useForm({
		resolver: yupResolver(schema),
		defaultValues: {
			brand: avtoInfo?.brand?.name || '',
			model: avtoInfo?.model?.name || '',
			'year-of-issue': avtoInfo?.year || '',
			mileage: mileageState || '',
			phone: '',
			agree: false,
		},
	});

	const ptsTypes = [
		{value: 'duplicate', name: 'Дубликат' },
		{value: 'original', name: 'Оригинал' },
		{value: 'electronic', name: 'Электронный' },
	]; 

	const maskPhone = (e) => {
		let num = e.target.value.replace(/^(\+7|8|7)/g, "").replace(/\D/g, "").split(/(?=.)/),
			i = num.length;
	
		if(e.target.value != "" && e.target.value != "+") {
			if (0 <= i) num.unshift("+7");
			if (1 <= i) num.splice(1, 0, " ");
			if (4 <= i) num.splice(5, 0, " ");
			if (7 <= i) num.splice(9, 0, "-");
			if (9 <= i) num.splice(12, 0, "-");
			e.target.value = num.join("");
		}
	}

	const [engineType, setEngineType] = useState('');
	const [driveType, setDriveType] = useState('');
	const [gearboxType, setGearboxType] = useState('');
	const [ownerCount, setOwnerCount] = useState('');
	const [ptsType, setPtsType] = useState('');
	const [phone, setPhone] = useState('');
	const [selfSale, setSelfSale] = useState('');
	const [dealerPrice, setDealerPrice] = useState('');

	const selectBrand = (brandId) => fetchCarsInfo({ url: `${import.meta.env.PUBLIC_MAXPOSTER_URL}/dynamic-directories/vehicle-models`, name: 'models', params: { brandId } });
	const selectModel = async (modelId) => {
		await fetchCarsInfo({ url: `${import.meta.env.PUBLIC_MAXPOSTER_URL}/dynamic-directories/vehicle-years`, name: 'years', params: { brandId: avtoInfo?.brand?.id, modelId } });
		const currentModelName = models.find(m => m.id === Number(modelId))?.name;		
		setValue('model', currentModelName);
		trigger('model');
	};
	const selectYear = async (year) => {
		await fetchCarsInfo({ url: `${import.meta.env.PUBLIC_MAXPOSTER_URL}/dynamic-directories/vehicle-generations`, name: 'generations', params: { modelId: avtoInfo?.model?.id, year } });
		setValue('year-of-issue', year);
		trigger('year-of-issue');
	};
	const selectGeneration = (generationId) => fetchCarsInfo({ url: `${import.meta.env.PUBLIC_MAXPOSTER_URL}/dynamic-directories/vehicle-body-configurations`, name: 'bodyConf', params: { modelId: avtoInfo?.model?.id, year: avtoInfo?.year, generationId } });
	const selectBodyConfiguration = (bodyConfigurationId) => fetchCarsInfo({ url: `${import.meta.env.PUBLIC_MAXPOSTER_URL}/dynamic-directories/vehicle-modifications`, name: 'modifications', params: { modelId: avtoInfo?.model?.id, year: avtoInfo?.year, generationId: avtoInfo?.generation?.id, bodyConfigurationId } });
	const selectModification = (modificationId) => {
		const currentModification = modifications.find(m => m.id === Number(modificationId));		
		setEngineType(useTranslit(currentModification.engineType));
		setDriveType(useTranslit(currentModification.driveType));
		setGearboxType(useTranslit(currentModification.gearboxType));
		const engineVolume = currentModification.engineVolume;
		const enginePower = currentModification.enginePower;
		setAvtoInfo({...avtoInfo, modification: currentModification, engineVolume, enginePower });
	};
	
	useEffect(() => {
		if(models.length === 1) { selectModel(models[0].id) }
		if(years.length === 1 && years[0] !== avtoInfo?.year) { selectYear(years[0]) }
		if(generations.length === 1 && generations[0].id !== avtoInfo?.generation?.id) { selectGeneration(generations[0].id) }
		if(bodyConfigurations.length === 1 && bodyConfigurations[0].id !== avtoInfo?.bodyConfiguration?.id) { selectBodyConfiguration(bodyConfigurations[0].id) }
		if(modifications.length === 1 && modifications[0].id !== avtoInfo?.modification?.id) { selectModification(modifications[0].id) }
		if(vinState === ''){
			setAvtoInfo({...avtoInfo, engineType, driveType, gearboxType });
		}
	}, [models, years, generations, bodyConfigurations, modifications, engineType, driveType, gearboxType]);

	const calcMinPrice = (price) => {
		var minimum = 0;
		var percent = 25;
		if(price > 1500000){
			percent = 4;
		} else if(price > 1000000){
			percent = 6;
		} else if(price > 500000){
			percent = 8;
		} else if(price > 300000){
			percent = 15;
		} else {
			minimum = 50000;
		}
		return Math.max(0,price-Math.max(price*percent/100,minimum))
	}

	const onSubmit = async (data, e) => {
		const isFormCorrect = await trigger();
		if (!isFormCorrect) return;
		showLoader();
		const info = JSON.parse(JSON.stringify(avtoInfo));
		delete info.brand.popular;
		delete info.bodyConfiguration.bodyDoorCount;
		delete info.bodyConfiguration.bodyType;
		if(info.modification !== null){
			delete info.modification.bodyDoorCount;
			delete info.modification.bodyType;
			delete info.modification.driveType;
			delete info.modification.enginePower;
			delete info.modification.engineType;
			delete info.modification.engineVolume;
			delete info.modification.gearboxGearCount;
			delete info.modification.gearboxType;
		}
		const { brand, model, bodyConfiguration, modification, year } = info;
		const params = {
			"filter": {brand, model},
			"marketFilter": {brand, model, bodyConfiguration, modification},
			"vehicle": {
				year,
				"mileage": Number(mileageState),
				"ptsType": ptsType,
				"ownerCount": Number(ownerCount)
			}
		}

		axios.post(`${import.meta.env.PUBLIC_MAXPOSTER_URL}/express`, params)
		.then(async (res) => {
			if(res.data.status == 'success'){
				if (window.location.hostname == "localhost")
					console.log(res);
				res.data.data.analyticsByActualSales.minPrice !== 0 ? setSelfSale(res.data.data.analyticsByActualSales.minPrice) : setSelfSale(res.data.data.analyticsByCompletedSales.minPrice);
				setDealerPrice(calcMinPrice(selfSale));
				//await e.target.submit(); // submit form
				hideLoader();
			}else{
				if (window.location.hostname == "localhost")
					console.log('Error fetch express', res);
				setError();
				hideLoader();
			}
		}, (error) => {
			if (window.location.hostname == "localhost")
				console.log('Error fetch express', error);
			setError();
			hideLoader();
		});
	}

	return (
		<div className="w-full lg:w-2/3 lg:pl-10 py-8 lg:py-16">
			<h3 className="text-xl font-bold mb-2">Характеристики вашего авто</h3>
			<p className="mb-4">Параметры, необходимые для оценки автомобиля</p>
			<form className="vue-form grid grid-cols-6 gap-x-5 gap-y-6" onSubmit={handleSubmit(onSubmit)}>
				<input type="hidden" name="form" value="Онлайн-оценка автомобиля" />
				<input type="hidden" name="email" tabIndex="-1" placeholder="mail@example.com" />
				<input type="hidden" name="VIN" value={vinState} />
				<input type="hidden" {...register('brand')} value={avtoInfo?.brand?.name || ''} />
				<input type="hidden" {...register('model')} />
				<input type="hidden" {...register('year-of-issue')} />
				<input type="hidden" name="generation" value={avtoInfo?.generation?.name || ''} />
				<input type="hidden" name="bodyConfiguration" value={avtoInfo?.bodyConfiguration?.name || ''} />
				<input type="hidden" name="modification" value={avtoInfo?.modification?.name || ''} />
				<input type="hidden" name="engineType" value={useTranslit(avtoInfo?.engineType) || ''} />
				<input type="hidden" name="driveType" value={useTranslit(avtoInfo?.driveType) || ''} />
				<input type="hidden" name="gearboxType" value={useTranslit(avtoInfo?.gearboxType) || ''} />
				<input type="hidden" name="engineVolume" value={Math.round(avtoInfo?.engineVolume / 100) / 10 || ''} />
				<input type="hidden" name="enginePower" value={avtoInfo?.enginePower || ''} />
				<input type="hidden" name="complectation" value={avtoInfo?.complectation?.name || ''} />
				<input type="hidden" name="dealerPrice" value={dealerPrice} />
				<input type="hidden" name="selfSale" value={selfSale} />

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
							{errors.brand && <span className="absolute top-full left-0 text-xs text-red-500">{errors.brand.message}</span> }
						</div>
						<div className="col-span-6 lg:col-span-3 relative">					
							<Select
								placeholder="Модель *"
								options={models}
								id={true}
								search={true}
								onChanged={ selectModel }
								data-block={!models.length || models.length == 1}
								className="w-full"
							/>
							{errors.model && <span className="absolute top-full left-0 text-xs text-red-500">{errors.model.message}</span> }
						</div>
						<div className="col-span-6 lg:col-span-3 relative">					
							<Select
								placeholder="Год выпуска *"
								options={years}
								onChanged={ selectYear }
								data-block={!years.length || years.length == 1}
								className="w-full"
								select={years.length == 1 ? years[0] : null}
							/>
							{errors['year-of-issue'] && <span className="absolute top-full left-0 text-xs text-red-500">{errors['year-of-issue'].message}</span> }
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
						</div>
						<div className="col-span-6 lg:col-span-3">					
							<Select
								placeholder="Тип кузова"
								options={bodyConfigurations}
								id={true}
								onChanged={ selectBodyConfiguration }
								data-block={!bodyConfigurations.length || bodyConfigurations.length == 1}
								className="w-full"
								select={bodyConfigurations.length == 1 ? bodyConfigurations[0].name : null}
							/>
						</div>
						<div className="col-span-6 lg:col-span-3">					
							<Select
								placeholder="Модификация"
								options={modifications}
								id={true}
								onChanged={ selectModification }
								data-block={!modifications.length || modifications.length == 1}
								className="w-full"
								select={modifications.length == 1 ? modifications[0].name : null}
							/>
						</div>
						<div className="col-span-6 lg:col-span-3" key={engineType+Date.now()}>
							<Select
								placeholder="Двигатель"
								options={engineType === '' ? [] : [engineType]}
								data-block={true}
								className="w-full"
								select={engineType !== '' ? engineType : 'Двигатель'}
							/>
						</div>
						<div className="col-span-6 lg:col-span-3" key={driveType+Date.now()+1}>
							<Select
								placeholder="Привод"
								options={driveType === '' ? [] : [driveType]}
								data-block={true}
								className="w-full"
								select={driveType !== '' ? driveType : 'Привод'}
							/>
						</div>
						<div className="col-span-6 lg:col-span-3" key={gearboxType+Date.now()+2}>
							<Select
								placeholder="Коробка передач"
								options={gearboxType === '' ? [] : [gearboxType]}
								data-block={true}
								className="w-full"
								select={gearboxType !== '' ? gearboxType : 'Коробка передач'}
							/>
						</div>
					</>
				}

				<div className="col-span-6 lg:col-span-3 mb-10 relative">
					<input
						type="tel"
						placeholder="Пробег *"
						className={`border transition-all focus:border-accent-500 px-4 py-[9px] outline-none w-full text-black ${mileageState !== '' ? 'border-black' : 'border-gray-400'}`}
						{...register('mileage')}
						onChange={e => {
							setMileage(e.target.value);
							setValue('mileage', e.target.value);
							trigger('mileage');
						}}
						disabled={!avtoInfo?.brand}
					/>
					{errors.mileage && <span className="absolute top-full left-0 text-xs text-red-500">{errors.mileage.message}</span> }
				</div>

				<div className="col-span-6 border-b-2 border-b-black pb-2 mb-4">
					<h3 className="text-xl font-bold mb-2">Дополнительная информация</h3>
					<p className="m-0">Если вы заполните эти поля, то повысите точность расчета</p>
				</div>

				<div className="col-span-6 lg:col-span-3 !mb-5">
					<input
						type="tel"
						name="ownerCount"
						placeholder="Владельцев по ПТС"
						className={`border transition-all focus:border-accent-500 px-4 py-[9px] outline-none w-full text-black ${ownerCount !== '' ? 'border-black' : 'border-gray-400'}`}
						value={ownerCount}
						onChange={e => setOwnerCount(e.target.value.replace(/[^0-9\.]/g, ''))}
					/>
				</div>

				<div className="col-span-6 !mb-5">
					<h3 className="text-base font-bold mb-2">ПТС</h3>
					<div className="flex gap-5">
						{ptsTypes.map(pts => (
							<label className="flex items-center gap-1" key={pts.value}>
								<input type="radio" name="ptsType" value={pts.value} className="t-radio js-tilda-rule" onChange={e => setPtsType(e.target.value)} />
								<span className="">{pts.name}</span>
							</label>
						))}
					</div>
				</div>

				<div className="col-span-6">
					<h3 className="text-base font-bold !mb-2">Контактные данные</h3>
					<div className="grid grid-cols-6 gap-5">
						<div className="col-span-6 lg:col-span-3">
							<input
								type="text"
								name="name"
								placeholder="Ваше имя"
								className={`border transition-all focus:border-accent-500 px-4 py-[9px] outline-none w-full text-black border-gray-400 active:border-accent-500 focus-within:border-accent-500`}
							/>
						</div>
						<div className="col-span-6 lg:col-span-3 relative">
							<input
								type="tel"
								{...register('phone')}
								placeholder="+7 999 999-99-99 *"
								className={`border transition-all focus:border-accent-500 px-4 py-[9px] outline-none w-full text-black ${phone !== '' ? 'border-black' : 'border-gray-400'}`}
								value={phone}
								onChange={e => {
									setPhone(maskPhone(e));
									setValue('phone', e.target.value);
									trigger('phone');
								}}
							/>
							{errors.phone && <span className="absolute top-full left-0 text-xs text-red-500">{errors.phone.message}</span> }
						</div>
					</div>
				</div>

				<div className="col-span-6 relative">
					<label className="cursor-pointer flex items-center flex-wrap"> 
						<input type="checkbox" {...register('agree')} className="absolute w-0 h-0 opacity-0 invisible" /> 
						<div className="flex flex-nowrap gap-x-2 text-black/80"> 
							<span className="fake-checkbox-black"></span> 
							<span>Проставляя отметку, Вы даете согласие на обработку Ваших персональных данных в соответствии с ФЗ № 152 «О персональных данных» на условиях, <a href="/privacy-policy" target="_blank">указанных здесь</a>. Настоящим Вы выражаете свое согласие на получение информационных и рекламных материалов путем осуществления прямых контактов с помощью различных средств связи, включая, но, не ограничиваясь: почтовую рассылку, sms – рассылку, электронную почту, телефон, Интернет.</span>
						</div>
						{errors.agree && <span className="absolute top-full left-0 text-xs text-red-500 pl-6">{errors.agree.message}</span> }
					</label>
				</div>

				<div className="col-span-6 sticky bottom-0 left-0 right-0 z-10 bg-white border-t border-b border-t-gray-100 border-b-gray-100">
					<div className="flex justify-between flex-wrap sm:justify-end">
						<div
							className="btn white border-0 flex flex-grow sm:flex-grow-0 items-center justify-center px-5 sm:px-20"
							onClick={ () => {decrimentStep(); recalculate();} }
						>
							<span className="flex justify-center items-center gap-1 h-5">
								<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid" className=""><path data-v-6e69ebae="" d="M12 5l-5 5 5 5" stroke="currentColor" strokeWidth="2"></path></svg>
								Шаг назад
							</span>
						</div>
						<button type="submit" className="btn px-5 sm:px-20 flex-grow sm:flex-grow-0" disabled={isSubmitting}><span>Получить&nbsp;оценку</span></button>
					</div>
				</div>

			</form>

		</div>
	);
}

export default AvtoInfoForm;