import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import * as yup from 'yup';
import { yupResolver } from '@hookform/resolvers/yup';
import axios from 'axios';
import ShowErrors from '../ShowErrors';
import { useCarInfo } from '@/store/useCarInfo';
import { vinTranslit } from '@/js/utils/translit';
// Определение схемы валидации с помощью Yup
const vinSchema = yup.object().shape({
	vin: yup
		.string()
		.required('Поле обязательно для заполнения')
		.matches(/^[a-zA-Z0-9]*$/, 'Разрешены только латинские буквы и цифры')
		.min(17, 'Минимальное количество символов - 17')
		.max(25, 'Максимальное количество символов - 25'),
});

const VinForm = () => {
	const {incrementStep, recalculate, setVIN, setMessage, setAvtoInfo, setBodyNumber, vinState, bodyNumber, showLoader, hideLoader} = useCarInfo()
	const vin = vinState || '';
	const {
		register,
		handleSubmit,
		formState: { errors, isSubmitting },
		trigger,
	} = useForm({
		resolver: yupResolver(vinSchema),
		defaultValues: {
			vin,
		},
	});
	// Обработчик отправки формы
	const onSubmit = async (data) => {
		const isFormCorrect = await trigger();
		if (!isFormCorrect) return;
		if (bodyNumber.length) {
			incrementStep();
		} else {
			// await axios.post("https://api.maxposter.ru/partners-api/vin/info", {
			recalculate();
			showLoader()
			await axios.post(`${import.meta.env.PUBLIC_MAXPOSTER_URL}/vin/info`, {
				vin,
			},
			{
				// headers: {
				// 	"Authorization": `Basic ${import.meta.env.PUBLIC_MAXPOSTER_TOKEN}`,
				// 	"Accept": "application/json",
				// 	"Content-Type": "application/json",
				// }
			})
				.then(res => {
					const data = res.data;
					const status = data.status;
					if (window.location.hostname == "localhost")
						console.log("vin-info-response", res);
					if (status == "error") {
						if (data.message == "VIN не найден.") {
							setMessage(data.message);
						} else {
							setMessage("Что-то пошло не так :(( <br> Вернитесь назад и попробуйте снова <br> или выберите авто вручную.");
						}
						// setAvtoInfo({});
					} else if (status == "success") {
						const avtoInfoData = data.data;
						if(avtoInfoData.generation && avtoInfoData.generation.name === ''){
							avtoInfoData.generation.name = 'Без поколения';
						}
						setAvtoInfo(avtoInfoData);
						setBodyNumber(avtoInfoData.bodyNumber);
					}
				},
				(error) => {
					console.log("vin-info-error", error);
				}
			)
			incrementStep();
			hideLoader();
		}
	};
  
	 // Следим за изменениями поля vin и обновляем состояние
	useEffect(() => {
		const newVin = vinTranslit(vin.toUpperCase());
		setVIN(newVin);
		setBodyNumber('');
	}, [vin]);
	return (
		<>
			<div className="mb-6">
				<p>Заполните данные о&nbsp;вашем автомобиле и&nbsp;получите предварительную оценку. <br className="hidden md:block" />Вы&nbsp;можете сразу отправить ваш расчет официальному дилеру Kia и&nbsp;уточнить <br className="hidden md:block" />детали выкупа автомобиля.</p>
			</div>
			<form className="mb-10 vue-form" onSubmit={handleSubmit(onSubmit)}>
				<h3 className="text-2xl font-bold mb-6">Введите VIN-номер</h3>
				<div className="flex">
					<input
						type="text"
						className={`w-[270px] border-2 transition-all focus:border-accent-500 px-4 py-2.5 outline-none text-black border-gray-100 ${vin ? '!border-black !text-black' : ''}`}
						placeholder="Введите VIN-номер"
						{...register('vin')}
						onInput={(e) => setVIN(e.target.value)}
					/>
					<button
						className="bg-black text-white w-[48px] h-[48px] m-0 flex justify-center items-center transition-opacity hover:bg-accent-400 disabled:opacity-90 disabled:cursor-not-allowed"
						disabled={isSubmitting}
					>
						<svg
							width="20"
							height="20"
							viewBox="0 0 20 20"
							fill="none"
							xmlns="http://www.w3.org/2000/svg"
							preserveAspectRatio="xMidYMid"
							className=""
						>
							<path
								data-v-134dc84b=""
								d="M8.5 14l4-4-4-4"
								stroke="currentColor"
								strokeWidth="2"
							></path>
						</svg>
					</button>
				</div>
				{errors.vin && <ShowErrors errors={errors.vin.message} /> }
			</form>
		</>
	);
}

export default VinForm;